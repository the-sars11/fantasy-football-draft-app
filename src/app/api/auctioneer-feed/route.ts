/**
 * GET /api/auctioneer-feed — server-side proxy to the deployed Auctioneer (FF-314).
 *
 * The deployed auctioneer's `/api/state` sends NO `Access-Control-Allow-Origin`
 * header, so a browser fetch from this app's origin is cross-origin-blocked.
 * This thin proxy does the server-to-server fetch (no CORS in Node) and returns
 * the JSON to our own client. Ships with zero auctioneer-side change.
 *
 * Contract (verified live 2026-08-07 against the deployed `/api/state`):
 *   - The response body IS the auctioneer `DraftState` object directly — there is
 *     NO `{ id, name, state }` envelope. Top-level keys include `config`, `picks`,
 *     `phase`, `pickNumber`, `lastUpdated`.
 *   - Backed by Upstash Redis, single global key `draft-current`, 24h TTL — exactly
 *     ONE active draft at a time, so no draft-code lookup is needed today.
 *   - Returns `null` when no draft is active / KV unconfigured.
 *
 * Forward-compat with the auctioneer's AA-FFI-2 (per-draft keys / short codes):
 * this proxy accepts an optional `?code=` and forwards it as `?code=` to the
 * auctioneer. With no code it keeps hitting the single `draft-current`, so the
 * client can pass an optional code now with no rewrite needed later.
 */

import { NextRequest, NextResponse } from 'next/server'

// Server-side only — never cache the live draft state.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_AUCTIONEER_ORIGIN = 'https://fantasy-auction-auctioneer.vercel.app'

function getAuctioneerOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_AUCTIONEER_ORIGIN?.trim()
  const origin = raw && raw.length > 0 ? raw : DEFAULT_AUCTIONEER_ORIGIN
  // Strip a trailing slash so path concat is always clean.
  return origin.replace(/\/+$/, '')
}

export async function GET(request: NextRequest) {
  const origin = getAuctioneerOrigin()
  const code = request.nextUrl.searchParams.get('code')?.trim()

  // Forward an optional draft code for AA-FFI-2 forward-compat; omit otherwise.
  const target = code
    ? `${origin}/api/state?code=${encodeURIComponent(code)}`
    : `${origin}/api/state`

  try {
    // AbortController guards against a hung auctioneer holding our poll open.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const upstream = await fetch(target, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (!upstream.ok) {
      // 404 / 5xx from the auctioneer ⇒ no live draft. Surface null, not an error,
      // so the client falls back silently to its other feed sources.
      return NextResponse.json(
        { state: null, error: `Auctioneer responded ${upstream.status}` },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const text = await upstream.text()
    // Empty body or literal "null" ⇒ no active draft.
    if (!text.trim() || text.trim() === 'null') {
      return NextResponse.json(
        { state: null },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    let state: unknown
    try {
      state = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { state: null, error: 'Auctioneer returned malformed JSON' },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // Wrap the raw DraftState in { state } so the client has a stable envelope
    // to read even though the auctioneer itself sends the body un-enveloped.
    return NextResponse.json(
      { state },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Auctioneer request timed out'
        : err instanceof Error
          ? err.message
          : 'Failed to reach auctioneer'
    // Network / timeout ⇒ null state so the client stays on its other sources.
    return NextResponse.json(
      { state: null, error: message },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
