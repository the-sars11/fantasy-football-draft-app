/**
 * FF-041: Per-Pick LLM Recommendation API
 * FF-266: Split into auction-specific and snake-specific prompt builders
 *
 * POST /api/draft/recommend
 * Dispatches to buildAuctionPrompt or buildSnakePrompt based on `format`.
 */

import { NextResponse } from 'next/server'
import { askClaudeJson } from '@/lib/ai/claude'
import { formatScoringBonuses } from '@/lib/research/analyze'
import type { ScoringSettings } from '@/lib/supabase/database.types'

// --- Shared types ---

interface RecentPick {
  player: string
  position: string
  manager: string
  price?: number
  round?: number
}

interface AuctionAvailablePlayer {
  name: string
  position: string
  consensusValue: number
  adjustedValue?: number
  strategyScore: number
}

interface SnakeAvailablePlayer {
  name: string
  position: string
  adp: number
  consensusRank: number
  adjustedRound?: number
  strategyScore: number
}

interface BaseRecommendRequest {
  managerName: string
  format: 'auction' | 'snake'
  rosterNeeds: Record<string, number>
  picksMade: number
  totalSlots: number
  strategyName?: string
  strategyArchetype?: string
  scoringSettings?: ScoringSettings | null
  recentPicks: RecentPick[]
}

interface AuctionRecommendRequest extends BaseRecommendRequest {
  format: 'auction'
  budgetRemaining: number
  budgetTotal: number
  topAvailable: AuctionAvailablePlayer[]
}

interface SnakeRecommendRequest extends BaseRecommendRequest {
  format: 'snake'
  currentRound?: number
  topAvailable: SnakeAvailablePlayer[]
}

type RecommendRequest = AuctionRecommendRequest | SnakeRecommendRequest

// --- Auction prompt ---

interface LLMAuctionRecommendation {
  targets: Array<{
    name: string
    position: string
    maxBid: number
    reasoning: string
    confidence: 'high' | 'medium' | 'low'
  }>
  summary: string
}

function buildAuctionPrompts(body: AuctionRecommendRequest, bonusContext: string): { system: string; prompt: string } {
  const system = `You are a fantasy football auction draft advisor. Return JSON only.
Analyze the auction draft situation and recommend the top 3 players to target right now.
Consider: roster needs, strategy fit, auction value relative to consensus, positional scarcity, budget management, and recent bidding trends.
${bonusContext ? `\nIMPORTANT — Custom scoring bonuses affect valuations:\n${bonusContext}\nFactor these bonuses into recommendations and max bids.` : ''}
For each target, recommend a realistic max bid that accounts for the manager's remaining budget and empty roster slots.
Be concise. Each reasoning should be 1-2 sentences max.`

  const needsStr = Object.entries(body.rosterNeeds)
    .filter(([, n]) => n > 0)
    .map(([pos, n]) => `${pos}×${n}`)
    .join(', ')

  const availableStr = body.topAvailable
    .map(p => {
      const adj = p.adjustedValue != null ? ` adj:$${p.adjustedValue}` : ''
      return `${p.name} (${p.position}) consensus:$${p.consensusValue}${adj} score:${p.strategyScore}`
    })
    .join('\n')

  const recentStr = body.recentPicks.length > 0
    ? body.recentPicks.map(p => `${p.player} (${p.position}) → ${p.manager}$${p.price ?? '?'}`).join('\n')
    : 'None yet'

  const prompt = `Auction draft situation for "${body.managerName}":
- Strategy: ${body.strategyName ?? 'None'} (${body.strategyArchetype ?? 'balanced'})
- Budget: $${body.budgetRemaining} remaining / $${body.budgetTotal} total
- Picks: ${body.picksMade}/${body.totalSlots} slots filled
- Needs: ${needsStr || 'None'}

Recent nominations won:
${recentStr}

Top available players (sorted by strategy fit):
${availableStr}

Return JSON: { "targets": [{ "name": string, "position": string, "maxBid": number, "reasoning": string, "confidence": "high"|"medium"|"low" }], "summary": string }
Exactly 3 targets. maxBid must be within the manager's budget. Summary: 1 sentence on auction strategy right now.`

  return { system, prompt }
}

// --- Snake prompt ---

interface LLMSnakeRecommendation {
  targets: Array<{
    name: string
    position: string
    pickRound: number
    reasoning: string
    confidence: 'high' | 'medium' | 'low'
  }>
  summary: string
}

function buildSnakePrompts(body: SnakeRecommendRequest, bonusContext: string): { system: string; prompt: string } {
  const system = `You are a fantasy football snake draft advisor. Return JSON only.
Analyze the snake draft situation and recommend the top 3 players to target in the next few rounds.
Consider: roster needs, strategy fit, ADP vs consensus rank, positional scarcity, upcoming pick position, and best available value.
${bonusContext ? `\nIMPORTANT — Custom scoring bonuses affect valuations:\n${bonusContext}\nFactor these bonuses into recommendations.` : ''}
For each target, recommend the latest round to draft them (pickRound) before they likely get taken.
Be concise. Each reasoning should be 1-2 sentences max.`

  const needsStr = Object.entries(body.rosterNeeds)
    .filter(([, n]) => n > 0)
    .map(([pos, n]) => `${pos}×${n}`)
    .join(', ')

  const availableStr = body.topAvailable
    .map(p => {
      const adj = p.adjustedRound != null ? ` targetRd:${p.adjustedRound}` : ''
      return `${p.name} (${p.position}) adp:${p.adp.toFixed(1)} rank:${p.consensusRank}${adj} score:${p.strategyScore}`
    })
    .join('\n')

  const recentStr = body.recentPicks.length > 0
    ? body.recentPicks.map(p => `Rd${p.round ?? '?'}: ${p.player} (${p.position}) → ${p.manager}`).join('\n')
    : 'None yet'

  const prompt = `Snake draft situation for "${body.managerName}":
- Strategy: ${body.strategyName ?? 'None'} (${body.strategyArchetype ?? 'balanced'})
- Current round: ${body.currentRound ?? '?'}
- Picks: ${body.picksMade}/${body.totalSlots} slots filled
- Needs: ${needsStr || 'None'}

Recent picks (last 3):
${recentStr}

Top available players (sorted by strategy fit):
${availableStr}

Return JSON: { "targets": [{ "name": string, "position": string, "pickRound": number, "reasoning": string, "confidence": "high"|"medium"|"low" }], "summary": string }
Exactly 3 targets. pickRound is the latest round to safely draft each player. Summary: 1 sentence on draft strategy right now.`

  return { system, prompt }
}

// --- Route handler ---

export async function POST(request: Request) {
  try {
    const body: RecommendRequest = await request.json()

    if (!body.topAvailable || body.topAvailable.length === 0) {
      return NextResponse.json(
        { error: 'No available players provided' },
        { status: 400 },
      )
    }

    const bonusContext = formatScoringBonuses(body.scoringSettings ?? null) ?? ''

    let system: string
    let prompt: string
    let result: LLMAuctionRecommendation | LLMSnakeRecommendation

    if (body.format === 'auction') {
      ;({ system, prompt } = buildAuctionPrompts(body as AuctionRecommendRequest, bonusContext))
      result = await askClaudeJson<LLMAuctionRecommendation>({
        system,
        prompt,
        maxTokens: 384,
        tier: 'fast',
      })
    } else {
      ;({ system, prompt } = buildSnakePrompts(body as SnakeRecommendRequest, bonusContext))
      result = await askClaudeJson<LLMSnakeRecommendation>({
        system,
        prompt,
        maxTokens: 384,
        tier: 'fast',
      })
    }

    return NextResponse.json({ recommendation: result })
  } catch (err) {
    console.error('Recommend API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get recommendation' },
      { status: 500 },
    )
  }
}
