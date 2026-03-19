# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-03-19
- **Focus:** Phase 0 — Foundation complete
- **Status:** All Phase 0 tasks done (FF-001 through FF-008)

## Last Completed
- FF-004: Supabase setup (env vars, dev mode bypass, server helpers, middleware)
- FF-005: Auth flow (sign-in, sign-up, forgot-password, update-password, callback routes)
- FF-006: App shell (collapsible sidebar: Prep, Draft, Settings + sign out)
- FF-007: DB migration (leagues, players_cache, research_runs, draft_sessions + RLS policies)
- FF-008: League config page (platform, format, teams, budget, roster slots, scoring, keepers + Joe/Tyler presets)

## Next Up
- FF-009: Player data model + TypeScript types
- FF-010: ESPN API adapter
- FF-011: Yahoo API adapter

## Architecture Notes
- shadcn/ui v4 uses base-ui (not Radix) — no `asChild` prop on Button/TooltipTrigger
- `buttonVariants()` is client-only, can't be called in server components — use plain Tailwind classes for Links in server pages
- Dev mode (`DEV_MODE=true`) bypasses all Supabase auth, returns mock user
- Middleware redirects: root → /prep, auth routes → /prep (when authenticated)
- Dark mode is default (class="dark" on html element)

## Notes
- gh CLI not installed — GitHub repo needs web UI or gh install
- Port 3003 to avoid conflicts
- Joe = ESPN / Auction / Full redraft
- Tyler = Yahoo / Snake / Keeper league
