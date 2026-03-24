'use client'

/**
 * useUserRules — React hooks for user rule management (FF-229, FF-231)
 *
 * Provides:
 * - useUserRules: Load and manage user rules
 * - useRulePreview: Preview which players a rule affects
 */

import { useState, useCallback, useEffect } from 'react'
import type { UserRule, ParsedRule } from '@/lib/supabase/database.types'

// --- Types ---

interface UseUserRulesOptions {
  leagueId?: string | null
  activeOnly?: boolean
  includeGlobal?: boolean
  enabled?: boolean
}

interface UseUserRulesResult {
  rules: UserRule[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createRule: (ruleText: string) => Promise<{
    success: boolean
    rule?: UserRule
    interpretation?: string
    confidence?: number
    error?: string
  }>
  updateRule: (id: string, updates: { ruleText?: string; isActive?: boolean }) => Promise<{
    success: boolean
    rule?: UserRule
    error?: string
  }>
  deleteRule: (id: string) => Promise<{ success: boolean; error?: string }>
  toggleRule: (id: string) => Promise<{ success: boolean; isActive?: boolean; error?: string }>
}

interface RulePreviewResult {
  parsedRule: ParsedRule
  interpretation?: string
  confidence: number
  validation: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
  affectedPlayers: Array<{
    id: string
    name: string
    team: string | null
    position: string
    adp: number | null
    modifier: number
  }>
  totalAffected: number
  modifier: number
}

interface UseRulePreviewResult {
  preview: RulePreviewResult | null
  isLoading: boolean
  error: string | null
  previewRule: (ruleText: string) => Promise<void>
  clearPreview: () => void
}

// --- Hooks ---

/**
 * Hook for managing user rules
 */
export function useUserRules({
  leagueId,
  activeOnly = false,
  includeGlobal = true,
  enabled = true,
}: UseUserRulesOptions = {}): UseUserRulesResult {
  const [rules, setRules] = useState<UserRule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    if (!enabled) {
      setRules([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (leagueId) params.set('leagueId', leagueId)
      if (activeOnly) params.set('activeOnly', 'true')
      if (!includeGlobal) params.set('includeGlobal', 'false')

      const response = await fetch(`/api/user-rules?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch rules')
      }

      const data = await response.json()
      setRules(data.rules ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useUserRules] Error:', message)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, leagueId, activeOnly, includeGlobal])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const createRule = useCallback(async (ruleText: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleText,
          leagueId: leagueId ?? null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create rule')
      }

      // Add to local state
      setRules((prev) => [data.rule, ...prev])

      return {
        success: true,
        rule: data.rule,
        interpretation: data.interpretation,
        confidence: data.confidence,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [leagueId])

  const updateRule = useCallback(async (
    id: string,
    updates: { ruleText?: string; isActive?: boolean }
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update rule')
      }

      // Update local state
      setRules((prev) =>
        prev.map((r) => (r.id === id ? data.rule : r))
      )

      return { success: true, rule: data.rule }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteRule = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete rule')
      }

      // Remove from local state
      setRules((prev) => prev.filter((r) => r.id !== id))

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const toggleRule = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/user-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle rule')
      }

      // Update local state
      setRules((prev) =>
        prev.map((r) => (r.id === id ? data.rule : r))
      )

      return { success: true, isActive: data.isActive }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    }
  }, [])

  return {
    rules,
    isLoading,
    error,
    refetch: fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  }
}

/**
 * Hook for previewing rule effects
 */
export function useRulePreview(): UseRulePreviewResult {
  const [preview, setPreview] = useState<RulePreviewResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewRule = useCallback(async (ruleText: string) => {
    if (!ruleText.trim()) {
      setPreview(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user-rules/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleText, limit: 20 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview rule')
      }

      setPreview(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setPreview(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearPreview = useCallback(() => {
    setPreview(null)
    setError(null)
  }, [])

  return {
    preview,
    isLoading,
    error,
    previewRule,
    clearPreview,
  }
}

/**
 * Get example rules for the UI
 */
export function getExampleRules(): Array<{ text: string; description: string }> {
  return [
    { text: 'Avoid all WRs from Dallas', description: 'Penalizes Dallas Cowboys wide receivers' },
    { text: 'Target rookie RBs', description: 'Boosts first-year running backs' },
    { text: 'Boost players with ADP over 100', description: 'Favors late-round picks' },
    { text: 'Avoid players on bye week 7', description: 'Penalizes players with bye in week 7' },
    { text: 'Target WRs and TEs from KC', description: 'Boosts Chiefs pass catchers' },
    { text: 'Avoid injured players', description: 'Penalizes players with injury designation' },
    { text: 'Target players tagged as SLEEPER', description: 'Boosts system-detected sleepers' },
    { text: 'Boost QBs under 28 years old', description: 'Favors younger quarterbacks' },
  ]
}
