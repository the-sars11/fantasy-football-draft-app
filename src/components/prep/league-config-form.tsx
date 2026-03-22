'use client'

import { useActionState, useState, useCallback } from 'react'
import { createLeague, type LeagueFormState } from '@/app/(app)/prep/configure/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DraftFormat, Position, ScoringSettings } from '@/lib/supabase/database.types'
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { getScoringPreset, JOES_ESPN_SCORING, SCORING_FIELDS } from '@/lib/scoring-presets'

interface KeeperEntry {
  player_name: string
  position: Position
  cost: number
}

const PRESETS = {
  joe: {
    name: "Joe's ESPN League (Nasties)",
    platform: 'espn',
    format: 'auction' as DraftFormat,
    team_count: 12,
    budget: 200,
    scoring_format: 'custom',
    keeper_enabled: false,
    roster: { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 1 },
    scoring: JOES_ESPN_SCORING,
  },
  tyler: {
    name: "Tyler's Yahoo League",
    platform: 'yahoo',
    format: 'snake' as DraftFormat,
    team_count: 12,
    budget: null,
    scoring_format: 'custom',
    keeper_enabled: true,
    roster: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, dst: 1, bench: 6, ir: 0 },
    scoring: null, // Tyler needs to provide his
  },
}

export function LeagueConfigForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<LeagueFormState, FormData>(createLeague, {})
  const [format, setFormat] = useState<DraftFormat>('auction')
  const [keeperEnabled, setKeeperEnabled] = useState(false)
  const [presetApplied, setPresetApplied] = useState<string | null>(null)
  const [scoringFormat, setScoringFormat] = useState('ppr')
  const [scoringSettings, setScoringSettings] = useState<ScoringSettings>(() => getScoringPreset('ppr'))
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Keeper management
  const [keepers, setKeepers] = useState<KeeperEntry[]>([])
  const [newKeeperName, setNewKeeperName] = useState('')
  const [newKeeperPosition, setNewKeeperPosition] = useState<Position>('RB')
  const [newKeeperCost, setNewKeeperCost] = useState('')

  const addKeeper = useCallback(() => {
    if (!newKeeperName.trim()) return
    const cost = parseInt(newKeeperCost, 10) || (format === 'auction' ? 1 : 1)
    setKeepers((prev) => [...prev, { player_name: newKeeperName.trim(), position: newKeeperPosition, cost }])
    setNewKeeperName('')
    setNewKeeperCost('')
  }, [newKeeperName, newKeeperPosition, newKeeperCost, format])

  const removeKeeper = useCallback((index: number) => {
    setKeepers((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const updateScoring = useCallback((key: string, value: number) => {
    setScoringSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  function handleScoringFormatChange(newFormat: string) {
    setScoringFormat(newFormat)
    if (newFormat !== 'custom') {
      setScoringSettings(getScoringPreset(newFormat))
    }
  }

  function applyPreset(key: 'joe' | 'tyler') {
    const preset = PRESETS[key]
    setFormat(preset.format)
    setKeeperEnabled(preset.keeper_enabled)
    setPresetApplied(key)
    setScoringFormat(preset.scoring_format)
    if (preset.scoring) {
      setScoringSettings({ ...preset.scoring })
      setExpandedSections({})
    }

    // Fill form fields via DOM
    const form = document.getElementById('league-form') as HTMLFormElement
    if (!form) return
    const setField = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null
      if (el) {
        el.value = value
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    setField('name', preset.name)
    setField('team_count', String(preset.team_count))
    setField('platform', preset.platform)
    if (preset.budget) setField('budget', String(preset.budget))
    // Set roster slots
    for (const [slotKey, slotVal] of Object.entries(preset.roster)) {
      setField(`roster_${slotKey}`, String(slotVal))
    }
  }

  if (state.success) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <div className="text-2xl font-bold text-green-500">League Created</div>
          <p className="text-muted-foreground">
            Your league has been saved. Head to Research to start pulling data.
          </p>
          <a
            href="/prep/research"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-2.5 h-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Run Research
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick presets */}
      <div className="flex gap-2">
        <Button
          variant={presetApplied === 'joe' ? 'default' : 'outline'}
          size="sm"
          onClick={() => applyPreset('joe')}
          type="button"
        >
          Joe&apos;s ESPN (Auction)
        </Button>
        <Button
          variant={presetApplied === 'tyler' ? 'default' : 'outline'}
          size="sm"
          onClick={() => applyPreset('tyler')}
          type="button"
        >
          Tyler&apos;s Yahoo (Snake/Keeper)
        </Button>
      </div>

      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <form id="league-form" action={formAction} className="space-y-6">
        {/* Hidden fields for state-managed values */}
        <input type="hidden" name="format" value={format} />
        <input type="hidden" name="scoring_format" value={scoringFormat} />
        <input type="hidden" name="scoring_settings" value={JSON.stringify(scoringSettings)} />
        <input type="hidden" name="keeper_enabled" value={String(keeperEnabled)} />
        <input type="hidden" name="keepers" value={JSON.stringify(keepers)} />

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>League Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">League Name</label>
                <Input id="name" name="name" placeholder="My Fantasy League" required />
              </div>

              <div className="space-y-2">
                <label htmlFor="platform" className="text-sm font-medium">Platform</label>
                <select
                  id="platform"
                  name="platform"
                  defaultValue="espn"
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="espn">ESPN</option>
                  <option value="yahoo">Yahoo</option>
                  <option value="sleeper">Sleeper</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Draft Format</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={format === 'auction' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormat('auction')}
                  >
                    Auction
                  </Button>
                  <Button
                    type="button"
                    variant={format === 'snake' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormat('snake')}
                  >
                    Snake
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="team_count" className="text-sm font-medium">Teams</label>
                <Input id="team_count" name="team_count" type="number" min={4} max={20} defaultValue={12} required />
              </div>

              {format === 'auction' && (
                <div className="space-y-2">
                  <label htmlFor="budget" className="text-sm font-medium">
                    Auction Budget ($)
                  </label>
                  <Input id="budget" name="budget" type="number" min={1} defaultValue={200} required />
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="scoring_format_select" className="text-sm font-medium">Scoring Format</label>
                <select
                  id="scoring_format_select"
                  value={scoringFormat}
                  onChange={(e) => handleScoringFormatChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="standard">Standard (Non-PPR)</option>
                  <option value="half_ppr">Half PPR</option>
                  <option value="ppr">Full PPR</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roster Slots */}
        <Card>
          <CardHeader>
            <CardTitle>Roster Slots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
              {[
                { key: 'qb', label: 'QB', default: 1 },
                { key: 'rb', label: 'RB', default: 2 },
                { key: 'wr', label: 'WR', default: 2 },
                { key: 'te', label: 'TE', default: 1 },
                { key: 'flex', label: 'FLEX', default: 1 },
                { key: 'k', label: 'K', default: 1 },
                { key: 'dst', label: 'D/ST', default: 1 },
                { key: 'bench', label: 'Bench', default: 6 },
                { key: 'ir', label: 'IR', default: 0 },
              ].map((slot) => (
                <div key={slot.key} className="space-y-1">
                  <label htmlFor={`roster_${slot.key}`} className="text-xs font-medium text-muted-foreground">
                    {slot.label}
                  </label>
                  <Input
                    id={`roster_${slot.key}`}
                    name={`roster_${slot.key}`}
                    type="number"
                    min={0}
                    max={10}
                    defaultValue={slot.default}
                    className="h-8"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Scoring Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Scoring Settings
              {scoringFormat === 'custom' && <Badge variant="secondary">Custom</Badge>}
              {scoringFormat !== 'custom' && (
                <Badge variant="outline" className="text-xs">
                  {scoringFormat === 'standard' ? 'Standard' : scoringFormat === 'half_ppr' ? 'Half PPR' : 'Full PPR'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scoringFormat !== 'custom' && (
              <p className="text-sm text-muted-foreground">
                Using preset values. Switch to &quot;Custom&quot; above to edit individual scoring rules.
              </p>
            )}

            {Object.entries(SCORING_FIELDS).map(([section, fields]) => {
              const sectionLabel = section === 'dst' ? 'D/ST' : section.charAt(0).toUpperCase() + section.slice(1)
              const isExpanded = expandedSections[section] ?? (scoringFormat === 'custom')

              return (
                <div key={section} className="border border-border rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection(section)}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {sectionLabel}
                      <span className="text-xs text-muted-foreground font-normal">
                        {fields.map(f => {
                          const val = scoringSettings[f.key]
                          if (val === 0) return null
                          return `${f.label}: ${val}`
                        }).filter(Boolean).slice(0, 3).join(', ')}
                        {fields.filter(f => scoringSettings[f.key] !== 0).length > 3 && '...'}
                      </span>
                    </span>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-border">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                        {fields.map((field) => (
                          <div key={field.key} className="flex items-center justify-between gap-2">
                            <label className="text-xs text-muted-foreground whitespace-nowrap truncate flex-1" title={field.label}>
                              {field.label}
                            </label>
                            <Input
                              type="number"
                              step={'step' in field ? field.step : 1}
                              value={scoringSettings[field.key]}
                              onChange={(e) => {
                                updateScoring(field.key, parseFloat(e.target.value) || 0)
                                if (scoringFormat !== 'custom') setScoringFormat('custom')
                              }}
                              className="h-7 w-20 text-right text-xs tabular-nums"
                              disabled={scoringFormat !== 'custom'}
                            />
                          </div>
                        ))}
                      </div>
                      {fields.some(f => 'hint' in f) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {fields.filter(f => 'hint' in f).map(f => ('hint' in f ? f.hint : '')).join(' | ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Keeper Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Keeper Settings
              {keeperEnabled && <Badge variant="secondary">Enabled</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={keeperEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setKeeperEnabled(!keeperEnabled)}
              >
                {keeperEnabled ? 'Keepers On' : 'Enable Keepers'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {keeperEnabled
                  ? 'Players can be kept from previous seasons'
                  : 'Full redraft — no keepers'}
              </span>
            </div>

            {keeperEnabled && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="max_keepers" className="text-sm font-medium">Max Keepers</label>
                    <Input id="max_keepers" name="max_keepers" type="number" min={1} max={10} defaultValue={3} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="keeper_cost_type" className="text-sm font-medium">Keeper Cost Type</label>
                    <select
                      id="keeper_cost_type"
                      name="keeper_cost_type"
                      defaultValue={format === 'auction' ? 'auction_price' : 'round'}
                      className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="round">Round (snake)</option>
                      <option value="auction_price">Auction Price</option>
                    </select>
                  </div>
                </div>

                {/* Add keeper form */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Keepers</label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="text"
                      placeholder="Player name"
                      value={newKeeperName}
                      onChange={(e) => setNewKeeperName(e.target.value)}
                      className="w-40"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeeper())}
                    />
                    <select
                      value={newKeeperPosition}
                      onChange={(e) => setNewKeeperPosition(e.target.value as Position)}
                      className="flex h-9 w-20 rounded-md border border-input bg-card px-2 py-1 text-sm"
                    >
                      <option value="QB">QB</option>
                      <option value="RB">RB</option>
                      <option value="WR">WR</option>
                      <option value="TE">TE</option>
                      <option value="K">K</option>
                      <option value="DST">D/ST</option>
                    </select>
                    <Input
                      type="number"
                      placeholder={format === 'auction' ? 'Price $' : 'Round'}
                      value={newKeeperCost}
                      onChange={(e) => setNewKeeperCost(e.target.value)}
                      className="w-24"
                      min={1}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeeper())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addKeeper} disabled={!newKeeperName.trim()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Current keepers list */}
                {keepers.length > 0 && (
                  <div className="space-y-1">
                    {keepers.map((k, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded bg-muted/50 px-3 py-1.5">
                        <span className="text-sm">
                          <Badge variant="outline" className="mr-2 text-xs">{k.position}</Badge>
                          {k.player_name}
                          <span className="ml-2 text-muted-foreground">
                            {format === 'auction' ? `$${k.cost}` : `Rd ${k.cost}`}
                          </span>
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeKeeper(idx)} className="h-6 w-6 p-0">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {format === 'auction' && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Total keeper cost: ${keepers.reduce((sum, k) => sum + k.cost, 0)}
                      </p>
                    )}
                  </div>
                )}

                {keepers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add your keepers above to exclude them from the draft pool and adjust your budget.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Saving...' : 'Save League Configuration'}
        </Button>
      </form>
    </div>
  )
}
