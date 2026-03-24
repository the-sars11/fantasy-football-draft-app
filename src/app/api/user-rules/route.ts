/**
 * User Rules API Routes (FF-229)
 *
 * CRUD operations for user-defined rules (natural language parsed by LLM).
 * Rules can be league-specific or global (league_id = null).
 *
 * Endpoints:
 * - GET /api/user-rules?leagueId=xxx - List user rules
 * - POST /api/user-rules - Create a new rule (parses with LLM)
 * - PUT /api/user-rules - Update an existing rule
 * - DELETE /api/user-rules - Delete a rule
 * - PATCH /api/user-rules - Toggle rule active status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import { parseRule, validateParsedRule } from '@/lib/research/intel/rule-parser'
import type { UserRuleInsert, UserRuleUpdate, RuleType, ParsedRule } from '@/lib/supabase/database.types'

async function getClient() {
  if (DEV_MODE) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceKey) return createClient(url, serviceKey)
  }
  return createServerClient()
}

/**
 * GET /api/user-rules
 *
 * Query params:
 * - leagueId: Filter by league (optional)
 * - activeOnly: Only return active rules (default: false)
 * - includeGlobal: Include global rules when filtering by league (default: true)
 */
export async function GET(req: NextRequest) {
  try {
    const leagueId = req.nextUrl.searchParams.get('leagueId')
    const activeOnly = req.nextUrl.searchParams.get('activeOnly') === 'true'
    const includeGlobal = req.nextUrl.searchParams.get('includeGlobal') !== 'false'

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    let query = supabase
      .from('user_rules')
      .select('*')

    // Apply league filter
    if (leagueId) {
      if (includeGlobal) {
        query = query.or(`league_id.eq.${leagueId},league_id.is.null`)
      } else {
        query = query.eq('league_id', leagueId)
      }
    }

    // Active only filter
    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      rules: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-rules GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/user-rules
 *
 * Create a new rule. The rule text is parsed by LLM into structured conditions.
 *
 * Body: {
 *   ruleText: string (required) - Natural language rule
 *   leagueId?: string | null (optional)
 *   isActive?: boolean (default: true)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      ruleText,
      leagueId = null,
      isActive = true,
    } = body as {
      ruleText?: string
      leagueId?: string | null
      isActive?: boolean
    }

    if (!ruleText || ruleText.trim().length === 0) {
      return NextResponse.json({ error: 'ruleText is required' }, { status: 400 })
    }

    if (ruleText.length > 500) {
      return NextResponse.json({ error: 'Rule text too long (max 500 characters)' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Parse the rule with LLM
    const parseResult = await parseRule(ruleText.trim())

    if (!parseResult.success || !parseResult.parsedRule) {
      return NextResponse.json({
        error: parseResult.error || 'Failed to parse rule',
        confidence: parseResult.confidence,
      }, { status: 400 })
    }

    // Validate the parsed rule
    const validation = validateParsedRule(parseResult.parsedRule)

    const insert: UserRuleInsert = {
      league_id: leagueId,
      rule_text: ruleText.trim(),
      rule_type: parseResult.parsedRule.action,
      is_active: isActive,
      parsed_rule: parseResult.parsedRule,
      llm_interpretation: parseResult.interpretation,
      is_validated: validation.isValid,
      validation_error: validation.errors.length > 0 ? validation.errors.join('; ') : null,
    }

    const { data, error } = await supabase
      .from('user_rules')
      .insert(insert)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      rule: data,
      interpretation: parseResult.interpretation,
      confidence: parseResult.confidence,
      warnings: validation.warnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-rules POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT /api/user-rules
 *
 * Update an existing rule. If ruleText changes, re-parses with LLM.
 *
 * Body: {
 *   id: string (required)
 *   updates: {
 *     ruleText?: string - If provided, re-parses with LLM
 *     isActive?: boolean
 *     leagueId?: string | null
 *   }
 * }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, updates } = body as {
      id?: string
      updates?: {
        ruleText?: string
        isActive?: boolean
        leagueId?: string | null
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'updates object is required' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Handle rule text change (requires re-parsing)
    if (updates.ruleText !== undefined) {
      const ruleText = updates.ruleText.trim()

      if (ruleText.length === 0) {
        return NextResponse.json({ error: 'ruleText cannot be empty' }, { status: 400 })
      }

      if (ruleText.length > 500) {
        return NextResponse.json({ error: 'Rule text too long (max 500 characters)' }, { status: 400 })
      }

      // Re-parse with LLM
      const parseResult = await parseRule(ruleText)

      if (!parseResult.success || !parseResult.parsedRule) {
        return NextResponse.json({
          error: parseResult.error || 'Failed to parse rule',
          confidence: parseResult.confidence,
        }, { status: 400 })
      }

      const validation = validateParsedRule(parseResult.parsedRule)

      updateData.rule_text = ruleText
      updateData.rule_type = parseResult.parsedRule.action
      updateData.parsed_rule = parseResult.parsedRule
      updateData.llm_interpretation = parseResult.interpretation
      updateData.is_validated = validation.isValid
      updateData.validation_error = validation.errors.length > 0 ? validation.errors.join('; ') : null
    }

    if (updates.isActive !== undefined) {
      updateData.is_active = updates.isActive
    }

    if (updates.leagueId !== undefined) {
      updateData.league_id = updates.leagueId
    }

    const { data, error } = await supabase
      .from('user_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ rule: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-rules PUT]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/user-rules
 *
 * Delete a rule.
 *
 * Body: {
 *   id: string (required)
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body as { id?: string }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const { error } = await supabase
      .from('user_rules')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedId: id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-rules DELETE]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/user-rules
 *
 * Toggle rule active status.
 *
 * Body: {
 *   id: string (required)
 * }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body as { id?: string }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Get current state
    const { data: current, error: fetchError } = await supabase
      .from('user_rules')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    // Toggle
    const { data, error } = await supabase
      .from('user_rules')
      .update({
        is_active: !current.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      rule: data,
      isActive: data.is_active,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-rules PATCH]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
