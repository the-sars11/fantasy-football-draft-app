'use client'

/**
 * useAuctioneerfeed — polls Auctioneer for sold picks and hot-reloads them
 * into FFI without a manual refresh.
 *
 * Two polling paths (3-second interval each):
 *
 *   'localstorage' — reads auctioneer-ffi-feed-v1 (Pick[]) and
 *                    auctioneer-draft-v1 (StoredDraft envelope) directly from
 *                    localStorage. Works when Auctioneer and FFI run in the
 *                    same browser on the same device.
 *
 *   'file'         — polls a FileSystemFileHandle acquired at setup time.
 *                    Supports both the full StoredDraft envelope format and
 *                    the raw Pick[] feed format. Re-reads on every poll tick
 *                    so changes saved to disk by Auctioneer are picked up.
 *
 * Gated: no-op unless enabled===true (caller gates on format==='auction') and
 * connectionType is non-null.
 *
 * Dedup: seenPickIdsRef tracks Auctioneer pick IDs across polls. On cold start
 * the first poll marks all existing picks as seen; the onNewPicks callback then
 * filters against the live draftedNames set so already-recorded picks are not
 * double-added to the draft state.
 *
 * File handle cross-navigation: FileSystemFileHandle objects cannot survive a
 * router.push boundary via URL params. Use setGlobalFileHandle() in the setup
 * page after the user picks a file, then retrieve it via getGlobalFileHandle()
 * in the live page (within the same JS process / tab).
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Module-level file handle — survives client-side navigation within the tab
// ---------------------------------------------------------------------------

let _globalFileHandle: FileSystemFileHandle | null = null

export function setGlobalFileHandle(handle: FileSystemFileHandle | null): void {
  _globalFileHandle = handle
}

export function getGlobalFileHandle(): FileSystemFileHandle | null {
  return _globalFileHandle
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuctioneerConnectionType = 'localstorage' | 'file' | null

/** Normalized pick emitted by the hook — maps directly to addManualPick args. */
export interface AuctioneerPick {
  player_name: string
  manager: string   // resolved team name (falls back to teamId if not found)
  price: number
  position?: string
}

// Mirrors the Auctioneer internal types (no import from sibling repo)
interface _AAPlayer {
  id: string
  name: string
  position: string
  team: string
}

interface _AAPick {
  id: string
  player: _AAPlayer
  teamId: string
  price: number
  pickNumber: number
  timestamp: number
}

interface _AATeam {
  id: string
  name: string
}

interface _AAStorageEnvelope {
  schemaVersion: number
  draft: {
    id?: string
    name?: string
    state: {
      config: {
        teams: _AATeam[]
      }
      picks: _AAPick[]
    }
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AA_FEED_KEY = 'auctioneer-ffi-feed-v1'
const AA_STATE_KEY = 'auctioneer-draft-v1'
const POLL_INTERVAL_MS = 3000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTeamNameMap(teams: _AATeam[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of teams) {
    map.set(t.id, t.name)
  }
  return map
}

function normalizeAAPick(pick: _AAPick, teamNameMap: Map<string, string>): AuctioneerPick {
  return {
    player_name: pick.player.name,
    manager: teamNameMap.get(pick.teamId) ?? pick.teamId,
    price: pick.price,
    position: pick.player.position,
  }
}

/**
 * Parse raw text from a file into AA picks + team name map.
 * Supports three shapes that Auctioneer may produce:
 *   1. { schemaVersion, draft: { state: { picks, config: { teams } } } }  ← localStorage envelope
 *   2. { state: { picks, config: { teams } }, ... }                        ← StoredDraft (file export)
 *   3. Pick[]                                                               ← raw FFI feed array
 */
function parseFileContent(text: string): { picks: _AAPick[]; teamNameMap: Map<string, string> } {
  const parsed: unknown = JSON.parse(text)

  // Shape 1: storage envelope
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'schemaVersion' in parsed &&
    'draft' in parsed
  ) {
    const env = parsed as _AAStorageEnvelope
    const picks = env.draft?.state?.picks ?? []
    const teams = env.draft?.state?.config?.teams ?? []
    return { picks, teamNameMap: buildTeamNameMap(teams) }
  }

  // Shape 2: StoredDraft (has a top-level 'state' with 'config' inside)
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'state' in parsed
  ) {
    const sd = parsed as { state: { picks?: _AAPick[]; config?: { teams?: _AATeam[] } } }
    const picks = sd.state?.picks ?? []
    const teams = sd.state?.config?.teams ?? []
    return { picks, teamNameMap: buildTeamNameMap(teams) }
  }

  // Shape 3: raw Pick[]
  if (Array.isArray(parsed)) {
    return { picks: parsed as _AAPick[], teamNameMap: new Map() }
  }

  return { picks: [], teamNameMap: new Map() }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseAuctioneerfeedOptions {
  /** Gate: set true only when format === 'auction'. */
  enabled: boolean
  connectionType: AuctioneerConnectionType
  /** onNewPicks is called with picks that have not been seen before. The caller
   *  is responsible for checking against the live draftedNames set before
   *  applying — see live/client.tsx handleAuctioneerpicks. */
  onNewPicks?: (picks: AuctioneerPick[]) => void
}

export interface UseAuctioneerfeedResult {
  connected: boolean
  importedCount: number
  lastSyncAt: Date | null
  error: string | null
}

export function useAuctioneerfeed({
  enabled,
  connectionType,
  onNewPicks,
}: UseAuctioneerfeedOptions): UseAuctioneerfeedResult {
  const [connected, setConnected] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Per-session dedup: track Auctioneer pick IDs we have already emitted
  const seenPickIdsRef = useRef(new Set<string>())

  // Process a batch of AA picks, emit only unseen ones.
  // onNewPicks is in deps — caller must pass a stable function (useCallback with []).
  const processBatch = useCallback(
    (aaPicks: _AAPick[], teamNameMap: Map<string, string>) => {
      const newPicks: AuctioneerPick[] = []
      for (const pick of aaPicks) {
        if (seenPickIdsRef.current.has(pick.id)) continue
        seenPickIdsRef.current.add(pick.id)
        newPicks.push(normalizeAAPick(pick, teamNameMap))
      }
      if (newPicks.length > 0) {
        setImportedCount(prev => prev + newPicks.length)
        setLastSyncAt(new Date())
        onNewPicks?.(newPicks)
      }
    },
    [onNewPicks],
  )

  // ------------------------------------------------------------------
  // localStorage path
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!enabled || connectionType !== 'localstorage') return
    if (typeof window === 'undefined') return

    function poll() {
      try {
        const feedRaw = window.localStorage.getItem(AA_FEED_KEY)
        if (!feedRaw) {
          // Auctioneer not yet started — stay connected-false, no error
          return
        }

        const aaPicks: _AAPick[] = JSON.parse(feedRaw) as _AAPick[]

        // Resolve team names from the full draft state if available
        let teamNameMap = new Map<string, string>()
        const stateRaw = window.localStorage.getItem(AA_STATE_KEY)
        if (stateRaw) {
          const env: _AAStorageEnvelope = JSON.parse(stateRaw) as _AAStorageEnvelope
          teamNameMap = buildTeamNameMap(env.draft?.state?.config?.teams ?? [])
        }

        setConnected(true)
        setError(null)
        processBatch(aaPicks, teamNameMap)
      } catch {
        setError('Could not read Auctioneer data from localStorage')
      }
    }

    poll()
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [enabled, connectionType, processBatch])

  // ------------------------------------------------------------------
  // File System Access API path
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!enabled || connectionType !== 'file') return

    const handle = _globalFileHandle
    if (!handle) return  // file handle not yet set — stay disconnected silently

    async function pollFile() {
      if (!handle) return
      try {
        const file = await handle.getFile()
        const text = await file.text()
        if (!text.trim()) return

        const { picks, teamNameMap } = parseFileContent(text)
        setConnected(true)
        setError(null)
        processBatch(picks, teamNameMap)
      } catch {
        setError('Could not read Auctioneer export file')
      }
    }

    void pollFile()
    const timer = setInterval(() => void pollFile(), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [enabled, connectionType, processBatch])

  return { connected, importedCount, lastSyncAt, error }
}
