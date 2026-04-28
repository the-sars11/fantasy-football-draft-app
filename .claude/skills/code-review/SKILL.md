---
name: code-review
description: Structured adversarial code review. Run before commits or at session start to review previous session's work.
---

# /code-review — Adversarial Code Review

Run a structured, adversarial review of recent changes. Designed to catch bugs, security issues, and quality problems before they ship.

## When to Use

- **Before committing** — review staged changes
- **Start of new session** — review last session's commits (fresh eyes catch more)
- **After completing a feature** — final quality check

## Step 1: Get the Diff

Run ONE of these depending on context:

```bash
# Staged changes (pre-commit)
git diff --staged

# Unstaged changes
git diff

# Last commit (new session review)
git diff HEAD~1

# Last N commits
git log --oneline -5   # pick the range
git diff HEAD~N
```

## Reviewer Mindset

**Pretend someone else wrote this code. Not you. Your worst-enemy reviewer.** Would you approve this PR, or would you leave one of those comments? Look specifically for:

- Logic that *looks* right but is wrong
- Edge cases glossed over because handling them was tedious
- Imports added and unused
- Off-by-one errors
- Copy-paste remnants from whatever pattern was cargo-culted
- Happy-path-only implementations with no error handling

Read the diff with the assumption that something IS wrong. Your job is to find it.

## Step 2: Structured Review Checklist

Review the diff against EVERY category below. Skip categories that don't apply.

### A. Correctness & Logic
- [ ] Edge cases handled (null, empty, zero, negative, boundary values)
- [ ] Off-by-one errors in loops/ranges
- [ ] Race conditions (concurrent access to shared state)
- [ ] Type mismatches or implicit assumptions between components
- [ ] Error paths tested (what happens when things fail?)

### B. Security (OWASP Top 10)
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] No SQL/command injection vectors
- [ ] Input validation at trust boundaries
- [ ] No sensitive data in logs or error messages
- [ ] File paths sanitized (no path traversal)

### C. Performance
- [ ] No N+1 queries or unbounded loops
- [ ] No blocking calls in async contexts
- [ ] Large data sets paginated or streamed
- [ ] No unnecessary re-computation (cache where appropriate)

### D. Test Coverage
- [ ] New code paths have tests
- [ ] Tests use mutation-resistant assertions (`assertEqual(expected, actual)` not `assertTrue(result)`)
- [ ] Edge cases tested (empty input, boundary values, error conditions)

### E. Overengineering Check
- [ ] No premature abstractions (code used in only one place)
- [ ] No unnecessary design patterns or wrapper classes
- [ ] Minimal diff footprint (no unrelated changes)

### F. Silent Failure Risks

Code that fails without signaling failure is the hardest bug to find — nothing crashes, nothing logs, nothing alerts. Check every one of these:

- [ ] No empty catch/except blocks (exceptions swallowed without logging or re-raising)
- [ ] All async operations awaited — missing `await` means failure is invisible to the caller
- [ ] Fire-and-forget tasks have `.catch()` / `add_done_callback()` error handlers attached
- [ ] Return values are checked when they carry success/failure info (not silently discarded)
- [ ] `subprocess` / shell calls use `check=True` or explicitly handle non-zero exit codes
- [ ] Retry loops raise or signal failure after exhaustion (not silently return `None`/empty)
- [ ] API/HTTP responses checked for error payloads, not just status codes (200 with `{"error": ...}`)
- [ ] Webhook/callback handlers return error status codes on processing failure (not always 200)
- [ ] Required env vars fail loudly at startup (not silently default to `""` or `None`)
- [ ] DB writes confirmed via commit/flush — no fire-and-forget DB mutations
- [ ] Background jobs / scheduled tasks have error reporting (not just silent exit)
- [ ] Queue/message failures are dead-lettered or logged, not silently dropped

## Step 3: Output Format

For each issue found:

```
[SEVERITY] file_path:line — Description
  Fix: Concrete code change (not "consider improving")
```

Severity levels:
- **CRITICAL** — Will cause bugs, data loss, or security breach. Must fix.
- **MAJOR** — Significant quality issue. Should fix before shipping.
- **MINOR** — Improvement opportunity. Fix if time permits.

## Step 4: Summary

```
REVIEW SUMMARY
  Files reviewed: N
  Critical: N | Major: N | Minor: N
  Verdict: PASS / PASS WITH FIXES / BLOCK

  Positive notes: [acknowledge well-implemented sections]
```

**PASS** = No critical or major issues. Safe to commit.
**PASS WITH FIXES** = Major issues found but fixable quickly. Fix then commit.
**BLOCK** = Critical issues. Do not commit until resolved.

## Rules

1. Only flag issues with >80% confidence. No nit-picking.
2. If the code is clean in a category, skip it entirely.
3. Group related issues that should be refactored together.
