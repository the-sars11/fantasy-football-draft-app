'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  AlertCircle,
  Trophy,
  Flame,
  Target,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  Hash,
  ArrowRight,
  Download,
  Copy,
  CheckCheck,
  Sparkles,
  Zap,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FFICard,
  FFIButton,
  FFIPositionBadge,
  FFIGrade,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'
import { FFIFadeInUp, FFICelebration, FFIConfettiBurst } from '@/components/ui/ffi-motion'
import { useHaptic } from '@/hooks/use-haptic'
import { useSound } from '@/lib/sound/use-sound'
import { TeamReports } from '@/components/draft/team-reports'
import { RoastReportCard } from '@/components/draft/trash-talk'
import { useUserTags } from '@/hooks/use-user-tags'
import { analyzeDraft, type DraftReview, type PickAnalysis, type PickVerdict } from '@/lib/draft/review'
import { generateRoastReport } from '@/lib/draft/trash-talk'
import { picksToCSV, reviewToShareText, downloadCSV, copyToClipboard } from '@/lib/draft/export'
import type { DraftPick } from '@/lib/draft/state'
import type { DraftSession, League, Strategy, RosterSlots } from '@/lib/supabase/database.types'
import type { Player } from '@/lib/players/types'

type ViewMode = 'my-draft' | 'all-teams' | 'trash-talk'

// Grade color map — volt for A, blue for B/C, warning for D, danger for F. No gold.
const gradeColors: Record<string, {
  letter: string; borderColor: string; glow: string; blob: string; verdictColor: string
}> = {
  A: {
    letter: 'var(--ffi-volt)',
    borderColor: 'rgba(139,255,69,0.38)',
    glow: '0 0 44px rgba(139,255,69,0.32), 0 0 80px rgba(139,255,69,0.12)',
    blob: 'rgba(139,255,69,0.20)',
    verdictColor: 'var(--ffi-volt)',
  },
  B: {
    letter: 'var(--ffi-blue-bright)',
    borderColor: 'rgba(77,130,255,0.38)',
    glow: '0 0 40px rgba(77,130,255,0.30)',
    blob: 'rgba(77,130,255,0.18)',
    verdictColor: 'var(--ffi-blue-bright)',
  },
  C: {
    letter: 'var(--ffi-warning)',
    borderColor: 'rgba(255,176,92,0.30)',
    glow: '0 0 36px rgba(255,176,92,0.22)',
    blob: 'rgba(255,176,92,0.10)',
    verdictColor: 'var(--ffi-warning)',
  },
  D: {
    letter: 'var(--ffi-warning)',
    borderColor: 'rgba(255,176,92,0.22)',
    glow: '0 0 28px rgba(255,176,92,0.16)',
    blob: 'rgba(255,176,92,0.07)',
    verdictColor: 'var(--ffi-warning)',
  },
  F: {
    letter: 'var(--ffi-danger)',
    borderColor: 'rgba(255,110,138,0.38)',
    glow: '0 0 40px rgba(255,110,138,0.30)',
    blob: 'rgba(255,110,138,0.14)',
    verdictColor: 'var(--ffi-danger)',
  },
}

// Verdict badge styling — GRIDIRON palette
const verdictConfig: Record<PickVerdict, {
  label: string
  bg: string
  border: string
  color: string
  icon: typeof Sparkles
}> = {
  steal: {
    label: 'STEAL',
    bg: 'rgba(139,255,69,0.12)',
    border: 'rgba(139,255,69,0.28)',
    color: 'var(--ffi-volt)',
    icon: Sparkles,
  },
  reach: {
    label: 'REACH',
    bg: 'rgba(255,110,138,0.10)',
    border: 'rgba(255,110,138,0.24)',
    color: 'var(--ffi-danger)',
    icon: AlertTriangle,
  },
  fair: {
    label: 'FAIR VALUE',
    bg: 'rgba(77,130,255,0.10)',
    border: 'rgba(77,130,255,0.22)',
    color: 'var(--ffi-blue-bright)',
    icon: Check,
  },
  ai_pivot: {
    label: 'AI PIVOT',
    bg: 'rgba(167,139,250,0.10)',
    border: 'rgba(167,139,250,0.22)',
    color: '#a78bfa',
    icon: Zap,
  },
}

// Champion verdict word per grade
const gradeVerdict: Record<string, string> = {
  A: 'ELITE DRAFT',
  B: 'STRONG BOARD',
  C: 'SOLID WORK',
  D: 'ROOM TO RUN',
  F: 'REBUILD MODE',
}

export function ReviewClient() {
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
  const [copied, setCopied] = useState(false)
  const [expandedPick, setExpandedPick] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('my-draft')

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
        if (completed.length > 0) setSelectedId(completed[0].id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
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

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--ffi-blue)]" />
        <span className="ffi-label text-[var(--ffi-ink-3)] ml-3">Loading sessions...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ffi-card border-l-4" style={{ borderLeftColor: 'var(--ffi-danger)' }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" color="var(--ffi-danger)" />
          <div>
            <p className="font-headline font-bold text-white">Error Loading Draft</p>
            <p className="ffi-body-md text-[var(--ffi-ink-3)] mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="ffi-card text-center py-12">
        <Trophy className="h-10 w-10 mx-auto mb-4" color="var(--ffi-ink-3)" />
        <p className="font-headline font-bold text-lg text-white mb-2">No Drafts to Review</p>
        <p className="ffi-body-md text-[var(--ffi-ink-3)] max-w-xs mx-auto">
          Complete a live draft first, then come back here to see your grades and analysis.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Session + Manager selectors */}
      <div className="ffi-card p-3">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <p className="ffi-caption text-[var(--ffi-ink-3)] mb-1.5">SELECT DRAFT</p>
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="ffi-input w-full text-sm"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.format === 'auction' ? 'Auction' : 'Snake'} &middot; {s.picks.length} picks &middot; {new Date(s.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          {session && session.managers.length > 0 && viewMode === 'my-draft' && (
            <div className="flex-1 min-w-[140px]">
              <p className="ffi-caption text-[var(--ffi-ink-3)] mb-1.5">SELECT MANAGER</p>
              <select
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="ffi-input w-full text-sm"
              >
                {session.managers.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* View Tabs */}
        {session && (
          <div
            className="flex gap-1 mt-3 rounded-xl p-1"
            style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}
          >
            {(['my-draft', 'all-teams', 'trash-talk'] as ViewMode[]).map((mode) => {
              const isActive = viewMode === mode
              const label = mode === 'my-draft' ? 'My Draft' : mode === 'all-teams' ? 'All Teams' : 'Trash Talk'
              const activeStyle = mode === 'trash-talk'
                ? { background: 'var(--ffi-danger)', boxShadow: '0 4px 14px -4px rgba(255,110,138,0.4)' }
                : { background: 'var(--ffi-blue)', boxShadow: '0 4px 14px -4px rgba(77,130,255,0.5)' }
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg transition-all"
                  style={isActive ? activeStyle : {}}
                >
                  {mode === 'trash-talk' && (
                    <Flame className="h-3.5 w-3.5" color={isActive ? '#fff' : 'var(--ffi-ink-3)'} />
                  )}
                  <span
                    className="ffi-label"
                    style={{ color: isActive ? '#fff' : 'var(--ffi-ink-3)', letterSpacing: '.12em' }}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {detailLoading && (
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" color="var(--ffi-blue)" />
          <span className="ffi-label text-[var(--ffi-ink-3)]">Analyzing draft...</span>
        </div>
      )}

      {/* All Teams */}
      {session && !detailLoading && viewMode === 'all-teams' && (
        <TeamReports
          picks={(session.picks || []).map(p => ({
            pick_number: p.pick_number, player_name: p.player_id, position: undefined,
            manager: p.manager, price: p.price, round: p.round,
          }))}
          managers={session.managers.map(m => m.name)}
          format={session.format}
          budget={league?.budget ?? undefined}
        />
      )}

      {/* Trash Talk */}
      {session && !detailLoading && viewMode === 'trash-talk' && roastReport && (
        <FFIFadeInUp>
          <RoastReportCard report={roastReport} />
        </FFIFadeInUp>
      )}

      {/* My Draft */}
      {review && !detailLoading && viewMode === 'my-draft' && (
        <FFIFadeInUp>
          <div className="space-y-3">
            <GradeHero
              review={review}
              managerName={managerName}
              strategyName={strategy?.name}
              onExportCSV={() => {
                if (!session) return
                const draftPicks: DraftPick[] = (session.picks || []).map(p => ({
                  pick_number: p.pick_number, player_name: p.player_id,
                  manager: p.manager, price: p.price, round: p.round,
                }))
                const csv = picksToCSV(draftPicks, session.format)
                const date = new Date(session.created_at).toISOString().split('T')[0]
                downloadCSV(csv, `draft-${date}.csv`)
              }}
              onShare={async () => {
                const text = reviewToShareText(review, managerName, session!.format, strategy?.name)
                const ok = await copyToClipboard(text)
                if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
              }}
              copied={copied}
            />

            {/* Quick Stats 2x2 */}
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                label="STEALS"
                value={review.stealCount}
                icon={<Sparkles className="h-3.5 w-3.5" color="var(--ffi-volt)" />}
                valueColor={review.stealCount > 0 ? 'var(--ffi-volt)' : 'var(--ffi-ink-2)'}
                accentBorder={review.stealCount > 0 ? 'rgba(139,255,69,0.22)' : undefined}
              />
              <StatTile
                label="REACHES"
                value={review.reachCount}
                icon={<AlertTriangle className="h-3.5 w-3.5" color="var(--ffi-danger)" />}
                valueColor={review.reachCount > 0 ? 'var(--ffi-danger)' : 'var(--ffi-ink-2)'}
                accentBorder={review.reachCount > 0 ? 'rgba(255,110,138,0.22)' : undefined}
              />
              <StatTile
                label="TARGETS HIT"
                value={review.targetResults.filter(t => t.status === 'hit').length}
                icon={<Target className="h-3.5 w-3.5" color="var(--ffi-blue)" />}
                valueColor="var(--ffi-blue-bright)"
              />
              <StatTile
                label="TOTAL PICKS"
                value={review.pickAnalysis.length}
                icon={<Hash className="h-3.5 w-3.5" color="var(--ffi-ink-3)" />}
                valueColor="var(--ffi-ink-2)"
              />
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-2">
              <SwCard
                title="Strengths"
                type="wins"
                items={review.strengths}
                emptyText="No standout strengths"
              />
              <SwCard
                title="Watch"
                type="risks"
                items={review.weaknesses}
                emptyText="No major weaknesses"
              />
            </div>

            {/* Pick-by-Pick */}
            <div>
              <SectHeader title="Pick by Pick" />
              <div className="space-y-1">
                {review.pickAnalysis.map((pick, index) => (
                  <PickCard
                    key={pick.pickNumber}
                    pick={pick}
                    format={session!.format}
                    index={index}
                    expanded={expandedPick === pick.pickNumber}
                    onToggle={() => setExpandedPick(expandedPick === pick.pickNumber ? null : pick.pickNumber)}
                  />
                ))}
              </div>
            </div>

            {/* Positional Power Rankings */}
            {review.positionGrades.length > 0 && (
              <div>
                <SectHeader title="Position Grades" />
                <PositionalPowerRankings grades={review.positionGrades} />
              </div>
            )}

            {/* Tag Accuracy */}
            {tagAccuracyAnalysis && (tagAccuracyAnalysis.totalTargets > 0 || tagAccuracyAnalysis.totalAvoids > 0) && (
              <TagAccuracyCard analysis={tagAccuracyAnalysis} />
            )}

            {/* Strategy Targets */}
            {review.targetResults.length > 0 && (
              <div className="ffi-card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="ffi-caption text-[var(--ffi-ink-3)]">STRATEGY TARGETS</span>
                  <Target className="h-3.5 w-3.5" color="var(--ffi-blue)" />
                </div>
                <div className="space-y-0.5">
                  {review.targetResults.map((tr, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[var(--ffi-surface-3)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        {tr.status === 'hit' && <Check className="h-4 w-4" color="var(--ffi-volt)" />}
                        {tr.status === 'missed' && <X className="h-4 w-4" color="var(--ffi-danger)" />}
                        {tr.status === 'avoided_success' && <ShieldCheck className="h-4 w-4" color="var(--ffi-volt)" />}
                        {tr.status === 'avoided_fail' && <ShieldAlert className="h-4 w-4" color="var(--ffi-danger)" />}
                        <span className="font-headline font-bold text-sm text-white">{tr.playerName}</span>
                      </div>
                      <span className="ffi-body-md text-[var(--ffi-ink-3)]">{tr.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budget Analysis */}
            {review.budgetAnalysis && <BudgetAnalysisCard analysis={review.budgetAnalysis} />}

            {/* Snake Analysis */}
            {review.snakeAnalysis && <SnakeAnalysisCard analysis={review.snakeAnalysis} />}
          </div>
        </FFIFadeInUp>
      )}
    </div>
  )
}

// --- Sub-components ---

function GradeHero({
  review, managerName, strategyName, onExportCSV, onShare, copied,
}: {
  review: DraftReview
  managerName: string
  strategyName?: string
  onExportCSV: () => void
  onShare: () => void
  copied: boolean
}) {
  const letter = review.overallGrade.charAt(0)
  const colors = gradeColors[letter] ?? gradeColors['C']
  const verdict = gradeVerdict[letter] ?? ''
  const isChampion = letter === 'A' || letter === 'B'
  const haptic = useHaptic()
  const { play } = useSound()
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (!isChampion) return
    const t = setTimeout(() => {
      setCelebrate(true)
      haptic('champion')
      play('champion')
    }, 350)
    return () => clearTimeout(t)
  }, [isChampion, haptic, play])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="ffi-hero p-6"
    >
      {/* Atmosphere blob */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
          width: 260, height: 200, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% 30%, ${colors.blob}, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Celebration burst */}
        <div className="relative">
          <FFICelebration show={celebrate} tone="gold" className="absolute inset-0">
            <span className="sr-only">Draft graded</span>
          </FFICelebration>
          <FFIConfettiBurst show={celebrate} />

          {/* Verdict label above ring */}
          {verdict && (
            <p className="ffi-caption mb-3" style={{ letterSpacing: '.38em', color: colors.verdictColor }}>
              {verdict}
            </p>
          )}

          {/* Grade ring */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24, delay: 0.18 }}
            style={{
              width: 112, height: 112,
              borderRadius: 20,
              background: 'var(--ffi-surface-3)',
              border: `2px solid ${colors.borderColor}`,
              boxShadow: colors.glow,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            <span
              className="font-display"
              style={{ fontSize: 68, lineHeight: 1, color: colors.letter }}
            >
              {letter}
            </span>
          </motion.div>
        </div>

        {/* Score */}
        <div className="flex items-baseline gap-1.5 mt-4 mb-1">
          <span
            className="font-mono font-bold"
            style={{ fontSize: 30, lineHeight: 1, color: colors.letter }}
          >
            {review.overallScore}
          </span>
          <span className="ffi-caption text-[var(--ffi-ink-3)]">/ 100</span>
        </div>

        {/* Summary */}
        <p className="font-headline font-bold text-lg text-white mb-1">{review.summary}</p>
        <p className="ffi-body-md text-[var(--ffi-ink-3)] mb-1">
          {managerName}&apos;s draft{strategyName && <> &middot; &ldquo;{strategyName}&rdquo;</>}
        </p>
        {review.pivotImpact && (
          <p className="ffi-body-md text-[var(--ffi-ink-3)] flex items-center gap-1.5 mb-3">
            <ArrowRight className="h-3.5 w-3.5" color="var(--ffi-blue)" />
            {review.pivotImpact}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 w-full">
          <button
            onClick={onExportCSV}
            className="flex-1 flex items-center justify-center gap-2 min-h-[42px] rounded-xl ffi-label"
            style={{
              background: 'var(--ffi-surface-3)',
              border: '1px solid var(--ffi-hairline)',
              color: 'var(--ffi-ink-2)',
              letterSpacing: '.12em',
            }}
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 min-h-[42px] rounded-xl ffi-label"
            style={{
              background: 'var(--ffi-surface-3)',
              border: '1px solid var(--ffi-hairline)',
              color: copied ? 'var(--ffi-volt)' : 'var(--ffi-ink-2)',
              letterSpacing: '.12em',
            }}
          >
            {copied
              ? <><CheckCheck className="h-4 w-4" />Copied!</>
              : <><Copy className="h-4 w-4" />Share</>
            }
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function StatTile({
  label, value, icon, valueColor, accentBorder,
}: {
  label: string
  value: number
  icon: React.ReactNode
  valueColor: string
  accentBorder?: string
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--ffi-surface-2)',
        border: `1px solid ${accentBorder ?? 'var(--ffi-hairline)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.36)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="ffi-caption text-[var(--ffi-ink-3)]">{label}</span>
      </div>
      <span
        className="font-mono font-bold"
        style={{ fontSize: 36, lineHeight: 1, color: valueColor }}
      >
        {value}
      </span>
    </div>
  )
}

function SwCard({ title, type, items, emptyText }: {
  title: string
  type: 'wins' | 'risks'
  items: string[]
  emptyText: string
}) {
  const dotColor = type === 'wins' ? 'var(--ffi-volt)' : 'var(--ffi-warning)'
  const headColor = type === 'wins' ? 'var(--ffi-volt)' : 'var(--ffi-warning)'
  const Icon = type === 'wins' ? TrendingUp : TrendingDown

  return (
    <div className="ffi-card">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-3.5 w-3.5" color={headColor} />
        <span className="ffi-caption" style={{ color: headColor, letterSpacing: '.22em' }}>{title.toUpperCase()}</span>
      </div>
      {items.length === 0 ? (
        <p className="ffi-body-md text-[var(--ffi-ink-3)]">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="mt-[5px] shrink-0 rounded-full"
                style={{ width: 5, height: 5, background: dotColor }}
              />
              <span className="ffi-body-md text-[var(--ffi-ink-2)] leading-snug">{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SectHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-2 mt-1">
      <span className="ffi-caption text-[var(--ffi-ink-3)]">{title.toUpperCase()}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--ffi-hairline)' }} />
    </div>
  )
}

function PickCard({ pick, format, index, expanded, onToggle }: {
  pick: PickAnalysis
  format: 'auction' | 'snake'
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const vc = verdictConfig[pick.verdict]
  const VerdictIcon = vc.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.22 }}
    >
      <div
        className="ffi-card-interactive"
        style={{ borderRadius: expanded ? '14px 14px 0 0' : 14, borderBottomColor: expanded ? 'transparent' : undefined }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {/* Pick number */}
          <div className="text-center shrink-0 w-10">
            <p className="ffi-caption text-[var(--ffi-ink-3)]">
              {format === 'snake' && pick.round ? `RD ${pick.round}` : 'PICK'}
            </p>
            <p className="font-mono font-bold text-sm text-[var(--ffi-ink-2)]">#{pick.pickNumber}</p>
          </div>

          {/* Divider */}
          <div className="w-px h-8 shrink-0" style={{ background: 'var(--ffi-hairline)' }} />

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <p className="font-headline font-bold text-[15px] text-white truncate mb-0.5">{pick.playerName}</p>
            <div className="flex items-center gap-2">
              <FFIPositionBadge position={pick.position as any} className="text-[10px] px-1.5 py-0.5" />
              {format === 'auction' && pick.price != null && (
                <span className="font-mono text-xs text-[var(--ffi-ink-3)]">${pick.price}</span>
              )}
              {pick.adpValue != null && (
                <span
                  className="font-mono font-bold text-xs"
                  style={{ color: pick.adpValue > 0 ? 'var(--ffi-volt)' : 'var(--ffi-danger)' }}
                >
                  {pick.adpValue > 0 ? '+' : ''}{pick.adpValue}
                </span>
              )}
            </div>
          </div>

          {/* Verdict badge */}
          <div
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full ffi-caption"
            style={{
              background: vc.bg,
              border: `1px solid ${vc.border}`,
              color: vc.color,
              fontSize: 9,
              letterSpacing: '.18em',
            }}
          >
            <VerdictIcon className="h-2.5 w-2.5" />
            {vc.label}
          </div>
        </div>
      </div>

      {/* Expanded narrative */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-3 rounded-b-[14px]"
              style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)', borderTop: 'none' }}
            >
              <p className="ffi-body-md text-[var(--ffi-ink-2)] leading-relaxed">{pick.narrative}</p>
              {!pick.strategyAlignment && (
                <p className="ffi-body-md mt-2 flex items-center gap-1.5" style={{ color: 'var(--ffi-warning)' }}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Deviated from strategy at this pick
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function PositionalPowerRankings({ grades }: { grades: DraftReview['positionGrades'] }) {
  const SEGMENTS = 10
  const positionNames: Record<string, string> = {
    QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver',
    TE: 'Tight End', K: 'Kicker', DEF: 'Defense',
  }

  function segColor(score: number, filled: boolean) {
    if (!filled) return 'var(--ffi-surface-3)'
    if (score >= 80) return 'var(--ffi-volt)'
    if (score >= 50) return 'var(--ffi-blue)'
    return 'var(--ffi-danger)'
  }

  function scoreColor(score: number) {
    if (score >= 80) return 'var(--ffi-volt)'
    if (score >= 50) return 'var(--ffi-blue-bright)'
    return 'var(--ffi-danger)'
  }

  return (
    <div className="ffi-card space-y-5">
      {grades.map(grade => {
        const filledCount = Math.round(grade.score / 10)
        return (
          <div key={grade.position}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-headline font-bold text-sm text-white">
                {positionNames[grade.position] || grade.position}
              </span>
              <span className="font-mono font-bold text-sm" style={{ color: scoreColor(grade.score) }}>
                {grade.score}
              </span>
            </div>
            <div className="flex gap-[3px]">
              {Array.from({ length: SEGMENTS }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-sm"
                  style={{ background: segColor(grade.score, i < filledCount) }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BudgetAnalysisCard({ analysis }: { analysis: NonNullable<DraftReview['budgetAnalysis']> }) {
  return (
    <div className="ffi-card">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="h-3.5 w-3.5" color="var(--ffi-blue)" />
        <span className="ffi-caption text-[var(--ffi-ink-3)]">BUDGET ANALYSIS</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <MiniStat label="SPENT" value={`$${analysis.totalSpent}`} />
        <MiniStat label="REMAINING" value={`$${analysis.remaining}`} />
        <MiniStat label="AVG PRICE" value={`$${analysis.avgPrice}`} />
        <MiniStat label="HIGHEST" value={`$${analysis.highestPick.price}`} sub={analysis.highestPick.name} />
      </div>
      {analysis.allocationVsPlan.length > 0 && (
        <div className="pt-3 border-t border-[var(--ffi-hairline)]">
          <p className="ffi-caption text-[var(--ffi-ink-3)] mb-3">BUDGET VS. PLAN</p>
          <div className="space-y-2">
            {analysis.allocationVsPlan.map(a => (
              <div key={a.position} className="flex items-center gap-3">
                <FFIPositionBadge position={a.position as any} className="text-[10px] px-1.5 w-10" />
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ffi-surface-3)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, a.actual)}%`,
                      background: 'linear-gradient(90deg, var(--ffi-blue) 0%, var(--ffi-volt) 100%)',
                    }}
                  />
                </div>
                <span className="font-mono text-xs text-[var(--ffi-ink-3)] w-20 text-right">
                  {a.actual}% / {a.planned}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SnakeAnalysisCard({ analysis }: { analysis: NonNullable<DraftReview['snakeAnalysis']> }) {
  return (
    <div className="ffi-card">
      <div className="flex items-center gap-2 mb-3">
        <Hash className="h-3.5 w-3.5" color="var(--ffi-blue)" />
        <span className="ffi-caption text-[var(--ffi-ink-3)]">DRAFT ORDER ANALYSIS</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniStat label="TOTAL PICKS" value={String(analysis.totalPicks)} />
        <MiniStat label="ROUNDS" value={String(analysis.totalRounds)} />
        <MiniStat label="FIRST PICK" value={`Rd ${analysis.earliestPick.round}`} sub={analysis.earliestPick.name} />
      </div>
      <div className="pt-3 border-t border-[var(--ffi-hairline)]">
        <p className="ffi-caption text-[var(--ffi-ink-3)] mb-2">ROUND BY ROUND</p>
        <div className="space-y-1">
          {analysis.positionByRound.map((p, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <span className="font-mono text-xs text-[var(--ffi-ink-3)] w-12">Rd {p.round}</span>
              <FFIPositionBadge position={p.position as any} className="text-[10px] px-1.5" />
              <span className="font-headline font-bold text-sm text-white truncate">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--ffi-surface-3)' }}>
      <p className="ffi-caption text-[var(--ffi-ink-3)] mb-1">{label}</p>
      <p className="font-mono font-bold text-sm text-white">{value}</p>
      {sub && <p className="text-[10px] text-[var(--ffi-ink-3)] truncate mt-0.5">{sub}</p>}
    </div>
  )
}

function TagAccuracyCard({ analysis }: {
  analysis: {
    targetsHit: Array<{ name: string; id: string; drafted: boolean }>
    targetsMissed: Array<{ name: string; id: string; drafted: boolean }>
    avoidsSuccessful: Array<{ name: string; id: string; drafted: boolean }>
    avoidsViolated: Array<{ name: string; id: string; drafted: boolean }>
    totalTargets: number
    totalAvoids: number
    hitRate: number
    avoidRate: number
  }
}) {
  return (
    <div className="ffi-card">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-3.5 w-3.5" color="var(--ffi-blue)" />
        <span className="ffi-caption text-[var(--ffi-ink-3)]">PRE-DRAFT TAG ACCURACY</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <MiniStat label="TARGETS SET" value={String(analysis.totalTargets)} />
        <MiniStat
          label="HIT RATE"
          value={`${analysis.hitRate}%`}
        />
        <MiniStat label="AVOIDS SET" value={String(analysis.totalAvoids)} />
        <MiniStat
          label="AVOID RATE"
          value={`${analysis.avoidRate}%`}
        />
      </div>

      {analysis.targetsHit.length > 0 && (
        <TagPillGroup label="TARGETS DRAFTED" color="var(--ffi-volt)" items={analysis.targetsHit} icon={<Check className="h-3 w-3" />} />
      )}
      {analysis.targetsMissed.length > 0 && (
        <TagPillGroup label="TARGETS MISSED" color="var(--ffi-warning)" items={analysis.targetsMissed} icon={<X className="h-3 w-3" />} />
      )}
      {analysis.avoidsSuccessful.length > 0 && (
        <TagPillGroup label="SUCCESSFULLY AVOIDED" color="var(--ffi-blue-bright)" items={analysis.avoidsSuccessful} icon={<ShieldCheck className="h-3 w-3" />} />
      )}
      {analysis.avoidsViolated.length > 0 && (
        <TagPillGroup label="AVOIDS VIOLATED" color="var(--ffi-danger)" items={analysis.avoidsViolated} icon={<ShieldAlert className="h-3 w-3" />} />
      )}
    </div>
  )
}

function TagPillGroup({ label, color, items, icon }: {
  label: string
  color: string
  items: Array<{ name: string; id: string }>
  icon: React.ReactNode
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="ffi-caption mb-2 flex items-center gap-1.5" style={{ color }}>
        {icon}
        {label} ({items.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(p => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full ffi-caption"
            style={{
              background: `${color}18`,
              border: `1px solid ${color}30`,
              color,
              fontSize: 10,
            }}
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}
