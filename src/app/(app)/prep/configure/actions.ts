'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import type { LeagueInsert, KeeperSettings } from '@/lib/supabase/database.types'

export type LeagueFormState = {
  error?: string
  success?: boolean
  leagueId?: string
}

export async function createLeague(
  _prevState: LeagueFormState,
  formData: FormData
): Promise<LeagueFormState> {
  const user = await requireUser()

  const name = formData.get('name') as string
  const platform = formData.get('platform') as string
  const format = formData.get('format') as string
  const team_count = parseInt(formData.get('team_count') as string, 10)
  const budget = formData.get('budget') ? parseInt(formData.get('budget') as string, 10) : null
  const scoring_format = formData.get('scoring_format') as string
  const keeper_enabled = formData.get('keeper_enabled') === 'true'

  // Parse roster slots
  const roster_slots = {
    qb: parseInt(formData.get('roster_qb') as string, 10) || 1,
    rb: parseInt(formData.get('roster_rb') as string, 10) || 2,
    wr: parseInt(formData.get('roster_wr') as string, 10) || 2,
    te: parseInt(formData.get('roster_te') as string, 10) || 1,
    flex: parseInt(formData.get('roster_flex') as string, 10) || 1,
    k: parseInt(formData.get('roster_k') as string, 10) || 1,
    dst: parseInt(formData.get('roster_dst') as string, 10) || 1,
    bench: parseInt(formData.get('roster_bench') as string, 10) || 6,
  }

  // Parse keeper settings if enabled
  let keeper_settings: KeeperSettings | null = null
  if (keeper_enabled) {
    keeper_settings = {
      max_keepers: parseInt(formData.get('max_keepers') as string, 10) || 3,
      cost_type: ((formData.get('keeper_cost_type') as string) || 'round') as KeeperSettings['cost_type'],
      keepers: [],
    }
  }

  if (!name || !platform || !format || !scoring_format) {
    return { error: 'All required fields must be filled' }
  }

  if (format === 'auction' && (!budget || budget < 1)) {
    return { error: 'Auction format requires a budget' }
  }

  // In dev mode, just return success (no Supabase connection)
  if (DEV_MODE) {
    return { success: true, leagueId: 'dev-league-001' }
  }

  const supabase = await createClient()
  if (!supabase) {
    return { error: 'Database connection failed' }
  }

  const league: LeagueInsert = {
    name,
    platform: platform as LeagueInsert['platform'],
    format: format as LeagueInsert['format'],
    team_count,
    budget,
    scoring_format: scoring_format as LeagueInsert['scoring_format'],
    roster_slots,
    keeper_enabled,
    keeper_settings,
  }

  const { data, error } = await supabase
    .from('leagues')
    .insert({ ...league, user_id: user.id })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  return { success: true, leagueId: data.id }
}
