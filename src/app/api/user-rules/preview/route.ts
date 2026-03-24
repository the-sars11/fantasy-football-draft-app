/**
 * User Rules Preview API (FF-233)
 *
 * Preview which players a rule would affect before saving it.
 *
 * POST /api/user-rules/preview
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import { parseRule, applyRuleToPlayer, validateParsedRule } from '@/lib/research/intel/rule-parser'
import type { ParsedRule } from '@/lib/supabase/database.types'

async function getClient() {
  if (DEV_MODE) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceKey) return createClient(url, serviceKey)
  }
  return createServerClient()
}

interface PlayerPreview {
  id: string
  name: string
  team: string | null
  position: string
  adp: number | null
  modifier: number
}

/**
 * POST /api/user-rules/preview
 *
 * Parse a rule and show which players it would affect.
 *
 * Body: {
 *   ruleText: string (required) - Natural language rule to preview
 *   limit?: number (default: 20) - Max players to return
 * }
 *
 * Or:
 * Body: {
 *   parsedRule: ParsedRule (required) - Already parsed rule to preview
 *   limit?: number (default: 20)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      ruleText,
      parsedRule: providedRule,
      limit = 20,
    } = body as {
      ruleText?: string
      parsedRule?: ParsedRule
      limit?: number
    }

    let parsedRule: ParsedRule
    let interpretation: string | undefined
    let confidence: number = 1

    // Parse rule if text provided
    if (ruleText) {
      if (ruleText.trim().length === 0) {
        return NextResponse.json({ error: 'ruleText is required' }, { status: 400 })
      }

      const parseResult = await parseRule(ruleText.trim())

      if (!parseResult.success || !parseResult.parsedRule) {
        return NextResponse.json({
          error: parseResult.error || 'Failed to parse rule',
          confidence: parseResult.confidence,
        }, { status: 400 })
      }

      parsedRule = parseResult.parsedRule
      interpretation = parseResult.interpretation
      confidence = parseResult.confidence
    } else if (providedRule) {
      parsedRule = providedRule
    } else {
      return NextResponse.json({ error: 'ruleText or parsedRule is required' }, { status: 400 })
    }

    // Validate
    const validation = validateParsedRule(parsedRule)

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Fetch players from cache
    const { data: players, error: playersError } = await supabase
      .from('players_cache')
      .select('id, name, team, position, adp, auction_values, source_data')
      .order('adp->fantasypros', { ascending: true, nullsFirst: false })
      .limit(500) // Check up to 500 players

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 })
    }

    // Apply rule to each player
    const affectedPlayers: PlayerPreview[] = []
    const unaffectedSample: PlayerPreview[] = []

    for (const player of players ?? []) {
      // Extract player data for rule evaluation
      const adpValue = player.adp?.fantasypros ?? player.adp?.espn ?? player.adp?.sleeper ?? null
      const auctionValue = player.auction_values?.fantasypros ?? player.auction_values?.espn ?? null
      const sourceData = player.source_data as Record<string, unknown> | null

      const playerData = {
        position: player.position,
        team: player.team,
        adp: adpValue,
        auction_value: auctionValue,
        name: player.name,
        // Extract additional fields from source_data if available
        age: (sourceData?.age as number) ?? undefined,
        years_exp: (sourceData?.years_exp as number) ?? undefined,
        injury_status: (sourceData?.injury_status as string) ?? null,
        bye_week: (sourceData?.bye_week as number) ?? null,
      }

      const modifier = applyRuleToPlayer(parsedRule, playerData)

      if (modifier !== 0) {
        affectedPlayers.push({
          id: player.id,
          name: player.name,
          team: player.team,
          position: player.position,
          adp: adpValue,
          modifier,
        })
      } else if (unaffectedSample.length < 5) {
        // Keep a small sample of unaffected players
        unaffectedSample.push({
          id: player.id,
          name: player.name,
          team: player.team,
          position: player.position,
          adp: adpValue,
          modifier: 0,
        })
      }
    }

    // Sort by modifier magnitude (most impacted first)
    affectedPlayers.sort((a, b) => Math.abs(b.modifier) - Math.abs(a.modifier))

    return NextResponse.json({
      parsedRule,
      interpretation,
      confidence,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      affectedPlayers: affectedPlayers.slice(0, limit),
      totalAffected: affectedPlayers.length,
      unaffectedSample,
      modifier: parsedRule.score_modifier,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-rules/preview POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
