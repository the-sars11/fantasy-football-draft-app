/**
 * trash-talk-history.ts — Nasties owner history matching and injection (FF-311)
 *
 * At draft start, manager names are fuzzy-matched against history.json owner aliases
 * to build a TeamOwnerMap. On trigger fire, the matched owner's history is
 * injected into the Claude prompt as additional context via historyBlock.
 *
 * Ported from: fantasy_auction_auctioneer/src/lib/trash-talk-history.ts
 * Adaptations: buildTeamOwnerMap takes string[] managers (no team IDs);
 *              buildHistoryBlock uses TrashTalkType (not TrashTalkTrigger).
 */

import type { TrashTalkType } from './trash-talk'
import historyData from '@/data/history.json'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignatureMoment {
  year: number
  type: 'overpay' | 'steal' | 'bust' | 'champ_move' | 'record'
  player?: string
  price?: number
  outcome?: string
  note: string
}

export interface WorstSeason {
  year: number
  record?: string
  note: string
}

export interface OwnerHistory {
  id: string
  aliases: string[]
  championships: number[]
  worst_seasons: WorstSeason[]
  signature_moments: SignatureMoment[]
  patterns: string[]
  roast_ammo: string
}

export interface LeagueHistory {
  league: string
  founded: number
  seasons: number[]
  owners: Record<string, OwnerHistory>
}

/** Maps manager name to matched OwnerHistory (or null if no match) */
export type TeamOwnerMap = Record<string, OwnerHistory | null>

// ---------------------------------------------------------------------------
// loadHistory
// ---------------------------------------------------------------------------

/** Return the typed league history from the bundled JSON. */
export function loadHistory(): LeagueHistory {
  return historyData as LeagueHistory
}

// ---------------------------------------------------------------------------
// matchOwnerToHistory
// ---------------------------------------------------------------------------

/**
 * Attempt to match a manager name to a known Nasties owner via alias fuzzy-match.
 * Returns the OwnerHistory if matched, null if no alias matches.
 *
 * Match is case-insensitive. Checks if the manager name contains any alias,
 * or any alias contains the manager name token.
 */
export function matchOwnerToHistory(
  managerName: string,
  history: LeagueHistory,
): OwnerHistory | null {
  const normalized = managerName.toLowerCase().trim()
  for (const owner of Object.values(history.owners)) {
    for (const alias of owner.aliases) {
      const normalizedAlias = alias.toLowerCase()
      if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
        return owner
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// buildTeamOwnerMap
// ---------------------------------------------------------------------------

/**
 * Build a full TeamOwnerMap for all managers at draft start.
 * Call once when the draft loads; store the result and pass it through
 * to the trash talk engine on each trigger fire.
 *
 * Keyed by manager name string (from state.manager_order).
 */
export function buildTeamOwnerMap(
  managers: string[],
  history: LeagueHistory,
): TeamOwnerMap {
  const map: TeamOwnerMap = {}
  for (const name of managers) {
    map[name] = matchOwnerToHistory(name, history)
  }
  return map
}

// ---------------------------------------------------------------------------
// buildHistoryBlock
// ---------------------------------------------------------------------------

/**
 * Build the history context block injected into the Claude prompt user message.
 *
 * Filters for trigger-relevant moments where possible:
 * - overpay / budget_buster / bad_keeper → pull prior overpays/busts
 * - steal / keeper_steal                 → pull prior steals
 * - market_mismatch                      → pull overpays/steals/busts
 * - budget_dominance / last_big_spender  → pull champ_move moments
 * - Everything else                      → general roast_ammo only
 *
 * Returns empty string if no owner matched (trigger still fires, no history).
 * At most 2 moments appended to keep tokens under control.
 */
export function buildHistoryBlock(
  trigger: TrashTalkType,
  owner: OwnerHistory | null,
): string {
  if (!owner) return ''

  const lines: string[] = [
    `Historical context for ${owner.aliases[0]}:`,
    owner.roast_ammo,
  ]

  const relevantTypes = getTriggerRelevantMomentTypes(trigger)
  if (relevantTypes.length > 0) {
    const relevant = owner.signature_moments
      .filter(m => relevantTypes.includes(m.type))
      .slice(0, 2)

    for (const moment of relevant) {
      lines.push(`Relevant history: ${moment.year} -- ${moment.note}`)
    }
  }

  return lines.join('\n')
}

/** Map TrashTalkType to the signature moment types most relevant to it */
function getTriggerRelevantMomentTypes(
  trigger: TrashTalkType,
): SignatureMoment['type'][] {
  switch (trigger) {
    case 'overpay':
    case 'budget_buster':
      return ['overpay', 'bust']
    case 'steal':
      return ['steal']
    case 'market_mismatch':
      return ['overpay', 'steal', 'bust']
    case 'budget_dominance':
    case 'last_big_spender':
      return ['champ_move']
    default:
      return []
  }
}
