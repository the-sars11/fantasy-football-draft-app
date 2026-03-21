/**
 * LLM Analysis Layer (FF-019)
 *
 * Uses Claude API to analyze consensus data through the lens of
 * user's strategy preferences and league settings.
 *
 * Claude is BOUNDED: synthesizes from real data only, never invents stats.
 * Every recommendation cites which data points drove it.
 */

import { askClaudeJson } from '@/lib/ai/claude'
import type { Player, DraftFormat, ScoringFormat } from '@/lib/players/types'
import type { Strategy } from '@/lib/supabase/database.types'
import type { ScoredPlayer } from './strategy/scoring'

// --- Shared Types ---

export interface PositionalRanking {
  position: string
  tier: number
  players: Array<{
    name: string
    rank: number
    reasoning: string
    strategyFit: 'excellent' | 'good' | 'fair' | 'poor'
    /** Auction: adjusted $ value. Snake: target round */
    value: number
    /** Key stat or edge that drives this ranking */
    edge: string
  }>
}

export interface PositionalRankingsResult {
  rankings: PositionalRanking[]
  format: DraftFormat
  strategyName: string
  summary: string
}

// --- Helpers ---

function formatLeagueContext(
  format: DraftFormat,
  scoringFormat: ScoringFormat,
  teamCount: number,
  budget?: number,
): string {
  const scoring = scoringFormat === 'ppr'
    ? 'Full PPR'
    : scoringFormat === 'half-ppr'
    ? 'Half PPR'
    : 'Standard'

  const lines = [
    `Format: ${format === 'auction' ? `AUCTION ($${budget ?? 200} budget)` : 'SNAKE'}`,
    `Teams: ${teamCount}`,
    `Scoring: ${scoring}`,
  ]
  return lines.join('\n')
}

function formatStrategyContext(strategy: Strategy): string {
  const weights = Object.entries(strategy.position_weights)
    .map(([pos, w]) => `${pos === 'DST' ? 'DEF' : pos}: ${w}/10`)
    .join(', ')

  const lines = [
    `Strategy: "${strategy.name}" (${strategy.archetype})`,
    `Risk: ${strategy.risk_tolerance}`,
    `Position emphasis: ${weights}`,
  ]

  if (strategy.player_targets.length > 0) {
    lines.push(`Targets: ${strategy.player_targets.map((t) => `${t.player_name} (wt ${t.weight})`).join(', ')}`)
  }
  if (strategy.player_avoids.length > 0) {
    lines.push(`Avoids: ${strategy.player_avoids.map((a) => `${a.player_name} (${a.severity})`).join(', ')}`)
  }
  if (strategy.team_avoids.length > 0) {
    lines.push(`Team avoids: ${strategy.team_avoids.join(', ')}`)
  }

  return lines.join('\n')
}

function formatPlayerData(
  scoredPlayers: ScoredPlayer[],
  format: DraftFormat,
  position: string,
  limit: number = 25,
): string {
  const posPlayers = scoredPlayers
    .filter((sp) => sp.player.position === position)
    .slice(0, limit)

  if (posPlayers.length === 0) return `No ${position} data available.`

  if (format === 'auction') {
    return posPlayers.map((sp) => {
      const p = sp.player
      const adjVal = sp.adjustedAuctionValue ?? p.consensusAuctionValue
      return `${p.name} (${p.team}) — consensus $${p.consensusAuctionValue}, strategy-adj $${adjVal}, score ${sp.strategyScore}, ADP ${Math.round(p.adp)}, proj ${Math.round(p.projections.points)} pts${sp.targetStatus !== 'neutral' ? ` [${sp.targetStatus}]` : ''}`
    }).join('\n')
  } else {
    return posPlayers.map((sp) => {
      const p = sp.player
      const adjRound = sp.adjustedRoundValue ?? Math.ceil(p.adp / 12)
      return `${p.name} (${p.team}) — ADP ${Math.round(p.adp)}, round ${Math.ceil(p.adp / 12)}, strategy-adj round ${adjRound}, score ${sp.strategyScore}, proj ${Math.round(p.projections.points)} pts${sp.targetStatus !== 'neutral' ? ` [${sp.targetStatus}]` : ''}`
    }).join('\n')
  }
}

// --- FF-019: Positional Rankings ---

const POSITIONAL_RANKINGS_SYSTEM = `You are a fantasy football analyst producing strategy-adjusted positional rankings.

RULES:
- Only reference players from the provided data. Never invent players or stats.
- Every ranking must cite specific data: auction values, ADP, projections, strategy scores, tier breaks.
- Rankings must reflect the active strategy's position weights, risk tolerance, and target/avoid lists.
- Respond with valid JSON only. No markdown outside JSON.

Respond with: { "rankings": [...], "summary": "..." }`

export async function analyzePositionalRankings(
  scoredPlayers: ScoredPlayer[],
  strategy: Strategy,
  format: DraftFormat,
  scoringFormat: ScoringFormat,
  teamCount: number,
  budget?: number,
): Promise<PositionalRankingsResult> {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

  const playerDataSections = positions.map((pos) => {
    const dbPos = pos === 'DEF' ? 'DST' : pos
    // Use app position for filtering (scored players use app Position type)
    const data = formatPlayerData(scoredPlayers, format, pos === 'DST' ? 'DEF' : pos, 25)
    return `### ${pos}\n${data}`
  }).join('\n\n')

  const valueLabel = format === 'auction' ? 'strategy-adjusted auction value ($)' : 'target draft round'

  const prompt = `## League
${formatLeagueContext(format, scoringFormat, teamCount, budget)}

## Active Strategy
${formatStrategyContext(strategy)}

## Scored Player Data (strategy-adjusted)
${playerDataSections}

## Task
Produce strategy-adjusted positional rankings for each position (QB, RB, WR, TE, K, DEF).

For each position, group players into tiers (1 = elite, 2 = strong, 3 = solid, 4 = depth). For each player provide:
- name: exact player name from data above
- rank: position rank (1 = best)
- reasoning: 1 sentence on why this player ranks here given the active strategy
- strategyFit: "excellent" | "good" | "fair" | "poor" based on alignment with strategy
- value: ${valueLabel}
- edge: key differentiator (e.g. "PPR upside", "positional scarcity", "value at ADP")

Include top 10 players per position (QB, K, DEF: top 8).
Also provide a "summary" field: 2-3 sentences on the overall positional landscape through this strategy's lens.

IMPORTANT:
- Players marked [target] should rank higher if their data supports it
- Players marked [avoid] should rank lower or be flagged with strategyFit "poor"
- Position weights affect how deep each position's talent pool matters
- ${format === 'auction' ? 'Value = strategy-adjusted auction dollar amount' : 'Value = target round to draft this player'}
- Cite actual numbers from the data above in your reasoning`

  const response = await askClaudeJson<{ rankings: PositionalRanking[]; summary: string }>({
    system: POSITIONAL_RANKINGS_SYSTEM,
    prompt,
    maxTokens: 6000,
  })

  return {
    rankings: response.rankings,
    format,
    strategyName: strategy.name,
    summary: response.summary,
  }
}
