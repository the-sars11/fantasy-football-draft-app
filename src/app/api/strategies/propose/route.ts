/**
 * POST /api/strategies/propose
 *
 * Uses Claude to analyze league settings + player data and propose 4-6 strategies.
 * Body: { leagueId: string }
 *
 * Reads league config from DB, fetches cached player data, then runs the
 * strategy research engine (FF-S03).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import { proposeStrategies } from '@/lib/research/strategy/research'
import type { League as DbLeague } from '@/lib/supabase/database.types'
import type { League, RosterSlots } from '@/lib/players/types'
import type { ConsensusPlayer } from '@/lib/research/normalize'
import type { Position } from '@/lib/players/types'

async function getClient() {
  if (DEV_MODE) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceKey) return createClient(url, serviceKey)
  }
  return createServerClient()
}

/** Map DB league row to app-level League type */
function dbLeagueToAppLeague(row: DbLeague): League {
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

/** Map players_cache rows to ConsensusPlayer format */
function cacheRowToConsensusPlayer(row: Record<string, unknown>): ConsensusPlayer {
  const adp = row.adp as Record<string, number> | null
  const auctionValues = row.auction_values as Record<string, number> | null
  const projections = row.projections as Record<string, number> | null
  const sourceData = row.source_data as Record<string, unknown> | null

  // Compute consensus rank from ADP average or fallback to 999
  const adpValues = adp ? Object.values(adp).filter((v) => v > 0) : []
  const avgAdp = adpValues.length > 0
    ? adpValues.reduce((s, v) => s + v, 0) / adpValues.length
    : null

  const auctionVals = auctionValues ? Object.values(auctionValues).filter((v) => v > 0) : []
  const avgAuctionValue = auctionVals.length > 0
    ? Math.round(auctionVals.reduce((s, v) => s + v, 0) / auctionVals.length)
    : null

  // Map DB position DST -> app position DEF for the type, but keep as-is for ConsensusPlayer
  const dbPosition = row.position as string
  const position = (dbPosition === 'DST' ? 'DST' : dbPosition) as Position

  return {
    name: row.name as string,
    team: row.team as string | null,
    position,
    byeWeek: row.bye_week as number | null,
    injuryStatus: row.injury_status as string | null,
    sleeperId: row.external_id as string | null,
    espnId: (sourceData?.espnId as number) ?? null,
    fpId: (sourceData?.fpId as string) ?? null,
    consensusRank: avgAdp ? Math.round(avgAdp) : 999,
    consensusAuctionValue: avgAuctionValue,
    consensusTier: 1, // simplified — tier analysis happens in FF-022
    adp: avgAdp ? Math.round(avgAdp * 10) / 10 : null,
    sourceRanks: {
      sleeper: adp?.sleeper ? Math.round(adp.sleeper) : undefined,
      espn: adp?.espn ? Math.round(adp.espn) : undefined,
    },
    sourceADP: {
      sleeper: adp?.sleeper ?? undefined,
      espn: adp?.espn ?? undefined,
    },
    sourceAuctionValues: {
      espn: auctionValues?.espn ?? undefined,
      fantasypros: auctionValues?.fantasypros ?? undefined,
    },
    projections: {
      points: (projections?.points as number) ?? 0,
      passingYards: (projections?.passingYards as number) ?? undefined,
      passingTDs: (projections?.passingTDs as number) ?? undefined,
      rushingYards: (projections?.rushingYards as number) ?? undefined,
      rushingTDs: (projections?.rushingTDs as number) ?? undefined,
      receivingYards: (projections?.receivingYards as number) ?? undefined,
      receivingTDs: (projections?.receivingTDs as number) ?? undefined,
      receptions: (projections?.receptions as number) ?? undefined,
    },
    ecrStdDev: (sourceData?.ecrStdDev as number) ?? null,
    percentOwned: (sourceData?.percentOwned as number) ?? null,
    age: (sourceData?.age as number) ?? null,
    yearsExp: (sourceData?.yearsExp as number) ?? null,
    sources: adp ? Object.keys(adp) : [],
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leagueId } = body as { leagueId?: string }

    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Fetch league
    const { data: leagueRow, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single()

    if (leagueError || !leagueRow) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const league = dbLeagueToAppLeague(leagueRow as DbLeague)

    // Fetch cached players (top 300 by most recently updated)
    const { data: playerRows, error: playerError } = await supabase
      .from('players_cache')
      .select('*')
      .order('last_updated_at', { ascending: false })
      .limit(300)

    if (playerError) {
      return NextResponse.json({ error: `Failed to fetch players: ${playerError.message}` }, { status: 500 })
    }

    if (!playerRows || playerRows.length === 0) {
      return NextResponse.json(
        { error: 'No player data cached. Run a data refresh first.' },
        { status: 400 }
      )
    }

    const players = (playerRows as Record<string, unknown>[]).map(cacheRowToConsensusPlayer)

    // Get keeper names if applicable
    const keeperNames: string[] = []
    if (league.keeperSettings?.enabled && (leagueRow as DbLeague).keeper_settings?.keepers) {
      for (const k of (leagueRow as DbLeague).keeper_settings!.keepers) {
        keeperNames.push(k.player_name)
      }
    }

    // Run strategy research engine
    const result = await proposeStrategies({ league, players, keeperNames })

    return NextResponse.json({
      proposals: result.proposals,
      inserts: result.inserts,
      meta: {
        leagueId: league.id,
        format: league.format,
        playerCount: players.length,
        proposalCount: result.proposals.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /strategies/propose]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
