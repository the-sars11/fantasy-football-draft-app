# Changelog — FFIntelligence

All notable changes tracked here with root cause analysis.

---

## 2026-04-14 (session 6, cont.) — FF-266: Split recommend.ts into auction/snake variants

**Task:** FF-266 (refactor + feature)
**Class:** `pipeline` + `shared` | **Lenses:** Architecture, QA

**Root Cause:** `recommend.ts` handled both auction and snake with a single `fetchRecommendation` function that mixed auction-specific fields (`budgetRemaining`, `consensusAuctionValue`, `maxBid`) into a shared type. The API route prompt branched on `isAuction` inline, producing a diluted prompt for each format. Snake responses returned `maxBid: number` which has no meaning in a snake draft.

**Changes:**
- `src/lib/draft/recommend-auction.ts` (NEW): `LLMAuctionTarget` (has `maxBid`), `LLMAuctionRecommendation`, `fetchAuctionRecommendation`, `clearAuctionRecommendationCache`. Payload uses `consensusValue`/`adjustedValue` (auction values). Cache key prefixed `auction:`.
- `src/lib/draft/recommend-snake.ts` (NEW): `LLMSnakeTarget` (has `pickRound` instead of `maxBid`), `LLMSnakeRecommendation`, `fetchSnakeRecommendation`, `clearSnakeRecommendationCache`. Payload uses `adp`/`consensusRank`/`adjustedRound`. Recent picks include `round`, not `price`. Cache key prefixed `snake:`.
- `src/lib/draft/recommend.ts` (BARREL): Re-exports both modules. `clearRecommendationCache()` clears both caches — `client.tsx` import unchanged.
- `src/app/api/draft/recommend/route.ts`: Replaced single mixed prompt with `buildAuctionPrompts()` (budget-focused, `maxBid` in response) and `buildSnakePrompts()` (ADP/round-focused, `pickRound` in response). Dispatches on `format`. No format bleed.
- `src/components/draft/auction-advisor.tsx`: Imports `fetchAuctionRecommendation + LLMAuctionRecommendation`.
- `src/components/draft/snake-advisor.tsx`: Imports `fetchSnakeRecommendation + LLMSnakeRecommendation`. Target rendering updated to show `Rd {t.pickRound}` instead of `$maxBid`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6, cont.) — FF-264: Per-Player Max Comfortable Bid Display

**Task:** FF-264 (new feature)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** Auction managers had no quick way to see whether their current budget allowed them to bid competitively on a given player. The consensus value is visible, but without knowing their max comfortable bid alongside it, they had to mentally cross-reference the Budget Health Panel to make an on-the-spot decision.

**Changes:**
- `src/components/draft/ffi-player-card.tsx`: Added `maxBid?: number | null` to `FFIPlayerCardProps`. Computed `maxBidDelta = maxBid - player.consensusAuctionValue`. In the value display column, when `isAuction && maxBid != null`, renders "MAX $X" (`text-sm font-bold`) and a colored delta line (`text-[9px]`): green (+$X OVER) when max > consensus by >$2, orange (−$X UNDER) when max < consensus by >$2, muted (AT VALUE) within ±$2. Only shown in auction mode — snake cards unchanged.
- `src/components/draft/player-pool.tsx`: Added `maxBid?: number | null` to `PlayerPoolProps`, threaded through to each `FFIPlayerCard`.
- `src/app/(app)/draft/live/client.tsx`: Added `maxBid={myMaxBid}` to `PlayerPool` call. `myMaxBid` was already computed via `getMaxBidFor(myManager)`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6) — FF-263: Budget Health Panel + FF-265: Auction/Snake Bleed Audit

**Tasks:** FF-263 (new feature) + FF-265 (audit + fix)
**Class:** `output` + `shared` | **Lenses:** QA, Delivery, Architecture

**FF-263 — Budget Health Panel:**

**Root Cause:** Managers drafting in auction had no single at-a-glance view of how their budget was tracking — the existing FF-043 pacing block shows percentages and projections but not raw dollar numbers or slot counts, making it hard to mentally compute "what can I actually bid right now?"

**Changes:**
- `src/components/draft/auction-advisor.tsx`: Added FF-263 derived values (`totalSlots`, `filledSlots`, `remainingSlots`, `healthSpent`, `healthSafeRemaining`, `healthImpliedPerSlot`, `healthDelta`, `healthBurnStatus`) in component body. Added compact "Budget Health Panel" section above the FF-043 block: row 1 = `Spent $X · $Y left` + `N/M slots` (font-mono, tabular-nums); row 2 = `~$Z/slot remaining` + burn rate indicator (`+$X vs avg` green, `−$X vs avg` orange, `≈ avg` muted). Implied $/slot uses getMaxBid reserve logic ($1 per remaining empty slot). Row 2 hidden when no slots remain.

**FF-265 — Auction vs. Snake Bleed Audit:**

**Root Cause:** 12 draft components needed auditing to ensure no cross-mode concept bleed (round/pick-order in auction UI, prices/budgets in snake UI).

**Findings:** 11 files clean. One real bleed:
- `position-scarcity.tsx` has `showSpendRanges = true` default. `calculateScarcityExtended()` in `explain.ts` always populates `spendRange`/`avgValue` from player auction values, regardless of draft format. The call site in `client.tsx` passed no `showSpendRanges` prop → dollar spend ranges appeared in snake mode.

**Changes:**
- `src/app/(app)/draft/live/client.tsx`: Added `showSpendRanges={state.format === 'auction'}` to `PositionScarcityTracker` call.

**Verification:**
- ✅ `npm run lint` — no new errors in changed files (23 pre-existing errors unchanged)
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run build` — `✓ Compiled successfully in 3.7s`, 53 pages

---

## 2026-04-14 (session 5) — FF-262: Position Budget Tracker + FF-261 Audit

**Tasks:** FF-261 (audit, no code changes) + FF-262 (new feature)
**Class:** `shared` + `output` | **Lenses:** Architecture, QA, Delivery

**FF-261 — ESPN Auction Math Audit (no code changes):**
Math confirmed correct — see previous CHANGELOG entry below.

**FF-262 — Position Budget Tracker:**

**Root Cause:** During a live auction, managers have no live view of per-position spending vs. their pre-draft allocation plan. Without this, it's easy to overspend on RBs and arrive at TE/WR needing $30 of value with $8 left.

**Changes:**
- `src/lib/draft/auction-advisor.ts`: Added `PositionBudgetRow` interface + `getPositionBudgetBreakdown()` — iterates QB/RB/WR/TE/K/DST, computes `planned = (alloc% / 100) * budget_total` and `spent` from picks, returns `delta = planned - spent`; DST row matches both 'DST' and 'DEF' pick positions; filters to rows with spent > 0 or planned > 0
- `src/components/draft/auction-advisor.tsx`: Added "By Position" section inside `AuctionAdvisor` between budget-pace block and urgency warnings; shows position badge + mini progress bar + `$spent/$planned` text + colored delta (`+$X` green / `-$X` orange); section hidden when no picks + no plan; `league-overview.tsx` comment added to clear stale Turbopack cache (pre-existing stale error, not introduced here)

**Verification:**
- ✅ `npm run lint` — no new errors in changed files
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run build` — `✓ Compiled successfully in 3.4s`, 53 pages

**Reverse rationale (unchanged):**
- Existing `analyzeBudgetStrategy()` / `getPositionUrgencyWarnings()` — untouched
- `AuctionAdvisorProps` interface — no new props needed (strategy already passed)
- All API routes and DB schema — untouched

---

## 2026-04-14 (session 5 — audit only) — FF-261: ESPN Auction Math Audit

**Task:** Audit `src/lib/draft/auction-advisor.ts` for ESPN $200/15-slot model accuracy
**Class:** `bugfix` (audit — no code changed) | **Lens:** QA

**Findings:** Math is correct. No changes needed.

**Formula verified:**
- `calculateMaxBidAdvice()` lines 44–46: `emptySlots = totalSlots - picks.length - 1`; `absoluteMax = budget_remaining - emptySlots`
- Trace (5 slots filled, $80 remaining, 10 slots left): `emptySlots = 15 - 5 - 1 = 9`; `absoluteMax = 80 - 9 = 71` ✓
- Matches ESPN rule exactly: max bid = budget_remaining - (unfilled_slots - 1)
- `-1` correctly accounts for the player currently on the nomination block (fills one slot, needs no reserve)
- `getMaxBid()` in `state.ts:247` uses identical formula; consistent across both implementations
- No hardcoded slot counts — `totalSlots` always computed dynamically from `state.roster_slots`
- `mgr.budget_total ?? 200` fallback at line 121 is display-only (position budget advisory factor), not the safety constraint — non-$200 leagues unaffected

**Changes:** None (audit only)
- `BUILD_PLAN.md`: FF-261 marked [x] with confirmed-correct note

---

## 2026-04-14 (session 4) — P0 Redesign Sprint (FF-257 revision, FF-258, FF-259, FF-274)

**Task:** Implement all 4 P0 redesign decisions (Verdict B from FF-254 UI eval) + /prep/keepers page
**Class:** `output` + `shared` | **Lenses:** Architecture, QA, Delivery, Design
**Plan:** `docs/superpowers/plans/2026-04-14-p0-redesign.md` | **Spec:** `docs/superpowers/specs/2026-04-14-p0-redesign-design.md`

**Root Cause:** UI eval returned 3 hard FAILs (criteria a/b/e) and 3 partials (c/d/f). This sprint fixes a/b/c/e before P0 sub-tier 1–7 implementation begins.

**Changes:**

**FF-257 revision — Always-open On Block bar + BID button:**
- `manual-pick-entry.tsx`: bar variant rewritten — no collapse/expand; On Block slot replaces search input; price pre-fills from `consensusAuctionValue`; isBarValid gated on onBlockPlayer + manager + price; Undo always visible (disabled when no picks); auction manager defaults to `myManager`
- `ffi-player-card.tsx`: optional `onBid` prop + BID pill button (stopPropagation); 44px touch target
- `player-pool.tsx`: `onBidPlayer` prop threaded to each card; `useCallback` for stable identity
- `live/client.tsx`: `onBlockPlayer` state; `handleBidPlayer` wrapped in `useCallback`

**FF-259 — 4-state ConnectionStatusPill:**
- Created `connection-status-pill.tsx`: LIVE (green, pulsing dot) / STALE (amber) / OFFLINE (red, tap to expand error bar) / MANUAL (gray); 1s tick for elapsed timestamp; error bar auto-hides when state leaves OFFLINE
- `live/client.tsx`: replaced binary Wifi icon pill; always visible regardless of `session.sheet_url`; removed duplicate sheetError banner card

**FF-274 — Keeper visual markers:**
- `lib/draft/keepers.ts`: extracted `isKeeperPick()` + `displayPickNum()` as shared exports
- `live/client.tsx` (PickFeed): K1/K2/K3 numbers, 🔒 after position badge, muted name, no price; composite `manager-picknum` key prevents React key collisions
- `league-overview.tsx`: same keeper markers in expanded pick rows; 🔒 right-aligned replacing price/round

**/prep/keepers — New keeper declaration page:**
- Created `src/app/(app)/prep/keepers/` (page.tsx + client.tsx + loading.tsx)
- `KeeperDeclarationClient`: CRUD for keepers; auto-saves to `localStorage` (key: `ffi_keepers_{leagueId}`); `initialized` ref prevents spurious "Saved" flash on load; only shows keeper-enabled leagues
- `prep/page.tsx`: hub link added via `HubCard` component

**FF-258 — Multi-step draft setup flow:**
- `draft/setup/client.tsx`: 3-step flow — mode selector → league confirm + managers → keeper review
- Step 1: mode cards gate all else; Continue disabled until selection
- Step 2: read-only league confirmation card; Sheets URL shown for sheets mode only; keeper entry block removed
- Step 3: reads declared keepers from localStorage; K1/K2/K3 display with 🔒 and muted names; `handleSubmit(keepersOverride)` avoids React batching issue

**Verification:**
- ✅ `npm run lint` — no new errors in changed files
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run build` — 52 pages compiled

**Reverse rationale (unchanged):**
- All existing API contracts — untouched
- DB schema — no new tables or columns
- `applyKeepersToState()` logic — untouched
- DESIGN_SYSTEM.md Tactical Hologram tokens — untouched
- 27 research pipeline tests — all passing

---

## 2026-04-14 (session 3)

### [FEAT] FF-257 — Sticky pinned ManualPickEntry bar
**Task:** P0 sub-tier 1 first item — promote `ManualPickEntry` to always-visible pinned quick-entry bar at viewport bottom
**Class:** `output` + `shared` | **Lenses:** Architecture, QA, Delivery, Design

**Root Cause:** UI eval (FF-254) verdict-B FAIL on criterion (a). Live draft scrolling — user spots a player in the pool, scrolls down to find them, then has to scroll all the way back to the top to record the pick. Under auction time pressure this is a real failure mode.

**Changes:**
- `src/components/draft/manual-pick-entry.tsx`: Add `variant?: 'card' | 'bar'` prop. `bar` = chrome-less horizontal layout for sticky parent. Adds collapse/expand state, defaults collapsed on mobile (search + price + Record visible) and expanded on desktop (also shows Manager + Undo). Backward compatible: `card` is default. Search results dropdown opens UPWARD (`bottom-full`) so it's visible above the bar. 44px touch targets per FF-269 Tactical Hologram standard.
- `src/app/(app)/draft/live/client.tsx`: Removed `<ManualPickEntry>` from left column. Renders as `position: fixed inset-x-0 bottom-0 z-40` with `ffi-glass-heavy` background + `env(safe-area-inset-bottom)` padding (matches locked HTML prototype `UI/auction_live_draft/code.html:426–462`). Page wrapper now uses `pb-32` to clear bar. Conditional on `state.status !== 'completed'` (no entry needed post-draft).

**Verification:**
- ✅ `npm run lint` — both changed files clean (23 pre-existing errors in unrelated files unchanged)
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run type-check` — clean
- ✅ `npm run build` — `✓ Compiled successfully in 3.5s`

**Reverse rationale (what's NOT changed):**
- Submit logic (`handleSubmit`, `onSubmit` prop contract) — preserved
- Player search filtering (`useMemo` for filtered/available) — preserved
- DESIGN_SYSTEM.md tokens — untouched
- Database schema, API routes — untouched

---

## 2026-04-14 (session 2)

### [DOCS] FF-253/254 — UI evaluation gate complete
**Task:** Audit all live-draft screens against 6 criteria; produce `UI_EVAL_2026.md`
**Scope:** Read-only audit + `.claude/UI_EVAL_2026.md` (new file) + BUILD_PLAN.md checkpoint marks

**Root Cause:** P0 sub-tier 0 requires a UI verdict before any code work begins, to scope whether a full redesign or targeted fixes are needed.

**Findings:**
- 3 hard FAILs: (a) ManualPickEntry not pinned, (b) no mode selector at setup, (e) no keeper visual distinction
- 3 partial FAILs: (c) connection status binary/tiny/conditional, (d) confidence badges exist but no source attribution, (f) design system inconsistency (setup screen and 3 left-column components still use raw shadcn)

**Verdict: B — Targeted redesign.** Scope is contained:
- `DraftSetupClient` → add mode selector + FFI styling
- `ManualPickEntry` → promote to sticky pinned bottom bar
- `LeagueOverview` + `PickFeed` → keeper visual markers
- Connection status → 3-state indicator with size fix
All fixes are already scheduled as FF-257–259, FF-274. FF-255/256 (full redesign sprint) NOT triggered.

**Changes:**
- `.claude/UI_EVAL_2026.md`: NEW — full per-screen audit with evidence
- `.claude/BUILD_PLAN.md`: FF-253/254 marked [x]; dashboard nextItems updated; FF-255/256 marked as skipped

---

## 2026-04-14

### [CHORE] Enterprise dev system upgrade
**Task:** Upgrade `.claude/` to Enterprise tier per overhaul plan
**Scope:** `.claude/` directory only — no `src/` code touched

**Root Cause:** FFI's ad-hoc dev docs were missing navigation indexes, audit trail, review lenses, hooks, and skills that dev-workflow-builder generates at Enterprise tier. BUILD_PLAN.md also treated commercialization as near-term when personal season hardening is the actual P0.

**Changes:**
- `.claude/FEATURES_INDEX.md`: NEW — feature-to-code mapping with tags
- `.claude/CODE_AREAS.md`: NEW — API endpoints, hooks, and key functions index with line numbers
- `.claude/CHANGELOG.md`: NEW — this file
- `.claude/REVIEW_LENSES.md`: NEW — 6 Review Lenses with pre-check + verify checklists
- `.claude/hooks/pre-commit-gate.ps1`: NEW — lint hard gate + test advisory before commits
- `.claude/skills/code-review/SKILL.md`: NEW — /code-review adversarial review skill
- `.claude/settings.json`: NEW — enterprise hook registration (180s timeout)
- `.github/workflows/ci.yml`: NEW — TypeScript CI (lint + type-check + test on push to master)
- `.claude/CLAUDE.md`: MERGED — appended PROPOSE/PATCH/VERIFY workflow, Change Classification (8 types), 6 Review Lenses triggers, Bug Hunt Schedule, Evidence-Based Output Standard, Codebase Navigation Index, Definition of Done
- `.claude/BUILD_PLAN.md`: REWRITTEN — P0-P7 structure: personal season hardening as P0, Auctioneer integration as P1, pre-season validation as P2, commercialization deferred to P3+ (CONDITIONAL with explicit gates)
- `.claude/WORKING_STATE.md`: UPDATED — enterprise sections added (Last 48h, What Works/Broken, Blockers, Sheets setup, Commands reference)

**Testing:**
- Verified git diff shows no src/ changes
- CLAUDE.md search confirmed: PROPOSE, PATCH, VERIFY, Review Lens, Bug Hunt present
- BUILD_PLAN.md confirmed: P0→P7 structure, Gate: lines on P3-P7

**Result:** ✅ Enterprise tier active
**Commit:** [see git log]

---

## Entry Types

- `[FEATURE]` - New functionality
- `[FIX]` - Bug fix
- `[REFACTOR]` - Code reorganization (no behavior change)
- `[DOCS]` - Documentation only
- `[TEST]` - Test additions/updates
- `[CHORE]` - Dependencies, config, tooling

---

## Prior Work (Summary)

Phases 0–8 complete as of 2026-03-22 to 2026-04-14. Full history preserved in `BUILD_PLAN.md` Completed Work section. Highlights:
- Phase 0-2: Foundation + data pipeline + strategy engine
- Phase 3: Live draft mode (auction + snake)
- Phase 4-5: Polish + custom scoring intelligence
- Phase 6-7.5: FFIntelligence UI redesign (Tactical Hologram) + Player Intelligence System
- Phase 8: In-season AI companion (start/sit, waiver, trade, alerts)
