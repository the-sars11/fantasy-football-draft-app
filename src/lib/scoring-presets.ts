import type { ScoringSettings } from '@/lib/supabase/database.types'

/** Standard (non-PPR) scoring defaults */
export const STANDARD_SCORING: ScoringSettings = {
  // Passing
  pass_yds: 0.04,     // 1 pt per 25 yds
  pass_td: 4,
  pass_int: -2,
  pass_2pt: 2,
  pass_td_40: 0,
  pass_td_50: 0,
  pass_300: 0,
  pass_400: 0,
  // Rushing
  rush_yds: 0.1,
  rush_td: 6,
  rush_2pt: 2,
  rush_td_40: 0,
  rush_td_50: 0,
  rush_100: 0,
  rush_200: 0,
  // Receiving
  rec_yds: 0.1,
  rec: 0,             // no PPR
  rec_td: 6,
  rec_2pt: 2,
  rec_td_40: 0,
  rec_td_50: 0,
  rec_100: 0,
  rec_200: 0,
  // D/ST
  dst_sack: 1,
  dst_int: 2,
  dst_fr: 2,
  dst_td: 6,
  dst_safety: 2,
  dst_block: 2,
  // Misc
  fumble_lost: -2,
}

/** Half PPR scoring */
export const HALF_PPR_SCORING: ScoringSettings = {
  ...STANDARD_SCORING,
  rec: 0.5,
}

/** Full PPR scoring */
export const PPR_SCORING: ScoringSettings = {
  ...STANDARD_SCORING,
  rec: 1,
}

/** Joe's ESPN Nasties league — Full PPR with bonuses */
export const JOES_ESPN_SCORING: ScoringSettings = {
  // Passing — 0.2 per 5 yds = 0.04 per yd
  pass_yds: 0.04,
  pass_td: 4,
  pass_int: -2,
  pass_2pt: 2,
  pass_td_40: 1,
  pass_td_50: 2,
  pass_300: 2,
  pass_400: 4,
  // Rushing
  rush_yds: 0.1,
  rush_td: 6,
  rush_2pt: 2,
  rush_td_40: 1,
  rush_td_50: 2,
  rush_100: 2,
  rush_200: 4,
  // Receiving — Full PPR (1pt/rec)
  rec_yds: 0.1,
  rec: 1,
  rec_td: 6,
  rec_2pt: 2,
  rec_td_40: 1,
  rec_td_50: 2,
  rec_100: 2,
  rec_200: 4,
  // D/ST
  dst_sack: 1,
  dst_int: 3,
  dst_fr: 3,
  dst_td: 6,
  dst_safety: 2,
  dst_block: 2,
  // Misc
  fumble_lost: -2,
}

export function getScoringPreset(format: string): ScoringSettings {
  switch (format) {
    case 'standard': return { ...STANDARD_SCORING }
    case 'half_ppr': return { ...HALF_PPR_SCORING }
    case 'ppr': return { ...PPR_SCORING }
    default: return { ...PPR_SCORING }
  }
}

/** Scoring field definitions for the UI editor */
export const SCORING_FIELDS = {
  passing: [
    { key: 'pass_yds', label: 'Passing Yards', unit: 'pts/yd', step: 0.01, hint: '0.04 = 1pt per 25yds' },
    { key: 'pass_td', label: 'Passing TD', unit: 'pts' },
    { key: 'pass_int', label: 'Interception Thrown', unit: 'pts' },
    { key: 'pass_2pt', label: '2pt Pass Conversion', unit: 'pts' },
    { key: 'pass_td_40', label: '40+ Yd TD Pass Bonus', unit: 'pts' },
    { key: 'pass_td_50', label: '50+ Yd TD Pass Bonus', unit: 'pts' },
    { key: 'pass_300', label: '300-399 Yd Game Bonus', unit: 'pts' },
    { key: 'pass_400', label: '400+ Yd Game Bonus', unit: 'pts' },
  ],
  rushing: [
    { key: 'rush_yds', label: 'Rushing Yards', unit: 'pts/yd', step: 0.01 },
    { key: 'rush_td', label: 'Rushing TD', unit: 'pts' },
    { key: 'rush_2pt', label: '2pt Rush Conversion', unit: 'pts' },
    { key: 'rush_td_40', label: '40+ Yd TD Rush Bonus', unit: 'pts' },
    { key: 'rush_td_50', label: '50+ Yd TD Rush Bonus', unit: 'pts' },
    { key: 'rush_100', label: '100-199 Yd Game Bonus', unit: 'pts' },
    { key: 'rush_200', label: '200+ Yd Game Bonus', unit: 'pts' },
  ],
  receiving: [
    { key: 'rec_yds', label: 'Receiving Yards', unit: 'pts/yd', step: 0.01 },
    { key: 'rec', label: 'Reception (PPR)', unit: 'pts', step: 0.5 },
    { key: 'rec_td', label: 'Receiving TD', unit: 'pts' },
    { key: 'rec_2pt', label: '2pt Rec Conversion', unit: 'pts' },
    { key: 'rec_td_40', label: '40+ Yd TD Rec Bonus', unit: 'pts' },
    { key: 'rec_td_50', label: '50+ Yd TD Rec Bonus', unit: 'pts' },
    { key: 'rec_100', label: '100-199 Yd Game Bonus', unit: 'pts' },
    { key: 'rec_200', label: '200+ Yd Game Bonus', unit: 'pts' },
  ],
  dst: [
    { key: 'dst_sack', label: 'Sack', unit: 'pts' },
    { key: 'dst_int', label: 'Interception', unit: 'pts' },
    { key: 'dst_fr', label: 'Fumble Recovery', unit: 'pts' },
    { key: 'dst_td', label: 'Return TD', unit: 'pts' },
    { key: 'dst_safety', label: 'Safety', unit: 'pts' },
    { key: 'dst_block', label: 'Blocked Kick', unit: 'pts' },
  ],
  misc: [
    { key: 'fumble_lost', label: 'Fumble Lost', unit: 'pts' },
  ],
} as const
