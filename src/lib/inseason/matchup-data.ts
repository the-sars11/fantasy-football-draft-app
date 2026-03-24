/**
 * Matchup Data Service
 *
 * Provides defensive rankings vs position, Vegas lines, and weather data
 * for game script predictions and Start/Sit recommendations.
 */

import { createClient } from '@supabase/supabase-js'
import type { MatchupData, Position } from '@/lib/players/types'

// Supabase client with service role for writes
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials for service role')
  }
  return createClient(url, serviceKey)
}

// NFL team abbreviations
const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
] as const

type NFLTeam = typeof NFL_TEAMS[number]

interface MatchupDataRow {
  id: string
  season: number
  week: number
  team: string
  opponent: string
  is_home: boolean
  game_time: string | null
  def_rank_vs_qb: number | null
  def_rank_vs_rb: number | null
  def_rank_vs_wr: number | null
  def_rank_vs_te: number | null
  def_fpts_allowed_qb: number | null
  def_fpts_allowed_rb: number | null
  def_fpts_allowed_wr: number | null
  def_fpts_allowed_te: number | null
  spread: number | null
  over_under: number | null
  implied_team_total: number | null
  weather_temp: number | null
  weather_wind: number | null
  weather_precip_chance: number | null
  dome: boolean
  fetched_at: string
}

/**
 * Get matchup data for a specific team and week.
 */
export async function getTeamMatchup(
  team: string,
  week: number,
  season: number
): Promise<MatchupData | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('matchup_data')
    .select('*')
    .eq('team', team.toUpperCase())
    .eq('week', week)
    .eq('season', season)
    .single()

  if (error || !data) return null

  return transformMatchupRow(data as MatchupDataRow)
}

/**
 * Get all matchups for a specific week.
 */
export async function getWeekMatchups(
  week: number,
  season: number
): Promise<MatchupData[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('matchup_data')
    .select('*')
    .eq('week', week)
    .eq('season', season)
    .order('game_time', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch week matchups: ${error.message}`)
  }

  return (data || []).map((row: MatchupDataRow) => transformMatchupRow(row))
}

/**
 * Get defensive ranking for a position matchup.
 * Returns rank 1-32 where 1 = toughest matchup (allows fewest points).
 */
export async function getDefensiveRank(
  opposingTeam: string,
  position: Position,
  week: number,
  season: number
): Promise<number | null> {
  const matchup = await getTeamMatchup(opposingTeam, week, season)
  if (!matchup) return null

  switch (position) {
    case 'QB':
      return matchup.defRankVsQB ?? null
    case 'RB':
      return matchup.defRankVsRB ?? null
    case 'WR':
      return matchup.defRankVsWR ?? null
    case 'TE':
      return matchup.defRankVsTE ?? null
    default:
      return null
  }
}

/**
 * Rate a matchup as favorable, neutral, or unfavorable based on defensive rank.
 */
export function rateMatchup(defRank: number | null): 'favorable' | 'neutral' | 'unfavorable' {
  if (defRank === null) return 'neutral'
  if (defRank >= 25) return 'favorable' // Bottom 8 defenses
  if (defRank <= 8) return 'unfavorable' // Top 8 defenses
  return 'neutral'
}

/**
 * Calculate implied team score from Vegas lines.
 * Formula: (over_under / 2) + (spread / 2) for the favored team
 */
export function calculateImpliedScore(
  overUnder: number,
  spread: number,
  isHome: boolean
): number {
  // Spread is typically from home team perspective
  // Negative spread = home team favored
  const homeAdjustment = spread / 2
  const baseScore = overUnder / 2

  if (isHome) {
    return baseScore - homeAdjustment
  } else {
    return baseScore + homeAdjustment
  }
}

/**
 * Store matchup data for a week.
 * Typically called after scraping/fetching schedule + defensive data.
 */
export async function upsertMatchupData(
  matchups: MatchupData[]
): Promise<{ upserted: number; errors: string[] }> {
  const supabase = getServiceClient()
  const errors: string[] = []
  let upserted = 0

  const rows = matchups.map((m) => ({
    season: m.season,
    week: m.week,
    team: m.team.toUpperCase(),
    opponent: m.opponent.toUpperCase(),
    is_home: m.isHome,
    game_time: m.gameTime || null,
    def_rank_vs_qb: m.defRankVsQB ?? null,
    def_rank_vs_rb: m.defRankVsRB ?? null,
    def_rank_vs_wr: m.defRankVsWR ?? null,
    def_rank_vs_te: m.defRankVsTE ?? null,
    def_fpts_allowed_qb: m.defFptsAllowedQB ?? null,
    def_fpts_allowed_rb: m.defFptsAllowedRB ?? null,
    def_fpts_allowed_wr: m.defFptsAllowedWR ?? null,
    def_fpts_allowed_te: m.defFptsAllowedTE ?? null,
    spread: m.spread ?? null,
    over_under: m.overUnder ?? null,
    implied_team_total: m.impliedTeamTotal ?? null,
    weather_temp: m.weatherTemp ?? null,
    weather_wind: m.weatherWind ?? null,
    weather_precip_chance: m.weatherPrecipChance ?? null,
    dome: m.isDome ?? false,
    fetched_at: new Date().toISOString(),
  }))

  // Batch upsert
  const BATCH_SIZE = 100
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('matchup_data')
      .upsert(batch, {
        onConflict: 'team,season,week',
      })

    if (error) {
      errors.push(`Batch ${i / BATCH_SIZE + 1} failed: ${error.message}`)
    } else {
      upserted += batch.length
    }
  }

  return { upserted, errors }
}

/**
 * Transform database row to MatchupData type.
 */
function transformMatchupRow(row: MatchupDataRow): MatchupData {
  return {
    season: row.season,
    week: row.week,
    team: row.team,
    opponent: row.opponent,
    isHome: row.is_home,
    gameTime: row.game_time || undefined,
    defRankVsQB: row.def_rank_vs_qb ?? undefined,
    defRankVsRB: row.def_rank_vs_rb ?? undefined,
    defRankVsWR: row.def_rank_vs_wr ?? undefined,
    defRankVsTE: row.def_rank_vs_te ?? undefined,
    defFptsAllowedQB: row.def_fpts_allowed_qb ?? undefined,
    defFptsAllowedRB: row.def_fpts_allowed_rb ?? undefined,
    defFptsAllowedWR: row.def_fpts_allowed_wr ?? undefined,
    defFptsAllowedTE: row.def_fpts_allowed_te ?? undefined,
    spread: row.spread ?? undefined,
    overUnder: row.over_under ?? undefined,
    impliedTeamTotal: row.implied_team_total ?? undefined,
    weatherTemp: row.weather_temp ?? undefined,
    weatherWind: row.weather_wind ?? undefined,
    weatherPrecipChance: row.weather_precip_chance ?? undefined,
    isDome: row.dome,
  }
}

/**
 * Get favorable matchups for a position this week.
 * Returns teams whose opponents are bottom-tier defenses vs that position.
 */
export async function getFavorableMatchups(
  position: Position,
  week: number,
  season: number,
  threshold: number = 25 // Rank 25-32 = favorable
): Promise<MatchupData[]> {
  const supabase = getServiceClient()

  const rankColumn = {
    QB: 'def_rank_vs_qb',
    RB: 'def_rank_vs_rb',
    WR: 'def_rank_vs_wr',
    TE: 'def_rank_vs_te',
    K: null,
    DEF: null,
  }[position]

  if (!rankColumn) return []

  const { data, error } = await supabase
    .from('matchup_data')
    .select('*')
    .eq('week', week)
    .eq('season', season)
    .gte(rankColumn, threshold)
    .order(rankColumn, { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch favorable matchups: ${error.message}`)
  }

  return (data || []).map((row: MatchupDataRow) => transformMatchupRow(row))
}

/**
 * Get tough matchups for a position this week.
 * Returns teams whose opponents are top-tier defenses vs that position.
 */
export async function getToughMatchups(
  position: Position,
  week: number,
  season: number,
  threshold: number = 8 // Rank 1-8 = tough
): Promise<MatchupData[]> {
  const supabase = getServiceClient()

  const rankColumn = {
    QB: 'def_rank_vs_qb',
    RB: 'def_rank_vs_rb',
    WR: 'def_rank_vs_wr',
    TE: 'def_rank_vs_te',
    K: null,
    DEF: null,
  }[position]

  if (!rankColumn) return []

  const { data, error } = await supabase
    .from('matchup_data')
    .select('*')
    .eq('week', week)
    .eq('season', season)
    .lte(rankColumn, threshold)
    .order(rankColumn, { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch tough matchups: ${error.message}`)
  }

  return (data || []).map((row: MatchupDataRow) => transformMatchupRow(row))
}
