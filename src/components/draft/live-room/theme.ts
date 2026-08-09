/**
 * Live-room palette (UXV2-6) — the approved v4 decision-first draft room.
 *
 * These are scoped to the live room only. They intentionally use the v4
 * mockup's distinct amber gold (HOLD / target / moment) and lime volt
 * (BID / action) so the four color-coded moves read apart at a glance.
 * The rest of the app keeps its own FFI tokens; nothing here is global.
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
  volt: '#d4ff00',
  volt10: 'rgba(212,255,0,0.10)',
  volt20: 'rgba(212,255,0,0.20)',
  volt45: 'rgba(212,255,0,0.45)',
  gold: '#f5a623',
  gold10: 'rgba(245,166,35,0.10)',
  gold25: 'rgba(245,166,35,0.25)',
  gold55: 'rgba(245,166,35,0.55)',
  orange: '#f97316',
  orange10: 'rgba(249,115,22,0.10)',
  orange28: 'rgba(249,115,22,0.28)',
  red: '#dc2626',
  red10: 'rgba(220,38,38,0.10)',
  red25: 'rgba(220,38,38,0.25)',
  live: '#22c55e',
  offline: '#f97316',
} as const

/** Per-position badge fill + text color (matches the app-wide position colors). */
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

/** Move color name -> concrete color/background/border for the What To Do block. */
export function moveTheme(color: WhatToDoColor): {
  color: string
  bg: string
  border: string
} {
  switch (color) {
    case 'volt':
      return { color: ROOM.volt, bg: ROOM.volt10, border: ROOM.volt20 }
    case 'orange':
      return { color: ROOM.orange, bg: ROOM.orange10, border: ROOM.orange28 }
    case 'red':
      return { color: ROOM.red, bg: ROOM.red10, border: ROOM.red25 }
    case 'gold':
    default:
      return { color: ROOM.gold, bg: ROOM.gold10, border: ROOM.gold25 }
  }
}
