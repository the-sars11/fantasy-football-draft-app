---
name: plan-health
description: Runs an objective health, maturity, and alignment audit of this project's BUILD_PLAN.md against a 7-dimension rubric and returns a scored report.
---

# /plan-health - Build-Plan Health Audit

Score this project's `BUILD_PLAN.md` objectively against a fixed 7-dimension rubric. This is a THINKING pass, not a Doing pass - it judges an existing plan, it does not edit it. Every check is a yes/no against the file, not a vibe. Run it, get a number out of 14, and use that number to decide what happens next.

## When to Use

- Before a build push on a plan you are unsure about
- At a Re-Plan checkpoint, to confirm the plan earned another run of Doing sessions
- When onboarding an existing or brownfield repo that never had a plan-health pass
- When outcomes have been inconsistent and you need to know if the plan itself is the problem

## Step 1: Read the plan and its supporting state

```bash
cat BUILD_PLAN.md
cat WORKING_STATE.md      # may not exist on first run
cat DECISION_LOG.md       # may not exist on first run
git log --oneline -20     # cross-check claimed-done work against real history
```

Read all four before scoring anything. The rubric below leans on WORKING_STATE and git log to catch cards marked done that are not, and cards marked open that are already done.

## Step 2: Score each of the 7 dimensions

Score every dimension 0, 1, or 2 using the table below. Do not average or estimate - walk every open card in the plan and apply the check in the rightmost column before assigning a score.

| Dimension | 0 (red) | 1 (yellow) | 2 (green) | How to check |
|-----------|---------|-----------|-----------|--------------|
| **North-Star alignment** | items exist with no traceable "why" | most trace, some orphans | every open item traces to a NORTH_STAR requirement | read each open card; find its north-star line |
| **Scope maturity** | Doing cards contain open judgment calls | a few unresolved | every Doing card passes the Scoping Gate (zero open decisions) | apply the one-line scoping test to each Doing card |
| **Session-boundedness** | items too big for one window, no size stated | sizes stated, some optimistic | every card has an honest S/M/L with a window-fit reason | check each card has Size + reason |
| **Dependency order** | items blocked by later items; no DEPENDS ON | mostly ordered | strict dependency order; nothing starts before its deps are `[x]` | walk the Phase->Session map top to bottom |
| **Model assignment** | no model per card, or obvious mismatches | models set, a few wrong tier | every card names the right tier per Model Sizing | check each card's Model vs the work it describes |
| **Cleanliness** | done work not checked off; WORKING_STATE stale; duplicates | mostly current | closed phases archived, WORKING_STATE matches reality, no orphan/dupe items | diff the plan against WORKING_STATE + git log |
| **Definition quality** | cards have goals but no success criterion | most have criteria | every card has a concrete test / acceptance check | check each card's Tests + Exit line |

## Step 3: Sum the score and read the band

Add the 7 dimension scores. Max 14.

- **12-14 (green).** Plan is healthy. Execute with confidence - no Re-Plan session needed before the next Doing run.
- **8-11 (yellow).** Plan has real gaps. Run one Re-Plan Thinking session to close the red/yellow dimensions before authoring more Doing cards.
- **0-7 (red).** Plan is not fit to build from. Stop building. Run a full KICKOFF-in-miniature before any further Doing session touches this plan.

## Step 4: Output format

Produce a short report, not a rewrite of the plan:

```
PLAN HEALTH REPORT  <project> @ <date>
  Score: N / 14  (band: GREEN | YELLOW | RED)

  Dimension scores:
    North-Star alignment:   N/2
    Scope maturity:         N/2
    Session-boundedness:    N/2
    Dependency order:       N/2
    Model assignment:       N/2
    Cleanliness:            N/2
    Definition quality:     N/2

  Red/yellow dimensions and the specific cards that failed each:
    <dimension> - <card id/title> - <one-line reason>
    <dimension> - <card id/title> - <one-line reason>

  Next step: <execute as-is | run one Re-Plan session | run a full KICKOFF>
```

This report is the input to the next Thinking session. Hand it directly to that session rather than re-deriving the gaps from scratch.

## Note on model

This is a model-judgment pass, not a mechanical linter. Run it on Opus. Dimensions like North-Star alignment and scope maturity require reading each card against the product vision and recognizing a buried judgment call, not pattern-matching a checkbox. A weaker model will under-score or over-score cards it cannot actually evaluate.
