/**
 * Real, data-driven player tags for Joe's Nasties auction.
 *
 * The old tag logic was dead: it compared `adp` to `consensusRank`, but both
 * were derived from the same ECR rank, so they were always equal and no tag
 * ever fired. These tags are computed from signals that actually exist and
 * differ per player:
 *
 *   ELITE     - real FantasyPros tier 1. Anchor targets.
 *   VALUE     - the 2026 projection ranks him well ABOVE where the experts
 *               (ECR) rank him. The room drafts off ECR/name, so you can win
 *               him below his real worth.
 *   FADE      - experts rank him well ABOVE the projection. The room will
 *               overpay on reputation; let someone else have him.
 *   VOLATILE  - experts wildly disagree (rank std >= 20). Boom/bust.
 *   SLEEPER   - late overall (outside ~top 96) but still clears replacement
 *               level (VORP > 0). Real bench value most people miss.
 *
 * Every input traces to real data on the Player (ESPN projections + VORP,
 * FantasyPros ECR tier/rank/std). Nothing fabricated.
 */

import type { Player } from './types'

export type PlayerTagTone = 'elite' | 'good' | 'bad' | 'warn'

export interface PlayerTag {
  id: 'elite' | 'value' | 'fade' | 'volatile' | 'sleeper'
  label: string
  tone: PlayerTagTone
  hint: string
}

// A meaningful positional-rank gap between projection and expert consensus.
const RANK_GAP = 10
// Experts "wildly disagree" threshold on ECR standard deviation.
const VOLATILE_STD = 20
// VOLATILE only matters for players actually in the bidding pool.
const VOLATILE_MAX_RANK = 120
// Sleeper window: past ~7 rounds but a skill player who still clears replacement.
const SLEEPER_RANK = 84
const SKILL_POS = new Set(['RB', 'WR', 'TE'])

export function computePlayerTags(p: Player): PlayerTag[] {
  const tags: PlayerTag[] = []

  // ELITE — real tier 1.
  if (p.expertTier === 1) {
    tags.push({ id: 'elite', label: 'ELITE', tone: 'elite', hint: 'FantasyPros Tier 1 - an anchor player' })
  }

  // VALUE / FADE — projection vs expert positional rank.
  const projRank = p.positionRankByPoints
  const ecrRank = p.ecrPositionRank
  if (projRank !== undefined && ecrRank !== undefined) {
    const gap = ecrRank - projRank // >0: projection likes him MORE than experts
    if (gap >= RANK_GAP) {
      tags.push({
        id: 'value',
        label: 'VALUE',
        tone: 'good',
        hint: `Projects ${p.position}${projRank} but experts rank him ${p.position}${ecrRank} - room drafts off the lower rank`,
      })
    } else if (-gap >= RANK_GAP) {
      tags.push({
        id: 'fade',
        label: 'FADE',
        tone: 'bad',
        hint: `Experts rank ${p.position}${ecrRank} but he only projects ${p.position}${projRank} - room will overpay`,
      })
    }
  }

  // VOLATILE — expert disagreement, but only for players in the bidding pool.
  const std = p.rankSpread?.std
  if (std !== undefined && std >= VOLATILE_STD && p.consensusRank <= VOLATILE_MAX_RANK) {
    tags.push({
      id: 'volatile',
      label: 'VOLATILE',
      tone: 'warn',
      hint: `Experts split hard (rank spread ${p.rankSpread?.min}-${p.rankSpread?.max}) - boom or bust`,
    })
  }

  // SLEEPER — skill player who goes late but still clears replacement.
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
    })
  }

  return tags
}
