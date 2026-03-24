/**
 * Strategy Scoring Engine (FF-S02, FF-227, FF-230)
 *
 * Applies strategy filters (position weights, targets, avoids, team avoids)
 * to player data and produces a strategy-adjusted score per player.
 *
 * Also integrates:
 * - User tags (TARGET +25, AVOID -30) from FF-227
 * - System tags (BREAKOUT, SLEEPER, VALUE, BUST, AVOID) from intel
 * - User rules (custom modifiers) from FF-230
 *
 * Auction mode: adjusts auction values based on budget allocation + position emphasis.
 * Snake mode: adjusts ADP/round value based on round targets + position emphasis.
 * No cross-contamination between formats.
 */

import type { Player, DraftFormat } from '@/lib/players/types'
import type { Strategy as DbStrategy, SystemTag } from '@/lib/supabase/database.types'

// --- Score Modifier Constants (FF-227) ---

export const USER_TAG_MODIFIERS = {
  target: 25,   // Highest priority - user wants this player
  avoid: -30,   // Strong penalty - user wants to avoid (stronger than system AVOID)
  watch: 5,     // Minor boost - player is on watchlist
  sleeper: 8,   // User-identified sleeper
  breakout: 10, // User-identified breakout candidate
} as const

export const SYSTEM_TAG_MODIFIERS = {
  BREAKOUT: 15,  // System detected breakout signals
  SLEEPER: 10,   // System detected undervalued player
  VALUE: 12,     // ADP vs rank gap detected
  BUST: -20,     // System detected bust signals
  AVOID: -25,    // System detected avoid signals
} as const

// --- Types ---

export interface PlayerIntelContext {
  systemTags?: SystemTag[]
  userTags?: string[]
  dismissedSystemTags?: string[]
  userRuleModifiers?: number[]
}

export interface ScoredPlayer {
  player: Player
  strategyScore: number // 0-100, higher = better fit for this strategy
  intelScore: number // Score from intel system (user tags + system tags + rules)
  combinedScore: number // Final score combining strategy + intel
  adjustedAuctionValue?: number // auction only
  adjustedRoundValue?: number // snake only: ideal round to draft
  targetStatus: 'target' | 'avoid' | 'neutral'
  isUserTarget: boolean // Has user TARGET tag
  isUserAvoid: boolean // Has user AVOID tag
  boosts: string[] // human-readable reasons for score adjustments
  intelBoosts: string[] // boosts from intel system
}

/**
 * Score and rank players through the lens of a strategy.
 * Returns players sorted by combinedScore descending.
 *
 * @param players - Array of players to score
 * @param strategy - Active strategy profile
 * @param format - Draft format (auction or snake)
 * @param leagueBudget - League budget (auction only)
 * @param intelMap - Optional map of playerCacheId -> intel context
 */
export function scorePlayersWithStrategy(
  players: Player[],
  strategy: DbStrategy,
  format: DraftFormat,
  leagueBudget?: number,
  intelMap?: Map<string, PlayerIntelContext>
): ScoredPlayer[] {
  return players
    .map((player) => {
      const intel = intelMap?.get(player.id)
      return scorePlayer(player, strategy, format, leagueBudget, intel)
    })
    .sort((a, b) => b.combinedScore - a.combinedScore)
}

function scorePlayer(
  player: Player,
  strategy: DbStrategy,
  format: DraftFormat,
  leagueBudget?: number,
  intel?: PlayerIntelContext
): ScoredPlayer {
  let strategyScore = 50 // baseline
  const boosts: string[] = []
  const intelBoosts: string[] = []

  // --- Position weight boost ---
  const posKey = player.position === 'DEF' ? 'DST' : player.position
  const posWeight = (strategy.position_weights as Record<string, number>)[posKey] ?? 5
  const posBoost = (posWeight - 5) * 4 // -16 to +20
  strategyScore += posBoost
  if (posBoost > 0) boosts.push(`+${posBoost} position emphasis (${player.position}: ${posWeight}/10)`)
  if (posBoost < 0) boosts.push(`${posBoost} position de-emphasized (${player.position}: ${posWeight}/10)`)

  // --- Player target boost ---
  const target = strategy.player_targets.find((t) => t.player_id === player.id)
  if (target) {
    const targetBoost = target.weight * 3 // +3 to +30
    strategyScore += targetBoost
    boosts.push(`+${targetBoost} targeted player (weight ${target.weight}/10)`)
  }

  // --- Player avoid penalty ---
  const avoid = strategy.player_avoids.find((a) => a.player_id === player.id)
  if (avoid) {
    const penalty = avoid.severity === 'hard' ? -40 : -20
    strategyScore += penalty
    boosts.push(`${penalty} avoided player (${avoid.severity})${avoid.reason ? `: ${avoid.reason}` : ''}`)
  }

  // --- Team avoid penalty ---
  if (strategy.team_avoids.includes(player.team)) {
    strategyScore -= 10
    boosts.push(`-10 team avoided (${player.team})`)
  }

  // --- Risk alignment ---
  const riskScore = getRiskAlignment(player, strategy.risk_tolerance)
  if (riskScore !== 0) {
    strategyScore += riskScore
    boosts.push(`${riskScore > 0 ? '+' : ''}${riskScore} risk alignment (${strategy.risk_tolerance})`)
  }

  // Clamp strategy score
  strategyScore = Math.max(0, Math.min(100, strategyScore))

  // --- Intel Score Calculation (FF-227) ---
  let intelScore = 0
  const userTags = intel?.userTags ?? []
  const isUserTarget = userTags.includes('target')
  const isUserAvoid = userTags.includes('avoid')

  // Apply user tag modifiers
  if (isUserTarget) {
    intelScore += USER_TAG_MODIFIERS.target
    intelBoosts.push(`+${USER_TAG_MODIFIERS.target} TARGET (user)`)
  }
  if (isUserAvoid) {
    intelScore += USER_TAG_MODIFIERS.avoid
    intelBoosts.push(`${USER_TAG_MODIFIERS.avoid} AVOID (user)`)
  }
  if (userTags.includes('watch')) {
    intelScore += USER_TAG_MODIFIERS.watch
    intelBoosts.push(`+${USER_TAG_MODIFIERS.watch} WATCH (user)`)
  }
  if (userTags.includes('sleeper')) {
    intelScore += USER_TAG_MODIFIERS.sleeper
    intelBoosts.push(`+${USER_TAG_MODIFIERS.sleeper} SLEEPER (user)`)
  }
  if (userTags.includes('breakout')) {
    intelScore += USER_TAG_MODIFIERS.breakout
    intelBoosts.push(`+${USER_TAG_MODIFIERS.breakout} BREAKOUT (user)`)
  }

  // Apply system tag modifiers (unless dismissed by user)
  const dismissedTags = new Set(intel?.dismissedSystemTags ?? [])
  for (const sysTag of intel?.systemTags ?? []) {
    if (dismissedTags.has(sysTag.tag)) continue

    const modifier = SYSTEM_TAG_MODIFIERS[sysTag.tag as keyof typeof SYSTEM_TAG_MODIFIERS]
    if (modifier !== undefined) {
      intelScore += modifier
      intelBoosts.push(`${modifier > 0 ? '+' : ''}${modifier} ${sysTag.tag} (system: ${sysTag.reasoning})`)
    }
  }

  // Apply user rule modifiers
  for (const modifier of intel?.userRuleModifiers ?? []) {
    intelScore += modifier
    intelBoosts.push(`${modifier > 0 ? '+' : ''}${modifier} (user rule)`)
  }

  // Calculate combined score (strategy baseline + intel adjustments)
  // Intel score is additive to strategy score
  let combinedScore = strategyScore + intelScore
  combinedScore = Math.max(0, Math.min(100, combinedScore))

  // --- Format-specific value adjustments ---
  let adjustedAuctionValue: number | undefined
  let adjustedRoundValue: number | undefined

  // Target status considers both strategy and user tags
  const targetStatus = getTargetStatus(combinedScore, isUserAvoid || !!avoid, isUserTarget)

  if (format === 'auction' && strategy.budget_allocation && leagueBudget) {
    adjustedAuctionValue = computeAdjustedAuctionValue(player, strategy, leagueBudget, combinedScore)
  }

  if (format === 'snake' && strategy.round_targets) {
    adjustedRoundValue = computeAdjustedRoundValue(player, strategy, combinedScore)
  }

  return {
    player,
    strategyScore: Math.round(strategyScore),
    intelScore: Math.round(intelScore),
    combinedScore: Math.round(combinedScore),
    adjustedAuctionValue,
    adjustedRoundValue,
    targetStatus,
    isUserTarget,
    isUserAvoid,
    boosts,
    intelBoosts,
  }
}

function getRiskAlignment(
  player: Player,
  riskTolerance: string
): number {
  if (!player.analysis) return 0

  const playerRisk = player.analysis.riskLevel
  if (riskTolerance === 'aggressive' && playerRisk === 'high') return 5
  if (riskTolerance === 'aggressive' && playerRisk === 'low') return -3
  if (riskTolerance === 'conservative' && playerRisk === 'high') return -8
  if (riskTolerance === 'conservative' && playerRisk === 'low') return 5
  return 0
}

function getTargetStatus(
  score: number,
  isAvoided: boolean,
  isUserTarget: boolean = false
): 'target' | 'avoid' | 'neutral' {
  // User TARGET always takes precedence
  if (isUserTarget) return 'target'
  if (isAvoided) return 'avoid'
  if (score >= 70) return 'target'
  return 'neutral'
}

/**
 * Auction: adjust consensus value by position budget weight and strategy score.
 * Higher position budget % = willing to pay more for that position.
 */
function computeAdjustedAuctionValue(
  player: Player,
  strategy: DbStrategy,
  leagueBudget: number,
  score: number
): number {
  const baseValue = player.consensusAuctionValue || 1
  const posKey = player.position as string
  const posBudgetPct = strategy.budget_allocation?.[posKey] ?? 10
  const budgetMultiplier = posBudgetPct / 15 // 15% is "neutral" baseline

  // Score multiplier: 50 = 1.0x, 80 = 1.15x, 20 = 0.85x
  const scoreMultiplier = 1 + (score - 50) * 0.005

  const adjusted = baseValue * budgetMultiplier * scoreMultiplier

  // Cap at max bid percentage
  const maxBid = strategy.max_bid_percentage
    ? (leagueBudget * strategy.max_bid_percentage) / 100
    : leagueBudget * 0.35

  return Math.max(1, Math.min(Math.round(adjusted), maxBid))
}

/**
 * Snake: compute ideal round to draft this player based on round targets and score.
 * Lower = draft earlier.
 */
function computeAdjustedRoundValue(
  player: Player,
  strategy: DbStrategy,
  score: number
): number {
  const baseRound = Math.ceil(player.adp / 12) || 10 // fallback to round 10
  const rtPosKey = player.position === 'DEF' ? 'DST' : player.position
  const posTargetRounds = (strategy.round_targets as Record<string, number[]> | null)?.[rtPosKey]

  if (!posTargetRounds || posTargetRounds.length === 0) return baseRound

  // Find the closest target round to the player's ADP-based round
  const closestTargetRound = posTargetRounds.reduce((best, r) =>
    Math.abs(r - baseRound) < Math.abs(best - baseRound) ? r : best
  )

  // Blend ADP round with strategy target: high score = pull toward target, low score = ignore
  const blendWeight = Math.max(0, Math.min(1, (score - 30) / 50)) // 0 at score 30, 1 at score 80
  const adjusted = baseRound * (1 - blendWeight) + closestTargetRound * blendWeight

  return Math.max(1, Math.round(adjusted))
}

// --- Helper Functions for Building Intel Context ---

/**
 * Build an intel context map from user tags and player intel data.
 * Used to pass into scorePlayersWithStrategy.
 *
 * @param userTagsMap - Map of playerCacheId -> user tags data (from useUserTags hook)
 * @param playerIntelMap - Map of playerCacheId -> player intel data (optional)
 * @param userRulesMap - Map of playerCacheId -> array of rule modifiers (optional)
 */
export function buildIntelContextMap(
  userTagsMap: Record<string, {
    tags: string[]
    dismissedSystemTags?: string[]
  }>,
  playerIntelMap?: Record<string, { systemTags?: SystemTag[] }>,
  userRulesMap?: Record<string, number[]>
): Map<string, PlayerIntelContext> {
  const map = new Map<string, PlayerIntelContext>()

  // Process user tags
  for (const [playerId, userData] of Object.entries(userTagsMap)) {
    const existing = map.get(playerId) ?? {}
    map.set(playerId, {
      ...existing,
      userTags: userData.tags,
      dismissedSystemTags: userData.dismissedSystemTags,
    })
  }

  // Add player intel (system tags)
  if (playerIntelMap) {
    for (const [playerId, intel] of Object.entries(playerIntelMap)) {
      const existing = map.get(playerId) ?? {}
      map.set(playerId, {
        ...existing,
        systemTags: intel.systemTags,
      })
    }
  }

  // Add user rule modifiers
  if (userRulesMap) {
    for (const [playerId, modifiers] of Object.entries(userRulesMap)) {
      const existing = map.get(playerId) ?? {}
      map.set(playerId, {
        ...existing,
        userRuleModifiers: modifiers,
      })
    }
  }

  return map
}

/**
 * Calculate the intel score for a single player (without strategy context).
 * Useful for displaying intel impact separately.
 */
export function calculateIntelScore(
  userTags: string[],
  systemTags?: SystemTag[],
  dismissedSystemTags?: string[],
  userRuleModifiers?: number[]
): { score: number; boosts: string[] } {
  let score = 0
  const boosts: string[] = []

  // User tags
  if (userTags.includes('target')) {
    score += USER_TAG_MODIFIERS.target
    boosts.push(`+${USER_TAG_MODIFIERS.target} TARGET`)
  }
  if (userTags.includes('avoid')) {
    score += USER_TAG_MODIFIERS.avoid
    boosts.push(`${USER_TAG_MODIFIERS.avoid} AVOID`)
  }
  if (userTags.includes('watch')) {
    score += USER_TAG_MODIFIERS.watch
    boosts.push(`+${USER_TAG_MODIFIERS.watch} WATCH`)
  }
  if (userTags.includes('sleeper')) {
    score += USER_TAG_MODIFIERS.sleeper
    boosts.push(`+${USER_TAG_MODIFIERS.sleeper} SLEEPER`)
  }
  if (userTags.includes('breakout')) {
    score += USER_TAG_MODIFIERS.breakout
    boosts.push(`+${USER_TAG_MODIFIERS.breakout} BREAKOUT`)
  }

  // System tags
  const dismissed = new Set(dismissedSystemTags ?? [])
  for (const sysTag of systemTags ?? []) {
    if (dismissed.has(sysTag.tag)) continue

    const modifier = SYSTEM_TAG_MODIFIERS[sysTag.tag as keyof typeof SYSTEM_TAG_MODIFIERS]
    if (modifier !== undefined) {
      score += modifier
      boosts.push(`${modifier > 0 ? '+' : ''}${modifier} ${sysTag.tag}`)
    }
  }

  // User rules
  for (const modifier of userRuleModifiers ?? []) {
    score += modifier
    boosts.push(`${modifier > 0 ? '+' : ''}${modifier} (rule)`)
  }

  return { score, boosts }
}

/**
 * Compute rule modifiers for all players based on active rules.
 * Returns a map of playerCacheId -> array of modifiers.
 *
 * This is used to build the intel context map for scorePlayersWithStrategy.
 *
 * @param rules - Array of parsed rules (from user_rules table)
 * @param players - Array of player data to evaluate against rules
 */
export function computeRuleModifiersForPlayers(
  rules: Array<{
    parsedRule: {
      action: string
      conditions: Array<{
        field: string
        operator: string
        value: string | number | string[]
      }>
      score_modifier: number
    }
    isActive: boolean
  }>,
  players: Array<{
    id: string
    position?: string
    team?: string | null
    age?: number
    years_exp?: number
    injury_status?: string | null
    bye_week?: number | null
    adp?: number
    auction_value?: number
    rank?: number
    tier?: number
    tags?: string[]
    name?: string
  }>
): Record<string, number[]> {
  const modifiersMap: Record<string, number[]> = {}

  // Only process active rules
  const activeRules = rules.filter((r) => r.isActive)

  for (const player of players) {
    const playerModifiers: number[] = []

    for (const rule of activeRules) {
      const modifier = applyParsedRuleToPlayer(rule.parsedRule, player)
      if (modifier !== 0) {
        playerModifiers.push(modifier)
      }
    }

    if (playerModifiers.length > 0) {
      modifiersMap[player.id] = playerModifiers
    }
  }

  return modifiersMap
}

/**
 * Apply a single parsed rule to a player and return the modifier.
 */
function applyParsedRuleToPlayer(
  parsedRule: {
    conditions: Array<{
      field: string
      operator: string
      value: string | number | string[]
    }>
    score_modifier: number
  },
  player: {
    position?: string
    team?: string | null
    age?: number
    years_exp?: number
    injury_status?: string | null
    bye_week?: number | null
    adp?: number
    auction_value?: number
    rank?: number
    tier?: number
    tags?: string[]
    name?: string
  }
): number {
  // Check if all conditions match
  for (const condition of parsedRule.conditions) {
    const playerValue = getPlayerValue(player, condition.field)
    const matches = evaluateRuleCondition(playerValue, condition.operator, condition.value)

    if (!matches) {
      return 0 // Rule doesn't apply
    }
  }

  // All conditions matched
  return parsedRule.score_modifier
}

/**
 * Get a field value from a player object
 */
function getPlayerValue(
  player: {
    position?: string
    team?: string | null
    age?: number
    years_exp?: number
    injury_status?: string | null
    bye_week?: number | null
    adp?: number
    auction_value?: number
    rank?: number
    tier?: number
    tags?: string[]
    name?: string
  },
  field: string
): string | number | string[] | null | undefined {
  switch (field) {
    case 'position':
      return player.position
    case 'team':
      return player.team
    case 'age':
      return player.age
    case 'years_exp':
      return player.years_exp
    case 'injury_status':
      return player.injury_status ?? ''
    case 'bye_week':
      return player.bye_week
    case 'adp':
      return player.adp
    case 'auction_value':
      return player.auction_value
    case 'rank':
      return player.rank
    case 'tier':
      return player.tier
    case 'tag':
      return player.tags
    case 'name':
      return player.name
    default:
      return undefined
  }
}

/**
 * Evaluate a rule condition against a player value
 */
function evaluateRuleCondition(
  playerValue: string | number | string[] | null | undefined,
  operator: string,
  conditionValue: string | number | string[]
): boolean {
  // Handle null/undefined
  if (playerValue === null || playerValue === undefined) {
    if (operator === 'equals' && conditionValue === '') return true
    if (operator === 'not_equals' && conditionValue === '') return false
    return false
  }

  switch (operator) {
    case 'equals':
      if (Array.isArray(playerValue)) {
        return playerValue.includes(conditionValue as string)
      }
      return String(playerValue).toLowerCase() === String(conditionValue).toLowerCase()

    case 'not_equals':
      if (Array.isArray(playerValue)) {
        return !playerValue.includes(conditionValue as string)
      }
      return String(playerValue).toLowerCase() !== String(conditionValue).toLowerCase()

    case 'greater_than':
      return Number(playerValue) > Number(conditionValue)

    case 'less_than':
      return Number(playerValue) < Number(conditionValue)

    case 'contains':
      if (Array.isArray(playerValue)) {
        return playerValue.some((v) =>
          String(v).toLowerCase().includes(String(conditionValue).toLowerCase())
        )
      }
      return String(playerValue).toLowerCase().includes(String(conditionValue).toLowerCase())

    case 'in_list':
      if (Array.isArray(conditionValue)) {
        return conditionValue.some((cv) =>
          String(cv).toLowerCase() === String(playerValue).toLowerCase()
        )
      }
      return false

    default:
      return false
  }
}
