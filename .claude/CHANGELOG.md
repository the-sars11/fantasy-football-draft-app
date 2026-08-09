# Changelog — FFIntelligence

---

## 2026-08-09 / Code-review finding 13: connection-pill a11y (size + per-state glyph)

**Task:** CODE_REVIEW_2026-06 finding 13 (P1, A11y/mobile) | **Class:** `output` (UI) | **Lenses:** Design, QA

**What changed:**
- `src/components/draft/connection-status-pill.tsx`: fixed the arm's-length legibility gap flagged in the June review. (1) The connection state was distinguished only by color plus the word; added a per-state Lucide glyph so shape carries the meaning too: LIVE `Radio`, STALE `Clock`, OFFLINE `WifiOff`, MANUAL `Keyboard` (14px, `strokeWidth 2.5`, `aria-hidden` since the label text already conveys state to screen readers). The glyph replaces the old color-only 8px dot. (2) Bumped the state label 11px->13px and the elapsed-time text 9px->11px (opacity 0.65->0.70) so both clear the review's ">=13px" bar / stay readable. (3) The LIVE pulse moved from `animate-pulse` to `motion-safe:animate-pulse`, so it now respects reduced-motion (consistent with the live room's dial-down policy).

**Scope discipline:** one component file. No prop/API change (signature identical), no behavior change to the state machine (`getConnState` untouched), no other files. The error-bar block and retry/dismiss targets were left as-is (already 44px from FF-269).

**Verify result:** `npm run type-check` (`tsc --noEmit`) 0 errors; `npx eslint src/components/draft/connection-status-pill.tsx` clean (0 errors, 0 warnings); `npm run test:run` 40/40 pass; `npm run build` `✓ Compiled successfully in 4.0s`, `/draft/live` present in route list. Live DOM proof against the running dev server (`/draft` hub): pill in LIVE state renders `svg.lucide-radio flex-shrink-0 motion-safe:animate-pulse` at 14x14, label computed `font-size: 13px`, elapsed `font-size: 11px`. Pixel screenshot blocked in this environment (Browser pane not compositing), so render verified via computed-style DOM read, per the documented limitation. Zero em/en-dashes in changed code or this entry. No paid endpoints fired.

---

## 2026-08-09 / UXV2-8: final UX-V2 VERIFY + DESIGN docs reconciled (closes UX-V2 track)

**Task:** UXV2-8 | **Class:** `docs` | **Lenses:** Delivery, QA

**What changed:**
- `.claude/DESIGN_SYSTEM.md`: added a v3.1 Version History row and a new "Shipped Live Auction Room (UXV2-6/7)" section documenting the room as-built: its locally-scoped `theme.ts` `ROOM` palette (canvas `#060c14`; four color-coded moves - lime-volt `#d4ff00` BID, amber-gold `#f5a623` HOLD/moment, orange `#f97316` PUSH, red `#dc2626` PASS), the lean/no-filter performance stance (no framer-motion, no keyframes, no backdrop-filter, no will-change; audited 0 across 735 room elements), and the reduced-motion DIAL-DOWN policy (cross-fades halve to 75ms, `active:scale` neutralized). Added reconciliation notes at the three spots that previously contradicted the shipped room: the "NO gold" What-NOT-to-Do bullet (now notes the room's single scoped-gold exception), the "Motion is FIRST-CLASS" section (now flagged as the aspirational global system, not the shipped room), and the reference-mockup line (now points at the approved v4 mockup `draft-room-v4-two-screen.html` + `theme.ts`).
- `.claude/UI_DESIGN_SPEC.md`: added a top "Live Auction Room as-built" banner (overrides the general spec inside `/draft/live`: scoped palette, no Framer Motion in the room, dial-down reduced-motion) and updated the Section 13 reduced-motion line to record the room's dial-down exception vs the app-wide strict-off.
- `.claude/BUILD_PLAN.md`: UXV2-8 marked `[x]`; noted it closes the UX-V2 track.

**Scope discipline:** docs-only. No source files changed this session. Docs were made to match the code that already shipped in UXV2-6/7; no new design scope invented. Palette/motion claims were verified against `src/components/draft/live-room/theme.ts`, a grep of the live-room component dir (only motion present is one `motion-safe:animate-pulse`), and the `.ffi-live-room` reduced-motion block in `src/app/globals.css` (lines ~937-946).

**Verify result (full UX-V2 track):** `npm run type-check` (`tsc --noEmit`) 0 errors; `npm run lint` 27 errors + 98 warnings, all pre-existing in untouched research-pipeline / supabase files (0 new - no source changed); `npm run test:run` 40/40 pass; `npm run build` `✓ Compiled successfully in 4.0s`, `/draft/live` present in the route list. Zero em/en-dashes in the added doc text (verified by grep). No paid endpoints fired.

---

## 2026-08-09 — UXV2-7: reduced-motion dial-down + perf/arm's-length pass

**Task:** UXV2-7 | **Class:** `output` (UI) | **Lenses:** Design, QA

**What changed:**
- `src/app/globals.css` — new scoped `@media (prefers-reduced-motion: reduce)` block (right after the existing reduced-motion block) implementing Joe's DIAL-DOWN rule for the live auction room, not strict-off: `.ffi-live-room *, .ffi-live-room ::before, .ffi-live-room ::after { transition-duration: 0.075s !important; }` keeps cross-fades (color/opacity) but halves them from Tailwind's 150ms default; `.ffi-live-room :active { transform: none !important; }` neutralizes the `active:scale-90`/`active:scale-95` transform tap-feedback. Commented to record that the room has no framer-motion, no entrance keyframes, no persistent glows (the LIVE dot pulse is already gated by its `motion-safe:` variant), and no animating background/filter layers (so there is no `will-change` to release).
- `src/components/draft/live-room/auction-room.tsx` — added the `ffi-live-room` class to the room root so the scoped block can target the whole room subtree (including the Research view and the block-picker sheet). className only; no layout change.

**Performance / arm's-length:** the room ships lean by construction. Live-DOM audit across 735 room elements: 0 CSS `filter` layers, 0 `backdrop-filter` layers, 0 animated `box-shadow` transitions, 0 elements holding `will-change`. That absence is exactly why the room composites smoothly and does not reproduce the old build's heavy-filter-stack non-compositing failure. Mobile 375px: no document horizontal overflow, room fits at 343px, no inner horizontal overflow; primary decision text 15-22px (the 8.5-9.5px items are the locked v4 uppercase micro-labels and position badges, left as-is since the layout is locked).

**Verify result:** `tsc --noEmit` 0 errors; ESLint clean on `auction-room.tsx` (globals.css is not linted); `npm run test:run` 40/40 pass; `npm run build` `✓ Compiled successfully`, `/draft/live` in the route list. Live proof on the running dev server (:3003, `?sim=1`): the two dial-down lines are present in the browser's parsed CSSOM; toggling the shipped rule's media condition to always-on drove real computed styles from `0.15s` -> `0.075s` on a `transition-opacity` cross-fade element AND on a `transition-transform` element, then restored to `0.15s` with the media condition back to `(prefers-reduced-motion: reduce)`; all 80 ResearchView `active:scale-90` tap buttons are inside `.ffi-live-room` and covered by the transform-neutralize rule; the LIVE dot uses `motion-safe:animate-pulse` (stops under reduced-motion). The Browser pane is 0x0 / non-compositing so pixel screenshots are unavailable (same documented limitation as UXV2-6); render + behavior verified via live DOM reads. No paid endpoints fired.

---

## 2026-08-09 — UXV2-6 (part 2): Research-tab draft-mode screen

**Task:** UXV2-6 | **Class:** `output` (UI) + `shared` | **Lenses:** Design, QA, Architecture

**What changed:**
- `src/components/draft/live-room/research-view.tsx` (NEW) — the Research tab as an internal room view (not a route change), from the locked v3 Phone 2 layout with Recent Sales removed per the v4 sign-off. Top to bottom: sticky on-the-block mini strip (position badge + name + tier chip + target star + team/bye meta, then range + inline record) → filter bar (position pills All/QB/WR/RB/TE/DEF + ★ Target View) → available player list (star toggle, position badge, name + optional real-data signal chip, tier chip, range or `AVOID` with dim + strikethrough) → tappable Tier Context (reuses `TierContext`) that filters the list above. Inline record reuses the shared `addManualPick` (price input + team dropdown defaulting to the user + RECORD). Signal chip renders only from real `player.analysis` (SLEEPER/RISK/VALUE) so nothing is fabricated when a research run has not populated it. Same dev-cache guards as the Draft tab: tier → `NR` when `consensusTier` is missing/NaN, ranges floored to the `$1` auction minimum, bye omitted when absent.
- `src/components/draft/live-room/bottom-nav.tsx` — Research/Draft now switch an internal room view via a new `onSelectView` callback (with an exported `TabKey`); Review/Setup still navigate. Active tab is driven by the room's current view.
- `src/components/draft/live-room/auction-room.tsx` — added a `view: 'draft' | 'research'` state; renders `ResearchView` vs the existing draft body; gates the bottom record bar to the Draft view (Research has its own inline record); threads `managerNames`/`myManager`/`onRecordPick`/`onToggleTarget` and drives `BottomNav active={view} onSelectView`.
- `src/app/(app)/draft/live/client.tsx` — added `useToggleTag` + an `onToggleTarget` handler (toggle the target tag, then `refetch` user tags so the list star updates); threads `managerNames`, `myManager`, `onRecordPick={addManualPick}`, `onToggleTarget` into `AuctionDraftRoom`.
- `src/hooks/use-user-tags.ts` — `refetch` now forces a re-read (new `force` bypass on the `lastFetchedRef` cache guard) so a star toggle reflects immediately; signature unchanged (`() => Promise<void>`).

**Fixed during verify:** the player rows first nested the star `<button>` inside the row `<button>` (invalid HTML → hydration error). Restructured so the star and the tap-target are sibling buttons inside a `div` (confirmed `document.querySelectorAll('button button').length === 0`, no hydration warning after reload).

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 errors/0 warnings on all 5 changed files (repo's 27 pre-existing errors are all in untouched research-pipeline files); `npm run test:run` 40/40 pass; `npm run build` `✓ Compiled successfully`, `/draft/live` in the route list. Live DOM proof (dev server :3003, `?sim=1`): bottom-nav Research switches the internal view (active tab = Research); empty on-block prompt shows; tapping a row sets the block and prefills the inline record (price + the user's manager); RECORD fired `addManualPick` (available 255→254, sim picks 83→84, player left the list, block cleared); QB pill filtered to 21 QBs; the RB tier-context badge filtered to 70 RBs; ★ Target View toggled to pressed with the correct empty state; zero nested-button hydration errors. Star **persistence** is not exercisable in sim (the demo session's `demo-league` id is not a valid league UUID, so the PATCH is rejected by the DB — the toggle is correctly wired and works against a real league). No paid endpoints fired. Pixel screenshots blocked (Browser pane not compositing frames); render verified via live DOM text.

---

## 2026-08-09 — UXV2-6 (part 1): Live Auction Draft Room rebuild

**Task:** UXV2-6 | **Class:** `output` (UI) + `shared` | **Lenses:** Design, QA, Architecture

**What changed:**
- `src/components/draft/live-room/` (NEW) — decision-first live auction room from the approved v4 mockup. Components: `auction-room.tsx` (composer), `status-bar.tsx` (Leave · LIVE/OFFLINE + elapsed · league chip), `on-the-block-card.tsx` (hero + What-To-Do block), `awareness-strip.tsx`, `budget-strip.tsx`, `tier-context.tsx` (tappable), `my-team-roster.tsx` (compact, bottom), `bottom-nav.tsx` (4-tab; room supplies its own because the app shell strips nav on `/draft/live`), `block-picker-sheet.tsx` (fast search + one-tap shortlist), `theme.ts` (locally-scoped amber-gold + lime-volt palette to avoid the app's green/gold conflict).
- `src/lib/draft/what-to-do.ts` (NEW) — pure decision brain: turns the on-block player into one directive move (HOLD gold / BID volt / PUSH orange / PASS red) + a cap + one plain-English rationale (no jargon, no em/en dashes). Reuses existing engine outputs (ScoredPlayer, PositionScarcityExtended, strategy max bid, hard budget ceiling); no LLM, no network. Guards: tier → `UNRANKED` when source data is missing/NaN, and all displayed dollar caps floored to the $1 auction minimum so missing-value data never renders `$0`.
- `src/lib/draft/__tests__/what-to-do.test.ts` (NEW) — 11 unit tests covering the PASS > PUSH > HOLD > BID precedence with realistic fixtures.
- `src/app/(app)/draft/live/client.tsx` — early `if (isAuction) return <AuctionDraftRoom .../>` branch; Tyler's snake path falls through to the existing layout byte-for-byte unchanged. `simHud`/`recordBar` hoisted to shared variables. Every secondary panel (advisor, strategy, scarcity, injuries, tendencies, league overview, pivots, trash talk, player pool) preserved in a mount-on-open "More tools" section, so no paid `/api/draft/recommend` fires until Joe opens it.
- `on-the-block-card.tsx` / `block-picker-sheet.tsx` — missing `byeWeek` now omits the "Bye" segment instead of printing a dangling "Bye ".

**Verify result:** `npm run build` — `✓ Compiled successfully in 4.0s`, `/draft/live` in the route list. `npx vitest run what-to-do.test.ts` — 11/11 pass. `npm run type-check` (`tsc --noEmit`) — 0 errors. Live DOM proof (dev server :3003, sim mode, mobile 375): full room renders top-to-bottom; setting a player on the block renders the On-the-Block hero with `UNRANKED` (was `TNaN`), the omitted-bye meta (was dangling `Bye `), and the What-To-Do block `HOLD · bid only under $1 · Brandin Cooks ($1 to $1)...` (was `$0`). No paid endpoints fired (sim suppresses AI). Pixel screenshots blocked (Browser pane not compositing frames); render verified via live DOM text. Remaining in UXV2-6: Research-tab draft-mode screen.

---

## 2026-08-08 — UX-S6: Review tab wired to post-draft flow

**Task:** UX-S6 | **Class:** `output` | **Lenses:** Delivery, QA, Design

**What changed:**
- `src/app/(app)/draft/live/client.tsx` — Removed `isSimActive` guard from the auto-navigate effect so real completed drafts (not just sim) route to `/draft/review?session=<id>`. Sim mode remains blocked because `sessionId` is null when `?sim=1` (no `?session=` param). Leave button now routes to `/draft/review?session=<id>` when draft is complete, otherwise `/draft`.
- `src/app/(app)/draft/review/page.tsx` — Removed the server-rendered header; header ownership moved to `ReviewClient` (consistent with UX-S3+ pattern). Only the Suspense wrapper remains.
- `src/app/(app)/draft/review/client.tsx` — Added `useSearchParams` + `paramSessionId = searchParams.get('session')`. Updated `fetchSessions` effect to prefer the URL param over auto-selecting the first session. Restructured render from multiple early-return branches to a single unified return containing: "Review" h1 header + volt session-date chip, "Back to Draft" `ChevronLeft` link, inline loading/error/empty states (empty: "No completed draft yet — Your grade shows up here after draft night."), and session selector hidden when `paramSessionId` is set. Also cleaned pre-existing lint issues: removed dead imports (`ChevronDown`, `cn`, `FFICard`, `FFIButton`, `FFIGrade`, `FFISectionHeader`) and replaced 3 `as any` casts with `as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"`.

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 problems on all 3 changed files (0 errors, 0 warnings). Live DOM verified against dev server (port 3003): `/draft/review` renders "Review" heading + "Back to Draft" link + empty state ("No completed draft yet / Your grade shows up here after draft night.") on both mobile 375 and desktop 1440. Review tab active in sidebar (`bg-[var(--ffi-gold)]/10 text-[var(--ffi-gold-bright)]`) and bottom nav (`text-[var(--ffi-gold-bright)]`) confirmed via JavaScript DOM query. No paid endpoints fired. Pre-existing ThemeToggle hydration warning unchanged (logged FFT-002, non-blocking). Pixel screenshots blocked (Browser pane not compositing); render verified via live DOM.

---

## 2026-08-08 — UX-S5: Setup tab + data correctness

**Task:** UX-S5 | **Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**What changed:**
- `src/app/(app)/settings/page.tsx` — complete rebuild. Server Component; fetches `user` via `getUser()` (real Supabase auth, no hardcoded email) and league summary from Supabase. 5 sections: LEAGUE (-> /prep/configure with live league summary or "Not configured yet"), DRAFT (Draft Setup -> /draft/setup + Demo Draft -> /draft/live?sim=1 with "Dev" badge), HISTORY (Run History -> /prep/runs), ACCOUNT (inline Name/Email from user metadata + SignOutRow), APPEARANCE (ThemeRow). Helper components: `SectionLabel`, `SettingsGroup`, `NavRow` (Link-based, label/value/badge/chevron), `InfoRow` (label+value, no nav). Footnote: "Demo Draft launches a sim against real player data. No AI calls fired."
- `src/app/(app)/settings/client.tsx` (NEW) — `ThemeRow` with `mounted` state guard (useState/useEffect) to prevent hydration mismatch; renders button only after client mount. `SignOutRow` using `signOut` form action from `@/app/(auth)/actions`.
- `src/components/prep/league-config-form.tsx` — major cleanup. Removed snake format toggle, keeper settings section, Keeper/Tyler presets. Format locked to `'auction'` (static display "Auction (Nasties)"). Nasties roster defaults corrected: QB:1, RB:1 (was 2), WR:1 (was 2), TE:1, FLEX:3 (was 1), K:0 (was 1), D/ST:1, Bench:5 (was 6), IR:1 (was 0). League name defaults to "The Nasties". `keeper_enabled` hardcoded `"false"`, `keepers` hardcoded `"[]"`. Success redirect changed from `/prep/research` to `/settings`. Reset button relabeled "Reset to Nasties defaults".
- `src/app/(app)/prep/configure/page.tsx` — added `<- Setup` back link to `/settings`; updated title to "League Config"; updated description to "The Nasties defaults are pre-filled. Edit as needed and save." (removed em-dash that was triggering lint).
- `src/app/(app)/draft/setup/page.tsx` — added `<- Setup` back link to `/settings`; updated to `ffi-display-md`/`ffi-body-md` tokens.
- `src/app/(app)/draft/setup/client.tsx` — empty state and "Wrong format?" link now route to `/settings` (was `/prep/configure` dead-end); added "Go to Setup -> League Config to add The Nasties." sub-copy.
- `src/app/(app)/prep/runs/page.tsx` — added `<- Setup` back link to `/settings`.

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 errors on all changed files. Live DOM verified against dev server (port 3003): `/settings` all 5 sections + real Supabase user email + correct nav targets; `/prep/configure` Nasties defaults auto-seeded (QB:1 RB:1 WR:1 TE:1 FLEX:3 K:0 D/ST:1 Bench:5 IR:1); `/draft/setup` back link present; `/prep/runs` back link + empty state. No paid endpoints fired (`/api/research`, `/api/strategies/propose` never called). Pre-existing sidebar ThemeToggle hydration warning (logged FFT-002, non-blocking) unchanged. Pixel screenshots blocked (Browser pane not compositing); render verified via live DOM.

---

## 2026-08-08 — UX-S4: Draft tab = live auction room + FF-314 cross-device auto-connect

**Task:** UX-S4 | **Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**What changed:**
- `src/app/(app)/draft/page.tsx` (blueprint 9.5, pre-Go-Live) — full rebuild. ONE hero = a large centered 4-state `ConnectionStatusPill` + plain-words status ("Checking for a live auction…" / "Auctioneer is LIVE" / "Auctioneer not detected yet"), an expandable error + Retry, a primary **Go Live** CTA (volt when the feed is detected, subdued "Waiting for auctioneer…" / "Checking…" otherwise), and a secondary **Start in Manual mode** text link. Below it a pre-flight card (league name + managers / budget / scoring) with Edit-in-Setup → `/prep/configure`. Full `loading` / `no-league` / `error` states. Go Live routes to the resumable auction session with `&aif=remote`; Manual routes to the same session with no `aif`.
- `src/components/layout/app-shell.tsx` (blueprint 9.6, full-screen room) — added `isLiveRoom = pathname.startsWith('/draft/live')`; hides the desktop sidebar, the mobile top header, and the mobile bottom tab bar on the live room, and bypasses the `SwipeCarousel` there so a stray horizontal swipe can't navigate out mid-auction. The room owns its own single "Leave" affordance.
- `src/app/(app)/draft/live/client.tsx` — added a "Leave" button (top-left, `ChevronLeft` → `/draft`). Translated the `?aif=` param so `aif=remote` leaves the same-device connection type null (the remote proxy runs automatically for every auction); only `localstorage` / `file` stay same-device. Rewired the header `ConnectionStatusPill` to reflect the remote proxy (`remoteLastSyncAt` / `remoteError` / `remoteRetry`) for an internet auction with no sheet, else the sheet poll — so Tyler's snake/Sheets MANUAL behavior is unchanged.
- `src/app/api/auctioneer-feed/route.ts` (NEW) — server-side GET proxy that fetches the deployed auctioneer's state to dodge CORS (auctioneer sends no CORS headers). `force-dynamic`, 5s timeout, wraps the raw `DraftState` body in `{ state }`, returns `{ state: null }` on empty/error, all `no-store`. Upstash `draft-current` key; picks at top-level `picks[]`, teams at `config.teams[]`, phase at top-level `phase`.
- `src/hooks/use-remote-auctioneer-feed.ts` (NEW) — polls the proxy every ~3s; `isLive` when `phase === 'drafting'` or picks are present. Interruption handling keeps last-known state, surfaces `error`, and backs off 3→6→12s (cap 15s), resetting to 3s on success. Per-session dedup by the auctioneer's pick id; `retry()` forces an immediate poll (wired to the chip's Retry).
- `src/hooks/use-draft-feed.ts` — folded the remote proxy in as a NEW SOURCE (not a new mode): one cross-source merger dedups by synthesized player-name pickId so a player is never double-added across same-device + remote paths. `remoteEnabled = isAuction`. Fixed a `react-hooks/refs` lint error by syncing the latest `onNewPicks` in a `useEffect` instead of during render.
- `src/lib/draft/auction-feed-merge.ts` — added `'remote'` to the `FeedSource` union.

**Cost constraint (FF-314):** the proxy hits Upstash reads only (free). The paid POST endpoints (`/api/research`, `/api/strategies/propose`) were never fired during verification — network log shows only `/api/auctioneer-feed`, `/api/players`, `/api/leagues`, `/api/draft/sessions` (all GET reads).

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 errors on all 7 changed files. Dev server (port 3003) compiled clean — no server errors. Render proof with real Nasties data on both mobile 390 and desktop 1440: pre-Go-Live shows OFFLINE chip + "Waiting for auctioneer…" + pre-flight (12 managers · $200 · Full PPR) with the sidebar kept on desktop; the live room confirms full-screen (no tab bar, no sidebar, "Leave" present) on both widths. Two pre-existing, out-of-scope issues flagged (not fixed): a dev-only React hydration warning that also appears on `/prep` (global theme-class mismatch), and `POST /api/user-tags/batch → 500` in the live room (existing `useUserTags` hook). Pixel screenshots were blocked in this environment (Browser pane not displayed); render verified via live DOM against the running server.

---

## 2026-08-08 — UX-S3: Research tab consolidation (GRIDIRON rebuild)

**Task:** UX-S3 | **Class:** `shared` | **Lenses:** Architecture, QA, Design

**What changed:**
- `src/app/(app)/prep/page.tsx` (9.1 Research landing) — killed the card-dump. The Research Run panel is now the ONE hero with a single explicit "Run Research" button (the AI-cost tap guard) and an inline "uses AI, runs only when you tap" hint. Added quiet jump-rows to Players / Board / Strategies and a latest-run highlights strip. Full loading / empty / error states. Removed dead `runCount` state.
- `src/app/(app)/prep/players/client.tsx` (9.2 Player Browser) — search + filter hero, result-count header chip, tap-to-expand rows, target/avoid toggle. No-players state deep-links to Run Research; filters-match-nothing shows Clear filters; load error shows a graceful card + Retry. `fetchPlayers` moved to `useCallback` for the Retry path.
- `src/app/(app)/prep/board/client.tsx` (9.3 Draft Board) — ranked board hero + meta strip (format / strategy / player count / refresh) + filter/sort pills. Removed the league picker (single Nasties league). Real empty state with deep-link; graceful error + Retry replacing the old "Failed to fetch leagues" dead-end.
- `src/app/(app)/prep/strategies/client.tsx` (9.4 Strategies) — active-strategy hero (name + archetype + budget-by-position bars, from `budget_allocation` or `position_weights` mapped to dollars) + editable saved list. Demoted Dry Run to a quiet power-tool row. Genuine "No strategy yet" empty hero. `fetchLeagues` moved to `useCallback` for Retry.
- `src/app/(app)/prep/players/page.tsx` + `src/app/(app)/prep/strategies/page.tsx` — stripped the wrapper-level headers so the client GRIDIRON header (with the count / Nasties chip) is canonical. Fixes a double-header bug found during screenshot verify (board/page.tsx already deferred correctly).

**Palette / lint:** all four screens repainted off the old palette onto GRIDIRON CSS vars (volt `--ffi-volt`, blue `--ffi-blue-bright`, ink scale, surfaces, hairlines). Coral for avoid/bust = `#FF6E8A`. Two en/em-dash ESLint errors introduced mid-build were fixed to colon/period (the `no-restricted-syntax` dash ban is a hard error).

**AI-cost guard:** the paid POST endpoints (`/api/research`, board Refresh, `/api/strategies/propose`) were never fired during verification. Only GET reads ran.

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 errors on all 6 changed files. 8 Playwright screenshots captured against the running dev server (each of the 4 screens x mobile 390x844 + desktop 1440x900) with real connected data (3,128-player pool on prep, 282 in the Players pool, 425 real ranked players on the Board, genuine "No strategy yet" empty for the Nasties). Single header confirmed on every screen post-fix.

---

## 2026-08-08 — UX-S2.5: Per-screen UX layout blueprint (docs only)

**Task:** UX-S2.5 | **Class:** `docs` | **Lenses:** Delivery

**What changed:**
- `.claude/UX_OVERHAUL_2026-08.md` — appended **Section 9: Per-screen layout blueprint** — the contract UX-S3..S6 build to. Global mobile-first frame conventions (9.0: one hero per screen, thumb-zone primary action, permanent tab bar except the full-screen live room, mandatory loading/empty/error states on every data surface) plus a blueprint for all 14 screens: Research landing (9.1), Player Browser (9.2), Draft Board (9.3), Strategies (9.4), Draft pre-Go-Live (9.5), live auction room (9.6), Review (9.7), Setup landing (9.8), League Config (9.9), Draft Setup (9.10), Run History (9.11), Account (9.12), Appearance (9.13), plus Parked-out-of-scope (9.14). Each screen defines its ONE hero, top-to-bottom section order, single primary action + secondary demotions, empty/loading/error states, and tap-flow in/out.
- Grounded in the real routes confirmed on disk 2026-08-08 (`/prep`, `/prep/players`, `/prep/board`, `/prep/strategies`, `/prep/runs`, `/prep/simulate`, `/draft`, `/draft/live`, `/draft/setup`, `/draft/review`, `/settings`) and the locked Nasties config from `FANTASY_FOOTBALL_MASTER.md` (12 · $200 · Full PPR · QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1 · 13 draftable · no keepers). Blueprint explicitly retires the known broken states (Board "Failed to fetch leagues", Draft Setup "No leagues configured", Account propermuse.co leak, wrong roster default, Draft sounds toggle) into their fixed target states, scheduled for S3/S5.
- `.claude/BUILD_PLAN.md` — marked UX-S2.5 `[x]`; `DASHBOARD_STATUS.nextItems` advanced to UX-S3 (build to blueprints 9.1-9.4).

**Verify result:** Docs-only session — no code touched, no route files moved, no slugs renamed. No build/test/lint applicable. Section 9 written and BUILD_PLAN advanced.

---

## 2026-08-08 — UX-S2: 4-tab IA reskeleton (nav only)

**Task:** UX-S2 | **Class:** `shared` | **Lenses:** Architecture, QA

**What changed:**
- `src/components/layout/app-shell.tsx` — replaced the 3-tab nav (Home/Draft/Settings) with the locked 4-tab IA: **Research** (`/prep`, Search icon), **Draft** (`/draft`, Zap), **Review** (`/draft/review`, Trophy), **Setup** (`/settings`, Settings). Applies to both the desktop sidebar and the mobile bottom tab bar. Added `getActiveHref()` longest-prefix matcher and swapped both `pathname.startsWith` active checks to `item.href === activeHref` so nested routes resolve to one tab.
- `src/components/layout/swipe-carousel.tsx` — same 4 sections (sets swipe order + dot indicators); added `activeSectionIndex()` longest-prefix matcher replacing the first-match `findIndex`.
- No visual polish, no content rebuild, no route-file moves. URL slugs still point at existing routes; slug + content cleanup happens as each tab is rebuilt in UX-S3..S6.

**Why longest-prefix:** `/draft/review` startsWith `/draft`, so the old first-match logic would light up Draft on the Review page. Longest-prefix makes `/draft/review` → Review and `/draft`,`/draft/live`,`/draft/setup` → Draft.

**Verify result:** typecheck 0 errors; ESLint 0 errors on both changed files (2 pre-existing warnings untouched). Nav + active-state proven via Playwright screenshots at 1440×900 (desktop sidebar) and 390×844 (mobile bottom bar + carousel dots), both nested directions (`/draft`→Draft, `/draft/review`→Review). Note: the Review page still shows "Failed to load sessions" — pre-existing broken data layer, scheduled for UX-S5/S6, not a nav regression.

---

## 2026-08-07 — FF-314 planned: remote/cross-device auctioneer live sync

**Task:** FF-314 (plan add only — no code) | **Class:** `docs` | **Lenses:** Delivery

**What changed:**
- `.claude/BUILD_PLAN.md` — added **P1 Sub-tier 1b** and item **FF-314** for over-the-network sync to the deployed auctioneer. Existing FF-279–283 wire the auctioneer feed only same-device (BroadcastChannel / local JSON); FF-314 adds the cross-device path (host laptop + Joe's phone on different origins). Counterpart to the auctioneer's `AA-FFI-2`.
- Contract captured from the `fantasy_auction_auctioneer` repo as-built AND verified live against the deployed `/api/state` (2026-08-07): the body IS the auctioneer `DraftState` directly (NO envelope) from Upstash key `draft-current` (single active draft, 24h TTL); picks at top-level `picks[]`, teams at top-level `config.teams[]`, lifecycle at top-level `phase`/`pickNumber`.
- Load-bearing design decision recorded: the auctioneer route sends no CORS headers, so FF-314 fetches it through a THIS-repo server-side proxy (`src/app/api/auctioneer-feed/route.ts`) — ships with zero auctioneer-side change, and folds remote picks into the existing `auction-feed-merge.ts` / `use-draft-feed.ts` dedup so it's a new source, not a new mode. Auction-only gating unchanged.
- `DASHBOARD_STATUS` header — added `P1b` milestone (`done: false`).

---

## 2026-06-06 — UXV2-5: Post-Draft Review GRIDIRON rebuild

**Task:** UXV2-5 | **Class:** `output` | **Lenses:** Design, QA

**What changed:**
- `src/app/(app)/draft/review/client.tsx` — full visual rebuild. New `gradeColors` map: volt for A, blue-bright for B, warning for C/D, danger for F (no gold anywhere). New `verdictConfig` with GRIDIRON palette. `GradeHero` uses `.ffi-hero` card + Anton grade letter + grade-colored ring + glow blob + ffi-caption verdict label + mono score. 2x2 `StatTile` grid with 36px JetBrains Mono numbers (volt/danger/blue by type). `SwCard` two-column strengths/weaknesses with 5px dot bullets. `SectHeader` with hairline divider. `PickCard` uses `ffi-card-interactive` + `ffi-badge-*` position chips + mono price+delta + verdict pill badge. `PositionalPowerRankings` segments colored volt (score>=80) / blue (>=50) / danger (<50). `BudgetAnalysisCard`, `SnakeAnalysisCard`, `TagAccuracyCard`, `MiniStat`, `TagPillGroup` all updated to GRIDIRON palette. View tabs use blue/danger active states. Session/manager selects styled as compact `ffi-input` row. All data logic (hooks, effects, memos, analyzeDraft) untouched.
- `src/app/(app)/draft/review/page.tsx` — updated to GRIDIRON eyebrow (`ffi-caption`) + Saira Condensed title header.

**Verify result:** type-check clean (0 errors). Page renders: GRIDIRON header + empty state card confirmed via preview screenshot.

---

## 2026-06-06 — UXV2-4: Draft Board / Player Pool GRIDIRON rebuild

**Task:** UXV2-4 | **Class:** `output` | **Lenses:** Design, QA

**What changed:**
- `src/components/prep/draft-board-table.tsx` — full rewrite. Removed shadcn primitives + old sort UI. New `PositionChip` (color-coded per position: QB red, RB green, WR blue, TE amber, K purple, DEF gray). New `PlayerCard`: rank (22px mono, blue-bright for top-24/blue for rest), position chip, name+team+bye, 3px score bar (volt fill 75+, blue-bright 55-74, muted below), value ($XX or Rd X at 20px mono) + ADP inline, chevron expand. Expanded state: insight panel with confidence meter gradient bar, target/avoid toggle buttons, 4-cell stats grid (ECR/ADP/Range/Bye). Target badge (volt glow pill) + avoid badge (red pill) inline on card. Boost tags (blue-tinted pills). Opacity 58% for avoid players. Left border 2.5px volt for targets.
- `src/app/(app)/prep/board/client.tsx` — full rewrite. Replaced shadcn `Tabs` with custom tab buttons (blue active fill). New filter bar: position pills (ALL=blue-fill active; pos pills show position color text+border; box-shadow glow on active pos pill). Sort pills row (Score/Value/Rank/ADP with ArrowUp/Down indicator). Target cycle filter button (all→target→avoid→all, color-coded per state). ADP movers redesigned as horizontal scroll chip strip with position color + name + TrendingDown + divergence number. Meta strip: compact league Select + format badge (blue) + strategy badge (volt) + player count + refresh pill button. All error/loading/empty states updated to palette-correct colors.
- `src/app/(app)/prep/board/page.tsx` — stripped to bare `<DraftBoardClient />` (old h1/p wrapper removed).
- `.claude/mockups/draft-board-phone.html` — approved phone mockup (locked).

**Verify result:** type-check clean (0 errors), `next build` passes, `/prep/board` in build output.

---

## 2026-06-06 — UXV2-2b: Motion System (GRIDIRON foundation)

**Task:** UXV2-2b | **Class:** `shared` | **Lenses:** Design, QA

**Why:** Motion is half of AAA (Joe, 2026-06-04). The GRIDIRON visual layer ships with the right palette and type stack, but without a coordinated motion system it reads as "flat." This establishes the shared foundation that UXV2-4/5/6 will consume — every moving number, every card lift, the on-the-clock entrance, steal bursts, filter pills, cascade lists.

**What changed:**
- `src/lib/motion.ts` (new): 5 Framer Motion transition presets (`spring`, `springFast`, `broadcast`, `standard`, `swift`) + 7 named variant sets (`otcVariants`, `otcBadgeVariants`, `lowerThirdVariants`, `cascadeContainerVariants`, `cascadeItemVariants`, `fadeVariants`). Single source of truth — import in any screen.
- `src/hooks/use-number-ticker.ts` (new): `useNumberTicker(value)` hook. Detects value changes, emits `{ flashing, direction, delta }` for 1.4s. Drives CSS animation class toggles without Framer overhead on routine number updates (budget, rank, bid).
- `src/components/motion/` (new folder): 6 components + barrel export.
  - `NumberTicker.tsx` — number display with flash-up/flash-down class application + optional delta label.
  - `OtcEntrance.tsx` — `AnimatePresence` spring-in wrapper for the on-the-clock hero card. `OtcBadge` delays 180ms for layered reveal.
  - `LowerThird.tsx` — broadcast-curve wipe from bottom for pick-lands (replaces/supplements `pick-lower-third.tsx` for full-width in-room moments).
  - `StealFlash.tsx` — volt burst wrapper. Increment `trigger` to fire; cooldown prevents double-fire.
  - `FilterPillBar.tsx` — pill bar with Framer `layoutId` sliding indicator; generic over any string union.
  - `CascadeList.tsx` — staggered children (48ms gap) via `cascadeContainerVariants`. Re-triggers on `listKey` change.
- `src/app/globals.css`: Duration tokens (`--dur-micro/fast/standard/cinematic/reveal`) + `--ease-swift` added to `:root`. `ffi-card-interactive` gains `position:relative` + spring transition + iridescent border sheen `::before` (hidden by default, reveals on `:active`) + spring lift `:active` state. New keyframes: `ffi-num-flash`, `ffi-steal-burst`, `ffi-steal-banner-pop`, `ffi-otc-breathe`. New utility classes: `.ffi-num-value` / `.ffi-num-delta` (flash states), `.ffi-steal-card` / `.ffi-steal-banner` (volt burst), `.ffi-otc-on-block` (breathing glow), `.ffi-pill-bar` / `.ffi-pill-indicator` / `.ffi-pill-item` (filter pills), `.ffi-cascade-item` (stagger). Reduced-motion block updated to cover all new animations.

**Verify result:** type-check clean (0 errors). All components are `'use client'`, no new server/shared coupling. Zero paid API calls.

---

## 2026-06-06 — UXV2-3: Prep Hub GRIDIRON redesign

**Task:** UXV2-3 | **Class:** `output` | **Lenses:** Design, QA

**Why:** The Prep Hub page was a flat list of 7 identical hub cards — generic layout with zero visual hierarchy. UX-V2 GRIDIRON direction requires a real composition: a featured hero card, a full-width status card, secondary tiles, and a distinct footer strip. Per design DNA: colorful-dark canvas, volt green for action/value, electric blue for structure, Saira Condensed labels, JetBrains Mono for all numbers, no backdrop-filter blur.

**What changed:**
- `src/app/(app)/prep/page.tsx`: Full rewrite. Four sections via `SectLabel` divider (Setup, Research, Players, Draft Day). Setup = full-width Configure League card using `ffi-card-interactive`. Research = `ffi-hero` hero card (iridescent sheen class) with eye-label, 26px headline, stat row (Players/Last Run/Saved Runs in JetBrains Mono), blue AI Read panel, volt `ffi-btn-hero` CTA — plus 3-tile grid below (Board/Strategies/Runs). Players = 2-col grid (Player Browser green, Keepers amber). Draft Day = 2-col strip (Dry Run ghost, Start Draft volt-gradient + volt glow border). DataFreshness preserved at 50% opacity.
- `.claude/mockups/prep-hub-phone.html` + `public/mockups/prep-hub-phone.html` (new): approved phone-width mockup used as design reference. Background uses `body::before { position:fixed }` fixed pseudo-element technique (avoids iOS `background-attachment:fixed` breakage).

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors, `npm run build` passes. All four sections (Setup/Research/Players/Draft Day) confirmed in DOM snapshot. Commit 5676f96.

---

## 2026-06-04 — FF-313: App-shell double-mount fix (Option D)

**Task:** FF-313 | **Class:** `shared` + `bugfix` | **Lenses:** Architecture, QA

**Why:** `AppShell` rendered `{children}` in two sibling wrappers simultaneously — `hidden md:block` (desktop) and `md:hidden` (SwipeCarousel/mobile). CSS `display:none` hides elements visually but does not unmount React, so every authenticated page mounted twice. For `LiveDraftClient` specifically: 2× `/api/players` + 2× `/api/draft/sessions` on mount; 2× Sheets poll (~17 req/min); 2× Sleeper poll (~48 external req/min); 2× `scorePlayersWithStrategy` + O(n²) `maxBidAdviceMap` per pick. More critically: manual entry only reached the visible instance; when the hidden instance's feed-driven PATCH (full-array replace) fired next, it clobbered any manually-entered picks — silent data loss on draft day.

**What changed:**
- `src/hooks/use-is-mobile.ts` (new): `useIsMobile()` hook. Uses `window.matchMedia('(max-width: 767px)')`, updates on resize via `addEventListener('change', …)`, defaults `false` (desktop) for SSR safety.
- `src/components/layout/app-shell.tsx`: Added `useIsMobile` import + `const isMobile = useIsMobile()` call. Replaced the parallel `hidden md:block` / `md:hidden` sibling-wrapper block with a single `{isMobile ? <SwipeCarousel>…{children}… : …{children}…}` ternary. Desktop layout (padding, max-width, PageTransition) and mobile layout (SwipeCarousel, `pb-24` safe-area padding) are both preserved exactly.

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors, `npm run build` passes. DOM check via `preview_eval`: `document.querySelectorAll('.mx-auto.max-w-6xl').length === 1` at both 1280px (desktop) and 375px (mobile). Previously 2.

---

## 2026-06-04 — UX-7.3: One-tap demo entry

**Task:** UX-7.3 | **Class:** `output` | **Lenses:** QA, Design

**Why:** The sim was already built (UX-7.1/7.2) but required a real Supabase draft session to exist before it could load — making it impossible to demo on a phone without going through the full 3-step setup flow. Needed a zero-setup path so Joe can open one URL and show anyone the full broadcast experience.

**What changed:**
- `src/app/(app)/draft/live/client.tsx`: Added `DEMO_SESSION` (12 Nasties managers, $200 auction, ESPN/PPR) and `DEMO_LEAGUE` constants above the component. Modified session-load `useEffect`: when `simEnabled && !sessionId`, inject the mock session + league and fetch real players from `/api/players` instead of showing the "no session" error. Persistence calls to `/api/draft/sessions/demo` fail silently (try/catch already in place).
- `src/app/(app)/draft/page.tsx`: Added `Play` import; added dev-only "Demo Draft" card (amber-tinted, `NODE_ENV === 'development'` guard) linking to `/draft/live?sim=1`.
- `.claude/WORKING_STATE.md`: Added Demo Draft Launch section to Commands Reference.

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors in changed files, `npm run build` passes. `/draft/live?sim=1` loads live draft room with "The Nasties (Demo)", 12 managers, $200 budget, real seeded players, SIM HUD active — no login or session setup required. Draft Hub shows amber "Demo Draft" card in dev only.

---

## 2026-06-04 — UX-7.2: Sim signature moments + AI suppression + auto-navigate to review

**Task:** UX-7.2 | **Class:** `output` + `pipeline` | **Lenses:** QA, Delivery

**Why:** The sim engine (UX-7.1) needed three completions to be demo-ready: (1) AI advisor auto-fire needed to be suppressed so the sim runs at zero cost with no ANTHROPIC_API_KEY; (2) the `PositionRunTicker` never fired because best-available picks scatter across positions — scripting a 3-pick WR run at picks 8-10 guarantees the ticker; (3) the sim had no exit — it stopped at the completed state with no path to the grade-reveal screen.

**What changed:**
- `src/hooks/use-draft-simulator.ts`: In `fireNextPick`, added a scripted WR window at real pick counts 8-10 (filters pool to WR-only when 1+ WR is available) so `PositionRunTicker` fires at a predictable moment during every sim run.
- `src/components/draft/auction-advisor.tsx`: Added `suppressAI?: boolean` prop to `AuctionAdvisorProps` and `AuctionAdvisor`. Wired into `useAutoRecommend` as `enabled: state.format === 'auction' && !suppressAI`. Manual Refresh button still works when suppressed.
- `src/components/draft/snake-advisor.tsx`: Same `suppressAI?: boolean` addition wired into `useAutoRecommend` `enabled` guard.
- `src/app/(app)/draft/live/client.tsx`: Added `useRouter` import from `next/navigation`; added `useEffect` that pushes to `/draft/review?session=<id>` when `isSimActive && state.status === 'completed'`; passed `suppressAI={isSimActive}` to both advisors; gated trash talk `generateTrashTalk()` calls behind `!simEnabled` in both trash talk effects (hardcoded fallback strings still show).

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors in changed files, `npm run build` passes. Sim now: scripted WR run fires `PositionRunTicker`; zero AI fetch calls while running; auto-navigates to gold grade-reveal + confetti on completion.

---

## 2026-06-04 — UX-7.1: Dev-only Sim Engine

**Task:** UX-7.1 | **Class:** `shared` | **Lenses:** Architecture, QA

**Why:** Needed a way to auto-play the full draft experience without running a real draft, so every broadcast moment (lower-third, score-bug, on-the-clock banner, trash talk, grade reveal) can be validated end-to-end without coordinating with other people. Also enables showing the app to others on demand.

**What changed:**
- NEW `src/hooks/use-draft-simulator.ts`: `useDraftSimulator` hook. Gate: `NODE_ENV !== 'production' && enabled` prop. Uses ref pattern for all reactive values (mirrors `use-sleeper-draft-feed.ts`). Players sorted by `consensusRank` ascending; auction price from `player.consensusAuctionValue` capped at 40% of manager budget; snake reads `state.current_manager` from the state machine; auction cycles managers round-robin via `auctionMgrIdxRef`. Speed control: slow (3s), medium (1.5s), fast (0.6s). Draft completion detected inside `fireNextPick` (avoids synchronous setState in effect). Returns `{ isSimActive, isRunning, speed, setSpeed, start, pause, reset }`.
- `src/app/(app)/draft/live/client.tsx`: Added `Play`, `Pause`, `RotateCcw` Lucide imports; `useDraftSimulator` + `SimSpeed` imports; `simEnabled` derived from `NODE_ENV !== 'production' && ?sim=1`; hook call; amber SIM HUD bar rendered when `isSimActive` (sticky top-0, dev-only, amber glass border).

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors in changed files, `npm run build` passes. Sim HUD visual verification deferred (requires active session to pass the `state && session` guard; launch: `/draft/live?session=<id>&sim=1`).

---

## 2026-06-03 — UX-6.4: Stadium Primetime "after" state audit (UX-6 QA gate close-out)

**Task:** UX-6.4 | **Class:** `docs` | **Lenses:** QA, Delivery

**Why:** UX-6 required a before/after screenshot set as the QA gate for the Stadium Primetime track. No "before" screenshots existed (the redesign happened across in-flight sessions). This closes the gate with an "after" DOM-level audit as the permanent record.

**What changed:**
- Created `.claude/UX6_AFTER_AUDIT.md`: live DOM audit of 6 screens (Prep Hub, Configure, Draft Board, Draft Setup, Live Auction Draft Room, Post-Draft Review) at 1280px desktop + 375px mobile via `preview_snapshot`. Before/after token comparison table included. All screens PASS.
- `BUILD_PLAN.md`: UX-6.4 marked `[x]`
- `WORKING_STATE.md`: Current session + Last Completed updated; next item noted (UX-7.1)

**Verify result:**
- 6/6 screens render without console errors (2 pre-existing ThemeToggle hydration issues, non-blocking)
- Real player data confirmed live: 3093 cached players, 8 INJURY WATCH entries, 180+ player pool rows, 12 managers in League Overview
- Mobile 375px: identical DOM structure to desktop — all panels reachable
- `preview_screenshot` timed out on all attempts (heavy CSS filter/animation stack overwhelms headless renderer); `preview_snapshot` is the authoritative substitute

**UX-6 track fully complete. Next: UX-7 (Sim Draft / Demo Mode).**

---

## 2026-06-03 — UX-6.3: Background-layer GPU promotion

**Task:** UX-6.3 | **Class:** `output` (CSS-only) | **Lenses:** Design, QA

**Why:** The two atmospheric background layers (`.stadium-atmos`, `.atmos-grain`) were not guaranteed separate GPU compositor layers. `.atmos-grain` had no transform, so it painted into the main document layer and could trigger full-page compositing on every opacity/blend change. The filter-brightness animation on `.stadium-atmos.atmos-clock` was not hinted, so the browser had to invalidate the compositor state each animation frame.

**What changed (`src/app/globals.css` only):**
- `.atmos-grain`: added `transform: translateZ(0)` — forces a dedicated GPU compositor layer (same pattern already on `.stadium-atmos`). Verified: `getComputedStyle().transform` changed from `none` to `matrix(1, 0, 0, 1, 0, 0)` in the running preview.
- `.stadium-atmos.atmos-clock` + `body.ffi-on-the-clock .stadium-atmos`: added `will-change: filter` — pre-allocates GPU resources for the `filter: brightness()` animation so the compositor doesn't need to re-rasterize on each frame.
- `@media (prefers-reduced-motion: reduce)`: added `will-change: auto` reset on both animated selectors — releases GPU memory when animations are suppressed and the hint is no longer needed.

**Visual effect:** None (GPU hints are invisible to the eye).

**Verify:** type-check clean, 29/29 tests, 0 net-new lint errors, build clean.

**Deferred:** FFT-008 arm's-length mobile physical test still needs Joe on phone.

---

## 2026-06-03 — UX-6.2: WCAG ≥4.5:1 contrast pass + reduced-motion audit

**Task:** UX-6.2 | **Class:** `output` (CSS tokens + motion components) | **Lenses:** Design, QA

**Contrast fix:**
- `src/app/globals.css`: `--ffi-text-muted` bumped from `#64748b` (4.31:1 on main bg / 3.69:1 on `#0a1b25` — both below WCAG AA 4.5:1) to `#7d8fa8` (6.23:1 on main bg / 5.33:1 on `#0a1b25` / 5.83:1 on glass). Updated in both `@theme` and `:root` blocks. Visual change is a barely perceptible lightening of muted labels; hierarchy vs `--ffi-text-secondary` (#94a3b8) preserved. All other color tokens already pass AA.
- Calculated contrast ratios: #deedf9 (primary) ≥14:1; #94a3b8 (secondary) 7.99:1; #7d8fa8 (muted, new) 5.33:1; all position badges 4.5:1+; gold #e0c27a 5.6:1; value green #2ff801 12:1+.

**Reduced-motion audit:**
- `src/app/globals.css`: added `.glass-interactive:hover { transform: none; }` to `prefers-reduced-motion: reduce` block (previously omitted while the four sibling `.ffi-btn-*` and `.ffi-card-interactive` hover transforms were covered).
- `src/components/ui/ffi-motion.tsx`: added `useReducedMotion()` checks to all 11 animation components. Pattern: (1) persistent/looping animations (`FFIGlowPulse` `repeat: Infinity` box-shadow) → skip `animate` entirely when reduced; (2) entrance spatial transforms (y, x, scale, rotate) → zero out but preserve opacity fade; (3) hover/tap transforms (`FFIMotionCard`, `SharedPlayerCard`, `FFIPressScale`) → empty `{}` when reduced; (4) `FFIBounceIn` burst ring → conditionally rendered; (5) stagger delays zeroed so items appear immediately.
- Components already correct before this change: `FFICelebration`, `FFIConfettiBurst`.

**Verify:** `--ffi-text-muted: #7d8fa8` confirmed in live DOM via preview_inspect. type-check clean, 29/29 tests, 0 net-new lint errors, build clean.

---

## 2026-06-03 — UX-6.1: Empty states + skeletons across remaining screens

**Task:** UX-6.1 | **Class:** `output` (visual only) | **Lenses:** Delivery, QA
- `src/components/page-skeleton.tsx`: removed dependency on shadcn `Skeleton` component; replaced with inline `FfiSkeleton` helper using `.ffi-skeleton` (v2.0 shimmer from UX-3). Card wrappers upgraded from `border-border bg-card` to `bg-[#0a1b25] border-white/[0.04]`; table header from `bg-muted/30` to `bg-[#0a1b25]/80`; row dividers from `border-border` to `border-white/[0.04]`. All `loading.tsx` files that import PageSkeleton/TableSkeleton inherit the fix at once.
- `src/app/(app)/prep/runs/client.tsx`: replaced 3x inline `Loader2` spinners (initial leagues load, runs-list load, row detail-expand load) with `.ffi-skeleton` shimmer rows; replaced 2x generic `<Card><CardContent>` empty states with glass divs (`bg-[#0a1b25] border-white/[0.04]`) + v2.0 text tokens.
- `src/app/(app)/prep/strategies/client.tsx`: replaced `Loader2` loading state with shimmer skeleton cards; upgraded "No leagues configured" empty state from `bg-muted/50 border-border` to glass + v2.0 text tokens (`#deedf9` / `#9eadb8` / `#8bacff` link); removed now-unused `Loader2` import.
- `src/app/(app)/prep/runs/page.tsx` + `prep/strategies/page.tsx`: plain `<h1 className="text-2xl font-bold">` → `<h2 className="ffi-display-md text-white">` + `<p className="ffi-body-md text-[var(--ffi-text-secondary)]">`, matching `configure/page.tsx` v2.0 pattern.
- **Verify:** /prep/runs empty state renders "No research runs yet"; /prep/strategies header and empty states render correctly. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.

---

## 2026-06-03 — UX-4: Prep Hub gold hover + Configure form glow (UX-4.1 + UX-4.2)

**Task:** UX-4.1 (hub cards gold-on-hover) + UX-4.2 (glow-focus form inputs) | **Class:** `output` (visual only) | **Lenses:** Design, QA
- `prep/page.tsx` `HubCard`: icon container updated from old slate-800 to v2.0 surface-container token; icon, title, and chevron hover colors changed from lime `--ffi-accent` to gold (`text-gold-bright`, `text-gold`, `group-hover:bg-gold/8 border-gold/20`). The `.ffi-card-interactive:hover` gold border was already in place; now the inner elements match.
- `configure/page.tsx`: plain `<h1>` replaced with `<h2 className="ffi-display-md text-white">` + `<p className="ffi-body-md text-[var(--ffi-text-secondary)]">` matching the v2.0 section header pattern (server-component safe, no client import needed).
- `globals.css`: added `.ffi-form-input:focus-visible/.ffi-form-input:focus` — gold glow focus ring (`border-color: rgba(224,194,122,0.55)`, `box-shadow: 0 0 0 3px rgba(224,194,122,0.12)`) with `!important` to override Tailwind's focus-visible ring utilities.
- `league-config-form.tsx`: applied `ffi-form-input` class to all 11 form inputs and selects (league name, platform, team count, budget, scoring format, all 9 roster slots, scoring settings per-field, max keepers, keeper cost type, keeper name/position/cost).
- **Verify:** type-check clean, 29/29 tests, 0 net-new lint errors, build passes. DOM confirms correct classes applied (`group-hover:text-gold-bright`, surface-container bg, `ffi-form-input` on all configure inputs).

---

## 2026-06-03 — Sunday Night Gridiron: AAA UI moments + make-it-real fixes (Opus)

**Task:** AAA UI/UX upgrade + code-review-driven P0 fixes  |  **Class:** `output` (UI) + `pipeline` + `bugfix` | **Lenses:** Design, QA, Architecture
Personality "Sunday Night Gridiron" (NFL primetime broadcast graphics) chosen by Joe; scope = visual + make-it-real fixes; extras = opt-in sound + Android haptics. Two research deliverables written: `.claude/CODE_REVIEW_2026-06.md`, `.claude/AAA_UI_RESEARCH.md`.

**Phase 0 - foundation + hard-rule hygiene**
- `globals.css`: added `--ffi-live` broadcast cyan token (live-data signal, never CTA/value), named easing vars (`--ease-broadcast/spring/standard`), a registered `@property --ffi-sheen-angle`, and global `font-variant-numeric: tabular-nums`.
- Emoji purge: all 66 emoji across 14 files replaced with Lucide icons (trash-talk config + renders + AwardBadge, ffi-primitives FFITrashTalkAlert/FFITacticalInsight, setup/players/team-reports/league-overview/export/etc., live keeper lock + sync checks, review trash-talk tab).
- Em/en-dash sweep across all `src` string literals/JSX/templates; trash-talk route strip now removes en-dash too; added ESLint `no-restricted-syntax` guard so dashes cannot return.
- `FFIAIRecommendation` de-drifted to v2.0 (killed italic/uppercase headline, lime CTA, hardcoded slate borders).

**Phase 1 - make-it-real P0 fixes**
- Auto-fire AI advisor: new `src/hooks/use-auto-recommend.ts`; AuctionAdvisor fires on every pick, SnakeAdvisor near your turn (debounced, ref-stable). Flagship "<=3s after a pick" now happens without a manual tap; manual Refresh retained.
- `claude.ts`: prompt caching (system marked `cache_control` ephemeral by default) + defensive text-block parse.
- `api/draft/recommend/route.ts`: `maxDuration=10`, maxTokens 384->600, one retry+backoff, 8s timeout, rule-based fallback (`source:'fallback'`) so the live draft never 500s.
- Keeper-completion bug fixed in `state.ts` (`total_picks + keepers.length`); new `src/lib/draft/__tests__/state.test.ts` (29 tests pass).
- Format purity: `position-scarcity.tsx` `showSpendRanges` default true->false.

**Phase 2 - signature LIVE broadcast moments**
- `pick-lower-third.tsx`: most-recent pick wipes in as a TV lower-third (gold rail for your pick, cyan for others), one-shot sheen, fixed height = zero layout shift. PickFeed now shows it as the hero with history below.
- `live-scorebug.tsx`: persistent heavy-glass score-bug (budget/round/roster, tabular mono, cyan flash on change). Format-pure.
- `position-run-ticker.tsx`: cyan insight strip on a 3+ position run (counts only).

**Phase 3 - champion REVIEW moment**
- GradeHero: grade is now GOLD (was lime) - `gradeGlow.A`, `.ffi-grade-a`, score color; rotating conic gold ring (`.ffi-grade-ring-sheen` via `@property`); wired `FFICelebration` (new `tone="gold"`) + new `FFIConfettiBurst`; Oswald verdict word ("ELITE DRAFT"). Reduced-motion -> static.

**Phase 4 - sensory + continuity**
- `use-haptic.ts` (Android-only, no-op iOS, reduced-motion aware), `use-sound.ts` (opt-in, muted default, Web Audio synth, `useSyncExternalStore`), settings toggle (`sound-settings.tsx`). Cues wired: your-turn + each pick (live), champion (review). `view-transition.ts` helper shipped.

**Verify:** type-check clean; `npm run build` succeeds (all routes); 29/29 tests; lint has 0 net-new errors (25 pre-existing debt documented in CODE_REVIEW_2026-06.md, BACKLOG). Visual: settings sound toggle, live score-bug + lower-third, and 375px one-thumb layout confirmed via preview screenshots. Marquee animations (lower-third wipe with a real pick, gold grade hero + confetti) render in layout; full motion proof needs a seeded/live session. Live AI auto-fire end-to-end needs `ANTHROPIC_API_KEY` + Joe's typed cost approval (gated).

---

## 2026-06-03 — UX-2 (Opus elevation): On-the-clock hero + true moment-gated spotlight

**Task:** UX-2 review/upgrade (Sonnet → Opus)  |  **Class:** `output` (UI) | **Lenses:** Design, QA

Review of the Sonnet-built UX-2 found a competent recolor that missed the design-judgment core of the "hero screen" sprint. Elevated to Opus quality — all visual-only (reads existing draft state, no engine change):

- **On-the-clock spotlight, re-wired to the MOMENT.** Sonnet's `body.draft-active` fired for the entire draft (`status !== 'completed'`) — a constant gold pulse that devalues "gold = the moment," the core of the v2.0 system. Replaced with a true `onTheClock` signal in `client.tsx` (snake → `current_manager` is you; auction → a player is on the block) driving `body.ffi-on-the-clock`. Verified live: the gold spotlight is correctly OFF on a live auction with no player on the block, and ON the instant a player is nominated / at your snake turn.
- **On-the-clock HERO banner (the missing centerpiece).** New `.ffi-onclock-banner` (gold light-catch edge + breathing ambient spotlight glow; transform-free so Framer Motion owns the spring entrance). Snake → "YOU'RE ON THE CLOCK · Round X · Pick Y" (Clock icon); auction → "ON THE BLOCK · <player> · <pos>" (Gavel icon). `role="status"` + `aria-live="polite"`.
- **Finished the recolor Sonnet left in the file it edited.** `--ffi-accent`/`--ffi-success` both resolve to lime `#39ff14`; recolored StrategyPicker (icon + active state) + MySquad Target icon → blue (structure), and "Roster complete!" → `--value-green` (success/value).
- **No-Line fix:** MySquad's `border-t border-[var(--ffi-border)]/20` (gray) → `border-white/[0.06]` (light-catch hairline).
- **CSS:** removed Sonnet's duplicate `body.draft-active .stadium-atmos` (byte-identical to `.stadium-atmos.atmos-clock`); added `body.ffi-on-the-clock .stadium-atmos` (intensified gold spotlight + pulse) + `.ffi-onclock-banner` / `@keyframes ffi-onclock-sheen`; both added to the reduced-motion guard.
- **Verify:** type-check clean · 27/27 tests · 0 lint errors in changed files · banner + spotlight confirmed live in real snake + auction sessions at 1280 + 390 (DOM geometry + computed styles: gold border `rgba(253,239,182,0.38)`, gold glow shadow, atmos `atmos-clock-pulse`, 44px touch target, no 390px overflow). JPEG screenshots not capturable via the preview tool — the live draft polls continuously + double-mounts (no network-idle frame); verified via computed-style inspection instead, per the tool's own guidance.

---

## 2026-06-03 — UX-3: Stadium Primetime — Draft Board / Player Pool (data-dense)

**Task:** UX-3.1–3.3  |  **Class:** `output` (UI) | **Lenses:** Design, QA
**Commit:** `b513c3b`

- **UX-3.1 Rank redesign:** `ffi-player-card.tsx` + `draft-board-table.tsx` — removed italic ghost (was `italic text-[#8bacff]/20`); ranks 1–24 = Stadium Gold (`rgb(224,194,122)`), ranks 25+ = Gridiron Blue (`rgb(85,130,230)`). Full opacity. Space Grotesk bold (font-headline). Confirms live: rank "01" = gold, rank "25" = blue.
- **UX-3.2 Tabular mono numbers:** All player values (`$amount` / `Rd N`), ADP, score, range stats now use `font-mono tabular-nums` → JetBrains Mono confirmed live in computed styles. Value color = Stadium Gold. Expanded card stat sections: removed all `border-t` separators, replaced with top-margin spacing only.
- **UX-3.3a Position badge active = blue:** `FFIPositionFilters` section header bar + active button: lime `#2ff801` → Gridiron Blue `#5582e6`. Board client's inline position pills also updated to blue. Confirmed live: active "ALL" button = `rgb(85,130,230)`.
- **UX-3.3b Sticky filter headers:** `ffi-filter-sticky` CSS class (sticky/top-0/z-20/glass backdrop) applied to both the live-draft `PlayerPool` filter bar and the prep `DraftBoardClient` board filter bar. Both stick on scroll with a blurred glass backdrop.
- **UX-3.3c Row-density toggle:** Compact/comfortable mode in `PlayerPool` and `DraftBoardClient` — icon button cycles between `LayoutList` (comfortable) and `AlignJustify` (compact). Compact reduces card padding, rank text size, and card spacing.
- **UX-3.3d Skeleton loaders:** `PlayerListSkeleton` component renders 8 shimmer rows (`.ffi-skeleton` keyframe) in place of "Loading player data..." text on the prep board. `ffi-skeleton` added to `globals.css` with reduced-motion guard.
- **Flash streak fix:** Updated lime `rgba(47,248,1,0.1)` → gold `rgba(224,194,122,0.07)` — highlighted player card streaks are now warm gold tint (the moment), not value-green.
- **Verify:** type-check clean · 27/27 tests pass · 0 lint errors in changed files · sticky/z-index/bg confirmed via inspect · gold rank / blue rank / mono value / blue active-filter all confirmed via computed styles.

---

## 2026-06-03 — UX-2: Stadium Primetime — Live Draft Room (AAA Visual Upgrade)

**Task:** UX-2.1–2.4  |  **Class:** `output` (UI) | **Lenses:** Design, QA
**Commit:** `08a7d37`

- **UX-2.1 On-the-clock spotlight:** Radio icon in live draft header: `danger-red → gold`. Added AUCTION/SNAKE pill badge in gold beside "Live Draft" title. `body.draft-active` CSS class set via `useEffect` while draft is active → intensifies `stadium-atmos` overhead gold spotlight + enables `atmos-clock-pulse` 3.2s breath animation on the background.
- **UX-2.2 Pinned bar Record button:** Changed from lime (`bg-[#2ff801]`) to metallic gold gradient (`ffi-btn-hero` values via inline style for specificity) — now reads as a commit/moment action, not a generic CTA. Disabled state unchanged (muted glass).
- **UX-2.3 Your-pick gold rail:** `PickFeed` now accepts `myManager` prop; your picks: gold left border + `bg-gold/5` tint + `text-gold-bright` player name + gold price. Latest pick (idx 0) gets `.ffi-pick-flash` (box-shadow gold glow keyframe, no scale conflict with Framer Motion). Other newest pick: blue tint. Live feed pulse dot: `danger-red → value-green` (it's a success/live signal).
- **UX-2.4 v2.0 restyling:** `ConnectionStatusPill` LIVE state: `#22c55e → #2ff801` (value-green token); all states get `backdropFilter: blur(8px)` glass; error bar: `ffi-glass` class + danger border tint. `TrashTalkFeed` steal/budget_dominance/keeper_steal alert colors: `--ffi-success → --value-green`. SavedTrashTalk bookmark icon: lime accent → gold. AwardBadge success: `--ffi-success → --value-green`. MySquadPanel budget: lime accent → blue primary (budget is structural data, not a moment).
- **CSS additions:** `.ffi-pick-flash` (box-shadow gold flash only, no scale); `body.draft-active .stadium-atmos` override; both added to reduced-motion guard.
- **Verify:** type-check clean · 27/27 tests pass · 0 lint errors in changed files · CSS rules confirmed live in browser · gold/value-green tokens confirmed in computed styles.

---

## 2026-06-02 — UX-1: Stadium Primetime Foundation (AAA Visual Upgrade)

**Task:** UX-1.1–1.7  |  **Class:** `output` (UI) | **Lenses:** Design, QA
**Authorization:** Supersedes locked DESIGN_SYSTEM.md v1.2 → v2.0 (Joe approved 2026-06-02).

- **Design system v2.0** "Stadium Primetime" — rewrote `DESIGN_SYSTEM.md`, created `UI_UPGRADE_PLAN.md`, added a v2.0 addendum to `UI_DESIGN_SPEC.md`, added the UX sprint track to `BUILD_PLAN.md`.
- **Fonts (UX-1.3):** `layout.tsx` loads Space Grotesk + Manrope + JetBrains Mono via `next/font` (distinct vars `--font-space-grotesk/-manrope/-jetbrains/-oswald`); Inter removed; `.font-headline/-body/-label/-display` + `@theme` rewired to resolve to the loaded families. Root cause fixed: v1.x referenced "Space Grotesk"/"Manrope" in CSS but never loaded them, so every `font-headline/body` silently fell back to system. Verified live on :3003.
- **Tokens (UX-1.2):** Stadium Gold ramp (`--ffi-gold*`, `--color-gold*`), `--value-green`, gold glow effects; blue + surface token names kept stable.
- **Background (UX-1.4):** `.stadium-atmos` (overhead gold spotlight + cool ambient + turf hint + night-navy) + `.atmos-grain` (SVG fractalNoise top overlay) + `.atmos-clock` on-the-clock tint; `app-shell.tsx` swapped the 5 light-streak/flash divs for the two atmosphere layers.
- **Glass (UX-1.5):** `.ffi-glass/-heavy/.glass-panel` refined (navy tint + saturate + light-catch hairline); added `.glass-interactive` + `.ffi-scrim`; removed gray `rgba(51,65,85,0.5/0.8)` borders from all three `.ffi-card*` tiers; interactive hover edge lime → gold.
- **Buttons (UX-1.6):** `.ffi-btn-primary` lime → blue; added `.ffi-btn-hero` (gold) + `.ffi-btn-value` (green); `FFIButton` variants `primary|hero|value|secondary|ghost`; mobile 44px targets, `:active` glows, reduced-motion all updated.
- **Motion (UX-1.7):** `@keyframes ffi-reveal` + `ffi-gold-flash` + `ffi-stagger-fade`; `.ffi-animate-reveal/-stagger`; reduced-motion list extended.
- **Nav:** active sidebar + bottom-tab accent shifted lime → gold (spotlight follows the active item).
- **Verify:** `type-check` clean · `test:run` 27/27 pass · changed files lint clean · `globals.css` brace-balanced (204/204) · fonts confirmed served on :3003. Full `next build` deferred until port 3003 is free (a parallel dev server held `.next`).

---

## 2026-06-02 — FFT-005: Prep Configure + Player Pool Chrome Test

**Task:** FFT-005  
**Class:** `output` | **Lenses:** QA, Delivery

- Navigated to `/prep/configure` via Chrome MCP: ESPN/Auction/12-team/$200/Full PPR all pre-filled correctly
- Draft Board at `/prep/board`: 500 players load from Sleeper-seeded cache (real NFL names confirmed)
- 3 console issues reviewed — all pre-existing: ThemeToggle script-tag warning, ThemeToggle hydration mismatch, `[useUserTags] fetch failed` (awaiting Supabase migration `20260323000002`)
- No new errors introduced by the seed
- **Result:** FFT-005 PASS — Testing Sprint T2 complete

---

## 2026-06-02 — FFT-004: Sleeper Player Seed

**Task:** FFT-004  
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

- Created `scripts/seed-players-sleeper.ts` — one-shot seed script for `players_cache`
- Fetches `GET https://api.sleeper.app/v1/players/nfl` (free, no key)
- Filters 12,194 Sleeper players → 3,064 active QB/RB/WR/TE/DEF (K excluded per Nasties rule)
- Deduplicates 16 name collisions before upsert (same `name` conflict key as table constraint)
- Upserts 3,048 unique rows via service role key in batches of 100
- Supabase `players_cache` total: 3,093 (includes prior seed rows)
- **Result:** FFT-004 PASS

---

## 2026-06-02 — FFT-002 + FFT-003: Chrome UI Smoke Tests + Bug Fixes

**Tasks:** FFT-002 (prep mode UI), FFT-003 (live draft UI) + 3 bug fixes found during testing  
**Class:** `bugfix` | **Lenses:** QA, Design

**FFT-002 — Prep screens (PASS):**
- Prep Hub: renders, 573 players cached, correct CTA
- Configure: Joe's ESPN Auction (12 teams, $200, PPR) ✅; Tyler's Sleeper tab ✅
- Draft Strategies: empty state "No leagues configured" — correct behavior
- Draft Board: empty state — correct behavior
- Console: ThemeToggle hydration mismatch on every page (non-blocking — SSR/client light/dark mismatch)

**FFT-003 — Live draft UI (PARTIAL PASS — 3/4 criteria met):**
- ✅ Connection status pill: "● MANUAL 0 PICKS" visible in header
- ✅ Manual pick bar: "Tap BID on any player" pinned at bottom (auction + snake)
- ✅ Player pool: 300 players render in both auction and snake modes
- ⚠️ Console: `[useUserTags] Error: Could not find the table 'public.user_tags'` (×4) — Supabase migration not applied; player intel tags non-functional but does not crash the UI
- Snake: "Rd 1 · Pick 1 · YOUR PICK" snake advisor, ADP sort tabs, correct keeper-league roster slots ✅

**Bugs fixed:**
1. `createLeague` DEV_MODE: was returning fake `leagueId: 'dev-league-001'` without saving to Supabase — fixed to use service role key (same pattern as sessions route)
2. `ffi-player-card.tsx` — `$undefined` / `$NaN-$NaN RANGE` on players with no `consensusAuctionValue`: added `?? 0` fallback; display now shows `$0`/`$0-$0 RANGE`
3. `ffi-player-card.tsx` — `Rd NaN` on players with no ADP (`player.adp === 0` or `NaN`): added `player.adp > 0` guard; display now shows `Rd 0`
4. `manual-pick-entry.tsx` — `$undefined` in search dropdown for players without auction value: added `?? 0` fallback

**Supabase migrations needed (Joe action required):**
- `20260321000001_add_keepers_to_draft_sessions.sql` — adds `keepers` jsonb column (blocks session API `POST /api/draft/sessions`)
- `20260323000002_user_tags_table.sql` — creates `user_tags` table (suppresses console errors in live draft)
- Apply via Supabase Dashboard → SQL Editor (scripts are in `supabase/migrations/`)

**Not changed:** game logic, state machine, API behavior, tests.

---

## 2026-06-02 — FF-269: Touch Target Audit + Fix (P0 Sub-tier 4)

**Task:** FF-269 — Arm's-length physical test — fix touch targets < 44px  
**Class:** `output` (UI only) | **Lenses:** Design, QA

**Audit findings (4 files, 7 elements):**
- `ffi-position-filters.tsx` — filter pills `py-2` ≈ 30px; sort tabs `py-1` ≈ 24px
- `ffi-player-card.tsx` — expand/collapse chevron: no sizing, wraps 20px icon
- `connection-status-pill.tsx` — error bar Retry `padding: 4px 10px` ≈ 22px; dismiss × no sizing
- `manual-pick-entry.tsx` CARD variant — submit `h-9` (36px); undo `h-7` (28px)

**Fix:** Added `min-h-[44px]` (+ `flex items-center justify-center` where needed) to all offending elements. Bar variant, BID button, and trash talk buttons already compliant — untouched.

**Not changed:** logic, state, props, tests.  
**Physical verification (FFT-008):** still requires Joe on phone — scheduled in P2 Testing Sprint.

**Verification:** lint zero new errors in changed files, type-check clean, 27/27 tests pass.

---

## 2026-04-16 — FF-283: Dynamic Max-Bid Recompute on Every Pick

**Task:** FF-283 — Every pick from any source triggers `calculateMaxBidAdvice()` recompute for remaining players  
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** `calculateMaxBidAdvice()` was defined in `auction-advisor.ts` but **never called anywhere** in the live UI. Player cards in the pool showed a single global `getMaxBid()` value (flat absolute max) — the same number for every player regardless of strategy score, position need, or scarcity. Per-player strategy-aware advice was completely unwired.

**Approach:** Added a `maxBidAdviceMap: Map<string, number>` useMemo in `live/client.tsx` keyed by lowercase player name. It depends on `[state, scoredPlayers, draftedNames, strategy]` — every pick from any source (Auctioneer BroadcastChannel/localStorage → `addManualPick` → `setState`, Sheets → `handleNewSheetPicks` → `setState`, manual → `addManualPick` → `setState`) invalidates the memo and recomputes `calculateMaxBidAdvice()` for all remaining undrafted players. The result map is passed to `PlayerPool` as new `maxBidMap` prop; each `FFIPlayerCard` gets its own per-player value (fallback to global `maxBid` if map absent). `MySquadPanel` continues to use the simple `getMaxBid()` result for its "Max bid" line — correct behavior since it's a squad-level overview, not a per-player decision.

**Changes:**
- `src/app/(app)/draft/live/client.tsx`: import `calculateMaxBidAdvice`; add `maxBidAdviceMap` useMemo (deps: state + scoredPlayers + draftedNames + strategy); pass `maxBidMap={isAuction ? maxBidAdviceMap : undefined}` to `<PlayerPool>`
- `src/components/draft/player-pool.tsx`: add `maxBidMap?: Map<string, number>` prop; card render uses `maxBidMap.get(sp.player.name.toLowerCase()) ?? null` per card (fallback to `maxBid`)

**Architecture notes:**
- Pure computation — no async, no network calls; computing for ~100–300 players is sub-millisecond (simple math + one `.filter()` per player over `scoredPlayers`)
- `MySquadPanel` keeps `maxBid={myMaxBid}` (simple global max) — squad-level overview doesn't need per-player strategy advice
- `maxBidMap` is `undefined` in snake mode — `FFIPlayerCard` hides the MAX display when `maxBid` is null/undefined

**Verification:** `npm run type-check` — clean. `npm run lint` — zero new errors in changed files.

---

## 2026-04-16 — FF-282: use-draft-feed.ts Unified Multi-Source Pick Feed

**Task:** FF-282 — Generalize `use-draft-polling.ts` → `use-draft-feed.ts`  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** `live/client.tsx` called `useAuctioneerfeed` directly with `AuctioneerPick[]` — a raw internal type from the Auctioneer integration layer. Downstream code (FF-283 max-bid recompute, future Sheets unification) needs a stable `NormalizedPickEvent[]` interface that abstracts the source. Also eliminated explicit `enabled`/`connectionType` gating boilerplate from the call site.

**Approach:** New `src/hooks/use-draft-feed.ts` wraps `useAuctioneerfeed` and converts its `AuctioneerPick[]` output to `NormalizedPickEvent[]` using `createPickMerger()` (FF-281) + `playerNameToPickId()`. Gating is internal: hook is a no-op when `format !== 'auction'` or `connectionType` is null — callers pass `session.format` and `aifParam` unconditionally. `connectionTypeToSource()` maps the connection type to `FeedSource` tag. The `mergerRef` (one `createPickMerger()` per mount) deduplicates pickIds across BroadcastChannel and localStorage poll paths; it's primed to also dedup against Sheets picks once that source is routed through here. Re-exports `NormalizedPickEvent` and `AuctioneerConnectionType` so `live/client.tsx` has a single import point. `use-draft-state.ts` and `use-draft-polling.ts` are untouched — Tyler's Sheets + manual entry path has zero behavior change.

**Changes:**
- `src/hooks/use-draft-feed.ts` (new): `useDraftFeed(format, connectionType, onNewPicks)` → `UseDraftFeedResult`; `toNormalizedEvent()`; `connectionTypeToSource()`; re-exports `NormalizedPickEvent`, `AuctioneerConnectionType`
- `src/app/(app)/draft/live/client.tsx`: import swapped (`useAuctioneerfeed`/`AuctioneerPick` → `useDraftFeed`/`NormalizedPickEvent`); `handleAuctioneerPicksRef` type updated; handler body `pick.player_name` → `pick.playerName`; `onAuctioneerpicks` callback type updated; hook call simplified to `useDraftFeed({format, connectionType, onNewPicks})`

**Architecture notes:**
- `use-draft-polling.ts` is NOT deleted — `use-draft-state.ts` still uses it for Sheets polling; the "generalize" step is additive (new hook) not a replacement yet
- Source priority (BroadcastChannel > localStorage > file) is enforced inside `useAuctioneerfeed`; `useDraftFeed` adds the normalization and cross-source dedup layer on top
- `mergerRef` persists for the hook's lifetime; `reset()` is available for future session-restart use cases

**Verification:** `npm run type-check` — clean. `npm run lint` — zero new errors in changed files.

---

## 2026-04-16 — FF-281: auction-feed-merge.ts Cross-Source Pick Dedup Utility

**Task:** FF-281 — `src/lib/draft/auction-feed-merge.ts` (NEW) — dedup pick events across sources by `pickId`  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** Picks now arrive from up to four paths (BroadcastChannel, localStorage poll, file poll, Sheets poll). Each path may deliver the same pick. A shared, testable dedup layer prevents double-add regardless of which path fires first. Sets up FF-282's multi-source `use-draft-feed.ts`.

**Approach:** Pure utility module — no React, no `'use client'`, SSR-safe. `createPickMerger()` factory owns a private `Set<string>` of seen pickIds and returns a `PickMerger` interface with three members: `merge(picks)` filters incoming batches to unseen IDs only (mutates internal set), `reset()` clears the set for session restart, and `seenCount` getter for observability. `playerNameToPickId(name)` synthesizes a `sheets:<name>` ID for Sheets picks that carry no Auctioneer pick ID — the `sheets:` prefix ensures these never collide with Auctioneer's `pick-N` IDs. `NormalizedPickEvent` is the canonical cross-source pick type: `pickId`, `playerName`, `manager`, `price`, `position?`, `source: FeedSource`. FF-282 will instantiate one merger per session in a `useRef` and route all source batches through it.

**Changes:**
- `src/lib/draft/auction-feed-merge.ts` (new): `FeedSource`, `NormalizedPickEvent`, `PickMerger`, `createPickMerger()`, `playerNameToPickId()`

**Architecture notes:**
- `createPickMerger()` stores its Set privately — callers cannot accidentally mutate it
- `playerNameToPickId` prefix (`sheets:`) guarantees no collision with Auctioneer IDs (`pick-1`, `pick-2`)
- The module has zero dependencies — safe to import from hooks, server components, or tests

**Verification:** `npm run lint` — zero errors in new file. `npm run type-check` — clean.

---

## 2026-04-16 — FF-280: Auctioneer BroadcastChannel Subscriber

**Task:** FF-280 — Subscribe to Auctioneer's `ffi-auction-feed` BroadcastChannel for instant pick sync  
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Root Cause:** FF-279 added 3-second localStorage polling, but picks were delayed up to 3s from when Auctioneer committed them. With both apps open in the same browser, a BroadcastChannel can deliver picks in sub-100ms with no polling overhead.

**Approach:** New `useEffect` in `useAuctioneerfeed` (between `processBatch` definition and the existing localStorage poll). Gates on `enabled && connectionType === 'localstorage'` — channel is meaningless for the file path and would silently receive nothing. SSR-safe (`typeof window === 'undefined'` guard). Opens `BroadcastChannel('ffi-auction-feed')`, sets `onmessage` handler: reads teamNameMap from `auctioneer-draft-v1` localStorage for teamId→name resolution, routes the single `_AAPick` through `processBatch` (same dedup ref as the poll). Sets `connected=true` + clears error on each message. Cleanup closes the channel. The 3-second poll below it continues running as catch-up for any messages missed during a brief disconnect. `seenPickIdsRef` ensures each pick ID is emitted to `onNewPicks` exactly once regardless of which path delivers it first. No changes to Auctioneer repo — `ffiBroadcastRef.postMessage(pick)` was already wired in `draft/page.tsx` as part of AA-INT1.

**Changes:**
- `src/hooks/use-auctioneer-feed.ts`: new BroadcastChannel subscriber `useEffect` before the localStorage poll effect; comment on the existing localStorage poll updated to "catch-up fallback"

**Architecture notes:**
- Channel subscriber scoped to `'localstorage'` only — file path users are on a different device where a same-origin BroadcastChannel would never receive messages
- Both paths call `processBatch` → `seenPickIdsRef` dedup → `onNewPicks` exactly once per pick ID
- Channel open/close is tied to effect lifecycle; no global channel instance needed

**Verification:** `npm run lint` — zero new errors in changed file. `npm run type-check` — clean. Auctioneer `npx tsc --noEmit` — clean.

---

## 2026-04-16 — FF-279: Auctioneer JSON Import with Hot-Reload

**Task:** FF-279 — FFI reads Auctioneer's JSON export at auction setup  
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Root Cause:** P1 milestone — Joe's ESPN auction draft uses the Auctioneer app to run the live auction; FFI had no way to receive picks from it. Each pick was re-entered manually, doubling work and creating sync lag.

**Approach:** `useAuctioneerfeed` hook with two polling paths at 3-second intervals. (1) localStorage: reads `auctioneer-ffi-feed-v1` (Auctioneer's append-only pick feed) + `auctioneer-draft-v1` (for teamId→name resolution) directly from `window.localStorage` — works when both apps run in the same browser tab on the same device. (2) File System Access API: polls a `FileSystemFileHandle` selected at setup time; supports all three Auctioneer JSON shapes (storage envelope, StoredDraft, raw Pick[]). Dedup across polls via `seenPickIdsRef` (Auctioneer pick IDs). At live-client boundary, picks are filtered against `draftedNames` before `addManualPick` to prevent double-recording on cold-start. `onNewPicks` is stabilized via `useCallback([])` + a handler ref so the 3-second interval never restarts mid-draft. File handle survives client-side navigation via module-level `_globalFileHandle` / `setGlobalFileHandle()`. Gated: hook is a no-op unless `enabled===true` (caller gates on `session.format === 'auction'`); Tyler's snake/Sleeper flow is completely unaffected.

**Changes:**
- `src/hooks/use-auctioneer-feed.ts` (new): `useAuctioneerfeed(enabled, connectionType, onNewPicks)` hook; `AuctioneerConnectionType`, `AuctioneerPick` types; `setGlobalFileHandle()` / `getGlobalFileHandle()` module-level API; `parseFileContent()` for multi-shape file support; `buildTeamNameMap()` + `normalizeAAPick()` helpers
- `src/app/(app)/draft/setup/client.tsx`: imports `setGlobalFileHandle`, `AuctioneerConnectionType`; `auctioneerConnectionType` + `auctioneerFileName` + `aifError` state; Auctioneer Sync card in Step 3 (only rendered when `isAuction`): "Same Device" toggle (localStorage) + "Export File" button (File System Access API with type filter); `?aif=` param appended to live page navigation URL
- `src/app/(app)/draft/live/client.tsx`: imports `useAuctioneerfeed`, `AuctioneerConnectionType`, `AuctioneerPick`; reads `?aif=` from searchParams; `handleAuctioneerPicksRef` declared early, updated post-`useDraftState`; `onAuctioneerpicks` via `useCallback([])` (stable); `useAuctioneerfeed` call with `aifEnabled` gate; `AA ✓N` / `AA …` badge in header when `aifEnabled`

**Architecture notes:**
- `onNewPicks` must be stable at call site — empty-dep `useCallback` + handler ref pattern avoids interval restarts
- `setError` never called synchronously in `useEffect` (react-compiler rule) — error state flows from failed poll attempts only
- Module-level `_globalFileHandle` is cleared by the user navigating back to setup and picking a new file; no explicit cleanup needed for one-session use

**Verification:** `npm run type-check` — clean. `npm run lint` — zero new errors in changed files. All pre-existing errors unchanged.

---

## 2026-04-16 — FF-311: Owner History System

**Task:** FF-311 — Owner history system for trash talk context injection  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** `generateTrashTalk()` was calling `/api/trash-talk` with an empty `historyBlock`. The Nasties league has 10 years of roast ammo (Le'Veon Bell $73, CMC $82, Bowers $3, etc.) that Claude could use to sharpen lines — but nothing was surfacing it.

**Approach:** Ported `trash-talk-history.ts` from the auctioneer with two key adaptations: (1) `buildTeamOwnerMap` takes `string[]` manager names instead of `Array<{ id, name }>` — in FFI managers are plain strings in `state.manager_order`; (2) `buildHistoryBlock` uses `TrashTalkType` and extends the trigger map for FFI-specific types (`keeper_steal` → steal moments, `bad_keeper` → overpay/bust moments). History loaded from bundled JSON at runtime (no network call). `teamOwnerMapRef` built once when `state.manager_order` first populates; per-alert owner lookup + historyBlock construction happens inline in the fire-and-forget loop.

**Changes:**
- `src/data/history.json` (new): 10 Nasties owner profiles — aliases, championships, worst seasons, signature moments, roast ammo; copied from auctioneer
- `src/lib/draft/trash-talk-history.ts` (new): `loadHistory()`, `matchOwnerToHistory()`, `buildTeamOwnerMap(managers: string[], history)`, `buildHistoryBlock(trigger: TrashTalkType, owner)`, all types exported
- `src/app/(app)/draft/live/client.tsx`:
  - Imports `loadHistory`, `buildTeamOwnerMap`, `buildHistoryBlock`, `TeamOwnerMap`
  - `teamOwnerMapRef`: built once from `state.manager_order` via one-time `useEffect`
  - Per-pick effect: owner lookup + `buildHistoryBlock()` → `historyBlock` passed to `generateTrashTalk()`
  - Keeper effect: same pattern

**Verification:** `npm run type-check` — clean. `npm run lint` — no new errors.

---

## 2026-04-16 — FF-310: Claude Haiku Trash Talk Generation

**Task:** FF-310 — Replace hardcoded message arrays with Claude Haiku generation  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** `analyzePickForTrashTalk()` returned alerts with hardcoded message strings from static arrays. FF-307 created the `/api/trash-talk` Claude Haiku endpoint but nothing called it from the live client.

**Approach:** Added `generateTrashTalk(alert, mode, historyBlock?)` to `src/lib/draft/trash-talk.ts` as a thin async wrapper that maps `TrashTalkAlert` fields to `TrashTalkRequest` and calls `/api/trash-talk`. In `live/client.tsx`, both trash talk `useEffect` hooks (per-pick and keeper one-time) now fire-and-forget this function after adding alerts to state. Alerts appear immediately with the hardcoded fallback message; when Haiku responds with a non-null line, the alert's `message` is updated in-place via a targeted `prev.map()`. Null response from API = hardcoded message kept, alert not dropped. All errors handled silently inside `generateTrashTalk()`. Draft UI never blocks.

**Changes:**
- `src/lib/draft/trash-talk.ts`: Added `export async function generateTrashTalk()` — maps `TrashTalkAlert` → `TrashTalkRequest` body, fetches `/api/trash-talk`, returns `line` or null; catch-all fail-silent
- `src/app/(app)/draft/live/client.tsx`:
  - Import updated to include `generateTrashTalk`
  - Per-pick `useEffect`: after `setTrashTalkAlerts([...prev, ...newAlerts])`, loops over `newAlerts` firing `void generateTrashTalk(alert, mode).then(line => { if (line) setTrashTalkAlerts(...map update) })`
  - Keeper `useEffect`: same fire-and-forget pattern applied to `keeperAlerts`

**Verification:** `npm run type-check` — clean. `npm run lint` — no new errors introduced (pre-existing errors in unrelated files).

---

## 2026-04-16 — FF-309 + Keeper/Sleeper Augmentation

**Task:** FF-309 + Tyler's Sleeper keeper league augmentation (pipeline)
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** Snake/both-format triggers were missing (market_mismatch, late_roster_qb_panic). Keeper league QB-detection was broken — `state.keepers` not included in `allPicks`, so `lone_wolf_qb` and `late_roster_qb_panic` would false-fire for any team with a keeper QB. No keeper value trash talk existed. Tyler's league moved from Yahoo to Sleeper.

**Approach:** `market_mismatch` iterates `allPicks` at same position within 15 ADP spots and compares price spread (auction) or round difference (snake). `late_roster_qb_panic` mirrors `lone_wolf_qb` but snake-only at lower threshold (7 vs 9 picks). Keeper fix: live client now prepends `keepersToPicks(state.keepers)` to `allPicksWithKeepers` before passing to trigger engine — no signature change needed, `is_keeper: true` flag already guards out keeper picks from triggering on themselves. New `analyzeKeeperPicksForTrashTalk()` fires once at draft start via a second effect with a processed ref guard.

**Changes:**
- `src/lib/draft/trash-talk.ts`:
  - `TrashTalkType` union: added `market_mismatch | late_roster_qb_panic | keeper_steal | bad_keeper`
  - Import `KeeperAssignment` from `./keepers`
  - `detectMarketMismatch()`: position-matched ADP-comparable picks, ≥35% price spread (auction) or ≥3 round diff (snake); skips keeper picks via `comp.is_keeper` guard
  - `detectLateRosterQbPanic()`: snake-only, 7+ picks, no QB — fires before `lone_wolf_qb` kicks in at 9
  - `export analyzeKeeperPicksForTrashTalk()`: batch keeper value analysis, returns `keeper_steal` (surplus ≥3 rounds or ≥$10) / `bad_keeper` (surplus ≤-2 rounds or ≤-$10) alerts
  - `analyzePickForTrashTalk`: `market_mismatch` wired after `steal`; `late_roster_qb_panic` wired after `lone_wolf_qb` (snake-only gate)
- `src/components/draft/trash-talk.tsx`: extended `trashTalkConfig` with 4 new type entries
- `src/app/(app)/draft/live/client.tsx`:
  - Import `keepersToPicks`, `analyzeKeeperPicksForTrashTalk`
  - `keeperAlertsProcessedRef`: one-time guard for keeper analysis
  - Per-pick effect: builds `allPicksWithKeepers` from keepers + regular picks before passing to trigger engine
  - New one-time effect: calls `analyzeKeeperPicksForTrashTalk` on draft load, populates alert feed
- `src/components/prep/league-config-form.tsx`: Tyler's preset → `"Tyler's Sleeper League"`, `platform: 'sleeper'`; button label updated

---

## 2026-04-16 — FF-308: Auction Trigger Engine Upgrade

**Task:** FF-308 (pipeline)
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** Trigger engine only had 4 rules (overpay, reach, imbalance, steal) using flat position-average fallbacks. No auction-specific budget/spending triggers.

**Approach:** Ported 6 triggers from AA reference spec. Added `impliedAuctionValue()` quadratic decay as the shared value baseline. Budget signals derived from `allPicks` + `DEFAULT_AUCTION_BUDGET` ($200) since budget config isn't passed through to the trigger layer. `first_defense_buy` required special pre-guard placement before the K/DEF skip. League-state triggers (`last_big_spender`, `budget_dominance`) fire regardless of who the current picker is.

**Changes:**
- `src/lib/draft/trash-talk.ts`:
  - `TrashTalkType` union: added `budget_buster | last_big_spender | cheapskate_special | budget_dominance | first_defense_buy | lone_wolf_qb`
  - `DEFAULT_AUCTION_BUDGET = 200`, `DEFAULT_ROSTER_SPOTS = 15`
  - `impliedAuctionValue(player, budget, teamCount)`: quadratic decay from ADP; uses `consensusAuctionValue` if set
  - `detectOverpay`: updated signature (budget, teamCount), uses `impliedAuctionValue`, guards `!player` to avoid false positives
  - `detectSteal`: updated signature (budget), uses `impliedAuctionValue`
  - Added: `detectBudgetBuster`, `detectLastBigSpender`, `detectCheapskateSpecial`, `detectBudgetDominance`, `detectFirstDefenseBuy`, `detectLoneWolfQb`
  - `analyzePickForTrashTalk`: `first_defense_buy` fires before K/DEF guard; `budget_buster` fires before self-pick gate; new priority order: `budget_buster > overpay > steal > last_big_spender > budget_dominance > lone_wolf_qb > cheapskate_special > first_defense_buy > reach > imbalance`
- `src/components/draft/trash-talk.tsx`: extended `trashTalkConfig` map with 6 new type entries

---

## 2026-04-16 — FF-307: Trash Talk API Route (Claude Haiku Generation)

**Task:** FF-307 (pipeline)
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Root Cause:** No server-side generation endpoint existed — trash talk messages were rule-based hardcoded strings with no AI variation.

**Approach:** Ported from AA reference (`fantasy_auction_auctioneer/src/app/api/trash-talk/route.ts`), using the project's existing `@anthropic-ai/sdk` pattern. Fail-silent throughout — trash talk is non-critical and must never surface errors to the draft UI.

**Changes:**
- `src/app/api/trash-talk/route.ts` (NEW):
  - `TrashTalkRequest` and `TrashTalkResponse` types exported (consumed by FF-310 client wrapper)
  - Family-Safe system prompt: PG-13, ≤80 chars, punches at situation not person
  - Adult-Only system prompt: Jeselnik/Ross/Hinchcliffe style, profanity required, ≤120 chars
  - `buildUserMessage()`: assembles trigger context, player/price/pick data, optional history block
  - Claude Haiku (`claude-haiku-4-5-20251001`), temperature 1.0, no streaming
  - Family-Safe max_tokens 60, Adult-Only max_tokens 80
  - Em-dash hard-strip: `raw.replace(/\u2014/g, '-').replace(/--/g, '-)` enforced post-response regardless of prompt compliance
  - Missing `ANTHROPIC_API_KEY` → `{ line: null }` (silent, not 500)
  - Any Claude SDK error → `{ line: null }` (silent)

---

## 2026-04-16 — FF-306: Trash Talk Mode Toggle at Session Setup

**Task:** FF-306 (output)
**Class:** `output` | **Lenses:** Delivery, QA

**Root Cause:** No way to configure trash talk intensity at session start — all users got the same rule-based alerts with no opt-out.

**Approach:** Session-scoped mode stored as `&ttm=` URL param (no DB migration needed — mode is fixed at session start, not persisted across sessions). Default: `family-safe`.

**Changes:**
- `src/app/(app)/draft/setup/client.tsx`:
  - Added `TrashTalkMode = 'off' | 'family-safe' | 'adult-only'` type
  - Added `trashTalkMode` state (default: `'family-safe'`)
  - Added 3-button selector card in Step 3 (Off 🔇 / Family-Safe 😄 / Adult-Only 🔥) using existing card-button pattern
  - Appended `&ttm=${trashTalkMode}` to `router.push` on session start
- `src/app/(app)/draft/live/client.tsx`:
  - Added `TrashTalkMode` type alias
  - Reads `ttm` from `useSearchParams()` (default: `'family-safe'`)
  - Trash talk `useEffect` returns early when mode is `'off'`; `trashTalkMode` added to dep array

---

## 2026-04-16 — FF-305: Wire Live Trash Talk Alerts into Live Draft Client

**Task:** FF-305 (shared)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** `analyzePickForTrashTalk()` and the `LiveTrashTalkAlert`/`TrashTalkFeed` components existed but were never called from any live draft page. Alerts never fired during a draft session.

**Approach:** Detect new picks via a `useEffect` watching `state` (which gets a new reference on every pick confirmation, whether from manual entry or sheet polling). A `processedPickCountRef` skips historical picks loaded on session start, then tracks the last analyzed index so only incremental picks get evaluated.

**Changes:**
- `src/app/(app)/draft/live/client.tsx`:
  - Added `useRef` to imports
  - Added imports: `TrashTalkFeed`, `SavedTrashTalk`, `analyzePickForTrashTalk`, `TrashTalkAlert`
  - Added `trashTalkAlerts` and `savedAlerts` useState arrays
  - Added `processedPickCountRef` (null until first state load)
  - Added `useEffect(deps: [state, players])` — on first load sets ref to skip existing picks; on subsequent state changes, slices new picks, calls `analyzePickForTrashTalk()` for each, pushes non-null results
  - Added `handleDismissTrashTalk`, `handleSaveTrashTalk`, `handleRemoveSavedAlert` callbacks
  - Renders `<TrashTalkFeed>` below `<PickFeed>` in left column
  - Renders `<SavedTrashTalk>` conditionally when saved alerts exist

---

## 2026-04-14 (session 8) — FF-276 / FF-277 / FF-278: Pre-Draft Tools

### FF-278: Consensus Shift Alerts

**Task:** FF-278 (shared)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** No visual signal existed to flag players whose ADP was being called differently across sources (ESPN vs. Sleeper vs. FantasyPros). A player with a wide ADP range across sources is either a breakout candidate or a volatile pick — either way worth flagging before draft day.

**Approach:** Cross-source divergence proxy (max ADP − min ADP across sourceData). Real historical ADP movement data is not stored, so this is honest about what the data supports.

**Changes:**
- `src/app/(app)/prep/board/client.tsx`: Stores raw `adp: Record<string, number>` from API response before `cacheToPlayers` conversion (conversion loses per-source data). Computes `adpDivergenceMap` (playerId → divergence). Renders "ADP Movers" chip strip above tabs when any player has divergence > 10 (top 6 shown, sorted descending by divergence).
- `src/components/draft/ffi-player-card.tsx`: Added `adpDivergence?: number` prop. Shows orange `↕N` indicator next to ADP in the value column when divergence > 10.
- `src/components/draft/player-pool.tsx`: Added `getAdpDivergence()` helper that inspects the raw `Record<string, number>` adp field on live draft players (typed as `number` but runtime is object from raw API). Passes computed divergence to each `FFIPlayerCard`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

### FF-277: Injury Watch Panel

**Task:** FF-277 (output)
**Class:** `output` | **Lenses:** Delivery, QA

**Root Cause:** During a live draft, injury news can break at any moment. There was no panel surfacing which undrafted players had active injury flags — forcing the user to mentally track status from memory or context-switch to a separate source.

**Changes:**
- `src/components/draft/injury-watch.tsx` (NEW): `InjuryWatch` component accepts `players[]` and `draftedNames`. Filters undrafted players with flagged status. Handles both `Player.injuryStatus` (camelCase, set by cacheToPlayer) and raw `injury_status` (snake_case, present on live draft's raw API data). Color-coded status badges: OUT/IR/PUP = red, DOUBTFUL = orange, QUESTIONABLE = amber, SUSPENDED = red/dim. Truncated to top 8. Auto-hides when no flagged players.
- `src/app/(app)/draft/live/client.tsx`: Added `InjuryWatch` import and rendered in right column between `PositionScarcityTracker` and `PlayerPool`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

### FF-276: Dry Run Simulation

**Task:** FF-276 (output)
**Class:** `output` | **Lenses:** Delivery, QA

**Root Cause:** No way to stress-test a draft strategy before draft day. Entering the live draft without knowing how the strategy performs against field competition leaves unanswered questions: "Would I end up with good RBs? Could I get shut out at a position?"

**Changes:**
- `src/app/(app)/prep/simulate/page.tsx` (NEW): Server component wrapper at `/prep/simulate`.
- `src/app/(app)/prep/simulate/client.tsx` (NEW): Full simulation client. Fetches `/api/players` and `/api/strategies`. Runs client-side simulation: for snake, user picks by `scorePlayersWithStrategy` combinedScore, others pick by ADP. For auction, round-robin with budget constraints, same pick logic. Outputs: simulated roster (player / position / round or price), per-position grades (A/B/C/F based on tier-1 starter coverage), overall verdict (Strong = 5+ top-50 players, Average = 3-4, Weak < 3), and shutout position alerts.
- `src/app/(app)/prep/page.tsx`: Added "Dry Run" HubCard linking to `/prep/simulate`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean (54 pages, `/prep/simulate` included)

---

All notable changes tracked here with root cause analysis.

---

## 2026-04-14 (session 7, cont.) — FF-272: Strategy Drift Alert

**Task:** FF-272 (shared)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** When all of a strategy's player targets get drafted by other managers, the AI silently shifts to best-available mode with no notification. The user has no idea the plan has changed — they think the AI is still targeting specific players when it isn't.

**Changes:**
- `src/lib/draft/flow-monitor.ts`: Added `StrategyDrift` type and `detectStrategyDrift(strategyTargets, draftedNames, myPickedNames)`. Classifies each strategy target as gone (drafted by others) or remaining (still on board). Targets the user themselves drafted are excluded. `active = true` when `goneTargets.length > 0 && remainingTargets.length === 0`. Also imports `StrategyPlayerTarget` from database types.
- `src/app/(app)/draft/live/client.tsx`: `myPickedNames` useMemo (user's own picks by `state.manager_order[0]`); `driftAlert` useMemo (fires after pick 3, null when dismissed); `handleDismissDrift` callback (`driftDismissed` state); `driftAlert` + `onDismissDrift` passed to `DraftFlowAlerts`.
- `src/components/draft/draft-flow-alerts.tsx`: Renders orange "Strategy drift" banner with struck-through target name badges and "Got it" dismiss button between the pivot suggestion and flow alerts. Early return guard updated to include `driftAlert`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-271: Data Source Attribution

**Task:** FF-271 (shared)
**Class:** `shared` | **Lenses:** QA

**Root Cause:** Recommendations showed reasoning but gave no indication of which data sources contributed. Users had no way to judge whether a recommendation was backed by 1 source or 4.

**Changes:**
- `src/lib/draft/explain.ts`: Added `sources: string[]` to `Explanation` type. In `explainPlayer()`, collects unique display names from `player.sourceData` (espn→ESPN, yahoo→Yahoo, sleeper→Sleeper, fantasypros→FantasyPros) plus `AI Analysis` when `player.analysis` exists.
- `src/components/draft/ffi-ai-insight.tsx`: Renders a muted pill row above the Key Factors block showing "Sources: ESPN · FantasyPros · AI Analysis" (or whatever applies). Empty if no sources.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-270: Confidence Indicators — Thin Data Flag

**Task:** FF-270 (shared)
**Class:** `shared` | **Lenses:** QA

**Root Cause:** `explainPlayer()` calculated confidence purely from factor consistency (positive vs. negative counts). A player with 1 data source and no ADP could still receive "medium" or "high" confidence, misleading the user on draft day.

**Changes:**
- `src/lib/draft/explain.ts`: Added `dataWarning?: string` to `Explanation` type. Added `assessDataCoverage(player)` helper — returns a warning string when `sourceData.length < 2` or when both `adp` and `consensusRank` are 0. In `explainPlayer()`, if triggered: appends a `Thin Data` sentinel factor (weight 0, neutral) and forces `confidence = 'low'`. Returns `dataWarning` on the `Explanation` object.
- `src/components/draft/ffi-ai-insight.tsx`: When `dataWarning` is set, renders an amber "Low confidence — [reason]" banner above the insight text. Confidence bar color shifts: amber for thin data, red for conflicting signals, green otherwise. `Thin Data` sentinel filtered out of Key Factors chips and insight text construction.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-243: Confirm/Dismiss System Tag Actions

**Task:** FF-243 (shared + pipeline)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** System tags (BREAKOUT/VALUE/SLEEPER/BUST/AVOID) generated by AI analysis could not be dismissed by users. A dismissed tag still contributed to scoring and still cluttered the UI even when the user disagreed with the AI's assessment. The build plan note "UI ready — needs API only" was inaccurate; the card had no dismiss controls at all.

**Changes:**
- `src/app/api/user-tags/route.ts`: Extended PATCH handler to accept `action: 'dismissSystemTag' | 'undismissSystemTag'` with `tag` field. Atomically adds/removes the tag from `dismissed_system_tags` (JSONB array) in `user_tags` table. Creates the row with `tags: []` on first dismissal if none exists.
- `src/hooks/use-user-tags.ts`: Added `useSystemTagActions(leagueId?)` hook exposing `dismissSystemTag(playerCacheId, tag)` and `undismissSystemTag(playerCacheId, tag)` (same PATCH pattern as `useToggleTag`).
- `src/components/prep/ffi-player-intel-card.tsx`: Added `dismissedSystemTags`, `onDismissSystemTag`, `onUndismissSystemTag` props. Dismissed tags render grayed-out (opacity-40, muted badge) with a "restore" text link. Active tags show a hover-visible × dismiss button. `primaryBadge` useMemo skips dismissed tags in compact view.
- `src/app/(app)/prep/players/client.tsx`: Imports and calls `useSystemTagActions`; adds `handleDismissSystemTag`/`handleUndismissSystemTag` callbacks; passes `dismissedSystemTags` and handlers to `FFIPlayerIntelCard`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-273: Keeper Equity Panel

**Task:** FF-273 (new feature)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** Keeper leagues need a way to evaluate whether each keeper is a good deal vs. current market. No equity visibility means Tyler is flying blind when deciding which players to keep and at what round cost.

**Changes:**
- `src/app/(app)/prep/keepers/client.tsx`: Added "Keeper Equity" card below the declared keepers list. Lazy-loads `/api/players` only when keepers exist. Uses existing `analyzeKeeperValues()` from `lib/draft/keepers.ts` to compute `surplus = round cost − ADP round` (snake) or `market − cost` (auction). Rows sorted descending by surplus (best deals first). Each row shows position, player name, round cost, ADP round, and a color-coded surplus badge (green = bargain, red = overpay, muted = no market data). Legend line explains the sign convention. Auction vs. snake display adapts to league format.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-268: Mobile-First Primary Action Audit

**Task:** FF-268 (output/UX)
**Class:** `output` | **Lenses:** QA, Delivery, Design

**Root Cause:** Setup wizard CTAs were at the bottom of free-scrolling containers, so on Step 3 with 10+ managers the "Start Draft" button was buried below the fold. Back buttons were text-only links with no touch target sizing. The ManualPickEntry clear (×) button had no height/width, making it a ~20px tap target.

**Changes:**
- `src/app/(app)/draft/setup/client.tsx`: All 4 steps now return a Fragment with scrollable content (`pb-24`) + fixed bottom CTA bar (`fixed inset-x-0 bottom-0 z-30 ffi-glass-heavy`), matching the live draft bar pattern. Error display for steps 3/4 moved into the fixed bar so it's always visible. Back buttons in steps 2/3/4 now have `min-h-[44px] flex items-center px-1`.
- `src/components/draft/manual-pick-entry.tsx`: Clear nomination button in bar variant changed from `text-lg leading-none` to `w-11 h-11 flex items-center justify-center` — 44px tap target.
- `src/app/(app)/draft/review/client.tsx`: View mode tab buttons (`My Draft / All Teams / Trash Talk`) bumped from `py-2.5` (~36px) to `min-h-[44px]`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7) — FF-275: Yahoo Keeper Assignment Import

**Task:** FF-275 (new feature)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** Tyler's keeper league (Yahoo snake) requires entering keepers manually one-by-one. Yahoo's keeper confirmation page can be copy-pasted but there was no import path, making setup tedious for 3+ keepers.

**Changes:**
- `src/app/(app)/prep/keepers/client.tsx`: Added "Import from Yahoo" collapsible section (collapsed by default) above the manual keeper list, visible only for snake leagues. Section contains a textarea for paste input, a "Parse & Import" button, and inline feedback (e.g. "3 keepers imported, 1 line skipped"). Added pure `parseYahooKeeperText()` function handling two Yahoo copy-paste formats: colon-style (`Round 3: Justin Jefferson (WR) - Tyler`) and tabular (`Justin Jefferson  WR  Round 3  Tyler`). Position normalization: DEF/D/ST → DST. Invalid lines are skipped with a count shown. Parsed entries are appended (not replaced), deduplicated by player_name case-insensitively. Added `normalizePosition()` helper.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6, cont.) — FF-267: Format Gate as First Live Draft Screen

**Task:** FF-267 (new feature / UX)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** The draft format (auction vs snake) was inherited silently from the league config with no explicit confirmation step. A user with a misconfigured league or who just forgot which format was set could enter the wrong mode without any friction.

**Changes:**
- `src/app/(app)/draft/setup/client.tsx`: Inserted new Step 1 (Format Gate) as the literal first screen of live draft setup. Shows a large, visually distinct confirmation card — green + "AUCTION DRAFT" or blue + "SNAKE DRAFT" — with league name, team count, and budget/format details. Requires explicit "Confirm — Start [Auction/Snake] Draft →" click to proceed. Includes "Wrong format? Update your league config" escape link. If multiple leagues exist, the league dropdown is on this screen. Renumbered old steps 1→2 (input method), 2→3 (session details), 3→4 (keepers); all internal step transitions updated. League dropdown removed from Step 3 (now handled in Step 1).

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

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
