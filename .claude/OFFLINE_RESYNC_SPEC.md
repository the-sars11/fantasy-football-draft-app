# FF-315 — Offline Resync Spec

**Status:** Implemented 2026-08-10
**Purpose:** Define what happens when Joe's phone loses the auctioneer feed mid-draft, records picks manually (provisional log), then reconnects.

---

## Core Principle

The auctioneer is the **system of record** for players + prices. This app is Joe's personal advisor — it never overrides the auctioneer; it only corrects itself when the two diverge.

---

## When Does "Offline from Auctioneer" Apply?

Only when ALL of these are true:
1. `format === 'auction'` (auction-only feature)
2. The remote proxy (`useRemoteAuctioneerFeed`) was `connected = true` at some point this session — i.e., we actually synced with a live auctioneer
3. The remote proxy is now failing to return a live payload (`remoteConnected = false`)

If the auctioneer was never connected this session (Joe is using manual-only mode or the auctioneer isn't running), picks are **not** provisional — there's nothing to reconcile against.

---

## Provisional Pick Tagging

**DraftPick gains an optional field:**
```ts
provisional?: boolean  // true = recorded while offline from a connected auctioneer
```

**When a pick is tagged provisional:**
- Joe taps RECORD in the manual entry UI while `isOfflineFromAuctioneer = true`
- Feed picks from the auctioneer itself are **never** provisional (they come from the source of record)

**Display:**
- Provisional picks show a small amber "UNCONFIRMED" chip in the Fix Pick sheet row
- No other UI change — they're treated as real picks for budget/roster math

---

## Reconciliation Trigger

On every successful remote poll that returns `phase === 'drafting'` (or `picks.length > 0`), if `isOfflineFromAuctioneer` was true immediately before, run reconciliation:

```
wasOffline: isOfflineFromAuctioneer was true last poll
nowOnline: remoteConnected just flipped to true
triggerReconcile = wasOffline && nowOnline
```

---

## Reconciliation Algorithm

Input: `auctioneerPicks` — the full picks snapshot from the auctioneer on reconnect.
Match key: **player name, case-insensitive trimmed** (both sides carry a player name string).

For each provisional pick (pick where `provisional === true`) in `state.picks`:

| Auctioneer has it? | Prices/team match? | Action |
|--------------------|--------------------|--------|
| Yes                | Yes                | Clear `provisional` flag → confirmed, silent |
| Yes                | No (differ)        | Apply auctioneer values (price + manager); clear `provisional`; emit correction diff |
| No                 | —                  | Keep `provisional = true`; now an "unconfirmed" pick (re-check each subsequent poll) |

For each auctioneer pick **not already in `state.picks`** (keyed by player name):
- Fold in normally via the existing `addManualPick` path
- These are already authoritative; do not tag them provisional

**Idempotency:** Reconciliation uses the existing `pickId` dedup in the merger, so replaying the auctioneer snapshot never double-counts. A pick flips from provisional → confirmed in-place (never duplicated).

---

## Corrections Toast

When reconciliation finds price/manager discrepancies, the client surfaces a compact banner:

```
2 picks corrected from auctioneer:
  Mahomes: you logged $48 → $52
  Henry: logged Rasar → Smith
```

Banner is dismissible; auto-clears after Joe's next manual action. No dedicated toast system — it's a simple inline state.

---

## State Machine

```
                never connected → no provisional tagging (normal manual mode)
auctioneer ─────────────────────────────────────────────────────────────────────
connected         online ──────────────── remoteConnected=true
    │                                           │
    │             offline ──────────────── remoteConnected=false + wasConnected=true
    │                │
    │         manual picks → tagged provisional (provisional=true)
    │                │
    │         reconnect ──────── reconcile() → corrections diff returned
    │                │                │
    │           corrections         toast shown  →  dismissed by Joe
    │         silent confirms
    │         unconfirmed picks remain (re-check next poll)
```

---

## Success Criterion

Simulate: go offline, record 3 sales (one with a deliberately wrong price), reconnect with the auctioneer holding the true prices →

- [ ] Wrong price auto-corrects to auctioneer value with a visible "corrected" notice
- [ ] Matching picks (price + team correct) reconcile silently, `provisional` cleared
- [ ] Offline-only pick not yet in auctioneer stays flagged as `provisional` (unconfirmed) in Fix sheet
- [ ] Budget and max-bid reflect the auctioneer-corrected numbers
- [ ] No pick is duplicated
- [ ] Snake mode is completely unaffected

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/draft/state.ts` | `provisional?: boolean` on DraftPick; `reconcileWithAuctioneerPicks()` pure fn |
| `src/hooks/use-draft-state.ts` | `reconcileWithAuctioneer()` action |
| `src/hooks/use-draft-feeds.ts` | `isOfflineFromAuctioneer` state + reconnect detection |
| `src/app/(app)/draft/live/client.tsx` | wire reconcile on reconnect; corrections banner state; pass `isOfflineFromAuctioneer` to record handler |
| `src/components/draft/live-room/fix-pick-sheet.tsx` | "UNCONFIRMED" badge on provisional PickRow |
| `src/lib/draft/__tests__/state.test.ts` | 6 reconciliation unit tests |
| `.claude/OFFLINE_RESYNC_SPEC.md` | this document |
