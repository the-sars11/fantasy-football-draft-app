# UX Discovery Agent Outputs - Fantasy Football Draft Advisor

**Step 0 of the dev-workflow-builder UX/UI universal process.**
**Run date:** 2026-07-05.
**Starting state:** FULL-BUT-TRASH (full working app, strong engine, GRIDIRON UI being discarded).
**Anchor:** EA FC 25 + Linear ("EA FC cockpit"). Per-screen anchors required at G1.5.
**Purpose of this file:** resume-safe persistence of the raw discovery-agent findings that feed the Step 0 briefing and every downstream artifact. Append-only reference; do not edit prior sections.

**Run note (process honesty):** The first pass dispatched 4 `general-purpose` discovery agents. Two of them (UI audit and backend) delegated to their own sub-agents in a cascade and returned placeholder stubs instead of findings. Recovery: the UI audit was re-driven inline to a full result; the auctioneer inventory was re-run with read-only Explore agents (no delegation possible); the backend Explore died twice on `FailedToOpenSocket` API errors but returned a full file:line audit on a third resume. All four domains are now backed by real findings. Lesson for future Step 0 runs: use read-only Explore agents for discovery so they cannot cascade.

---

## Agent 1: UI audit vs eval rubric (current GRIDIRON build)

Audited against `UX_UI_EVAL_RUBRIC.md` + `UX_UI_METHODOLOGY.md`. File:line cited throughout.

### Surface 1: App shell / nav - `src/components/layout/app-shell.tsx`
- CRITICAL - backdrop-blur outside allowlist. `app-shell.tsx:212` mobile bottom tab bar uses `backdrop-blur-2xl` on a persistent nav element (not a Sheet/Dialog/CommandPalette overlay). Floor failure.
- CRITICAL - no real imagery anywhere. Only two `<Image>` usages in the whole codebase (`app-shell.tsx:86-92`) are a 24x24 favicon. `ProfileAvatar` (`app-shell.tsx:38-57`) is a letter-in-a-circle placeholder. Zero player headshots, team logos, or hero photography in a sports/player-data product.
- MODERATE - active nav state uses `bg-[var(--ffi-gold)]/10` and `/12` (`app-shell.tsx:113,232`); token resolves to volt green, so not a literal-hex hit, but the `gold` token name lies about what ships.
- Atmospheric background (`stadium-atmos` + `atmos-grain`, lines 75-77) is a fixed radial gradient + SVG noise (compliant, not blur), but it is the only cinematic gesture in the shell.

### Surface 2: Global tokens / fonts - `src/app/globals.css`, `src/app/layout.tsx`
- CRITICAL - Anton ships as the display face (`layout.tsx:10-15`; `globals.css:20,327,661,782,848`). Anton is NASCAR Hat Draw's locked face; reuse here is direct cross-portfolio convergence slop. Used for `.font-display`, `.ffi-grade` (grade letters), and the "steal" banner - the app's biggest emotional beats borrow NASCAR's identity.
- Numeral face: JetBrains Mono (`globals.css:807,821`; `layout.tsx:31-36`), tabular, a genuine named-role choice done right.
- Body/UI: Saira + Saira Condensed (`layout.tsx:17-29`). Not slop-listed; the named-set intent is right but the Anton display choice undercuts it.
- MODERATE - three independent, non-shared position-color palettes: `globals.css:191-195,616-621`; `prep/board/client.tsx:38-45` (`POS_PILL_COLORS`); `draft-board-table.tsx:18-25` (`POS_COLORS`). Same 5 colors defined 3x with differing alpha; any tweak needs 3 files.
- MODERATE - "No gold" claim (`globals.css:10`) is false at literal-value level. `--ffi-gold` remaps to `#8bff45` (volt), but `draft/live/client.tsx:985-987,1065,1097` hardcode literal `rgba(224,194,122,...)` / `rgba(253,239,182,...)` = actual cream/gold (`#e0c27a`, `#fdefb6`), bypassing the token remap on the most important screen (the On-The-Clock hero banner).
- MODERATE - WCAG contrast baked into tokens. `--ffi-ink-3` (`#637396`), the pervasive muted/secondary text token, measures ~3.65:1 on `--ffi-surface-2` (`#111a2e`), failing AA (4.5:1) for normal text. Systemic (captions, timestamps, loading labels), e.g. `review/client.tsx:283`.

### Surface 3: Live Auction Draft Room (flagship) - `src/app/(app)/draft/live/client.tsx` (~1255 lines)
- CRITICAL - hardcoded gold hex in the hero moment. `client.tsx:985-987,1065,1097` literal gold rgba; `client.tsx:937` `bg-[#0a1b25]/90 backdrop-blur-sm` (sim HUD, ambient blur, floor failure).
- CRITICAL - 1255-line single client component owning sim HUD, header, on-the-clock hero, scorebug, position-run ticker, two-column grid (strategy picker, squad panel, pick feed, trash-talk feed, saved alerts, auction/snake advisor branch, desktop panels, flow alerts, position scarcity, injury watch, quick-entry bar). Mixes state orchestration (Auctioneer/Sleeper/sim feed hooks), analysis (scoring/tendencies/pivot), and presentation for ~15 sub-features. Close to untestable; risky for a visual swap.
- Loading state `client.tsx:897` is a bare `<Loader2>` spin, no skeleton.
- POSITIVE - the on-the-clock banner uses real motion (spring, `AnimatePresence`, pulse dot) - the one place "motion as language" shows intent, undercut by the literal-gold problem.

### Surface 4: Post-Draft Review - `src/app/(app)/draft/review/client.tsx` (~1074 lines)
- MODERATE - two bare spinner+text loading states (`review/client.tsx:279-286` "Loading sessions...", `384-389` "Analyzing draft..."). No skeleton despite `PageSkeleton`/`ffi-skeleton` existing elsewhere.
- POSITIVE - the true empty state is designed (`review/client.tsx:302-312` "No Drafts to Review", icon + headline + copy). This is the shape all states should follow; it is the exception, not the rule.
- CRITICAL - 1074-line single client component (grade computation, view-mode tabs, CSV export, share-text, roast report, three sub-views).
- MODERATE - raw hex/rgba in style blocks (`review/client.tsx:373` `#fff`; `gradeColors`/`verdictConfig` maps lines 52-90 hardcode rgba glow/border per grade rather than deriving from `--ffi-*` tokens, e.g. duplicating `--ffi-volt-glow`).

### Surface 5: Draft Board / Player Pool - `prep/board/client.tsx` (~718 lines), `components/prep/draft-board-table.tsx` (~448 lines)
- CRITICAL - floor-failure raw hex in a `style={{}}` block. `board/client.tsx:306` `style={{ background:'rgba(255,110,138,0.08)', border:'1px solid rgba(255,110,138,0.18)', color:'#FF6E8A' }}`.
- CRITICAL - systemic version. `draft-board-table.tsx:18-25,32` `POS_COLORS` raw hex/rgba fed into `style={{ background: colors.bg, color: colors.text }}` for every position chip.
- MODERATE - bare "Loading leagues..." spinner (`board/client.tsx:293-299`) despite `PlayerListSkeleton` (`board/client.tsx:47-59`) existing in the same file.
- Cinematic depth verdict: flat. Filterable text rows/cards + colored 2-letter position tag + numeric score. No photography, no hierarchy beyond font-weight. Reads as quiet-slop.

### Surface 6: Prep Hub / Strategies - `src/app/(app)/prep/*`, `src/components/prep/*`
- `prep/page.tsx:39,110,249,277` raw rgba literals in `style={{}}` blocks (background washes) - lower stakes, still non-tokenized.
- `strategy-editor.tsx:544`, `strategy-proposals.tsx:168` `backdrop-blur-sm` on sticky bottom save bars - borderline, likely outside the Sheet/Dialog/CommandPalette allowlist.
- No command palette anywhere (grep for cmdk/CommandPalette returned zero files). One of the 10 premium elements entirely missing.
- Strategy list/compare screens are pure text-and-number cards, no imagery, same flat-dark read.

### Deterministic floor-failure summary
1. Em/en-dash: PASSES as shipped. ~56 grep hits are all inside code comments; none render to users. `api/trash-talk/route.ts:145-146` hard-strips em-dashes from LLM output. (Read grep results carefully - raw count is misleading.)
2. Raw hex in `style={{}}`: FAILS. `prep/board/client.tsx:306` (`#FF6E8A`); `draft-board-table.tsx:32` (via `POS_COLORS`); `draft/live/client.tsx:985-987,1065,1097` (gold rgba); `review/client.tsx:373`; `connection-status-pill.tsx:124,126,150` (`#f87171`); plus more in `prep/page.tsx`, `trash-talk.tsx`, `LowerThird.tsx`.
3. backdrop-blur outside allowlist: FAILS. `app-shell.tsx:212`; `draft/live/client.tsx:937`; `season/page.tsx:125`; `strategy-editor.tsx:544`; `strategy-proposals.tsx:168`. Correctly allowlisted only: `ui/dialog.tsx:34`, `ui/sheet.tsx:31`.
4. axe serious/critical: not run (read-only, no live server). WCAG contrast math above (`--ffi-ink-3` 3.65:1) is a near-certain axe "serious" hit when a runtime pass runs.

### TOP-3 critical findings (whole app)
1. Zero real imagery anywhere. Only `<Image>` is a 24px favicon (`app-shell.tsx:86-92`). Caps the app at quiet-slop regardless of color/motion polish.
2. Token system says one thing, literals ship another. `--ffi-gold` honestly remaps to volt, but literal gold rgba ships in the live hero (`draft/live/client.tsx:985-987,1065,1097`) and three separate position palettes bypass tokens. "Rebrand by variable" premise does not hold.
3. Two 1000+ line god-components own the flagship screens (`draft/live/client.tsx` 1255, `draft/review/client.tsx` 1074). Any rebuild must decompose these first or re-inherit the trap.

### Overall grade
Competently-engineered, functionally complete tool wearing quiet-slop-with-loud-slop-leakage: flat-dark cards and text/chip lists with almost no imagery, while the live hero and grade reveals lean on gold glows + sheen + an Anton display face that collides with another portfolio app. Token architecture shows real intent (named font roles, semantic vars, motion tokens, thorough reduced-motion) but is undermined by parallel literal hex/rgba across a dozen files. Needs a ground-up visual and structural rebuild, not a reskin - matches the plan to discard GRIDIRON.

---

## Agent 2: Backend / engine wired-vs-stubbed (Explore audit, file:line)

The dedicated backend Explore agent failed to return twice on `FailedToOpenSocket` API errors, then returned a full file:line audit on a third resume. Findings below are that agent's, cross-checked against `CODE_REVIEW_2026-06.md` and `BUILD_PLAN.md`. Backend is OUT OF SCOPE for the UX personality lock (engine math stays untouched); this exists so the redesign does not design against dead/mock data.

### Data source adapters
- SLEEPER - REAL, WIRED. `sources/sleeper.ts:179` `fetchSleeperPlayers()` -> real `api.sleeper.app/v1/players/nfl`; `:218` projections; `:267` weekly; `:381` `fetchAllSleeperData()`. Wired via `research/service.ts:87` default sources.
- ESPN - REAL, WIRED. `sources/espn.ts:179` `fetchESPNPlayers()` -> real `lm-api-reads.fantasy.espn.com` (rankings, ADP, auction values, projections). In default sources.
- FANTASYPROS - REAL, WIRED, with fallback. `sources/fantasypros.ts:181` `fetchFantasyProsECR()` tries API then `:132` scrapes embedded JSON; `:268` auction values. In default sources.
- YAHOO - STUBBED, NOT WIRED. `sources/yahoo.ts:22-36` all functions throw "Yahoo adapter not yet implemented - requires OAuth setup" (FF-011 TODO). Not in default sources. Fine in practice (Tyler drafts via Sleeper), but the UI must not assume Yahoo data.

### Player seed / Supabase cache
- REAL. `scripts/seed-players-sleeper.ts:65` fetches the real Sleeper API; `:74-78` filters active QB/RB/WR/TE/DEF (no K); `:131` upserts `players_cache` in batches of 100; `:172` verifies >=300. No mock data. The build-plan "3,048 players" figure is a run output, not hardcoded. Player pool is real data - safe to design against.

### LLM calls and no-key behavior
- `ANTHROPIC_API_KEY` absent in `.env.local`. Live recommend never 500s: `api/draft/recommend/route.ts:255-263` catches all LLM errors and returns rule-based fallback (`auctionFallback`/`snakeFallback`, top available by strategy, tagged `source:'fallback'`); `:244-254` retry with timeout under the Vercel 10s ceiling. `lib/ai/claude.ts:14-20` `getClient()` throws on missing key but the route catches it.
- Research pipeline REQUIRES the key: `api/research/route.ts:78-82` returns 503 without it. So prep/research screens have a hard "no key -> no run" state that must be designed for.

### Sim / demo mode - zero paid calls
- REAL. `hooks/use-draft-simulator.ts:57-166`; `:32-35` `simAuctionPrice()` uses `consensusAuctionValue` (no API); `:87-133` fires picks through the real `addManualPick()` reducer path (so all live UI updates fire). Trash-talk generation suppressed in sim (`draft/live/client.tsx:749-750`, `!simEnabled`). `DEMO_SESSION` (12 managers, $200 budgets) needs no real league. This is how the redesign gets visually verified without a real draft.

### Live feed paths - which actually run
- Auctioneer feed (auction only) WIRED: `hooks/use-draft-feed.ts:105` enabled when `format==='auction' && !!connectionType`; `:124-128` BroadcastChannel + localStorage + file poll; `:114-120` merged via `createPickMerger()` dedup.
- Sleeper draft feed (Sleeper mode) wired: `hooks/use-sleeper-draft-feed.ts` (the model hook - refs for callbacks, stable deps).
- Sheets feed DECOUPLED BY DESIGN: `hooks/use-draft-polling.ts:51-102` polls `/api/draft/sheets` every 7s, but `use-draft-feed.ts:14-15` states Sheets is handled separately to avoid double-polling and is NOT merged into the live feed. Confirms CODE_REVIEW #8: the cross-source-with-Sheets merge path does not run. Live picks = Auctioneer + manual (+ Sleeper) only.
- Manual entry always wired: `components/draft/manual-pick-entry.tsx` -> `addManualPick()`, same state machine.

### MUST-AVOID flags for the redesign (do not design against as if live)
- Yahoo adapter stubbed - no Yahoo data in UI.
- Sheets cross-source merge NOT implemented - polls independently, not auto-merged.
- Research needs the key (503 without) - design the no-key state.
- SENTIMENT / PLAYER-INTEL DATA IS MOCKED: `lib/research/intel/service.ts:46-58`; system tags in `prep/players/client.tsx` use `getMockSystemTags()` (simple ADP/rank heuristics), NOT real intel. The player-intelligence surfaces show placeholder data. Flag before designing prep/players as a data-real screen.
- LLM does not always fire - always design for the fallback state in the advisor UI.

### Genuinely strong (keep)
`explain.ts` explainability engine (weighted factors, cited sources, thin-data guards); format-split recommendation modules with hard throws; `use-sleeper-draft-feed.ts` as the refactor template; trash-talk trigger engine format-gated at detection. Live advisor now auto-fires (CODE_REVIEW #1 FIXED, `hooks/use-auto-recommend.ts`); prompt caching on (#2); keeper completion fixed (#4).

---

## Auctioneer component-harvest inventory (INVENTORY ONLY - no porting)

Sibling repo `C:\Users\jrasa\AI Projects\fantasy_auction_auctioneer` is ahead of FFDA in this process and already has its own methodology artifacts. This is a catalog for a later Step-1 repurpose list. IMPORTANT: reuse is a Step-1 decision gated by FFDA's own personality lock. Cloning auctioneer's "cockpit" look into FFDA is cross-app convergence slop and is banned - harvest patterns and logic, not the visual identity.

Auctioneer already has (relevant to FFDA's process): `.claude/UX_PERSONALITY_LOCK.md` (cockpit system: cobalt-night stadium, single cyan accent `#54e6ff`, team-color-only-on-the-on-block-card rule, 3 locked faces Rajdhani/Archivo/JetBrains Mono, 5-theme WA color bank swapped via `data-theme`), `.claude/ux-flows.md` (6-screen journey map + 4-state page machine + resolved friction log), `.claude/AA-TT-SPEC.md` (~1127-line trash-talk spec), NORTH_STAR / ARCHITECTURE / IA proposal / screen map / redesign state.

Reusable code candidates (file, ~lines, maps-to):
- `src/components/draft/PlayerCard.tsx` (~161) - on-block card, team-tinted body, ESPN headshot + silhouette fallback, 5-stat strip, entrance sweep -> FFDA on-the-block card.
- `src/app/board/page.tsx` (~391) - read-only TV board, responsive team grid (4x3 / 5x2), on-the-block banner, BroadcastChannel + 3s `/api/state` poll -> FFDA TV hero board.
- `src/components/draft/AllTeamsDrawer.tsx` (~194) - slide-over all-team rosters, sortable, expand/collapse -> FFDA all-teams drawer.
- `src/components/draft/TeamBudgetGrid.tsx` (~71) - glanceable per-team budget health strip -> FFDA budget strip.
- `src/components/draft/PickFlyoverCard.tsx` (~63) - Framer Motion sold-card flyover -> FFDA pick-confirmed transition.
- `src/lib/draft-reducer.ts` (~276) - pure draft state machine (NOMINATE/AUTO_DRAW/COMMIT_SALE/UNDO/etc.), 20 unit tests -> pattern reference (FFDA has its own `state.ts`; do not swap engines).
- `src/lib/budget.ts` (~48), `src/lib/players.ts` (~309), `src/lib/storage.ts` (~138) - budget math, nomination/search, localStorage abstraction.
- `src/lib/trash-talk.ts` (~427), `trash-talk-history.ts` (~162), `api/trash-talk/route.ts` (~180), `components/draft/TrashTalkToast.tsx` (~115) - the exact source FFDA's trash-talk was ported from; dual-tone system prompts, em-dash strip, toast UI.
- `src/components/draft/BidTracker.tsx` (~118), `NominationQueue.tsx` (~60), `MaxBidCalculator.tsx` (~255), `DraftLog.tsx` (~231), `PlayerSearchPanel.tsx`, `SoldEntryRow.tsx` - live-draft sub-panels.
- `src/app/setup/page.tsx` (~220) - league config form (team count, budget, names, paste-import) -> FFDA draft setup.
- `src/components/share/SharePanel.tsx` (~174) - QR + URL share modal, Web Share API.
- `src/app/globals.css` (~833) - dual design system (frozen legacy `@theme` + `.cockpit`-scoped locked system); demonstrates running two design systems side-by-side during a migration (the base-canvas pattern FinOps also used). Harvest the PATTERN, not the cockpit palette.

Caveat on the agents' own editorializing: one auctioneer agent claimed "70% copy-paste reusable, copy the entire cockpit block." Treat that as inventory enthusiasm, not a recommendation. Visual identity is NOT reused; FFDA gets its own personality lock. Logic/state/patterns are candidate reuse subject to Step-1 approval.

---

## Agent 3: Build-plan review (in / out of scope)

Sources: `BUILD_PLAN.md`, `WORKING_STATE.md`, `UX_OVERHAUL_KICKOFF.md`, `CODE_REVIEW_2026-06.md`, `NORTH_STAR.md`, `UI_UPGRADE_PLAN.md`, `FEATURES_INDEX.md`, `CODE_AREAS.md`, plus `src/app` tree.

### Shipped
Phases 0-8 all `done:true` (data pipeline + strategy engine, live draft mode, polish + scoring intelligence, GRIDIRON-era UI, in-season AI companion). P0 hardening sub-tiers 0-8 all `[x]` except FF-255/256 (skipped; verdict B did not need a full rebuild). GRIDIRON UXV2-1..5 shipped (foundation, live room v2, board/pool v2, prep hub, cross-cutting QA/a11y/perf). The GRIDIRON line is now SUPERSEDED, not a candidate baseline.

### In flight / blocked
UXV2-6 (Live Auction Draft Room rebuild) is DESIGN-BLOCKED, not code-blocked. Per `BUILD_PLAN.md:19` + `UX_OVERHAUL_KICKOFF.md:13` it cannot be coded until the multi-team board mockup (phone + TV hero) clears a Reference Board step and gets Joe sign-off, and the kickoff stacks Hard Ban #4 on top (no UI code until `UX_PERSONALITY_LOCK.md` is signed off; FFDA has none). 2026-06-25 pivot: Joe rejected the first multi-team board attempt; `draft-board.html` + `draft-board-tv.html` were deleted; the GRIDIRON volt/blue direction was declared replaced. Legacy GRIDIRON mockups (`.claude/mockups/draft-room-phone.html`, `live-draft-room-v1.html`) are flagged do-not-build-to. `on-the-block.html` is a ghost: `WORKING_STATE.md:13` calls it "APPROVED + LOCKED" at `public/on-the-block.html`, but `public/` contains no HTML at all and git history is empty - unrecoverable, treat "locked" as false.

### In scope for this UX run
FULL-BUT-TRASH applies to the whole UI, not just the draft room. Candidate HERO screens (kickoff `:24`), each needing its OWN specific EA-FC surface anchor: on-the-block card (personal phone), multi-team draft board (phone), TV hero board (shared display, no advice), draft board (post-draft +/- vs last year), post-draft review. Beyond the named heroes, the rest (Prep Hub, Configure, Player Board/Pool, Keepers, Strategies, Runs, Season tools) is in scope for screen-by-screen rebuild since the whole GRIDIRON layer is discarded.

### Out of scope for the UX design lock
8 open P1 code items from `CODE_REVIEW_2026-06.md` (separate code track, `UX_OVERHAUL_KICKOFF.md:26`): #7 sheet pick-dedup (`state.ts:171-193`), #8 dedup-key unification (`use-draft-feed.ts`/`auction-feed-merge.ts`), #9 giant-component extraction (`live/client.tsx` ~1140, `review/client.tsx` ~1200; note: happens naturally when UXV2-6 rebuilds the live room), #10 sheet-poll backoff (`use-draft-polling.ts`), #11 keeper numbering (`keepers.ts`), #12 pick edit/undo, #13 connection-pill a11y, #16 ~25 pre-existing lint errors. Conditional commercialization P3-P7 gated, not now.

### Build-plan deltas needed
No Track-2 artifacts (`UX_OVERHAUL_KICKOFF.md:9`): no personality lock, IA proposal, screen map, ux-flows.md, discovery outputs. Doc hygiene (non-blocking for Step 0): `UI_UPGRADE_PLAN.md` (73 ln) archive to `.claude/archive/`; `FEATURES_INDEX.md` + `CODE_AREAS.md` stale (mtime 2026-04-14), refresh after UXV2-6 lands. Flag: `src/app/(app)/prep/research/` exists as a directory but no `page.tsx` matched the glob - confirm dead scaffolding vs misnamed at Step 1.

### Actual routes (23 total: 19 app + 4 auth)
`/` (`src/app/page.tsx`); `/prep`, `/prep/configure`, `/prep/board`, `/prep/players`, `/prep/keepers`, `/prep/strategies`, `/prep/runs`, `/prep/simulate`; `/draft`, `/draft/setup`, `/draft/live`, `/draft/review`; `/season`, `/season/start-sit`, `/season/waivers`, `/season/matchups`, `/season/trade`; `/settings`; `/sign-in`, `/sign-up`, `/forgot-password`, `/update-password`.

---

## Agent 4: Methodology gap vs the system

### Canonical UX artifacts: FFDA has ZERO of 13
MISSING (all): `UX_PERSONALITY_LOCK.md`, `UX_IA_PROPOSAL.md`, `UX_REDESIGN_SCREEN_MAP.md`, `UX_REDESIGN_STATE.md`, `UX_DISCOVERY_AGENT_OUTPUTS.md` (this file is the first), the 5 per-app files (`product-brief.md`, `ux-flows.md`, `screen-inventory.md`, `design-system.md`, `ai-design-rules.md`), `LEARNED_UX_RULES.md`, per-screen `UX_REDESIGN_<SCREEN>_SPEC.md`, `docs/ux_redesign/*.html` (the directory does not exist). Matches the kickoff: FFDA has never been through the methodology.

### What EXISTS - pre-methodology, demoted to Reference Board input (Pit Lane treatment)
- `.claude/DESIGN_SYSTEM.md` - GRIDIRON v3.0 (2026-06-04), self-declared "LOCKED" (volt/electric-blue, Anton/Saira, EA FC + Linear). Never locked under the methodology (no 8-section vote, no OKLCH, no per-screen anchor). Reference Board tile only.
- `.claude/UI_DESIGN_SPEC.md` - older "Tactical Hologram" HUD spec (2026-06-02), itself already superseded twice. Three directions deep; proves the pre-methodology process thrashed without ever locking. Reference Board input.
- `.claude/UI_EVAL_2026.md` - April 2026 eval against ad hoc criteria, predates `UX_UI_EVAL_RUBRIC.md`. Historical only, not a valid G9 eval.
- `.claude/mockups/*.html,*.png` (GRIDIRON set) - the only viewable recent design; the newer 2026-06-25 EA-FC direction is unrecoverable. Demoted Reference Board tiles.
- `.claude/UX_SESSION_PROMPT.md`, `.claude/UI_UPGRADE_PLAN.md` - stale pre-methodology sprint loop; archive to `.claude/archive/`.

### Gate sequence and where FFDA sits
FFDA is at G0, not started. G0 (briefing) -> G1 (IA per-move vote) -> G1.5 (screen map, HARD STOP: every HERO screen needs its own JTBD + own named anchor before Joe approves) -> G5 (personality lock, 8-section vote) -> per-screen G3 (Q-batch) / G4 (mockup) / G6 (per-screen) -> G9 (eval). Hard Ban #4: no UI code until `UX_PERSONALITY_LOCK.md` is signed off. Every open UXV2 sprint is blocked under the new process.

### Per-screen two-session cadence: FFDA has done NONE formally
No screen has a locked Session A (spec + mockup + Q-batch + Joe lock, zero code) or a separate Session B (build + verify with pasted proof). The lost "APPROVED + LOCKED" on-the-block.html is itself the argument for committed artifacts at each gate.

### Artifact path forward (ordered)
1. `UX_DISCOVERY_AGENT_OUTPUTS.md` (Step 0, this file).
2. 6-part briefing (chat, not a file) - G0.
3. `UX_IA_PROPOSAL.md` (Step 1) - G1 per-move vote.
4. `UX_REDESIGN_SCREEN_MAP.md` (Step 2) - G1.5 HARD STOP, anchor per HERO screen.
5. `UX_PERSONALITY_LOCK.md` (Step 3) - G5 8-section vote (unblocks Hard Ban #4).
6. The 5 per-app files, alongside/after the lock.
7. Per HERO screen (Session A): `UX_REDESIGN_<SCREEN>_SPEC.md` -> `docs/ux_redesign/<screen>_v1.html` -> Q-batch - G3/G4.
8. App code build per screen (Session B, separate session) - G6.
9. `UX_REDESIGN_STATE.md` append-only audit trail, started at IA.
10. `LEARNED_UX_RULES.md` (Step 5) - G9.

### Anchor-discipline flag (the key trap)
G1.5 forbids "EA FC" on every row. Each HERO screen names its own specific EA-FC surface (proven on a Step-B2 Reference Board with real current screens): on-the-block card -> pack-opening / item-reveal card; multi-team board -> squad-building / market board; TV hero -> live-broadcast draft-tracker HUD; prep/research board -> player-search / scouting screen; post-draft review -> match-summary / squad-recap. Font slop: Anton is out (NASCAR's face). FFDA prescribed set (a Step-3 decision, not pre-decided): Rajdhani/Saira (display) + Inter Tight/Archivo (UI) + JetBrains/Geist Mono (numerals).
