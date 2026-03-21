/**
 * Research Pipeline Orchestrator (FF-017)
 *
 * configure → ingest → normalize → analyze (through active strategy) → output
 *
 * Ties together data sources, normalization, caching, and strategy scoring
 * into a single pipeline that produces a complete research run.
 */

import { fetchAllSleeperData } from './sources/sleeper'
import { fetchAllESPNData } from './sources/espn'
import { fetchAllFantasyProsData } from './sources/fantasypros'
import { normalizePlayerData, type NormalizeInput, type ConsensusPlayer } from './normalize'
import { upsertPlayerCache, readPlayerCache } from './cache'
import { scorePlayersWithStrategy, type ScoredPlayer } from './strategy/scoring'
import { cacheToPlayers } from '@/lib/players/convert'
import type { Player, DraftFormat, ScoringFormat } from '@/lib/players/types'
import type { Strategy, KeeperSettings } from '@/lib/supabase/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// --- Pipeline Configuration ---

export interface PipelineConfig {
  leagueId: string
  format: DraftFormat
  scoringFormat: ScoringFormat
  teamCount: number
  budget?: number // auction only
  season?: number
  sources?: ('sleeper' | 'espn' | 'fantasypros')[]
  /** Skip data refresh and use cached players */
  skipRefresh?: boolean
  /** Keeper settings — players to exclude from pool and costs to deduct (FF-029) */
  keeperSettings?: KeeperSettings | null
}

// --- Pipeline Step Results ---

export interface IngestResult {
  sources: Record<string, { success: boolean; count: number; error?: string }>
  totalPlayers: number
  fetchedAt: string
}

export interface AnalysisResult {
  /** All players scored through the active strategy */
  scoredPlayers: ScoredPlayer[]
  /** Top targets — highest strategy score */
  targets: ScoredPlayer[]
  /** Avoid list — flagged by strategy or team avoids */
  avoids: ScoredPlayer[]
  /** Value plays — high score + good consensus value */
  valuePlays: ScoredPlayer[]
  /** Position breakdown — top players per position */
  byPosition: Record<string, ScoredPlayer[]>
}

export interface PipelineResult {
  config: PipelineConfig
  strategy: Strategy | null
  ingest: IngestResult
  analysis: AnalysisResult
  /** Raw consensus players (pre-strategy) */
  players: Player[]
  completedAt: string
}

export type PipelineStep = 'configure' | 'ingest' | 'normalize' | 'analyze' | 'complete'

export interface PipelineProgress {
  step: PipelineStep
  message: string
}

// --- Pipeline Orchestrator ---

export async function runResearchPipeline(
  config: PipelineConfig,
  strategy: Strategy | null,
  supabase: SupabaseClient,
  onProgress?: (progress: PipelineProgress) => void,
): Promise<PipelineResult> {
  const season = config.season || new Date().getFullYear()
  const budget = config.budget || 200
  const sources = config.sources || ['sleeper', 'espn', 'fantasypros']

  // --- Step 1: Configure ---
  onProgress?.({ step: 'configure', message: 'Validating configuration...' })

  // --- Step 2: Ingest + Normalize ---
  let players: Player[]
  let ingestResult: IngestResult

  if (config.skipRefresh) {
    onProgress?.({ step: 'ingest', message: 'Loading cached player data...' })

    const cached = await readPlayerCache(supabase)
    players = cacheToPlayers(cached)
    ingestResult = {
      sources: { cache: { success: true, count: players.length } },
      totalPlayers: players.length,
      fetchedAt: new Date().toISOString(),
    }
  } else {
    onProgress?.({ step: 'ingest', message: `Pulling data from ${sources.join(', ')}...` })

    const { players: freshPlayers, ingest } = await ingestAndNormalize(
      sources,
      season,
      config.scoringFormat,
      budget,
      supabase,
    )
    players = freshPlayers
    ingestResult = ingest
  }

  if (players.length === 0) {
    throw new Error('No player data available. Pull data first via Player Data refresh.')
  }

  // --- Step 2.5: Exclude keepers from pool and adjust budget (FF-029) ---
  let adjustedBudget = config.budget
  const keeperNames: string[] = []

  if (config.keeperSettings?.keepers && config.keeperSettings.keepers.length > 0) {
    // Build list of keeper names (lowercase for matching)
    for (const k of config.keeperSettings.keepers) {
      keeperNames.push(k.player_name.toLowerCase())
    }

    // Filter out keeper players from the pool
    const beforeCount = players.length
    players = players.filter((p) => !keeperNames.includes(p.name.toLowerCase()))
    const removedCount = beforeCount - players.length

    onProgress?.({ step: 'configure', message: `Excluded ${removedCount} keepers from pool.` })

    // For auction: subtract keeper costs from budget
    if (config.format === 'auction' && config.budget) {
      const keeperCost = config.keeperSettings.keepers.reduce((sum, k) => sum + k.cost, 0)
      adjustedBudget = config.budget - keeperCost
      onProgress?.({ step: 'configure', message: `Adjusted budget: $${adjustedBudget} (after $${keeperCost} in keepers)` })
    }
  }

  // --- Step 3: Analyze through active strategy ---
  onProgress?.({ step: 'analyze', message: strategy ? `Scoring through "${strategy.name}"...` : 'Scoring players...' })

  const analysis = analyzeWithStrategy(players, strategy, config.format, adjustedBudget)

  // --- Step 4: Output ---
  onProgress?.({ step: 'complete', message: 'Research complete.' })

  return {
    config,
    strategy,
    ingest: ingestResult,
    analysis,
    players,
    completedAt: new Date().toISOString(),
  }
}

// --- Internal: Ingest + Normalize + Cache ---

async function ingestAndNormalize(
  sources: string[],
  season: number,
  scoringFormat: ScoringFormat,
  budget: number,
  supabase: SupabaseClient,
): Promise<{ players: Player[]; ingest: IngestResult }> {
  const results: Record<string, { success: boolean; count: number; error?: string }> = {}
  const input: NormalizeInput = { scoringFormat }

  const fetches = await Promise.allSettled([
    sources.includes('sleeper')
      ? fetchAllSleeperData(season.toString())
      : Promise.resolve(null),
    sources.includes('espn')
      ? fetchAllESPNData(season, scoringFormat)
      : Promise.resolve(null),
    sources.includes('fantasypros')
      ? fetchAllFantasyProsData(season, scoringFormat, budget)
      : Promise.resolve(null),
  ])

  // Process Sleeper
  if (sources.includes('sleeper')) {
    const r = fetches[0]
    if (r.status === 'fulfilled' && r.value) {
      input.sleeper = { players: r.value.players, projections: r.value.projections, fetchedAt: r.value.fetchedAt }
      results.sleeper = { success: true, count: r.value.players.length }
    } else {
      results.sleeper = { success: false, count: 0, error: r.status === 'rejected' ? r.reason?.message : 'No data' }
    }
  }

  // Process ESPN
  if (sources.includes('espn')) {
    const r = fetches[1]
    if (r.status === 'fulfilled' && r.value) {
      input.espn = { players: r.value.players, fetchedAt: r.value.fetchedAt }
      results.espn = { success: true, count: r.value.players.length }
    } else {
      results.espn = { success: false, count: 0, error: r.status === 'rejected' ? r.reason?.message : 'No data' }
    }
  }

  // Process FantasyPros
  if (sources.includes('fantasypros')) {
    const r = fetches[2]
    if (r.status === 'fulfilled' && r.value) {
      input.fantasypros = { ecr: r.value.ecr, auctionValues: r.value.auctionValues, fetchedAt: r.value.fetchedAt }
      results.fantasypros = { success: true, count: r.value.ecr.length }
    } else {
      results.fantasypros = { success: false, count: 0, error: r.status === 'rejected' ? r.reason?.message : 'No data' }
    }
  }

  const successfulSources = Object.values(results).filter((r) => r.success).length
  if (successfulSources === 0) {
    throw new Error('All data sources failed: ' + JSON.stringify(results))
  }

  // Normalize
  const normalized = normalizePlayerData(input)

  // Cache
  await upsertPlayerCache(supabase, normalized.players, normalized.freshness)

  // Convert to Player type
  const cached = await readPlayerCache(supabase)
  const players = cacheToPlayers(cached)

  return {
    players,
    ingest: {
      sources: results,
      totalPlayers: players.length,
      fetchedAt: new Date().toISOString(),
    },
  }
}

// --- Internal: Strategy Analysis ---

function analyzeWithStrategy(
  players: Player[],
  strategy: Strategy | null,
  format: DraftFormat,
  leagueBudget?: number,
): AnalysisResult {
  // If no strategy, use a neutral default
  const defaultStrategy: Strategy = {
    id: 'default',
    user_id: '',
    league_id: '',
    name: 'Balanced',
    description: null,
    archetype: 'balanced',
    source: 'preset',
    is_active: false,
    position_weights: { QB: 5, RB: 5, WR: 5, TE: 5, K: 2, DST: 2 },
    player_targets: [],
    player_avoids: [],
    team_avoids: [],
    risk_tolerance: 'balanced',
    budget_allocation: null,
    max_bid_percentage: null,
    round_targets: null,
    position_round_priority: null,
    ai_reasoning: null,
    ai_confidence: null,
    projected_ceiling: null,
    projected_floor: null,
    created_at: '',
    updated_at: '',
  }

  const activeStrategy = strategy ?? defaultStrategy
  const scoredPlayers = scorePlayersWithStrategy(players, activeStrategy, format, leagueBudget)

  // Top targets — high strategy score, not avoided
  const targets = scoredPlayers
    .filter((sp) => sp.targetStatus === 'target')
    .slice(0, 20)

  // Avoids
  const avoids = scoredPlayers
    .filter((sp) => sp.targetStatus === 'avoid')

  // Value plays — score >= 60, good consensus rank relative to strategy-adjusted position
  const valuePlays = scoredPlayers
    .filter((sp) => sp.strategyScore >= 60 && sp.targetStatus !== 'avoid')
    .slice(0, 15)

  // By position — top 20 per position
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
  const byPosition: Record<string, ScoredPlayer[]> = {}
  for (const pos of positions) {
    byPosition[pos] = scoredPlayers
      .filter((sp) => sp.player.position === pos)
      .slice(0, 20)
  }

  return {
    scoredPlayers,
    targets,
    avoids,
    valuePlays,
    byPosition,
  }
}
