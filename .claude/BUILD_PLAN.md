# Fantasy Football Draft Advisor — Build Plan

Task tracking: `[ ]` = not started, `[~]` = in progress, `[x]` = complete

---

## Git Discipline

**MANDATORY: Commit and push after completing each phase/sprint.**

After completing a phase or sprint section:
1. `git add` all changed files
2. `git commit -m "feat(scope): Description of changes"` with Co-Authored-By
3. `git push origin master`
4. Verify push succeeded before moving to next phase

Commit message format:
```
feat(intel): Add Phase X - Feature Name (FF-XXX to FF-XXX)

- Bullet point summary of changes
- Another change

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Phase 0: Foundation (Session 1)

### Project Scaffolding
- [x] FF-001: Next.js project scaffolding (create-next-app, TypeScript, Tailwind, App Router)
- [x] FF-002: Install core deps (Supabase, Anthropic SDK, shadcn/ui, googleapis)
- [x] FF-003: shadcn/ui init + base components (button, card, dialog, table, tabs, input, select, badge)
- [x] FF-004: Supabase project setup + environment variables
- [x] FF-005: Auth flow (sign-up, sign-in, password reset) — Supabase Auth
- [x] FF-006: App shell + navigation (sidebar: Prep, Draft, Settings)
- [x] FF-007: DB migration: `users`, `leagues`, `research_runs`, `draft_sessions`, `players_cache`
- [x] FF-008: League configuration page (league name, platform, format, size, budget, roster slots, scoring format, keeper settings)
- [x] FF-008b: Mobile-first app shell refactor — bottom tab bar on mobile, sidebar on desktop, responsive layout throughout

---

## Phase 1: Data Ingestion (Session 2)

### Player Data Model
- [x] FF-009: Player data model + TypeScript types (name, team, position, bye, ADP, auction values by source, projections, injury status)

### Data Source Adapters
- [x] FF-010: ESPN unofficial API adapter — rankings, projections, auction values, ADP
- [ ] FF-011: Yahoo Fantasy API adapter — rankings, projections, auction values, ADP (OAuth flow) — DEFERRED (requires OAuth app registration)
- [x] FF-012: Sleeper API adapter — ADP, projections, player metadata, trending players
- [x] FF-013: FantasyPros scraper — ECR (Expert Consensus Rankings), tiers, auction values

### Data Pipeline
- [x] FF-014: Multi-source normalization engine — merge 3+ sources into consensus rankings + auction values per player
- [x] FF-015: Player cache layer (Supabase) — store normalized data, track freshness per source, auto-expire after 24h
- [x] FF-016: Data freshness UI indicator — show when each source was last pulled, manual refresh button

---

## Phase 2: Strategy System + Draft Prep (Sessions 3-4)

### Strategy Data Model
- [x] FF-S01: `strategies` DB table + TypeScript types — named strategy profiles with base archetype, position weights, player filters, budget allocation
- [x] FF-S02: Strategy filter schema — player targets (+weight), player avoids (-weight/exclude), team avoids, position emphasis overrides, budget allocation shifts (auction) / round targets (snake)

### AI-Proposed Strategies
- [x] FF-S03: Strategy research engine — Claude analyzes league settings + player data to propose 4-6 named strategies (e.g. WR-Heavy, Zero-RB, Hero-RB, Balanced, Stars & Scrubs, Late-Round QB) with data-backed reasoning
- [x] FF-S04: Strategy proposal UI — present AI-generated strategies as cards with: name, philosophy, key targets, position allocation, risk profile, projected ceiling/floor, "why this works in your league" reasoning
- [x] FF-S05: Strategy comparison view — side-by-side comparison of 2-3 strategies showing position allocation, key player differences, risk/reward tradeoffs

### Interactive Strategy Tailoring
- [x] FF-S06: Strategy editor UI — modify any base strategy with interactive filters: target specific players (weight slider), avoid players/teams (toggle + severity), adjust position emphasis (sliders), shift budget allocation (auction) / round priority (snake)
- [x] FF-S07: Real-time value preview — as user adjusts filters, show how auction values / draft rankings shift for key players (top 5 changes highlighted)
- [x] FF-S08: Save strategy profiles — save base strategy as-is, or save tailored version as named profile. Multiple profiles per league. Mark one as "active"

### Research Pipeline
- [x] FF-017: Research pipeline orchestrator (configure → ingest → normalize → analyze through active strategy → output)

### LLM Analysis Prompts (Strategy-Aware)
- [x] FF-019: Positional rankings — Claude analyzes consensus data through lens of active strategy + league settings
- [x] FF-020: Auction value adjustments (auction) / Round value mapping (snake) — floor/ceiling/target per player, weighted by strategy filters
- [x] FF-021: Target list (best value plays given active strategy) + Avoid list (overpriced/risky/filtered out) with reasoning
- [x] FF-022: Tier analysis — where value drops off by position, tier breaks, strategy-adjusted
- [x] FF-023: Sleeper picks — undervalued based on trend data + expert disagreement + strategy alignment

### Draft Board UI
- [x] FF-024: Draft board view — sortable/filterable table (by position, tier, value, target/avoid, auction range or round). Active strategy badge shown. Strategy-adjusted values highlighted
- [x] FF-025: Position breakdown view — top players by position with tier coloring + value indicators + strategy alignment score

### Run Management
- [x] FF-026: Run save to Supabase (full snapshot: league config, active strategy profile, all analysis results, timestamp)
- [x] FF-027: Run history page — list saved runs, load any run, compare side-by-side (including strategy differences)
- [x] FF-028: "Refresh" action — re-pull all data sources, re-run LLM analysis with same strategy, save as new run

### Keeper Support
- [x] FF-029: Keeper integration — mark kept players + their costs/rounds, remove from pool, adjust remaining values

---

## Phase 3: Live Draft Mode (Sessions 5-6)

### Shared Infrastructure (Both Formats)
- [x] FF-030: Draft setup page — select league, choose active strategy profile, enter manager names, import keeper assignments
- [x] FF-031: Google Sheets API integration — connect to draft sheet, configure column mapping
- [x] FF-032: Sheet polling engine — check for new rows every 5-10 seconds, detect new picks, trigger state update
- [x] FF-033: Manual pick entry fallback — quick-entry UI (search player → enter pick details → assign to manager)
- [x] FF-034: Remaining player pool — live-updated list showing available players with strategy-adjusted values/rankings
- [x] FF-035: Position scarcity tracker — count remaining startable players per position per tier
- [x] FF-036: "Why?" explainability — expandable reasoning on every recommendation (cites data, scarcity, tendencies, active strategy)
- [x] FF-037: Your roster panel — show current picks, position needs, grade vs. strategy plan
- [x] FF-038: League overview panel — all managers' rosters at a glance
- [x] FF-039: Manager tendency tracker — track each manager's patterns (positions targeted, spending/pick behavior)

### Mid-Draft Strategy Pivot System
- [x] FF-P01: Strategy swap UI — one-tap to switch active strategy profile during live draft. All values/targets/recommendations recalculate instantly
- [x] FF-P02: Draft flow monitor — continuous analysis of draft state: track position runs, value anomalies, spending patterns, remaining player pool quality by position
- [x] FF-P03: Proactive pivot alerts — app detects when draft conditions favor a different strategy than active one. Alert: "Draft favors pivot to [strategy] — [reasoning]. [3 key opportunities]." Accept (swaps strategy) / Dismiss / Snooze (remind in N picks)
- [x] FF-P04: Strategy impact preview — before accepting a pivot, show: "Switching to [strategy] changes your top 3 targets to X, Y, Z and adjusts budget allocation to [new split]"
- [x] FF-P05: Pivot history log — track all strategy changes during draft with timestamp, reason, and what the app recommended vs. what user chose

### Auction Mode (Joe / ESPN)
- [x] FF-040: Auction state machine — per-manager budget remaining, roster slots filled, picks made
- [x] FF-041: Per-pick LLM recommendation — "top 3 targets now" with strategy-adjusted auction values
- [x] FF-042: Max bid calculator — "bid up to $X" based on remaining budget, needs, alternatives, active strategy
- [x] FF-043: Adaptive budget strategy — detect ahead/behind spending plan, suggest pivots with specific strategy profile recommendations
- [x] FF-044: Position urgency + budget warnings — "only 3 startable RBs left under $25" contextualized by active strategy

### Snake Mode (Tyler / Yahoo)
- [x] FF-045: Snake state machine — track draft order, current round, picks per round, compensatory picks
- [x] FF-046: "Best available at your next pick" — project who'll be available X picks away based on other managers' needs + active strategy
- [x] FF-047: Pick-by-pick LLM recommendation — at your pick: ranked by position need + value over replacement + strategy alignment
- [x] FF-048: Keeper round-cost tracking — show where keepers slot in, flag keeper value vs. ADP
- [x] FF-049: Trade-up/down suggestions — "if you trade up 2 spots, you can grab X before manager Y"

---

## Phase 4: Polish (Session 7)

### UI/UX
- [x] FF-050: Dark mode (default) + light mode toggle
- [x] FF-052: Loading states, error handling, empty states throughout

### Post-Draft
- [x] FF-053: Post-draft review — grade your draft vs. active strategy targets, show deviations + why, compare to original strategy vs. any mid-draft pivots
- [x] FF-054: Export draft results (CSV, shareable link)

### Performance
- [x] FF-055: Minimize LLM latency during live draft (streaming responses, state deltas only, strategy swap = incremental recalc not full re-run)

---

## Phase 5: Scoring Intelligence + Infrastructure (Sprint 8)

### Custom Scoring Integration
- [x] FF-067: Supabase migration — add `scoring_settings` jsonb column to `leagues` table
- [x] FF-068: Scoring-aware LLM analysis — feed custom scoring settings into all analysis prompts (bonus scoring changes player valuations: 40+/50+ yd TD bonuses boost deep-threat WRs & rushing QBs, yardage bonuses boost bellcow RBs, etc.)
- [ ] FF-069: Tyler's league setup — enter his exact scoring settings + keeper rules/costs when provided

### Deploy + Validate
- [x] FF-070: Deploy to Vercel (free tier) — https://fantasyfootballdraftapp-lac.vercel.app
- [x] FF-071: End-to-end test with real Nasties league data — full prep cycle, verify output quality (PASS — ranking data shows defaults as expected since 2025 season data not published yet)
- [ ] FF-072: Live draft dry run — mock Google Sheet, run through full live draft flow

---

## Phase 6: FFIntelligence UI Redesign (Sprints 9-11)

> **Design spec:** `UI/DESIGN_SPEC.md` — all decisions locked in after Q&A session (2026-03-22)
> **App name:** FFIntelligence (FFI)
> **Icons:** `static/icons/` — favicon and app icons ready

### Sprint 9: Design System Foundation
- [x] FF-060: Design system tokens — color palette (`#01040a` background, `#39ff14` accent lime, `#5582e6` primary blue), surface hierarchy (no-line rule — tonal shifts not borders), glassmorphism utilities (backdrop-blur, ghost borders), ambient shadows
- [x] FF-061: Typography overhaul — Inter for display/body (400-800 weights), Oswald for accent headlines, editorial scale contrasts, all-caps label treatment for metadata
- [x] FF-062: Component primitives reskin — buttons (lime pill primary, glass secondary), cards (tonal layering, no 1px borders), input fields (recessed surface, glow focus states), badges (position tags), progress bars (smooth gradient style)

### Sprint 10: Screen Redesigns
- [x] FF-063: App shell + nav redesign — FFIntelligence header/logo (use icon elements), bottom nav with glow active state, profile avatar
- [x] FF-064: Prep Hub redesign — hub cards with icons + subtitles, "Optimize Your Edge" AI recommendation card, atmospheric layout
- [x] FF-065: Draft Board redesign — COMPACT player cards (tight spacing), position badges + auction values, expandable Tactical Insight with confidence %, "RECOMMENDED"/"BEST AVAILABLE" tags
- [x] FF-066: Live Draft room redesign — real-time feed, strategy picker dropdown, My Squad quick panel, inline AI recommendation cards

### Sprint 10.5: Premium Navigation & Transitions ✅
> **Goal:** Buttery-smooth, app-store-quality navigation that feels native and premium

#### Page Transition System
- [x] FF-082: Install Framer Motion + configure AnimatePresence wrapper in root layout
- [x] FF-083: Page transition orchestrator — detect navigation direction (forward/back), apply directional slide animations
- [x] FF-084: Slide transitions by context:
  - Prep Hub → Board/Strategies/Runs: slide LEFT (drilling in)
  - Board/Strategies/Runs → Prep Hub: slide RIGHT (backing out)
  - Draft Setup → Live Draft: slide UP (entering immersive mode)
  - Live Draft → anywhere: slide DOWN (exiting immersive mode)
  - Settings: crossfade (modal-like feel)
- [x] FF-085: Shared element transitions — player cards morph between Draft Board and Live Draft, strategy cards persist during navigation

#### Swipe Navigation (Mobile)
- [x] FF-086: Horizontal swipe gesture handler — detect left/right swipes on main content area
- [x] FF-087: Swipe carousel for main sections:
  - Prep Hub ↔ Draft Hub ↔ Settings (3-screen carousel)
  - Visual indicator dots at bottom showing current position
  - Swipe feels like turning a page, subtle parallax on background
- [x] FF-088: Edge swipe to go back (iOS-style) — swipe from left edge triggers back navigation with live preview
- [x] FF-089: Swipe resistance at edges — rubber-band effect when at first/last screen

#### Micro-Transitions
- [x] FF-090: Bottom nav transitions:
  - Active icon scales up slightly + glow pulse on tap
  - Inactive icons fade/shrink subtly
  - Dot indicator slides smoothly between tabs
- [x] FF-091: Card interactions:
  - Cards lift on hover/press (translateY + shadow)
  - Expand/collapse with spring physics (no linear ease)
  - Stagger animation when list loads (cards cascade in)
- [x] FF-092: AI recommendation cards:
  - Slide in from right with attention-grabbing glow pulse
  - Dismiss swipes left with rotation
  - Accept pulses green and fades up

#### Screen-Specific Polish
- [x] FF-093: Live Draft feed animations:
  - New picks slide in from top with subtle bounce
  - Old picks compress/fade simultaneously
  - "Your pick" has special celebration micro-animation
- [x] FF-094: Draft Board player reveal:
  - Initial load: cards cascade in with stagger
  - Filter change: smooth reorder animation (layout transition)
  - Sort change: cards smoothly rearrange position

### Sprint 10.7: HTML Prototype → React Port
> **Source files:** UI/draft_board/code.html, UI/Fantasy_Football - Prep Hub 1/code.html, UI/Post Draft Analysis Screen/code.html
> **Goal:** Convert HTML prototypes to React components using exact Tailwind classes

#### Foundation
- [x] FF-095: Create `.claude/DESIGN_SYSTEM.md` — locked reference derived from UI/draft_board/DESIGN.md ("Tactical Hologram" philosophy)
- [x] FF-096: Update globals.css — add color tokens from HTML prototypes (surface-container-*, secondary #2ff801, primary #8bacff, font families)

#### Draft Board Port (UI/draft_board/code.html → React)
- [x] FF-097: Create FFIPlayerCard component — port glass-panel player card (numbered rank, badges, auction value, expand chevron)
- [x] FF-098: Create FFIAIInsight component — port expandable AI insight section (confidence bar, "FULL ANALYTICS" button)
- [x] FF-099: Port player-pool.tsx — replace Table with FFIPlayerCard list, glass-panel cards, position filter buttons with glow
- [x] FF-100: Port position filter tabs — active: bg-secondary with neon glow, inactive: bg-surface-container-high

#### Prep Hub Port (UI/Fantasy_Football - Prep Hub 1/code.html → React)
- [x] FF-101: Port prep hub page — gradient background with light streaks, hub action cards, "Optimize Your Edge" AI card

#### Post-Draft Analysis Port (UI/Post Draft Analysis Screen/code.html → React)
- [x] FF-102: Port post-draft review page — grade hero (B+), Positional Power Rankings, pick-by-pick timeline with STEAL/REACH/PIVOT badges

#### Navigation Port
- [x] FF-103: Port bottom navigation — glass backdrop blur, active state glow, rounded top, safe area padding

#### Verification
- [x] FF-104: Visual comparison audit — prototypes side-by-side with running app (95%+ match, intentional diffs documented)
- [x] FF-105: Class audit — grep for generic shadcn classes (53 files still have bg-muted/text-muted-foreground/border-border, 3 files use <Table>)

---

### Sprint 11: Advanced Views + New Features
- [x] FF-073: Remaining Needs + Positional Scarcity redesign — smooth gradient bars, spend range indicators, critical/stable/elite status labels
- [x] FF-074: Post-Draft Analysis redesign — letter grade hero with glow, story-driven pick-by-pick breakdown with contextual narratives, color-coded grades (STEAL/REACH/AI PIVOT), segmented progress bars for Positional Power Rankings
- [x] FF-075: Per-team exportable reports — generate analysis for EVERY team in league, email-able format, contextual callouts ("Reggie took the last WR1 which forced you to overbid")
- [x] FF-076: Trash Talk system — live alerts during draft (overpay, roster imbalance, bye week disasters), post-draft "How Everyone Screwed Up" roast report
- [x] FF-077: Mobile polish pass — bottom nav feel, touch targets (44px min), responsive layouts across all redesigned screens
- [x] FF-078: Animation + micro-interactions — card expand/collapse, neon glow transitions, draft pick entry animations, trash talk alert shake

---

## Phase 7: Pre-Season (Sprint 12)

### Final Prep
- [ ] FF-079: Yahoo OAuth adapter (FF-011 deferred) — if Tyler wants auto-pull from Yahoo
- [ ] FF-080: Full pre-draft data pull with 2025 season data — verify all sources working
- [ ] FF-081: Draft day checklist — confirm Google Sheet template, test sheet polling, verify mobile experience on both phones

---

## Phase 7.5: Player Intelligence System (Sprint 13)

> **Goal:** Add intelligent player tagging, multi-source sentiment analysis, and user-customizable targeting
> **Design doc:** `C:\Users\jrasa\.claude\plans\abundant-rolling-oasis.md`
> **Timeline:** Now through August 2026 drafts

### Foundation (FF-201 to FF-210)
- [x] FF-201: Create `player_intel` table migration — sentiment data, system tags, source freshness
- [x] FF-202: Create `user_tags` table migration — user tags, notes, dismissed system tags
- [x] FF-203: Create `user_rules` table migration — natural language LLM-parsed rules
- [x] FF-204: Create `source_registry` table migration — source config, freshness, 2026 availability
- [x] FF-205: TypeScript types for new tables — PlayerIntel, UserTags, UserRule, SourceRegistry
- [x] FF-206: Source adapter interface — SourceAdapter with 2026 validation methods
- [x] FF-207: 2026 season validation utilities — validate content is current season
- [x] FF-208: Freshness tier configuration — TTL per data type, off-season behavior
- [x] FF-209: Differential fetch algorithm — only refresh stale sources
- [x] FF-210: Seed source_registry with existing sources (FP, ESPN, Sleeper)
- [x] **GIT CHECKPOINT**: Committed & pushed (325206b)

### Tag Detection (FF-211 to FF-218)
- [x] FF-211: Tag detection algorithm core — BREAKOUT, SLEEPER, VALUE, BUST, AVOID
- [x] FF-212: Sentiment aggregation logic — merge mentions from multiple sources
- [x] FF-213: BREAKOUT detection — 3+ sources mention "breakout" or "emerging"
- [x] FF-214: SLEEPER detection — 2+ sources identify as undervalued OR ECR std dev > 20
- [x] FF-215: BUST detection — 3+ sources express concern
- [x] FF-216: VALUE/AVOID detection — ADP vs projection rank gap analysis
- [x] FF-217: Intel service orchestration — compute and store intel per player
- [x] FF-218: Integration with normalize pipeline — attach intel to ConsensusPlayer
- [x] **GIT CHECKPOINT**: Committed & pushed (325206b)

### New Sources (FF-219 to FF-224) — DEFERRED
- [ ] FF-219: Fantasy Footballers adapter — scrape free rankings page
- [ ] FF-220: FantasyPros Articles adapter — scrape sentiment from public articles
- [ ] FF-221: Pro Football Reference historical adapter — for projection trends
- [ ] FF-222: Update normalize.ts for new sources — weighted consensus
- [ ] FF-223: Source weight configuration UI — adjust weights per source
- [ ] FF-224: Data quality validation tests — verify 2026 detection works

### User Tags & Rules (FF-225 to FF-234)
- [x] FF-225: User tag CRUD API routes
- [x] FF-226: User tag React hooks
- [x] FF-227: **TARGET tag special handling** — prominent display, +25 score boost
- [x] FF-228: LLM rule parser prompt + service — natural language to structured rule
- [x] FF-229: User rule CRUD API routes
- [x] FF-230: Rule application in scoring engine — stack modifiers
- [x] FF-231: User rules management UI
- [x] FF-232: Rule validation + error handling
- [x] FF-233: Rule application preview — show affected players
- [x] FF-234: Tag hierarchy display logic — TARGET overrides compact view
- [x] **GIT CHECKPOINT**: Committed & pushed (c88c68f)

### Player Browser UI (FF-235 to FF-244)
- [x] FF-235: Player Browser page scaffold (`/prep/players`)
- [x] FF-236: FFIPlayerIntelCard component — compact + expanded views
- [x] FF-237: System tag badge styling (per DESIGN_SYSTEM.md)
- [x] FF-238: **TARGET badge styling** — lime, prominent, always visible when set
- [x] FF-239: User tag inline editor — quick-add TARGET button
- [x] FF-240: Sentiment snippet display in expanded view
- [x] FF-241: Tag filter panel — system tags, user tags, ADP range
- [x] FF-242: ADP range slider filter
- [~] FF-243: Confirm/dismiss system tag actions (UI ready, needs API)
- [x] FF-244: Add to Prep Hub navigation
- [x] **GIT CHECKPOINT**: Committed & pushed (8f15302)

### Integration & Polish (FF-245 to FF-252)
- [x] FF-245: Research pipeline intel integration — load and apply tags
- [x] FF-246: Draft board tag display — TARGET prominent with tag controls
- [x] FF-247: Live draft tag-aware recommendations
- [x] FF-248: Post-draft tag accuracy analysis — hit rate, avoid rate, visual breakdown
- [x] FF-249: Mobile responsiveness — improved filters, ADP sliders, scrollable pills
- [x] FF-250: Performance optimization — paginated list with "Load More"
- [x] FF-251: End-to-end testing — build, type-check, tests all pass
- [x] FF-252: Documentation update
- [x] **GIT CHECKPOINT**: Phase 7.5 complete

---

## Phase 8: In-Season AI Companion (Post-Draft → Week 17)

> **Goal:** Transform FFI from a 1x/year draft tool to a 17+ week season-long companion
> **Value:** Increases LTV from $20-40 to $50-100/year, dramatically improves retention

### Data Infrastructure
- [x] FF-110: Weekly projections ingestion — pull fresh projections from ESPN, Sleeper, FantasyPros every Tuesday
- [x] FF-111: Injury/status tracker — monitor player status changes (Q/D/O/IR), update projections accordingly
- [x] FF-112: Matchup data — defensive rankings vs. position, weather data, Vegas lines for game script
- [x] FF-113: Waiver wire trending — track add/drop velocity from Sleeper + ESPN
- [x] **GIT CHECKPOINT**: Committed & pushed (8ee080f)

### Start/Sit Advisor
- [x] FF-114: Roster sync — connect to user's ESPN/Yahoo/Sleeper league, pull current roster weekly
- [x] FF-115: Multi-source aggregation — pull start/sit rankings from 5+ expert sources
- [x] FF-116: Confidence scoring — weight experts by historical accuracy, surface consensus vs. contrarian takes
- [x] FF-117: AI contextualization — "Start X over Y because [matchup + recent performance + expert consensus]"
- [x] FF-118: Start/Sit UI — side-by-side comparison, confidence bars, expandable reasoning
- [x] **GIT CHECKPOINT**: Committed & pushed (a6991e8)

### Waiver Wire AI
- [x] FF-119: Available player scanner — identify top pickups based on ownership %, trend velocity, upcoming schedule
- [x] FF-120: Roster fit analysis — "Player X fills your RB2 hole and has a favorable playoff schedule"
- [x] FF-121: FAAB bid recommendations — "Bid $X (Y% of remaining budget) — here's why"
- [x] FF-122: Priority ranking — ordered list of pickups with confidence + reasoning
- [x] FF-123: Waiver Wire UI — prioritized list, bid suggestions, one-tap add to watchlist
- [x] **GIT CHECKPOINT**: Committed & pushed (a6991e8)

### Trade Analyzer
- [ ] FF-124: Trade calculator engine — Rest-of-Season (ROS) value per player, adjusted for YOUR league scoring
- [ ] FF-125: Roster impact analysis — "This trade improves your ROS ceiling by X% and shores up your WR2 slot"
- [ ] FF-126: Fair trade finder — "To get [player], offer [these combinations]"
- [ ] FF-127: Trade veto predictor — flag lopsided trades before you embarrass yourself
- [ ] FF-128: Trade UI — enter trade, see instant analysis, share link with trade partner

### Weekly Matchup Preview
- [ ] FF-129: Head-to-head projections — your team vs. opponent, position-by-position breakdown
- [ ] FF-130: Leverage plays — "You're projected to lose by 6 — here's how to swing it"
- [ ] FF-131: Ceiling/floor analysis — identify high-variance plays for chasing vs. protecting leads
- [ ] FF-132: Matchup UI — visual comparison, key battles highlighted

### Notifications & Alerts
- [ ] FF-133: Push notification system — set up for mobile (web push + PWA)
- [ ] FF-134: Injury alerts — "Your starter [X] is now Questionable — here are backup options"
- [ ] FF-135: Waiver processing alerts — "Waiver results are in — you got [X], missed [Y]"
- [ ] FF-136: Weekly prep reminder — "Your Week N lineup is unset — review now"

---

## Phase 9: API Layer for B2B / White-Label (Platform Play)

> **Goal:** Package the AI engine as an API that other fantasy apps can license
> **Value:** One B2B deal could be worth 10,000+ individual users
> **Target partners:** Sleeper, Underdog, Fantrax, PrizePicks, sports media (Bleacher Report, The Ringer)

### API Architecture
- [ ] FF-140: API route structure — `/api/v1/analyze-roster`, `/api/v1/recommend-waiver`, `/api/v1/evaluate-trade`, `/api/v1/start-sit`
- [ ] FF-141: Request/response schemas — JSON schemas for all endpoints, versioned
- [ ] FF-142: Rate limiting — per-API-key limits, tiered by plan
- [ ] FF-143: API key management — generate keys, track usage, revoke access
- [ ] FF-144: Authentication layer — API keys for B2B, optional OAuth for user-context calls

### Developer Experience
- [ ] FF-145: API documentation site — OpenAPI spec, interactive playground, code examples (Python, JS, cURL)
- [ ] FF-146: SDKs — lightweight wrappers for Python and JavaScript
- [ ] FF-147: Sandbox environment — test API with mock data, no rate limits
- [ ] FF-148: Webhook support — push notifications for events (injury alerts, waiver results)

### Usage Tracking & Billing
- [ ] FF-149: Usage metering — track API calls per key, per endpoint, per day
- [ ] FF-150: Usage dashboard — partners can see their consumption, billing projections
- [ ] FF-151: Billing integration — Stripe for invoicing, usage-based or flat-rate plans

### B2B Sales Assets
- [ ] FF-152: Partner pitch deck — slides showing AI capabilities, integration ease, case studies
- [ ] FF-153: Demo environment — partner can try the API with their own data
- [ ] FF-154: Integration guide — step-by-step for partners to embed FFI recommendations

---

## Phase 10: Commercialization (Free → Premium)

> **Goal:** Convert users to paid plans without killing the free experience
> **Pricing hypothesis:** Free (draft basics) → Pro $29/year (full AI) → Team $99/year (in-season)

### Pricing & Tiers
- [ ] FF-160: Define tier boundaries:
  - **Free:** League setup, basic draft board, manual pick entry
  - **Pro ($29/year):** AI strategy generation, live draft recommendations, post-draft analysis
  - **Team ($99/year):** Everything + in-season features (start/sit, waiver, trades, alerts)
- [ ] FF-161: Feature gating — implement tier checks throughout app, graceful upgrade prompts
- [ ] FF-162: Usage limits for free tier — e.g., 1 league, no real-time sync, limited AI calls/day

### Payment Integration
- [ ] FF-163: Stripe integration — subscription billing, annual plans
- [ ] FF-164: Checkout flow — in-app upgrade, card entry, confirmation
- [ ] FF-165: Subscription management — cancel, pause, change plan, billing history
- [ ] FF-166: Trial experience — 7-day Pro trial for new users

### Landing Page & Marketing Site
- [ ] FF-167: Marketing landing page — hero section, feature highlights, pricing table, testimonials placeholder
- [ ] FF-168: SEO foundations — meta tags, sitemap, structured data for "fantasy football AI"
- [ ] FF-169: Blog / content section — for SEO + thought leadership
- [ ] FF-170: Email capture — "Get notified when 2026 season starts" + newsletter signup

### Analytics & Instrumentation
- [ ] FF-171: Event tracking — PostHog or Mixpanel for user behavior
- [ ] FF-172: Conversion funnel — track free → trial → paid flow
- [ ] FF-173: Retention metrics — DAU/WAU during season, churn tracking
- [ ] FF-174: A/B testing framework — for pricing, CTA copy, feature positioning

---

## Phase 11: Marketing & Outreach

> **Goal:** Get users and partners through content, community, and direct outreach
> **Timeline:** Start content 2-3 months before draft season (June), ramp outreach in July-August

### Content Marketing
- [ ] FF-180: Blog content calendar — 2 posts/week during pre-draft (June-August):
  - "AI Draft Strategies for 2026"
  - "Zero-RB vs. Hero-RB: Data Analysis"
  - "How FFIntelligence Outperformed FantasyPros in Our League"
  - Position breakdowns, sleeper picks, etc.
- [ ] FF-181: YouTube/video content — optional, but high-impact if done
- [ ] FF-182: Twitter/X presence — daily insights during season, engage fantasy community
- [ ] FF-183: Reddit strategy — helpful answers in r/fantasyfootball, r/ff_dynasty (no spam)

### Email Marketing
- [ ] FF-184: Email sequences:
  - **Welcome sequence:** Onboarding, feature highlights, first draft walkthrough
  - **Pre-draft sequence:** Strategy tips, data updates, "draft is coming" urgency
  - **In-season sequence:** Weekly tips, waiver recommendations, engagement hooks
  - **Upgrade sequence:** Free → trial → paid nudges with value props
- [ ] FF-185: Email templates — designed, mobile-friendly, on-brand
- [ ] FF-186: Email platform setup — Resend, Loops, or similar (not Mailchimp)
- [ ] FF-187: Segmentation — by tier, by league type (auction vs. snake), by engagement level

### B2B Outreach
- [ ] FF-188: Target list — build list of 20-30 potential partners:
  - **Tier 1 (dream):** Sleeper, ESPN, Yahoo
  - **Tier 2 (likely):** Underdog, PrizePicks, Fantrax, Fleaflicker
  - **Tier 3 (media):** Bleacher Report, The Ringer, Fantasy Footballers podcast
- [ ] FF-189: Contact research — find product leads, partnership managers on LinkedIn
- [ ] FF-190: Outreach sequence:
  - Cold email (personalized, <100 words, clear ask)
  - Follow-up 1 (3 days): Add value, share insight
  - Follow-up 2 (7 days): Demo offer
  - LinkedIn connect + message in parallel
- [ ] FF-191: Demo script — 15-minute walkthrough of API + partner integration
- [ ] FF-192: Partnership proposal template — pricing, integration scope, success metrics

### Community & Virality
- [ ] FF-193: Referral program — "Get 1 month free for each friend who signs up"
- [ ] FF-194: League commissioner tools — bulk invite, league-wide pricing, admin dashboard
- [ ] FF-195: Shareable draft results — social cards for Twitter/X showing draft grade
- [ ] FF-196: Fantasy community partnerships — sponsor podcasts, guest on shows

### Launch Campaign
- [ ] FF-197: Product Hunt launch — prep listing, screenshots, launch day coordination
- [ ] FF-198: Press outreach — pitch to fantasy sports blogs, tech blogs covering AI
- [ ] FF-199: Influencer seeding — send free Pro access to fantasy content creators
- [ ] FF-200: Launch email blast — to waitlist, existing users, partners

---

## Milestone Summary

| Milestone | Target | Status |
|-----------|--------|--------|
| **Personal Use MVP** | Draft Day 2025 | ✅ Complete |
| **UI Redesign** | March 2026 | ✅ Complete |
| **Player Intelligence Foundation** | March 2026 | 🔄 In Progress (Phase 5 UI complete) |
| **Player Intelligence Full** | June 2026 | Planned |
| **Live Draft Validation** | August 2026 | Pending |
| **In-Season Features** | Sept 2026 | Planned |
| **API Layer** | Oct 2026 | Planned |
| **Commercialization** | Nov 2026 | Planned |
| **Marketing Launch** | June 2027 (pre-draft) | Planned |
| **First B2B Partner** | Q4 2027 | Goal |
