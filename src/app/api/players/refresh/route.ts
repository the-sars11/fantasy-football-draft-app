/**
 * POST /api/players/refresh
 *
 * Pulls fresh data from all sources, normalizes, and caches in Supabase.
 * Accepts optional body: { scoringFormat, budget, season, sources }
 * - scoringFormat: 'ppr' | 'half-ppr' | 'standard' (default: 'ppr')
 * - budget: auction budget for FP auction values (default: 200)
 * - season: NFL season year (default: current year)
 * - sources: array of sources to pull (default: all available)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllSleeperData } from '@/lib/research/sources/sleeper'
import { fetchAllESPNData } from '@/lib/research/sources/espn'
import { fetchAllFantasyProsData } from '@/lib/research/sources/fantasypros'
import { normalizePlayerData, type NormalizeInput } from '@/lib/research/normalize'
import { upsertPlayerCache } from '@/lib/research/cache'
import type { ScoringFormat } from '@/lib/players/types'

// Use service role for cache writes (bypasses RLS)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role credentials')
  }
  return createClient(url, serviceKey)
}

interface RefreshRequest {
  scoringFormat?: ScoringFormat
  budget?: number
  season?: number
  sources?: ('sleeper' | 'espn' | 'fantasypros')[]
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as RefreshRequest
    const scoringFormat = body.scoringFormat || 'ppr'
    const budget = body.budget || 200
    const season = body.season || new Date().getFullYear()
    const requestedSources = body.sources || ['sleeper', 'espn', 'fantasypros']

    const results: Record<string, { success: boolean; count: number; error?: string }> = {}
    const input: NormalizeInput = { scoringFormat }

    // Fetch from all requested sources in parallel
    const fetches = await Promise.allSettled([
      requestedSources.includes('sleeper')
        ? fetchAllSleeperData(season.toString())
        : Promise.resolve(null),
      requestedSources.includes('espn')
        ? fetchAllESPNData(season, scoringFormat)
        : Promise.resolve(null),
      requestedSources.includes('fantasypros')
        ? fetchAllFantasyProsData(season, scoringFormat, budget)
        : Promise.resolve(null),
    ])

    // Process Sleeper results
    if (requestedSources.includes('sleeper')) {
      const sleeperResult = fetches[0]
      if (sleeperResult.status === 'fulfilled' && sleeperResult.value) {
        const data = sleeperResult.value
        input.sleeper = {
          players: data.players,
          projections: data.projections,
          fetchedAt: data.fetchedAt,
        }
        results.sleeper = { success: true, count: data.players.length }
      } else {
        const error = sleeperResult.status === 'rejected' ? sleeperResult.reason?.message : 'No data'
        results.sleeper = { success: false, count: 0, error }
      }
    }

    // Process ESPN results
    if (requestedSources.includes('espn')) {
      const espnResult = fetches[1]
      if (espnResult.status === 'fulfilled' && espnResult.value) {
        const data = espnResult.value
        input.espn = {
          players: data.players,
          fetchedAt: data.fetchedAt,
        }
        results.espn = { success: true, count: data.players.length }
      } else {
        const error = espnResult.status === 'rejected' ? espnResult.reason?.message : 'No data'
        results.espn = { success: false, count: 0, error }
      }
    }

    // Process FantasyPros results
    if (requestedSources.includes('fantasypros')) {
      const fpResult = fetches[2]
      if (fpResult.status === 'fulfilled' && fpResult.value) {
        const data = fpResult.value
        input.fantasypros = {
          ecr: data.ecr,
          auctionValues: data.auctionValues,
          fetchedAt: data.fetchedAt,
        }
        results.fantasypros = { success: true, count: data.ecr.length }
      } else {
        const error = fpResult.status === 'rejected' ? fpResult.reason?.message : 'No data'
        results.fantasypros = { success: false, count: 0, error }
      }
    }

    // Need at least one source to normalize
    const successfulSources = Object.values(results).filter((r) => r.success).length
    if (successfulSources === 0) {
      return NextResponse.json(
        {
          error: 'All data sources failed',
          details: results,
        },
        { status: 502 }
      )
    }

    // Normalize across all available sources
    const normalized = normalizePlayerData(input)

    // Upsert to Supabase cache
    const supabase = getServiceClient()
    const { upserted, errors } = await upsertPlayerCache(
      supabase,
      normalized.players,
      normalized.freshness
    )

    return NextResponse.json({
      success: true,
      players: normalized.players.length,
      upserted,
      sources: results,
      freshness: normalized.freshness,
      cacheErrors: errors.length > 0 ? errors : undefined,
      normalizedAt: normalized.normalizedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
