# Fantasy Football Draft Advisor

Personal live-draft advisor for Joe's Nasties 12-team, $200, PPR, no-kicker ESPN auction draft. Advises Joe during the live auction (what to do, max bid, budget/pace). **Never places bids.**

Picks arrive over the network from the deployed auctioneer app (system of record). The core advisor is 100% rule-based -- no API key required on draft night.

## Stack

Next.js App Router, React 19, TypeScript strict, Tailwind 4, shadcn-on-base-ui, Supabase, Vercel. Dev port: **3003**.

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3003
```

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
- `AUCTIONEER_BASE_URL` (URL of the deployed auctioneer app -- required for live draft sync)
- `ANTHROPIC_API_KEY` (optional -- AI strategy proposals only; rule-based advisor works without it)

## Dev Commands

```bash
npm run dev          # Dev server on :3003
npm run type-check   # TypeScript check (0 errors required)
npm run test:run     # Vitest single run
npm run lint         # ESLint
npm run build        # Production build
```

## Key Docs

| File | What it is |
|------|-----------|
| `.claude/BUILD_PLAN.md` | The one plan -- source of truth, all active work |
| `.claude/WORKING_STATE.md` | Current phase pointer + live blockers |
| `NORTH_STAR.md` | Product purpose, design system, what is out of scope |
| `ARCHITECTURE.md` | Data flow, API surface, Supabase schema |
| `DESIGN_SYSTEM.md` | GRIDIRON design tokens + components (v3.1) |
| `.claude/CHANGELOG.md` | Change audit trail |
| `docs/TESTING_GUIDE.md` | Auction-only test flows |
