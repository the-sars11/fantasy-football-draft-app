import { describe, it, expect } from 'vitest'
import { assertNoRetiredModelIds, RETIRED_MODEL_IDS, type ModelTier } from './claude'

describe('assertNoRetiredModelIds (RV-2 self-check)', () => {
  it('throws when a tier points at a known-retired model id', () => {
    const badMap: Record<ModelTier, string> = {
      fast: 'claude-haiku-4-5-20251001',
      default: 'claude-sonnet-4-20250514',
      best: 'claude-opus-5',
    }
    expect(() => assertNoRetiredModelIds(badMap)).toThrow(/retired/i)
  })

  it('does not throw when every tier points at a live model id', () => {
    const goodMap: Record<ModelTier, string> = {
      fast: 'claude-haiku-4-5-20251001',
      default: 'claude-sonnet-5',
      best: 'claude-opus-5',
    }
    expect(() => assertNoRetiredModelIds(goodMap)).not.toThrow()
  })

  it('the real MODEL_MAP in this module imports cleanly (self-check passed at load time)', async () => {
    await expect(import('./claude')).resolves.toBeDefined()
  })

  it('RETIRED_MODEL_IDS still contains the exact id that caused the RV-2 incident', () => {
    expect(RETIRED_MODEL_IDS.has('claude-sonnet-4-20250514')).toBe(true)
  })
})
