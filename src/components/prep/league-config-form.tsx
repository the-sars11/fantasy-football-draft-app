'use client'

import { useActionState, useState } from 'react'
import { createLeague, type LeagueFormState } from '@/app/(app)/prep/configure/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { DraftFormat } from '@/lib/supabase/database.types'

const PRESETS = {
  joe: {
    name: "Joe's ESPN League",
    platform: 'espn',
    format: 'auction' as DraftFormat,
    team_count: 12,
    budget: 200,
    scoring_format: 'ppr',
    keeper_enabled: false,
  },
  tyler: {
    name: "Tyler's Yahoo League",
    platform: 'yahoo',
    format: 'snake' as DraftFormat,
    team_count: 12,
    budget: null,
    scoring_format: 'ppr',
    keeper_enabled: true,
  },
}

export function LeagueConfigForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<LeagueFormState, FormData>(createLeague, {})
  const [format, setFormat] = useState<DraftFormat>('auction')
  const [keeperEnabled, setKeeperEnabled] = useState(false)
  const [presetApplied, setPresetApplied] = useState<string | null>(null)

  function applyPreset(key: 'joe' | 'tyler') {
    const preset = PRESETS[key]
    setFormat(preset.format)
    setKeeperEnabled(preset.keeper_enabled)
    setPresetApplied(key)

    // Fill form fields via DOM (controlled inputs are set via state, uncontrolled via ref)
    const form = document.getElementById('league-form') as HTMLFormElement
    if (!form) return
    const setField = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | null
      if (el) {
        el.value = value
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    setField('name', preset.name)
    setField('team_count', String(preset.team_count))
    if (preset.budget) setField('budget', String(preset.budget))
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
          Joe's ESPN (Auction)
        </Button>
        <Button
          variant={presetApplied === 'tyler' ? 'default' : 'outline'}
          size="sm"
          onClick={() => applyPreset('tyler')}
          type="button"
        >
          Tyler's Yahoo (Snake/Keeper)
        </Button>
      </div>

      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <form id="league-form" action={formAction} className="space-y-6">
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
                <label className="text-sm font-medium">Platform</label>
                <select
                  name="platform"
                  defaultValue="espn"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                  <input type="hidden" name="format" value={format} />
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
                <label className="text-sm font-medium">Scoring Format</label>
                <select
                  name="scoring_format"
                  defaultValue="ppr"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="standard">Standard</option>
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { key: 'qb', label: 'QB', default: 1 },
                { key: 'rb', label: 'RB', default: 2 },
                { key: 'wr', label: 'WR', default: 2 },
                { key: 'te', label: 'TE', default: 1 },
                { key: 'flex', label: 'FLEX', default: 1 },
                { key: 'k', label: 'K', default: 1 },
                { key: 'dst', label: 'D/ST', default: 1 },
                { key: 'bench', label: 'Bench', default: 6 },
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
              <input type="hidden" name="keeper_enabled" value={String(keeperEnabled)} />
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="max_keepers" className="text-sm font-medium">Max Keepers</label>
                  <Input id="max_keepers" name="max_keepers" type="number" min={1} max={10} defaultValue={3} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Keeper Cost Type</label>
                  <select
                    name="keeper_cost_type"
                    defaultValue={format === 'auction' ? 'auction_price' : 'round'}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="round">Round (snake)</option>
                    <option value="auction_price">Auction Price</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  You'll assign specific keepers and their costs before running research or starting a draft.
                </p>
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
