# FFDA UX Redesign - Working State (audit trail)

**Engagement:** Full UI/UX rebuild of Fantasy Football Draft Advisor following the dev-workflow-builder UX/UI universal process (`dev-workflow-builder/docs/UX_UI_UNIVERSAL_EXECUTION.md`) and methodology (`.../design-system/methodology/UX_UI_METHODOLOGY.md`).
**Started:** 2026-07-05.
**Starting state:** FULL-BUT-TRASH (full working app, strong engine, GRIDIRON UI discarded).
**Global anchor (personality lead):** EA FC 25 + Linear. Per-screen anchors assigned at G1.5.
**Current step:** Step 2 (screen map) in progress. G1 passed (all 8 bold moves approved).
**Code blocker:** YES. Methodology Hard Ban #4 - no UI code until `UX_PERSONALITY_LOCK.md` is signed off (Step 3 / G5). FFDA has no lock yet.

---

## Locked decisions (append-only audit trail)

| # | Decision | Date | Source |
|---|---|---|---|
| L1 | Step 0 discovery complete. 4 domains audited (UI vs rubric, backend wired-vs-stubbed, build-plan scope, methodology gap) + auctioneer component inventory. Raw outputs persisted to `.claude/UX_DISCOVERY_AGENT_OUTPUTS.md`. Process note: two general-purpose agents cascaded and were re-run as read-only Explore agents; backend Explore returned on a third resume after two API errors. All four domains backed by real file:line findings. | 2026-07-05 | This session |
| L2 | G0 (Step 0 briefing) APPROVED. Joe "yes, go". The 5 briefing recommendations taken as accepted: (1) 5 HERO screens with the phone multi-team board and TV board kept as distinct surfaces; (2) draft HERO screens rebuilt first, then a lighter token/primitive sweep for secondary/utility; (3) `/prep/players` player-intel deferred until its data is real (currently mocked); (4) auctioneer reuse is logic/state/patterns only, never its cockpit visual identity; (5) Claude sources current EA FC 25 reference screens for the Step-B2 Reference Board. | 2026-07-05 | Joe "yes, go" |
| L3 | Step 1 IA proposal authored at `.claude/UX_IA_PROPOSAL.md` (4 phase-based nav groups: Prep / Draft / Season / More; 5 HERO screens; 8 bold moves BM1-BM8; kill list; repurpose list). Status PROPOSAL, awaiting G1 per-move vote. Not locked. | 2026-07-05 | This session |
| L4 | G1 PASSED. Joe "approval all" - all 8 bold moves (BM1-BM8) APPROVED as recommended, plus the kill list and repurpose list. IA proposal is now LOCKED. Notable: BM1 (split live draft into private phone cockpit + new room-safe TV board `/draft/board`) is the one structural add; all other moves are rebuild-in-place. Proceed to Step 2 (screen map + per-HERO-screen EA FC anchors), gated at G1.5. | 2026-07-05 | Joe "approval all" |

---

## Bold-move vote log (G1)

| Move | Summary | Recommendation | Vote |
|---|---|---|---|
| BM1 | Split live draft into private phone cockpit + room-safe TV board (`/draft/board` NEW) | APPROVE | APPROVED 2026-07-05 |
| BM2 | Cockpit hero = on-the-block card, strategy + record-sale (no bid stepper) | APPROVE | APPROVED 2026-07-05 |
| BM3 | Real imagery as a system requirement (headshots + team marks) | APPROVE | APPROVED 2026-07-05 |
| BM4 | Discard GRIDIRON tokens + Anton; OKLCH tokens + auctioneer-differentiated fonts | APPROVE discard (font pick at G5) | APPROVED 2026-07-05 |
| BM5 | One position-color token source | APPROVE | APPROVED 2026-07-05 |
| BM6 | Decompose god-components inside Session-B rebuilds, not a separate ticket | APPROVE | APPROVED 2026-07-05 |
| BM7 | Defer player-intel (`/prep/players`) out of HERO set (mocked data) | APPROVE | APPROVED 2026-07-05 |
| BM8 | Command palette on desktop prep/season only, not phone cockpit | APPROVE | APPROVED 2026-07-05 |

---

## Gate sequence status

| Gate | What | Status |
|---|---|---|
| G0 | Step 0 briefing approval | PASSED 2026-07-05 (L2) |
| G1 | IA per-move vote | PASSED 2026-07-05 (L4, all 8 approved) |
| G1.5 | Screen map with per-HERO-screen EA FC anchor (HARD STOP) | AWAITING |
| G5 | Personality lock 8-section vote (unblocks Hard Ban #4) | not started |
| G3/G4/G6 | Per-screen Q-batch / mockup / approval (recurring) | not started |
| G9 | Eval verdict | not started |

---

## HERO screens (candidate, confirmed at G1.5)

1. Live draft cockpit (phone) - hero: on-the-block card + max-bid advice + record-sale.
2. Multi-team board (phone) - hero: all-teams roster/budget grid.
3. TV board (shared display, NEW `/draft/board`) - hero: room-safe broadcast HUD.
4. Prep board / player pool (`/prep/board`) - hero: dense rankable player list.
5. Post-draft review (`/draft/review`) - hero: grade reveal + breakdown.

---

## File index for this redesign

| File | Status | Purpose |
|---|---|---|
| `.claude/UX_REDESIGN_STATE.md` | LIVE (this file) | Audit trail. Future sessions read first. |
| `.claude/UX_DISCOVERY_AGENT_OUTPUTS.md` | WRITTEN 2026-07-05 | Step 0 discovery findings. |
| `.claude/UX_IA_PROPOSAL.md` | PROPOSAL 2026-07-05 | Step 1 IA. Awaiting G1. |
| `.claude/UX_REDESIGN_SCREEN_MAP.md` | NOT YET WRITTEN | Step 2. Per-HERO-screen EA FC anchors. G1.5. |
| `.claude/UX_PERSONALITY_LOCK.md` | NOT YET WRITTEN | Step 3. 8-section lock. G5. Unblocks code. |
| `.claude/UX_OVERHAUL_KICKOFF.md` | PRE-EXISTING | Warm-start findings (2026-07-05). |
| Pre-methodology (demoted to Reference Board): `.claude/DESIGN_SYSTEM.md`, `UI_DESIGN_SPEC.md`, `UI_EVAL_2026.md`, `.claude/mockups/*` | ON DISK | "Pit Lane" inputs, NOT the baseline. |
