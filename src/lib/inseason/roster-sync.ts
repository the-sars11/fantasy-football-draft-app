/**
 * Roster Sync Service (FF-114)
 *
 * Connects to user's ESPN/Yahoo/Sleeper leagues and pulls current roster.
 * Sleeper has a free, unauthenticated API. ESPN/Yahoo require OAuth.
 *
 * Sleeper API endpoints:
 * - GET /user/<username> — get user ID
 * - GET /user/<user_id>/leagues/nfl/<season> — get user's leagues
 * - GET /league/<league_id>/rosters — all rosters in league
 * - GET /league/<league_id>/users — all users in league
 */

import { createClient } from '@supabase/supabase-js'
import type { Position, Platform, ScoringFormat } from '@/lib/players/types'

const SLEEPER_BASE = 'https://api.sleeper.app'

// --- Types ---

export interface RosterPlayer {
  playerId: string
  playerName: string
  position: Position
  team: string
  slot: RosterSlot
  isStarter: boolean
  status?: 'active' | 'injured' | 'bye' | 'out'
  projectedPoints?: number
  actualPoints?: number
}

export type RosterSlot =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'FLEX'
  | 'SUPER_FLEX'
  | 'K'
  | 'DEF'
  | 'BN'
  | 'IR'

export interface UserRoster {
  platform: Platform
  leagueId: string
  leagueName: string
  teamId: string
  teamName: string
  season: number
  week: number
  scoringFormat: ScoringFormat
  players: RosterPlayer[]
  rosterSettings: RosterSettings
  faabBudget?: number
  faabRemaining?: number
  waiverPriority?: number
  record?: { wins: number; losses: number; ties: number }
}

export interface RosterSettings {
  qb: number
  rb: number
  wr: number
  te: number
  flex: number
  superflex: number
  k: number
  def: number
  bench: number
  ir: number
}

export interface LeagueInfo {
  platform: Platform
  leagueId: string
  leagueName: string
  season: number
  scoringFormat: ScoringFormat
  teamCount: number
  draftType: 'auction' | 'snake'
  userTeamId?: string
  userTeamName?: string
}

// --- Sleeper API Types ---

interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar: string | null
}

interface SleeperLeague {
  league_id: string
  name: string
  season: string
  season_type: string
  status: string
  sport: string
  total_rosters: number
  roster_positions: string[]
  scoring_settings: Record<string, number>
  settings: {
    waiver_budget?: number
    type?: number // 0 = redraft, 1 = keeper, 2 = dynasty
    draft_rounds?: number
    trade_deadline?: number
  }
}

interface SleeperRoster {
  roster_id: number
  owner_id: string
  league_id: string
  players: string[] | null
  starters: string[] | null
  reserve: string[] | null // IR
  taxi: string[] | null
  settings: {
    wins: number
    losses: number
    ties: number
    fpts: number
    waiver_budget_used?: number
    waiver_position?: number
  }
}

interface SleeperLeagueUser {
  user_id: string
  display_name: string
  avatar: string | null
  metadata?: {
    team_name?: string
  }
}

// --- Supabase Client ---

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials')
  }
  return createClient(url, serviceKey)
}

// --- Sleeper API Functions ---

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 }, // 5 min cache
  })
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get Sleeper user by username
 */
export async function getSleeperUser(username: string): Promise<SleeperUser | null> {
  try {
    return await fetchJSON<SleeperUser>(`${SLEEPER_BASE}/v1/user/${username}`)
  } catch {
    return null
  }
}

/**
 * Get all leagues for a Sleeper user in a given season
 */
export async function getSleeperLeagues(
  userId: string,
  season?: number
): Promise<LeagueInfo[]> {
  const currentSeason = season || new Date().getFullYear()
  const leagues = await fetchJSON<SleeperLeague[]>(
    `${SLEEPER_BASE}/v1/user/${userId}/leagues/nfl/${currentSeason}`
  )

  return leagues.map((league) => ({
    platform: 'sleeper' as Platform,
    leagueId: league.league_id,
    leagueName: league.name,
    season: parseInt(league.season),
    scoringFormat: detectScoringFormat(league.scoring_settings),
    teamCount: league.total_rosters,
    draftType: league.settings?.type === 0 ? 'snake' : 'auction',
  }))
}

/**
 * Detect scoring format from Sleeper scoring settings
 */
function detectScoringFormat(
  settings: Record<string, number>
): ScoringFormat {
  const recPts = settings.rec || 0
  if (recPts >= 1) return 'ppr'
  if (recPts >= 0.5) return 'half-ppr'
  return 'standard'
}

/**
 * Get roster for a user in a Sleeper league
 */
export async function getSleeperRoster(
  leagueId: string,
  userId: string,
  playerNameMap?: Map<string, { name: string; position: Position; team: string }>
): Promise<UserRoster | null> {
  // Fetch league, rosters, users, and player database in parallel
  const [league, rosters, users] = await Promise.all([
    fetchJSON<SleeperLeague>(`${SLEEPER_BASE}/v1/league/${leagueId}`),
    fetchJSON<SleeperRoster[]>(`${SLEEPER_BASE}/v1/league/${leagueId}/rosters`),
    fetchJSON<SleeperLeagueUser[]>(`${SLEEPER_BASE}/v1/league/${leagueId}/users`),
  ])

  // Find user's roster
  const roster = rosters.find((r) => r.owner_id === userId)
  if (!roster) return null

  // Find user info
  const user = users.find((u) => u.user_id === userId)
  const teamName = user?.metadata?.team_name || user?.display_name || 'My Team'

  // Get player name map if not provided
  const names = playerNameMap || (await buildPlayerNameMap())

  // Map players to roster slots
  const rosterPlayers: RosterPlayer[] = []
  const starters = new Set(roster.starters || [])
  const reserved = new Set(roster.reserve || [])

  for (const playerId of roster.players || []) {
    const playerInfo = names.get(playerId)
    if (!playerInfo) continue

    const isStarter = starters.has(playerId)
    const isIR = reserved.has(playerId)

    rosterPlayers.push({
      playerId,
      playerName: playerInfo.name,
      position: playerInfo.position,
      team: playerInfo.team,
      slot: isIR ? 'IR' : isStarter ? playerInfo.position : 'BN',
      isStarter,
    })
  }

  // Parse roster settings from positions array
  const rosterSettings = parseRosterSettings(league.roster_positions)

  // Calculate FAAB remaining
  const faabBudget = league.settings?.waiver_budget || 100
  const faabUsed = roster.settings?.waiver_budget_used || 0

  return {
    platform: 'sleeper',
    leagueId,
    leagueName: league.name,
    teamId: String(roster.roster_id),
    teamName,
    season: parseInt(league.season),
    week: 0, // Will be set by caller
    scoringFormat: detectScoringFormat(league.scoring_settings),
    players: rosterPlayers,
    rosterSettings,
    faabBudget,
    faabRemaining: faabBudget - faabUsed,
    waiverPriority: roster.settings?.waiver_position,
    record: {
      wins: roster.settings?.wins || 0,
      losses: roster.settings?.losses || 0,
      ties: roster.settings?.ties || 0,
    },
  }
}

/**
 * Build player name/position/team map from Sleeper player database
 */
async function buildPlayerNameMap(): Promise<
  Map<string, { name: string; position: Position; team: string }>
> {
  const response = await fetchJSON<
    Record<string, { full_name: string; position: string; team: string | null }>
  >(`${SLEEPER_BASE}/v1/players/nfl`)

  const map = new Map<string, { name: string; position: Position; team: string }>()

  for (const [id, player] of Object.entries(response)) {
    if (!player.full_name || !player.position) continue
    const position = mapPosition(player.position)
    if (!position) continue

    map.set(id, {
      name: player.full_name,
      position,
      team: player.team || 'FA',
    })
  }

  return map
}

function mapPosition(pos: string): Position | null {
  const upper = pos.toUpperCase()
  if (upper === 'DST' || upper === 'DEF') return 'DEF'
  if (['QB', 'RB', 'WR', 'TE', 'K'].includes(upper)) return upper as Position
  return null
}

function parseRosterSettings(positions: string[]): RosterSettings {
  const settings: RosterSettings = {
    qb: 0,
    rb: 0,
    wr: 0,
    te: 0,
    flex: 0,
    superflex: 0,
    k: 0,
    def: 0,
    bench: 0,
    ir: 0,
  }

  for (const pos of positions) {
    const upper = pos.toUpperCase()
    if (upper === 'QB') settings.qb++
    else if (upper === 'RB') settings.rb++
    else if (upper === 'WR') settings.wr++
    else if (upper === 'TE') settings.te++
    else if (upper === 'FLEX') settings.flex++
    else if (upper === 'SUPER_FLEX') settings.superflex++
    else if (upper === 'K') settings.k++
    else if (upper === 'DEF') settings.def++
    else if (upper === 'BN') settings.bench++
    else if (upper === 'IR') settings.ir++
  }

  return settings
}

// --- User Connections (Supabase) ---

interface UserConnection {
  id: string
  user_id: string
  platform: Platform
  platform_user_id: string
  platform_username: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  created_at: string
  updated_at: string
}

/**
 * Save a platform connection for a user
 */
export async function saveUserConnection(
  userId: string,
  platform: Platform,
  platformUserId: string,
  platformUsername: string,
  tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: string }
): Promise<void> {
  const supabase = getServiceClient()

  await supabase.from('user_connections').upsert(
    {
      user_id: userId,
      platform,
      platform_user_id: platformUserId,
      platform_username: platformUsername,
      access_token: tokens?.accessToken,
      refresh_token: tokens?.refreshToken,
      token_expires_at: tokens?.expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform' }
  )
}

/**
 * Get user's platform connections
 */
export async function getUserConnections(
  userId: string
): Promise<UserConnection[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('user_connections')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

/**
 * Get user's connection for a specific platform
 */
export async function getUserConnection(
  userId: string,
  platform: Platform
): Promise<UserConnection | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('user_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

// --- Unified Roster Sync ---

/**
 * Sync roster for a user from their connected platform
 */
export async function syncUserRoster(
  userId: string,
  leagueId: string,
  platform: Platform
): Promise<UserRoster | null> {
  const connection = await getUserConnection(userId, platform)
  if (!connection) {
    throw new Error(`No ${platform} connection found for user`)
  }

  switch (platform) {
    case 'sleeper':
      return getSleeperRoster(leagueId, connection.platform_user_id)

    case 'espn':
      // TODO: Implement ESPN OAuth roster sync
      throw new Error('ESPN roster sync not yet implemented')

    case 'yahoo':
      // TODO: Implement Yahoo OAuth roster sync
      throw new Error('Yahoo roster sync not yet implemented')

    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * Get all leagues for a connected user
 */
export async function getUserLeagues(
  userId: string,
  platform: Platform,
  season?: number
): Promise<LeagueInfo[]> {
  const connection = await getUserConnection(userId, platform)
  if (!connection) {
    throw new Error(`No ${platform} connection found for user`)
  }

  switch (platform) {
    case 'sleeper':
      const leagues = await getSleeperLeagues(
        connection.platform_user_id,
        season
      )
      // Add user's team info to each league
      for (const league of leagues) {
        const roster = await getSleeperRoster(
          league.leagueId,
          connection.platform_user_id
        )
        if (roster) {
          league.userTeamId = roster.teamId
          league.userTeamName = roster.teamName
        }
      }
      return leagues

    case 'espn':
    case 'yahoo':
      throw new Error(`${platform} league sync not yet implemented`)

    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * Quick connect to Sleeper (no OAuth needed)
 */
export async function connectSleeper(
  userId: string,
  sleeperUsername: string
): Promise<{ success: boolean; error?: string; leagues?: LeagueInfo[] }> {
  // Look up Sleeper user
  const sleeperUser = await getSleeperUser(sleeperUsername)
  if (!sleeperUser) {
    return { success: false, error: 'Sleeper username not found' }
  }

  // Save connection
  await saveUserConnection(
    userId,
    'sleeper',
    sleeperUser.user_id,
    sleeperUser.username
  )

  // Get their leagues
  const leagues = await getSleeperLeagues(sleeperUser.user_id)

  return { success: true, leagues }
}
