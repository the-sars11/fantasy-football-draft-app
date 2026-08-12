/**
 * tags.ts - FB-9. Real, data-driven auction tags for Joe's Nasties draft.
 *
 * Every tag fires off a signal that (a) actually exists on the Player and
 * (b) differs player-to-player, and every tag carries a `source` string naming
 * the real data it traces to. Nothing is fabricated; nothing is decorative.
 *
 * The taxonomy is league-DOLLAR first, because at an auction the actionable
 * question is "is he cheap or dear in THIS room," not "do experts rank him":
 *
 *   ELITE   - real FantasyPros tier 1. Anchor targets.            [FP tier]
 *   POCKET  - his Nasties worth (VORP $) beats what the room       [VORP ceiling
 *             historically pays for his rank by >= $4. Win him      vs ledger room]
 *             below value.
 *   TAX     - the room historically pays >= $4 OVER his worth.     [same as POCKET]
 *             Reputation premium; let someone else have him.
 *   VOLATILE- experts wildly disagree (ECR rank std >= 20) and     [FP rank std]
 *             he's in the bidding pool. Boom/bust.
 *   INJURY  - a real, non-healthy injury designation. Dents his    [injury_status]
 *             floor; discount the bid.
 *   SLEEPER - skill player who goes late (outside ~top 84) but     [VORP]
 *             still clears replacement level. Bench value most miss.
 *
 * POCKET/TAX use the SAME $4 gap threshold the Cheat Sheet board renders its
 * gap-chip on (draft-board-table.tsx), so the card tag and the board chip can
 * never disagree.
 *
 * Pure + deterministic → unit-tested in tags.test.ts.
 */

import type { Player } from './types'

export type PlayerTagTone = 'elite' | 'good' | 'bad' | 'warn'

export type PlayerTagId =
  | 'elite'
  | 'pocket'
  | 'tax'
  | 'volatile'
  | 'injury'
  | 'sleeper'

export interface PlayerTag {
  id: PlayerTagId
  label: string
  tone: PlayerTagTone
  /** Human hint shown on the card. */
  hint: string
  /** The real data field this tag traces to (FB-9 transparency). */
  source: string
}

// A meaningful league-dollar gap between worth and room price. Matches the
// Cheat Sheet board's gap-chip threshold so the two views stay consistent.
const DOLLAR_GAP = 4
// Experts "wildly disagree" threshold on ECR standard deviation.
const VOLATILE_STD = 20
// VOLATILE only matters for players actually in the bidding pool.
const VOLATILE_MAX_RANK = 120
// Sleeper window: past ~7 rounds but a skill player who still clears replacement.
const SLEEPER_RANK = 84
const SKILL_POS = new Set(['RB', 'WR', 'TE'])

// Injury designations that are NOT a healthy/active player. The DB stores a raw
// string; anything outside this healthy set that is non-empty flags the tag.
const HEALTHY_INJURY = new Set(['', 'healthy', 'active', 'none', 'probable'])

export function computePlayerTags(p: Player): PlayerTag[] {
  const tags: PlayerTag[] = []

  // ELITE - real FantasyPros tier 1.
  if (p.expertTier === 1) {
    tags.push({
      id: 'elite',
      label: 'ELITE',
      tone: 'elite',
      hint: 'FantasyPros Tier 1 - an anchor player',
      source: 'FantasyPros expert-consensus tier',
    })
  }

  // POCKET / TAX - league-calibrated dollar gap (ceiling worth vs room price).
  const gap = p.valueGap
  if (typeof gap === 'number') {
    if (gap >= DOLLAR_GAP) {
      tags.push({
        id: 'pocket',
        label: `+$${gap} POCKET`,
        tone: 'good',
        hint: `Worth ~$${p.ceilingValue} in your league but the room pays ~$${p.expectedRoomPrice} for his rank - win him below value`,
        source: 'VORP ceiling vs 16-yr Nasties room price',
      })
    } else if (gap <= -DOLLAR_GAP) {
      tags.push({
        id: 'tax',
        label: `$${gap} TAX`,
        tone: 'bad',
        hint: `Room historically pays ~$${p.expectedRoomPrice} but he's only worth ~$${p.ceilingValue} here - reputation premium, let him go`,
        source: 'VORP ceiling vs 16-yr Nasties room price',
      })
    }
  }

  // VOLATILE - expert disagreement, but only for players in the bidding pool.
  const std = p.rankSpread?.std
  if (std !== undefined && std >= VOLATILE_STD && p.consensusRank <= VOLATILE_MAX_RANK) {
    tags.push({
      id: 'volatile',
      label: 'VOLATILE',
      tone: 'warn',
      hint: `Experts split hard (rank spread ${p.rankSpread?.min}-${p.rankSpread?.max}) - boom or bust`,
      source: 'FantasyPros expert-rank standard deviation',
    })
  }

  // INJURY - real, non-healthy designation.
  const injury = (p.injuryStatus ?? '').trim()
  if (injury && !HEALTHY_INJURY.has(injury.toLowerCase())) {
    tags.push({
      id: 'injury',
      label: `INJ ${injury.toUpperCase()}`,
      tone: 'warn',
      hint: `Carrying an injury designation (${injury}) - dents his floor, discount the bid`,
      source: 'FantasyPros injury status',
    })
  }

  // SLEEPER - skill player who goes late but still clears replacement.
  if (
    SKILL_POS.has(p.position) &&
    p.consensusRank > SLEEPER_RANK &&
    (p.vorp ?? 0) > 0
  ) {
    tags.push({
      id: 'sleeper',
      label: 'SLEEPER',
      tone: 'good',
      hint: `Goes late (overall #${p.consensusRank}) but still projects above replacement - real bench value`,
      source: 'VORP (points above replacement)',
    })
  }

  return tags
}
