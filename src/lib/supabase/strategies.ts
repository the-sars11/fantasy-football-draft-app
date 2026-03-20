'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import type { Strategy, StrategyInsert, StrategyUpdate } from '@/lib/supabase/database.types'

// --- Dev mode mock data ---

const DEV_STRATEGIES: Strategy[] = []

// --- Queries ---

export async function getStrategiesForLeague(leagueId: string): Promise<Strategy[]> {
  if (DEV_MODE) {
    return DEV_STRATEGIES.filter((s) => s.league_id === leagueId)
  }

  const supabase = await createClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('league_id', leagueId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Strategy[]
}

export async function getActiveStrategy(leagueId: string): Promise<Strategy | null> {
  if (DEV_MODE) {
    return DEV_STRATEGIES.find((s) => s.league_id === leagueId && s.is_active) ?? null
  }

  const supabase = await createClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message) // PGRST116 = no rows
  return (data as Strategy) ?? null
}

export async function getStrategy(strategyId: string): Promise<Strategy | null> {
  if (DEV_MODE) {
    return DEV_STRATEGIES.find((s) => s.id === strategyId) ?? null
  }

  const supabase = await createClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('id', strategyId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return (data as Strategy) ?? null
}

// --- Mutations ---

export async function createStrategy(
  strategy: StrategyInsert
): Promise<{ id: string } | { error: string }> {
  const user = await requireUser()

  if (!strategy.name || !strategy.archetype || !strategy.league_id) {
    return { error: 'Name, archetype, and league are required' }
  }

  if (DEV_MODE) {
    const id = `dev-strategy-${Date.now()}`
    DEV_STRATEGIES.push({
      id,
      user_id: user.id,
      league_id: strategy.league_id,
      name: strategy.name,
      description: strategy.description ?? null,
      archetype: strategy.archetype,
      source: strategy.source ?? 'user',
      is_active: strategy.is_active ?? false,
      position_weights: strategy.position_weights ?? { QB: 5, RB: 5, WR: 5, TE: 5, K: 2, DST: 2 },
      player_targets: strategy.player_targets ?? [],
      player_avoids: strategy.player_avoids ?? [],
      team_avoids: strategy.team_avoids ?? [],
      risk_tolerance: strategy.risk_tolerance ?? 'balanced',
      budget_allocation: strategy.budget_allocation ?? null,
      max_bid_percentage: strategy.max_bid_percentage ?? null,
      round_targets: strategy.round_targets ?? null,
      position_round_priority: strategy.position_round_priority ?? null,
      ai_reasoning: strategy.ai_reasoning ?? null,
      ai_confidence: strategy.ai_confidence ?? null,
      projected_ceiling: strategy.projected_ceiling ?? null,
      projected_floor: strategy.projected_floor ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    return { id }
  }

  const supabase = await createClient()
  if (!supabase) return { error: 'Database connection failed' }

  const { data, error } = await supabase
    .from('strategies')
    .insert({ ...strategy, user_id: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export async function updateStrategy(
  strategyId: string,
  updates: StrategyUpdate
): Promise<{ success: boolean } | { error: string }> {
  await requireUser()

  if (DEV_MODE) {
    const idx = DEV_STRATEGIES.findIndex((s) => s.id === strategyId)
    if (idx === -1) return { error: 'Strategy not found' }
    DEV_STRATEGIES[idx] = { ...DEV_STRATEGIES[idx], ...updates, updated_at: new Date().toISOString() }
    return { success: true }
  }

  const supabase = await createClient()
  if (!supabase) return { error: 'Database connection failed' }

  const { error } = await supabase
    .from('strategies')
    .update(updates)
    .eq('id', strategyId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteStrategy(
  strategyId: string
): Promise<{ success: boolean } | { error: string }> {
  await requireUser()

  if (DEV_MODE) {
    const idx = DEV_STRATEGIES.findIndex((s) => s.id === strategyId)
    if (idx === -1) return { error: 'Strategy not found' }
    DEV_STRATEGIES.splice(idx, 1)
    return { success: true }
  }

  const supabase = await createClient()
  if (!supabase) return { error: 'Database connection failed' }

  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', strategyId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function setActiveStrategy(
  leagueId: string,
  strategyId: string
): Promise<{ success: boolean } | { error: string }> {
  await requireUser()

  if (DEV_MODE) {
    DEV_STRATEGIES.forEach((s) => {
      if (s.league_id === leagueId) s.is_active = s.id === strategyId
    })
    return { success: true }
  }

  const supabase = await createClient()
  if (!supabase) return { error: 'Database connection failed' }

  // The DB trigger handles deactivating other strategies,
  // so we just set the target one to active
  const { error } = await supabase
    .from('strategies')
    .update({ is_active: true })
    .eq('id', strategyId)

  if (error) return { error: error.message }
  return { success: true }
}
