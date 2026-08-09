# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-08-09
- **Focus:** UXV2-8, final UX-V2 VERIFY + reconcile the DESIGN docs to the shipped live room. **This closes the UX-V2 track (UXV2-1 through UXV2-8 all done).**
- **Status:** UXV2-8 LANDED. Ran the full-track VERIFY and reconciled the design docs (docs-only; no source changed this session). VERIFY: `tsc --noEmit` 0 errors; `npm run lint` 27 errors + 98 warnings, ALL pre-existing in untouched research-pipeline / supabase files (0 new); `npm run test:run` 40/40; `npm run build` clean (`/draft/live` in route list). Docs: `DESIGN_SYSTEM.md` gained a v3.1 row + a new "Shipped Live Auction Room (UXV2-6/7)" section (the `theme.ts` scoped palette - canvas `#060c14`, four moves lime-volt `#d4ff00` BID / amber-gold `#f5a623` HOLD / orange PUSH / red PASS; the lean no-filter/no-framer-motion stance; the reduced-motion DIAL-DOWN policy) plus reconciliation notes at the three contradicting spots (the "NO gold" rule now records the room's single scoped-gold exception; the "Motion is FIRST-CLASS" section flagged as aspirational-not-shipped; the reference-mockup line points at the v4 mockup + `theme.ts`). `UI_DESIGN_SPEC.md` got a top as-built banner + a Section 13 reduced-motion dial-down note. All added doc text verified em/en-dash free by grep. Palette/motion claims verified against `theme.ts`, a live-room dir grep (only motion = one `motion-safe:animate-pulse`), and the `.ffi-live-room` block in `globals.css`. No paid endpoints fired.
- **NEXT:** UX-V2 track is complete. Next work is whichever item Joe prioritizes from the remaining BUILD_PLAN backlog (see "What's Broken / Known Issues" + the deferred BACKLOG below).
- **CAVEAT:** Pixel screenshots blocked (Browser pane not compositing frames); render verified via live DOM against dev server (port 3003). Dev `/api/players` cache has NO consensusTier/consensusAuctionValue, so sim shows UNRANKED / $1 ranges — a dev-data gap, not a logic bug (production data populates these; unit tests prove the logic with realistic fixtures). Pre-existing `npm run lint` has 27 errors in untouched files (react-hooks strict rules in use-user-tags, research/*, supabase/middleware); the 10 new/changed room files are lint-clean. A `playwright` devDependency + scratch files (`_dev_s5.js`, `fp_*.html`, `screenshot.mjs`, `out.txt`) are uncommitted and left out of the room commit for Joe to decide on.
- **GATED:** FFT-008 needs Joe on phone. Live AI calls need `ANTHROPIC_API_KEY` + typed cost approval.
- **BACKLOG (deferred, tracked in CODE_REVIEW_2026-06.md):** giant-component extraction (live/review clients), broader test suite, sheet/dedup hardening, connection-pill a11y size.

## Last Completed (most recent first)
- **UXV2-8: final UX-V2 VERIFY + DESIGN docs reconciled (CLOSES UX-V2 TRACK)** (2026-08-09): Ran the whole-track VERIFY and brought the design docs in line with the shipped live room. Docs-only session, no source touched. VERIFY: type-check 0 errors, lint 27 pre-existing errors (0 new, all in untouched research/supabase files), tests 40/40, build clean with `/draft/live` in the route list. Reconciled `DESIGN_SYSTEM.md` (v3.1 row + new "Shipped Live Auction Room (UXV2-6/7)" section documenting the `theme.ts` scoped amber-gold + lime-volt four-move palette, the lean/no-filter/no-framer-motion performance stance, and the reduced-motion DIAL-DOWN policy; plus reconciliation notes at the "NO gold" rule, the "Motion is FIRST-CLASS" section, and the reference-mockup line) and `UI_DESIGN_SPEC.md` (top as-built banner + Section 13 reduced-motion dial-down note). Marked UXV2-8 `[x]` and added a CHANGELOG entry. All added doc text is em/en-dash free (grep-verified); claims verified against `src/components/draft/live-room/theme.ts`, a live-room dir grep, and the `.ffi-live-room` block in `globals.css`. Committed by explicit path. No paid endpoints fired. **UX-V2 (UXV2-1 .. UXV2-8) is now fully complete.**
- **UXV2-7 — reduced-motion dial-down + perf/arm's-length pass** (2026-08-09): Guarded every animation in the live auction room as DIAL-DOWN (per Joe's reduced-motion rule), not strict-off, and confirmed the room is smooth/screenshot-able on phone. Two files: `src/components/draft/live-room/auction-room.tsx` (added the `ffi-live-room` class to the room root - className only, no layout change) and `src/app/globals.css` (new scoped `@media (prefers-reduced-motion: reduce)` block right after the existing one: `.ffi-live-room *` transition-duration -> 75ms `!important` = cross-fades stay but halved; `.ffi-live-room :active` transform -> none `!important` = the `active:scale-90/95` tap-feedback is neutralized). The status-bar LIVE dot pulse was already correctly gated by `motion-safe:animate-pulse`, so it stops under reduced-motion with no change. The room has NO framer-motion, NO entrance keyframes, NO persistent glows, and NO animating background/filter layers, so there was no `will-change` to release and no GPU promotion to add. VERIFIED on the running dev server (:3003) via live DOM (Browser pane is 0x0 / non-compositing, so no pixel screenshot - same documented limitation): rule shipped into the browser's parsed CSSOM; a media-condition toggle drove real computed styles from 0.15s -> 0.075s on a `transition-opacity` cross-fade AND on a `transition-transform` element, then restored; 80 ResearchView `active:scale-90` tap buttons all inside `.ffi-live-room` and covered by the transform-neutralize rule; 735-element room audit = 0 filter/backdrop-filter/animated-shadow/will-change; mobile 375 = 0 horizontal overflow, room 343px. Also: `tsc` 0 errors, ESLint clean on the changed `.tsx`, 40/40 tests, `build` clean. Committed by explicit path. No paid endpoints fired.
- **UXV2-6 part 2 — Research-tab draft-mode screen** (2026-08-09): Built the Research tab as an internal room view, not a route change. NEW `src/components/draft/live-room/research-view.tsx` — locked v3 Phone 2 layout with Recent Sales removed per v4: sticky on-the-block mini strip (position badge + name + tier + target star + team/bye, then range + inline record) → filter bar (position pills + ★ Target View) → available player list (star toggle, position badge, name + optional real-`analysis` signal chip, tier chip, range or `AVOID` dim+strikethrough) → tappable `TierContext` that filters the list. Inline record reuses `addManualPick` (price input + team dropdown defaulting to the user + RECORD). `bottom-nav.tsx` gained `onSelectView` so Research/Draft switch the room view (Review/Setup still navigate); `auction-room.tsx` holds a `view` state, renders `ResearchView` vs the draft body, gates the bottom record bar to Draft, threads `managerNames`/`myManager`/`onRecordPick`/`onToggleTarget`; `client.tsx` added `useToggleTag` + an `onToggleTarget` that toggles then `refetch`es tags; `use-user-tags.ts` `refetch` now force-bypasses the cache guard so a star toggle reflects immediately. Signal chip renders ONLY from real `player.analysis` (no fabrication). Same guards: tier→NR, ranges floored to $1, bye omitted. FIXED during verify: rows nested the star `<button>` in the row `<button>` (hydration error) → restructured to sibling buttons (`button button` count 0, no warning). VERIFIED: tsc 0 errors, 5 changed files lint-clean, 40/40 tests, build clean (`/draft/live` in route list), live DOM proof of view switch + tap-to-block + inline RECORD firing `addManualPick` (available 255→254, picks 83→84) + position/Target View filters + tier-context filtering in sim. Star persistence not exercisable in sim (demo `demo-league` id is not a valid league UUID so the PATCH is DB-rejected; wired correctly, works against a real league). No paid endpoints fired. Remaining in UXV2-6 track: none — parts 1 + 2 both landed.
- **UXV2-6 part 1 — Live Auction Draft Room** (2026-08-09): Built the approved v4 decision-first room. NEW `src/components/draft/live-room/` (auction-room composer, status-bar, on-the-block-card with the What-To-Do block, awareness-strip, budget-strip, tier-context, my-team-roster, bottom-nav, block-picker-sheet, theme). NEW `src/lib/draft/what-to-do.ts` — pure decision brain returning one directive move (HOLD/BID/PUSH/PASS) + cap + plain rationale, reusing existing engine outputs, no LLM/network; 11 unit tests. `live/client.tsx` early-returns the room for auction and leaves the snake layout untouched; secondary panels preserved in a mount-on-open "More tools" section. Guards: tier NaN → UNRANKED/NR, missing bye omitted, $0 caps floored to $1. VERIFIED: build clean, 11/11 tests, tsc 0 errors, live DOM proof in sim. Remaining: Research-tab draft screen (part 2).
- **On-the-block card LOCKED + draft board RESET** (2026-06-25): Re-ran the design process with Joe using the new **Reference Board** step (now enshrined in dev-workflow-builder methodology §6.2): built a real-screen annotated board, Joe picked references, then one mockup. **APPROVED + LOCKED — the on-the-block player card** (`public/on-the-block.html`): position is the HERO (large), jersey # secondary, info set = position · team · jersey# · bye · age · seasons · ht · wt ONLY. Deliberately excluded (never tips a pick): $ value, ADP/rank, tiers, projections, last-year production — those belong on the draft board POST-draft as a +/- vs last year. EA-FC walkout material (matte depth, one team-color accent, restraint) + smoke-cloud reveal animation. **REOPENED — the multi-team draft board (phone + TV hero):** first attempt was shotgunned without the process and rejected by Joe as low-quality; `draft-board.html` + `draft-board-tv.html` DELETED. The board goes back through the Reference Board step before any rebuild. **RESOLVED (2026-06-25):** (1) **FULL REDESIGN — GRIDIRON volt-green/electric-blue is being REPLACED entirely, not preserved.** The EA-FC dark card with a per-player TEAM-COLOR accent is the new foundation. Do NOT reintroduce GRIDIRON volt/blue or treat it as a constraint; the old mockups (`.claude/mockups/draft-room-phone.html`, `live-draft-room-v1.html`) are legacy. (2) **NO bidding UI confirmed.** Removed the card's "Bid" CTA. The personal on-the-block card (your phone) shows player + factual info + YOUR private max-bid ADVICE; the shared TV board shows everyone's money/roster but NO advice (so it never tips the room). The app records picks and advises; it never places a bid. No app source changed this session (mockups only).
- **UXV2-3** (2026-06-06): Prep Hub GRIDIRON redesign. `prep/page.tsx` fully rewritten — four sections: Setup (Configure League full-width ffi-card-interactive), Research (ffi-hero hero card with stat row + AI Read panel + volt CTA + 3-tile Research grid), Players (2-col Browser/Keepers), Draft Day (2-col Dry Run ghost + Start Draft volt-lit). Approved phone mockup at `.claude/mockups/prep-hub-phone.html`. Background via `body::before { position:fixed }` technique (iOS-safe). type-check clean, 29/29 tests, 0 net-new lint errors, build passes. Commit 5676f96.
- **UX-V2 direction pivot** (2026-06-04): Stadium Primetime rejected by Joe as generic AI slop. Ran a 10-app reference review (Apple Design Awards 2025, Linear, Family, Raycast, Sleeper, Underdog, EA FC Ultimate Team, The Athletic, Copilot Money, Duolingo). Joe's pick: EA FC Ultimate Team energy + Linear discipline. Built live-auction co-pilot mockup `.claude/mockups/draft-room-phone.html` + desktop `live-draft-room-v1.html`. Set palette = colorful-dark canvas + volt green (moment/value/action) + electric blue (structure); fonts Anton/Saira Condensed/JetBrains Mono; performant (no backdrop-filter stacks). Corrected product model: live in-person auction, app records results + advises, NO bidding UI. Rendered PNG via headless Edge for remote/phone review. BUILD_PLAN: added UX-V2 track, marked Stadium Primetime SUPERSEDED. No app source changed.
- **FF-313** (2026-06-04): App-shell double-mount fix (Option D). Created `src/hooks/use-is-mobile.ts` — `matchMedia` hook, updates on resize, SSR-safe default `false`. `src/components/layout/app-shell.tsx`: removed the parallel `hidden md:block` + `md:hidden` wrappers that both rendered `{children}`; replaced with single conditional `{isMobile ? SwipeCarousel path : desktop path}`. Eliminates 2× API polling, 2× scoring, and last-write-wins clobber race on manual picks in `LiveDraftClient`. DOM check: `contentWrapperCount = 1` at 1280px + 375px. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.
- **UX-7.3** (2026-06-04): One-tap demo entry. `DEMO_SESSION`+`DEMO_LEAGUE` constants added above the component in `live/client.tsx` — 12 Nasties managers, $200 budget, ESPN/PPR auction. Session-load `useEffect` now branches: `simEnabled && !sessionId` injects mock data + fetches real players (persistence 404s fail silently). Amber "Demo Draft" card added to `draft/page.tsx` (`NODE_ENV === 'development'` guard, links to `/draft/live?sim=1`). Verified via DOM snapshot: room shows "The Nasties (Demo)", 12 teams, $200, SIM HUD, all managers. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.
- **UX-7.2** (2026-06-04): Sim signature moments. Scripted 3-pick WR run at picks 8-10 in `use-draft-simulator.ts` so `PositionRunTicker` fires reliably. Added `suppressAI?: boolean` to `AuctionAdvisor` + `SnakeAdvisor` (wired into `useAutoRecommend` `enabled` guard). `live/client.tsx`: `useRouter` added; `useEffect` auto-pushes to `/draft/review?session=<id>` when `isSimActive && state.status === 'completed'`; `suppressAI={isSimActive}` passed to both advisors; trash talk `generateTrashTalk()` gated behind `!simEnabled`. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.
- **UX-7.1** (2026-06-04): Dev-only sim engine. NEW `src/hooks/use-draft-simulator.ts`: `useDraftSimulator` hook gated on `NODE_ENV !== 'production' && ?sim=1`. Ref pattern (mirrors use-sleeper-draft-feed). Players sorted by consensusRank; auction price from consensusAuctionValue; snake uses `state.current_manager`; auction cycles round-robin via `auctionMgrIdxRef`. Speed control: slow 3s / medium 1.5s / fast 0.6s. `live/client.tsx`: added `simEnabled` check, hook call, and sim HUD bar (amber SIM badge + Start/Pause + Reset + speed selector + pick counter). Gate: production build strips it entirely. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.
- **UX-6.4** (2026-06-03): UX-6 QA gate close-out. DOM-level snapshot audit of 6 screens (Prep Hub, Configure, Draft Board, Draft Setup, Live Auction Draft Room, Post-Draft Review) at desktop 1280px + mobile 375px. All panels render without errors. Real player data confirmed (3093 cached, 8 INJURY WATCH entries, 180+ player pool, 12 managers). `preview_screenshot` timed out on all attempts (heavy CSS filter stack); `preview_snapshot` substituted as authoritative record. Audit document: `.claude/UX6_AFTER_AUDIT.md`. No source code changed.
- **UX-6.3** (2026-06-03): Background-layer GPU promotion. `globals.css` only — `.atmos-grain` gains `transform: translateZ(0)` (dedicated compositor layer; before my change `getComputedStyle().transform` returned `none`). `.stadium-atmos.atmos-clock` + `body.ffi-on-the-clock .stadium-atmos` gain `will-change: filter` so filter-brightness animation is pre-allocated on GPU. Reduced-motion block resets those two to `will-change: auto` to release GPU memory when animations are off. type-check clean, 29/29 tests, 0 net-new lint errors, build clean. Arm's-length physical test (FFT-008) still deferred — needs Joe on phone.
- **UX-6.2** (2026-06-03): WCAG contrast + reduced-motion audit. `globals.css`: `--ffi-text-muted` #64748b→#7d8fa8 (passes 5.33:1 on `#0a1b25` surface, was 3.69:1). `glass-interactive:hover` added to reduced-motion block. `ffi-motion.tsx`: `useReducedMotion()` added to all 11 animation components — `FFIGlowPulse` persistent loop skipped, spatial transforms (y/x/scale/rotate) zeroed on entrance, whileHover/whileTap set to `{}`. Previously correct: `FFICelebration`, `FFIConfettiBurst`. type-check clean, 29/29 tests, 0 net-new lint errors, build clean.
- **UX-6.1** (2026-06-03): Empty states + skeletons across remaining screens. `page-skeleton.tsx`: removed shadcn Skeleton dep, replaced with inline `.ffi-skeleton` shimmer divs, card wrappers upgraded to `bg-[#0a1b25] border-white/[0.04]`. `prep/runs/client.tsx`: 3x `Loader2` spinners replaced with shimmer row skeletons; 2x empty state `<Card>` replaced with glass divs. `prep/strategies/client.tsx`: `Loader2` loading state replaced with shimmer skeleton cards; empty state upgraded to glass + v2.0 text tokens; unused `Loader2` import removed. `prep/runs/page.tsx` + `prep/strategies/page.tsx`: h1 → `ffi-display-md text-white` + p → `ffi-body-md text-[var(--ffi-text-secondary)]`. Verified live on /prep/runs + /prep/strategies. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.
- **UX-4.1 + UX-4.2** (2026-06-03): Prep Hub gold hover + Configure form glow. `prep/page.tsx` HubCard: icon/title/chevron hover updated from lime `--ffi-accent` to gold; icon container from slate-800 to v2.0 surface-container token. `configure/page.tsx`: h1 replaced with `ffi-display-md` v2.0 header. `globals.css`: added `.ffi-form-input` gold-glow focus class. `league-config-form.tsx`: `ffi-form-input` applied to all 11 inputs/selects. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.
- **Sunday Night Gridiron (Phases 0-5)** (2026-06-03): AAA broadcast-graphics UI + code-review P0 fixes. New files: `hooks/use-auto-recommend.ts`, `hooks/use-haptic.ts`, `lib/sound/use-sound.ts`, `lib/view-transition.ts`, `components/draft/pick-lower-third.tsx`, `components/draft/live-scorebug.tsx`, `components/draft/position-run-ticker.tsx`, `components/settings/sound-settings.tsx`, `lib/draft/__tests__/state.test.ts`, `.claude/CODE_REVIEW_2026-06.md`, `.claude/AAA_UI_RESEARCH.md`. Edited: `globals.css` (cyan token, easing, @property, tabular-nums, lower-third/ticker/scorebug/grade-ring CSS), `ai/claude.ts` (caching+guard), `api/draft/recommend/route.ts` (resilience+fallback), `draft/state.ts` (keeper completion), `position-scarcity.tsx` (default false), `auction-advisor.tsx`+`snake-advisor.tsx` (auto-fire), `ffi-motion.tsx` (FFICelebration gold tone + FFIConfettiBurst), `ffi-primitives.tsx` + `trash-talk.tsx` + live/review clients (emoji purge + grade-gold + sensory wiring), `eslint.config.mjs` (dash guard). type-check clean, build passes, 29/29 tests, 0 net-new lint errors.
- **App-shell double-mount investigation** (2026-06-03): Investigation only — NO code changed (fix proposed, awaiting Joe's approach pick). `app-shell.tsx` renders `{children}` in both the desktop (`hidden md:block`) and mobile (`md:hidden` SwipeCarousel) wrappers, so React mounts the route twice (confirmed live: `.ffi-onclock-banner` count = 2). Affects every `(app)` page; `LiveDraftClient` worst case — 2× polling/scoring + a last-write-wins clobber race that can drop manual picks (PATCH replaces the whole array, so no duplicate picks). Full analysis + Option D (recommended) vs Option B in BUILD_PLAN **FF-313**.
- **UX-2 (Opus elevation)** (2026-06-03): Reviewed Sonnet's UX-2 and upgraded the design-judgment core. (1) On-the-clock spotlight now fires only at the moment (snake turn / auction on-the-block) via `body.ffi-on-the-clock`, not the whole draft — preserves gold-as-the-moment. (2) Added on-the-clock HERO banner (`.ffi-onclock-banner` — gold glass + breathing glow + Framer spring reveal; Clock icon snake / Gavel icon auction). (3) Finished the lime → blue/value-green recolor in `client.tsx` (StrategyPicker icon+active, MySquad Target, "Roster complete!"). (4) Gray `--ffi-border` hairline → white light-catch. Visual-only (reads existing state). type-check clean, 27/27 tests, 0 lint errors; banner + spotlight verified live on both formats at 1280 + 390 (DOM geometry + computed styles).
- **UX-3.1–3.3** (2026-06-03): Draft Board / Player Pool v2.0. Ranks 1–24 gold, 25+ blue, no italic ghost. JetBrains Mono tabular-nums on all values/ADP/scores. Position filter active: lime → blue (board client + FFIPositionFilters). Sticky glass filter headers in both DraftBoardClient and PlayerPool. Density toggle (compact/comfortable) in both. Skeleton shimmer loaders replace loading text. Flash streaks: lime → gold. type-check clean, 27/27 tests, 0 lint errors in changed files.
- **UX-2.1–2.4** (2026-06-03): Live Draft Room v2.0. Gold Radio icon + AUCTION/SNAKE mode badge in header. `body.draft-active` class triggers `atmos-clock` gold spotlight pulse via CSS. `.ffi-pick-flash` CSS utility for gold-glow on newest pick (box-shadow only, no conflict with Framer Motion). PickFeed: your picks = gold left rail + gold-bright player name + gold price. Record button in pinned bar: lime → metallic gold gradient (`.ffi-btn-hero` values). ConnectionStatusPill: value-green LIVE state + glass blur on pill + `ffi-glass` error bar. TrashTalk steal/budget_dominance/keeper_steal: `--ffi-success → --value-green`. Bookmark icon gold. MySquadPanel budget: blue primary. type-check clean, 27/27, lint 0 errors.
- **UX-1.1–1.7** (2026-06-02): Stadium Primetime foundation. Superseded DESIGN_SYSTEM.md → v2.0; created UI_UPGRADE_PLAN.md + UI_DESIGN_SPEC v2.0 addendum; added UX track to BUILD_PLAN. `layout.tsx` loads Space Grotesk/Manrope/JetBrains via next/font (Inter dropped; fonts verified live on :3003 — fixes the long-standing silent system-font fallback). `globals.css`: gold ramp + value-green tokens, `.stadium-atmos`/`.atmos-grain`/`.atmos-clock` background, 3-tier light-catch glass (all gray card borders removed), `.ffi-btn-primary`(blue)/`.ffi-btn-hero`(gold)/`.ffi-btn-value`(green), `.ffi-animate-reveal`(+gold flash)/`.ffi-animate-stagger`. `app-shell.tsx`: atmosphere layers replace light-streak/flash divs; active nav lime→gold. `ffi-primitives.tsx`: FFIButton hero/value variants. type-check clean, 27/27 tests, changed files lint clean. Full `next build` deferred (port 3003 held by parallel dev server).
- **FFT-005** (2026-06-02): Prep configure + player pool Chrome test — `/prep/configure` renders ESPN/Auction/12-team/$200/Full PPR; Draft Board loads 500 players from Sleeper-seeded cache; 3 console issues all pre-existing (ThemeToggle hydration × 2 + user_tags fetch). PASS.
- **FFT-004** (2026-06-02): Seeded 2026 NFL players via Sleeper API. Created `scripts/seed-players-sleeper.ts` — fetches 12,194 players, filters to 3,064 active QB/RB/WR/TE/DEF (no kickers), deduplicates 16 name collisions → 3,048 unique rows upserted. Supabase total: 3,093. PASS.
- **FFT-002 + FFT-003** (2026-06-02): Chrome UI smoke tests — all prep screens pass; live draft auction + snake both render with connection pill, manual bar, 300-player pool. 3 bugs fixed (see below). ThemeToggle hydration mismatch and `user_tags` missing are known outstanding issues. Two Supabase migrations need Joe to apply via Dashboard SQL Editor.
- **Bug fixes** (2026-06-02): `createLeague` DEV_MODE now saves to Supabase via service role key; `ffi-player-card.tsx` `$undefined`/`$NaN-$NaN`/`Rd NaN` fixed with null-guards; `manual-pick-entry.tsx` `$undefined` in search dropdown fixed.
- **FF-DS-001–005** (2026-06-02): UI Design Spec formalized — `.claude/UI_DESIGN_SPEC.md` created, all 17 sections filled from DESIGN_SYSTEM.md.
- **FFT-001** (2026-06-02): PARTIAL PASS — dev server starts, build clean (3.8s), root → 200, /api/players/status → 200 (573 players in cache, last seeded 2026-03-22 — stale). One remaining blocker: ANTHROPIC_API_KEY missing from .env.local (AI calls will fail until added).
- **FF-269** (2026-06-02): Touch target audit — 7 elements in 4 files bumped to min-h-[44px]: position filter pills + sort tabs (ffi-position-filters.tsx), expand chevron (ffi-player-card.tsx), error bar Retry + dismiss × (connection-status-pill.tsx), card submit + undo (manual-pick-entry.tsx). Physical test FFT-008 still needs Joe on phone.
- **FF-283** (2026-04-16): Added `maxBidAdviceMap: Map<string, number>` useMemo in `live/client.tsx` — calls `calculateMaxBidAdvice()` for every undrafted player, keyed by lowercase name. Deps: `[state, scoredPlayers, draftedNames, strategy]` — all three pick sources (Auctioneer BroadcastChannel/localStorage, Sheets, manual) flow through `setState` and invalidate the memo. Added `maxBidMap?: Map<string, number>` prop to `PlayerPool`; each `FFIPlayerCard` now gets per-player strategy-aware max bid (not a global flat value). `MySquadPanel` keeps the simple `getMaxBid()` result. Import added: `calculateMaxBidAdvice` from `auction-advisor`. Type-check clean, lint zero new errors.
- **FF-282** (2026-04-16): Created `src/hooks/use-draft-feed.ts` — wraps `useAuctioneerfeed`, converts `AuctioneerPick[]` → `NormalizedPickEvent[]` via `createPickMerger()` + `playerNameToPickId()`. Re-exports `NormalizedPickEvent` + `AuctioneerConnectionType`. Gated: `format === 'auction'` (internal). Updated `live/client.tsx`: import swapped to `useDraftFeed` + `NormalizedPickEvent`; handler ref type updated; `pick.player_name` → `pick.playerName` in handler body; `useAuctioneerfeed(...)` → `useDraftFeed({format, connectionType, onNewPicks})`; gating now internal to hook. Sheets polling in `use-draft-state.ts` untouched — Tyler's path zero behavior change. Type-check clean, lint zero new errors.
- **FF-281** (2026-04-16): Created `src/lib/draft/auction-feed-merge.ts` — pure utility, no React deps. `NormalizedPickEvent` (pickId, playerName, manager, price, position?, source). `createPickMerger()` factory returns stateful `PickMerger` with `merge()`, `reset()`, `seenCount`. `playerNameToPickId()` synthesizes `sheets:<name>` IDs for sources without native pick IDs. Ready for FF-282's `use-draft-feed.ts` to consume.
- **FF-280** (2026-04-16): Added BroadcastChannel subscriber to `src/hooks/use-auctioneer-feed.ts`. New `useEffect` gates on `enabled && connectionType === 'localstorage'`. Opens `BroadcastChannel('ffi-auction-feed')`, on each message: reads teamNameMap from `auctioneer-draft-v1` localStorage, routes the single `_AAPick` through existing `processBatch` (seenPickIdsRef dedup). Channel fires instantly; 3-second poll below it serves as catch-up for any missed messages. Auctioneer publisher (`ffiBroadcastRef.postMessage`) was already wired in AA-INT1 (`draft/page.tsx` lines 86-93, 129). Zero changes to Auctioneer repo. Type-check clean, lint zero new errors.
- **FF-279** (2026-04-16): Created `src/hooks/use-auctioneer-feed.ts` — two polling paths (localStorage: reads `auctioneer-ffi-feed-v1` + `auctioneer-draft-v1` every 3s; file: polls `FileSystemFileHandle` from File System Access API every 3s). Auctioneer `Pick` normalized to FFI `AuctioneerPick` with teamId→name resolution. Dedup via `seenPickIdsRef`. Setup client: added Auctioneer Sync card in Step 3 (auction-only) with Same Device + Export File options; `setGlobalFileHandle` called on file pick; `?aif=` param appended to live URL. Live client: `onAuctioneerpicks` stable callback via `useCallback([])` + `handleAuctioneerPicksRef`; picks filtered against `draftedNames` before `addManualPick`; `AA ✓N` badge in header when connected. Type-check clean, lint clean (no new errors in changed files).
- **FF-311** (2026-04-16): Created `src/lib/draft/trash-talk-history.ts` — ported from auctioneer with adaptations: `buildTeamOwnerMap` takes `string[]` manager names (no team IDs), `buildHistoryBlock` uses `TrashTalkType` with FFI-specific trigger mappings (keeper_steal/bad_keeper added). Copied `src/data/history.json` (10 Nasties owner profiles). Wired into `live/client.tsx`: `teamOwnerMapRef` built once from `state.manager_order`; `historyBlock` computed per-alert and passed to `generateTrashTalk()` in both pick and keeper effects.
- **FF-310** (2026-04-16): Added `generateTrashTalk()` to `src/lib/draft/trash-talk.ts` — thin async wrapper that maps `TrashTalkAlert` fields to `TrashTalkRequest` and calls `/api/trash-talk`. Wired fire-and-forget calls in both trash talk `useEffect` hooks in `live/client.tsx` — alerts added to feed immediately with hardcoded message, then message updated in-place when Haiku responds non-null. Null response keeps hardcoded fallback. Keeper effect receives same treatment. Type-check clean.
- **FF-309 + Keeper/Sleeper augmentation** (2026-04-16): Added `market_mismatch` (both formats — ADP-comparable picks at same position with ≥35% price spread or ≥3 round diff) and `late_roster_qb_panic` (snake-only, 7+ picks no QB). Added `analyzeKeeperPicksForTrashTalk()` export — fires `keeper_steal`/`bad_keeper` alerts at draft start for keeper leagues. Live client now passes `keepersToPicks(state.keepers)` merged into `allPicks` so QB-detection triggers work correctly in Tyler's keeper snake league. Tyler's league preset updated from Yahoo → Sleeper in league-config-form.
- **FF-308** (2026-04-16): Upgraded auction trigger engine in `src/lib/draft/trash-talk.ts`. Added `impliedAuctionValue()` quadratic decay formula (replaces `AVG_POSITION_VALUES` fallback in overpay + steal). Added 6 triggers: `budget_buster` (>60% spent, <35% roster filled), `last_big_spender` (pick 30+, exactly 1 team >2x avg remaining AND >$30), `cheapskate_special` (price ≤$3, avg <$7/pick), `budget_dominance` (pick 40+, top team >1.5x avg remaining AND >$30), `first_defense_buy` (fires BEFORE K/DEF guard), `lone_wolf_qb` (9+ picks, no QB). Priority order updated. `TrashTalkType` union + component config map extended. `detectOverpay` and `detectSteal` updated to use `impliedAuctionValue`.
- **FF-307** (2026-04-16): Created `src/app/api/trash-talk/route.ts`. Claude Haiku (temperature 1.0, no streaming). Family-Safe: PG-13 system prompt, max_tokens 60. Adult-Only: Jeselnik/Ross/Hinchcliffe style, max_tokens 80. Em-dash hard-strip enforced post-response. Fail-silent on all errors — always returns `{ line: null }` rather than breaking the draft. Exports `TrashTalkRequest` and `TrashTalkResponse` types for FF-310 client wrapper.
- **FF-306** (2026-04-16): Added 3-way trash talk mode selector (Off/Family-Safe/Adult-Only) to setup Step 3. `TrashTalkMode` type defined in both files. Mode passed as `&ttm=` URL param to live client. Live client reads param from searchParams (default: `family-safe`), gates the trash talk `useEffect` with early return when `'off'`.
- **FF-305** (2026-04-16): Wired `analyzePickForTrashTalk()` into `live/client.tsx`. Added `trashTalkAlerts` + `savedAlerts` state, `processedPickCountRef` to skip historical picks on load, `useEffect` watching `state` + `players` to detect incremental picks from both manual entry and sheet polling. Renders `<TrashTalkFeed>` and `<SavedTrashTalk>` below `<PickFeed>` in left column. Dismiss removes from feed; save moves to saved list. Rule-based only — no LLM calls.
- **FF-257** (2026-04-14): Sticky pinned `ManualPickEntry` bar at viewport bottom. Added `bar` variant to `manual-pick-entry.tsx`, removed component from left column in `live/client.tsx`, rendered as `fixed inset-x-0 bottom-0 z-40 ffi-glass-heavy` with `env(safe-area-inset-bottom)` padding. Search dropdown opens upward. Defaults collapsed on mobile (search + price + Record), expanded on desktop. Card variant preserved for backward compat. Build/lint/test/type-check all clean.
- **FF-253/254** (2026-04-14): UI evaluation gate — verdict B (targeted redesign). 4 fixes scheduled: FF-257, FF-258, FF-259, FF-274. FF-255/256 (full redesign sprint) skipped.
- **Enterprise dev system upgrade** (2026-04-14): `.claude/` upgraded to Enterprise tier — REVIEW_LENSES, FEATURES_INDEX, CODE_AREAS, CHANGELOG, hooks, code-review skill.

## Historical (Sprint 9 — Design System Foundation, 2026-03-22)

## Last Completed
### Sprint 9 details (archived):
- FF-060: Design system tokens — COMPLETE
  - Full FFI color palette in globals.css
  - Surface hierarchy utilities (ffi-surface, ffi-surface-elevated)
  - Glassmorphism utilities (ffi-glass, ffi-glass-heavy)
  - Shadow and glow effects (ffi-shadow-card, ffi-glow-accent)
  - Gradient utilities (ffi-bg-gradient, ffi-gradient-progress)
- FF-061: Typography overhaul — COMPLETE
  - Added Oswald font for display headlines
  - Full type scale (ffi-display-xl through ffi-caption)
  - All-caps label treatment with letter-spacing
- FF-062: Component primitives reskin — COMPLETE
  - FFI button variants (primary lime pill, glass secondary, ghost)
  - FFI card variants (default, elevated, interactive)
  - FFI input styles (recessed, glow focus)
  - FFI badges (position-specific QB/RB/WR/TE/K/DEF, status badges)
  - FFI progress bars (gradient, scarcity status indicators)
  - App shell updated with FFI branding and styling

## Files Modified (This Session)
- `src/app/globals.css` — Complete FFI design system tokens and utilities
- `src/app/layout.tsx` — Added Oswald font, updated metadata to FFIntelligence
- `src/components/ui/ffi-primitives.tsx` — NEW: React component primitives
- `src/components/layout/app-shell.tsx` — Updated with FFI styling and branding
- `.claude/BUILD_PLAN.md` — Marked Sprint 9 tasks complete

## Next Up
- **Phase 6 Sprint 10:** Screen redesigns (FF-063 through FF-066)
  - FF-063: App shell + nav redesign (full redesign, not just styling)
  - FF-064: Prep Hub redesign
  - FF-065: Draft Board redesign (compact player cards)
  - FF-066: Live Draft room redesign
- FF-072: Live draft dry run — mock Google Sheet + Sleeper draft, full live draft flow

## New FFI Components Available
```tsx
// Buttons
<FFIButton variant="primary|secondary|ghost">
// Cards
<FFICard variant="default|elevated|interactive">
<FFICardHeader>, <FFICardTitle>, <FFICardDescription>
// Badges
<FFIBadge position="QB|RB|WR|TE|K|DEF">
<FFIBadge status="success|warning|danger|info">
<FFIPositionBadge position="RB" />
// Progress
<FFIProgress value={75} status="critical|stable|elite" label="RBs" />
// Grades
<FFIGrade grade="B+" size="sm|default|lg" />
// Composite Cards
<FFITacticalInsight insight="..." confidence={98} />
<FFITrashTalkAlert type="overpay" message="..." />
<FFIAIRecommendation title="..." message="..." />
<FFIPlayerCard rank={1} name="CMC" ... />
```

## Architecture Notes
- shadcn/ui v4 uses base-ui (not Radix) — no `asChild` prop on Button/TooltipTrigger
- `buttonVariants()` is client-only, can't be called in server components — use plain Tailwind classes for Links in server pages
- Dev mode (`DEV_MODE=true`) bypasses all Supabase auth, returns mock user
- Middleware redirects: root → /prep, auth routes → /prep (when authenticated)
- Dark mode is default (class="dark" on html element)
- Draft state is immutable — `applyPick()` returns new state, enables undo
- Session picks persist to Supabase via PATCH /api/draft/sessions/[id]
- Keepers stored in session.keepers jsonb, applied to state at init via `applyKeepersToState()`
- Keepers have negative pick_numbers to distinguish from real draft picks
- Keeper picks are excluded from draft grading (only real picks are graded)
- `getDraftedPlayerNames()` includes both real picks AND keeper player names
- Explainability engine uses `calculateScarcity()` shared between scarcity tracker and "Why?" reasoning
- Auction advisor uses analyzeBudgetStrategy() for pace tracking, getPositionUrgencyWarnings() for scarcity alerts
- LLM recommendations via /api/draft/recommend — sends top 15 available players + context, gets back 3 targets (~500 tokens)

## Notes
- gh CLI not installed — GitHub repo needs web UI or gh install
- Port 3003 to avoid conflicts
- Joe = ESPN / Auction / Full redraft
- Tyler = Sleeper / Snake / Keeper league (T&A Keeper League)

---

## Next Up

**P0 sub-tier 0 — UI Evaluation (FF-253)**
1. Audit all live-draft screens against the 6 criteria in `.claude/BUILD_PLAN.md`
2. Produce `.claude/UI_EVAL_2026.md` with verdict A, B, or C
3. Verdict determines whether redesign sprint fires before P0 sub-tiers 1-7

---

## Enterprise Sections

### Last 48 Hours
- 2026-04-14: Enterprise dev system upgrade — added FEATURES_INDEX.md, CODE_AREAS.md, CHANGELOG.md, REVIEW_LENSES.md, hooks/pre-commit-gate.ps1, skills/code-review/SKILL.md, settings.json, .github/workflows/ci.yml. Merged PROPOSE/PATCH/VERIFY + Review Lenses + Bug Hunt Schedule + Evidence Standard into CLAUDE.md. Rewrote BUILD_PLAN.md to P0-P7 structure.

### What Works (Verified)

| Feature | Last Tested | Status |
|---------|-------------|--------|
| Prep mode (full flow) | Phase 7.5 complete | Working |
| Live draft — auction mode | Sprint 8 complete | Working |
| Live draft — snake mode | Sprint 8 complete | Working |
| AI recommendations | Sprint 8 complete | Working |
| Player Intelligence | Phase 7.5 complete | Working (FF-243 API pending) |
| In-season companion | Phase 8 complete | Working |
| Google Sheets polling | Integrated | Working (known 403 edge case) |
| Manual pick entry | FF-033 | Working |
| Post-draft review | FF-102 | Working |
| Vercel deploy | FF-070 | https://fantasyfootballdraftapp-lac.vercel.app |

### What's Broken / Known Issues

#### P0 (Blocking draft day)
- **FF-313 — App-shell double-mount (architectural; fix proposed, not yet applied):** `LiveDraftClient` mounts twice (desktop + mobile wrappers both render `{children}`). 2× polling/scoring on the live-draft screen + a last-write-wins clobber race that can silently drop manually-entered picks (no duplicate picks in DB — PATCH replaces the whole array). Awaiting Joe's pick of Option D vs B; needs live confirmation of the clobber path. See BUILD_PLAN FF-313.
- Otherwise none confirmed — needs audit (FF-253)

#### Known Non-Blocking
- FF-243: Confirm/dismiss system tag API pending
- FF-269: Arm's-length physical test — needs Joe on phone
- FF-072: Live draft dry run not yet completed
- Google Sheets 403 edge case on first connect (non-blocking — manual entry fallback works)

### Blockers

| Blocker | Blocking | Owner | Since |
|---------|----------|-------|-------|
| `ANTHROPIC_API_KEY` missing from `.env.local` | All AI calls (research pipeline, recommendations, trash talk) | Joe — add key to `.env.local` | 2026-06-02 |

### Google Sheets Setup (Exact Format)
Document exact format when confirmed:
- **Sheet URL:** [Joe fills in — Nasties 2026 auction sheet]
- **Column auto-detection:** Player | Manager | Price | Round | Position (see `src/lib/sheets/index.ts:54-91`)
- **Share permissions:** Anyone with link = Viewer (for CSV export polling)
- **Polling interval:** 7 seconds (`use-draft-polling.ts` default)
- **Error handling:** 403/404 → surface error message, fallback to manual entry
- **Note:** Tyler uses Sleeper app (snake/keeper) — FF-312 adds Sleeper live draft polling as a 4th draft mode

### Commands Reference

```bash
npm run dev          # Dev server on localhost:3003
npm run build        # Production build
npm run lint         # ESLint (hard gate on commit)
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier on src/
npm run type-check   # TypeScript (advisory)
npm run test:run     # Vitest single run (advisory on commit)
npm run test         # Vitest watch mode
npm run test:coverage # Coverage report
```

### Demo Draft Launch (dev only — UX-7.3)

Open this URL in any browser on the same network as the dev server:

```
http://localhost:3003/draft/live?sim=1
```

For phone access (replace IP with your machine's local Wi-Fi IP):

```
http://192.168.x.x:3003/draft/live?sim=1
```

Get your local IP in PowerShell:
```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like '*Wi-Fi*' }).IPAddress
```

- No login or Supabase session required (DEV_MODE bypass + mock session)
- Loads with 12 Nasties managers, $200 budget, ESPN/PPR auction, real seeded players
- Hit **Start** in the amber SIM HUD to auto-play picks
- Draft Hub (`/draft`) shows an amber "Demo Draft" card in dev only
- Gate: `NODE_ENV !== 'production'` — card and mock session are stripped from the Vercel build

### Bug Hunt Status

| Cadence | Mode | Last Run | Next Run |
|---------|------|----------|----------|
| Per-sprint | free | Never | Before first P0 code change |
| Monthly | full | Never | End of first P0 sprint |
