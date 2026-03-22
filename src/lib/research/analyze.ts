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
import type { Strategy, ScoringSettings } from '@/lib/supabase/database.types'
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
  scoringSettings?: ScoringSettings | null,
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

  const bonusContext = formatScoringBonuses(scoringSettings)
  if (bonusContext) {
    lines.push('', '### Scoring Bonuses (affect player valuations)', bonusContext)
  }

  return lines.join('\n')
}

/**
 * FF-068: Generate human-readable scoring context for LLM prompts.
 * Only includes non-standard settings that change player valuations.
 * Returns null if no custom/bonus settings exist.
 * Exported so the live draft recommend route can reuse it.
 */
export function formatScoringBonuses(settings?: ScoringSettings | null): string | null {
  if (!settings) return null

  const impacts: string[] = []

  // PPR value
  if (settings.rec > 0) {
    impacts.push(`Reception bonus: ${settings.rec} pts/rec (${settings.rec >= 1 ? 'full' : 'half'} PPR → boosts high-target WRs and pass-catching RBs)`)
  }

  // Passing bonuses
  if (settings.pass_td_40 > 0) impacts.push(`40+ yd TD pass bonus: +${settings.pass_td_40} pt (boosts deep-ball QBs like Mahomes, Stroud)`)
  if (settings.pass_td_50 > 0) impacts.push(`50+ yd TD pass bonus: +${settings.pass_td_50} pts (stacks with 40+ bonus for deep threats)`)
  if (settings.pass_300 > 0) impacts.push(`300-399 yd passing game bonus: +${settings.pass_300} pts (rewards high-volume QBs)`)
  if (settings.pass_400 > 0) impacts.push(`400+ yd passing game bonus: +${settings.pass_400} pts (elite QB upside premium)`)

  // Rushing bonuses
  if (settings.rush_td_40 > 0) impacts.push(`40+ yd TD rush bonus: +${settings.rush_td_40} pt (boosts explosive RBs and rushing QBs)`)
  if (settings.rush_td_50 > 0) impacts.push(`50+ yd TD rush bonus: +${settings.rush_td_50} pts (big-play RB premium)`)
  if (settings.rush_100 > 0) impacts.push(`100-199 yd rushing game bonus: +${settings.rush_100} pts (rewards bellcow RBs with heavy workloads)`)
  if (settings.rush_200 > 0) impacts.push(`200+ yd rushing game bonus: +${settings.rush_200} pts (elite rushing game upside)`)

  // Receiving bonuses
  if (settings.rec_td_40 > 0) impacts.push(`40+ yd TD rec bonus: +${settings.rec_td_40} pt (boosts deep-threat WRs and speedy TEs)`)
  if (settings.rec_td_50 > 0) impacts.push(`50+ yd TD rec bonus: +${settings.rec_td_50} pts (premium on speed/YAC ability)`)
  if (settings.rec_100 > 0) impacts.push(`100-199 yd receiving game bonus: +${settings.rec_100} pts (rewards WR1 target volume)`)
  if (settings.rec_200 > 0) impacts.push(`200+ yd receiving game bonus: +${settings.rec_200} pts (elite WR ceiling premium)`)

  // Non-standard base scoring
  if (settings.pass_td !== 4) impacts.push(`Passing TD: ${settings.pass_td} pts (${settings.pass_td > 4 ? 'QB premium — draft QBs earlier' : 'QB discount — wait on QBs'})`)
  if (settings.pass_int !== -2) impacts.push(`Interception: ${settings.pass_int} pts (${settings.pass_int < -2 ? 'harsh — favor safe QBs' : 'lenient — gunslinger QBs less penalized'})`)
  if (settings.fumble_lost !== -2) impacts.push(`Fumble lost: ${settings.fumble_lost} pts (${settings.fumble_lost < -2 ? 'harsh — avoid fumble-prone players' : 'lenient'})`)

  // D/ST deviations from standard
  if (settings.dst_int > 2) impacts.push(`D/ST interception: ${settings.dst_int} pts (premium — favor ballhawk defenses)`)
  if (settings.dst_fr > 2) impacts.push(`D/ST fumble recovery: ${settings.dst_fr} pts (premium — favor aggressive defenses)`)

  if (impacts.length === 0) return null

  return impacts.map(i => `- ${i}`).join('\n')
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
  scoringSettings?: ScoringSettings | null,
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
${formatLeagueContext(format, scoringFormat, teamCount, budget, scoringSettings)}

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

// --- FF-020: Auction Value Adjustments / Round Value Mapping ---

export interface PlayerValueAdjustment {
  name: string
  position: string
  team: string
  consensusValue: number
  adjustedValue: number
  floor: number
  ceiling: number
  target: number
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

export interface ValueAdjustmentsResult {
  adjustments: PlayerValueAdjustment[]
  format: DraftFormat
  strategyName: string
  summary: string
}

const VALUE_ADJUSTMENTS_SYSTEM = `You are a fantasy football value analyst. You adjust player values based on league settings and draft strategy.

RULES:
- Only reference players from the provided data. Never invent players or stats.
- Every adjustment must be justified with specific data points.
- Floor = worst-case value, ceiling = best-case value, target = what you'd actually pay/draft at.
- Respond with valid JSON only.

Respond with: { "adjustments": [...], "summary": "..." }`

export async function analyzeValueAdjustments(
  scoredPlayers: ScoredPlayer[],
  strategy: Strategy,
  format: DraftFormat,
  scoringFormat: ScoringFormat,
  teamCount: number,
  budget?: number,
  scoringSettings?: ScoringSettings | null,
): Promise<ValueAdjustmentsResult> {
  const top60 = scoredPlayers.slice(0, 60)

  const valueCol = format === 'auction' ? 'auction value' : 'draft round'
  const playerLines = top60.map((sp) => {
    const p = sp.player
    if (format === 'auction') {
      const adj = sp.adjustedAuctionValue ?? p.consensusAuctionValue
      return `${p.name} (${p.position}, ${p.team}) — consensus $${p.consensusAuctionValue}, strategy-adj $${adj}, score ${sp.strategyScore}, proj ${Math.round(p.projections.points)} pts${sp.targetStatus !== 'neutral' ? ` [${sp.targetStatus}]` : ''}`
    } else {
      const baseRound = Math.ceil(p.adp / 12)
      const adj = sp.adjustedRoundValue ?? baseRound
      return `${p.name} (${p.position}, ${p.team}) — ADP ${Math.round(p.adp)}, round ${baseRound}, strategy-adj round ${adj}, score ${sp.strategyScore}, proj ${Math.round(p.projections.points)} pts${sp.targetStatus !== 'neutral' ? ` [${sp.targetStatus}]` : ''}`
    }
  }).join('\n')

  const prompt = `## League
${formatLeagueContext(format, scoringFormat, teamCount, budget, scoringSettings)}

## Active Strategy
${formatStrategyContext(strategy)}

## Top 60 Scored Players
${playerLines}

## Task
For each of these top 60 players, provide ${format === 'auction' ? 'adjusted auction values' : 'adjusted round targets'}:

- name: exact player name
- position: player position
- team: NFL team
- consensusValue: ${format === 'auction' ? 'original consensus $ value' : 'ADP-based round'}
- adjustedValue: your strategy-adjusted ${valueCol}
- floor: ${format === 'auction' ? 'minimum you should pay' : 'earliest round worth drafting'}
- ceiling: ${format === 'auction' ? 'maximum you should bid' : 'latest round still worth taking'}
- target: ${format === 'auction' ? 'ideal bid amount' : 'ideal round to draft'}
- reasoning: 1 sentence on why this adjustment (cite strategy, scoring, scarcity)
- confidence: "high" | "medium" | "low"

Also provide a "summary": 2-3 sentences on overall value landscape and where the biggest edges are.

${format === 'auction' ? `Budget: $${budget ?? 200}. Floor/ceiling/target are dollar amounts. Factor in budget allocation from the strategy.` : 'Floor/ceiling/target are round numbers (1 = first round). Factor in round targets from the strategy.'}`

  const response = await askClaudeJson<{ adjustments: PlayerValueAdjustment[]; summary: string }>({
    system: VALUE_ADJUSTMENTS_SYSTEM,
    prompt,
    maxTokens: 8000,
  })

  return {
    adjustments: response.adjustments,
    format,
    strategyName: strategy.name,
    summary: response.summary,
  }
}

// --- FF-021: Target List + Avoid List ---

export interface TargetPlayer {
  name: string
  position: string
  team: string
  value: number
  reasoning: string
  urgency: 'must-have' | 'strong-target' | 'nice-to-have'
}

export interface AvoidPlayer {
  name: string
  position: string
  team: string
  value: number
  reasoning: string
  severity: 'hard-avoid' | 'overpriced' | 'risky'
}

export interface TargetAvoidResult {
  targets: TargetPlayer[]
  avoids: AvoidPlayer[]
  format: DraftFormat
  strategyName: string
  summary: string
}

const TARGET_AVOID_SYSTEM = `You are a fantasy football analyst identifying best-value targets and overpriced/risky players to avoid.

RULES:
- Only reference players from the provided data. Never invent players.
- Targets = best value plays given the active strategy. Avoids = overpriced, risky, or filtered out.
- Every recommendation cites specific data: values, ADP, projections, strategy alignment.
- Respond with valid JSON only.

Respond with: { "targets": [...], "avoids": [...], "summary": "..." }`

export async function analyzeTargetsAndAvoids(
  scoredPlayers: ScoredPlayer[],
  strategy: Strategy,
  format: DraftFormat,
  scoringFormat: ScoringFormat,
  teamCount: number,
  budget?: number,
  scoringSettings?: ScoringSettings | null,
): Promise<TargetAvoidResult> {
  // Send top 80 players for analysis
  const top80 = scoredPlayers.slice(0, 80)
  const playerLines = top80.map((sp) => {
    const p = sp.player
    if (format === 'auction') {
      return `${p.name} (${p.position}, ${p.team}) — $${p.consensusAuctionValue}, adj $${sp.adjustedAuctionValue ?? p.consensusAuctionValue}, score ${sp.strategyScore}, proj ${Math.round(p.projections.points)} pts${sp.targetStatus !== 'neutral' ? ` [${sp.targetStatus}]` : ''}`
    } else {
      return `${p.name} (${p.position}, ${p.team}) — ADP ${Math.round(p.adp)}, adj round ${sp.adjustedRoundValue ?? Math.ceil(p.adp / 12)}, score ${sp.strategyScore}, proj ${Math.round(p.projections.points)} pts${sp.targetStatus !== 'neutral' ? ` [${sp.targetStatus}]` : ''}`
    }
  }).join('\n')

  const valueLabel = format === 'auction' ? 'target bid ($)' : 'target round'

  const prompt = `## League
${formatLeagueContext(format, scoringFormat, teamCount, budget, scoringSettings)}

## Active Strategy
${formatStrategyContext(strategy)}

## Scored Players
${playerLines}

## Task
Identify the 15 best TARGET players and 10 AVOID players for this strategy.

TARGETS (best value plays):
- name, position, team
- value: ${valueLabel}
- reasoning: 1-2 sentences citing data (why this player is a value at this price/ADP given the strategy)
- urgency: "must-have" | "strong-target" | "nice-to-have"

AVOIDS (overpriced, risky, or poor strategy fit):
- name, position, team
- value: ${format === 'auction' ? 'consensus $ value (what others will pay)' : 'ADP round'}
- reasoning: 1-2 sentences citing data (why to avoid — overpriced, injury risk, bad fit, etc.)
- severity: "hard-avoid" | "overpriced" | "risky"

Include players marked [target] in strategy as targets (if data supports it).
Include players marked [avoid] in strategy as avoids.
Also find VALUE plays not in the target list — players whose consensus value underestimates their worth for this strategy.

Provide a "summary": 2-3 sentences on the overall target/avoid landscape.`

  const response = await askClaudeJson<{ targets: TargetPlayer[]; avoids: AvoidPlayer[]; summary: string }>({
    system: TARGET_AVOID_SYSTEM,
    prompt,
    maxTokens: 5000,
  })

  return {
    targets: response.targets,
    avoids: response.avoids,
    format,
    strategyName: strategy.name,
    summary: response.summary,
  }
}

// --- FF-022: Tier Analysis ---

export interface TierBreak {
  position: string
  tierNumber: number
  startsAtRank: number
  endsAtRank: number
  players: string[]
  dropoffSeverity: 'cliff' | 'moderate' | 'gradual'
  insight: string
}

export interface TierAnalysisResult {
  tiers: TierBreak[]
  format: DraftFormat
  strategyName: string
  summary: string
}

const TIER_ANALYSIS_SYSTEM = `You are a fantasy football tier analyst identifying where value drops off by position.

RULES:
- Only reference players from the provided data.
- Tiers are based on production dropoff, not arbitrary groupings.
- Strategy-adjusted: position emphasis affects how much a tier break matters.
- Respond with valid JSON only.

Respond with: { "tiers": [...], "summary": "..." }`

export async function analyzeTiers(
  scoredPlayers: ScoredPlayer[],
  strategy: Strategy,
  format: DraftFormat,
  scoringFormat: ScoringFormat,
  teamCount: number,
  budget?: number,
  scoringSettings?: ScoringSettings | null,
): Promise<TierAnalysisResult> {
  const positions = ['QB', 'RB', 'WR', 'TE']
  const positionData = positions.map((pos) => {
    const data = formatPlayerData(scoredPlayers, format, pos, 30)
    return `### ${pos}\n${data}`
  }).join('\n\n')

  const prompt = `## League
${formatLeagueContext(format, scoringFormat, teamCount, budget, scoringSettings)}

## Active Strategy
${formatStrategyContext(strategy)}

## Scored Player Data
${positionData}

## Task
Identify tier breaks for each skill position (QB, RB, WR, TE). A tier break is where player value drops significantly.

For each tier break:
- position: QB, RB, WR, or TE
- tierNumber: 1, 2, 3, etc. (1 = elite tier)
- startsAtRank: position rank where this tier begins
- endsAtRank: position rank where this tier ends
- players: array of player names in this tier
- dropoffSeverity: "cliff" (massive drop), "moderate" (notable drop), "gradual" (gentle decline)
- insight: 1 sentence on what this tier break means for the strategy (e.g. "After tier 2 WR, value drops sharply — prioritize WR in rounds 2-4")

For each position, identify 3-5 tiers.

Strategy context matters:
- If position weight is high (7+), tier breaks at that position are MORE important
- If position weight is low (3-), tier breaks are less actionable
- ${format === 'auction' ? 'Reference $ values at tier boundaries' : 'Reference ADP/round at tier boundaries'}

Provide a "summary": 2-3 sentences on the most actionable tier breaks for this strategy.`

  const response = await askClaudeJson<{ tiers: TierBreak[]; summary: string }>({
    system: TIER_ANALYSIS_SYSTEM,
    prompt,
    maxTokens: 5000,
  })

  return {
    tiers: response.tiers,
    format,
    strategyName: strategy.name,
    summary: response.summary,
  }
}

// --- FF-023: Sleeper Picks ---

export interface SleeperPick {
  name: string
  position: string
  team: string
  consensusValue: number
  projectedValue: number
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
  catalysts: string[]
  strategyAlignment: string
}

export interface SleeperPicksResult {
  sleepers: SleeperPick[]
  format: DraftFormat
  strategyName: string
  summary: string
}

const SLEEPER_PICKS_SYSTEM = `You are a fantasy football analyst identifying undervalued sleeper picks.

RULES:
- Only reference players from the provided data. Never invent players.
- Sleepers = players whose consensus value significantly underestimates their potential.
- Look for: expert disagreement (wide ADP ranges), rising trends, strategy alignment, upside indicators.
- Respond with valid JSON only.

Respond with: { "sleepers": [...], "summary": "..." }`

export async function analyzeSleeperPicks(
  scoredPlayers: ScoredPlayer[],
  strategy: Strategy,
  format: DraftFormat,
  scoringFormat: ScoringFormat,
  teamCount: number,
  budget?: number,
  scoringSettings?: ScoringSettings | null,
): Promise<SleeperPicksResult> {
  // Focus on mid-to-late range players (ranks 30-150) — that's where sleepers live
  const candidates = scoredPlayers.filter((sp) => {
    const rank = sp.player.consensusRank
    return rank >= 30 && rank <= 150
  })

  const playerLines = candidates.slice(0, 60).map((sp) => {
    const p = sp.player
    if (format === 'auction') {
      return `${p.name} (${p.position}, ${p.team}) — $${p.consensusAuctionValue}, adj $${sp.adjustedAuctionValue ?? p.consensusAuctionValue}, score ${sp.strategyScore}, proj ${Math.round(p.projections.points)} pts, rank ${p.consensusRank}${sp.targetStatus !== 'neutral' ? ` [${sp.targetStatus}]` : ''}${p.injuryStatus ? ` [${p.injuryStatus}]` : ''}`
    } else {
      return `${p.name} (${p.position}, ${p.team}) — ADP ${Math.round(p.adp)}, adj round ${sp.adjustedRoundValue ?? Math.ceil(p.adp / 12)}, score ${sp.strategyScore}, proj ${Math.round(p.projections.points)} pts, rank ${p.consensusRank}${sp.targetStatus !== 'neutral' ? ` [${sp.targetStatus}]` : ''}${p.injuryStatus ? ` [${p.injuryStatus}]` : ''}`
    }
  }).join('\n')

  const prompt = `## League
${formatLeagueContext(format, scoringFormat, teamCount, budget, scoringSettings)}

## Active Strategy
${formatStrategyContext(strategy)}

## Mid-to-Late Range Players (ranks 30-150)
${playerLines}

## Task
Identify 10 SLEEPER PICKS — undervalued players who could significantly outperform their consensus ranking.

For each sleeper:
- name: exact player name
- position, team
- consensusValue: ${format === 'auction' ? 'current consensus $ value' : 'current ADP round'}
- projectedValue: ${format === 'auction' ? 'what you think they should be worth ($)' : 'round they should be drafted in'}
- reasoning: 2-3 sentences on why this player is undervalued (cite projections, strategy score, positional context)
- confidence: "high" | "medium" | "low"
- catalysts: array of 2-3 reasons they could break out (e.g. "new offensive coordinator", "reduced target competition", "year 2 leap")
- strategyAlignment: 1 sentence on how this sleeper fits the active strategy

Look for:
1. High strategy score relative to consensus rank (the scoring engine sees value others don't)
2. High projected points relative to draft position
3. Players at high-emphasis positions (position weight 7+) who are available late
4. Players on teams NOT in the team-avoids list

Provide a "summary": 2-3 sentences on the best sleeper opportunities for this strategy.`

  const response = await askClaudeJson<{ sleepers: SleeperPick[]; summary: string }>({
    system: SLEEPER_PICKS_SYSTEM,
    prompt,
    maxTokens: 5000,
  })

  return {
    sleepers: response.sleepers,
    format,
    strategyName: strategy.name,
    summary: response.summary,
  }
}
