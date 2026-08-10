'use client'

import { useActionState, useState, useCallback } from 'react'
import { createLeague, type LeagueFormState } from '@/app/(app)/prep/configure/actions'
import type { DraftFormat, ScoringSettings } from '@/lib/supabase/database.types'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { getScoringPreset, JOES_ESPN_SCORING, SCORING_FIELDS } from '@/lib/scoring-presets'

// Nasties locked config — auto-seeded on first render. Source of truth: FANTASY_FOOTBALL_MASTER.md.
const NASTIES_PRESET = {
  name: 'The Nasties',
  platform: 'espn',
  format: 'auction' as DraftFormat,
  team_count: 12,
  budget: 200,
  scoring_format: 'custom',
  keeper_enabled: false,
  roster: { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 1 },
  scoring: JOES_ESPN_SCORING,
}

export function LeagueConfigForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<LeagueFormState, FormData>(createLeague, {})

  // Format is always auction for the Nasties — no toggle exposed.
  const [format] = useState<DraftFormat>('auction')
  const [scoringFormat, setScoringFormat] = useState('custom')
  const [scoringSettings, setScoringSettings] = useState<ScoringSettings>(() => ({ ...JOES_ESPN_SCORING }))
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

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

  function resetToNasties() {
    setScoringFormat('custom')
    setScoringSettings({ ...NASTIES_PRESET.scoring })
    setExpandedSections({})

    const form = document.getElementById('league-form') as HTMLFormElement
    if (!form) return
    const setField = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null
      if (el) {
        el.value = value
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    setField('name', NASTIES_PRESET.name)
    setField('team_count', String(NASTIES_PRESET.team_count))
    setField('platform', NASTIES_PRESET.platform)
    setField('budget', String(NASTIES_PRESET.budget))
    for (const [slotKey, slotVal] of Object.entries(NASTIES_PRESET.roster)) {
      setField(`roster_${slotKey}`, String(slotVal))
    }
  }

  if (state.success) {
    return (
      <div className="ffi-card-elevated py-8 text-center space-y-4">
        <div className="ffi-display-md" style={{ color: 'var(--ffi-volt)' }}>League Saved</div>
        <p style={{ color: 'var(--ffi-ink-2)' }}>
          Your league config has been saved.
        </p>
        <a
          href="/settings"
          className="ffi-btn-hero inline-flex text-[13px]"
        >
          Back to Setup
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={resetToNasties}
          className="text-sm transition-colors hover:underline"
          style={{ color: 'var(--ffi-blue-bright)' }}
        >
          Reset to Nasties defaults
        </button>
      </div>

      {state.error && (
        <div className="rounded-md p-3 text-sm" style={{ background: 'rgba(255,110,138,0.12)', border: '1px solid rgba(255,110,138,0.24)', color: 'var(--ffi-danger)' }}>
          {state.error}
        </div>
      )}

      <form id="league-form" action={formAction} className="space-y-6">
        {/* Hidden fields for state-managed values */}
        <input type="hidden" name="format" value={format} />
        <input type="hidden" name="scoring_format" value={scoringFormat} />
        <input type="hidden" name="scoring_settings" value={JSON.stringify(scoringSettings)} />
        <input type="hidden" name="keeper_enabled" value="false" />
        <input type="hidden" name="keepers" value="[]" />

        {/* Basic Info */}
        <div className="ffi-card">
          <h3 className="ffi-title-md mb-3" style={{ color: 'var(--ffi-ink)' }}>League Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium" style={{ color: 'var(--ffi-ink-2)' }}>League Name</label>
              <input
                id="name"
                name="name"
                placeholder="The Nasties"
                defaultValue="The Nasties"
                required
                className="ffi-input ffi-form-input"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="platform" className="text-sm font-medium" style={{ color: 'var(--ffi-ink-2)' }}>Platform</label>
              <select
                id="platform"
                name="platform"
                defaultValue="espn"
                className="ffi-input ffi-form-input text-sm"
              >
                <option value="espn">ESPN</option>
                <option value="yahoo">Yahoo</option>
                <option value="sleeper">Sleeper</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Format is auction-only — no toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--ffi-ink-2)' }}>Draft Format</label>
              <div
                className="flex items-center h-9 px-3 rounded-md text-sm"
                style={{ border: '1px solid var(--ffi-hairline)', background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}
              >
                Auction (Nasties)
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="team_count" className="text-sm font-medium" style={{ color: 'var(--ffi-ink-2)' }}>Teams</label>
              <input
                id="team_count"
                name="team_count"
                type="number"
                min={4}
                max={20}
                defaultValue={12}
                required
                className="ffi-input ffi-form-input"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="budget" className="text-sm font-medium" style={{ color: 'var(--ffi-ink-2)' }}>Auction Budget ($)</label>
              <input
                id="budget"
                name="budget"
                type="number"
                min={1}
                defaultValue={200}
                required
                className="ffi-input ffi-form-input"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="scoring_format_select" className="text-sm font-medium" style={{ color: 'var(--ffi-ink-2)' }}>Scoring Format</label>
              <select
                id="scoring_format_select"
                value={scoringFormat}
                onChange={(e) => handleScoringFormatChange(e.target.value)}
                className="ffi-input ffi-form-input text-sm"
              >
                <option value="standard">Standard (Non-PPR)</option>
                <option value="half_ppr">Half PPR</option>
                <option value="ppr">Full PPR</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Roster Slots — pre-filled with locked Nasties values (QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1) */}
        <div className="ffi-card">
          <h3 className="ffi-title-md mb-3" style={{ color: 'var(--ffi-ink)' }}>Roster Slots</h3>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {[
              { key: 'qb',    label: 'QB',    default: 1 },
              { key: 'rb',    label: 'RB',    default: 1 },
              { key: 'wr',    label: 'WR',    default: 1 },
              { key: 'te',    label: 'TE',    default: 1 },
              { key: 'flex',  label: 'FLEX',  default: 3 },
              { key: 'k',     label: 'K',     default: 0 },
              { key: 'dst',   label: 'D/ST',  default: 1 },
              { key: 'bench', label: 'Bench', default: 5 },
              { key: 'ir',    label: 'IR',    default: 1 },
            ].map((slot) => (
              <div key={slot.key} className="space-y-1">
                <label htmlFor={`roster_${slot.key}`} className="text-xs font-medium" style={{ color: 'var(--ffi-ink-2)' }}>
                  {slot.label}
                </label>
                <input
                  id={`roster_${slot.key}`}
                  name={`roster_${slot.key}`}
                  type="number"
                  min={0}
                  max={10}
                  defaultValue={slot.default}
                  className="h-8 ffi-input ffi-form-input"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Custom Scoring Editor */}
        <div className="ffi-card">
          <h3 className="ffi-title-md mb-3 flex items-center gap-2" style={{ color: 'var(--ffi-ink)' }}>
            Scoring Settings
            {scoringFormat === 'custom' && (
              <span className="ffi-badge" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>Custom</span>
            )}
            {scoringFormat !== 'custom' && (
              <span className="ffi-badge text-xs" style={{ background: 'rgba(77,130,255,0.16)', color: 'var(--ffi-blue-bright)' }}>
                {scoringFormat === 'standard' ? 'Standard' : scoringFormat === 'half_ppr' ? 'Half PPR' : 'Full PPR'}
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {scoringFormat !== 'custom' && (
              <p className="text-sm" style={{ color: 'var(--ffi-ink-2)' }}>
                Using preset values. Switch to &quot;Custom&quot; above to edit individual scoring rules.
              </p>
            )}

            {Object.entries(SCORING_FIELDS).map(([section, fields]) => {
              const sectionLabel = section === 'dst' ? 'D/ST' : section.charAt(0).toUpperCase() + section.slice(1)
              const isExpanded = expandedSections[section] ?? (scoringFormat === 'custom')

              return (
                <div key={section} className="rounded-md overflow-hidden" style={{ border: '1px solid var(--ffi-hairline)' }}>
                  <button
                    type="button"
                    onClick={() => toggleSection(section)}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium transition-colors"
                    style={{ color: 'var(--ffi-ink)' }}
                  >
                    <span className="flex items-center gap-2">
                      {sectionLabel}
                      <span className="text-xs font-normal" style={{ color: 'var(--ffi-ink-3)' }}>
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
                    <div className="px-3 pb-3 pt-1" style={{ borderTop: '1px solid var(--ffi-hairline)' }}>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                        {fields.map((field) => (
                          <div key={field.key} className="flex items-center justify-between gap-2">
                            <label className="text-xs whitespace-nowrap truncate flex-1" style={{ color: 'var(--ffi-ink-2)' }} title={field.label}>
                              {field.label}
                            </label>
                            <input
                              type="number"
                              step={'step' in field ? field.step : 1}
                              value={scoringSettings[field.key]}
                              onChange={(e) => {
                                updateScoring(field.key, parseFloat(e.target.value) || 0)
                                if (scoringFormat !== 'custom') setScoringFormat('custom')
                              }}
                              className="h-7 w-20 text-right text-xs tabular-nums ffi-input ffi-form-input"
                              disabled={scoringFormat !== 'custom'}
                            />
                          </div>
                        ))}
                      </div>
                      {fields.some(f => 'hint' in f) && (
                        <p className="text-xs mt-2" style={{ color: 'var(--ffi-ink-3)' }}>
                          {fields.filter(f => 'hint' in f).map(f => ('hint' in f ? f.hint : '')).join(' | ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <button type="submit" disabled={pending} className="ffi-btn-hero w-full sm:w-auto text-[13px] disabled:opacity-50">
          {pending ? 'Saving...' : 'Save League Config'}
        </button>
      </form>
    </div>
  )
}
