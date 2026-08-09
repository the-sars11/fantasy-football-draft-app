'use client'

/**
 * useDraftReviewData (extracted from review/client.tsx, finding 9)
 *
 * Owns all data loading and derived analysis for the post-draft review screen:
 * session list + selection, the selected session's detail (league, strategy,
 * players), user tags, and the memoized draft review / roast / tag-accuracy
 * reports. UI-only state (expanded pick, view mode, copy feedback) stays in the
 * component. Behavior identical to the original inline implementation.
 */

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUserTags } from '@/hooks/use-user-tags'
import { analyzeDraft, type DraftReview } from '@/lib/draft/review'
import { generateRoastReport } from '@/lib/draft/trash-talk'
import type { DraftPick } from '@/lib/draft/state'
import type { DraftSession, League, Strategy, RosterSlots } from '@/lib/supabase/database.types'
import type { Player } from '@/lib/players/types'

export function useDraftReviewData() {
  const searchParams = useSearchParams()
  const paramSessionId = searchParams.get('session')

  const [sessions, setSessions] = useState<DraftSession[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [session, setSession] = useState<DraftSession | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [managerName, setManagerName] = useState<string>('')

  const playerCacheIds = useMemo(() => players.map(p => p.id), [players])
  const { userTagsMap } = useUserTags({
    playerCacheIds,
    leagueId: league?.id,
    includeGlobal: true,
    enabled: players.length > 0,
  })

  const tagAccuracyAnalysis = useMemo(() => {
    if (!session || !managerName || Object.keys(userTagsMap).length === 0 || players.length === 0) {
      return null
    }
    const myPicks = (session.picks || []).filter(p => p.manager === managerName)
    const draftedNames = new Set(myPicks.map(p => p.player_id?.toLowerCase()))
    const nameToIdMap: Record<string, string> = {}
    for (const player of players) {
      nameToIdMap[player.name.toLowerCase()] = player.id
    }
    const targetPlayers: Array<{ name: string; id: string; drafted: boolean }> = []
    const avoidPlayers: Array<{ name: string; id: string; drafted: boolean }> = []
    for (const [playerId, tagData] of Object.entries(userTagsMap)) {
      const player = players.find(p => p.id === playerId)
      if (!player) continue
      const isDrafted = draftedNames.has(player.name.toLowerCase())
      if (tagData.tags.includes('target')) targetPlayers.push({ name: player.name, id: playerId, drafted: isDrafted })
      if (tagData.tags.includes('avoid')) avoidPlayers.push({ name: player.name, id: playerId, drafted: isDrafted })
    }
    const targetsHit = targetPlayers.filter(p => p.drafted)
    const targetsMissed = targetPlayers.filter(p => !p.drafted)
    const avoidsSuccessful = avoidPlayers.filter(p => !p.drafted)
    const avoidsViolated = avoidPlayers.filter(p => p.drafted)
    const hitRate = targetPlayers.length > 0 ? Math.round((targetsHit.length / targetPlayers.length) * 100) : 0
    const avoidRate = avoidPlayers.length > 0 ? Math.round((avoidsSuccessful.length / avoidPlayers.length) * 100) : 0
    return { targetsHit, targetsMissed, avoidsSuccessful, avoidsViolated, totalTargets: targetPlayers.length, totalAvoids: avoidPlayers.length, hitRate, avoidRate }
  }, [session, managerName, userTagsMap, players])

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/draft/sessions')
        if (!res.ok) throw new Error('Failed to load sessions')
        const data = await res.json()
        const completed = (data.sessions || []).filter(
          (s: DraftSession) => s.picks && s.picks.length > 0
        )
        setSessions(completed)
        // URL param takes priority (navigated from live room); fall back to most recent.
        if (paramSessionId) {
          setSelectedId(paramSessionId)
        } else if (completed.length > 0) {
          setSelectedId(completed[0].id)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    async function loadSession() {
      setDetailLoading(true)
      try {
        const [sessionRes, playersRes] = await Promise.all([
          fetch(`/api/draft/sessions/${selectedId}`),
          fetch('/api/players?limit=500'),
        ])
        if (!sessionRes.ok) throw new Error('Failed to load session')
        const data = await sessionRes.json()
        if (cancelled) return
        setSession(data.session)
        setLeague(data.league)
        if (playersRes.ok) {
          const playersData = await playersRes.json()
          setPlayers(playersData.players || [])
        }
        if (data.session?.managers?.length > 0) setManagerName(data.session.managers[0].name)
        if (data.league?.id) {
          const stratRes = await fetch(`/api/strategies?leagueId=${data.league.id}`)
          if (stratRes.ok && !cancelled) {
            const stratData = await stratRes.json()
            const active = (stratData.strategies ?? []).find((s: Strategy) => s.is_active) ?? null
            setStrategy(active)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load session')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }
    loadSession()
    return () => { cancelled = true }
  }, [selectedId])

  const roastReport = useMemo(() => {
    if (!session) return null
    const draftPicks: DraftPick[] = (session.picks || []).map(p => ({
      pick_number: p.pick_number,
      player_name: p.player_id,
      position: undefined,
      manager: p.manager,
      price: p.price,
      round: p.round,
    }))
    return generateRoastReport(draftPicks, [], session.managers.map(m => m.name), session.format, session.managers.length)
  }, [session])

  const review = useMemo<DraftReview | null>(() => {
    if (!session || !managerName) return null
    const rosterSlots: RosterSlots = league?.roster_slots || {
      qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, dst: 1, bench: 6, ir: 0,
    }
    const draftPicks: DraftPick[] = (session.picks || []).map(p => ({
      pick_number: p.pick_number,
      player_name: p.player_id,
      position: undefined,
      manager: p.manager,
      price: p.price,
      round: p.round,
    }))
    return analyzeDraft(draftPicks, managerName, strategy, rosterSlots, session.format, league?.budget ?? undefined)
  }, [session, managerName, strategy, league])

  return {
    paramSessionId,
    sessions,
    selectedId,
    setSelectedId,
    session,
    league,
    strategy,
    players,
    loading,
    detailLoading,
    error,
    managerName,
    setManagerName,
    tagAccuracyAnalysis,
    roastReport,
    review,
  }
}
