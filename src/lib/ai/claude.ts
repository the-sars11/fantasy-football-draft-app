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

export interface ClaudeJsonRequest {
  system: string
  prompt: string
  maxTokens?: number
}

/**
 * Send a prompt to Claude and parse the response as JSON.
 * Uses prefilled assistant turn with `{` to force JSON output.
 */
export async function askClaudeJson<T>(req: ClaudeJsonRequest): Promise<T> {
  const anthropic = getClient()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: req.maxTokens ?? 4096,
    system: req.system,
    messages: [
      { role: 'user', content: req.prompt },
      { role: 'assistant', content: '{' },
    ],
  })

  const text = '{' + (response.content[0].type === 'text' ? response.content[0].text : '')

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${text.slice(0, 200)}...`)
  }
}
