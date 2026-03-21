# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-03-21
- **Focus:** Phase 4 — Polish
- **Status:** ALL PHASE 4 ITEMS COMPLETE — FF-050, FF-052, FF-053, FF-054, FF-055

## Last Completed
- FF-050: Dark mode (default) + light mode toggle — next-themes provider, theme toggle in sidebar + mobile header
- FF-052: Loading states, error handling, empty states — route-level loading.tsx (9), error.tsx (1), not-found.tsx (1), upgraded inline states
- FF-053: Post-draft review — full grading system: overall grade, position grades, target hit/miss report, budget/snake analysis, strengths/weaknesses, pivot impact
- FF-054: Export draft results — CSV download + shareable text summary (copy to clipboard)
- FF-055: LLM latency optimization — Haiku model for live draft, 30s client-side recommendation cache, reduced token payload (12 players, 3 recent picks, 384 max tokens), cache invalidation on strategy swap

## New Files Created (This Session)
- `src/components/theme-provider.tsx` — next-themes wrapper (dark default, class strategy)
- `src/components/theme-toggle.tsx` — ThemeToggle (desktop) + ThemeToggleMobile components
- `src/components/page-skeleton.tsx` — PageSkeleton + TableSkeleton reusable loading skeletons
- `src/app/(app)/error.tsx` — App-level error boundary with retry
- `src/app/not-found.tsx` — Global 404 page
- `src/app/(app)/prep/loading.tsx` — Prep hub loading skeleton
- `src/app/(app)/prep/board/loading.tsx` — Board table loading skeleton
- `src/app/(app)/prep/configure/loading.tsx` — Configure loading skeleton
- `src/app/(app)/prep/runs/loading.tsx` — Runs table loading skeleton
- `src/app/(app)/prep/strategies/loading.tsx` — Strategies loading skeleton
- `src/app/(app)/draft/loading.tsx` — Draft hub loading skeleton
- `src/app/(app)/draft/setup/loading.tsx` — Setup loading skeleton
- `src/app/(app)/draft/review/loading.tsx` — Review loading skeleton
- `src/app/(app)/settings/loading.tsx` — Settings loading skeleton
- `src/lib/draft/review.ts` — Post-draft analysis engine (position grades, target tracking, budget/snake analysis)
- `src/lib/draft/export.ts` — CSV export + shareable text generation + clipboard utilities
- `src/app/(app)/draft/review/page.tsx` — Review page with Suspense
- `src/app/(app)/draft/review/client.tsx` — Full review UI (grade card, strengths/weaknesses, position grades, target report, budget/snake analysis, export buttons)

## Files Modified (This Session)
- `src/app/layout.tsx` — Added ThemeProvider wrapper, removed hardcoded `dark` class, added suppressHydrationWarning
- `src/components/layout/app-shell.tsx` — Added ThemeToggle in sidebar footer + ThemeToggleMobile in mobile header
- `src/app/(app)/prep/board/client.tsx` — Upgraded loading/error/empty states with icons + better layout
- `src/app/(app)/prep/strategies/client.tsx` — Upgraded loading/error/empty states with icons + better layout
- `src/lib/ai/claude.ts` — Added ModelTier system (fast/default/best), Haiku for live draft
- `src/app/api/draft/recommend/route.ts` — Switched to fast tier (Haiku), reduced max_tokens to 384
- `src/lib/draft/recommend.ts` — Added 30s client-side cache, reduced payload (12 players, 3 recent), clearRecommendationCache() export
- `src/app/(app)/draft/live/client.tsx` — Wired cache invalidation on strategy swap

## Next Up
- Phase 4 COMPLETE
- Remaining backlog: FF-028 (Refresh action), FF-029 (Keeper integration) — both deferred/optional

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
