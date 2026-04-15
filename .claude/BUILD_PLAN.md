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
    { "name": "P1 — Auctioneer integration", "done": false },
    { "name": "P2 — Pre-season validation", "done": false },
    { "name": "P3+ — Commercialization (CONDITIONAL)", "done": false }
  ],
  "nextItems": [
    "FF-273: Keeper discount calculator (P0 keeper sub-tier)",
    "FF-276: Dry run simulation — stress-test draft strategy against historical ADP"
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
- [ ] FF-269: Arm's-length + bad-lighting physical test — fix anything requiring precision tapping or small touch targets (<44px)

---

### Sub-tier 5: AI Transparency

- [ ] FF-243: Confirm/dismiss system tag actions API — UI exists in `ffi-player-intel-card.tsx`, needs backend endpoint `[~]` _(UI ready — needs API only)_
- [ ] FF-270: Confidence indicators on recommendations — flag "Low confidence — thin data" when coverage is sparse (extend `src/lib/draft/explain.ts:explainPlayer()`)
- [ ] FF-271: Data source attribution — show which sources the AI is drawing from per recommendation
- [ ] FF-272: Strategy drift alert — when target players are gone and AI is about to pivot, make it explicit before acting

---

### Sub-tier 6: Tyler's Keeper League (Yahoo snake)

- [ ] FF-069: Tyler's league setup — enter his exact scoring settings + keeper rules/costs when provided `[!]` _(Blocked: waiting on Tyler's settings)_
- [ ] FF-273: Keeper discount calculator — keeper cost vs. current ADP value = keeper equity, sorted descending
- [x] FF-274: Visual distinction between kept and drafted players — keeper picks (is_keeper=true OR pick_number<0) show 🔒 icon, muted name (#94a3b8), K1/K2/K3 pick numbers in PickFeed + LeagueOverview; helpers extracted to lib/draft/keepers.ts
- [x] FF-275: Yahoo keeper assignment import → auto-exclude from draft pool

---

### Sub-tier 7: Pre-Draft Tools

- [ ] FF-276: Dry run simulation — run full draft strategy against historical ADP to stress-test
- [ ] FF-277: Draft day news panel — surface injury/status changes within 24 hours of draft; flag any board player with status change since last refresh
- [ ] FF-278: Consensus shift alerts — highlight players whose ADP moved >5 spots since last refresh

---

## P1 — Auctioneer Integration
> **Scope:** Joe's ESPN auction ONLY. Tyler's Yahoo snake draft uses Sheets polling exclusively — no Auctioneer involvement. All code paths gated by `format === 'auction'`.

- [ ] FF-279: FFI reads Auctioneer's JSON export at auction setup — hot-reload on file change via File System Access API or localStorage namespace
- [ ] FF-280: Subscribe to Auctioneer's `ffi-auction-feed` BroadcastChannel — instant pick sync when both run on same device (gated: auction mode only)
- [ ] FF-281: `src/lib/draft/auction-feed-merge.ts` (NEW) — dedup pick events across sources by `pickId`, emit normalized pick events
- [ ] FF-282: Generalize `src/hooks/use-draft-polling.ts` → `use-draft-feed.ts` — multi-source priority merge (BroadcastChannel > JSON > Sheets); snake mode uses only existing Sheets source, zero behavior change
- [ ] FF-283: Dynamic max-bid recompute — every pick from any source triggers `calculateMaxBidAdvice()` recompute for remaining players

---

## P2 — Pre-Season Validation
> **Was Phase 7. Run this before Aug 2026 drafts to confirm everything is live-ready.**

- [ ] FF-011: Yahoo Fantasy API adapter — OAuth flow for Tyler's auto-pull from Yahoo _(DEFERRED — requires OAuth app registration)_ `DEEP`
- [ ] FF-260: Document exact Sheets setup in `WORKING_STATE.md` — column names, format, share permissions confirmed from actual Nasties 2026 sheet _(Blocked: need real draft sheet ~Aug 2026)_
- [ ] FF-072: Live draft dry run — mock Google Sheet, run through full auction + snake live draft flow end-to-end `ACTION`
- [ ] FF-079: Yahoo OAuth adapter (FF-011 follow-up) — if Tyler wants auto-pull `DEEP`
- [ ] FF-080: Full pre-draft data pull with 2026 season data — verify all sources working `ACTION`
- [ ] FF-081: Draft day checklist — confirm Google Sheet template, test sheet polling, verify mobile on both phones `ACTION`

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
| — | — | — | — |

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
