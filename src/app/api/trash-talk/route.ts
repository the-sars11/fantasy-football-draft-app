/**
 * POST /api/trash-talk
 *
 * Server-side route handler for AI-generated trash talk lines.
 * Called after trigger detection in the live draft client (wired in FF-310).
 *
 * Fail-silent design: always returns { line: null } on any Claude error.
 * Trash talk is non-critical — this call must never block or break the draft.
 *
 * Model: claude-haiku-4-5-20251001, temperature 1.0, no streaming
 * Family-Safe: max_tokens 60 (≤80 char PG-13 output)
 * Adult-Only:  max_tokens 80 (≤120 char explicit output)
 *
 * Ported from: fantasy_auction_auctioneer/src/app/api/trash-talk/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrashTalkMode = 'family-safe' | 'adult-only'

export interface TrashTalkRequest {
  trigger: string
  playerName: string
  position: string
  espnPprRank: number
  teamName: string
  price: number
  impliedValue: number
  pickNumber: number
  totalPicks: number
  contextString: string
  mode: TrashTalkMode
  historyBlock?: string
}

export interface TrashTalkResponse {
  line: string | null
  error?: string
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const FAMILY_SAFE_SYSTEM = `You are the host of a fantasy football auction draft. After notable draft events, deliver one sharp, funny line for the room to hear.

Rules:
- PG-13 only. Zero profanity. Not even "damn" or "hell."
- No em-dashes. Ever.
- Reference the player name, price, or team name in the line. No generic observations.
- 80 characters or fewer. One sentence.
- Punch at the situation, not the person. The room should laugh, not cringe.
- No filler openers: never start with "Wow", "What a", "Incredible", or "Nice pick."`

const ADULT_ONLY_SYSTEM = `You are the host of a fantasy football auction draft between friends who have been roasting each other for years. After notable draft events, deliver one short, vicious line for the room.

Comedy style: Anthony Jeselnik, Jeffrey Ross, Tony Hinchcliffe, Nikki Glaser. Ice-cold. Deadpan. Specific. The punchline comes from an angle nobody expects, not the obvious one. You state the devastating truth and let it sit. No winking, no hedging, no exclamation points of shock.

Rules:
- Profanity required. At least one real swear word (shit, fuck, ass, bastard, crap, or stronger).
- No em-dashes. Ever.
- Specific numbers always: player name, exact dollar paid, exact over/under amount, or pick number.
- One sentence. 120 characters or fewer. No trailing commentary.
- If historical context is provided, use it only when it makes the line sharper, not just as an obligatory callback.
- Punch at the decision and the money. Not at someone's intelligence, worth, or anything personal.
- If your line sounds like something from an HR-approved roast, scrap it and go harder.`

// ---------------------------------------------------------------------------
// User message builder
// ---------------------------------------------------------------------------

function buildUserMessage(body: TrashTalkRequest): string {
  const charLimit = body.mode === 'family-safe' ? 80 : 120
  const profanity = body.mode === 'family-safe' ? 'PG-13, no profanity' : 'profanity required'

  const lines = [
    `Event: ${body.trigger}`,
    `Player: ${body.playerName} (${body.position}, rank #${body.espnPprRank})`,
    `Team: ${body.teamName}`,
    `Price paid: $${body.price}`,
    `Implied value: ~$${body.impliedValue}`,
    `Pick #${body.pickNumber} of ${body.totalPicks}`,
    `Context: ${body.contextString}`,
  ]

  if (body.historyBlock) {
    lines.push('')
    lines.push(body.historyBlock)
  }

  lines.push('')
  lines.push(`Write one trash talk line (${charLimit} chars or less, ${profanity}, no em-dashes):`)

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse<TrashTalkResponse>> {
  let body: TrashTalkRequest

  try {
    body = (await request.json()) as TrashTalkRequest
  } catch {
    return NextResponse.json({ line: null, error: 'Invalid request body' }, { status: 400 })
  }

  if (body.mode !== 'family-safe' && body.mode !== 'adult-only') {
    return NextResponse.json({ line: null, error: 'Invalid mode' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Fail-silent: missing key means no trash talk, not a broken draft
    return NextResponse.json({ line: null })
  }

  const systemPrompt = body.mode === 'family-safe' ? FAMILY_SAFE_SYSTEM : ADULT_ONLY_SYSTEM
  const userMessage = buildUserMessage(body)
  const maxTokens = body.mode === 'family-safe' ? 60 : 80

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      temperature: 1.0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw =
      response.content[0]?.type === 'text'
        ? response.content[0].text.trim()
        : null

    // Hard-strip em-dashes regardless of prompt compliance — this is the enforcement layer
    const line = raw ? raw.replace(/\u2014/g, '-').replace(/\u2013/g, '-').replace(/--/g, '-') : null

    return NextResponse.json({ line })
  } catch {
    // Fail-silent: Claude errors never surface to the draft UI
    return NextResponse.json({ line: null })
  }
}
