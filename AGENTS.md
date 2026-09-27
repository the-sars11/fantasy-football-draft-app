# AGENTS.md - fantasy_football_draft_app

The single source of repo rules for every AI agent: Claude Code (through `@../AGENTS.md` in
`.claude/CLAUDE.md`), Codex, Antigravity/Gemini, and any bake-off contestant. Joe's global rules
(`dev-workflow-builder/global/JOE_RULES.md`, synced to each tool) still apply; this file adds
the repo's own. If the two conflict, stop and ask Joe.

firewall: personal
allowed_providers: anthropic, openai, google, runway, elevenlabs, xai, meta, alibaba, kling, minimax, seedance
blocked_providers: moonshot

## 1. Purpose

**fantasy_football_draft_app**: Joe's personal live-draft advisor for the Nasties 12-team,
$200, PPR, no-kicker ESPN auction draft. Prep Mode (research and strategy) and Live Draft Mode
(real-time auction advisor: what to do, max bid, budget and pace). Picks arrive live from the
deployed auctioneer app, the system of record. Product definition: `NORTH_STAR.md` (repo root).
Type: web-app. Stack: Next.js (App Router), React, TypeScript, Tailwind CSS 4, shadcn/ui,
Supabase, Claude API (optional, confirm-gated), Vitest. Hosted on Vercel.

## 2. Firewall

- This repo is tier `personal` (`pm` = ProperMuse LLC, `rsc` = Rasar Strategic Consulting,
  `personal` = Joe's own projects).
- Send code, data, prompts or screenshots from this repo only to `allowed_providers`.
  A wrapper skill or script asked to call a `blocked_providers` entry must refuse and say why.
- Never move code, branding, voice, data or infrastructure to a repo on another tier.

## 3. Commands

```bash
npm install            # install
npm run dev            # dev server (http://localhost:3003)
npm run test:run       # Vitest single run (npm test is watch mode)
npm run type-check     # TypeScript check (tsc --noEmit)
npm run lint           # ESLint (eslint.config.mjs)
npm run build          # production build (next build)
```

- Data scripts in package.json change shared data: `data:pull` and `risk:*` pull from outside
  APIs (Sleeper, FantasyPros), `research:*` reads and writes the Supabase database, and
  `data:calibrate` rewrites local data files. Run them only for a build-plan item that calls
  for them. Any Claude API call needs Joe's typed yes.
- `npm run lint` already reports older errors on master; lint only what you touched and do not
  add new errors.

## 4. Where things live

| Path | What it is |
|---|---|
| `.claude/BUILD_PLAN.md` | The one plan: to-do list, status and dated decision records. Work the first open item. |
| `.claude/WORKING_STATE.md` | Where the last session stopped (thin pointer) |
| `.claude/CHANGELOG.md` | Change audit trail with root cause |
| `NORTH_STAR.md`, `ARCHITECTURE.md` (repo root) | Current product definition and architecture. `.claude/NORTH_STAR.md` is retired. |
| `.claude/FEATURES_INDEX.md`, `.claude/CODE_AREAS.md` | Code maps. Use them to find code instead of reading whole files. |
| `.claude/REVIEW_LENSES.md`, `.claude/BUG_LOG.md` | Review lens checklists; the bug log |
| `.claude/DESIGN_SYSTEM.md`, `.claude/UI_DESIGN_SPEC.md`, `.claude/mockups/` | Locked design system, UI spec, mockups |
| `src/app/api/auctioneer-feed/route.ts` | Server proxy that polls the deployed auctioneer (live draft input) |
| `src/lib/draft/` | Live draft engine (rule-based advisor, max bid, feed merge) |
| `supabase/migrations/` | Database migrations |
| `FANTASY_FOOTBALL_MASTER.md` | League config, owners and scoring. A synced copy: never edit it here. |
| `.claude/HANDOFF.md` | Written by every non-Claude agent when it finishes (section 8); created on first use |
| `.claude/reviews/` | Saved reviews: `<date>-<agent>-<topic>.md`; created on first use |
| `.claude/creative/jobs/<id>/` | Media jobs: `brief.md`, `references/`, `provenance.yaml`, `v1..vN`; created on first use |

## 5. Gates

- The git pre-commit hook is the CI: em-dash check, `ban_scan.py`, secret scan,
  `npm run test:run`. Never skip it (`--no-verify` is forbidden on commit). Fix what it flags.
- Run the deterministic checks (tests, type check, lint, graders) before any model review pass.
- Build-plan tags always win: `[COST]` needs Joe's typed yes before any spend, `[LOOK]` needs
  Joe's pick or approval of the look, `[JOE]` is a step only Joe does (sign-ins, keys, clicks).
- No "done" without proof pasted in the same message: command output, test results, a SHA.

## 6. Design authority

Highest first; a higher source always wins on specific values:
1. `.claude/DESIGN_SYSTEM.md` (marked LOCKED), `.claude/UI_DESIGN_SPEC.md`, and any mockup
   marked locked. Port a locked spec verbatim.
2. `dev-workflow-builder/docs/DERIVED_DESIGN_PROCESS.md` for anything not yet decided.
3. Never name or imitate a reference product or brand as the target.

## 7. Worktrees and ownership

- Claude Code working alone commits straight to `master` by explicit path, then pushes.
- Every other agent works only in its own worktree on a branch named `<agent>/<task>`, with its
  sandbox on. Bake-off contestants write only inside their own entry folder.
- Non-Claude agents never push to `master`, merge, force-push or deploy. Claude runs the gates,
  merges locally and pushes.
- Never two writers in one worktree.

## 8. Handoff format

A non-Claude agent finishes by writing `.claude/HANDOFF.md` in its worktree, then stops:

```markdown
## Task
<build-plan card id and one line>; branch <agent>/<task>
## Files changed
<full paths>
## Commands run
<command and its pasted output: tests, lint, build>
## Verified / not verified
<what was proven; what was not>
## Open questions or risks
<or "none">
```

## 9. Commits

`<type>: <what changed for the user>` plus bullet details. Types: feat, fix, refactor, docs,
chore, style, test. Stage by explicit path only; never `git add -A` or `git commit -a`.

## 10. Working rules

- Session start: read `.claude/BUILD_PLAN.md`, then `.claude/WORKING_STATE.md`, then this file.
- One build-plan item at a time, through `.claude/CLAUDE.md`'s PROPOSE / PATCH / VERIFY and
  Definition of Done.
- Ask first before: architecture changes not in the plan, new dependencies, schema changes,
  auth or security logic, or a change touching more than 5 files.
- Scope creep: report other problems you find; fix them only with Joe's go.

## Invariants

`.claude/CLAUDE.md` is binding for every agent, not just Claude. Read it in full before any
change: its Key Design Decisions, Code Standards, Evidence-Based Output Standard, One-Plan Rule
and Definition of Done are this repo's rules and are not repeated here.

One standing product rule from that file, recorded here as text only:
- Auction only: the Nasties 12-team, $200, PPR, no-kicker ESPN full redraft. No snake, no
  keeper, no other league.

## Never do

- Don't add features without BUILD_PLAN items
- Don't refactor without permission
- Don't edit `FANTASY_FOOTBALL_MASTER.md` in this repo
