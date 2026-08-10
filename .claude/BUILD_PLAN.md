<!-- DASHBOARD_STATUS
{
  "currentPhase": "P0-UX — Full UX Overhaul (Nasties Auction only)",
  "status": "active",
  "milestones": [
    { "name": "P0-UX — Full UX overhaul, auction-only, mobile-first [ACTIVE 2026-08-08]", "done": false },
    { "name": "Data pipeline + strategy engine (Phase 0-2)", "done": true },
    { "name": "Live draft mode (Phase 3)", "done": true },
    { "name": "Polish + scoring intelligence (Phase 4-5)", "done": true },
    { "name": "UI redesign + player intel (Phase 6-7.5)", "done": true },
    { "name": "In-season AI companion (Phase 8)", "done": true },
    { "name": "P0 — Personal season hardening (Aug 2026 drafts)", "done": false },
    { "name": "UX — AAA Visual Upgrade (Stadium Primetime) [SUPERSEDED 2026-06-04]", "done": true },
    { "name": "UX-V2: GRIDIRON Redesign (EA FC + Linear) [ACTIVE]", "done": false },
    { "name": "P1 — Auctioneer integration", "done": true },
    { "name": "P1b — Remote/cross-device auctioneer live sync (FF-314)", "done": true },
    { "name": "P2 — Pre-season validation (Joe auction only)", "done": false },
    { "name": "P3+ — Commercialization [RETIRED 2026-08-06]", "done": true }
  ],
  "nextItems": [
        "UX-S1 through UX-S6 done. UX-S6 shipped the Review tab (blueprint 9.7): live/client.tsx auto-navigates to /draft/review?session=<id> on draft completion (sim and real), Leave button routes to Review when complete; review/page.tsx header removed (client owns it); review/client.tsx reads ?session= URL param, shows Review h1 + volt session-date chip + Back-to-Draft link + mandatory loading/empty/error states, hides session selector when session is pre-selected via URL. Type-check 0 + lint 0. NEXT: UXV2-6 (Live Auction Draft Room rebuild) - DESIGN-BLOCKED, needs Joe sign-off on Reference Board step first. See .claude/UX_OVERHAUL_2026-08.md.",
    "UXV2-6 [DESIGN-BLOCKED, NOT ready to code]: Rebuild Live Auction Draft Room. Blocked on the multi-team draft board mockup (phone + TV hero) clearing the Reference Board step + Joe sign-off (first attempt rejected + deleted 2026-06-25). NOTE: the GRIDIRON mockups (.claude/mockups/draft-room-phone.html, live-draft-room-v1.html) are LEGACY as of the 2026-06-25 pivot — do NOT build to them. The on-the-block card WORKING_STATE calls locked at public/on-the-block.html is MISSING from disk + git — re-confirm with Joe before treating any artifact as the contract.",
    "UXV2-7: Performance + arm's-length pass (only after UXV2-6 lands)",
    "UXV2-8: VERIFY lint + tests + build + update DESIGN docs + WORKING_STATE (only after UXV2-6 lands)"
  ]
}
-->

# Fantasy Football Draft Advisor — Build Plan

Task tracking: `[ ]` = not started, `[~]` = in progress, `[x]` = complete

**Status:** `[ ]` Not started | `[~]` In progress | `[x]` Done | `[!]` Blocked

---

## Dev Cycle

```
1. Find FIRST [ ] item in highest priority (P0 > P1 > P2 > P3+)
2. PROPOSE: classify change, identify Review Lenses, declare scope
3. PATCH: implement
4. VERIFY: success criterion met + lint + tests pass + CHANGELOG updated
5. Commit + push + mark [x]
6. Tell human: "Ready to test [feature]"
7. REPEAT
```

---

## P0-UX — Full UX Overhaul (Nasties Auction ONLY) [ACTIVE 2026-08-08]
> **Goal:** Fix the information architecture and usability end-to-end. Auction-only (no snake/keeper), mobile-first. Full spec + per-screen "what buttons do" + session plan: `.claude/UX_OVERHAUL_2026-08.md`. Supersedes the July `UX_IA_PROPOSAL.md` spine.
> **Rule:** Sessions run in order. Nothing after UX-S1 starts until Joe signs off on the 4-tab IA spine (doc Section 3). UI phase and works-for-real phase come AFTER the UX sessions.

- [x] UX-S1: Review the actual app (9 screens + code) and document the overhaul approach — root problems, new 4-tab IA (Research/Draft/Review/Setup), per-screen spec, auction-only kill list, FF-314 connection UX, session plan. Output: `.claude/UX_OVERHAUL_2026-08.md`. **IA spine (4 tabs) LOCKED by Joe 2026-08-08 — UX-S2 cleared.**
- [x] UX-S2: IA reskeleton — replaced 3-tab nav (Home/Draft/Settings) with 4 tabs (Research→/prep, Draft→/draft, Review→/draft/review, Setup→/settings) in `app-shell.tsx` (desktop sidebar + mobile bottom bar) and `swipe-carousel.tsx` (swipe order + dots). Added longest-prefix `getActiveHref`/`activeSectionIndex` so /draft/review lights up Review not Draft. No visual polish, no content rebuild, no file moves (URL slugs cleaned up per-tab in S3-S6). VERIFIED: typecheck 0, lint 0 errors on changed files, nav + active-state proven on desktop 1440 + mobile 390 (both nested directions). | `shared`
- [x] UX-S2.5: Per-screen UX layout blueprint — defined for EVERY screen (Research landing, Player Browser, Draft Board, Strategies, Draft pre-Go-Live, Draft live room, Review, Setup landing + League Config / Draft Setup / Run History / Account / Appearance sub-screens): the ONE hero, top-to-bottom section order, the single primary action + what's demoted to secondary, empty/loading/error states, and the tap-flow in/out — plus global mobile-first frame conventions (one hero per screen, thumb-zone primary, permanent tab bar except live room, mandatory 3 states). Grounded in the real routes on disk + the locked Nasties config. Output: **Section 9** appended to `.claude/UX_OVERHAUL_2026-08.md`. This is the contract UX-S3..S6 build to — no screen gets built without its blueprint. | `docs`
- [x] UX-S3: Research tab consolidation — rebuilt Research landing (9.1), Player Browser (9.2), Draft Board (9.3), Strategies (9.4) to GRIDIRON per Section 9. Research landing: killed the card-dump, Run Research panel as the ONE hero + explicit-tap AI-cost guard + quiet jump rows + latest-run highlights. Player Browser: search/filter hero, result-count header, tap-to-expand, target/avoid toggle, no-players deep-links to Run Research, filters-empty Clear filters, error Retry. Draft Board: ranked board + meta strip + filter/sort pills, single Nasties league (no picker), real empty + deep-link, graceful error+Retry. Strategies: active-strategy hero (name + budget-by-position bars) + saved list, demoted Dry Run to a quiet row, genuine "No strategy yet" empty. Fixed double-header in players/page.tsx + strategies/page.tsx (wrappers now defer the header to the client). VERIFIED: typecheck 0, lint 0 on all changed files; 8 Playwright screenshots (4 screens x mobile 390 + desktop 1440) with real connected data. AI-cost POST endpoints never fired during verify. | `shared`
- [x] UX-S4: Draft tab = live auction room ONLY + FF-314 auto-connect, persistent 4-state connection chip, interruption/retry, manual fallback. Rebuilt `/draft` as the pre-Go-Live screen (blueprint 9.5): ONE hero = large centered 4-state ConnectionStatusPill + plain-words status; primary `Go Live` enabled when the auctioneer feed is detected else "Waiting for auctioneer…"; secondary `Start in Manual mode` text button; pre-flight card (managers/budget/scoring) + Edit-in-Setup; loading/no-league/error states. Live room (blueprint 9.6): full-screen — `app-shell.tsx` hides sidebar + mobile top header + bottom tab bar + swipe-carousel on `/draft/live`; room owns a single "Leave" affordance top-left; the chip reflects the remote proxy for internet auctions. FF-314: new `src/app/api/auctioneer-feed/route.ts` server-side proxy (CORS dodge, Upstash `draft-current`, 5s timeout, wraps raw DraftState) + `use-remote-auctioneer-feed.ts` (3s poll, exp backoff 3→6→12s cap 15s, per-session dedup, retry) folded into `use-draft-feed.ts` as a NEW SOURCE (not a new mode); Tyler's snake/Sheets/manual path untouched. VERIFIED: typecheck 0, lint 0 on all changed files; dev server (3003) no server errors; render proof (real Nasties data) for pre-Go-Live + live room on mobile 390 + desktop 1440; full-screen room confirmed (no tab bar / no sidebar / Leave present). Cost constraint honored — only free Upstash reads (`/api/auctioneer-feed`) fired, never `/api/research` or `/api/strategies/propose`. | `pipeline`
- [x] UX-S5: Setup tab + data correctness — league config with LOCKED Nasties defaults auto-seeded + editable (QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1), draft setup, demo, run-history log, Account from real signed-in user (remove hardcoded propermuse.co email), remove Draft sounds + snake + keeper; fix "failed to fetch leagues". VERIFIED: typecheck 0, lint 0 on all changed files; `/settings` (5 sections + real Supabase user email + ThemeRow with mounted guard), `/prep/configure` (Nasties defaults auto-seeded: QB:1 RB:1 WR:1 TE:1 FLEX:3 K:0 D/ST:1 Bench:5 IR:1), `/draft/setup` (back link + updated header), `/prep/runs` (back link + empty state) all verified via live DOM against dev server. Demo Draft entry surfaced in Setup. Snake/keeper/sounds UI removed. "Failed to fetch leagues" dead-end replaced with graceful "Go to Setup" empty + real deep-links. Pre-existing sidebar ThemeToggle hydration warning unchanged (logged in FFT-002, non-blocking). | `pipeline`
- [x] UX-S6: Review as its own tab, linked from Draft post-draft. | `output`

---

## P0 — Personal Season Hardening
> **Goal:** Joe's ESPN auction draft works flawlessly on Aug 2026 draft day. Tyler's Yahoo snake/keeper league is on PERMANENT HOLD and out of scope for this app.
> **Rule:** Every sub-tier beyond 0 is contingent on sub-tier 0's verdict.

### Sub-tier 0: UI Evaluation & Possible Redesign [GATE]
> **Resolve this first before ANY other P0 work. Verdict determines scope of 1-7.**

- [x] FF-253: Audit all live-draft screens against 6 criteria: (a) pinned quick-entry bar fit without cramping recommendations, (b) first-screen mode selector, (c) connection status placement glanceable at arm's length, (d) confidence/source attribution badges without visual clutter, (e) keeper visual distinction on board, (f) dual-mode layouts (auction vs snake) with zero component bleed
- [x] FF-254: Produce `.claude/UI_EVAL_2026.md` — **VERDICT B: Targeted redesign** — 2 screens + ~4 components; proceed to sub-tiers 1-7 with targeted fixes already scheduled
  - **Verdict A:** Keep current UI — minor tweaks only; proceed directly to sub-tiers 1-7
  - **Verdict B:** Targeted redesign — redesign 1-3 screens, keep the rest ← **THIS ONE**
  - **Verdict C:** Full redesign sprint — full live-draft + prep surface rebuild before sub-tiers 1-7
- [ ] FF-255: _(Conditional on B or C — SKIPPED: verdict B scope is contained in FF-257–259, FF-274)_ Redesign sprint — brainstorm via `superpowers:brainstorming` → mockups → Tyler phone test → lock `DESIGN_SYSTEM.md` v2
- [ ] FF-256: _(Conditional on B or C — SKIPPED: fixes are targeted, no full rebuild needed)_ Implement redesign — complete before sub-tiers 1-7 begin

---

### Sub-tier 1: Live Draft Integration Reliability

- [x] FF-257: Promote `manual-pick-entry.tsx` to always-visible pinned quick-entry bar — **revised 2026-04-14**: always-open On Block slot (no collapse/expand); BID button on player cards nominates a player without navigating away; price auto-fills from consensusAuctionValue; bar wired via onBlockPlayer state in LiveDraftClient
- [x] FF-258: Mode selector at session start: Sheets / Manual / Offline simulation — 3-step setup flow: mode → league confirm + managers → keeper review (keeper leagues only); manager section preserved; no re-entry of league settings on draft day
- [x] FF-259: Connection status indicator — 4-state ConnectionStatusPill (LIVE/STALE/OFFLINE/MANUAL), always visible; pulsing green dot + elapsed timer when LIVE; OFFLINE tap expands error bar; replaces binary Wifi icon
- [x] FF-313: App-shell double-mount fix (Option D). `src/hooks/use-is-mobile.ts` (new) — `matchMedia` hook, fires on resize. `src/components/layout/app-shell.tsx` — replaced double-render block (hidden md:block + md:hidden both mounting children) with single `{isMobile ? <SwipeCarousel>…children… : …children…}`. Confirmed: `contentWrapperCount` DOM check = 1 at both 1280px and 375px (was 2). Zero double-polling; no clobber race.
---

### Sub-tier 2: ESPN Auction Calibration

- [x] FF-261: Audit `src/lib/draft/auction-advisor.ts` for ESPN default $200/15-slot model accuracy — verify `calculateMaxBidAdvice()` math against ESPN defaults — **CONFIRMED CORRECT**: `emptySlots = totalSlots - picks.length - 1` correctly implements ESPN's $1-minimum reserve rule; `getMaxBid()` in state.ts uses identical formula; no hardcoded slot counts; `budget_total ?? 200` fallback is display-only, not safety-critical
- [x] FF-262: Position budget tracker — spend by position vs. plan, live delta display (e.g., "RB: $67 / $80 planned")
- [x] FF-263: Budget health panel — $ spent/remaining, slots filled/remaining, implied $/slot for remaining roster
- [x] FF-264: Per-player "max comfortable bid" display — consensus ADP value alongside recommended max, visible over/underpay delta

---

### Sub-tier 3: Auction vs. Snake Full Separation

- [x] FF-265: Audit `src/components/draft/*` for snake/auction concept bleed — snake concepts (round, pick order) must not appear in auction UI and vice versa — **one real bleed found + fixed**: `PositionScarcityTracker` showed dollar spend ranges in snake mode (showSpendRanges defaults true; calculateScarcityExtended always populates spendRange/avgValue from player auction values); fixed by passing `showSpendRanges={state.format === 'auction'}` in client.tsx; all other 11 files audited clean
- [x] FF-266: Split `src/lib/draft/recommend.ts` into `recommend-auction.ts` / `recommend-snake.ts` — separate Claude prompts for each format
- [x] FF-267: Mode selection is the literal first screen of live draft — impossible to enter wrong mode without explicit confirmation

---

### Sub-tier 4: Mobile-First Audit

- [x] FF-268: Every live draft screen: primary action reachable with one thumb, no scrolling required for any core action
- [x] FF-269: Arm's-length + bad-lighting physical test — code audit done 2026-06-02: 7 elements in 4 files bumped to min-h-[44px]; physical verification (FFT-008) still requires Joe on phone

---

### Sub-tier 5: AI Transparency

- [x] FF-243: Confirm/dismiss system tag actions — PATCH /api/user-tags handles dismissSystemTag/undismissSystemTag; useSystemTagActions hook; dismissed tags render grayed-out with restore link in FFIPlayerIntelCard; wired in PlayerBrowserClient
- [x] FF-270: Confidence indicators on recommendations — assessDataCoverage() in explain.ts detects <2 sources or missing ADP+rank; Thin Data factor added; confidence forced 'low'; amber warning banner + colored confidence bar in FFIAIInsight
- [x] FF-271: Data source attribution — sources[] on Explanation type; collected from player.sourceData + AI Analysis; rendered as muted pill row in FFIAIInsight
- [x] FF-272: Strategy drift alert — detectStrategyDrift() in flow-monitor; orange "Strategy drift" banner in DraftFlowAlerts with struck-through target names when all targets are gone; dismissible

---

### Sub-tier 6: Tyler's Keeper League (Yahoo snake) - PERMANENT HOLD
> **PERMANENT HOLD - out of scope (Tyler's league removed from this app):** Tyler's Sleeper/Yahoo snake/keeper league is NOT part of this app and is on indefinite backlog. Focus is Joe's Nasties 12-person ESPN auction ONLY. All items below were completed before the scope change; the code remains in the repo but must not be treated as active scope. Do NOT do keeper/snake/Yahoo work without Joe explicitly reactivating it.

- [x] FF-069: Tyler's league setup — T&A Keeper League scoring + keeper config entered; `TYLERS_SLEEPER_SCORING` in scoring-presets.ts; preset updated (2 FLEX, no K, 2 IR, 6pt passing TDs, 0.5 PPR, 4pt safety, yardage bonuses); draft order + keeper selections to be entered at draft setup time
- [x] FF-273: Keeper discount calculator — keeper cost vs. current ADP value = keeper equity, sorted descending
- [x] FF-274: Visual distinction between kept and drafted players — keeper picks (is_keeper=true OR pick_number<0) show 🔒 icon, muted name (#94a3b8), K1/K2/K3 pick numbers in PickFeed + LeagueOverview; helpers extracted to lib/draft/keepers.ts
- [x] FF-275: Yahoo keeper assignment import → auto-exclude from draft pool

---

### Sub-tier 7: Pre-Draft Tools

- [x] FF-276: Dry run simulation — run full draft strategy against historical ADP to stress-test
- [x] FF-277: Draft day news panel — surface injury/status changes within 24 hours of draft; flag any board player with status change since last refresh
- [x] FF-278: Consensus shift alerts — highlight players whose ADP moved >5 spots since last refresh

---

### Sub-tier 8: Trash Talk Live Wiring

- [x] FF-305: Wire `analyzePickForTrashTalk()` into the live draft client — `LiveTrashTalkAlert` and `TrashTalkFeed` exist in `src/components/draft/trash-talk.tsx` and `analyzePickForTrashTalk()` exists in `src/lib/draft/trash-talk.ts`, but none are called from any live draft page (only post-draft `RoastReportCard` is wired); add a `trashTalkAlerts` useState array in `src/app/(app)/draft/live/client.tsx`, call `analyzePickForTrashTalk()` after every confirmed pick (Sheets poll, manual entry, BroadcastChannel), push non-null results to state, render `<TrashTalkFeed>` with dismiss/save handlers in the live draft UI; rule-based only — LLM generation comes in FF-310

---

## UX-V2: GRIDIRON Redesign (ACTIVE visual track)
> **Why this exists:** On 2026-06-04 Joe reviewed the shipped "Stadium Primetime / Sunday Night Gridiron" UI and rejected it as generic AI slop (deep navy + glass + gold glow + gradients, the no-opinion default every AI produces). It rendered correctly (verified live) but had no point of view. This track replaces it.
> **Direction (Joe-chosen from a 10-app reference review):** EA Sports FC Ultimate Team energy + Linear discipline. Bold where the draft is live, disciplined everywhere else.
> **Status:** Direction LOCKED 2026-06-04 - volt green accent, EA-FC-meets-Linear energy as in the mockup, clean on-the-block card (no live "going for" tracker). Building DESIGN_SYSTEM v3 + the real live room next; the per-screen rollout (UXV2-3/4/5) runs as PARALLEL agents (Joe, 2026-06-04).
> **Hard rule:** Visual rebuild only. Reuse engine / data / advisor / feed logic untouched. Performance is a mandate: NO stacked backdrop-filter blur (the old build was so filter-heavy it could not even be screenshotted, which is also a phone-perf red flag). Gradients + box-shadow + transform/opacity only.

### Reference bar (what "AAA" means here) - Joe's reactions, 2026-06-04
- Love / north star: EA Sports FC Ultimate Team menus ("YES this is what I'm talking about").
- Elegance bar: Linear.
- Liked with caveats: Family (animation quality yes; no light mode, no cheese), Raycast + Linear (beautiful but too black, want color + depth), Copilot Money (beautiful but too many colors, want a SET palette), Sleeper (good color, not elegant enough).
- Hard no: Underdog (too flat / minimal).

### Locked design DNA (LOCKED 2026-06-04)
- Canvas: colorful-DARK. Deep midnight with blue + violet + faint turf-green lit depth. Never flat black, never light.
- Set palette: volt green = the moment / value / your action ONLY; electric blue = structure / info / depth; position chips muted; one iridescent sheen on the hero card (texture, not a fourth color). No gold-glass anywhere.
- Type: Anton (broadcast hero), Saira Condensed (labels), JetBrains Mono (every number, tabular).
- Premium FEEL is core, EQUAL WEIGHT to the visuals (Joe, 2026-06-04: "I want that premium app feel"): Family-grade fluid motion, tactile micro-interactions on every touch, cinematic signature moments. Motion is half of AAA (see UXV2-2b + DESIGN_SYSTEM Motion). If it does not feel alive in the hand, it is not done.

### Corrected product model (Joe, 2026-06-04) - applies to all auction screens
- Joe's draft is a LIVE IN-PERSON auction. The app does NOT place or manage bids.
- The app does two things: (1) STRATEGY for Joe ("Bid Up To $X", value, estimated cost, spend cap, AI run/pace reads), and (2) TRACK RESULTS (record each sale: final price + winner; feed + budget + roster update from logged results via Sheets / Auctioneer feed / manual entry).
- Therefore: no bid stepper and no "Place Bid" button anywhere. The live hero = strategy block + a "Record Sale" action.
- On-the-block card stays clean: your max + value + estimated cost, then Record Sale. No live "going for" price field for now (trivial to add later if Joe wants it on a real draft night).

### Artifacts
- `.claude/mockups/draft-room-phone.html` - live auction co-pilot, mobile, Direction v1 (current source of truth for the look).
- `.claude/mockups/live-draft-room-v1.html` - desktop-framed product shot of the same screen.
- Rendered to PNG via headless Edge for remote/phone viewing (remote mode cannot download local files).

### Plan
- [x] UXV2-1: Direction LOCKED 2026-06-04 - volt green accent; EA-FC-meets-Linear energy as in the mockup; clean on-the-block card (no live "going for" tracker). Signed off on `.claude/mockups/draft-room-phone.html`; DNA above frozen.
- [x] UXV2-2 [DONE 2026-06-04: globals.css + layout.tsx re-skinned to GRIDIRON, all selector names kept; compiles clean (Turbopack), /prep renders clean (colorful-dark + volt + blue, no gold, no backdrop-filter blur)]: DESIGN_SYSTEM v3 "GRIDIRON" - new `globals.css` tokens (set palette + colorful-dark canvas + performant atmosphere), font stack (Anton / Saira / Saira Condensed / JetBrains Mono), component classes (hero card, decision block, record-sale, broadcast feed). Archive v2.0 Stadium Primetime + its `UI_UPGRADE_PLAN.md`.
- [x] UXV2-2b [DONE 2026-06-06: Motion system implemented — `src/lib/motion.ts` (4 Framer Motion transition presets + 6 variant sets), `src/hooks/use-number-ticker.ts` (flash hook with direction+delta), `src/components/motion/` (6 components: NumberTicker, OtcEntrance+OtcBadge, LowerThird, StealFlash, FilterPillBar, CascadeList). CSS: duration tokens + --ease-swift added to :root; ffi-card-interactive gets position:relative + iridescent sheen ::before + spring :active lift; new keyframes: ffi-num-flash / ffi-steal-burst / ffi-steal-banner-pop / ffi-otc-breathe; new utility classes: ffi-num-value/delta, ffi-steal-card/banner, ffi-otc-on-block, ffi-pill-bar/indicator/item, ffi-cascade-item. Reduced-motion block updated. type-check clean.]: Motion system (FIRST-CLASS - this is half of AAA, per Joe 2026-06-04). Foundational layer: defined curves (spring/broadcast/standard), a number-ticker hook, shared-element setup (Framer `layoutId` + View Transitions helper), reduced-motion guards. Signature moments: on-the-clock spring entrance + breathing glow, pick-lands lower-third wipe + sheen, steal volt flash/burst, Record Pick -> player morphs to squad slot + budget tick, draft-complete grade reveal + confetti. Micro: button press scale+glow, card lift, stepper number roll, filter-pill slide. Numbers tick+flash on change (tabular, zero shift). Lists cascade/FLIP. Discipline: cinematic on the moments, ~200ms crisp on routine picks (no rapid-fire fatigue). Perf: transform/opacity/box-shadow only (also keeps it fast on phone); full reduced-motion fallback. Each screen (UXV2-3/4/5/6) applies the relevant moves; the live room (UXV2-6) carries the most.
> UXV2-3 through UXV2-5 run as PARALLEL agents (one screen each) once UXV2-2 locks the system (Joe, 2026-06-04). Each agent owns its own screen/components; shared `globals.css` is frozen by UXV2-2 so agents do not collide on it.
- [x] UXV2-3 [DONE 2026-06-06: `prep/page.tsx` fully rewritten to GRIDIRON layout — Configure League full-width ffi-card-interactive, Player Research ffi-hero with stat row + AI Read panel + volt CTA, 3-tile Research row (Board/Strategies/Runs), 2-col Players section, 2-col Draft Day strip with volt-lit Start Draft; DataFreshness preserved; commit 5676f96]: Apply to Prep Hub + Configure (Linear-refined analytical surfaces).
- [x] UXV2-4 [DONE 2026-06-06: Draft Board / Player Pool full GRIDIRON rebuild. `draft-board-table.tsx` rewritten: PositionChip (color-coded per position), 3px score bar (volt/blue-bright/muted by tier), rank mono (blue-bright top-24, blue rest), value ($XX/Rd X) + ADP inline, expanded state with insight panel + confidence meter + tag toggles + 4-stat grid. `board/client.tsx` rewritten: custom tab buttons, position pills (ALL blue-fill active; pos pills show pos-color text + border), sort pills (Score/Value/Rank/ADP + direction arrows), target cycle filter (all/target/avoid), ADP movers horizontal scroll chips, meta strip (league Select + format badge + strategy badge + player count + refresh). `page.tsx` stripped to bare DraftBoardClient. type-check clean, build passes.]: Apply to Draft Board / Player Pool (data-dense, Copilot-grade numbers, set palette).
- [x] UXV2-5 [DONE 2026-06-06: Post-Draft Review full GRIDIRON rebuild. `draft/review/client.tsx` rewritten: GradeHero uses `.ffi-hero` card with Anton grade letter + grade-colored ring + volt/blue/warning/danger glow by grade (no gold anywhere). `gradeColors` map replaces old `gradeGlow`+`gradeVerdict` maps. New `verdictConfig` with GRIDIRON palette (volt=steal, danger=reach, blue-bright=fair, purple=pivot). 2x2 `StatTile` grid with big JetBrains Mono numbers. Two-column `SwCard` strengths/weaknesses with dot bullets. `PickCard` with position `ffi-badge-*` chips, price+delta in mono, verdict pill badge. `PositionalPowerRankings` with volt/blue/danger segments by score range (>=80/>=50/<50). `SectHeader` component with hairline divider. `BudgetAnalysisCard`+`SnakeAnalysisCard`+`TagAccuracyCard` updated to GRIDIRON palette. `draft/review/page.tsx` updated to GRIDIRON eyebrow+title header. All logic (data fetching, analyzeDraft, tagAccuracyAnalysis, roastReport) untouched. type-check clean.]: Apply to Post-Draft Review (broadcast grade hero in the new palette, no gold).
- [x] UXV2-6: Rebuild the Live Auction Draft Room in React to match the locked mockup (strategy + record-sale model; reuse advisor / feed / state machine). Both screens done 2026-08-09 (Draft tab + Research tab).
  - [x] Live auction room built + verified (2026-08-09): decision-first Draft tab — status bar → On-the-Block hero with "What To Do" directive (HOLD/BID/PUSH/PASS + cap + plain rationale, `src/lib/draft/what-to-do.ts`, 11 unit tests) → awareness strip → budget strip → tappable tier context → compact My Team roster → 4-tab bottom nav → fast block-picker sheet. New components in `src/components/draft/live-room/`; `client.tsx` early-returns the room for auction and leaves Tyler's snake path byte-for-byte unchanged; secondary panels preserved in a mount-on-open "More tools" section so no paid `/api/draft/recommend` fires until opened. NaN/missing-data guards (tier → UNRANKED/NR, missing bye omitted, $0 caps floored to the $1 auction minimum). Verified: `npm run build` clean, 11 what-to-do tests pass, `type-check` clean, DOM proof of every section rendering in sim.
  - [x] Research-tab draft-mode screen (2026-08-09): new internal Research view inside the auction room (`src/components/draft/live-room/research-view.tsx`) — sticky on-the-block mini strip with inline record (price + team dropdown + RECORD, reuses `addManualPick`) → filter bar (position pills All/QB/WR/RB/TE/DEF + ★ Target View) → available player list (star toggle, position badge, name + optional real-data signal chip, tier chip, range or AVOID) → tappable Tier Context that filters the list. Recent Sales removed per v4 sign-off. Bottom nav Research/Draft now switch an internal room view (`bottom-nav.tsx` `onSelectView`); Review/Setup still navigate. Star toggle threads `useToggleTag` + `onToggleTarget` from `client.tsx`; `useUserTags.refetch` gained a `force` bypass so a toggle re-reads immediately. Same NR/`$1`-floor dev-cache guards as the Draft tab. Verified in sim via live DOM: view switch, tap-to-block prefill (price + my manager), RECORD (255→254 available, picks 83→84, player removed, block cleared), QB filter (21), RB tier-context tap (70), Target View toggle + empty state, zero nested-button hydration errors. `type-check`/`lint` clean on all 5 files, 40 tests pass, `build` clean. (Star persistence not exercisable in sim: fake `demo-league` id is not a valid league UUID; works against a real league.)
- [x] UXV2-7 [DONE 2026-08-09: reduced-motion DIAL-DOWN + perf/arm's-length pass on the live room. Added the `ffi-live-room` class to the room root (`auction-room.tsx`, no layout change) and a scoped `@media (prefers-reduced-motion: reduce)` block in `globals.css`: cross-fades STAY but halve to 75ms, and transform tap-feedback (`active:scale-90/95`) is neutralized (`transform: none`). The LIVE-dot pulse was already gated by its `motion-safe:` variant. Perf: the room ships lean by construction - live-DOM audit across 735 room elements found 0 CSS filter layers, 0 backdrop-filter layers, 0 animated box-shadows, and 0 elements holding `will-change` (nothing to release), so the old build's heavy-filter-stack non-compositing failure is absent. Mobile 375: no horizontal overflow, room fits 343px, primary decision text 15-22px. VERIFIED: type-check 0 errors, lint clean on changed file, 40/40 tests, build clean (`/draft/live` in routes), and a live computed-style toggle of the shipped rule (transition-duration 0.15s -> 0.075s on real cross-fade + transform-transition elements; transform-neutralize rule present and matching all 80 ResearchView tap buttons). No layout change; no paid endpoints fired.]: Performance + arm's-length pass - confirm screenshot-able + smooth on Joe's phone (the old build's exact failure mode); reduced-motion guards on every animation.
- [x] UXV2-8: VERIFY (lint + tests + build) + commit + update DESIGN docs + WORKING_STATE. Done 2026-08-09. Full-track VERIFY clean (type-check 0, lint 27 pre-existing/0 new, tests 40/40, build clean with /draft/live). DESIGN_SYSTEM.md + UI_DESIGN_SPEC.md reconciled to the shipped live room (theme.ts scoped palette, dial-down reduced-motion, lean/no-filter stance). CLOSES THE UX-V2 TRACK.

---

## UX — AAA Visual Upgrade ("Stadium Primetime") [SUPERSEDED 2026-06-04]
> **SUPERSEDED 2026-06-04:** Joe reviewed the shipped result and rejected this gold-glass direction as generic AI slop. Replaced by UX-V2 GRIDIRON above. Items below are preserved as the history of what was built (the engine + infra is reusable; the look is being rebuilt). Do not resume this track.
> **Goal:** Take the app from ~7.5/10 to AAA. Full plan: `.claude/UI_UPGRADE_PLAN.md`.
> **Per-session prompt:** `.claude/UX_SESSION_PROMPT.md` — paste into a fresh session to do the next sprint; loop until every UX item is `[x]`. (Opus for UX-2/UX-5, Sonnet for UX-3/UX-4/UX-6.)
> **Direction:** Keep Gridiron Blue structure; add NCAA arena depth (CSS atmospheric backgrounds + spotlight glows + grain); metallic GOLD = the moment (your pick, draft complete, grade hero); electric GREEN demoted to value/steal/success only.
> **Authorization:** Supersedes locked `DESIGN_SYSTEM.md` v1.2 → v2.0 (Joe approved 2026-06-02).
> **Rule:** Visual-only track. No engine/data/logic changes — flag + re-propose separately if a screen needs a logic fix.

### UX-1: Stadium Primetime Foundation (global) [do first] — ✅ DONE 2026-06-02
> Goal: entire app looks dramatically better the moment this ships, before any per-screen work.
- [x] UX-1.1: `DESIGN_SYSTEM.md` v2.0 + archived v1.2; saved `.claude/UI_UPGRADE_PLAN.md`; added `UI_DESIGN_SPEC.md` v2.0 addendum
- [x] UX-1.2: `globals.css` color tokens — gold ramp, `--value-green`, gold glow effects; blue + surface token names kept stable
- [x] UX-1.3: Loaded Space Grotesk / Manrope / JetBrains Mono via `next/font`; rewired `.font-*` + `@theme`; dropped Inter (verified live on :3003)
- [x] UX-1.4: Atmospheric background system in `app-shell.tsx` (`stadium-atmos` + `atmos-grain` + `atmos-clock` tint)
- [x] UX-1.5: Glass system → 3 tiers + light-catch hairline; removed gray borders from all `.ffi-card*`; `.glass-interactive` + `.ffi-scrim`
- [x] UX-1.6: Button system — `.ffi-btn-primary` (blue), `.ffi-btn-hero` (gold), `.ffi-btn-value` (green); `FFIButton` variants
- [x] UX-1.7: Motion — `.ffi-animate-reveal` (scale + gold flash), `.ffi-animate-stagger`; reduced-motion guards
- [x] UX-1.x: Active nav accent lime → gold (sidebar + bottom tabs)

### UX-2: Live Draft Room (hero screen) — ✅ DONE 2026-06-03 · ⬆️ Opus elevation 2026-06-03
> Goal: the screen used during a real draft is unmistakably AAA.
- [x] UX-2.1: On-the-clock spotlight state (gold pulse) + AUCTION/SNAKE mode badge
- [x] UX-2.2: Pinned quick-entry bar restyle (gold Record button, glass-heavy)
- [x] UX-2.3: Your-pick gold rail + gold name; card-reveal + gold flash on confirmed picks
- [x] UX-2.4: Connection pill + trash-talk feed restyled to v2.0
- [x] UX-2 (Opus elevation): re-wired the on-the-clock spotlight to fire ONLY at the moment (snake: your turn; auction: player on the block) instead of the whole draft; added the on-the-clock HERO banner (gold glass + light-catch + spring reveal + breathing glow); finished the lime → blue/value-green recolor Sonnet left in `client.tsx`; gray hairline → light-catch. Verified live on snake + auction at 1280 + 390.

### UX-3: Draft Board / Player Pool (data-dense) — ✅ DONE 2026-06-03
> Goal: research-backed scannability for the big player list.
- [x] UX-3.1: Redesign rank (bold Space Grotesk, gold top-tier / blue rest; kill italic-30%)
- [x] UX-3.2: Tabular JetBrains Mono numbers right-aligned; two-color hierarchy; spacing not borders
- [x] UX-3.3: Position badges remapped to palette; sticky filter header; row-density modes; skeleton loaders

### UX-4: Prep Hub + Configure / Strategies
> Goal: calm, premium entry surfaces and forms.
- [x] UX-4.1: Hub cards glass-interactive + gold-on-hover; menu/layout cleanup — icon container → v2.0 surface token; hover: title/icon/chevron all gold; `prep/page.tsx`
- [x] UX-4.2: Glow-focus form inputs (NCAA `.form-input` pattern) for league config + strategy editor — `.ffi-form-input` gold glow added to `globals.css`; applied to all 11 inputs/selects in `league-config-form.tsx`; configure page header → v2.0 display class (`configure/page.tsx`)

### UX-5: Post-Draft Review + Celebration — ✅ grade reveal DONE 2026-06-03 (Sunday Night Gridiron)
> Goal: a shareable, broadcast-grade finish.
- [x] UX-5.1: Grade hero in metallic gold — GradeHero gold `gradeGlow.A` + `.ffi-grade-a` + score color; rotating conic gold ring (`.ffi-grade-ring-sheen` via `@property`); Oswald verdict word ("ELITE DRAFT"). Timeline pick cards already v2.0.
- [x] UX-5.2: Confetti on reveal — `FFICelebration` (new gold tone) + new `FFIConfettiBurst` in GradeHero; champion sound + haptic; reduced-motion = static. (Dedicated shareable card-image still BACKLOG; CSV + share-link already exist.)

### UX-6: Cross-cutting polish + QA gate
> Goal: AAA everywhere, verified.
- [x] UX-6.1: Empty states + skeletons across remaining screens — `page-skeleton.tsx` upgraded to `.ffi-skeleton` shimmer + v2.0 surface tokens; runs + strategies clients: `Loader2` spinners replaced with shimmer rows; empty states upgraded to glass; page headers match configure v2.0 pattern
- [x] UX-6.2: WCAG ≥4.5:1 contrast pass; reduced-motion audit — `--ffi-text-muted` #64748b→#7d8fa8 (4.31:1→5.33:1 on surface); `glass-interactive:hover` added to reduced-motion block; all 11 Framer Motion components now guard spatial transforms + persistent animations via `useReducedMotion()`
- [x] UX-6.3: Background-layer GPU promote — `globals.css`: `.atmos-grain` gets `transform: translateZ(0)` (own compositor layer); `.stadium-atmos.atmos-clock` + `body.ffi-on-the-clock .stadium-atmos` get `will-change: filter`; reduced-motion block resets `will-change: auto` on animated selectors. Arm's-length mobile re-test (FFT-008) still deferred — needs Joe on phone.
- [x] UX-6.4: Before/after screenshot set — DOM-level audit at 1280px + 375px; 6 screens confirmed; `.claude/UX6_AFTER_AUDIT.md` is the permanent record (screenshot renderer timed out; DOM audit substituted)

### UX-7: Sim Draft / Demo Mode (dev-only) [showcase + QA fixture]
> Goal: watch the full broadcast experience (and demo it to people) without running a real draft, and give the bug-hunt/QA sessions a way to drive the live UI. Reuses the REAL components — no standalone HTML, no API key (the advisor shows its rule-based fallback). Pairs with the Phase 2/3 moments shipped in Sunday Night Gridiron (lower-third, score-bug, ticker, gold grade reveal).
- [x] UX-7.1: Dev-only Sim engine — `src/hooks/use-draft-simulator.ts` (new). `useDraftSimulator` hook: gated `NODE_ENV !== 'production' && ?sim=1`; ref pattern (mirrors use-sleeper-draft-feed); picks players by consensusRank, auction price from consensusAuctionValue; snake uses state.current_manager, auction cycles round-robin. Wired into `live/client.tsx`: sim HUD bar (Start/Pause/Reset + slow/medium/fast speed selector) renders when active. Zero paid calls: ANTHROPIC_API_KEY absent + advisor fallback route. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.
- [x] UX-7.2: Scripted WR run at picks 8-10 fires `PositionRunTicker`; `suppressAI` prop on both advisors kills auto-fetch in sim; `useEffect` auto-navigates to `/draft/review?session=<id>` on completion; trash talk AI generation gated behind `!simEnabled`. Files: `use-draft-simulator.ts`, `auction-advisor.tsx`, `snake-advisor.tsx`, `live/client.tsx`.
- [x] UX-7.3: One-tap demo entry — `DEMO_SESSION`+`DEMO_LEAGUE` constants in `live/client.tsx` let `?sim=1` load with no real session; amber "Demo Draft" card on Draft Hub (`draft/page.tsx`, dev only); documented in `WORKING_STATE.md` Commands Reference.

---

## P1 — Auctioneer Integration
> **Scope:** Joe's ESPN auction ONLY. Tyler's snake/keeper/Sleeper/Yahoo league is on PERMANENT HOLD - out of scope for this app. All code paths gated by `format === 'auction'`.

- [x] FF-279: FFI reads Auctioneer's JSON export at auction setup — hot-reload on file change via File System Access API or localStorage namespace
- [x] FF-280: Subscribe to Auctioneer's `ffi-auction-feed` BroadcastChannel — instant pick sync when both run on same device (gated: auction mode only)
- [x] FF-281: `src/lib/draft/auction-feed-merge.ts` (NEW) — dedup pick events across sources by `pickId`, emit normalized pick events
- [x] FF-282: Generalize `src/hooks/use-draft-polling.ts` → `use-draft-feed.ts` — multi-source priority merge (BroadcastChannel > JSON > Sheets); snake/Sleeper mode uses manual entry only, zero behavior change
- [x] FF-283: Dynamic max-bid recompute — every pick from any source triggers `calculateMaxBidAdvice()` recompute for remaining players

---

### Sub-tier 1b: Remote / Cross-Device Live Sync (auctioneer AA-FFI-2 counterpart)
> **Why this is separate from FF-279–283:** those wire the auctioneer feed only when BOTH apps run on the SAME device (BroadcastChannel) or share a local JSON export. On real draft night the auctioneer runs on the host's laptop and this advisor runs on Joe's phone — different devices, different origins. This sub-tier adds the missing **over-the-network** path so the phone auto-connects to the live auctioneer with no cables and no manual export. Counterpart to the auctioneer's `AA-FFI-2`; designed to work against the auctioneer AS-BUILT so it needs zero auctioneer-side change to ship.
> **Scope:** Joe's ESPN auction ONLY. Gated on `format === 'auction'`, identical to FF-279–283. Snake/Sleeper untouched.

- [x] FF-314: Remote auctioneer live-sync source — the advisor polls the deployed auctioneer's public state and folds its picks into the existing multi-source merge, so a phone at the draft table tracks picks live over the internet. **Verified contract (read from `fantasy_auction_auctioneer` as-built, 2026-08-07):**
  - **Endpoint:** `GET https://fantasy-auction-auctioneer.vercel.app/api/state` (confirm the exact prod origin with `vercel ls` in the auctioneer repo before hardcoding). Returns the full synced payload or `null` when no draft is active / KV unconfigured. Backed by Upstash Redis, single global key `draft-current`, 24h TTL — exactly ONE active draft at a time, so no draft-code lookup is needed today.
  - **Payload shape (VERIFIED live 2026-08-07 against the deployed `/api/state`):** the body IS the auctioneer `DraftState` object directly — there is NO `{ id, name, state }` envelope. Top-level keys: `config, players, availablePlayers, picks, currentNomination, nominationMode, nominationQueue, timerRunning, timerRemaining, pickNumber, phase, lastUpdated, trashTalkMode, recentTrashTalk, playerNotes` (+ an optional `__syncTheme` string only when the host has picked a theme — ignore it, not schema). Picks at top-level `picks[]`, each `{ id, player: { id, name, position, team, byeWeek, espnPprRank }, teamId, price, pickNumber, timestamp }`. Team id→name + budgets at top-level `config.teams[]` (`{ id, name, budget, spent, roster }`); league shape at `config.budget` / `config.teamCount`. Draft lifecycle at top-level `phase` (`'drafting'` when live) and `pickNumber`.
  - **CORS — the load-bearing design decision:** the auctioneer's `/api/state` sends NO `Access-Control-Allow-Origin`, so a browser fetch from this app's Vercel origin is cross-origin-blocked. Do NOT ask for an auctioneer change. Instead add a thin **server-side proxy** in THIS repo — `src/app/api/auctioneer-feed/route.ts` — that does the server-to-server `fetch(AUCTIONEER_ORIGIN + '/api/state')` (no CORS in Node) and returns the JSON to our own client. Origin comes from `process.env.NEXT_PUBLIC_AUCTIONEER_ORIGIN` with the prod URL as the fallback default. This keeps the feature self-contained and shippable independent of the auctioneer.
  - **Auto-detect:** on the auction live screen, the client polls our proxy every ~3s (matches the auctioneer's `/board`+`/viewer` cadence). Non-null payload with top-level `phase === 'drafting'` (or `picks.length > 0`) ⇒ a live auction is up ⇒ connect automatically and surface it on the existing `ConnectionStatusPill` (LIVE/STALE/OFFLINE); null/`404`/error ⇒ fall back silently to the current sources. No new UI mode — remote just becomes another feed.
  - **Merge, don't fork:** normalize each remote pick into the SAME event shape `src/lib/draft/auction-feed-merge.ts` already dedups by `pickId`, and register remote as one more source in `src/hooks/use-draft-feed.ts`'s priority merge (suggested order: same-device BroadcastChannel > remote KV proxy > local JSON > Sheets — same-device wins when present, remote covers the cross-device case). Each new remote pick still triggers the FF-283 `calculateMaxBidAdvice()` recompute. Zero behavior change when `format !== 'auction'` or the proxy returns null.
  - **Forward-compat with AA-FFI-2:** if the auctioneer later moves to per-draft keys/short codes (its AA-FFI-2 may), have the proxy accept an optional `?code=` and forward it; default (no code) keeps hitting the single `draft-current`. Design the client to pass an optional code now so no rewrite is needed later.
  - **Success criterion:** with the auctioneer live on its Vercel URL and one pick recorded, this app on a DIFFERENT device shows that pick in the auction live feed within ~5s, budget/max-bid recompute, no CORS error in console, and snake mode is completely unaffected. | `pipeline`

- [x] FF-315: Offline resync + reconciliation — define and build what happens when Joe's phone drops connectivity mid-draft, records picks manually, then reconnects. **Auctioneer is the official system of record for players/draft; this app never overrides it.** Open design questions to resolve BEFORE coding (spec them in a short `.claude/OFFLINE_RESYNC_SPEC.md` first, then implement):
  - **Going offline:** when the proxy poll starts failing, flip `ConnectionStatusPill` to OFFLINE and switch the on-the-block card to manual entry (already mocked). Pre-loaded research (tiers, ranges, tags, target/avoid) stays fully usable from cache; only live LLM alerts + dynamic repricing pause. Nothing Joe enters offline is treated as authoritative yet — it is a **local provisional log**, tagged `source: 'manual-offline'`.
  - **Coming back online:** on reconnect, pull the full auctioneer `picks[]` snapshot and **reconcile against the local provisional log**, one pick at a time keyed by player id:
    - Player in both, price/winner match → mark reconciled, drop the provisional flag.
    - Player in both, **price or winner differ** → **auctioneer wins** (system of record); silently correct the local record, and surface a small "corrected from auctioneer" toast/badge so Joe sees the diff (e.g. "Mahomes: you logged $48 → auctioneer $52"). Budget/max-bid recompute off the corrected numbers.
    - Player Joe logged offline but **absent from auctioneer** → keep it provisional, flag it "unconfirmed — not yet in auctioneer" rather than deleting (auctioneer may just be lagging). Re-check on each subsequent poll; auto-confirm when it appears, or let Joe clear it if it never does.
    - Player in auctioneer but **not in Joe's local log** (picks that happened while he was offline) → fold them in normally via the existing merge; these are already authoritative.
  - **Duplicate/ordering safety:** reconciliation must be idempotent — reuse the existing `pickId` dedup in `src/lib/draft/auction-feed-merge.ts` so replaying the auctioneer snapshot never double-counts, and so a pick that flips from provisional → confirmed updates in place rather than appending.
  - **Success criterion:** simulate: go offline, manually record 3 sales (one with a deliberately wrong price), come back online with the auctioneer holding the true prices → the wrong price auto-corrects to the auctioneer value with a visible notice, matching picks reconcile silently, an offline-only pick not yet in the auctioneer stays flagged unconfirmed, budget/max-bid reflect the auctioneer numbers, and no pick is duplicated. | `pipeline`

---

### Sub-tier 2: Trash Talk AI Upgrade
> **Prerequisite:** FF-305 (live wiring) complete before starting this sub-tier. **Scope:** Auction-only triggers gated on `format === 'auction'`; snake/both-format triggers always apply. Reference implementation: `fantasy_auction_auctioneer/src/lib/trash-talk.ts` and `.claude/AA-TT-SPEC.md`.

- [x] FF-306: Add trash talk mode toggle to draft session setup — 3-way selector: **Off / Family-Safe / Adult-Only**; store as `trashTalkMode: 'off' | 'family-safe' | 'adult-only'` in draft session config; Off skips all trigger evaluation (early return before `analyzePickForTrashTalk`); Family-Safe = PG-13 ≤80 chars; Adult-Only = explicit ≤120 chars; mirror the AA `src/app/setup/page.tsx` pattern; add to `src/app/(app)/draft/setup/` session start screen | `output`

- [x] FF-307: Create `src/app/api/trash-talk/route.ts` — server-side Claude Haiku generation; port directly from `fantasy_auction_auctioneer/src/app/api/trash-talk/route.ts`; two system prompts (Family-Safe PG-13 / Adult-Only Jeselnik/Ross/Hinchcliffe style); model `claude-haiku-4-5-20251001` temperature 1.0 no streaming; Family-Safe max_tokens 60, Adult-Only max_tokens 80; em-dash hard-strip `raw.replace(/\u2014/g, '-')` enforced in handler regardless of prompt compliance; request body: `{ trigger, playerName, position, espnPprRank, teamName, price, impliedValue, pickNumber, totalPicks, contextString, mode, historyBlock? }`; fail-silent on Claude errors — return `{ line: null }` — trash talk is non-critical | `pipeline`

- [x] FF-308: Upgrade auction trigger engine — 6 new AA-spec triggers + implied value formula; all auction-only triggers gated on `format === 'auction'`; in `src/lib/draft/trash-talk.ts`:
  - Port `impliedAuctionValue(player, config)` quadratic decay formula from AA spec — `maxValue = budget * 0.35`, `maxRank = teamCount * 10`, `decay = max(0, 1 - (rank - 1) / maxRank)`, returns `max(1, round(maxValue * decay^2))`; use `player.consensusAuctionValue` if set, else decay; replaces `AVG_POSITION_VALUES` fallback for overpay + steal detection
  - Port `budget_buster`: team spent >60% of budget with <35% of roster slots filled; context: `"Team has spent $X of $Y with N of M spots filled ($Z left for K spots)"`
  - Port `last_big_spender`: pick 30+, exactly 1 team has remaining budget >2x league avg AND >$30; context: `"${team} has $X left; rest of league averages $Y"`
  - Port `cheapskate_special`: price ≤$3 AND team has 4+ picks AND team avg spend/pick <$7; context: `"Team averaging $X.XX per player across N picks; just paid $Z"`
  - Port `budget_dominance`: pick 40+, winning team's remaining budget >1.5x league avg AND >$30; context: `"${team} has $X left; league average is $Y"`
  - Port `first_defense_buy`: first DEF pick in draft; **special-case**: add DEF check BEFORE the existing `if (!pos || pos === 'K' || pos === 'DEF') return null` guard — if position is DEF and no prior DEF pick exists, fire this trigger only then return; context: `"First DEF bought at pick #N; all other teams still have zero defenses"`
  - Port `lone_wolf_qb`: team has 9+ picks AND no QB AND current pick is not QB; works auction AND snake (no budget dependency)
  - Priority order: budget_buster > overpay > steal > market_mismatch > last_big_spender > budget_dominance > lone_wolf_qb > cheapskate_special > first_defense_buy > reach > imbalance | `pipeline`

- [x] FF-309: Add snake + both-format triggers to `src/lib/draft/trash-talk.ts`:
  - `market_mismatch` (both formats): find sold/drafted picks at same position from other teams within 15 ESPN rank or ADP spots; **auction**: price % spread ≥35% fires trigger; **snake**: round difference ≥3 for similarly-ranked player fires trigger; context string for snake: `"${player} (ADP ${adp}) drafted Round ${round}; comparable ${comp} (ADP ${compAdp}) went to ${compTeam} Round ${compRound} — ${N} rounds cheaper/earlier for similar-tier ${pos}"`; fires in both directions (steal and reach)
  - `late_roster_qb_panic` (snake-only, gated on `format === 'snake'`): team has 7+ picks (lower threshold than auction's 9 — snake picks faster), no QB drafted, current pick is non-QB; context: `"Team has ${N} players and still no QB; just drafted another ${pos} in Round ${round}"` | `pipeline`

- [x] FF-310: Replace hardcoded message arrays with Claude Haiku generation; in live draft client (FF-305 wires this in), after `analyzePickForTrashTalk()` returns a trigger result:
  - Check `trashTalkMode` — if `'off'`, skip; if on, call `generateTrashTalk(result, mode, historyBlock?)` → `fetch('/api/trash-talk')`
  - Port `generateTrashTalk()` thin wrapper from `fantasy_auction_auctioneer/src/lib/trash-talk.ts` → `src/lib/draft/trash-talk.ts`; async fire-and-forget, fail-silent (return null on any error)
  - If API returns non-null line: use as `alert.message` in `LiveTrashTalkAlert`; if null: use existing hardcoded fallback string (do not drop alert entirely — degraded mode is better than silent failure)
  - Cost: ~$0.01/draft at 30% trigger rate | `pipeline`

- [x] FF-311: Owner history system — port from `fantasy_auction_auctioneer/src/lib/trash-talk-history.ts` → `src/lib/draft/trash-talk-history.ts`; copy `fantasy_auction_auctioneer/src/data/history.json` → `src/data/history.json` (same 10 Nasties owner profiles, same league, same roast_ammo);
  - `loadHistory()`: load bundled JSON once
  - `matchOwnerToHistory(teamName, history)`: case-insensitive alias fuzzy match (team name contains alias OR alias contains team name token)
  - `buildTeamOwnerMap(teams, history)`: called once at session start, stored in session state
  - `buildHistoryBlock(trigger, owner)`: trigger-specific injection — overpay → `['overpay','bust']` moments; steal → `['steal']` moments; budget_dominance/last_big_spender → `['champ_move']` moments; all others → general `roast_ammo` only; at most 2 moments appended; returns empty string if no owner matched (trigger still fires, no history)
  - Wire `historyBlock` into `generateTrashTalk()` call in FF-310 | `pipeline`

---

## P2 — Pre-Season Validation
> **Was Phase 7. Run this before Aug 2026 drafts to confirm everything is live-ready.**

### Testing Sprint T1: Environment + UI Smoke Test (zero cost)

> Goal: Confirm the dev environment is clean and all screens render without errors before any live data or AI calls. Claude can run automated Chrome tests (via Claude-in-Chrome MCP tools) on the running dev server before Joe does manual testing.

| ID | Description | Status |
|----|-------------|--------|
| FFT-001 | Verify dev environment — `npm run dev` on port 3003, no build errors. Confirm all env vars present (ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). Hit `/api/players/status` → confirm 200. DEV_MODE bypass works. | [x] PARTIAL: dev server ✅, build clean ✅, /api/players/status 200 ✅, ANTHROPIC_API_KEY missing (Joe adds when ready) |
| FFT-002 | Automated Chrome UI test (prep mode) — Claude starts dev server, uses Chrome MCP tools to navigate prep configure → strategies → board. Screenshot each screen. Check console for errors. No API calls fired. | [x] PASS: all prep screens render. Console: ThemeToggle hydration mismatch (non-blocking). |
| FFT-003 | Automated Chrome UI test (live draft mode) — Claude navigates draft setup → live draft room (auction + snake). Verify: connection status pill visible, manual pick bar present, player pool renders, no console errors. Screenshot all screens. | [x] PASS: pill ✅, bar ✅, pool ✅, user_tags error resolved after migrations applied. Remaining 2 issues = ThemeToggle hydration (pre-existing, non-blocking). |

---

### Testing Sprint T2: Player Data Seed (zero cost)

> Goal: Populate `players_cache` with real 2026 player data using free APIs only. No Claude API calls. Enables UI testing with real player names and positions.

| ID | Description | Status |
|----|-------------|--------|
| FFT-004 | Seed 2026 players via Sleeper API — write `scripts/seed-players-sleeper.ts`. Call `GET https://api.sleeper.app/v1/players/nfl` (free, no key). Filter: `active: true`, skip K position (Nasties rule). Normalize to `players_cache` schema. Run once, verify 300+ players in Supabase. Zero Claude API calls. | [x] PASS: 3,048 players upserted (3,093 total in cache). 16 name-dupes removed before upsert. |
| FFT-005 | Verify prep configure flow with seeded data — open `/prep/configure`, set up Joe's ESPN auction league (12 teams, $200 budget, PPR). Confirm player pool loads from cache. Do NOT run research pipeline (costs money — separate approval required). | [x] PASS: configure renders ESPN/Auction/12-team/$200/Full PPR correctly; Draft Board loads 500 players from Sleeper cache; 3 issues all pre-existing (ThemeToggle hydration × 2 + user_tags fetch — awaiting Joe's Supabase migration). |

---

### Testing Sprint T3: Live Draft Dry Run (requires cost approval)

> **STOP before FFT-006/007: AI calls cost ~$0.01–0.03 per pick. Joe must type explicit approval before starting this sprint.**

| ID | Description | Status |
|----|-------------|--------|
| FFT-006 / FF-072 | Auction live draft dry run — create a mock Google Sheet (public, anyone-with-link viewer) with 10 pre-filled picks. Connect FFI auction mode. Verify: Sheets polling detects picks, AI recommendations generate, budget math updates, trash talk fires on overpay/steal. | [ ] |
| ~~FFT-007~~ | ~~Tyler's Sleeper dry run~~ | RETIRED 2026-08-06 |
| FFT-008 / FF-269 | Arm's-length physical test — Joe on phone at normal distance. Verify: all tap targets reachable one-handed, text readable, no precision tapping required. Note any issues in BUG_LOG. | [ ] |

---

### Design System Formalization

> Reference: `AI_Code_Library/templates/UI_DESIGN_SPEC_TEMPLATE.md`
> **Context:** Phase 6 FFIntelligence UI Redesign created DESIGN_SYSTEM.md with Tactical Hologram tokens. This sprint formalizes that into the standard 17-section `.claude/UI_DESIGN_SPEC.md` for reference in all future work.
> **Aesthetic note:** Mobile-first, live-draft-optimized, sports-energy UI. Distinct from Auctioneer despite shared design DNA.

- [x] FF-DS-001: Copy `AI_Code_Library/templates/UI_DESIGN_SPEC_TEMPLATE.md` → `.claude/UI_DESIGN_SPEC.md`
- [x] FF-DS-002: Fill Sections 1-5 (Vision, Layout, Colors, Typography) — from existing DESIGN_SYSTEM.md
- [x] FF-DS-003: Fill Section 6 (Components) — live draft components, player cards, recommendation UI, confidence badges
- [x] FF-DS-004: Fill Sections 7-11 (Interactions, Motion, Effects, Responsive, A11y) — Framer Motion specs, arm's-length audit findings, 44px targets
- [x] FF-DS-005: Fill Sections 12-17 (Dark Mode, Performance, Decisions, Tools, Maintenance)

- [x] FF-312: Sleeper live draft integration — `use-sleeper-draft-feed.ts` polls `/draft/{draft_id}/picks` every 5s; snake-order math maps pick_no → manager name; `extractSleeperDraftId()` handles full URLs or raw IDs; 4th mode option in setup (snake-only); `sdi` URL param to live client; SL badge in header; draft-complete polling via `/draft/{draft_id}`
- [ ] FF-260: Document exact Sheets setup in `WORKING_STATE.md` — column names, format, share permissions confirmed from actual Nasties 2026 sheet _(Blocked: need real draft sheet ~Aug 2026)_
- [ ] FF-072: Live draft dry run — mock Google Sheet + mock Sleeper draft, run through full auction + snake live draft flow end-to-end `ACTION`
- [x] FF-080: Full pre-draft data pull with 2026 season data — verify all sources working. Ran `scripts/seed-players-sleeper.ts` (3,059 players upserted; 3,141 total in cache, `last_updated_at` 2026-08-10) + `scripts/populate-fantasypros.ts` (489 players with real 2026 PPR ECR rankings + derived auction values: #1 Ja'Marr Chase $70, #2 Puka Nacua $69, #3 Jahmyr Gibbs $68). Both free APIs responded clean; 491 players now have real board values. VERIFIED: both scripts exit 0, no errors. `ACTION`
- [ ] FF-081: Draft day checklist — confirm Nasties Google Sheet template + column format, verify app on Joe's phone `ACTION`

---

## P3 — Community Release — RETIRED 2026-08-06
> **RETIRED 2026-08-06:** Out of scope. This app is a personal tool for Joe's Nasties auction draft. No community release planned.

- ~~[ ] FF-284 through FF-289~~ — retired

---

## P4 — Session Layer Architecture — RETIRED 2026-08-06
> **RETIRED 2026-08-06:** Out of scope. Personal use only.

- ~~[ ] FF-290 through FF-294~~ — retired

---

## P5 — Commercial Beta — RETIRED 2026-08-06
> **RETIRED 2026-08-06:** Out of scope. Personal use only.

- ~~[ ] FF-295 through FF-300~~ — retired

---

## P6 — B2B Outreach — RETIRED 2026-08-06
> **RETIRED 2026-08-06:** Out of scope. Personal use only.

- ~~[ ] FF-301 through FF-304~~ — retired

---

## P7 — Scale Decision — RETIRED 2026-08-06
> **RETIRED 2026-08-06:** Out of scope. Answer is already (C) — personal tool, keep using personally.

---

## Bug Hunt Schedule

| Cadence | Mode | Scope | Last Run | Next Run |
|---------|------|-------|----------|----------|
| Per-sprint | `free` ($0, static) | Changed modules | Never | Before first P0 code change |
| Monthly | `full` (tests + build) | Full project | Never | End of first P0 sprint |

Run: `/bug-hunt free` or `/bug-hunt full`

---

## Feedback Queue

| Date | Reporter | Issue | Triaged To |
|------|----------|-------|------------|
| 2026-06-03 | Joe | App-shell renders `{children}` twice (desktop + mobile wrappers) → LiveDraftClient double-mounts: 2× polling/scoring + manual-pick clobber race | FF-313 |

---

## Completed Work (History)

> All phases 0–8 + Phase 7.5 complete. Items below preserved for reference. Original FF-XXX IDs intact.

### Phase 0: Foundation
- [x] FF-001 through FF-008b — Project scaffold, auth, league config, mobile shell

### Phase 1: Data Ingestion
- [x] FF-009: Player data model
- [x] FF-010: ESPN adapter
- [x] FF-012: Sleeper adapter
- [x] FF-013: FantasyPros adapter
- [x] FF-014: Multi-source normalization
- [x] FF-015: Player cache (Supabase)
- [x] FF-016: Data freshness UI

### Phase 2: Strategy System + Draft Prep
- [x] FF-S01 through FF-S08 — Strategy data model, AI proposals, editor, save profiles
- [x] FF-017: Research pipeline orchestrator
- [x] FF-019 through FF-028 — LLM analysis, draft board, run management

### Phase 2.5: Keeper Support
- [x] FF-029: Keeper integration — mark + cost/rounds, exclude from pool

### Phase 3: Live Draft Mode
- [x] FF-030 through FF-039 — Draft setup, Sheets polling, manual entry, scarcity, explainability, roster/league panels, manager tendencies
- [x] FF-P01 through FF-P05 — Strategy swap, pivot alerts, strategy impact preview, pivot history
- [x] FF-040 through FF-044 — Auction state machine, recommendations, max bid, budget strategy, urgency warnings
- [x] FF-045 through FF-049 — Snake state machine, best available, pick-by-pick recommendation, keeper tracking, trade-up

### Phase 4: Polish
- [x] FF-050: Dark mode
- [x] FF-052: Loading/error/empty states
- [x] FF-053: Post-draft review
- [x] FF-054: Export results (CSV, shareable link)
- [x] FF-055: LLM latency optimization (streaming, state deltas, incremental recalc)

### Phase 5: Scoring Intelligence
- [x] FF-067: Supabase migration — scoring_settings jsonb
- [x] FF-068: Scoring-aware LLM analysis
- [x] FF-070: Deploy to Vercel
- [x] FF-071: End-to-end test with Nasties league data

### Phase 6: FFIntelligence UI Redesign
- [x] FF-060 through FF-062 — Design system tokens, typography, component primitives
- [x] FF-063 through FF-066 — App shell, Prep Hub, Draft Board, Live Draft room redesigns
- [x] FF-082 through FF-094 — Framer Motion, page transitions, swipe navigation, micro-interactions
- [x] FF-095 through FF-105 — HTML prototype → React port, DESIGN_SYSTEM.md, visual audit

### Phase 7 / Sprint 11: Advanced Views
- [x] FF-073 through FF-078 — Scarcity redesign, post-draft redesign, team reports, trash talk, mobile polish, animations

### Phase 7.5: Player Intelligence System
- [x] FF-201 through FF-218 — DB migrations, types, source adapter, tag detection (BREAKOUT/SLEEPER/BUST/VALUE/AVOID)
- [x] FF-225 through FF-242 — User tags/rules CRUD, rule parser, scoring engine, player browser UI
- [x] FF-244 through FF-252 — Integration, draft board tags, live draft tag recommendations, post-draft accuracy, performance, mobile

### Phase 8: In-Season AI Companion
- [x] FF-110 through FF-137 — Weekly projections, injury tracker, matchup data, waiver trending, start/sit, waiver wire, trade analyzer, matchup preview, notifications, push subscriptions
