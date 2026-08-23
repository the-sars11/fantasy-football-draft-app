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
 *   POCKET  - injury-risk-adjusted, expert-anchored worth (VAL-2.2/  [blend worth
 *             2.3 blend) beats what the room pays for his EXPERT       vs ledger room,
 *             rank by >= $4, AND the experts aren't wildly split       expert-gated,
 *             (rank std < 20). Model + room agree he's underpriced.    injury-adj]
 *             The worth is haircut for injury first (injury-risk.ts)
 *             so a hurt player no longer lights a false star. When
 *             the gap is there but experts ARE split, VOLATILE fires
 *             instead (boom/bust) and the upsideValue lane carries
 *             the dollar upside -- it is NOT a corroborated pocket.
 *   TAX     - the room historically pays >= $4 OVER his worth.     [same as POCKET]
 *             Reputation premium; let someone else have him.
 *   VOLATILE- experts wildly disagree (ECR rank std >= 20) and     [FP rank std]
 *             he's in the bidding pool. Boom/bust.
 *   FRAGILE - injury RISK: healthy NOW but the measured durability  [durability
 *             model breaks him down more than his position baseline.   factor]
 *             A standing worth dent, already priced into the range.
 *   OUT     - injured NOW: a real current absence (Doubtful / Out / [injury_status]
 *             PUP / IR / Suspended). He is not on the field.
 *             "Questionable" is NOT flagged - it is ESPN's broad camp
 *             catch-all and its tiny haircut is already in the range.
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
import { classifyInjury } from './injury-flags'

export type PlayerTagTone = 'elite' | 'good' | 'bad' | 'warn'

export type PlayerTagId =
  | 'elite'
  | 'pocket'
  | 'tax'
  | 'volatile'
  | 'fragile'
  | 'out'
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

  // POCKET / TAX - league-calibrated dollar gap (VAL-2.2 expert-anchored worth
  // vs room price). POCKET is expert-CORROBORATED: it fires only when the experts
  // aren't wildly split. When the gap is there but experts disagree hard
  // (std >= VOLATILE_STD), we do NOT call it a pocket -- VOLATILE fires below and
  // the separate upsideValue lane carries the dollar upside (a dart, not a bargain).
  const gap = p.valueGap
  const expertsSplit = (p.rankSpread?.std ?? 0) >= VOLATILE_STD
  if (typeof gap === 'number') {
    if (gap >= DOLLAR_GAP && !expertsSplit) {
      tags.push({
        id: 'pocket',
        label: `+$${gap} POCKET`,
        tone: 'good',
        hint: `Model + experts both beat your room's price here (~$${p.expertAdjustedValue} injury-adjusted worth vs ~$${p.expectedRoomPrice} paid) - a corroborated value`,
        source: 'VAL-2.3 injury-risk-adjusted worth vs Nasties room price',
      })
    } else if (gap <= -DOLLAR_GAP) {
      tags.push({
        id: 'tax',
        label: `-$${Math.abs(gap)} TAX`,
        tone: 'bad',
        hint: `Room historically pays ~$${p.expectedRoomPrice} but he's only worth ~$${p.expertAdjustedValue} here - reputation premium, let him go`,
        source: 'VAL-2.3 injury-risk-adjusted worth vs Nasties room price',
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

  // FRAGILE / OUT - the two split injury signals (injury-flags.ts). FRAGILE is a
  // chronic durability dent on a player who is healthy NOW; OUT is a real current
  // absence. "Questionable" fires neither - already priced into the range.
  const injuryFlags = classifyInjury(p.sleeperId, p.position, p.injuryStatus)
  if (injuryFlags.fragile) {
    tags.push({
      id: 'fragile',
      label: 'FRAGILE',
      tone: 'warn',
      hint: `Injury RISK - healthy now, but the durability model breaks him down more than his position (durability ${injuryFlags.fragileFactor.toFixed(2)}). Already priced into the range; don't pay the ceiling`,
      source: 'measured 15-season durability factor',
    })
  }
  if (injuryFlags.out) {
    tags.push({
      id: 'out',
      label: `OUT ${injuryFlags.outStatus.toUpperCase()}`,
      tone: 'bad',
      hint: `Injured NOW - carries a ${injuryFlags.outStatus} designation, not on the field. Draft only as a stash`,
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
