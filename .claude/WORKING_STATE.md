# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-03-21
- **Focus:** Backlog — FF-029 Keeper Integration
- **Status:** FF-029 COMPLETE

## Last Completed
- FF-029: Keeper integration — full keeper support for keeper leagues (Tyler's Yahoo league)
  - Core keeper logic: types, validation, pool filtering, value analysis (`lib/draft/keepers.ts`)
  - Draft setup UI: add/remove keepers per manager with position, cost, and budget impact display
  - Draft state: `keepers` field on DraftState, `applyKeepersToState()` deducts budgets + fills roster slots
  - Session API: accepts keepers on creation, stores in Supabase (new `keepers` jsonb column)
  - Leagues API: returns `keeper_enabled` + `keeper_settings` for setup UI
  - Player pool: keepers excluded from available players via `getDraftedPlayerNames()`
  - My Roster: keeper badge ("K") on keeper picks, separate count, grading excludes keepers
  - Snake Advisor: FF-048 keeper value display with round cost per keeper
  - DB migration: `20260321000001_add_keepers_to_draft_sessions.sql`

## New Files Created (This Session)
- `supabase/migrations/20260321000001_add_keepers_to_draft_sessions.sql` — adds keepers jsonb column

## Files Modified (This Session)
- `src/lib/draft/keepers.ts` — Full rewrite from placeholder: types, validation, state integration, value analysis
- `src/lib/draft/state.ts` — Added `keepers` field to DraftState, `is_keeper` to DraftPick, keepers in getDraftedPlayerNames
- `src/lib/supabase/database.types.ts` — Added `keepers` array to DraftSession type
- `src/app/api/draft/sessions/route.ts` — Accept keepers in POST body, store in session
- `src/app/api/leagues/route.ts` — Return keeper_enabled + keeper_settings in select
- `src/app/(app)/draft/setup/client.tsx` — Full keeper entry UI: add/remove/edit keepers, validation, budget impact
- `src/hooks/use-draft-state.ts` — Apply keepers on init + on undo rebuild
- `src/components/draft/my-roster.tsx` — Keeper badges, separate keeper count, grade excludes keepers
- `src/components/draft/snake-advisor.tsx` — FF-048 keeper value display section

## Next Up
- FF-028: Refresh action (last backlog item)
- Deploy to Vercel
- End-to-end testing with real data

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
- Tyler = Yahoo / Snake / Keeper league
