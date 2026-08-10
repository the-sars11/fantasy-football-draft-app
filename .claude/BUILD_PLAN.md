<!-- DASHBOARD_STATUS
{
  "currentPhase": "P2 — Draft Readiness (Nasties ESPN auction, 2026 draft)",
  "status": "active",
  "milestones": [
    { "name": "Phase 0-2 — Data pipeline + strategy engine", "done": true },
    { "name": "Phase 3 — Live draft mode (auction state machine + advisor)", "done": true },
    { "name": "Phase 4-5 — Polish + scoring intelligence", "done": true },
    { "name": "Phase 6-7.5 — UI redesign + player intel", "done": true },
    { "name": "Phase 8 — In-season AI companion", "done": true },
    { "name": "P0 — Personal season hardening (sub-tiers 0-8)", "done": true },
    { "name": "P0-UX — 4-tab IA overhaul (Research/Draft/Review/Setup)", "done": true },
    { "name": "UX-V2 — GRIDIRON redesign (volt-green, live room)", "done": true },
    { "name": "P1 + P1b — Auctioneer integration + remote live sync (FF-314/315)", "done": true },
    { "name": "P2 — DRAFT READINESS (finish + verify for real draft night)", "done": false },
    { "name": "Stadium Primetime UI [SUPERSEDED 2026-06-04]", "done": true },
    { "name": "Auctioneer UI Port [REJECTED 2026-07-12, archived 2026-08-10]", "done": true },
    { "name": "P3-P7 — Commercialization [RETIRED 2026-08-06]", "done": true }
  ],
  "nextItems": [
    "DR-7 [Sonnet + Joe]: LIVE verification against the real auctioneer + full mock-draft rehearsal on Joe's phone. The draft-readiness GATE."
  ]
}
-->

# Fantasy Football Draft Advisor — Build Plan

**What this app is:** a personal live-draft advisor for **Joe's "Nasties" 12-team, $200, PPR, no-kicker ESPN AUCTION draft**. It never places bids — it advises Joe (what to do, max bid, budget/pace) and records results. Picks come **live over the network from the deployed auctioneer app** (`fantasy-auction-auctioneer`), which is the system of record. There is **no Google Sheets** and **no snake/keeper** scope — Tyler's Yahoo/Sleeper league is on permanent indefinite hold.

Task tracking: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## The one-plan rule (so we never silo again)

**There is exactly ONE plan: this file.** Any new direction is added HERE — either as active work or as a dated SUPERSEDED / REJECTED decision record. **No standalone plan docs.** (The `AUCTIONEER_UI_PORT_PLAN.md` orphan below is exactly what this rule prevents.) Design specs live in `DESIGN_SYSTEM.md`; live working state lives in `WORKING_STATE.md` (thin pointer only); the change audit trail lives in `CHANGELOG.md`.

---

## Dev Cycle

```
1. Find the FIRST [ ] item in the active phase (P2 — Draft Readiness), in DR order.
2. Check its model tag. If you're on a weaker model than the tag, HALT and tell Joe.
3. PROPOSE: classify the change, name the Review Lenses, declare scope (files touched + what will NOT change).
4. PATCH: implement inside the declared scope.
5. VERIFY: success criterion met + `npm run type-check` + `npm run test:run` + `npm run lint` (0 new) + build clean.
6. Paste the proof. Mark [x]. Update WORKING_STATE (pointer) + CHANGELOG (entry). Commit by explicit path + push.
```

---

## P2 — Draft Readiness [ACTIVE]

> **Goal:** everything a real draft night needs works, is honest, and is verified against the live auctioneer — nothing dead, nothing fake, nothing that spends money by surprise.
> **Order matters.** DR-1 → DR-7 run in sequence; each session's dependency is stated. Model tag is on each item.
> **Source of the gap list:** three evidence-based audits run 2026-08-10 (draft-critical path, full screen sweep, docs reconciliation). Every item below cites the real defect it fixes.

### DR-1 — Truth-up the living dev docs `[Sonnet]` · class: docs
> **Why:** the docs a session reads first still describe Google Sheets as the draft input, snake/keeper/Tyler as active, and retired commercialization as the roadmap. That drift is what caused the last session to navigate from dead items. Fix the docs before building on them.
> **Dependency:** none — do this first.

- [x] DR-1.1: `NORTH_STAR.md` — rewrite auction-only. Sole user = Joe / ESPN / Nasties. Input + system of record = the deployed auctioneer feed (FF-314/315), NOT Google Sheets. Remove Tyler as co-primary, remove Sheets, remove snake/keeper, remove Phase 9/10 commercialization, repoint the design line to `DESIGN_SYSTEM.md` v3.1 (GRIDIRON).
- [x] DR-1.2: `CLAUDE.md` — fix the Project Overview (drop Tyler/Yahoo), Key Design Decisions #1 (auction-only, not "both formats"), #2 (no Yahoo multi-platform), #6 (auctioneer feed, not "Google Sheets primary draft input"); fix the folder map (`/prep/research` is a dead 404; the live path is the auctioneer proxy). Add the **one-plan rule** (above) verbatim.
- [x] DR-1.3: `ARCHITECTURE.md` — redraw the live-draft box: auctioneer `/api/state` → our server proxy `src/app/api/auctioneer-feed/route.ts` → `use-remote-auctioneer-feed` → multi-source merge → state. Remove the Sheets + Snake boxes.
- [x] DR-1.4: `FEATURES_INDEX.md` + `CODE_AREAS.md` — refresh to the live-room reality (`src/components/draft/live-room/*`, `what-to-do.ts`, the auctioneer feed hooks); fix drifted line numbers.
- [x] DR-1.5: root `README.md` — replace the untouched create-next-app boilerplate with a real project readme (what it is, stack, `npm run dev` on **3003**, auction-only).
- [x] DR-1.6: `docs/TESTING_GUIDE.md` — rewrite auction-only (drop Sheets/Yahoo/snake/in-season), or archive it if it won't be maintained. State which. **Decision: rewritten in place (~120 lines, auction-only). Prior Phase 8 content in git history.**
- **Done when:** grep of the living docs for `google sheet`, `snake`, `keeper`, `Yahoo`, `Tyler`, `localhost:3000` returns only intentional historical/decision-record mentions; every doc reads true to Aug-2026 reality.

### DR-2 — Kill the dead paths `[Sonnet]` · class: shared
> **Why:** dead Google Sheets code still ships in the live path (a `sheet_url` on a session would start a second polling loop = draft-night foot-gun), and snake/keeper leftovers surface in an auction-only tool (Review renders a `SnakeAnalysisCard`). Orphans (`lib/research/analyze.ts` with zero callers, empty `prep/research/` dir, `sound-settings.tsx`) are pure confusion.
> **Dependency:** DR-1 (docs describe the target state). **Care:** some snake code is shared by the state machine — audit each symbol's callers before deleting; remove only what is truly dead, gate what isn't.

- [x] DR-2.1: Remove Google Sheets from the live path — the `sheets` option in `draft/setup/client.tsx` (option + label + URL input), the `sheet_url` polling in `use-draft-state.ts` + `use-draft-polling.ts`, `lib/sheets/index.ts`, `api/draft/sheets/route.ts`, the `'sheets'` `FeedSource` in `auction-feed-merge.ts`. Note: `ConnectionStatusPill` is still actively used by `live/client.tsx` and `draft/page.tsx` (not dead) — kept in place.
- [x] DR-2.2: Remove snake/keeper leftovers that surface in the auction UI — `SnakeAnalysisCard` import + render in `draft/review/client.tsx`; the Tyler "T&A Keeper League" preset in `scoring-presets.ts`; the unreachable keeper-exclusion block in `research/service.ts` (`keeperSettings` field kept in `PipelineConfig` for back-compat with callers).
- [x] DR-2.3: Delete orphans — `lib/research/analyze.ts` (`formatScoringBonuses` inlined into `recommend/route.ts`, its only caller), the empty `src/app/(app)/prep/research/` dir, `components/settings/sound-settings.tsx` (sound toggle already removed).
- **Done when:** `npm run build` + `type-check` + tests are green; a live-DOM check confirms the auctioneer live path renders and merges picks exactly as before; no `sheet_url` code path can fire.

### DR-3 — Fix the inverted cost-guard `[Sonnet]` · class: pipeline (Security/QA lenses)
> **Why (wallet safety — highest $ risk):** the audit found the guard is on the wrong buttons. "Run Research" is confirm-gated and warns "uses your API credits" but its pipeline is **deterministic — zero Claude spend**. Meanwhile "Generate Strategies" (`/api/strategies/propose`) and the board "Refresh" (`/api/research` with `skipRefresh:false`) **do spend Claude with no confirm at all**.
> **Dependency:** DR-2 (clean code). **Cost note:** this is a guarding change, not new spend. Any test that would fire a real Claude call needs Joe's typed approval first (per global rule #3).

- [x] DR-3.1: Put an explicit cost-confirm on the buttons that actually bill Claude -- "Generate Strategies" (`components/prep/strategy-proposals.tsx`). Board Refresh (`prep/board/client.tsx` `handleFullRefresh`) was flagged in the audit but traces to the same deterministic `/api/research` pipeline (zero Claude); no confirm added there.
- [x] DR-3.2: Fixed the misleading "uses your API credits" copy on Run Research (`prep/page.tsx`) -- text now accurately states "Free data pull · no AI credits." Also removed the spurious `ANTHROPIC_API_KEY` guard from `/api/research/route.ts` that was 503-ing the endpoint when the key is absent (the pipeline never calls Claude).
- [x] DR-3.3: `analyze.ts` confirmed deleted in DR-2.3. No orphaned Claude functions remain.
- **Done when:** the only buttons carrying an AI-cost confirm are the ones that reach a real Claude endpoint, verified by tracing each button to its route; no confirm fires a $0 deterministic path.

### DR-4 — Kill misleading / fake data `[Sonnet]` · class: output (QA lens)
> **Why:** two places show fiction as fact at the draft. Player Browser "system intel" tags use `getMockSystemTags` with `Math.random()` for BREAKOUT (`prep/players/client.tsx:36-95`, comment says "until intel API is built"). The Dry-Run sim uses a generic `DEFAULT_ROSTER` (qb1/rb2/wr2/te1/flex1/k1/dst1/bench6) instead of the locked Nasties shape (flex3/k0/bench5), so practice grades won't match the real draft.
> **Dependency:** DR-2.

- [x] DR-4.1: Player Browser intel tags — removed the `Math.random()`/fabricated-source mock tags (BREAKOUT, SLEEPER). Kept VALUE/AVOID, which are genuinely derived from real ADP/rank data already present. Removed the dead `'breakout'`/`'sleeper'` filter options. Real user target/avoid tags untouched.
- [x] DR-4.2: Dry-Run sim (`prep/simulate/client.tsx`) — `DEFAULT_ROSTER` now matches the locked Nasties shape (QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1) exactly. Dropped Kicker from position grading (Nasties drafts zero kickers) so the sim never shows a fake "F" grade for a position Joe never rosters.
- **Done when:** nothing in the prep surface displays a computed-random or placeholder value as if it were analysis; the sim scores against Joe's real roster shape.

### DR-5 — One-tap Go Live + connection-UX cleanup `[Sonnet]` · class: pipeline
> **Why:** on a cold start with no pre-existing resumable session, "Auctioneer is LIVE" still routes through the 3-step `/draft/setup` flow before entering the room (`draft/page.tsx`). At the table Joe wants one tap into the cockpit.
> **Dependency:** DR-2 (Sheets removed from setup), DR-1.

- [x] DR-5.1: When the auctioneer is detected live, "Go Live" now auto-creates/auto-resumes a valid auction session (seeded with the auctioneer's real team names via new `useRemoteAuctioneerFeed().teams`) instead of routing through `/draft/setup`. Manual-mode fallback untouched.
- [x] DR-5.2: Fixed `draft/live/client.tsx`'s room status `online` calc — it was `!(remoteError || aifError)`, which read LIVE before the first poll ever landed and stayed LIVE in pure Manual mode with no feed connected at all. Now sources `aifConnected`/`remoteConnected` directly. Manager attribution (DR-5.1's team-name seeding) makes `applyPick`'s exact-string-match against the auctioneer's real names hold end-to-end instead of against generic "Manager 2"-style placeholders.
- **Done when:** from the pre-Go-Live screen with the auctioneer live, Joe reaches the working room in one tap; manual fallback still works. **Code-verified** (type-check/tests/lint/build clean); **live-path verification against a real running auctioneer is DR-7's job**, not confirmed this session — this session's browser preview was also blocked by an unrelated chat session holding the shared preview infra port.

### DR-6 — Design-consistency sweep + season/* decision `[Sonnet]` · class: output (Design lens)
> **Why:** the app is ~85% on the GRIDIRON system. `prep/runs/client.tsx` and `components/prep/strategy-proposals.tsx` still use old shadcn primitives; the 5 unreachable `season/*` screens sit on the pre-GRIDIRON design system with stub TODOs.
> **Dependency:** DR-1..DR-5. **Lowest draft priority — only if time before the draft.**

- [x] DR-6.1: Bring `prep/runs` and `strategy-proposals` onto the GRIDIRON tokens/components so Research is 100% on-system. **Scope expanded (Joe-approved, 2026-08-10):** all 9 reachable off-system Research-tab files converted, not just the original 2 — `strategy-proposals.tsx`, `strategy-proposal-card.tsx`, `strategy-compare.tsx`, `strategy-value-preview.tsx`, `strategy-list.tsx`, `league-config-form.tsx`, `position-breakdown.tsx`, `strategy-editor.tsx`, `prep/runs/client.tsx`. All shadcn primitives (Button/Card/Badge/Input/Label/Select/Slider/Table) removed in favor of `ffi-*` classes + `var(--ffi-*)` inline styles; `prep/runs/client.tsx`'s comparison table converted to a CSS-grid row layout (Table removal was mandatory regardless, so went fully off-table for consistency). Verified: `type-check` 0 errors, `lint` 41 pre-existing baseline errors unchanged/0 new, `test:run` 96/96 passed, `build` clean (54 routes). Browser-verified 4 of 9 screens via DOM/console/computed-style (pixel screenshot tool was unavailable this session — see CHANGELOG); computed styles confirmed real GRIDIRON tokens resolve at runtime. 3 pre-existing dead/orphan files found during the sweep (`data-freshness.tsx`, `source-weights-config.tsx`, `user-rules-editor.tsx`) were flagged as a separate follow-up task, not touched here.
- [x] DR-6.2: **Decision: quarantine, not delete.** `season/*` (5 files: `page.tsx`, `matchups/page.tsx`, `start-sit/page.tsx`, `trade/page.tsx`, `waivers/page.tsx`) confirmed unreachable — zero references in `src/components/layout/` or `app/(app)/layout.tsx` nav. Each file's top-of-file docblock now carries an explicit "PARKED / OFF-SYSTEM (DR-6.2, 2026-08-10)" banner stating it's unreachable, pre-GRIDIRON, out of scope for draft night, and held for a future in-season companion phase (P8). In-season companion is confirmed out of scope for draft night.
- **Done when:** every reachable screen is on GRIDIRON; season/* is either removed or unambiguously marked parked-and-off-system. **✅ Met.**

### DR-7 — LIVE verification + mock-draft rehearsal `[Sonnet + Joe]` · class: pipeline (QA/Ops) — **DRAFT-READINESS GATE**
> **Why:** the auctioneer `/api/state` contract is **comment-verified only** (2026-08-07); FF-315 offline reconciliation is unit-tested but **never run against a live auctioneer**; the whole path **hard-depends on a seeded Supabase** that this session could not confirm (Supabase MCP needs auth). None of this is proven until it's run for real.
> **Dependency:** DR-1..DR-5 (DR-6 optional). **Needs Joe:** a running auctioneer instance + Joe on his phone. **Cost gate:** if the AI decision below is "on," a real dry run spends ~$0.01-0.03/pick — needs Joe's typed approval before firing.

- [ ] DR-7.1: Confirm the live Supabase is seeded — `players_cache` (real 2026 board values from FF-080), the 12-team Nasties league, and a valid auction session. (`/api/players|leagues|draft/sessions` 503 on an empty DB.)
- [ ] DR-7.2: Smoke-test the real auctioneer contract — with the auctioneer live and one pick recorded, confirm the pick appears in this app within ~5s, manager names resolve, price/position/bye are correct, no CORS error. (Replaces the old FF-072/FFT-006 "mock Google Sheet dry run.")
- [ ] DR-7.3: Rehearse FF-315 offline resync — go offline, record a provisional sale with a deliberately wrong price, reconnect, confirm the auctioneer value auto-corrects it with a visible notice and budgets/max-bid recompute; an offline-only pick not yet in the auctioneer stays flagged; no pick duplicates.
- [ ] DR-7.4: Arm's-length physical test on Joe's phone (was FFT-008) — every tap target reachable one-handed, text readable, one-tap Go Live works, the room is smooth/screenshot-able.
- [ ] DR-7.5: Full mock-draft rehearsal end-to-end on the real path (auctioneer + phone), start to graded review.
- **Done when:** Joe has run a full mock draft against the live auctioneer on his phone with picks tracking, advice correct, budgets right, offline-resync proven, and no surprises. **This is the "ready for draft night" sign-off.**

---

## Decisions to make (flagged, non-blocking — resolve during/before DR-7)

1. **AI features at the draft (cost).** Core advice — What-To-Do, budget, max-bid — is 100% rule-based and needs no API key (works today, free). The **AI "Top Targets" / research / strategy-proposal** panels need `ANTHROPIC_API_KEY` (absent from `.env.local`) and cost per call. **Recommended default: keep the rule-based advisor as the draft-night engine (free, reliable); leave the AI panels in safe fallback; only add a key + accept ~$0.01-0.03/pick if Joe wants LLM-generated picks live.** Joe decides in DR-7.
2. **season/* (in-season companion).** ~~Delete vs keep-parked~~ **Decided (DR-6.2, 2026-08-10): quarantine/park, out of scope for draft night.** Files carry explicit "PARKED / OFF-SYSTEM" banners.

---

## Superseded / rejected directions (decision records — do NOT resume)

- **Auctioneer UI Port** `[REJECTED 2026-07-12 · archived 2026-08-10]` — a standalone plan (`AUCTIONEER_UI_PORT_PLAN.md`) proposed swapping GRIDIRON's visual system for the auctioneer's (`--ck-*` tokens, 5-identity WA theme bank, Rajdhani/Archivo fonts, ESPN headshots). **Joe's decision: the draft app keeps its own GRIDIRON identity.** The shipped live room uses its own scoped `theme.ts` palette, not the auctioneer's system. Auctioneer components may be reusable but are **not needed** after the screen-by-screen overhaul. Nothing to build. Full doc archived at `.claude/archive/AUCTIONEER_UI_PORT_PLAN.md`. (This orphan is why the "one-plan rule" above now exists.)
- **Stadium Primetime / "Sunday Night Gridiron"** `[SUPERSEDED 2026-06-04]` — gold-glass direction rejected as generic AI slop; replaced by UX-V2 GRIDIRON. Engine/infra reused; look rebuilt. History-only.

---

## Completed Work (History)

> Full detail lives in `CHANGELOG.md` + git; these are the compact records. Original FF-XXX / UX IDs intact.

**P1 + P1b — Auctioneer integration + remote live sync** `[x]`
- FF-279..283: read auctioneer JSON/BroadcastChannel on same device; `auction-feed-merge.ts` pickId dedup; multi-source priority merge in `use-draft-feed.ts`; dynamic max-bid recompute per pick.
- FF-314: over-the-network remote sync — server proxy `src/app/api/auctioneer-feed/route.ts` (CORS dodge) + `use-remote-auctioneer-feed.ts` (~3s poll, backoff) folded in as a source. Contract read as-built 2026-08-07 (payload IS the `DraftState`; picks at `picks[]`; teams at `config.teams[]`). **Live-verified against a running auctioneer: pending → DR-7.2.**
- FF-315: offline resync + reconciliation — auctioneer is system of record; `reconcileWithAuctioneerPicks` in `state.ts` + corrections banner; 35 unit tests. Spec `.claude/OFFLINE_RESYNC_SPEC.md`. **Live-verified: pending → DR-7.3.**

**UX-V2 — GRIDIRON redesign** `[x]` (UXV2-1..8, 2026-06-04 → 2026-08-09)
- Direction: EA FC energy + Linear discipline; colorful-dark canvas, volt-green = the moment/value/action, electric blue = structure; Anton/Saira Condensed/JetBrains Mono; performant (no backdrop-filter stacks). No app-wide gold.
- Motion system (`lib/motion.ts`, motion components). Prep hub, Draft Board, Player Pool, Review rebuilt to GRIDIRON.
- UXV2-6: Live Auction Draft Room built — decision-first: status bar → On-the-Block hero with "What To Do" (`lib/draft/what-to-do.ts`, HOLD/BID/PUSH/PASS + cap + rationale) → awareness/budget/tier → My Team → bottom nav → block-picker + fix-a-pick sheets. Research-tab in-room view. Scoped `live-room/theme.ts` palette.
- UXV2-7: reduced-motion DIAL-DOWN + perf/arm's-length pass (lean, no filter stack). UXV2-8: full-track VERIFY + DESIGN docs reconciled to v3.1.

**P0-UX — 4-tab IA overhaul** `[x]` (UX-S1..S6, 2026-08-08 → 2026-08-09)
- Replaced 3-tab nav with 4 tabs: Research (`/prep`, landing) / Draft (`/draft`) / Review (`/draft/review`) / Setup (`/settings`), longest-prefix active state. Spec: `.claude/UX_OVERHAUL_2026-08.md`.
- Research consolidation; Draft = live auction room + FF-314 auto-connect; Setup with locked Nasties defaults auto-seeded (QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1), real signed-in user email (PM-email leak fixed), snake/keeper/sounds UI removed; Review as its own tab.

**P0 — Personal season hardening** `[x]` (sub-tiers 0-8)
- FF-253/254 UI eval (verdict B). FF-257/258/259 pinned quick-entry, mode selector, 4-state connection pill. FF-313 app-shell double-mount fix. FF-261-264 ESPN $200 auction calibration + budget trackers. FF-265-267 auction/snake separation. FF-268/269 mobile-first + touch targets. FF-243/270-272 AI transparency (confidence, source attribution, drift alerts). FF-276-278 pre-draft tools (dry run, news, ADP shifts). FF-305-311 trash-talk engine + live wiring + owner history. Sub-tier 6 (Tyler keeper) built then permanently held — out of scope.

**Phases 0-8 — core engine** `[x]`
- P0 foundation (FF-001-008b): scaffold, auth, league config, mobile shell.
- P1 data (FF-009-016): player model, ESPN/Sleeper/FantasyPros adapters, multi-source normalize, Supabase cache, freshness UI.
- P2 strategy (FF-S01-S08, FF-017-028): strategy model, AI proposals, editor, research pipeline, draft board, run management. FF-029 keeper (held).
- P3 live draft (FF-030-049, FF-P01-P05): setup, manual entry, scarcity, explainability, auction + snake state machines, recommendations, max-bid, budget strategy.
- P4 polish (FF-050-055): dark mode, states, post-draft review, CSV/share export, latency opt.
- P5 scoring (FF-067/068/070/071): scoring-aware analysis, Vercel deploy, Nasties E2E.
- P6-7.5 (FF-060-105, FF-073-078, FF-201-252): UI redesign, player intelligence (tags/rules/scoring/browser).
- P8 (FF-110-137): in-season companion (parked — see DR-6.2).
- **Data seed (FF-080, 2026-08-10):** `seed-players-sleeper.ts` (3,141 cached) + `populate-fantasypros.ts` (489 real 2026 PPR ECR + derived auction values, Ja'Marr Chase #1 $70). Free APIs. **Live-DB confirmation: pending → DR-7.1.**

**Retired:** P3 Community Release, P4 Session Layer, P5 Commercial Beta, P6 B2B, P7 Scale — all RETIRED 2026-08-06 (personal tool, no commercialization). FFT-007 (Sleeper dry run) retired 2026-08-06.

---

## Dead-code register (being removed in DR-2)

Kept here so the removal is tracked, not silent:
- **Google Sheets:** `lib/sheets/index.ts`, `api/draft/sheets/route.ts`, `use-draft-polling.ts`, the `sheet_url` branch in `use-draft-state.ts`, the `sheets` option in `draft/setup/client.tsx`, `'sheets'` in `auction-feed-merge.ts`, legacy `connection-status-pill.tsx`.
- **Snake/keeper surfacing:** `SnakeAnalysisCard` in `draft/review/client.tsx`, Tyler preset in `scoring-presets.ts`, keeper block in `research/service.ts`. (Shared state-machine internals stay if load-bearing.)
- **Orphans:** `lib/research/analyze.ts` (0 callers), empty `prep/research/` dir, `components/settings/sound-settings.tsx`.
- **Off-system/parked:** `season/*` — quarantined, not deleted (DR-6.2, 2026-08-10). Each file's docblock now has a "PARKED / OFF-SYSTEM" banner.

---

## Bug Hunt Schedule

| Cadence | Mode | Scope | Last Run | Next Run |
|---------|------|-------|----------|----------|
| Per-sprint | `free` ($0, static) | Changed modules | — | After DR-2 |
| Monthly | `full` (tests + build) | Full project | — | After DR-5 |

Run: `/bug-hunt free` or `/bug-hunt full`

## Feedback Queue

| Date | Reporter | Issue | Triaged To |
|------|----------|-------|------------|
| 2026-08-10 | Joe | Build plan + dev docs riddled with dead Google Sheets / snake refs; orphaned AUCTIONEER_UI_PORT_PLAN. Full overhaul. | This refresh (P2 Draft Readiness + DR-1 docs truth-up) |
