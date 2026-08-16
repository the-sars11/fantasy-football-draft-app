---
name: session-lifecycle
description: Emits the standard session-start and session-end prompts and runs the clean wind-down + continuation-prompt hand-off, so every session starts bounded and ends with a printed hand-off to the next one.
---

# /session-lifecycle - Clean Session Start and Wind-Down

This skill enforces bounded, context-safe sessions that never lose the thread between sessions. It emits the same two fixed prompt shapes on every repo - a session-start prompt and a session-end prompt - and runs the Clean Wind-Down Protocol at exit so the next session can start cold with no re-derivation.

## When to Use

- At the start of any build session, before touching any file.
- At the end of any build session, before signing off.

## Session Start

Run this prompt verbatim at the top of every session. It is short and high-salience on purpose - the non-negotiables come first, before any other instruction can bury them.

```
Repo: <name>. Open on <MODEL> for <Type> session <S##>.
1. Run ON START (read WORKING_STATE, this card, DECISION_LOG; re-assert toddler mode).
2. This session's scope is EXACTLY <S## scope>. Touch nothing else.
3. Halt and ask on any choice not already decided in the card. Do not invent decisions.
4. Success = <the card's success check>. You are not done until that check passes with pasted evidence.
```

Fill in `<name>`, `<MODEL>`, `<Type>`, `<S##>`, `<S## scope>`, and `<the card's success check>` from the session card in `BUILD_PLAN.md`. Do not start work until this block has been read and its scope accepted.

## Session Wind-Down

Run this prompt at the end of every session, in this order, before signing off.

```
Run ON EXIT: VERIFY with pasted evidence; mark the card; update WORKING_STATE + DECISION_LOG +
CHANGELOG; capture any discovered work via the three-step capture; commit by explicit path and push
(gitignore anything that should not ship); then print the CONTINUATION PROMPT naming the next
session's model. Do not sign off until the continuation prompt is printed.
```

Do not skip a step to save time. A wind-down that stops before the continuation prompt is printed is not finished, even if the code is committed.

### Continuation Prompt

The last act of every session is printing a fenced block the human pastes into a fresh session. It must contain exactly these four things, and nothing left implicit:

1. The repo and the exact next session card (id and title).
2. "Open this session on `<MODEL>`."
3. The two or three `WORKING_STATE.md` facts the next session needs to start cold - no more, no less.
4. The explicit first action: "run ON START, then build `<S##>` scope only."

Print it verbatim, every session end, before signing off. If the next session and model are not yet decided, decide them first - the continuation prompt cannot name a placeholder.

**Example (filled in):**

```
Repo: muse-index. Open on Sonnet for Doing session S07.
1. Run ON START (read WORKING_STATE, this card, DECISION_LOG; re-assert toddler mode).
2. This session's scope is EXACTLY the competitor-table renderer in src/reports/competitor_table.py
   and its tests. Touch nothing else.
3. Halt and ask on any choice not already decided in the card. Do not invent decisions.
4. Success = competitor_table.py renders zero all-zero rows on the fixture dataset, with
   test_competitor_table.py green. You are not done until that check passes with pasted evidence.

WORKING_STATE facts to start cold:
- S06 landed the scoring engine; competitor_table.py currently reads its output but has no tests.
- Zero rows must render as "confirmed", dashes as "not collected" - see DECISION_LOG 2026-08-10.
- Dev server is `npm run dev`, port 5173.

First action: run ON START, then build S07 scope only.
```

## Core Principle

Keep every session small enough that it never triggers a context compaction, because drift and dropped instructions come from compaction, not from bad intentions - a bounded session cannot drift from instructions it never lost.
