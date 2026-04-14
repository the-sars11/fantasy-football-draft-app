# P0 Redesign — Design Spec
**Date:** 2026-04-14  
**Scope:** Verdict B targeted redesign from UI_EVAL_2026.md  
**Status:** Approved by Joe Rasar

---

## Background

UI evaluation (FF-253/254) returned Verdict B: 3 hard FAILs and 3 partial FAILs against the 6 draft-day criteria. This spec covers the 4 targeted areas that need redesign before P0 sub-tiers 1–7 implementation begins. No full rebuild. DESIGN_SYSTEM.md Tactical Hologram tokens are unchanged.

**Flagged screens:** Live Draft (`/draft/live`), Draft Setup (`/draft/setup`)  
**Flagged components:** `ManualPickEntry`, `DraftSetupClient`, `LeagueOverview`, `PickFeed`, connection status indicator

---

## Design Decision 1 — Pinned Quick-Entry Bar (FF-257)

**Problem:** `ManualPickEntry` scrolls with the page. During a live auction, user spots a target in the player pool, scrolls down, then must scroll all the way back up to record the pick. Under time pressure, this is a real failure mode. Also required typing a player name for every pick — no way to pre-select the player being bid on.

### Design

**Layout:** Always-open fixed bar at bottom of the live draft screen. `position: fixed; bottom: 0; inset-x: 0; z-index: 40`. Padding accounts for `env(safe-area-inset-bottom)`. Page content has `pb-32` to clear the bar.

**"On Block" seat — the core UX innovation:**  
Each player card in the pool has a **"BID" text button** (small pill, top-right of card). Tapping "BID" locks that player into the bar's On Block slot without navigating away or opening a detail view. Tapping the card body/name still opens the detail view as normal — browsing does not change the nomination.

The On Block slot persists until:
- A pick is successfully recorded (auto-clears)
- User taps the × on the slot (manual clear)
- A different player's "BID" is tapped (replaces)

**Bar anatomy (left → right):**
1. **On Block slot** — `[pos badge] [Player Name] [×]` when filled; `"Tap BID on any player"` hint when empty
2. **Manager dropdown** — pre-selects `myManager`; full list on tap
3. **Price field** — pre-filled with player's `consensusAuctionValue`; editable number input with `$` prefix
4. **Record button** — lime green gradient when all fields valid; greyed when On Block slot is empty
5. **Undo button** — small ghost button; calls `undoLastPick()`

**Snake mode:** Manager dropdown replaced by read-only current-round display. No price field. On Block slot still works — tap BID to pre-select a player, confirm with Record. Undo button present and functional in snake mode (same `undoLastPick()` call).

**Search results dropdown:** Opens upward (`bottom-full`) so results appear above the bar, not obscured by it.

**Touch targets:** All interactive elements ≥ 44px per mobile standard.

### Criteria satisfied
- (a) ✅ Pinned quick-entry bar — never scrolls off screen  
- Not cramping recommendations — always-open bar is ~72px tall; content area scrolls freely above it

---

## Design Decision 2 — Draft Setup Mode Selector (FF-258)

**Problem:** Current setup screen conflates one-time league config with per-draft session setup. No explicit mode choice — user can start a draft without ever deciding between Sheets polling, manual entry, or offline simulation.

### Design

**Architectural separation:**  
League config (managers, budget, roster slots, keeper rules, scoring) lives in `/prep/configure` and is set once. Draft day never asks for it again.

**New draft entry flow — dedicated first screen:**

```
[Screen 1: Mode Selector] → [Screen 2: League + Session Details] → [Live Draft]
                                        ↓ (keeper league only)
                               [Screen 3: Keeper Review]
```

**Screen 1 — Mode Selector:**  
Three large mode cards, full FFI styling (FFICard interactive variant):
- 📊 **Google Sheets** — "Auto-import picks from a shared spreadsheet"
- ✏️ **Manual Entry** — "Enter each pick by hand as it happens"
- 🎮 **Offline Sim** — "Practice run — no real draft"

Cannot proceed without selecting exactly one. "Continue →" CTA disabled until selection made.

**Screen 2 — League Confirm + Session Details:**  
Shows saved league as a pre-filled confirmation card (name, format, budget/teams, platform badges). User does not re-enter managers or settings.

Mode-specific field shown below league card:
- Sheets mode → Sheets URL input (auto-saved from last session, editable)
- Manual mode → no extra fields
- Offline Sim → optional player pool seed (defaults to current data)

**Screen 3 — Keeper Review (keeper leagues only, e.g. Tyler's):**  
Shows keepers declared in Prep mode (weeks before draft). Read-only list with position badge, player name, keeper round/cost, 🔒 icon. Tap any row to edit if a last-minute change occurred. CTA: "Start Draft →"

**Joe's flow:** 2 screens (Mode → League + Sheets URL → Start)  
**Tyler's flow:** 3 screens (Mode → League → Keeper Review → Start)

**Keeper declaration (Prep, not draft day):**  
Keepers are declared weeks before draft day in `/prep/keepers` (new page, in scope for this P0 sprint). The page shows a list of the league's keeper-eligible players with position badge, player name, keeper round, and cost. Managers can add, edit, or remove keeper entries. Data stored as `draft_picks` rows with `is_keeper = true` and negative `pick_number` values — no schema change (existing `applyKeepersToState()` reads these already). Draft day Screen 3 reads from this data; it never writes fresh keeper declarations.

### Criteria satisfied
- (b) ✅ First-screen mode selector — impossible to start without explicit choice  
- Tyler's manual-mode path is unambiguous from the first screen

---

## Design Decision 3 — Connection Status Indicator (FF-259)

**Problem:** Current indicator is binary (LIVE/OFFLINE), only appears when a sheet is connected, uses `ffi-caption` text (~10px) that is unreadable at arm's length, and has no stale state between "polling fine" and "completely offline."

### Design

**4 states — always visible in live draft header:**

| State | Color | Dot | Label | When |
|-------|-------|-----|-------|------|
| LIVE | Green `#22c55e` | Pulsing | `LIVE · 3s` | Last poll ≤ 30s ago |
| STALE | Amber `#fbbf24` | Solid | `STALE · 48s` | Last poll 30s–2m ago |
| OFFLINE | Red `#ef4444` | Solid | `OFFLINE · 2m` | Last poll > 2m ago |
| MANUAL | Gray `#94a3b8` | Solid | `MANUAL` | No sheet connected |

**Visual spec:**  
- Pill: `padding: 5px 10px; border-radius: 20px; font-size: 11px; font-weight: 700`
- Dot: `width: 8px; height: 8px` (LIVE dot has CSS pulse animation)
- Timestamp: `font-size: 9px; opacity: 0.65` — shows elapsed seconds/minutes
- **Same header height as current (~52px)** — no new row added

**Error bar (OFFLINE state only):**  
Tapping the OFFLINE pill expands a 40px bar directly below the header:
- Left: error message (permission issue, network, etc.)
- Right: "Retry" button
- Auto-dismisses when polling recovers; manually dismissable

**Manual mode:** MANUAL pill always shows when no sheet URL — no ambiguity about why picks aren't auto-importing.

### Criteria satisfied
- (c) ✅ Connection status glanceable at arm's length — 11px bold text, 8px dot, high-contrast colors  
- 4 states cover all real scenarios including stale/degraded

---

## Design Decision 4 — Keeper Visual Distinction (FF-274)

**Problem:** In `LeagueOverview` and `PickFeed`, keeper picks (negative `pick_number`) render identically to real draft picks. In a keeper league, opponents' locked players are strategically important — you need to distinguish them at a glance.

### Design

**In pick rows (LeagueOverview expanded view + PickFeed):**

Keeper rows get two visual treatments:
1. **🔒 lock icon** — right-aligned in the pick row, replaces the round/price display
2. **Muted name** — `color: #94a3b8` instead of `#e2e8f0` for keeper player name

**Pick number display:**  
Negative `pick_number` values (e.g. -1, -2, -3) displayed as `K1`, `K2`, `K3` — not raw negatives.

**PickFeed:**  
Recent picks feed shows 🔒 inline after position badge for keeper picks. Most recent keeper entries show at top of feed on draft start (they're already "picked" before the draft begins).

**Detection logic:**  
`pick.is_keeper === true` OR `pick.pick_number < 0` → apply keeper styling. No schema change needed — existing `is_keeper` boolean already set by `applyKeepersToState()`.

### Criteria satisfied
- (e) ✅ Keeper visual distinction — 🔒 + muted name makes keepers immediately distinguishable from draft picks

---

## Design Decisions NOT in Scope

Per Verdict B ruling:
- Full redesign of PlayerPool, AuctionAdvisor, SnakeAdvisor layouts → not needed
- Migration of `AuctionAdvisor`/`LeagueOverview` from shadcn → FFI primitives → deferred to sub-tier 3
- Confidence source attribution (FF-271) → sub-tier 5
- Strategy drift alerts (FF-272) → sub-tier 5

---

## Criteria Coverage (post-redesign)

| Criterion | Before | After |
|-----------|--------|-------|
| (a) Pinned quick-entry bar | ❌ FAIL | ✅ PASS |
| (b) First-screen mode selector | ❌ FAIL | ✅ PASS |
| (c) Connection status glanceable | ⚠️ PARTIAL | ✅ PASS |
| (d) Confidence/source attribution | ⚠️ PARTIAL | ⚠️ PARTIAL (deferred) |
| (e) Keeper visual distinction | ❌ FAIL | ✅ PASS |
| (f) Dual-mode layouts | ⚠️ PARTIAL | ⚠️ IMPROVED (full separation in sub-tier 3) |

---

## Implementation Notes

- DESIGN_SYSTEM.md Tactical Hologram tokens: **unchanged**
- New component: `ManualPickEntry` gets `variant="bar"` prop (backward-compatible, `"card"` remains default)
- New page: `/draft/setup` becomes multi-step flow; existing single-page form becomes Step 2
- New prep section: `/prep/keepers` for keeper declaration (Tyler's use case)
- All existing API contracts, DB schema, draft state machine: **unchanged**
- `applyKeepersToState()` logic: **unchanged** — keeper detection uses existing `is_keeper` flag
