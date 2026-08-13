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
import { AUCTION_ARCHETYPES, SNAKE_ARCHETYPES, AUCTION_PRESETS } from './presets'
import type { AuctionArchetype } from './presets'
import { assignTargetPrices, type TargetPricing } from './target-pricing'

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
  // Auction-only (R6): solver-fit target $ per key_target so the full roster
  // fits budget. Every roster slot is filled at >= $1; the non-target slots
  // reserve $1 each and the targets are priced within what's left.
  target_pricing?: TargetPricing
}

interface ClaudeStrategyResponse {
  strategies: StrategyProposal[]
}

export interface StrategyResearchInput {
  league: League
  players: ConsensusPlayer[]
  keeperNames?: string[]
  /** Player names from the user's active strategy targets to incorporate into proposals */
  targetNames?: string[]
  /** Player names from the user's active strategy avoids to incorporate into proposals */
  avoidNames?: string[]
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
  keeperNames: string[],
  targetNames: string[] = [],
  avoidNames: string[] = []
): string {
  const archetypeList = AUCTION_ARCHETYPES.join(', ')

  const targetsSection =
    targetNames.length > 0 || avoidNames.length > 0
      ? `\n## User Targets and Avoids\n${targetNames.length > 0 ? `Targets (prioritize in key_targets where the strategy supports them): ${targetNames.join(', ')}\n` : ''}${avoidNames.length > 0 ? `Avoids (include in key_avoids where appropriate): ${avoidNames.join(', ')}\n` : ''}`
      : ''

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
- budget_allocation: Object with QB, RB, WR, TE, K, DST, bench keys - percentages that sum to 100
- max_bid_percentage: Maximum % of budget on a single player (10-70)

IMPORTANT:
- Do NOT include round_targets or position_round_priority - those are snake-only fields
- Reference specific players from the data above - do not invent players
- Cite actual auction values and tier breaks in your reasoning
- Vary the strategies - include conservative, balanced, and aggressive options
- Tailor to this league's specific settings (${league.size}-team, ${formatScoringLabel(league.scoringFormat)}, ${formatRosterSlots(league.rosterSlots)})${targetsSection}`
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
- round_targets: Object with QB, RB, WR, TE, K, DST keys - arrays of round numbers to target each position (e.g. RB: [1, 2, 5])
- position_round_priority: Object with "early", "mid", "late" keys - arrays of position strings showing priority order per draft phase

IMPORTANT:
- Do NOT include budget_allocation or max_bid_percentage - those are auction-only fields
- Reference specific players from the data above - do not invent players
- Cite actual ADP values and tier breaks in your reasoning
- Vary the strategies - include conservative, balanced, and aggressive options
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

// --- R6: solver-fit target prices ---

/**
 * Attach solver-fit target prices to each AUCTION proposal so its named targets
 * sum to a completable $200 roster. Snake proposals are returned unchanged
 * (target prices are an auction concept). Pure and $0 — no Claude.
 */
function priceProposals(
  proposals: StrategyProposal[],
  league: League,
  players: ConsensusPlayer[]
): StrategyProposal[] {
  if (league.format !== 'auction') return proposals

  const budget = league.budget ?? 200
  return proposals.map((p) => ({
    ...p,
    target_pricing: assignTargetPrices({
      targetNames: p.key_targets,
      budgetAllocation: p.budget_allocation,
      maxBidPercentage: p.max_bid_percentage,
      players,
      rosterSlots: league.rosterSlots,
      budget,
    }),
  }))
}

// --- Main research function ---

export async function proposeStrategies(
  input: StrategyResearchInput
): Promise<StrategyResearchResult> {
  const { league, players, keeperNames = [], targetNames = [], avoidNames = [] } = input

  // Filter out keepers from pool
  const availablePlayers = keeperNames.length > 0
    ? players.filter((p) => !keeperNames.includes(p.name))
    : players

  const summaries = summarizePlayers(availablePlayers, league.format)

  const prompt = league.format === 'auction'
    ? buildAuctionPrompt(league, summaries, keeperNames, targetNames, avoidNames)
    : buildSnakePrompt(league, summaries, keeperNames)

  const response = await askClaudeJson<ClaudeStrategyResponse>({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 6000,
  })

  // Attach solver-fit target prices (R6) — auction proposals only, $0.
  const proposals = priceProposals(response.strategies, league, availablePlayers)

  // Convert proposals to DB-ready inserts
  const inserts = proposals.map((p) => proposalToInsert(p, league.id, league.format))

  return { proposals, inserts }
}

// --- Convert proposal to DB insert ---

function proposalToInsert(
  proposal: StrategyProposal,
  leagueId: string,
  format: DraftFormat,
  source: 'ai' | 'preset' = 'ai'
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
    source,
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

// --- Rule-based strategy fallback ($0, no Claude API required) ---
// Calibrated to 16-year Nasties ledger: RB COOL 0.84x (value pocket), WR HOT 1.18x, TE HOT 1.17x.
// Used when ANTHROPIC_API_KEY is absent. Produces 4 auction strategies with Nasties-specific reasoning.

const CALIBRATED_ARCHETYPES: AuctionArchetype[] = [
  'hero-rb-auction',
  'wr-heavy-auction',
  'stars-and-scrubs',
  'balanced-auction',
]

const ARCHETYPE_PHILOSOPHY: Record<string, string> = {
  'hero-rb-auction':
    'In 16 Nasties drafts RB runs COOL (0.84x room share vs national) - the market undervalues RBs. Pay up for 1 elite RB while the field chases overpriced WRs.',
  'wr-heavy-auction':
    'WR runs HOT (1.18x) in Nasties but PPR demands pass-catchers. Control your WR spend - buy 2 real WRs at calibrated prices instead of overpaying for a WR1 the room will bid past ceiling.',
  'stars-and-scrubs':
    'Lock 2-3 studs at calibrated prices, fill the roster with $1-5 dart throws. In a 12-team pool, late-round upside is real and RB1 ceiling ($97) lands well above what the room bids.',
  'balanced-auction':
    'Spread budget evenly across positions for a protected floor. No single injury derails the season and you stay competitive at every slot in a 12-team field.',
}

const ARCHETYPE_REASONING: Record<string, string> = {
  'hero-rb-auction':
    'The Nasties ledger shows RB1 clearing at room price ~$76 vs VORP ceiling of $97 - a consistent $21 pocket. Paying up for 1 elite RB gets calibrated value while the field runs WR HOT (1.18x) and exhausts budget. Fill WR2/WR3 at mid-market where room prices are still rational.',
  'wr-heavy-auction':
    'WR is the most liquid position in Nasties (1.18x room share), so WR1s spike fast. Locking WR budget early secures elite pass-catchers before the room bids past ceiling. Avoid TE overspend - the Shultz effect pushes TE1 to 1.17x HOT every year.',
  'stars-and-scrubs':
    'With $200 and 12 teams, locking 2 true studs and filling the rest with $1-5 players is the highest-ceiling path. The RB COOL pocket means elite RBs are under-bid relative to their VORP every year - this strategy exploits that directly.',
  'balanced-auction':
    'Balanced allocation floors out at 60-70 projected ceiling in a PPR league. No positional scarcity risk, no single-player dependency. Best when you want to draft reactively against the field rather than commit to an identity in advance.',
}

const ARCHETYPE_CEILING: Record<string, number> = {
  'hero-rb-auction': 82,
  'wr-heavy-auction': 78,
  'stars-and-scrubs': 87,
  'balanced-auction': 72,
}

const ARCHETYPE_FLOOR: Record<string, number> = {
  'hero-rb-auction': 52,
  'wr-heavy-auction': 50,
  'stars-and-scrubs': 45,
  'balanced-auction': 60,
}

/**
 * $0 rule-based strategy proposals - no Claude required.
 * Uses Nasties calibration (RB COOL / WR HOT / TE HOT) + preset archetypes.
 * Incorporates user's targetNames/avoidNames from their active strategy.
 */
export function proposeStrategiesRuleBased(
  input: StrategyResearchInput
): StrategyResearchResult {
  const { league, players, targetNames = [], avoidNames = [] } = input

  // Only calibrated for auction format; snake proposals require the AI path
  if (league.format !== 'auction') {
    return { proposals: [], inserts: [] }
  }

  // Sort by consensus rank ascending (best players first)
  const ranked = [...players].sort((a, b) => a.consensusRank - b.consensusRank)
  const avoidLower = avoidNames.map((n) => n.toLowerCase())

  const rawProposals: StrategyProposal[] = CALIBRATED_ARCHETYPES.map((key) => {
    const preset = AUCTION_PRESETS[key]

    // Position priority order by descending weight (QB/RB/WR/TE only - K/DEF are filler)
    const corePositions = ['QB', 'RB', 'WR', 'TE'] as const
    const posOrder = [...corePositions].sort(
      (a, b) => (preset.position_weights[b] ?? 0) - (preset.position_weights[a] ?? 0)
    )

    // key_targets: user targets first (up to 3), then fill from top players by position priority
    const targets: string[] = []
    for (const name of targetNames) {
      if (targets.length >= 3) break
      const found = ranked.find((p) => p.name.toLowerCase() === name.toLowerCase())
      if (found && !avoidLower.includes(name.toLowerCase())) {
        targets.push(found.name)
      }
    }
    for (const pos of posOrder) {
      if (targets.length >= 4) break
      const top = ranked.find(
        (p) =>
          p.position === pos &&
          !targets.includes(p.name) &&
          !avoidLower.includes(p.name.toLowerCase())
      )
      if (top) targets.push(top.name)
    }

    // key_avoids: user avoids (up to 2), then add a Nasties-calibrated avoid
    const avoids: string[] = []
    for (const name of avoidNames.slice(0, 2)) {
      const found = ranked.find((p) => p.name.toLowerCase() === name.toLowerCase())
      avoids.push(found ? found.name : name)
    }
    // For non-WR-heavy strategies: the WR1 is often bid past ceiling (1.18x HOT)
    if (key !== 'wr-heavy-auction' && avoids.length < 3) {
      const topWR = ranked.find(
        (p) =>
          p.position === 'WR' &&
          !avoids.includes(p.name) &&
          !targets.includes(p.name)
      )
      if (topWR) avoids.push(topWR.name)
    }

    return {
      name: preset.name,
      archetype: key,
      description: preset.description,
      philosophy: ARCHETYPE_PHILOSOPHY[key],
      risk_tolerance: preset.risk_tolerance,
      position_weights: preset.position_weights,
      key_targets: targets,
      key_avoids: avoids,
      reasoning: ARCHETYPE_REASONING[key],
      projected_ceiling: ARCHETYPE_CEILING[key],
      projected_floor: ARCHETYPE_FLOOR[key],
      confidence: 'medium',
      budget_allocation: preset.budget_allocation,
      max_bid_percentage: preset.max_bid_percentage,
    }
  })

  // Attach solver-fit target prices (R6) so each strategy's targets sum to a
  // completable $200 roster; swapping archetype re-allocates the money.
  const proposals = priceProposals(rawProposals, league, players)

  const inserts = proposals.map((p) => proposalToInsert(p, league.id, league.format, 'preset'))
  return { proposals, inserts }
}
