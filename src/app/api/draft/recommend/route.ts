/**
 * FF-041: Per-Pick LLM Recommendation API
 *
 * POST /api/draft/recommend
 * Returns top 3 targets with strategy-adjusted auction values and reasoning.
 * ~500 tokens in, ~300 tokens out. Fast and cheap per call.
 */

import { NextResponse } from 'next/server'
import { askClaudeJson } from '@/lib/ai/claude'

interface RecommendRequest {
  managerName: string
  format: 'auction' | 'snake'
  budgetRemaining?: number
  budgetTotal?: number
  rosterNeeds: Record<string, number> // e.g. { QB: 1, RB: 2 }
  picksMade: number
  totalSlots: number
  currentRound?: number
  strategyName?: string
  strategyArchetype?: string
  // Top available players (pre-scored, send only top ~15 to keep tokens low)
  topAvailable: Array<{
    name: string
    position: string
    consensusValue: number
    strategyScore: number
    adjustedValue?: number
  }>
  // Recent picks for context
  recentPicks: Array<{
    player: string
    position: string
    manager: string
    price?: number
  }>
}

interface LLMRecommendation {
  targets: Array<{
    name: string
    position: string
    maxBid: number
    reasoning: string
    confidence: 'high' | 'medium' | 'low'
  }>
  summary: string
}

export async function POST(request: Request) {
  try {
    const body: RecommendRequest = await request.json()

    const { format, managerName, topAvailable, recentPicks, rosterNeeds } = body

    if (!topAvailable || topAvailable.length === 0) {
      return NextResponse.json(
        { error: 'No available players provided' },
        { status: 400 },
      )
    }

    const isAuction = format === 'auction'

    const system = `You are a fantasy football draft advisor. Return JSON only.
Analyze the draft situation and recommend the top 3 players to target right now.
Consider: roster needs, strategy fit, value relative to consensus, scarcity, and recent draft trends.
${isAuction ? 'For auction: recommend a max bid for each target.' : 'For snake: recommend draft priority order.'}
Be concise. Each reasoning should be 1-2 sentences max.`

    const needsStr = Object.entries(rosterNeeds)
      .filter(([, n]) => n > 0)
      .map(([pos, n]) => `${pos}×${n}`)
      .join(', ')

    const availableStr = topAvailable
      .slice(0, 15)
      .map(p => `${p.name} (${p.position}) $${p.consensusValue} score:${p.strategyScore}`)
      .join('\n')

    const recentStr = recentPicks.length > 0
      ? recentPicks.slice(0, 5).map(p =>
          `${p.player} (${p.position}) → ${p.manager}${p.price != null ? ` $${p.price}` : ''}`
        ).join('\n')
      : 'None yet'

    const prompt = `Draft situation for "${managerName}":
- Format: ${format}
- Strategy: ${body.strategyName ?? 'None'} (${body.strategyArchetype ?? 'balanced'})
- Picks made: ${body.picksMade}/${body.totalSlots}
${isAuction ? `- Budget: $${body.budgetRemaining}/$${body.budgetTotal}` : `- Round: ${body.currentRound ?? '?'}`}
- Needs: ${needsStr || 'None'}

Recent picks:
${recentStr}

Top available players (sorted by strategy fit):
${availableStr}

Return JSON: { "targets": [{ "name": string, "position": string, "maxBid": number, "reasoning": string, "confidence": "high"|"medium"|"low" }], "summary": string }
Exactly 3 targets. Summary should be 1 sentence about overall draft strategy right now.`

    const result = await askClaudeJson<LLMRecommendation>({
      system,
      prompt,
      maxTokens: 384,
      tier: 'fast', // Haiku for live draft speed
    })

    return NextResponse.json({ recommendation: result })
  } catch (err) {
    console.error('Recommend API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get recommendation' },
      { status: 500 },
    )
  }
}
