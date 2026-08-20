# UX Overhaul Kickoff — Fantasy Football Draft Advisor

**Created:** 2026-07-05 (handoff at end of a scope-audit session, before context compaction)
**Purpose:** Turnkey entry point to run this app through the dev-workflow-builder UX/UI universal process. A fresh session pastes the prompt in Section 3 and starts warm. Nothing below is a design decision — those are Joe-gated starting at G0.

---

## 1. Status in one line
FFDA has **never** been through the UX/UI methodology. It has **none** of the Track-2 files (no `UX_PERSONALITY_LOCK.md`, no `UX_IA_PROPOSAL.md`, no screen map, no `ux-flows.md`, no discovery outputs). GRIDIRON was built *before and outside* the system. This is a clean **Step 0** start, not a resume.

**Starting state (4-state taxonomy):** `FULL-BUT-TRASH` — full working app, strong engine, UI being discarded. Same state FinOps was in (the proven pattern). Engine math stays untouched; UI rebuilds screen-by-screen; reusable components map into the new IA.

**Why UXV2-6/7/8 are blocked:** methodology Hard Ban #4 — no UI code until `UX_PERSONALITY_LOCK.md` is signed off by Joe. FFDA has no lock. UXV2-6 is 3 gated steps upstream of any code. Do NOT code the live draft room until Steps 0-3 pass.

---

## 2. Findings from the 2026-07-05 audit (so the next session starts warm)

- **The 2026-06-25 EA-FC direction left ZERO surviving artifacts.** `public/on-the-block.html`, `draft-board.html`, `draft-board-tv.html` are gone from disk, from git history (`git log --all` empty), and from Downloads / auctioneer repo / scratchpad. `WORKING_STATE.md:13` calls on-the-block.html "APPROVED + LOCKED" but the file was never saved. Treat the newer direction as **unrecoverable** — reconstruct from scratch via the process.
- **The only viewable "most recent design" is the GRIDIRON set (June 4-6)** — the direction Joe superseded. Full paths (these are **demoted inputs** to the Step-B2 Reference Board, NOT the baseline, same as NASCAR's "Pit Lane"):
  - `.claude/mockups/draft-room-phone-shot.png` (live draft room, rendered)
  - `.claude/mockups/real-prep-gridiron.png` (prep screen, rendered)
  - `.claude/mockups/{draft-room-phone,live-draft-room-v1,prep-hub-phone,draft-board-phone,post-draft-review-phone,motion-system-phone}.html`
- **Anchor:** EA FC 25 ("EA FC cockpit") — methodology `:114`, `:102`. BUT G1.5 forbids one global anchor on every screen: each HERO screen (on-the-block card, multi-team board, TV hero, draft board, post-draft review) needs its OWN specific EA-FC surface, proven with real current screens on the Reference Board before any mockup.
- **Font slop flag:** GRIDIRON's **Anton is now a slop tell** — it's NASCAR's display face, and convergence across Joe's own apps is slop (methodology `:96`, `:100`). FFDA's prescribed set: **Rajdhani/Saira** (display) + **Inter Tight/Archivo** (UI) + **JetBrains/Geist Mono** (numerals). This is a Step-3 personality-lock decision, not a given.
- **Engine is strong and OUT OF SCOPE for the UX lock.** The 8 open P1 code items (pick-dedup, giant-component extraction, keeper numbering, poll backoff, connection-pill a11y, etc. — see `CODE_REVIEW_2026-06.md`) are a **separate code track**. Do not fold them into the design process. (Note: giant-component extraction of `live/client.tsx` will happen naturally when UXV2-6 rebuilds that screen — sequence it there.)
- **Doc hygiene still pending (not blocking Step 0):** BUILD_PLAN dashboard `nextItems` corrected 2026-07-05; `UI_UPGRADE_PLAN.md` (73 ln) still needs archiving to `.claude/archive/`; `FEATURES_INDEX.md` + `CODE_AREAS.md` are stale (mtime 2026-04-14, pre-GRIDIRON) — refresh AFTER UXV2-6 lands, not before.
- **Working tree had pre-existing uncommitted changes not authored in the audit session** (`board/client.tsx`, `api/leagues/route.ts`, `api/players/route.ts`, `WORKING_STATE.md`, untracked `scripts/populate-fantasypros.ts`). Branch is `master`, last commit `b16f053`. Leave those for Joe.

---

## 3. Paste-and-go for the fresh session (Step 0)

```
You are running the UX/UI universal process for fantasy_football_draft_app. Read the context, run the discovery agents, and produce the 6-part briefing. Do not proceed past G0 without Joe's approval.

## Required reads (in order)
1. C:\Users\jrasa\AI Projects\fantasy_football_draft_app\.claude\UX_OVERHAUL_KICKOFF.md  (this file — warm-start findings)
2. C:\Users\jrasa\AI Projects\dev-workflow-builder\docs\UX_UI_UNIVERSAL_EXECUTION.md
3. C:\Users\jrasa\AI Projects\dev-workflow-builder\design-system\methodology\UX_UI_METHODOLOGY.md
4. C:\Users\jrasa\AI Projects\dev-workflow-builder\docs\UX_UI_FABLE_HANDOFF.md
5. C:\Users\jrasa\AI Projects\dev-workflow-builder\docs\UX_UI_EVAL_RUBRIC.md
6. C:\Users\jrasa\AI Projects\propermuse-finops\.claude\UX_REDESIGN_STATE.md   (proven pattern, FULL-BUT-TRASH)
7. C:\Users\jrasa\AI Projects\propermuse-finops\.claude\UX_PERSONALITY_LOCK.md (canonical 8-section lock)
8. C:\Users\jrasa\AI Projects\fantasy_football_draft_app\.claude\BUILD_PLAN.md
9. C:\Users\jrasa\AI Projects\fantasy_football_draft_app\.claude\CODE_REVIEW_2026-06.md

## Run parameters
- App: Fantasy Football Draft Advisor
- Path: C:\Users\jrasa\AI Projects\fantasy_football_draft_app\
- Starting state: FULL-BUT-TRASH
- Build executor default: Opus (Fable Trial Mode opt-in per screen)

## Action sequence
1. Read all context above.
2. Run 4 parallel READ-ONLY Sonnet discovery agents: (1) UI audit vs eval rubric, (2) Backend/engine audit — what's wired vs stubbed, (3) Build-plan review — in/out of scope, (4) Methodology gap. Include the auctioneer harvest scan in agent 2 or 4 (see below).
3. Persist raw agent outputs to .claude/UX_DISCOVERY_AGENT_OUTPUTS.md.
4. Produce the 6-part briefing (UX_UI_UNIVERSAL_EXECUTION.md Step 0), including proposed per-screen EA-FC anchors.
5. End at G0: "Does this match what you wanted? Type 'go' or edits." Wait.

## Hard rules
- No UI code until UX_PERSONALITY_LOCK.md is signed off (Hard Ban #4).
- ERNIE excluded. No em/en-dashes. No AI-slop language. No slop fonts as the shipped face.
- Mockup-before-code. Per-screen anchors at G1.5 (no single global anchor).
- Plain English (Joe does not code). Recommend with reasoning at every decision point.
- No done/works/deployed claim without pasted proof. Quality Gate: C:\Users\jrasa\AI Projects\QUALITY_BAR.md
```

---

## 4. Auctioneer harvesting — DO NOT FORGET (Joe flagged 2026-07-05)

`fantasy_auction_auctioneer` (sibling repo, `C:\Users\jrasa\AI Projects\fantasy_auction_auctioneer`) is being redesigned/rebuilt and is **ahead of FFDA** in this process — it already has the worked-example `fantasy_auction_auctioneer/.claude/ux-flows.md` (methodology `:232`). Joe expects **"a LOT of good reusable components"** there — "won't be exactly the same build, but definitely a lot."

**Where it slots (so it isn't done prematurely or forgotten):**
- It is **code repurpose**, independent of FFDA's design lock. Starting FFDA's design fresh costs none of these components.
- **Step 0 discovery** — Agent 2 (backend/engine) or Agent 4 (methodology gap) does a *first-pass scan* of what auctioneer has that maps over (draft card, board, feed/poll hooks, trash-talk, state machine). Just an inventory, not a port.
- **Step 1 (IA proposal) repurpose list** — name the auctioneer components that map into FFDA's new IA.
- **Step 4 (per-screen build sessions)** — actual adaptation happens screen-by-screen, pulling from (a) the shared floor primitives at `dev-workflow-builder/design-system/primitives/` and (b) auctioneer's rebuilt app components.

**Open task (carry until done):** a focused auctioneer component inventory feeding Step 1's repurpose list. If Step 0's discovery scan is thin, run this as its own read-only pass before/at Step 1. **Not a blocker for Step 0.**

---

## 5. First gate
G0 (briefing approval) is the first Joe gate. Nothing past discovery happens without his "go." No design decisions are pre-made in this doc.
