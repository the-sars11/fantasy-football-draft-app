/**
 * Live-room palette (UXV2-6, recolored D6) -- the approved v4 decision-first
 * draft room, restyled to the SHIELD color language Joe approved 2026-08-18.
 *
 * COLOR LANGUAGE: steel-blue is the PRIMARY/structural color -- budget
 * remaining, open-slot outlines, target-at-price, tier context, HOLD verdicts,
 * everything informational. Brick-red (`action`) is reserved ONLY for the true
 * action moment -- the BID verdict and the max-bid number -- used sparingly.
 * Muted/neutral covers spent budget, inactive states and PASS (zero red).
 * Amber covers PUSH (a caution, not the reserved action color). A separate
 * danger pink covers the persistent AVOID flag so it never competes with the
 * one true red. These are scoped to the live room only; the rest of the app
 * keeps its own FFI tokens.
 */

import type { Position } from '@/lib/players/types'
import type { WhatToDoColor } from '@/lib/draft/what-to-do'

export const ROOM = {
  bg: '#060c14',
  surface: '#09121d',
  card: '#0d1a27',
  cardEl: '#132234',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.04)',
  t1: '#edf4fb',
  t2: '#7a98b4',
  t3: '#3d5a73',

  // Structural/primary -- budget remaining, target-at-price, tier context,
  // HOLD verdicts, the strategy strip, the LIVE pill. The room's main voice.
  blue: '#5FA8E0',
  blue10: 'rgba(95,168,224,0.10)',
  blue20: 'rgba(95,168,224,0.20)',
  blue45: 'rgba(95,168,224,0.45)',

  // The one true action color -- the BID verdict and the max-bid number only.
  action: '#A63C41',
  action10: 'rgba(166,60,65,0.10)',
  action20: 'rgba(166,60,65,0.20)',
  action45: 'rgba(166,60,65,0.45)',

  // PUSH (stretch past range) -- a caution, distinct from the reserved
  // action-red and the structural steel-blue.
  amber: '#FFB05C',
  amber10: 'rgba(255,176,92,0.10)',
  amber25: 'rgba(255,176,92,0.25)',

  // PASS, spent budget, inactive/disabled states -- zero red.
  muted: '#5E708A',
  muted10: 'rgba(94,112,138,0.10)',
  muted25: 'rgba(94,112,138,0.25)',

  // Persistent AVOID flag -- a distinct hue so it never reads as the BID
  // action moment, while staying visually salient.
  danger: '#FF6E8A',
  danger10: 'rgba(255,110,138,0.10)',
  danger25: 'rgba(255,110,138,0.25)',

  // D6 (Joe-approved 2026-08-18): LIVE reads steel-blue, not green.
  live: '#5FA8E0',
  offline: '#f97316',
} as const

/** Per-position badge fill + text color (matches the app-wide position colors). Unchanged by D6. */
export function posColors(pos: Position | string): { bg: string; color: string } {
  switch (pos.toUpperCase()) {
    case 'QB':
      return { bg: 'rgba(22,163,74,0.15)', color: '#16a34a' }
    case 'RB':
      return { bg: 'rgba(220,38,38,0.15)', color: '#dc2626' }
    case 'WR':
      return { bg: 'rgba(37,99,235,0.15)', color: '#2563eb' }
    case 'TE':
      return { bg: 'rgba(147,51,234,0.15)', color: '#9333ea' }
    case 'DEF':
    case 'DST':
      return { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' }
    default: // K and anything else
      return { bg: 'rgba(107,114,128,0.15)', color: '#9aa7bd' }
  }
}

/**
 * Move color name -> concrete color/background/border for the What To Do
 * block. The `WhatToDoColor` union (from what-to-do.ts) is untouched by D6 --
 * only the concrete values each name maps to changed, per the approved
 * color language: BID is the one red, HOLD is structural blue, PUSH is
 * amber caution, PASS is muted with zero red.
 */
export function moveTheme(color: WhatToDoColor): {
  color: string
  bg: string
  border: string
} {
  switch (color) {
    case 'volt': // BID -- the one true action moment
      return { color: ROOM.action, bg: ROOM.action10, border: ROOM.action20 }
    case 'orange': // PUSH -- stretch, a caution
      return { color: ROOM.amber, bg: ROOM.amber10, border: ROOM.amber25 }
    case 'red': // PASS -- zero red, muted/neutral
      return { color: ROOM.muted, bg: ROOM.muted10, border: ROOM.muted25 }
    case 'gold': // HOLD -- structural/informational
    default:
      return { color: ROOM.blue, bg: ROOM.blue10, border: ROOM.blue20 }
  }
}
