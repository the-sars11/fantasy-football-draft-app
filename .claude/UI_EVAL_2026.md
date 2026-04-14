# UI_EVAL_2026.md — Live Draft UI Evaluation
**FF-253 / FF-254 | Audited:** 2026-04-14  
**Verdict:** **B — Targeted Redesign** (2-3 components, 1 screen)

---

## Verdict Summary

> **B: Targeted redesign.** The FFI Tactical Hologram design system is solid and mostly applied. The live draft layout structure is sound. However, 3 hard FAILs and 3 partial FAILs against the 6 criteria require targeted fixes before draft day. No full rebuild needed — scope is well-contained.

**Fixes required before sub-tiers 1-7 can proceed (already scheduled as FF-257–FF-259, FF-274):**

| # | Criterion | Verdict | Fix Item |
|---|-----------|---------|----------|
| a | Pinned quick-entry bar | ❌ FAIL | FF-257 |
| b | First-screen mode selector | ❌ FAIL | FF-258 |
| c | Connection status glanceable | ⚠️ PARTIAL | FF-259 |
| d | Confidence/source attribution | ⚠️ PARTIAL | FF-270, FF-271 |
| e | Keeper visual distinction on board | ❌ FAIL | FF-274 |
| f | Dual-mode layouts, zero bleed | ⚠️ PARTIAL | cleanup in sub-tier 3 |

---

## Per-Screen Audit

### Screen 1: Draft Setup (`/draft/setup/client.tsx`)

**Summary:** Entirely unstyled — uses raw shadcn/ui components with no FFI tokens. Has no mode selector.

| Criterion | Status | Detail |
|-----------|--------|--------|
| (b) Mode selector | ❌ FAIL | Sheet URL is just an optional input field, not a mode choice. User can start without explicitly choosing Sheets vs Manual vs Offline. |
| (f) Dual-mode layout | ⚠️ PARTIAL | Format is inherited from the selected league (not explicitly chosen here). No visual separation between auction-specific and snake-specific fields. |
| Design consistency | ❌ FAIL | Uses `Card`, `Button`, `Input`, `Badge`, `Select` from raw shadcn/ui. No `FFICard`, `FFIButton`, or FFI tokens. Visual language is completely different from the live draft screen. |

**Evidence (file: `src/app/(app)/draft/setup/client.tsx`):**
```
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, ... } from '@/components/ui/select'
```
Zero FFI primitives imported. No `ffi-` CSS classes anywhere in file.

---

### Screen 2: Live Draft (`/draft/live/client.tsx`)

**Summary:** FFI design system applied at the page level and right column. Left-column components partially migrated. Layout structure is good but ManualPickEntry is not pinned.

#### Criterion (a): Pinned quick-entry bar fit without cramping recommendations
**❌ FAIL**

`ManualPickEntry` is rendered as the first item inside a `space-y-4` scrollable left column:
```tsx
// src/app/(app)/draft/live/client.tsx:562–575
<div className="space-y-4">
  {state.status !== 'completed' && (
    <ManualPickEntry ... />   // ← not sticky, not pinned
  )}
  <StrategyPicker ... />
  <MySquadPanel ... />
  <PickFeed ... />
  <AuctionAdvisor ... />
```

On mobile (single-column), the player pool is at the bottom of a long scroll. Once the user scrolls to see available players, the `ManualPickEntry` disappears off-screen. There is no `position: sticky`, `fixed`, or bottom-bar treatment. The component has no collapsed/expanded state.

**Impact:** High. During a fast auction, the user sees a player they want, scrolls down to find them in the pool, then has to scroll ALL the way back up to the top to enter the pick. Under time pressure this is a real problem.

---

#### Criterion (b): First-screen mode selector — impossible to start without explicit choice
**❌ FAIL**

Setup screen has no mode picker. The Sheets URL field at line 500–523 (`setup/client.tsx`) is:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Google Sheet (Optional)</CardTitle>
    <CardDescription>Connect a shared Google Sheet... You can also enter picks manually.</CardDescription>
  </CardHeader>
  <CardContent>
    <Input placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} ... />
```

There is no explicit choice between:
- **Sheets mode** (live polling)
- **Manual mode** (enter picks by hand, no sheet)
- **Offline simulation** (dry run, no external data)

The user just skips the URL field and ends up in an ambiguous "no sheet, no explicit mode" state. Connection status on the live screen won't even appear if `session.sheet_url` is empty (line 534: `{session.sheet_url && (...)}` — the entire status indicator is conditional on having a sheet URL).

**Impact:** High. Tyler's Yahoo snake draft doesn't use Sheets at all — he needs "Manual mode" to be an explicit, clear first-class choice.

---

#### Criterion (c): Connection status placement glanceable at arm's length
**⚠️ PARTIAL PASS**

Status indicator EXISTS in the live draft header (lines 533–545):
```tsx
<div className={cn(
  'flex items-center gap-1 px-2 py-1 rounded-full',
  isPolling ? 'bg-[var(--ffi-success)]/20 ...' : 'bg-[var(--ffi-danger)]/20 ...'
)}>
  {isPolling ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
  <span className="ffi-caption">{isPolling ? 'LIVE' : 'OFFLINE'}</span>
</div>
```

**What's good:** Colored pill in header, correct green/red theming, always visible at top of screen.

**What's missing:**
- Only **2 states** (LIVE / OFFLINE). No "STALE >30s" yellow warning state.
- No timestamp of last successful poll ("last updated 45s ago").
- `ffi-caption` text is ~10px — **not** readable at arm's length on a phone across the table.
- `h-3 w-3` WiFi icon is tiny (~12px) — same problem.
- Entire indicator is **hidden when there's no sheet URL** — so in Manual mode there's zero connection context shown.
- No one-tap expand on disconnected state to show error + recovery options.

**Impact:** Medium. The basic shape is right; needs 3-state logic and size bump.

---

#### Criterion (d): Confidence/source attribution badges without visual clutter
**⚠️ PARTIAL PASS**

`AuctionAdvisor` shows confidence badges on LLM targets (lines 211–220):
```tsx
<Badge variant="outline" className={`text-[9px] px-1 py-0 ${
  t.confidence === 'high' ? 'border-green-500/40 text-green-400' : ...
}`}>
  {t.confidence}
</Badge>
```

**What's good:** Confidence level (high/medium/low) is visible per target.

**What's missing:**
- No source attribution — the AI doesn't show which data sources it drew from (ESPN rankings? Sleeper ADP? FantasyPros? All three?).
- No "Low confidence — thin data" flag when player has sparse multi-source coverage. `explainPlayer()` in `explain.ts` calculates confidence but the low-confidence case isn't surfaced as a visual warning.
- Badge text is `text-[9px]` — barely visible.

**Impact:** Medium. Source attribution is important for trust. The structure is there, it just needs wiring.

---

#### Criterion (e): Keeper visual distinction on board
**❌ FAIL**

`LeagueOverview` (lines 106–127) renders ALL picks with identical styling:
```tsx
mgr.picks.map(pick => (
  <div key={pick.pick_number} className="flex items-center gap-1.5 text-[11px] py-0.5">
    <span className="font-mono text-muted-foreground w-4 text-right text-[9px]">
      {pick.pick_number}  // ← negative for keepers, but no visual treatment
    </span>
    {pick.position && <span className={posColors[...]}>{pick.position}</span>}
    <span className="flex-1 truncate">{pick.player_name}</span>
    {isAuction && pick.price != null && <span>$\{pick.price}</span>}
```

Keeper picks have negative `pick_number` values (per architecture notes in WORKING_STATE.md), but the component renders them without any badge, color differentiation, lock icon, or "KEEPER" label. A kept CMC looks identical to a round-7 pick of a backup QB.

`PickFeed` (live draft `client.tsx` lines 140–196) has the same issue — all picks look the same in the feed.

**Impact:** High for Tyler's keeper league specifically. He needs to see at a glance which of his opponents' picks are locked-in keepers vs. real draft decisions.

---

#### Criterion (f): Dual-mode layouts — auction vs. snake with zero component bleed
**⚠️ PARTIAL PASS**

**What's correct:**
- `isAuction` flag used throughout to conditionally render auction vs snake UI
- `AuctionAdvisor` returns `null` if `state.format !== 'auction'` (line 101)
- `ManualPickEntry` correctly shows Price field for auction, Round display for snake
- `MySquadPanel` conditionally shows budget bar for auction only
- `PickFeed` conditionally shows price for auction only

**What bleeds:**
- `LeagueOverview` uses raw shadcn `Card/Badge` components while the page-level layout uses FFI primitives — design language inconsistency visible between panels
- `AuctionAdvisor` uses raw shadcn `Card` (line 104: `<Card>`) while surrounding page uses `FFICard`
- `ManualPickEntry` uses raw shadcn `Card` — same issue
- Snake concept (`current_round`, `OTC` badge in LeagueOverview) is visible in the shared LeagueOverview that's rendered in both modes — technically not "bleed" since it's conditional, but the component is not cleanly separated
- Setup screen: the league format (auction vs snake) is buried in the dropdown text ("auction / PPR / 12 teams") rather than being a prominent first-class visual choice

**Impact:** Medium. The logic separation is correct. The visual/design bleed is the issue.

---

### Screen 3: Post-Draft Review (`/draft/review/`)

Not audited in depth — not a draft-day critical screen. Passes by default for this evaluation.

---

## Design System Inconsistency Map

| Component | FFI System | Raw shadcn | Notes |
|-----------|-----------|------------|-------|
| `draft/live/client.tsx` (page shell) | ✅ FFICard, FFIButton, FFIBadge | — | Good |
| `ManualPickEntry` | — | ✅ Card, Button, Input, Badge | Needs migration |
| `AuctionAdvisor` | — | ✅ Card, Badge, Button | Needs migration |
| `SnakeAdvisor` | — | (likely shadcn, not read) | Likely needs migration |
| `LeagueOverview` | — | ✅ Card, Badge | Needs migration |
| `PlayerPool` | ✅ FFIPlayerCard, FFIPositionFilters | — | Good |
| `PositionScarcityTracker` | (not read) | (unknown) | Unknown |
| `DraftFlowAlerts` | (not read) | (unknown) | Unknown |
| `setup/client.tsx` | — | ✅ All shadcn | Needs full migration |

---

## Verdict: B — Targeted Redesign

**Redesign these 2 screens / ~4 components before sub-tiers 1-7:**

1. **`DraftSetupClient`** — Add explicit mode selector (FF-258), apply FFI design tokens
2. **`ManualPickEntry`** → Promote to sticky pinned bottom bar in live draft layout (FF-257)
3. **`LeagueOverview` + `PickFeed`** — Add keeper visual distinction (FF-274), migrate to FFI primitives
4. **Connection status** — Expand from 2-state to 3-state indicator with size/readability fix (FF-259)

**Keep as-is (no redesign needed):**
- `PlayerPool` — FFI system applied correctly
- `AuctionAdvisor` / `SnakeAdvisor` logic — format separation is correct
- Page-level layout structure in `live/client.tsx` — grid and column layout is sound
- FFI design tokens and `globals.css` — LOCKED, no changes

**Not blocking (address in sub-tiers 3+):**
- Full migration of `AuctionAdvisor` / `LeagueOverview` shadcn → FFI primitives (cosmetic, not functional)
- Confidence source attribution wiring (FF-271)

---

## Next Steps

Per BUILD_PLAN.md verdict B path:
1. ~~FF-253: Audit~~ ✅ DONE
2. ~~FF-254: Produce this document~~ ✅ DONE
3. FF-255/256: Redesign sprint NOT required (verdict B scope is contained — proceed directly to sub-tiers 1-7 with the targeted fixes already scheduled as FF-257, FF-258, FF-259, FF-274)
4. **Start FF-257** — Promote ManualPickEntry to pinned quick-entry bar
