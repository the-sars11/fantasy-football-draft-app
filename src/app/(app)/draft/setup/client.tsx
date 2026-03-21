'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, FileSpreadsheet, Plus, Trash2, ArrowRight, Loader2, Lock } from 'lucide-react'
import type { DraftFormat, Position } from '@/lib/supabase/database.types'

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']

interface LeagueSummary {
  id: string
  name: string
  format: DraftFormat
  team_count: number
  platform: string
  scoring_format: string
  budget: number | null
  keeper_enabled: boolean
  keeper_settings: {
    max_keepers: number
    cost_type: 'round' | 'auction_price'
  } | null
}

interface Manager {
  name: string
  budget?: number
  draft_position?: number
}

interface KeeperEntry {
  player_name: string
  position: Position
  manager: string
  cost: number
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

  // Keeper entry (FF-029)
  const [keepers, setKeepers] = useState<KeeperEntry[]>([])

  // Sheet URL
  const [sheetUrl, setSheetUrl] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isKeeperLeague = selectedLeague?.keeper_enabled ?? false
  const maxKeepers = selectedLeague?.keeper_settings?.max_keepers ?? 3

  // Populate managers from a league object
  const populateManagers = useCallback((league: LeagueSummary) => {
    const count = league.team_count
    const newManagers: Manager[] = Array.from({ length: count }, (_, i) => ({
      name: i === 0 ? 'Me' : `Manager ${i + 1}`,
      budget: league.format === 'auction' ? (league.budget ?? 200) : undefined,
      draft_position: league.format === 'snake' ? i + 1 : undefined,
    }))
    setManagers(newManagers)
    setKeepers([]) // Reset keepers when league changes
  }, [])

  // Load leagues on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leagues')
        const data = await res.json()
        if (data.leagues) {
          setLeagues(data.leagues)
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
    const removedName = managers[index].name
    setManagers(prev => prev.filter((_, i) => i !== index))
    // Remove keepers assigned to removed manager
    setKeepers(prev => prev.filter(k => k.manager !== removedName))
  }

  // --- Keeper management (FF-029) ---

  const addKeeper = () => {
    const defaultManager = managers[0]?.name ?? ''
    setKeepers(prev => [
      ...prev,
      {
        player_name: '',
        position: 'RB',
        manager: defaultManager,
        cost: selectedLeague?.format === 'auction' ? 10 : 5, // sensible defaults
      },
    ])
  }

  const updateKeeper = (index: number, field: keyof KeeperEntry, value: string | number) => {
    setKeepers(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeKeeper = (index: number) => {
    setKeepers(prev => prev.filter((_, i) => i !== index))
  }

  // Count keepers per manager for validation
  const keepersPerManager = (managerName: string): number => {
    return keepers.filter(k => k.manager === managerName).length
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

    // Validate keepers
    if (keepers.length > 0) {
      const emptyKeepers = keepers.filter(k => !k.player_name.trim())
      if (emptyKeepers.length > 0) {
        setError('All keepers must have a player name')
        return
      }

      // Check max keepers per manager
      for (const m of managers) {
        if (keepersPerManager(m.name) > maxKeepers) {
          setError(`${m.name} has more than ${maxKeepers} keeper(s)`)
          return
        }
      }

      // Check duplicate player names
      const keeperNames = keepers.map(k => k.player_name.trim().toLowerCase())
      if (new Set(keeperNames).size !== keeperNames.length) {
        setError('Duplicate keeper player detected')
        return
      }
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
          keepers: keepers.length > 0
            ? keepers.map(k => ({
                player_name: k.player_name.trim(),
                position: k.position,
                manager: k.manager,
                cost: k.cost,
              }))
            : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create session')
        return
      }

      router.push(`/draft/live?session=${data.session.id}`)
    } catch {
      setError('Network error -- could not create session')
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

  const managerNames = managers.map(m => m.name).filter(Boolean)
  const isAuction = selectedLeague?.format === 'auction'

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
                  {league.name} -- {league.format} / {league.scoring_format} / {league.team_count} teams
                  {league.keeper_enabled && ' (keeper)'}
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
                {isAuction
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
                  {isAuction && (
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
                  {!isAuction && (
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

          {/* Keeper Assignments (FF-029) — only for keeper leagues */}
          {isKeeperLeague && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5" />
                  Keepers
                  <Badge variant="outline" className="text-[10px] font-normal">
                    max {maxKeepers}/manager
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isAuction
                    ? 'Mark kept players with their auction price. Budget will be reduced accordingly.'
                    : 'Mark kept players with their keeper round. Those rounds will be pre-filled.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {keepers.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    No keepers added yet. Click below to add keeper assignments.
                  </p>
                )}

                {keepers.map((keeper, i) => (
                  <div key={i} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Player name"
                        value={keeper.player_name}
                        onChange={e => updateKeeper(i, 'player_name', e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value={keeper.position}
                        onValueChange={v => { if (v) updateKeeper(i, 'position', v) }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {POSITIONS.map(pos => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeKeeper(i)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">
                          Manager
                        </Label>
                        <Select
                          value={keeper.manager}
                          onValueChange={v => { if (v) updateKeeper(i, 'manager', v) }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {managerNames.map(name => (
                              <SelectItem key={name} value={name}>
                                {name}
                                {keepersPerManager(name) >= maxKeepers && ' (full)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">
                          {isAuction ? '$' : 'Rd'}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={keeper.cost}
                          onChange={e => updateKeeper(i, 'cost', parseInt(e.target.value, 10) || 1)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" size="sm" onClick={addKeeper} className="mt-2">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Keeper
                </Button>

                {/* Summary of keeper budget impact */}
                {isAuction && keepers.length > 0 && (
                  <div className="rounded-md bg-muted/30 px-3 py-2 text-xs space-y-1 mt-3">
                    <span className="font-medium">Budget Impact</span>
                    {managers.filter(m => m.name.trim()).map(m => {
                      const mKeepers = keepers.filter(k => k.manager === m.name)
                      if (mKeepers.length === 0) return null
                      const totalCost = mKeepers.reduce((sum, k) => sum + k.cost, 0)
                      const remaining = (m.budget ?? 200) - totalCost
                      return (
                        <div key={m.name} className="flex justify-between text-muted-foreground">
                          <span>{m.name}: {mKeepers.length} keeper(s) = ${totalCost}</span>
                          <span className={remaining < 0 ? 'text-destructive font-semibold' : ''}>
                            ${remaining} remaining
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
