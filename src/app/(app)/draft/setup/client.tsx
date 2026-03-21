'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, FileSpreadsheet, Plus, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import type { DraftFormat } from '@/lib/supabase/database.types'

interface LeagueSummary {
  id: string
  name: string
  format: DraftFormat
  team_count: number
  platform: string
  scoring_format: string
  budget: number | null
}

interface Manager {
  name: string
  budget?: number
  draft_position?: number
}

export function DraftSetupClient() {
  const router = useRouter()

  // League selection
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [loadingLeagues, setLoadingLeagues] = useState(true)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')
  const selectedLeague = leagues.find(l => l.id === selectedLeagueId)

  // Manager entry
  const [managers, setManagers] = useState<Manager[]>([
    { name: '' },
    { name: '' },
  ])

  // Sheet URL
  const [sheetUrl, setSheetUrl] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate managers from a league object
  const populateManagers = useCallback((league: LeagueSummary) => {
    const count = league.team_count
    const newManagers: Manager[] = Array.from({ length: count }, (_, i) => ({
      name: i === 0 ? 'Me' : `Manager ${i + 1}`,
      budget: league.format === 'auction' ? (league.budget ?? 200) : undefined,
      draft_position: league.format === 'snake' ? i + 1 : undefined,
    }))
    setManagers(newManagers)
  }, [])

  // Load leagues on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leagues')
        const data = await res.json()
        if (data.leagues) {
          setLeagues(data.leagues)
          // Auto-select if only one league
          if (data.leagues.length === 1) {
            setSelectedLeagueId(data.leagues[0].id)
            populateManagers(data.leagues[0])
          }
        }
      } catch {
        setError('Failed to load leagues')
      } finally {
        setLoadingLeagues(false)
      }
    }
    load()
  }, [populateManagers])

  // When league changes via dropdown
  const handleLeagueChange = useCallback((leagueId: string | null) => {
    if (!leagueId) return
    setSelectedLeagueId(leagueId)
    setError(null)
    const league = leagues.find(l => l.id === leagueId)
    if (league) populateManagers(league)
  }, [leagues, populateManagers])

  const updateManager = (index: number, field: keyof Manager, value: string | number) => {
    setManagers(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addManager = () => {
    const pos = managers.length + 1
    setManagers(prev => [
      ...prev,
      {
        name: `Manager ${pos}`,
        budget: selectedLeague?.format === 'auction' ? (selectedLeague.budget ?? 200) : undefined,
        draft_position: selectedLeague?.format === 'snake' ? pos : undefined,
      },
    ])
  }

  const removeManager = (index: number) => {
    if (managers.length <= 2) return
    setManagers(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError(null)

    if (!selectedLeagueId) {
      setError('Select a league')
      return
    }

    const emptyNames = managers.filter(m => !m.name.trim())
    if (emptyNames.length > 0) {
      setError('All managers must have a name')
      return
    }

    const uniqueNames = new Set(managers.map(m => m.name.trim().toLowerCase()))
    if (uniqueNames.size !== managers.length) {
      setError('Manager names must be unique')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/draft/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          league_id: selectedLeagueId,
          format: selectedLeague!.format,
          sheet_url: sheetUrl.trim() || undefined,
          managers: managers.map(m => ({
            name: m.name.trim(),
            budget: m.budget,
            draft_position: m.draft_position,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create session')
        return
      }

      // Navigate to the live draft page with session ID
      router.push(`/draft/live?session=${data.session.id}`)
    } catch {
      setError('Network error — could not create session')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingLeagues) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading leagues...
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            No leagues configured yet. Set up a league first.
          </p>
          <Button onClick={() => router.push('/prep/configure')} variant="outline">
            Configure League
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* League Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select League</CardTitle>
          <CardDescription>Choose which league this draft is for</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedLeagueId} onValueChange={handleLeagueChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a league..." />
            </SelectTrigger>
            <SelectContent>
              {leagues.map(league => (
                <SelectItem key={league.id} value={league.id}>
                  {league.name} — {league.format} / {league.scoring_format} / {league.team_count} teams
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedLeague && (
        <>
          {/* Manager Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Managers ({managers.length})
              </CardTitle>
              <CardDescription>
                {selectedLeague.format === 'auction'
                  ? 'Enter each manager name and starting budget'
                  : 'Enter each manager name and draft position'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {managers.map((manager, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 text-center text-sm text-muted-foreground font-mono">
                    {i + 1}
                  </div>
                  <Input
                    placeholder="Manager name"
                    value={manager.name}
                    onChange={e => updateManager(i, 'name', e.target.value)}
                    className="flex-1"
                  />
                  {selectedLeague.format === 'auction' && (
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">$</Label>
                      <Input
                        type="number"
                        value={manager.budget ?? ''}
                        onChange={e => updateManager(i, 'budget', parseInt(e.target.value, 10) || 0)}
                        className="w-20"
                      />
                    </div>
                  )}
                  {selectedLeague.format === 'snake' && (
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground">Pos</Label>
                      <Input
                        type="number"
                        min={1}
                        value={manager.draft_position ?? ''}
                        onChange={e => updateManager(i, 'draft_position', parseInt(e.target.value, 10) || 1)}
                        className="w-16"
                      />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeManager(i)}
                    disabled={managers.length <= 2}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addManager} className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Add Manager
              </Button>
            </CardContent>
          </Card>

          {/* Google Sheets Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSpreadsheet className="h-5 w-5" />
                Google Sheet (Optional)
              </CardTitle>
              <CardDescription>
                Connect a shared Google Sheet to auto-import picks during the draft.
                You can also enter picks manually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                The sheet must be shared with &quot;Anyone with the link&quot; (view access).
                Column mapping is configured after session creation.
              </p>
            </CardContent>
          </Card>

          {/* Submit */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedLeagueId}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Session...
              </>
            ) : (
              <>
                Create Draft Session
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
