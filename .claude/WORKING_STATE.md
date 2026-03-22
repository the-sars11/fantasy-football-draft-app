# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-03-22
- **Focus:** FF-071 e2e testing
- **Status:** E2E TESTING COMPLETE — partial pass (see findings below)

## Last Completed
- FF-071 (partial): End-to-end test on deployed app (https://fantasyfootballdraftapp-lac.vercel.app)
  - **PASS:** Prep Hub loads, 573 players cached, Sleeper + FantasyPros sources fresh
  - **PASS:** Configure League page — both Joe's ESPN (Auction) and Tyler's Yahoo (Snake/Keeper) tabs work
  - **PASS:** Research pipeline runs — POST /api/research returns 200, saves runs to DB
  - **PASS:** Run History page — shows completed runs with strategy names, timestamps
  - **PASS:** Strategies page — loads correctly, league selector + Generate button present
  - **PASS:** All routes return correct HTTP responses (200 for pages, 307 redirect for auth-protected)
  - **PASS:** Build passes clean, no errors
  - **EXPECTED:** All players show Rank 999, ADP 999, Value $0 — ranking sources (FantasyPros, ESPN) don't publish 2025 season data until May/June. The pipeline works mechanically but produces defaults.
  - **FIX:** Broken "Research" link on Prep Hub pointed to nonexistent `/prep/research` — fixed to `/prep/board`
  - **NOTE:** FF-069 still blocked on Tyler providing scoring settings + keeper rules/costs

## Files Modified (This Session)
- `src/app/(app)/prep/page.tsx` — Fixed broken Research link: `/prep/research` → `/prep/board`

## Next Up
- FF-069: Tyler's league setup — waiting on his scoring settings + keeper rules/costs
- FF-072: Live draft dry run — mock Google Sheet, full live draft flow
- Phase 6 (Sprints 9-11): Gridiron Lens UI redesign — START with Q&A planning session
- Phase 7 (Sprint 12): Pre-season — Yahoo OAuth, 2025 data pull, draft day prep

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
