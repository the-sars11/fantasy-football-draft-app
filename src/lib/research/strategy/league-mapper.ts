/**
 * league-mapper.ts - Pure DB-to-app league row mapper.
 *
 * Extracted from api/strategies/propose/route.ts so it can be unit-tested
 * without mocking the Supabase server client. The function is a pure
 * transformation: same row in, same League object out, every time.
 *
 * Key mappings worth knowing:
 *   team_count   -> size          (field rename)
 *   roster_slots.dst -> rosterSlots.def  (DST vs DEF naming convention)
 *   half_ppr     -> half-ppr      (DB underscore vs app hyphen)
 *   budget: null -> undefined     (DB nullable vs app optional)
 *   superflex    hardcoded 0      (Nasties has no superflex; not in DB schema)
 */

import type { League as DbLeague } from '@/lib/supabase/database.types'
import type { League } from '@/lib/players/types'

/** Map a DB league row to the app-level League type. Pure - no I/O, no cost. */
export function dbLeagueToAppLeague(row: DbLeague): League {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    platform: row.platform as League['platform'],
    format: row.format,
    size: row.team_count,
    budget: row.budget ?? undefined,
    scoringFormat: row.scoring_format === 'half_ppr' ? 'half-ppr' : row.scoring_format as League['scoringFormat'],
    rosterSlots: {
      qb: row.roster_slots.qb,
      rb: row.roster_slots.rb,
      wr: row.roster_slots.wr,
      te: row.roster_slots.te,
      flex: row.roster_slots.flex,
      superflex: 0,
      k: row.roster_slots.k,
      def: row.roster_slots.dst,
      bench: row.roster_slots.bench,
    },
    keeperSettings: row.keeper_enabled && row.keeper_settings
      ? {
          enabled: true,
          maxKeepers: row.keeper_settings.max_keepers,
          keeperCostType: row.keeper_settings.cost_type === 'auction_price' ? 'auction-price' : 'round',
        }
      : undefined,
  }
}
