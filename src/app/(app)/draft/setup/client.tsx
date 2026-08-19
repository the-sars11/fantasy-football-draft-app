'use client'

/**
 * Draft Setup (`/draft/setup`), SP-3 SHIELD rebuild (2026-08-18).
 *
 * Visual/layout rebuild only, no changes to data flow, Supabase wiring, or
 * server actions. Matches UI/mockup-SHIELD-screens.html screen 01 (format
 * gate) and applies the same token language across all 3 steps of the flow:
 * - Header: persistent `.ffi-title-red` + steel-blue "Step N of 3" context
 *   chip, matching the prep-hub header pattern (prep/page.tsx:206), reused
 *   here via FFISectionHeader.
 * - Hero: the format confirmation is a `.ffi-hero` object with the giant
 *   AUCTION/SNAKE word in title-red, replacing the old glow-wallpaper
 *   format card.
 * - Sections: QuietLabel dividers (Live Draft / Input Method / Session
 *   Details) instead of oversized section titles.
 * - Selection state: the DestRow identity language (red volt rail) marks the
 *   selected option instead of a blue highlight.
 *
 * Client owns its own header, page.tsx must not add one (double-header bug,
 * see the same note in draft/page.tsx).
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Trash2,
  Plus,
  Loader2,
  PenLine,
  Gamepad2,
  Check,
  VolumeX,
  Smile,
  Flame,
  Link as LinkIcon,
  FolderOpen,
  ChevronLeft,
  ArrowRight,
} from 'lucide-react'
import type { DraftFormat } from '@/lib/supabase/database.types'
import {
  FFICard,
  FFIButton,
  FFISectionHeader,
  FFIBadge,
} from '@/components/ui/ffi-primitives'
import {
  setGlobalFileHandle,
  type AuctioneerConnectionType,
} from '@/hooks/use-auctioneer-feed'

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

type DraftMode = 'manual' | 'sim'
type TrashTalkMode = 'off' | 'family-safe' | 'adult-only'

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

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step flow state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [draftMode, setDraftMode] = useState<DraftMode | null>(null)
  const [trashTalkMode, setTrashTalkMode] = useState<TrashTalkMode>('family-safe')

  // Auctioneer integration (auction format only, FF-279)
  const [auctioneerConnectionType, setAuctioneerConnectionType] = useState<AuctioneerConnectionType>(null)
  const [auctioneerFileName, setAuctioneerFileName] = useState<string | null>(null)
  const [aifError, setAifError] = useState<string | null>(null)

  const isAuction = selectedLeague?.format === 'auction'

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

      const aifParam = auctioneerConnectionType ? `&aif=${auctioneerConnectionType}` : ''
      router.push(`/draft/live?session=${data.session.id}&ttm=${trashTalkMode}${aifParam}`)
    } catch {
      setError('Network error, could not create session')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingLeagues) {
    return (
      <div className="pb-2">
        <DraftSetupHeader
          step={1}
          title="Draft Setup"
          subtitle="Confirm your league, managers, and connection before going live."
          onBack={() => router.push('/settings')}
          backLabel="Setup"
        />
        <div className="flex items-center gap-2 text-[var(--ffi-text-secondary)] py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading leagues...
        </div>
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="pb-2">
        <DraftSetupHeader
          step={1}
          title="Draft Setup"
          subtitle="Confirm your league, managers, and connection before going live."
          onBack={() => router.push('/settings')}
          backLabel="Setup"
        />
        <FFICard className="py-8 text-center">
          <p className="ffi-body-md text-[var(--ffi-text-secondary)] mb-2">
            No league configured yet.
          </p>
          <p className="ffi-caption text-[var(--ffi-text-muted)] mb-4">
            Go to Setup &rarr; League Config to add The Nasties.
          </p>
          <FFIButton variant="secondary" onClick={() => router.push('/settings')}>
            Go to Setup
          </FFIButton>
        </FFICard>
      </div>
    )
  }

  // === STEP 1: Format Gate ===
  if (step === 1) {
    return (
      <>
      <div className="pb-24">
        <DraftSetupHeader
          step={1}
          title="Draft Setup"
          subtitle="Confirm your league, managers, and connection before going live."
          onBack={() => router.push('/settings')}
          backLabel="Setup"
        />

        <QuietLabel>Live Draft</QuietLabel>

        {/* League selector, only needed when multiple leagues exist */}
        {leagues.length > 1 && (
          <div className="mb-4">
            <Label className="ffi-caption text-[var(--ffi-text-secondary)] mb-1 block">League</Label>
            <Select value={selectedLeagueId} onValueChange={handleLeagueChange}>
              <SelectTrigger><SelectValue placeholder="Choose a league..." /></SelectTrigger>
              <SelectContent>
                {leagues.map(league => (
                  <SelectItem key={league.id} value={league.id}>
                    {league.name} - {league.format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Format confirmation hero, the whole point of this screen */}
        {selectedLeague ? (
          <div className="ffi-hero px-5 py-6 text-center">
            <div
              className="text-[11px] font-bold uppercase mb-1.5"
              style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.2em', color: 'var(--ffi-blue-bright)' }}
            >
              Confirm format
            </div>
            <div
              className="ffi-title-red font-bold leading-none"
              style={{ fontSize: '52px', letterSpacing: '0.02em' }}
            >
              {isAuction ? 'AUCTION' : 'SNAKE'}
            </div>
            <div
              className="uppercase"
              style={{ fontFamily: 'var(--font-cond)', fontSize: '15px', letterSpacing: '0.42em', color: 'var(--ffi-ink-3)', marginTop: '-2px' }}
            >
              Draft
            </div>
            <div className="pt-3.5">
              <div
                className="font-semibold text-[17px] text-white"
                style={{ fontFamily: 'var(--font-oswald)' }}
              >
                {selectedLeague.name}
              </div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--ffi-ink-3)' }}>
                {selectedLeague.team_count} teams
                {isAuction && selectedLeague.budget != null && ` · $${selectedLeague.budget} budget`}
                {!isAuction && ' · Snake order'}
                {selectedLeague.keeper_enabled && ' · Keeper league'}
              </div>
            </div>
          </div>
        ) : (
          <FFICard className="py-8 text-center">
            <p className="ffi-body-md text-[var(--ffi-text-secondary)]">Select a league to continue.</p>
          </FFICard>
        )}

        {selectedLeague && (
          <p className="text-center ffi-caption text-[var(--ffi-text-secondary)] mt-3.5">
            Wrong format?{' '}
            <button
              onClick={() => router.push('/settings')}
              className="text-[var(--ffi-blue-bright)] hover:underline transition-colors"
            >
              Update in Setup
            </button>
          </p>
        )}

      </div>
      <div
        className="fixed inset-x-0 bottom-0 z-30 ffi-glass-heavy border-t border-[var(--ffi-border)] px-4 py-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-lg">
          <FFIButton
            variant="hero"
            onClick={() => setStep(2)}
            disabled={!selectedLeague}
            className="w-full"
          >
            {selectedLeague ? (
              <>
                Confirm &middot; Start {isAuction ? 'Auction' : 'Snake'} Draft
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            ) : (
              'Select a league to continue'
            )}
          </FFIButton>
        </div>
      </div>
      </>
    )
  }

  // === STEP 2: Input Method ===
  if (step === 2) {
    return (
      <>
      <div className="pb-24">
        <DraftSetupHeader
          step={2}
          title="Start Draft"
          subtitle="Choose how picks will be tracked during the draft."
          onBack={() => setStep(1)}
          backLabel="Back"
        />

        <QuietLabel>Input Method</QuietLabel>

        <div className="space-y-3">
          {([
            { mode: 'manual' as DraftMode, Icon: PenLine,  label: 'Manual Entry', desc: 'Enter each pick by hand as it happens' },
            { mode: 'sim'    as DraftMode, Icon: Gamepad2, label: 'Offline Sim',  desc: 'Practice run, no real draft' },
          ] as const).map(({ mode, Icon, label, desc }) => {
            const selected = draftMode === mode
            return (
              <button
                key={mode}
                onClick={() => setDraftMode(mode)}
                className={`relative w-full flex items-center gap-4 p-4 rounded-2xl border overflow-hidden text-left transition-all ${
                  selected
                    ? 'border-[var(--ffi-volt)]'
                    : 'border-[var(--ffi-border)] bg-[var(--ffi-surface)] hover:border-[var(--ffi-blue)]/40'
                }`}
                style={
                  selected
                    ? {
                        background: 'linear-gradient(160deg, var(--ffi-surface-3) 0%, var(--ffi-surface-2) 78%)',
                        boxShadow: '0 0 0 1px var(--ffi-volt-glow)',
                      }
                    : undefined
                }
              >
                {selected && (
                  <span
                    className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full"
                    style={{
                      background: 'linear-gradient(180deg, var(--ffi-volt), var(--ffi-volt-deep))',
                      boxShadow: '0 0 12px var(--ffi-volt-glow)',
                    }}
                  />
                )}
                <span className="w-10 flex items-center justify-center shrink-0">
                  <Icon
                    className="h-5 w-5"
                    style={{ color: selected ? 'var(--ffi-gold-bright)' : 'var(--ffi-ink-2)' }}
                    aria-hidden="true"
                  />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="ffi-title-md text-white font-semibold">{label}</div>
                  <div className="ffi-body-md text-[var(--ffi-text-secondary)] text-sm">{desc}</div>
                </div>
                {selected && (
                  <Check className="h-5 w-5 shrink-0" style={{ color: 'var(--ffi-gold-bright)' }} aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>

      </div>
      <div
        className="fixed inset-x-0 bottom-0 z-30 ffi-glass-heavy border-t border-[var(--ffi-border)] px-4 py-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-lg">
          <FFIButton
            variant="primary"
            onClick={() => setStep(3)}
            disabled={!draftMode}
            className="w-full"
          >
            Continue &rarr;
          </FFIButton>
        </div>
      </div>
      </>
    )
  }

  // === STEP 3: Session Details ===
  if (step === 3) {
    return (
      <>
      <div className="max-w-2xl pb-24">
        <DraftSetupHeader
          step={3}
          title="Session Details"
          subtitle={`Mode: ${draftMode === 'manual' ? 'Manual Entry' : 'Offline Sim'}`}
          onBack={() => setStep(2)}
          backLabel="Back"
        />

        {/* League confirmation card (read-only league info) */}
        {selectedLeague && (
          <FFICard variant="elevated" className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="ffi-title-lg text-white font-bold">{selectedLeague.name}</div>
                <div className="ffi-body-md text-[var(--ffi-text-secondary)] mt-1">
                  {selectedLeague.format} &middot; {selectedLeague.team_count} teams
                  {selectedLeague.keeper_enabled && ' · Keeper'}
                </div>
              </div>
              <FFIBadge status="info">{selectedLeague.platform}</FFIBadge>
            </div>
          </FFICard>
        )}

        {/* Trash Talk Mode */}
        <QuietLabel>Session Details</QuietLabel>
        <FFICard className="mb-4">
          <div className="ffi-title-md text-white font-semibold mb-1">Trash Talk</div>
          <div className="ffi-body-md text-[var(--ffi-text-secondary)] mb-3 text-sm">
            Auto-detect draft mistakes and generate callouts during the draft.
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { mode: 'off' as TrashTalkMode, Icon: VolumeX, label: 'Off', desc: 'Silent' },
              { mode: 'family-safe' as TrashTalkMode, Icon: Smile, label: 'Family-Safe', desc: 'PG-13' },
              { mode: 'adult-only' as TrashTalkMode, Icon: Flame, label: 'Adult-Only', desc: 'No filter' },
            ] as const).map(({ mode, Icon, label, desc }) => {
              const selected = trashTalkMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTrashTalkMode(mode)}
                  className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border text-center overflow-hidden transition-all ${
                    selected
                      ? 'border-[var(--ffi-volt)]'
                      : 'border-[var(--ffi-border)] bg-[var(--ffi-surface)] hover:border-[var(--ffi-blue)]/40'
                  }`}
                  style={selected ? { background: 'rgba(166,60,65,0.08)', boxShadow: '0 0 0 1px var(--ffi-volt-glow)' } : undefined}
                >
                  {selected && (
                    <span
                      className="absolute top-0 left-3 right-3 h-[3px] rounded-full"
                      style={{ background: 'linear-gradient(90deg, var(--ffi-volt), var(--ffi-volt-deep))' }}
                    />
                  )}
                  <Icon className="h-5 w-5" style={{ color: selected ? 'var(--ffi-gold-bright)' : 'var(--ffi-ink-2)' }} aria-hidden="true" />
                  <span
                    className="ffi-caption font-semibold"
                    style={{ color: selected ? 'var(--ffi-gold-bright)' : '#ffffff' }}
                  >
                    {label}
                  </span>
                  <span className="ffi-caption text-[var(--ffi-text-muted)] text-[10px]">{desc}</span>
                </button>
              )
            })}
          </div>
        </FFICard>

        {/* League already confirmed in Step 1, no dropdown here */}

        {/* Auctioneer Sync (auction format only, FF-279) */}
        {isAuction && (
          <FFICard className="mb-4">
            <div className="ffi-title-md text-white font-semibold mb-1">Auctioneer Sync</div>
            <div className="ffi-body-md text-[var(--ffi-text-secondary)] mb-3 text-sm">
              Import picks from the Auctioneer app in real time. Optional, skip if not using it.
            </div>
            <div className="space-y-2">
              {/* Same-device localStorage path */}
              {(() => {
                const selected = auctioneerConnectionType === 'localstorage'
                return (
                  <button
                    type="button"
                    onClick={() =>
                      setAuctioneerConnectionType(prev =>
                        prev === 'localstorage' ? null : 'localstorage',
                      )
                    }
                    className={`relative w-full flex items-center gap-3 p-3 rounded-xl border overflow-hidden text-left transition-all ${
                      selected
                        ? 'border-[var(--ffi-volt)]'
                        : 'border-[var(--ffi-border)] bg-[var(--ffi-surface)] hover:border-[var(--ffi-blue)]/40'
                    }`}
                    style={selected ? { background: 'rgba(166,60,65,0.06)', boxShadow: '0 0 0 1px var(--ffi-volt-glow)' } : undefined}
                  >
                    {selected && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                        style={{ background: 'linear-gradient(180deg, var(--ffi-volt), var(--ffi-volt-deep))', boxShadow: '0 0 12px var(--ffi-volt-glow)' }}
                      />
                    )}
                    <LinkIcon className="h-5 w-5 shrink-0" style={{ color: selected ? 'var(--ffi-gold-bright)' : 'var(--ffi-ink-2)' }} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="ffi-body-md text-white font-semibold">Same Device</div>
                      <div className="ffi-caption text-[var(--ffi-text-secondary)]">
                        Auctioneer running in the same browser, picks sync automatically
                      </div>
                    </div>
                    {selected && (
                      <Check className="h-5 w-5 shrink-0" style={{ color: 'var(--ffi-gold-bright)' }} aria-hidden="true" />
                    )}
                  </button>
                )
              })()}

              {/* File System Access API path */}
              {(() => {
                const selected = auctioneerConnectionType === 'file'
                return (
                  <button
                    type="button"
                    onClick={async () => {
                      setAifError(null)
                      const w = window as Window & {
                        showOpenFilePicker?: (opts?: object) => Promise<FileSystemFileHandle[]>
                      }
                      if (!w.showOpenFilePicker) {
                        setAifError('File picker not supported in this browser. Use the Same Device option instead.')
                        return
                      }
                      try {
                        const [handle] = await w.showOpenFilePicker({
                          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
                          multiple: false,
                        })
                        setGlobalFileHandle(handle)
                        setAuctioneerFileName(handle.name)
                        setAuctioneerConnectionType('file')
                      } catch {
                        // User cancelled the picker, no error
                      }
                    }}
                    className={`relative w-full flex items-center gap-3 p-3 rounded-xl border overflow-hidden text-left transition-all ${
                      selected
                        ? 'border-[var(--ffi-volt)]'
                        : 'border-[var(--ffi-border)] bg-[var(--ffi-surface)] hover:border-[var(--ffi-blue)]/40'
                    }`}
                    style={selected ? { background: 'rgba(166,60,65,0.06)', boxShadow: '0 0 0 1px var(--ffi-volt-glow)' } : undefined}
                  >
                    {selected && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                        style={{ background: 'linear-gradient(180deg, var(--ffi-volt), var(--ffi-volt-deep))', boxShadow: '0 0 12px var(--ffi-volt-glow)' }}
                      />
                    )}
                    <FolderOpen className="h-5 w-5 shrink-0" style={{ color: selected ? 'var(--ffi-gold-bright)' : 'var(--ffi-ink-2)' }} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="ffi-body-md text-white font-semibold">Export File</div>
                      <div className="ffi-caption text-[var(--ffi-text-secondary)] truncate">
                        {selected && auctioneerFileName
                          ? `Connected: ${auctioneerFileName}`
                          : "Pick Auctioneer's exported JSON file, re-polled every 3s"}
                      </div>
                    </div>
                    {selected && (
                      <Check className="h-5 w-5 shrink-0" style={{ color: 'var(--ffi-gold-bright)' }} aria-hidden="true" />
                    )}
                  </button>
                )
              })()}
            </div>

            {aifError && (
              <p className="ffi-caption text-[var(--ffi-danger)] mt-2">{aifError}</p>
            )}
            {auctioneerConnectionType === null && (
              <p className="ffi-caption text-[var(--ffi-text-muted)] mt-2">
                Not using Auctioneer? Leave this unset, no impact on the draft.
              </p>
            )}
          </FFICard>
        )}

        {/* Managers section */}
        {selectedLeague && (
          <FFICard>
            <div className="ffi-title-md text-white font-semibold mb-3">
              Managers ({managers.length})
            </div>
            <div className="space-y-3">
              {managers.map((manager, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 text-center text-sm text-[var(--ffi-text-secondary)] font-mono">
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
                      <Label className="text-xs text-[var(--ffi-text-secondary)]">$</Label>
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
                      <Label className="text-xs text-[var(--ffi-text-secondary)]">Pos</Label>
                      <Input
                        type="number"
                        min={1}
                        value={manager.draft_position ?? ''}
                        onChange={e => updateManager(i, 'draft_position', parseInt(e.target.value, 10) || 1)}
                        className="w-16"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => removeManager(i)}
                    disabled={managers.length <= 2}
                    className="text-[var(--ffi-text-secondary)] hover:text-[var(--ffi-danger)] transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Remove manager"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <FFIButton variant="secondary" onClick={addManager} className="mt-3 w-full">
              <Plus className="h-4 w-4 mr-1" />
              Add Manager
            </FFIButton>
          </FFICard>
        )}

      </div>
      <div
        className="fixed inset-x-0 bottom-0 z-30 ffi-glass-heavy border-t border-[var(--ffi-border)] px-4 py-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-2xl space-y-2">
          {error && (
            <div className="rounded-lg border border-[var(--ffi-danger)]/50 bg-[var(--ffi-danger)]/10 px-4 py-3 ffi-body-md text-[var(--ffi-danger)]">
              {error}
            </div>
          )}
          <FFIButton
            variant="hero"
            onClick={() => {
              // Validate managers
              const emptyNames = managers.filter(m => !m.name.trim())
              if (emptyNames.length > 0) { setError('All managers must have a name'); return }
              const uniqueNames = new Set(managers.map(m => m.name.trim().toLowerCase()))
              if (uniqueNames.size !== managers.length) { setError('Manager names must be unique'); return }
              setError(null)
              handleSubmit()
            }}
            disabled={submitting || !selectedLeagueId}
            className="w-full"
          >
            {submitting ? 'Starting...' : 'Start Draft →'}
          </FFIButton>
        </div>
      </div>
      </>
    )
  }

  return null
}

/* ========================================
   SHIELD header block, reused across all 3 steps.
   Back row + FFISectionHeader (title/subtitle/action) with a "Step N of 3"
   context chip, matching the prep-hub screen header pattern.
   ======================================== */

function DraftSetupHeader({
  step,
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  step: 1 | 2 | 3
  title: string
  subtitle: string
  onBack: () => void
  backLabel: string
}) {
  return (
    <div className="mb-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] font-bold uppercase mb-3 text-[var(--ffi-ink-3)] hover:text-white transition-colors min-h-[28px]"
        style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.14em' }}
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {backLabel}
      </button>
      <FFISectionHeader title={title} subtitle={subtitle} action={<StepChip step={step} />} />
    </div>
  )
}

function StepChip({ step }: { step: 1 | 2 | 3 }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase"
      style={{
        fontFamily: 'var(--font-cond)',
        letterSpacing: '0.16em',
        background: 'linear-gradient(160deg, rgba(95,168,224,0.16), rgba(95,168,224,0.06))',
        border: '1px solid rgba(95,168,224,0.30)',
        color: 'var(--ffi-blue-bright)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--ffi-gold-bright)', boxShadow: '0 0 9px var(--ffi-gold-bright)' }}
      />
      Step {step} of 3
    </span>
  )
}

function QuietLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-bold text-[10px] uppercase mt-1 mb-2.5"
      style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.28em', color: 'var(--ffi-ink-3)' }}
    >
      {children}
    </p>
  )
}
