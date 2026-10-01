# Working State -- pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.
> Everything this file said before 2026-10-01 (263 lines, last written 2026-08-24) is in
> `.claude/WORKING_STATE_ARCHIVE.md`, a verbatim copy.

## Current state (re-verified 2026-10-01)

- Branch `master`, HEAD `0cfde12` == `origin/master` `0cfde12` (separate `git rev-parse` calls),
  working tree clean before this trim. Latest commits: MM-7.1 plan model tags (2026-09-27),
  AGENTS.md + git commit gates (2026-09-27), Draft prep + live-room UI updates (2026-09-02).
- Tests: `npm run test:run` = 62 files, 765 passed, 0 failed (run 2026-10-01).
- Deploy: hosted on Vercel from `master`. Whether `0cfde12` is deployed is not verified.
- Stale in the old file and NOT carried over: it said the LB-track and SP-track work was
  "uncommitted in the tree" (the tree is clean and HEAD is pushed) and that IA-1.0 was the next
  item to start (BUILD_PLAN now shows IA-1.0 in progress, see below).

## Next open item (per BUILD_PLAN.md)

Sprint IA, "Collapse to One Board" (BUILD_PLAN.md, section `Sprint IA`). IA-0.1 and IA-0.2 are done
(awaiting their validators V-0.1 and V-0.2). **IA-1.0 [Opus] Board spec + mockup is `[~]` IN
PROGRESS and waiting on Joe's typed LOOK approval** of `UI/board-mockup-IA-1.0.html` (frozen
contract `UI/BOARD_SPEC_IA-1.0.md`, revision R1 folded in). No IA-1.x worker (IA-1.1 adapter,
IA-1.2 list + row, IA-1.3 expand) starts until Joe approves. Then IA-2.0 (live assembly spec,
Opus), IA-2.1 to IA-2.2, IA-3.1, IA-4.0.

The live Value Board (`inline-players-panel.tsx`, `live-reprice.ts`, `dollar-bin.tsx`,
`market-pulse-strip.tsx`, on-the-block reprice) is exactly what Sprint IA-2.x reuses on the Live
tab, so do not rebuild it.

## Open Joe calls

1. IA-1.0 LOOK approval (above). Blocks every IA-1.x build.
2. Verbatim from the old file: "**▶ OPEN (Joe's call, optional):** the two most-contested anchors
   (Gibbs/Nacua) land AT the $88 cap, $3 above the $85 all-time high. If Joe wants anchors in the
   low $80s, lower the cap to $85 or trim the me-seat target boost. He chose $88 knowingly."
3. Verbatim: "`strategy-swap.tsx` -- KEEP-listed by the card but grep-confirmed ZERO real importers
   anywhere in `src` (pre-existing, not caused by this deletion; left in place per KEEP
   instruction, flagged for Joe's decision: wire it up or formally retire it)".
4. Verbatim: "**F2 (low) -- still open.** `useUserTags` 500 on the non-UUID `demo-league` id in
   `?sim=1` only; sim-only, non-blocking, does not touch the adaptive room. Logged for Joe to
   triage."
5. Verbatim: "Pushing it triggers a Vercel redeploy of the live board (the only visible step --
   flag before push)." (about pushing a regenerated research dataset)
6. R15 rehearsal gate (full mock draft on Joe's phone against the live auctioneer) still needs
   Joe's hands; the live-auctioneer sync has never been proven against a running auctioneer.
7. Still open from the vision work: real-session persistence proof for tag writes (R11b) was
   deferred to R15 because the verification browser had no Supabase session.

## Joe decisions on record (verbatim from the old file; each em or en dash written as `--` or `-`)

- "**D0 gate CLOSED (Joe, 2026-08-14):** Joe locked the **"SHIELD" (Option B)** identity."
- "Joe re-sequenced 2026-08-23: run the **SP-track now**, ahead of W3/W4 and the R15 rehearsal, to
  finish the SHIELD screen reskin. W3/W4 (draft-plan lock + screen) are held; R15
  (phone-vs-live-auctioneer) still runs whenever Joe is ready and does not block SP."
- "Joe-approved radical simplification: kill the screen sprawl, collapse the app around ONE dense
  list -- **Board** (prep) that, with draft chrome layered on, becomes **Live** (draft day)."
- Joe's locked constraints for the vision work (2026-08-13), verbatim:
  - "Prep + sim + live are **EQUALLY important** (not live-only)."
  - "The vision must be **built on the existing root NORTH_STAR + BUILD_PLAN + current code** --
    reconciled, NOT invented fresh."
  - "Look/feel/UX is its **own proper multi-session VISUAL effort** (real reference apps, mockups,
    screen-by-screen, iterated)."
- Vision locked 2026-08-14 in `.claude/VISION.md`; later decisions (DEC-1 BIAS, DEC-2, DEC-IA1,
  DEC-IA1b) are recorded in BUILD_PLAN.md.

## What the app is (verbatim; dashes as above)

"**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN
auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed
**auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league =
permanent hold)."

"**New North Star:** *build the best possible full 15-man roster for $200* -- not price players
one at a time."

"**Cost gate:** rule-based advisor / valuation / solver / simulation are all **$0**. The only paid
paths are the AI strategy/research/top-targets panels. Fixing the model id is free; **verifying
any live AI path needs Joe's typed approval** (~$0.01-0.03/call)."

## Method notes and hard-won lessons (quoted lines verbatim, dashes as above; unquoted lines are my paraphrase of the archive)

- "The old "opacity modifiers don't translate" worry was disproven -- Tailwind CSS 4 here supports
  `bg-[var(--ffi-blue)]/18` opacity-on-variable (15+ existing uses)."
- "immune to this environment's background-tab timer throttling that had produced false ~1-2s
  readings via naive polling" (page-switch timing: use event-driven instrumentation, not polling).
- "durability was keyed by Sleeper id but board/sim players carried a Supabase UUID as `id`, so
  `applyRiskModel` missed for EVERY player and everyone rode the position baseline (RB 0.9466)."
  Look up on `p.sleeperId ?? p.id`.
- "`src/hooks/use-live-draft-data.ts` fed raw `players_cache` rows into `Player[]` state WITHOUT
  the canonical `cacheToPlayers` mapping every prep screen uses, so `consensusTier` was
  `undefined` and `calculateScarcity`'s tier filters all returned 0 -- degraded REAL drafts too."
- "Cold re-pull reproduces `risk-model.json` byte-for-byte (sha256 dd42110b)."
- Next 16 allows one dev server per project directory regardless of port, so a second session's
  server cannot co-run; check `preview_list` before starting another.
- `?sim=1` on `/draft/live` injects a hardcoded `demo` session that bypasses the real
  session-fetch path and makes tag and session writes 404 or 500. Do not accept `?sim=1`-only
  proof (BUILD_PLAN Validation Agent Protocol).
- Browser-pane screenshots have failed to composite in several past sessions; if a screenshot
  times out, say so and use DOM, network and console evidence instead of faking it.

## What is real (verbatim; dashes and arrow as above)

"Data pipeline (~491 real 2026 players in `players_cache`, verified via API) · SHIELD v4 design
system (D0-locked, D1-ported 2026-08-14) · corrected 16-yr Nasties calibration ledger in-repo
(`src/data/league-history/`) + reproducible script -- real curves, the good raw material for R4 ·
12-team config truth (duplicate-active-league drift fixed) · auctioneer feed proxy + state machine
+ rule-based What-To-Do (built, unit-tested, **NOT live-verified** -> R15)."
