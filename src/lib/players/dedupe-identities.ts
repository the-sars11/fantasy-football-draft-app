/**
 * dedupe-identities.ts - collapse duplicate rows for the SAME human into one
 * Player. The players_cache pipeline can emit two rows for one player when the
 * populate scripts key them differently (e.g. "Luther Burden III" with the real
 * pricing/ADP, and a ghost "Luther Burden" that only carries a projection). Left
 * split, the auction sim can draft BOTH onto one roster and screens list the same
 * player twice.
 *
 * The merge is conservative and deterministic - it only collapses rows that share
 * a canonical name AND position AND a compatible team (equal, or one side blank),
 * so two genuinely different players who happen to share a name on different teams
 * are never merged. The best-ranked row (lowest ADP) is kept as the identity, and
 * only MISSING scoring fields (projected points / VORP and friends) are filled in
 * from the row that carries them. No number on the surviving row is overwritten,
 * and nothing is invented. Pure and $0.
 */

import type { Player } from './types'

/**
 * Canonical identity key for one player: lowercased, punctuation-stripped, with a
 * trailing generational suffix (Jr/Sr/II..V) removed, whitespace collapsed. Mirrors
 * the research normalizeName so "Luther Burden III" and "Luther Burden" collide.
 */
export function canonicalPlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'`,]/g, '')
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Teams are compatible for a merge when equal (case-insensitive) or one is blank. */
function teamsCompatible(a: string | undefined, b: string | undefined): boolean {
  const ta = (a ?? '').trim().toUpperCase()
  const tb = (b ?? '').trim().toUpperCase()
  if (ta === '' || tb === '') return true
  return ta === tb
}

/** A real, positive number (the value is worth adopting when the base lacks one). */
function isRealNumber(v: number | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

/**
 * Fill scoring fields on `base` from `extra` ONLY where base is missing them.
 * Never overwrites an existing base value; only adopts a real positive number the
 * base does not already have. Mutates and returns `base`.
 */
function adoptMissingScoring(base: Player, extra: Player): Player {
  if (!isRealNumber(base.projectedPoints) && isRealNumber(extra.projectedPoints)) {
    base.projectedPoints = extra.projectedPoints
  }
  if (!isRealNumber(base.vorp) && isRealNumber(extra.vorp)) {
    base.vorp = extra.vorp
  }
  if (!isRealNumber(base.positionRankByPoints) && isRealNumber(extra.positionRankByPoints)) {
    base.positionRankByPoints = extra.positionRankByPoints
  }
  if (!isRealNumber(base.replacementPoints) && isRealNumber(extra.replacementPoints)) {
    base.replacementPoints = extra.replacementPoints
  }
  if (!isRealNumber(base.marketAuctionValue) && isRealNumber(extra.marketAuctionValue)) {
    base.marketAuctionValue = extra.marketAuctionValue
  }
  if (base.valueRange === undefined && extra.valueRange !== undefined) {
    base.valueRange = extra.valueRange
  }
  if (
    (base.projections?.points ?? 0) <= 0 &&
    isRealNumber(extra.projections?.points)
  ) {
    base.projections = { ...base.projections, points: extra.projections.points }
  }
  return base
}

/**
 * Merge duplicate identities in a Player list. The FIRST occurrence of a canonical
 * key (name + position, team-compatible) is the surviving identity, so callers that
 * pass a list sorted best-first (lowest ADP / consensusRank) keep the real pricing
 * row and drop the ghost. Order is otherwise preserved. Returns a new array; the
 * surviving Player objects are shallow-copied before any scoring fill so the input
 * is not mutated.
 */
export function dedupePlayerIdentities(players: Player[]): Player[] {
  const result: Player[] = []
  // canonical name+position -> list of result indices already kept for it (usually
  // one; more than one only when a same-name row had an incompatible team).
  const seen = new Map<string, number[]>()

  for (const player of players) {
    const key = `${canonicalPlayerName(player.name)}|${player.position}`
    const priorIdxs = seen.get(key)
    let mergedInto = -1
    if (priorIdxs) {
      for (const idx of priorIdxs) {
        if (teamsCompatible(result[idx].team, player.team)) {
          mergedInto = idx
          break
        }
      }
    }

    if (mergedInto >= 0) {
      adoptMissingScoring(result[mergedInto], player)
      continue
    }

    const copy: Player = { ...player }
    const newIdx = result.push(copy) - 1
    if (priorIdxs) priorIdxs.push(newIdx)
    else seen.set(key, [newIdx])
  }

  return result
}
