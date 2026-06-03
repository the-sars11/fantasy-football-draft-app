/**
 * FF-041: Per-Pick LLM Recommendation API
 * FF-266: Split into auction-specific and snake-specific prompt builders
 *
 * POST /api/draft/recommend
 * Dispatches to buildAuctionPrompt or buildSnakePrompt based on `format`.
 */

import { NextResponse } from 'next/server'
import { askClaudeJson, type ClaudeJsonRequest } from '@/lib/ai/claude'
import { formatScoringBonuses } from '@/lib/research/analyze'
import type { ScoringSettings } from '@/lib/supabase/database.types'

// Cap this function at the Vercel free-tier ceiling so it fails fast into the
// rule-based fallback instead of hanging the live draft.
export const maxDuration = 10

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
${bonusContext ? `\nIMPORTANT - Custom scoring bonuses affect valuations:\n${bonusContext}\nFactor these bonuses into recommendations and max bids.` : ''}
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
${bonusContext ? `\nIMPORTANT - Custom scoring bonuses affect valuations:\n${bonusContext}\nFactor these bonuses into recommendations.` : ''}
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

// --- Resilience: retry + rule-based fallback ---

/** Retry askClaudeJson with short backoff to absorb transient API failures. */
async function askWithRetry<T>(req: ClaudeJsonRequest, retries = 1): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await askClaudeJson<T>(req)
    } catch (err) {
      lastErr = err
      if (attempt < retries) await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
    }
  }
  throw lastErr
}

/** Best-available fallback when the LLM is unavailable or returns unparseable JSON. */
function auctionFallback(body: AuctionRecommendRequest): LLMAuctionRecommendation {
  const targets = body.topAvailable.slice(0, 3).map(p => ({
    name: p.name,
    position: p.position,
    maxBid: Math.max(1, Math.min(body.budgetRemaining, Math.round(p.adjustedValue ?? p.consensusValue ?? 1))),
    reasoning: 'Best available by strategy fit (AI advisor unavailable).',
    confidence: 'low' as const,
  }))
  return { targets, summary: 'AI advisor is temporarily unavailable. Showing the best available by strategy fit and value.' }
}

function snakeFallback(body: SnakeRecommendRequest): LLMSnakeRecommendation {
  const targets = body.topAvailable.slice(0, 3).map(p => ({
    name: p.name,
    position: p.position,
    pickRound: Math.max(1, Math.round(p.adjustedRound ?? body.currentRound ?? 1)),
    reasoning: 'Best available by strategy fit (AI advisor unavailable).',
    confidence: 'low' as const,
  }))
  return { targets, summary: 'AI advisor is temporarily unavailable. Showing the best available by strategy fit.' }
}

// --- Route handler ---

export async function POST(request: Request) {
  let body: RecommendRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.topAvailable || body.topAvailable.length === 0) {
    return NextResponse.json(
      { error: 'No available players provided' },
      { status: 400 },
    )
  }

  const bonusContext = formatScoringBonuses(body.scoringSettings ?? null) ?? ''
  const isAuction = body.format === 'auction'
  const { system, prompt } = isAuction
    ? buildAuctionPrompts(body as AuctionRecommendRequest, bonusContext)
    : buildSnakePrompts(body as SnakeRecommendRequest, bonusContext)

  try {
    // maxTokens lifted from 384 to 600 so a full 3-target JSON is not truncated mid-object.
    // 8s timeout stays under the Vercel 10s ceiling, leaving room to return a fallback.
    const result = await askWithRetry<LLMAuctionRecommendation | LLMSnakeRecommendation>({
      system,
      prompt,
      maxTokens: 600,
      tier: 'fast',
      timeoutMs: 8000,
    })
    return NextResponse.json({ recommendation: result, source: 'llm' })
  } catch (err) {
    // Never 500 the live draft: return a rule-based fallback so the advisor still shows targets.
    console.error('Recommend API error, returning fallback:', err)
    const fallback = isAuction
      ? auctionFallback(body as AuctionRecommendRequest)
      : snakeFallback(body as SnakeRecommendRequest)
    return NextResponse.json({ recommendation: fallback, source: 'fallback' })
  }
}
