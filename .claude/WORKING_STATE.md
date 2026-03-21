# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-03-20
- **Focus:** Phase 3 — Live Draft Mode (Auction Mode features)
- **Status:** FF-033 through FF-049 + FF-P01 through FF-P05 complete — Phase 3 DONE

## Last Completed
- FF-033: Manual pick entry — search player, select manager, enter price/round, submit
- FF-034: Remaining player pool — live-updated available players with position filter, search, strategy scores
- FF-035: Position scarcity tracker — tier-based breakdown per position with color-coded urgency
- FF-036: "Why?" explainability — expandable reasoning on every player with factors, confidence, summary
- FF-037: My roster panel — current picks grouped by position, strategy grade (A+ to F), needs summary
- FF-038: League overview — expandable manager rows with picks, budget, position needs
- FF-039: Manager tendencies — spending style detection, position focus, likely needs prediction
- FF-P01: Strategy swap — one-tap switching between strategies, instant recalculation
- FF-P02: Draft flow monitor — position runs, value anomalies, spending patterns, pool quality
- FF-P03: Proactive pivot alerts — auto-detect when conditions favor a different strategy
- FF-P04: Strategy impact preview — expandable "What changes?" showing top 3 target shifts, position priority changes, budget allocation changes
- FF-P05: Pivot history log — tracks all strategy changes with pick number, from/to, reason
- FF-040: Auction state machine — per-manager budget remaining, roster slots filled, picks made (already in draft state)
- FF-041: Per-pick LLM recommendation — API route + client helper for "top 3 targets now"
- FF-042: Max bid calculator — context-aware max bid with strategy alignment, position need, alternatives, budget allocation factors
- FF-043: Adaptive budget strategy — ahead/behind/on_track detection with suggestion text
- FF-044: Position urgency + budget warnings — "only N startable RBs left under $X" with severity levels

## New Files Created (This Session)
- `src/lib/draft/auction-advisor.ts` — Max bid calculator, budget strategy, position urgency warnings
- `src/lib/draft/recommend.ts` — Client-side helper for LLM recommendation endpoint
- `src/app/api/draft/recommend/route.ts` — Per-pick LLM recommendation API (Claude call)
- `src/components/draft/auction-advisor.tsx` — Auction advisor panel (budget status, urgency, AI targets)
- `src/lib/draft/snake-advisor.ts` — Snake position tracking, best available projection, trade suggestions
- `src/components/draft/snake-advisor.tsx` — Snake advisor panel (position info, projections, trade ideas, AI targets)

## Files Modified (This Session)
- `src/app/(app)/draft/live/client.tsx` — Added AuctionAdvisor + SnakeAdvisor imports and integration

## Next Up
- Phase 4: Polish
- FF-050: Dark mode (default) + light mode toggle
- FF-052: Loading states, error handling, empty states
- FF-053: Post-draft review
- FF-054: Export draft results
- FF-055: Minimize LLM latency

## Architecture Notes
- shadcn/ui v4 uses base-ui (not Radix) — no `asChild` prop on Button/TooltipTrigger
- `buttonVariants()` is client-only, can't be called in server components — use plain Tailwind classes for Links in server pages
- Dev mode (`DEV_MODE=true`) bypasses all Supabase auth, returns mock user
- Middleware redirects: root → /prep, auth routes → /prep (when authenticated)
- Dark mode is default (class="dark" on html element)
- Draft state is immutable — `applyPick()` returns new state, enables undo
- Session picks persist to Supabase via PATCH /api/draft/sessions/[id]
- Explainability engine uses `calculateScarcity()` shared between scarcity tracker and "Why?" reasoning
- Auction advisor uses analyzeBudgetStrategy() for pace tracking, getPositionUrgencyWarnings() for scarcity alerts
- LLM recommendations via /api/draft/recommend — sends top 15 available players + context, gets back 3 targets (~500 tokens)

## Notes
- gh CLI not installed — GitHub repo needs web UI or gh install
- Port 3003 to avoid conflicts
- Joe = ESPN / Auction / Full redraft
- Tyler = Yahoo / Snake / Keeper league
