/**
 * Claude API Client (FF-S03)
 *
 * Thin wrapper around the Anthropic SDK for structured JSON responses.
 * All LLM calls in this app go through here.
 */

import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

/** Available model tiers */
export type ModelTier = 'fast' | 'default' | 'best'

const MODEL_MAP: Record<ModelTier, string> = {
  fast: 'claude-haiku-4-5-20251001',      // Fastest, cheapest — good for live draft recommendations
  default: 'claude-sonnet-4-20250514',     // Balanced — research analysis, strategy proposals
  best: 'claude-sonnet-4-20250514',        // Best quality — same as default for now
}

export interface ClaudeJsonRequest {
  system: string
  prompt: string
  maxTokens?: number
  /** Model tier: 'fast' for live draft, 'default' for analysis (default: 'default') */
  tier?: ModelTier
  /**
   * Cache the system prompt across calls (Anthropic prompt caching). Default true.
   * Repeated league/scoring context is billed once and reused, which the live draft
   * loop relies on for cost control. Has no effect below the model's minimum cache size.
   */
  cacheSystem?: boolean
  /** Per-request timeout in ms. The SDK aborts the call if exceeded. */
  timeoutMs?: number
}

/**
 * Send a prompt to Claude and parse the response as JSON.
 * Uses prefilled assistant turn with `{` to force JSON output.
 */
export async function askClaudeJson<T>(req: ClaudeJsonRequest): Promise<T> {
  const anthropic = getClient()
  const model = MODEL_MAP[req.tier ?? 'default']

  // Mark the system prompt cacheable by default so repeated league context is not re-billed.
  const system = req.cacheSystem === false
    ? req.system
    : [{ type: 'text' as const, text: req.system, cache_control: { type: 'ephemeral' as const } }]

  const response = await anthropic.messages.create(
    {
      model,
      max_tokens: req.maxTokens ?? 4096,
      system,
      messages: [
        { role: 'user', content: req.prompt },
        { role: 'assistant', content: '{' },
      ],
    },
    req.timeoutMs ? { timeout: req.timeoutMs } : undefined,
  )

  // Find the first text block defensively: a tool/refusal block or empty content would
  // otherwise throw on response.content[0].
  const textBlock = response.content.find(b => b.type === 'text')
  const text = '{' + (textBlock && textBlock.type === 'text' ? textBlock.text : '')

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${text.slice(0, 200)}...`)
  }
}
