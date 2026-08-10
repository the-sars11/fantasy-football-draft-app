# Fantasy Football Draft Advisor -- North Star

**Last updated:** 2026-08-10

## Who This Is For

One user: **Joe Rasar** (joe.rasar@propermuse.co)
One draft: **Nasties** -- 12-team, $200 auction, PPR, no-kicker, ESPN, full redraft
One purpose: advise Joe during the live auction. **This app never places bids.**

## What It Does

- **Prep Mode** -- Research players, build a strategy, set targets/avoids, run the draft board.
- **Live Draft Mode** -- Connect to the auctioneer feed, get instant advice on every nomination (HOLD / BID / PUSH / PASS), track Joe's budget and roster, and see what everyone else is doing.

The core advisor (What-To-Do, max bid, budget/pace) is **100% rule-based** -- no API key required, always online, always free. AI panels (strategy proposals, top targets) exist but require `ANTHROPIC_API_KEY` and cost per call; they are off by default on draft night. See the "Decisions to make" block in `.claude/BUILD_PLAN.md` for the cost decision.

## System of Record

Picks come from the **deployed auctioneer app** (`fantasy-auction-auctioneer`). This app is downstream -- it reads the auctioneer's state via a server proxy at `src/app/api/auctioneer-feed/route.ts`, never the other way around.

Live sync path:
```
Auctioneer app (deployed)
  GET /api/state   (payload IS the DraftState: picks[], config.teams[])
    src/app/api/auctioneer-feed/route.ts   (CORS-dodge proxy, ~3s poll)
      src/hooks/use-remote-auctioneer-feed.ts   (poll + exponential backoff)
        src/lib/draft/auction-feed-merge.ts   (pickId dedup, multi-source merge)
          src/lib/draft/state.ts   (state machine, Supabase persistence)
            src/components/draft/live-room/auction-room.tsx   (UI)
              src/lib/draft/what-to-do.ts   (HOLD/BID/PUSH/PASS + max bid + rationale)
```

Same-device BroadcastChannel is folded in by `use-auctioneer-feed.ts` as a second source (priority-merged).

Offline resync is handled by `reconcileWithAuctioneerPicks` in `state.ts` (spec: `.claude/OFFLINE_RESYNC_SPEC.md`). The auctioneer value always wins when a pick appears in both the local provisional list and the auctioneer feed.

## Out of Scope -- Forever

- **Google Sheets** -- removed in DR-2
- **Snake draft / Tyler's league** -- permanent hold; Tyler's Yahoo/Sleeper league is not being built
- **Keeper logic** -- Nasties is full redraft; keeper code is dead (removed in DR-2)
- **Commercialization (P3-P7)** -- retired 2026-08-06; this is a personal tool
- **In-season companion** -- `season/*` screens are parked and off-system; decision in DR-6.2

## Design System

**GRIDIRON** -- see `DESIGN_SYSTEM.md` v3.1 for the full spec.
Direction: EA FC energy + Linear discipline.
Palette: colorful-dark canvas, volt-green = the moment/value/action, electric blue = structure.
Type: Anton / Saira Condensed / JetBrains Mono.
Motion: `lib/motion.ts` (performant, no backdrop-filter stacks). Reduced-motion = dial-down (not strict-off).
Live Room uses its own scoped palette in `src/components/draft/live-room/theme.ts`.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js App Router, React 19, TypeScript strict |
| Styling | Tailwind 4, shadcn-on-base-ui (NOT Radix -- no asChild) |
| Database | Supabase (PostgreSQL + Auth) |
| AI | Claude API (@anthropic-ai/sdk) -- optional; core advisor is rule-based |
| Data | Sleeper API, FantasyPros, ESPN API |
| Hosting | Vercel |
| Dev port | 3003 |

## One-Plan Rule

There is exactly one plan: `.claude/BUILD_PLAN.md`. New directions go in that file as active work or dated decision records. No standalone plan docs. Design specs live in `DESIGN_SYSTEM.md`. Working state lives in `.claude/WORKING_STATE.md`. Change audit trail lives in `.claude/CHANGELOG.md`.
