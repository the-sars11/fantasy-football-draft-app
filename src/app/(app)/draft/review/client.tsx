'use client'

/**
 * ReviewClient (FF-053)
 *
 * Post-draft review page. Loads completed draft sessions,
 * runs analyzeDraft(), and displays comprehensive grading.
 */

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2,
  AlertCircle,
  Trophy,
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
} from 'lucide-react'
import { analyzeDraft, type DraftReview } from '@/lib/draft/review'
import { picksToCSV, reviewToShareText, downloadCSV, copyToClipboard } from '@/lib/draft/export'
import type { DraftPick } from '@/lib/draft/state'
import type { DraftSession, League, Strategy, RosterSlots } from '@/lib/supabase/database.types'

const posColors: Record<string, string> = {
  QB: 'text-red-400',
  RB: 'text-blue-400',
  WR: 'text-green-400',
  TE: 'text-orange-400',
  K: 'text-purple-400',
  DEF: 'text-yellow-400',
}

const gradeColors: Record<string, string> = {
  'A+': 'text-emerald-400',
  'A': 'text-emerald-400',
  'A-': 'text-emerald-500',
  'B+': 'text-green-400',
  'B': 'text-green-400',
  'B-': 'text-green-500',
  'C+': 'text-yellow-400',
  'C': 'text-yellow-400',
  'C-': 'text-yellow-500',
  'D+': 'text-orange-400',
  'D': 'text-orange-400',
  'F': 'text-red-400',
}

export function ReviewClient() {
  const [sessions, setSessions] = useState<DraftSession[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [session, setSession] = useState<DraftSession | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [managerName, setManagerName] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Load sessions list
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
        if (completed.length > 0) {
          setSelectedId(completed[0].id)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  // Load selected session details
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false

    async function loadSession() {
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/draft/sessions/${selectedId}`)
        if (!res.ok) throw new Error('Failed to load session')
        const data = await res.json()

        if (cancelled) return
        setSession(data.session)
        setLeague(data.league)

        // Set first manager as default
        if (data.session?.managers?.length > 0) {
          setManagerName(data.session.managers[0].name)
        }

        // Load active strategy for the league
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

  // Build review
  const review = useMemo<DraftReview | null>(() => {
    if (!session || !managerName) return null

    const rosterSlots: RosterSlots = league?.roster_slots || {
      qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, dst: 1, bench: 6, ir: 0,
    }

    // Convert session picks to DraftPick format
    const draftPicks: DraftPick[] = (session.picks || []).map(p => ({
      pick_number: p.pick_number,
      player_name: p.player_id, // player_id stores the name in manual entry
      position: undefined, // Will be populated if available
      manager: p.manager,
      price: p.price,
      round: p.round,
    }))

    return analyzeDraft(
      draftPicks,
      managerName,
      strategy,
      rosterSlots,
      session.format,
      league?.budget ?? undefined,
    )
  }, [session, managerName, strategy, league])

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading draft sessions...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-start gap-3">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Error</p>
          <p className="text-destructive/80 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg bg-muted/50 border border-border p-8 text-center space-y-2">
        <Trophy className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">No drafts to review</p>
        <p className="text-sm text-muted-foreground">
          Complete a live draft first, then come back here to see your grades.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session + Manager selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedId ?? ''} onValueChange={setSelectedId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a draft" />
          </SelectTrigger>
          <SelectContent>
            {sessions.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.format === 'auction' ? 'Auction' : 'Snake'} — {s.picks.length} picks — {new Date(s.created_at).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {session && session.managers.length > 0 && (
          <Select value={managerName} onValueChange={(v) => v && setManagerName(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent>
              {session.managers.map(m => (
                <SelectItem key={m.name} value={m.name}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {detailLoading && (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing draft...
        </div>
      )}

      {review && !detailLoading && (
        <div className="space-y-6">
          {/* Overall Grade Card */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-6">
                <div className={`text-5xl font-bold ${gradeColors[review.overallGrade] || 'text-foreground'}`}>
                  {review.overallGrade}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-lg font-semibold">{review.summary}</p>
                  <p className="text-sm text-muted-foreground">
                    Score: {review.overallScore}/100 — {managerName}&#39;s draft
                    {strategy ? ` vs. "${strategy.name}" strategy` : ''}
                  </p>
                  {review.pivotImpact && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      {review.pivotImpact}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!session) return
                      const draftPicks: DraftPick[] = (session.picks || []).map(p => ({
                        pick_number: p.pick_number,
                        player_name: p.player_id,
                        manager: p.manager,
                        price: p.price,
                        round: p.round,
                      }))
                      const csv = picksToCSV(draftPicks, session.format)
                      const date = new Date(session.created_at).toISOString().split('T')[0]
                      downloadCSV(csv, `draft-${date}.csv`)
                    }}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const text = reviewToShareText(review, managerName, session!.format, strategy?.name)
                      const ok = await copyToClipboard(text)
                      if (ok) {
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }
                    }}
                  >
                    {copied ? <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copied ? 'Copied' : 'Share'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strengths & Weaknesses */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {review.strengths.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No standout strengths identified</p>
                ) : (
                  <ul className="space-y-1">
                    {review.strengths.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-400" />
                  Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {review.weaknesses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No major weaknesses identified</p>
                ) : (
                  <ul className="space-y-1">
                    {review.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Position Grades */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Position Grades</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {review.positionGrades.map(pg => (
                  <div
                    key={pg.position}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${posColors[pg.position] || 'text-foreground'}`}>
                        {pg.position}
                      </span>
                      <span className={`text-lg font-bold ${gradeColors[pg.grade] || 'text-foreground'}`}>
                        {pg.grade}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {pg.picks.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="truncate">{p.name}</span>
                          <span className="text-muted-foreground font-mono shrink-0 ml-2">
                            {p.price != null ? `$${p.price}` : ''}
                            {p.round != null ? `Rd ${p.round}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                    {pg.notes.length > 0 && (
                      <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1 border-t border-border">
                        {pg.notes.map((n, i) => (
                          <p key={i}>{n}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strategy Targets */}
          {review.targetResults.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Strategy Target Report
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-1.5">
                  {review.targetResults.map((tr, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        {tr.status === 'hit' && <Check className="h-3.5 w-3.5 text-green-400" />}
                        {tr.status === 'missed' && <X className="h-3.5 w-3.5 text-red-400" />}
                        {tr.status === 'avoided_success' && <ShieldCheck className="h-3.5 w-3.5 text-green-400" />}
                        {tr.status === 'avoided_fail' && <ShieldAlert className="h-3.5 w-3.5 text-red-400" />}
                        <span className="font-medium">{tr.playerName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{tr.detail}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget Analysis (Auction) */}
          {review.budgetAnalysis && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Spent" value={`$${review.budgetAnalysis.totalSpent}`} />
                  <Stat label="Remaining" value={`$${review.budgetAnalysis.remaining}`} />
                  <Stat label="Avg Price" value={`$${review.budgetAnalysis.avgPrice}`} />
                  <Stat label="Highest" value={`$${review.budgetAnalysis.highestPick.price}`} sub={review.budgetAnalysis.highestPick.name} />
                </div>

                {review.budgetAnalysis.allocationVsPlan.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium mb-2">Budget Allocation vs. Plan</p>
                    <div className="space-y-1">
                      {review.budgetAnalysis.allocationVsPlan.map(a => (
                        <div key={a.position} className="flex items-center gap-2 text-xs">
                          <span className={`w-8 font-bold ${posColors[a.position] || ''}`}>{a.position}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-full"
                              style={{ width: `${Math.min(100, a.actual)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground w-20 text-right">
                            {a.actual}% / {a.planned}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Snake Analysis */}
          {review.snakeAnalysis && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Draft Order Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Stat label="Total Picks" value={String(review.snakeAnalysis.totalPicks)} />
                  <Stat label="Rounds" value={String(review.snakeAnalysis.totalRounds)} />
                  <Stat label="First Pick" value={`Rd ${review.snakeAnalysis.earliestPick.round}`} sub={review.snakeAnalysis.earliestPick.name} />
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium mb-2">Pick-by-Pick</p>
                  <div className="space-y-0.5">
                    {review.snakeAnalysis.positionByRound.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
                        <span className="text-muted-foreground font-mono w-10">Rd {p.round}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${posColors[p.position] || ''}`}>
                          {p.position}
                        </Badge>
                        <span className="truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
    </div>
  )
}
