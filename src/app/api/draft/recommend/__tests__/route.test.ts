import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/ai/claude', () => ({
  askClaudeJson: vi.fn(),
}))

import { POST } from '../route'
import { askClaudeJson } from '@/lib/ai/claude'

const TOP_AUCTION = [
  { name: 'CMC', position: 'RB', consensusValue: 60, strategyScore: 95 },
  { name: 'Tyreek', position: 'WR', consensusValue: 45, strategyScore: 80 },
  { name: 'JT', position: 'RB', consensusValue: 55, strategyScore: 88 },
]

const TOP_SNAKE = [
  { name: 'CMC', position: 'RB', adp: 1.5, consensusRank: 1, strategyScore: 95 },
  { name: 'Tyreek', position: 'WR', adp: 8.0, consensusRank: 8, strategyScore: 80 },
  { name: 'JT', position: 'RB', adp: 4.0, consensusRank: 4, strategyScore: 88 },
]

const AUCTION_BODY = {
  format: 'auction' as const,
  managerName: 'Alice',
  budgetRemaining: 150,
  budgetTotal: 200,
  rosterNeeds: { RB: 1 },
  picksMade: 2,
  totalSlots: 15,
  recentPicks: [],
  topAvailable: TOP_AUCTION,
}

const SNAKE_BODY = {
  format: 'snake' as const,
  managerName: 'Alice',
  currentRound: 3,
  rosterNeeds: { RB: 1 },
  picksMade: 2,
  totalSlots: 15,
  recentPicks: [],
  topAvailable: TOP_SNAKE,
}

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/draft/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/draft/recommend - fallback on LLM error (never 500s the draft)', () => {
  beforeEach(() => {
    vi.mocked(askClaudeJson).mockRejectedValue(new Error('API key missing'))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with source:fallback for auction when LLM fails', async () => {
    const res = await POST(makeRequest(AUCTION_BODY))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('fallback')
    expect(Array.isArray(json.recommendation.targets)).toBe(true)
    expect(json.recommendation.targets.length).toBeGreaterThan(0)
  })

  it('returns 200 with source:fallback for snake when LLM fails', async () => {
    const res = await POST(makeRequest(SNAKE_BODY))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('fallback')
    expect(Array.isArray(json.recommendation.targets)).toBe(true)
  })

  it('fallback auction targets have maxBid within budgetRemaining', async () => {
    const res = await POST(makeRequest(AUCTION_BODY))
    const json = await res.json()
    const targets = json.recommendation.targets as Array<{ maxBid: number }>
    targets.forEach(t => {
      expect(t.maxBid).toBeGreaterThanOrEqual(1)
      expect(t.maxBid).toBeLessThanOrEqual(AUCTION_BODY.budgetRemaining)
    })
  })

  it('fallback snake targets have a summary string', async () => {
    const res = await POST(makeRequest(SNAKE_BODY))
    const json = await res.json()
    expect(typeof json.recommendation.summary).toBe('string')
    expect(json.recommendation.summary.length).toBeGreaterThan(0)
  })
})

describe('POST /api/draft/recommend - validation', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when topAvailable is empty', async () => {
    const res = await POST(makeRequest({ ...AUCTION_BODY, topAvailable: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 on malformed JSON body', async () => {
    const req = new Request('http://localhost/api/draft/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/draft/recommend - LLM success path', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns source:llm and passes through the recommendation on success', async () => {
    const mockRec = {
      targets: [{ name: 'CMC', position: 'RB', maxBid: 60, reasoning: 'Top RB', confidence: 'high' }],
      summary: 'Get CMC now.',
    }
    vi.mocked(askClaudeJson).mockResolvedValue(mockRec)

    const res = await POST(makeRequest(AUCTION_BODY))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('llm')
    expect(json.recommendation.targets[0].name).toBe('CMC')
    expect(json.recommendation.summary).toBe('Get CMC now.')
  })
})
