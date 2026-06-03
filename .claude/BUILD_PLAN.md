<!-- DASHBOARD_STATUS
{
  "currentPhase": "P0 — Personal Season Hardening (Aug 2026)",
  "status": "active",
  "milestones": [
    { "name": "Data pipeline + strategy engine (Phase 0-2)", "done": true },
    { "name": "Live draft mode (Phase 3)", "done": true },
    { "name": "Polish + scoring intelligence (Phase 4-5)", "done": true },
    { "name": "UI redesign + player intel (Phase 6-7.5)", "done": true },
    { "name": "In-season AI companion (Phase 8)", "done": true },
    { "name": "P0 — Personal season hardening (Aug 2026 drafts)", "done": false },
    { "name": "UX — AAA Visual Upgrade (Stadium Primetime)", "done": false },
    { "name": "P1 — Auctioneer integration", "done": false },
    { "name": "P2 — Pre-season validation", "done": false },
    { "name": "P3+ — Commercialization (CONDITIONAL)", "done": false }
  ],
  "nextItems": [
    "UX-1.1: Stadium Primetime v2.0 design system + globals tokens",
    "UX-1.4: Atmospheric background system (app-shell)",
    "FF-269: Arm's-length physical test — fix anything requiring precision tapping"
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

## P0 — Personal Season Hardening
> **Goal:** Joe's ESPN auction draft + Tyler's Yahoo snake/keeper draft work flawlessly on Aug 2026 draft day.
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
- [ ] FF-313: **[PROPOSED 2026-06-03 — awaiting Joe's approach pick (D vs B); do NOT implement yet]** App-shell double-mount fix. `src/components/layout/app-shell.tsx` renders `{children}` in BOTH the desktop wrapper (`hidden md:block`, ~line 195) AND the mobile SwipeCarousel wrapper (`md:hidden`, ~line 201). CSS `display:none` does not unmount React, so the route's content mounts TWICE. Confirmed live: `document.querySelectorAll('.ffi-onclock-banner').length === 2`. Because `AppShell` is the `(app)` group layout (`app/(app)/layout.tsx:13`), this hits EVERY authenticated page; `LiveDraftClient` is the worst case. **Cost:** 2× `/api/players` + session + strategies on mount; 2× Sheets poll (~17 req/min); 2× Sleeper poll (~48 external calls/min to api.sleeper.app); 2× 500-player `scorePlayersWithStrategy` + ~O(n²) `maxBidAdviceMap` per pick; ~2× memory for the player pool. **Correctness:** each instance owns an independent `useDraftState`; PATCH `/api/draft/sessions/[id]` is a full-array REPLACE (route.ts:105) so NO duplicate picks accumulate — BUT the two instances diverge whenever a pick reaches one and not the other. Manual entry only reaches the *visible* instance, so the stale (hidden) instance's next feed-driven persist can clobber manual picks (last-write-wins data loss). **Proposed fix (pick one):** (D, recommended) render `{children}` once and choose the wrapper at runtime via a new `useIsMobile()` hook — each breakpoint keeps its exact current wrapper, zero layout-regression risk; only tradeoff = children remount once if you cross the 768px breakpoint mid-session (reloads from server-persisted picks). (B) always-mount `SwipeCarousel` as the single wrapper, inert on desktop (drag is already touch-only, dots already `md:hidden`) — also removes the resize remount, but routes desktop content through the carousel's `overflow-hidden h-full` box, so it NEEDS a before/after preview check of desktop + mobile scroll. Keep mobile SwipeCarousel behavior intact either way. **Related latent issue (separate, do not fix here):** `applySheetRows` keys `pick_number` off raw row index, which aliases when manual + sheet picks mix.
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

### Sub-tier 6: Tyler's Keeper League (Yahoo snake)

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

## UX — AAA Visual Upgrade ("Stadium Primetime")
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
- [ ] UX-6.4: Before/after screenshot set

### UX-7: Sim Draft / Demo Mode (dev-only) [showcase + QA fixture]
> Goal: watch the full broadcast experience (and demo it to people) without running a real draft, and give the bug-hunt/QA sessions a way to drive the live UI. Reuses the REAL components — no standalone HTML, no API key (the advisor shows its rule-based fallback). Pairs with the Phase 2/3 moments shipped in Sunday Night Gridiron (lower-third, score-bug, ticker, gold grade reveal).
- [ ] UX-7.1: Dev-only Sim engine — `useDraftSimulator` hook (or a `?sim=1` flag on `/draft/live`, gated behind DEV_MODE) that auto-plays a scripted sequence of realistic picks from the loaded player pool into the existing draft state on a timer. Reuse the manual-pick / `applyPick` path; respect format (auction prices vs snake rounds). Speed control (slow/medium/fast) + pause/reset.
- [ ] UX-7.2: Drive every signature moment — verify the sim fires the lower-third wipe (`pick-lower-third.tsx`), the live score-bug cyan flashes (`live-scorebug.tsx`), the position-run ticker (script a 3+ run), and the on-the-clock takeover; auto-advance to completion so it lands on the gold grade reveal + confetti (`review/client.tsx`). Force the AI advisor OFF / `source:'fallback'` in sim so zero paid calls happen.
- [ ] UX-7.3: One-tap demo entry — a dev launcher (e.g. `/draft/live?sim=1` bookmark, or a long-press on the Draft hub) so Joe can pull it up on a phone on repeat to show people; document how to launch it in `WORKING_STATE.md`.

---

## P1 — Auctioneer Integration
> **Scope:** Joe's ESPN auction ONLY. Tyler drafts via the Sleeper app (snake, keeper) — no Auctioneer involvement for Tyler's league. All code paths gated by `format === 'auction'`.

- [x] FF-279: FFI reads Auctioneer's JSON export at auction setup — hot-reload on file change via File System Access API or localStorage namespace
- [x] FF-280: Subscribe to Auctioneer's `ffi-auction-feed` BroadcastChannel — instant pick sync when both run on same device (gated: auction mode only)
- [x] FF-281: `src/lib/draft/auction-feed-merge.ts` (NEW) — dedup pick events across sources by `pickId`, emit normalized pick events
- [x] FF-282: Generalize `src/hooks/use-draft-polling.ts` → `use-draft-feed.ts` — multi-source priority merge (BroadcastChannel > JSON > Sheets); snake/Sleeper mode uses manual entry only, zero behavior change
- [x] FF-283: Dynamic max-bid recompute — every pick from any source triggers `calculateMaxBidAdvice()` recompute for remaining players

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
| FFT-007 | Tyler's Sleeper dry run — create a test Sleeper draft (public, snake format). Connect FFI Sleeper mode. Simulate 5 picks. Verify: Sleeper polling detects picks, keeper visual distinction shows, AI recommendations fire. | [ ] |
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
- [ ] FF-080: Full pre-draft data pull with 2026 season data — verify all sources working `ACTION`
- [ ] FF-081: Draft day checklist — confirm Google Sheet template (Joe/auction), confirm Sleeper draft ID (Tyler/snake), verify mobile on both phones `ACTION`

---

## P3 — Community Release [CONDITIONAL]
> **Gate: 50 real non-Joe commissioner drafts AND 200 email signups. Do not start until gate is met.**

- [ ] FF-284: Strip personal hardcoding — remove Joe/Tyler references, generalize for any commissioner
- [ ] FF-285: Publish Auctioneer to GitHub (MIT license)
- [ ] FF-286: Post to r/fantasyfootball, r/ffauctions, r/dynastyff — helpful posts, no spam
- [ ] FF-287: Email capture on both landing pages — "Get notified when 2026 season starts"
- [ ] FF-288: Basic marketing landing page — hero, features, email capture, zero paid spend
- [ ] FF-289: SEO foundations — meta tags, sitemap, structured data for "fantasy football AI"

---

## P4 — Session Layer Architecture [CONDITIONAL]
> **Gate: Working session layer tested with 3+ real managers. Do not start until gate is met.**
> **Absorbs old Phase 9 REST API items — the API is only needed once the session layer exists.**

- [ ] FF-290: Replace Sheets with Supabase Realtime session layer — commissioner creates session → room code → managers join on phones
- [ ] FF-291: Live personalized recommendations per manager via session layer
- [ ] FF-292: API route structure — `/api/v1/analyze-roster`, `/api/v1/recommend-waiver`, `/api/v1/evaluate-trade` _(was FF-140)_
- [ ] FF-293: API key management + rate limiting — tiered by plan _(was FF-142/143)_
- [ ] FF-294: API documentation site — OpenAPI spec, interactive playground _(was FF-145)_

---

## P5 — Commercial Beta [CONDITIONAL]
> **Gate: 1,000 users AND $10K ARR. Do not start until gate is met.**

- [ ] FF-295: Pricing tiers — Free (basic board) / Pro $19/yr (full AI) / Commissioner $49/yr (in-season)
- [ ] FF-296: Feature gating + graceful upgrade prompts throughout app
- [ ] FF-297: Stripe integration — subscription billing, annual plans
- [ ] FF-298: Usage limits for free tier
- [ ] FF-299: Trial experience — 7-day Pro trial for new users
- [ ] FF-300: Analytics + conversion funnel — PostHog/Mixpanel

---

## P6 — B2B Outreach [CONDITIONAL]
> **Gate: 3 platform conversations AND 1 technical demo. Do not start until gate is met.**
> **Target:** Fantrax → MyFantasyLeague → Fleaflicker → Underdog. Not ESPN/Yahoo (unreachable founders).

- [ ] FF-301: Target list — 20-30 potential partners with contact research
- [ ] FF-302: Cold outreach sequence — personalized email + LinkedIn
- [ ] FF-303: Demo script — 15-minute API walkthrough
- [ ] FF-304: Partnership proposal template — pricing, integration scope, success metrics

---

## P7 — Scale Decision [CONDITIONAL]
> **Three outcomes — all are valid. The personal apps are worth building regardless.**
>
> **(A)** B2C traction → double down on consumer product
> **(B)** B2B deal → white-label for platform partner
> **(C)** Neither → shut down commercial ambitions, open source, keep using personally

_(Items TBD based on which outcome materializes)_

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
