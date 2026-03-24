/**
 * LLM Rule Parser (FF-228)
 *
 * Parses natural language rules into structured conditions using Claude.
 *
 * Examples:
 * - "Avoid all WRs from Dallas" -> {action: "avoid", conditions: [{field: "position", op: "equals", value: "WR"}, {field: "team", op: "equals", value: "DAL"}], score_modifier: -30}
 * - "Target late-round RBs with receiving upside" -> parsed conditions
 * - "Prioritize players on teams with new OCs" -> parsed conditions
 */

import { askClaudeJson } from '@/lib/ai/claude'
import type { ParsedRule, RuleCondition, RuleType, ConditionOperator } from '@/lib/supabase/database.types'

// --- Types ---

export interface ParseRuleResult {
  success: boolean
  parsedRule?: ParsedRule
  interpretation?: string
  error?: string
  confidence: number
}

export interface ValidateRuleResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// --- Constants ---

// Default score modifiers by rule type
const DEFAULT_MODIFIERS: Record<RuleType, number> = {
  avoid: -30,
  target: 25,
  boost: 15,
  filter: 0,
  custom: 0,
}

// Valid fields for conditions
const VALID_FIELDS = [
  'position',      // QB, RB, WR, TE, K, DST
  'team',          // NFL team abbreviations (DAL, KC, etc.)
  'age',           // Player age
  'years_exp',     // Years of NFL experience
  'injury_status', // Injury designation
  'bye_week',      // Bye week number
  'adp',           // Average draft position
  'auction_value', // Consensus auction value
  'rank',          // Consensus rank
  'tier',          // Position tier
  'tag',           // System or user tag
  'name',          // Player name (partial match)
] as const

// NFL team abbreviations
const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAC', 'KC',
  'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS',
] as const

// --- Prompt ---

const RULE_PARSER_SYSTEM_PROMPT = `You are a fantasy football rule parser. Your job is to convert natural language rules into structured JSON conditions.

IMPORTANT: Output ONLY valid JSON. No markdown, no explanation, just the JSON object.

The output schema is:
{
  "action": "avoid" | "target" | "boost" | "filter" | "custom",
  "conditions": [
    {
      "field": string,  // position, team, age, years_exp, injury_status, bye_week, adp, auction_value, rank, tier, tag, name
      "operator": "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in_list",
      "value": string | number | string[]
    }
  ],
  "score_modifier": number,  // -50 to +50
  "confidence": number,      // 0 to 1
  "interpretation": string   // Human-readable explanation of what this rule does
}

Field reference:
- position: QB, RB, WR, TE, K, DST
- team: NFL team abbreviations (DAL, KC, LAR, etc.)
- age: Player age as number
- years_exp: Years of experience as number (0 = rookie)
- injury_status: Q, D, O, IR, or empty
- bye_week: Week number 1-18
- adp: Average draft position (numeric)
- auction_value: Dollar value (numeric)
- rank: Overall rank (numeric)
- tier: Position tier (numeric)
- tag: BREAKOUT, SLEEPER, VALUE, BUST, AVOID, target, avoid, watch
- name: Player name (partial match with "contains")

Team name mappings:
- Dallas Cowboys = DAL
- Kansas City Chiefs = KC
- San Francisco 49ers = SF
- Los Angeles Rams = LAR
- Los Angeles Chargers = LAC
- Las Vegas Raiders = LV
- New England Patriots = NE
- New York Giants = NYG
- New York Jets = NYJ
- Tampa Bay Buccaneers = TB
- Green Bay Packers = GB
- Washington Commanders = WAS
(use standard 2-3 letter NFL abbreviations for all teams)

Score modifier guidelines:
- avoid rules: -20 to -40 (default -30)
- target rules: +15 to +30 (default +25)
- boost rules: +5 to +20 (default +15)
- filter rules: 0 (just for filtering, no score impact)

Confidence guidelines:
- 1.0: Clear, unambiguous rule
- 0.8: Mostly clear, minor assumptions made
- 0.6: Some interpretation required
- 0.4: Vague, significant assumptions made
- 0.2: Very unclear, best guess

Examples:

Input: "Avoid all WRs from Dallas"
Output:
{
  "action": "avoid",
  "conditions": [
    {"field": "position", "operator": "equals", "value": "WR"},
    {"field": "team", "operator": "equals", "value": "DAL"}
  ],
  "score_modifier": -30,
  "confidence": 1.0,
  "interpretation": "Penalizes all Dallas Cowboys wide receivers by -30 points"
}

Input: "Target rookie RBs"
Output:
{
  "action": "target",
  "conditions": [
    {"field": "position", "operator": "equals", "value": "RB"},
    {"field": "years_exp", "operator": "equals", "value": 0}
  ],
  "score_modifier": 25,
  "confidence": 1.0,
  "interpretation": "Boosts all rookie running backs by +25 points"
}

Input: "Boost players with ADP over 100"
Output:
{
  "action": "boost",
  "conditions": [
    {"field": "adp", "operator": "greater_than", "value": 100}
  ],
  "score_modifier": 15,
  "confidence": 1.0,
  "interpretation": "Boosts players with ADP greater than 100 by +15 points"
}

Input: "Avoid injury-prone players"
Output:
{
  "action": "avoid",
  "conditions": [
    {"field": "injury_status", "operator": "not_equals", "value": ""}
  ],
  "score_modifier": -20,
  "confidence": 0.6,
  "interpretation": "Penalizes players with any injury designation. Note: 'injury-prone' is subjective; this interprets it as currently injured."
}`

// --- Main Functions ---

/**
 * Parse a natural language rule into structured conditions using Claude.
 */
export async function parseRule(ruleText: string): Promise<ParseRuleResult> {
  if (!ruleText || ruleText.trim().length === 0) {
    return {
      success: false,
      error: 'Rule text is empty',
      confidence: 0,
    }
  }

  if (ruleText.length > 500) {
    return {
      success: false,
      error: 'Rule text is too long (max 500 characters)',
      confidence: 0,
    }
  }

  try {
    const response = await askClaudeJson<{
      action: RuleType
      conditions: Array<{
        field: string
        operator: ConditionOperator
        value: string | number | string[]
      }>
      score_modifier: number
      confidence: number
      interpretation: string
    }>({
      system: RULE_PARSER_SYSTEM_PROMPT,
      prompt: `Parse this rule: "${ruleText}"`,
      tier: 'fast', // Use haiku for quick parsing
      maxTokens: 1024,
    })

    // Validate the response
    const validation = validateParsedRule(response)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join('; '),
        confidence: response.confidence ?? 0,
      }
    }

    // Build the ParsedRule object
    const parsedRule: ParsedRule = {
      action: response.action,
      conditions: response.conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
      score_modifier: Math.max(-50, Math.min(50, response.score_modifier)),
      confidence: Math.max(0, Math.min(1, response.confidence)),
    }

    return {
      success: true,
      parsedRule,
      interpretation: response.interpretation,
      confidence: parsedRule.confidence,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[parseRule] Error:', message)
    return {
      success: false,
      error: `Failed to parse rule: ${message}`,
      confidence: 0,
    }
  }
}

/**
 * Validate a parsed rule structure
 */
export function validateParsedRule(rule: {
  action?: RuleType
  conditions?: Array<{
    field: string
    operator: ConditionOperator
    value: string | number | string[]
  }>
  score_modifier?: number
  confidence?: number
}): ValidateRuleResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate action
  const validActions: RuleType[] = ['avoid', 'target', 'boost', 'filter', 'custom']
  if (!rule.action || !validActions.includes(rule.action)) {
    errors.push(`Invalid action: ${rule.action}. Must be one of: ${validActions.join(', ')}`)
  }

  // Validate conditions
  if (!rule.conditions || rule.conditions.length === 0) {
    errors.push('At least one condition is required')
  } else {
    for (const condition of rule.conditions) {
      // Validate field
      if (!VALID_FIELDS.includes(condition.field as typeof VALID_FIELDS[number])) {
        warnings.push(`Unknown field: ${condition.field}. May not be applicable.`)
      }

      // Validate operator
      const validOps: ConditionOperator[] = ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in_list']
      if (!validOps.includes(condition.operator)) {
        errors.push(`Invalid operator: ${condition.operator}`)
      }

      // Validate team abbreviations
      if (condition.field === 'team' && typeof condition.value === 'string') {
        if (!NFL_TEAMS.includes(condition.value as typeof NFL_TEAMS[number])) {
          warnings.push(`Unknown team: ${condition.value}. Use standard NFL abbreviations.`)
        }
      }

      // Validate position values
      if (condition.field === 'position' && typeof condition.value === 'string') {
        const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF']
        if (!validPositions.includes(condition.value)) {
          errors.push(`Invalid position: ${condition.value}`)
        }
      }

      // Validate numeric fields
      const numericFields = ['age', 'years_exp', 'bye_week', 'adp', 'auction_value', 'rank', 'tier']
      if (numericFields.includes(condition.field)) {
        if (typeof condition.value !== 'number' && isNaN(Number(condition.value))) {
          errors.push(`Field ${condition.field} requires a numeric value`)
        }
      }
    }
  }

  // Validate score modifier
  if (rule.score_modifier !== undefined) {
    if (rule.score_modifier < -50 || rule.score_modifier > 50) {
      warnings.push(`Score modifier ${rule.score_modifier} is outside typical range (-50 to +50)`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Apply a parsed rule to a player and return the score modifier if applicable.
 * Returns 0 if the rule doesn't apply to this player.
 */
export function applyRuleToPlayer(
  rule: ParsedRule,
  player: {
    position?: string
    team?: string
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
  for (const condition of rule.conditions) {
    const playerValue = getPlayerFieldValue(player, condition.field)
    const conditionMet = evaluateCondition(playerValue, condition.operator, condition.value)

    if (!conditionMet) {
      return 0 // Rule doesn't apply
    }
  }

  // All conditions matched
  return rule.score_modifier
}

/**
 * Get a field value from a player object
 */
function getPlayerFieldValue(
  player: {
    position?: string
    team?: string
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
 * Evaluate a single condition
 */
function evaluateCondition(
  playerValue: string | number | string[] | null | undefined,
  operator: ConditionOperator,
  conditionValue: string | number | string[]
): boolean {
  // Handle null/undefined player values
  if (playerValue === null || playerValue === undefined) {
    // Empty string comparisons
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

/**
 * Apply multiple rules to a player and return the total score modifier
 */
export function applyRulesToPlayer(
  rules: ParsedRule[],
  player: {
    position?: string
    team?: string
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
): { totalModifier: number; appliedRules: Array<{ rule: ParsedRule; modifier: number }> } {
  const appliedRules: Array<{ rule: ParsedRule; modifier: number }> = []
  let totalModifier = 0

  for (const rule of rules) {
    const modifier = applyRuleToPlayer(rule, player)
    if (modifier !== 0) {
      appliedRules.push({ rule, modifier })
      totalModifier += modifier
    }
  }

  return { totalModifier, appliedRules }
}

/**
 * Get example rules for the UI
 */
export function getExampleRules(): Array<{ text: string; description: string }> {
  return [
    { text: 'Avoid all WRs from Dallas', description: 'Penalizes Dallas Cowboys wide receivers' },
    { text: 'Target rookie RBs', description: 'Boosts first-year running backs' },
    { text: 'Boost players with ADP over 100', description: 'Favors late-round picks' },
    { text: 'Avoid players on bye week 7', description: 'Penalizes players with bye in week 7' },
    { text: 'Target WRs and TEs from KC', description: 'Boosts Chiefs pass catchers' },
    { text: 'Avoid injured players', description: 'Penalizes players with injury designation' },
    { text: 'Target players tagged as SLEEPER', description: 'Boosts system-detected sleepers' },
    { text: 'Boost QBs under 28 years old', description: 'Favors younger quarterbacks' },
  ]
}
