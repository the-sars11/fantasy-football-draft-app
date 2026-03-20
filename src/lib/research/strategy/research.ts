/**
 * Strategy Research Engine (FF-S03)
 *
 * Claude analyzes league settings + player data to propose 4-6 named strategies
 * with data-backed reasoning. Auction and snake strategies are FULLY DISTINCT —
 * auction strategies get budget allocation + max bid %, snake strategies get
 * round targets + position round priority.
 *
 * Claude is BOUNDED: synthesizes from real data only, never invents stats.
 */

import type { League, DraftFormat, RosterSlots, ScoringFormat } from '@/lib/players/types'
import type { ConsensusPlayer } from '@/lib/research/normalize'
import type { StrategyInsert, Position as DbPosition } from '@/lib/supabase/database.types'
import { askClaudeJson } from '@/lib/ai/claude'
import { AUCTION_ARCHETYPES, SNAKE_ARCHETYPES } from './presets'

// --- Types ---

export interface StrategyProposal {
  name: string
  archetype: string
  description: string
  philosophy: string
  risk_tolerance: 'conservative' | 'balanced' | 'aggressive'
  position_weights: Record<string, number>
  key_targets: string[] // player names
  key_avoids: string[] // player names
  reasoning: string // data-backed "why this works in your league"
  projected_ceiling: number // 1-100
  projected_floor: number // 1-100
  confidence: 'high' | 'medium' | 'low'
  // Auction-only
  budget_allocation?: Record<string, number>
  max_bid_percentage?: number
  // Snake-only
  round_targets?: Record<string, number[]>
  position_round_priority?: Record<string, string[]>
}

interface ClaudeStrategyResponse {
  strategies: StrategyProposal[]
}

export interface StrategyResearchInput {
  league: League
  players: ConsensusPlayer[]
  keeperNames?: string[]
}

export interface StrategyResearchResult {
  proposals: StrategyProposal[]
  inserts: StrategyInsert[]
}

// --- Player data summarization ---

interface PositionSummary {
  position: string
  count: number
  topPlayers: Array<{ name: string; rank: number; auctionValue: number | null; adp: number | null }>
  avgAuctionValue: number | null
  tierBreaks: number[] // ranks where tiers drop off
}

function summarizePlayers(players: ConsensusPlayer[], format: DraftFormat): PositionSummary[] {
  const positions: DbPosition[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']

  return positions.map((pos) => {
    const posPlayers = players
      .filter((p) => p.position === pos)
      .sort((a, b) => a.consensusRank - b.consensusRank)

    const top12 = posPlayers.slice(0, 12)

    // Detect tier breaks: rank gaps > 5 in top 36
    const tierBreaks: number[] = []
    const top36 = posPlayers.slice(0, 36)
    for (let i = 1; i < top36.length; i++) {
      const gap = top36[i].consensusRank - top36[i - 1].consensusRank
      if (gap >= 5) {
        tierBreaks.push(top36[i - 1].consensusRank)
      }
    }

    const auctionValues = posPlayers
      .map((p) => p.consensusAuctionValue)
      .filter((v): v is number => v !== null)
    const avgAuctionValue = auctionValues.length > 0
      ? Math.round(auctionValues.reduce((s, v) => s + v, 0) / auctionValues.length)
      : null

    return {
      position: pos === 'DST' ? 'DEF' : pos,
      count: posPlayers.length,
      topPlayers: top12.map((p) => ({
        name: p.name,
        rank: p.consensusRank,
        auctionValue: format === 'auction' ? p.consensusAuctionValue : null,
        adp: format === 'snake' ? p.adp : null,
      })),
      avgAuctionValue: format === 'auction' ? avgAuctionValue : null,
      tierBreaks,
    }
  })
}

// --- Prompt construction ---

function formatRosterSlots(slots: RosterSlots): string {
  const parts: string[] = []
  if (slots.qb) parts.push(`${slots.qb} QB`)
  if (slots.rb) parts.push(`${slots.rb} RB`)
  if (slots.wr) parts.push(`${slots.wr} WR`)
  if (slots.te) parts.push(`${slots.te} TE`)
  if (slots.flex) parts.push(`${slots.flex} FLEX`)
  if (slots.k) parts.push(`${slots.k} K`)
  if (slots.def) parts.push(`${slots.def} DEF`)
  if (slots.bench) parts.push(`${slots.bench} Bench`)
  return parts.join(', ')
}

function formatScoringLabel(scoring: ScoringFormat): string {
  switch (scoring) {
    case 'ppr': return 'Full PPR (1 point per reception)'
    case 'half-ppr': return 'Half PPR (0.5 points per reception)'
    case 'standard': return 'Standard (no PPR)'
    default: return scoring
  }
}

function buildAuctionPrompt(
  league: League,
  summaries: PositionSummary[],
  keeperNames: string[]
): string {
  const archetypeList = AUCTION_ARCHETYPES.join(', ')

  return `## League Settings
- Format: AUCTION (budget: $${league.budget})
- Teams: ${league.size}
- Scoring: ${formatScoringLabel(league.scoringFormat)}
- Roster: ${formatRosterSlots(league.rosterSlots)}
- Platform: ${league.platform}
${keeperNames.length > 0 ? `- Keepers already kept (removed from pool): ${keeperNames.join(', ')}` : ''}

## Player Data by Position
${summaries.map((s) => `### ${s.position} (${s.count} available)
Top 12: ${s.topPlayers.map((p) => `${p.name} (rank ${p.rank}, $${p.auctionValue})`).join(', ')}
Avg auction value: $${s.avgAuctionValue}
Tier breaks at ranks: ${s.tierBreaks.length > 0 ? s.tierBreaks.join(', ') : 'none detected'}`).join('\n\n')}

## Instructions
Propose exactly 5 AUCTION draft strategies for this league. Each strategy must use one of these archetypes: ${archetypeList}.

For each strategy, provide:
- name: Display name
- archetype: One of the archetypes listed above
- description: 1-2 sentence overview
- philosophy: How this strategy wins in THIS specific league (cite league size, scoring, roster settings)
- risk_tolerance: "conservative" | "balanced" | "aggressive"
- position_weights: Object with QB, RB, WR, TE, K, DST keys, values 1-10 (importance for this strategy)
- key_targets: Array of 3-5 player names that are ideal targets for this strategy (from the player data above)
- key_avoids: Array of 1-3 player names to avoid (overpriced or poor fit for this strategy)
- reasoning: 2-3 sentences explaining WHY this strategy works in this specific league, citing data (tier breaks, scarcity, auction values, scoring format impact)
- projected_ceiling: 1-100 (how high this strategy can score if it hits)
- projected_floor: 1-100 (worst case outcome)
- confidence: "high" | "medium" | "low"
- budget_allocation: Object with QB, RB, WR, TE, K, DST, bench keys — percentages that sum to 100
- max_bid_percentage: Maximum % of budget on a single player (10-70)

IMPORTANT:
- Do NOT include round_targets or position_round_priority — those are snake-only fields
- Reference specific players from the data above — do not invent players
- Cite actual auction values and tier breaks in your reasoning
- Vary the strategies — include conservative, balanced, and aggressive options
- Tailor to this league's specific settings (${league.size}-team, ${formatScoringLabel(league.scoringFormat)}, ${formatRosterSlots(league.rosterSlots)})`
}

function buildSnakePrompt(
  league: League,
  summaries: PositionSummary[],
  keeperNames: string[]
): string {
  const archetypeList = SNAKE_ARCHETYPES.join(', ')
  const totalRounds = Object.values(league.rosterSlots).reduce((s, v) => s + v, 0)

  return `## League Settings
- Format: SNAKE DRAFT
- Teams: ${league.size}
- Total rounds: ${totalRounds}
- Scoring: ${formatScoringLabel(league.scoringFormat)}
- Roster: ${formatRosterSlots(league.rosterSlots)}
- Platform: ${league.platform}
${keeperNames.length > 0 ? `- Keepers already kept (removed from pool): ${keeperNames.join(', ')}` : ''}

## Player Data by Position
${summaries.map((s) => `### ${s.position} (${s.count} available)
Top 12: ${s.topPlayers.map((p) => `${p.name} (rank ${p.rank}, ADP ${p.adp})`).join(', ')}
Tier breaks at ranks: ${s.tierBreaks.length > 0 ? s.tierBreaks.join(', ') : 'none detected'}`).join('\n\n')}

## Instructions
Propose exactly 5 SNAKE draft strategies for this league. Each strategy must use one of these archetypes: ${archetypeList}.

For each strategy, provide:
- name: Display name
- archetype: One of the archetypes listed above
- description: 1-2 sentence overview
- philosophy: How this strategy wins in THIS specific league (cite league size, scoring, roster settings)
- risk_tolerance: "conservative" | "balanced" | "aggressive"
- position_weights: Object with QB, RB, WR, TE, K, DST keys, values 1-10 (importance for this strategy)
- key_targets: Array of 3-5 player names that are ideal targets for this strategy (from the player data above)
- key_avoids: Array of 1-3 player names to avoid (overpriced or poor fit for this strategy)
- reasoning: 2-3 sentences explaining WHY this strategy works in this specific league, citing data (tier breaks, scarcity, ADP values, scoring format impact)
- projected_ceiling: 1-100 (how high this strategy can score if it hits)
- projected_floor: 1-100 (worst case outcome)
- confidence: "high" | "medium" | "low"
- round_targets: Object with QB, RB, WR, TE, K, DST keys — arrays of round numbers to target each position (e.g. RB: [1, 2, 5])
- position_round_priority: Object with "early", "mid", "late" keys — arrays of position strings showing priority order per draft phase

IMPORTANT:
- Do NOT include budget_allocation or max_bid_percentage — those are auction-only fields
- Reference specific players from the data above — do not invent players
- Cite actual ADP values and tier breaks in your reasoning
- Vary the strategies — include conservative, balanced, and aggressive options
- Round targets should use rounds 1-${totalRounds}
- Tailor to this league's specific settings (${league.size}-team, ${formatScoringLabel(league.scoringFormat)}, ${formatRosterSlots(league.rosterSlots)})`
}

const SYSTEM_PROMPT = `You are a fantasy football draft strategy analyst. You analyze league settings and player data to propose optimal draft strategies.

RULES:
- Only reference players that exist in the provided data. Never invent player names or stats.
- Every recommendation must cite specific data points (auction values, ADP, tier breaks, positional scarcity).
- Strategies must be tailored to the specific league settings provided.
- Auction strategies use budget allocation and max bid percentage. Snake strategies use round targets and position round priority. NEVER mix them.
- Respond with valid JSON only. No markdown, no explanation outside the JSON.

Respond with a JSON object: { "strategies": [ ... ] }`

// --- Main research function ---

export async function proposeStrategies(
  input: StrategyResearchInput
): Promise<StrategyResearchResult> {
  const { league, players, keeperNames = [] } = input

  // Filter out keepers from pool
  const availablePlayers = keeperNames.length > 0
    ? players.filter((p) => !keeperNames.includes(p.name))
    : players

  const summaries = summarizePlayers(availablePlayers, league.format)

  const prompt = league.format === 'auction'
    ? buildAuctionPrompt(league, summaries, keeperNames)
    : buildSnakePrompt(league, summaries, keeperNames)

  const response = await askClaudeJson<ClaudeStrategyResponse>({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 6000,
  })

  const proposals = response.strategies

  // Convert proposals to DB-ready inserts
  const inserts = proposals.map((p) => proposalToInsert(p, league.id, league.format))

  return { proposals, inserts }
}

// --- Convert proposal to DB insert ---

function proposalToInsert(
  proposal: StrategyProposal,
  leagueId: string,
  format: DraftFormat
): StrategyInsert {
  // Map position weights from app positions (DEF) to DB positions (DST)
  const positionWeights: Record<string, number> = {}
  for (const [key, val] of Object.entries(proposal.position_weights)) {
    positionWeights[key === 'DEF' ? 'DST' : key] = val
  }

  const base: StrategyInsert = {
    league_id: leagueId,
    name: proposal.name,
    description: proposal.description,
    archetype: proposal.archetype,
    source: 'ai',
    is_active: false,
    position_weights: positionWeights as Record<DbPosition, number>,
    player_targets: [],
    player_avoids: [],
    team_avoids: [],
    risk_tolerance: proposal.risk_tolerance,
    ai_reasoning: proposal.reasoning,
    ai_confidence: proposal.confidence,
    projected_ceiling: proposal.projected_ceiling,
    projected_floor: proposal.projected_floor,
  }

  // Format-specific fields — NO cross-contamination
  if (format === 'auction') {
    base.budget_allocation = proposal.budget_allocation ?? null
    base.max_bid_percentage = proposal.max_bid_percentage ?? null
    base.round_targets = null
    base.position_round_priority = null
  } else {
    // Map DEF -> DST in round_targets keys
    const roundTargets: Record<string, number[]> = {}
    if (proposal.round_targets) {
      for (const [key, val] of Object.entries(proposal.round_targets)) {
        roundTargets[key === 'DEF' ? 'DST' : key] = val
      }
    }
    // Map DEF -> DST in position_round_priority values
    const posPriority: Record<string, string[]> = {}
    if (proposal.position_round_priority) {
      for (const [phase, positions] of Object.entries(proposal.position_round_priority)) {
        posPriority[phase] = positions.map((p) => (p === 'DEF' ? 'DST' : p))
      }
    }
    base.round_targets = roundTargets as Record<DbPosition, number[]>
    base.position_round_priority = posPriority as Record<string, DbPosition[]>
    base.budget_allocation = null
    base.max_bid_percentage = null
  }

  return base
}
