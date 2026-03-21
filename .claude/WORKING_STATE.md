# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-03-20
- **Focus:** Phase 3 — Live Draft Mode (FF-033 through FF-036)
- **Status:** FF-033 through FF-036 complete, live draft page functional

## Last Completed
- FF-033: Manual pick entry — search player, select manager, enter price/round, submit
- FF-034: Remaining player pool — live-updated available players with position filter, search, strategy scores
- FF-035: Position scarcity tracker — tier-based breakdown per position with color-coded urgency
- FF-036: "Why?" explainability — expandable reasoning on every player with factors, confidence, summary

## New Files Created
- `src/hooks/use-draft-state.ts` — Full draft state hook (combines sheet polling + manual picks + persistence)
- `src/lib/draft/explain.ts` — Explainability engine (scarcity, value, strategy fit, roster needs)
- `src/app/api/draft/sessions/[id]/route.ts` — GET/PATCH for individual draft sessions
- `src/components/draft/manual-pick-entry.tsx` — Player search + pick entry form
- `src/components/draft/player-pool.tsx` — Available players table with position/search filters
- `src/components/draft/position-scarcity.tsx` — Visual scarcity cards per position
- `src/components/draft/why-explainer.tsx` — Structured reasoning display component
- `src/app/(app)/draft/live/page.tsx` — Live draft server page
- `src/app/(app)/draft/live/client.tsx` — Live draft client dashboard (two-column layout)

## Next Up
- FF-037: Your roster panel — show current picks, position needs, grade vs. strategy plan
- FF-038: League overview panel — all managers' rosters at a glance
- FF-039: Manager tendency tracker — track each manager's patterns

## Architecture Notes
- shadcn/ui v4 uses base-ui (not Radix) — no `asChild` prop on Button/TooltipTrigger
- `buttonVariants()` is client-only, can't be called in server components — use plain Tailwind classes for Links in server pages
- Dev mode (`DEV_MODE=true`) bypasses all Supabase auth, returns mock user
- Middleware redirects: root → /prep, auth routes → /prep (when authenticated)
- Dark mode is default (class="dark" on html element)
- Draft state is immutable — `applyPick()` returns new state, enables undo
- Session picks persist to Supabase via PATCH /api/draft/sessions/[id]
- Explainability engine uses `calculateScarcity()` shared between scarcity tracker and "Why?" reasoning

## Notes
- gh CLI not installed — GitHub repo needs web UI or gh install
- Port 3003 to avoid conflicts
- Joe = ESPN / Auction / Full redraft
- Tyler = Yahoo / Snake / Keeper league
