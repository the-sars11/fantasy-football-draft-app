# AGENTS.md - fantasy_football_draft_app

The single source of repo rules for every AI agent: Claude Code (imports this through
`.claude/CLAUDE.md`), Codex, Antigravity/Gemini, and any bake-off contestant. Joe's global rules
(`dev-workflow-builder/global/JOE_RULES.md`) always apply; this file adds only what is specific to
this repo. If the two conflict, stop and ask Joe.

firewall: personal
allowed_providers: anthropic, openai, google, runway, elevenlabs, xai, meta, alibaba, kling, minimax, seedance
blocked_providers: moonshot

## Purpose

Joe's personal live-draft advisor for the Nasties 12-team, $200, PPR, no-kicker ESPN auction
draft. Prep Mode (research and strategy) and Live Draft Mode (real-time advisor: what to do, max
bid, budget and pace). It never places bids. Picks arrive live from the deployed auctioneer app,
the system of record. Stack: Next.js (App Router), React, TypeScript, Tailwind CSS 4, shadcn/ui,
Supabase, Claude API (optional, confirm-gated), Vitest. Hosted on Vercel. Default branch: `master`.

## Commands

```bash
npm install            # install
npm run dev            # dev server (http://localhost:3003)
npm run test:run       # Vitest single run (npm test is watch mode); 765 tests, 62 files on 2026-10-01
npm run type-check     # tsc --noEmit
npm run lint           # ESLint (eslint.config.mjs)
npm run build          # production build
```

- `npm run lint` reports older errors on master. Lint only what you touched; add no new errors.
- Data scripts change shared data: `data:pull` and `risk:*` call outside APIs (Sleeper,
  FantasyPros), `research:*` reads and writes Supabase, `data:calibrate` rewrites local data
  files. Run them only for a build-plan item that calls for them. Any Claude API call needs
  Joe's typed yes.
- Commit gates: a git pre-commit hook (`.claude/hooks/commit_gates.py`, config
  `.claude/gates.json`) runs the dash check, `ban_scan.py`, the secret scan and `npm run test:run`.
  In Claude Code sessions a PreToolUse hook (`.claude/hooks/pre-commit-gate.ps1`) also blocks a
  commit when `npm run lint` fails. There is no pre-push hook.

## Where things live

| Path | What it is |
|---|---|
| `.claude/BUILD_PLAN.md` | The one plan: to-do list, status, dated decision records. Work the first open item. |
| `.claude/WORKING_STATE.md` | Where the last session stopped (thin pointer). History: `.claude/WORKING_STATE_ARCHIVE.md` |
| `.claude/CHANGELOG.md` | Change audit trail with root cause |
| `NORTH_STAR.md`, `ARCHITECTURE.md` (repo root) | Product definition; architecture, API surface, Supabase schema, data flow |
| `.claude/VISION.md` | Locked whole-app vision and the 7-point definition of done. `.claude/NORTH_STAR.md` is retired. |
| `.claude/FEATURES_INDEX.md`, `.claude/CODE_AREAS.md` | Code maps. Use them to find code instead of reading whole files. |
| `.claude/REVIEW_LENSES.md`, `.claude/BUG_LOG.md` | The six review lenses; the bug log |
| `.claude/DESIGN_SYSTEM.md`, `.claude/UI_DESIGN_SPEC.md`, `.claude/mockups/`, `UI/BOARD_SPEC_IA-1.0.md` | Locked design system, UI spec, mockups, the frozen Board contract |
| `docs/DRAFT_PREP_RUNBOOK.md` | Repeatable draft-prep run (research dataset, board generator) |
| `src/app/api/auctioneer-feed/route.ts` | Server proxy that polls the deployed auctioneer (live draft input) |
| `src/lib/draft/` | Live draft engine (rule-based advisor, max bid, feed merge, sim) |
| `supabase/migrations/` | Database migrations |
| `FANTASY_FOOTBALL_MASTER.md` | League config, owners, scoring. Byte-identical synced copy of the file in `fantasy_auction_auctioneer` (canonical): never edit it here. |
| `.claude/HANDOFF.md`, `.claude/reviews/`, `.claude/creative/jobs/<id>/` | Non-Claude handoff, saved reviews, media jobs; created on first use |

## Key design decisions (hard locks)

1. Auction only: the Nasties 12-team, $200, PPR, no-kicker ESPN full redraft. No snake, no
   keeper, no other league (Tyler's league is out of scope).
2. ESPN only. No Yahoo adapter.
3. Rule-based advisor first: What-To-Do, max bid and budget/pace are 100% rule-based ($0). LLM
   panels are optional and confirm-gated. Small focused Claude calls per pick, never bulk.
4. The auctioneer feed is the live draft input; manual pick entry is the fallback.
5. Multi-source consensus: average 3+ ranking sources for the baseline; the LLM adjusts for league
   context only.
6. LLM output is bounded: Claude synthesizes from real data, never invents stats, every
   recommendation cites source data, every output is tagged `source: "llm" | "fallback"`.
   Ranges with stated assumptions, not point estimates. If data is missing, say so.

## Code standards

- TypeScript strict, no `any`; interfaces for objects, types for unions.
- Server Components by default; `use server` for mutations; `loading.tsx` / `error.tsx` patterns.
- Tailwind only, dark mode default, shadcn/ui patterns. API routes validate input and return
  `{ error: string, details?: any }`. Typed Supabase helpers, RLS policies, tracked migrations.
- Vitest with jsdom; unit tests in `src/**/*.test.ts`.

## Design authority

Highest first; a higher source wins on specific values:
1. `.claude/DESIGN_SYSTEM.md` (LOCKED), `.claude/UI_DESIGN_SPEC.md`, `UI/BOARD_SPEC_IA-1.0.md`
   and any mockup marked locked. Port a locked spec verbatim.
2. `dev-workflow-builder/docs/DERIVED_DESIGN_PROCESS.md` for anything not yet decided.

## Working rules

- Session start: read `.claude/BUILD_PLAN.md`, then `.claude/WORKING_STATE.md`, then this file.
- One plan: `.claude/BUILD_PLAN.md` only. New directions go there as active work or dated decision
  records. No standalone plan docs.
- Build-plan tags win: `[COST]` needs Joe's typed yes before any spend, `[LOOK]` needs Joe's pick
  of the look, `[JOE]` is a step only Joe does.
- One build-plan item at a time. Before any non-trivial change: PROPOSE (classify the change,
  name the triggered lenses from `.claude/REVIEW_LENSES.md`, declare scope and a concrete success
  criterion), then PATCH (match the declared scope exactly), then VERIFY (show the criterion is
  met; run `npm run test:run` and `npm run lint`; complete each triggered lens checklist).
  Change classes: output, pipeline, shared, schema, prompt, infra, docs, bugfix.
- Run deterministic checks (tests, type check, lint) before any model review pass.
- Ask first before: architecture changes not in the plan, new dependencies, schema changes, auth
  or security logic, or a change touching more than 5 files.
- One fix = one commit; push right after the commit. Commit types: feat, fix, refactor, docs,
  chore, style, test.
- Non-Claude agents work only in their own worktree on `<agent>/<task>`, never push to `master`,
  and finish with the handoff in JOE_RULES section 9. Never two writers in one worktree.

## Definition of done

A task is not done until: code committed; `npm run test:run` and `npm run lint` pass (no new
lint errors); the `BUILD_PLAN.md` item is marked `[x]`; `WORKING_STATE.md` is accurate; a
`CHANGELOG.md` entry is added; the triggered lens checklists are complete; and the proof is
pasted (JOE_RULES section 2).

## Never do

- Don't add features without BUILD_PLAN items; don't refactor without permission.
- Don't edit `FANTASY_FOOTBALL_MASTER.md` in this repo.

## Lessons

When Joe corrects an agent here, add one line: "When X, do Y."
