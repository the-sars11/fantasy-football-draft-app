# Product North Star — FFIntelligence (Fantasy Football Draft Advisor)

**Last Updated:** 2026-04-14

This document is the canonical definition of what this product is, who it's for, and what "good" looks like. When in doubt about any product decision, refer here.

---

## Mission

**The easy button for fantasy football draft prep and live draft advising.** Smarter than a cheat sheet, less overwhelming than a full analytics platform.

The primary win: walking out of a draft knowing you extracted value at every pick — not just the ones you researched before the season. A real-time strategic advisor that watches the board as the draft unfolds, surfaces what you should do *right now* and *why*, and keeps its mouth shut when nothing has changed.

---

## Target Users

### Primary (v1 — current)
- **Joe Rasar** — ESPN, full-redraft auction, $200 budget, Nasties league.
- **Tyler Young** — Yahoo, snake draft, keeper league.

### Secondary (post-v1)
- Serious recreational commissioners running redraft or keeper leagues on any platform (ESPN, Yahoo, Sleeper).
- Leagues using non-standard scoring — superflex, TE-premium, reception bonuses, 40+/50-yard TD bonuses.

### Explicitly NOT targeted (for v1)
- **DFS players** — daily fantasy is a different value model entirely. Not this product.
- **Casual / first-time drafters** who want a simple positional rankings list. They don't need AI; they need a cheat sheet.
- **Enterprise sports analytics** — professional analysts, sportsbooks, licensed data consumers.
- **Platforms hosting multiple concurrent live drafts** — different problem shape (multi-tenancy, real-time sync at scale).

---

## What Good Looks Like

Success criteria for this product:

1. **≤3-second recommendations.** From the moment a pick is detected (via Google Sheets poll or manual entry) to the next recommendation appearing on screen: under 3 seconds.
2. **Format purity.** Zero auction metrics (bid values, budget allocation, $ remaining) in snake mode. Zero snake metrics (ADP, round targets, draft position) in auction mode. Every component that renders player value data checks `league.format` — no exceptions.
3. **Explainability on every call.** Every recommendation surfaces a "Why?" — at minimum one sentence citing the data behind it (source, ranking, trend, or strategy rationale). No black-box assertions.
4. **Proactive pivot detection.** When draft conditions favor a different strategy than the active one, the app flags it within 3 picks of the shift — without waiting for the user to ask.
5. **One-thumb live draft.** Full live draft mode must be usable with one thumb on a phone at the draft table. Mobile is not a Phase 4 concern — it is baked in from the start.

### Quality Bar
- **Accuracy:** LLM never invents stats. All recommendations cite real data from the normalized player cache. No hallucinated projections, ADP figures, or bid values.
- **Speed:** Recommendations stream to the screen; the first token appears within one second of a pick being committed.
- **Explainability:** Every recommendation object includes a `reasoning` field. The UI always surfaces it — even if collapsed by default.
- **Data freshness:** 24-hour cache TTL enforced per source. Stale data is surfaced visually — never silently served as current.

---

## Decision-Making Tiebreakers

When tradeoffs arise, prioritize in this order:

1. **Does it improve the live draft experience?** The live draft is the highest-pressure, highest-value moment. Features that help there beat features that only help in prep.
2. **Does it respect format purity?** Auction and snake are fundamentally different exercises. Any feature that bleeds one mode's vocabulary into the other fails — even if it seems "more complete."
3. **Does it explain why, or just assert?** An unexplained recommendation is a black box. Black boxes don't build trust. If a feature can't show its work, it's not ready.
4. **Is it usable on mobile at the draft table?** If it doesn't work at arm's length, one-handed, with ambient noise, it fails Joe's primary use case.
5. **Does it stay bounded to real data?** Claude analyzes what we give it — nothing more. Anything that requires the LLM to fill in missing data from training knowledge is a non-starter.
6. **Correctness over speed of development.** A wrong bid range read aloud at the draft table poisons the league. A slow-to-ship feature does not.

---

## Non-Goals

What this product explicitly does NOT do:

- **No auction running / auctioneer tools.** That's `fantasy_auction_auctioneer` (sister project). FFI is the drafter's advisor; the auctioneer app is the commissioner's tool.
- **No DFS optimization.** Daily fantasy scoring, ownership percentages, slate construction — entirely different domain.
- **No social / league features.** Trade messaging, league-wide feeds, smack talk tools. Not this product.
- **No real-time multi-user draft hosting.** Google Sheets polling is one-directional (read-only from the app). FFI observes a draft; it does not run one.
- **No paid projection sources.** The data pipeline aggregates free sources only (ESPN unofficial, Sleeper, FantasyPros ECR). No licensed data vendors in v1.
- **No native iOS / Android app.** Responsive PWA is the delivery vehicle. No Swift or Kotlin build to maintain.
- **No standalone player comparison / trade tool.** In-season trade analysis exists as a feature; a standalone "trade calculator" product is not the goal.

---

## Product Scope

### Complete (Phases 0–8)
- League setup (platform, format, size, scoring, keeper rules, roster slots).
- Multi-source data ingestion: ESPN (unofficial), Sleeper, FantasyPros ECR. Yahoo manual entry fallback (OAuth deferred).
- Multi-source normalization engine → consensus rankings + auction values per player.
- AI strategy generation (Claude proposes 4–6 named strategies), strategy editor, strategy comparison.
- Draft board: position breakdown, tier view, sortable/filterable, format-gated metrics.
- Player intelligence: BREAKOUT / SLEEPER / VALUE / BUST / AVOID tags; user TARGET / AVOID tags; NLP rule parser ("draft WRs early" → structured filter).
- Auction state machine + live recommendations (budget pacing, max bid, targets, urgency warnings).
- Snake state machine + live recommendations (positional scarcity, round value, pick projection).
- Strategy pivot detection — proactive alert when draft favors switching strategies.
- Post-draft review with grades (A+ to F) and tag accuracy report.
- In-season AI companion: start/sit, waiver wire (FAAB suggestions), trade analyzer, weekly matchup preview, injury tracker, weekly projections.
- Tactical Hologram design system, mobile-responsive shell (bottom nav on mobile, sidebar on desktop).
- Deployed to Vercel.

### Deferred / Partial
- **Yahoo OAuth adapter (FF-011)** — requires OAuth app registration with Yahoo. Manual entry fallback is in place.
- **Notification UI** — API and push infrastructure complete; bell icon + settings page not yet built.
- **2026 season projection data** — defaults and 2025 data in place; real 2026 projections available closer to draft season.
- **Additional source adapters** — Fantasy Footballers, Pro Football Reference, FantasyPros articles — DEFERRED.

### Planned (Phases 9–10)
- **Phase 9: REST API layer** — B2B / white-label endpoints, rate limiting, API key management, OpenAPI spec, Python + JS SDKs.
- **Phase 10: Commercialization** — Free / Pro / Team pricing tiers, Stripe billing, free trial, marketing landing page.

### Out of Scope (future phases, separate decisions)
- **Auto-sync with league platforms** — pulling live pick data directly from ESPN/Yahoo instead of Google Sheets.
- **Mobile app (native)** — separate product decision; not a v1 concern.
- **Cloud real-time sync** — current architecture is Supabase per-user; multi-device real-time sync is a separate phase.
- **Commissioner tools** — league management, trade veto, scoring admin. Not this product.

---

## Pricing

- **Free:** 1 league, 3 prep runs/season, manual pick entry only in live draft.
- **Pro — $29/year:** Unlimited leagues and runs, full AI analysis, live draft advisor (sheets polling), strategy system, player intel.
- **Team — $99/year:** Everything in Pro + multi-league in-season companion (start/sit, waivers, trades, matchup preview, injury alerts), full draft history.

Pricing structure is deferred to Phase 10 — not a current development concern. These tiers are directional, not locked.

---

## Key Constraints

- **Both formats must work perfectly.** Joe uses ESPN auction; Tyler uses Yahoo snake. If either breaks, the product has failed its only two current users.
- **Data sources are fragile.** ESPN unofficial API and FantasyPros scraping break every offseason. Each source adapter must fail gracefully with a clear user-facing message; stale data must never be silently served as fresh.
- **Claude API cost management.** Every LLM call streams and uses prompt caching for repeated league context. Per-pick calls target ≤500 tokens in, ≤200 tokens out. No unbounded prompts.
- **Vercel free tier.** Serverless functions have a 10-second timeout. No long-running jobs in API routes — polling, normalization, and LLM calls must complete within that window or be chunked.
- **Single developer (Joe).** No QA team, no dedicated ops. Operational complexity that requires ongoing monitoring is a non-starter for v1.
- **August 2026 Nasties draft.** This is the first production validation target. Whatever isn't ready by then gets deferred.

---

## Ongoing Maintenance

After Phase 8 (current):
- **Annual player data refresh** pre-season (late July / early August) — new rookies, retirements, team changes, bye week updates, scoring rule changes.
- **Source adapter audit** each offseason — ESPN unofficial and FantasyPros change their response shapes regularly. Run the full adapter suite against live data before each draft season.
- **Pre-draft bug hunt** — `/bug-hunt full` scheduled the week before draft day each season.
- **LLM prompt review** when major Claude model upgrades ship — analysis prompts in `src/lib/research/analyze.ts` and recommendation prompts in `src/lib/draft/recommend.ts` may need updating.
- **Regression test** each season: "Configure league → run prep → draft board ready" must complete in under 5 minutes. "Live pick detected → recommendation on screen" must complete in under 3 seconds.
- **Notification UI** — targeted for completion before the 2026 in-season companion goes live.

---

## Related Documents

- **BUILD_PLAN.md** — prioritized phase queue, task tracking (FF-001 to FF-200+), milestone gates.
- **ARCHITECTURE.md** — system structure, data-flow diagrams, LLM integration pattern, auth flow.
- **DESIGN_SYSTEM.md** — Tactical Hologram visual language (tokens, components, animation patterns).
- **WORKING_STATE.md** — current session state, active blockers, next priorities.
- **CLAUDE.md** — operating manual for the AI assistant (session protocol, code standards, commit discipline).
