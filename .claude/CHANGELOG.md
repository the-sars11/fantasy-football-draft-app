# Changelog — FFIntelligence

All notable changes tracked here with root cause analysis.

---

## 2026-04-14

### [CHORE] Enterprise dev system upgrade
**Task:** Upgrade `.claude/` to Enterprise tier per overhaul plan
**Scope:** `.claude/` directory only — no `src/` code touched

**Root Cause:** FFI's ad-hoc dev docs were missing navigation indexes, audit trail, review lenses, hooks, and skills that dev-workflow-builder generates at Enterprise tier. BUILD_PLAN.md also treated commercialization as near-term when personal season hardening is the actual P0.

**Changes:**
- `.claude/FEATURES_INDEX.md`: NEW — feature-to-code mapping with tags
- `.claude/CODE_AREAS.md`: NEW — API endpoints, hooks, and key functions index with line numbers
- `.claude/CHANGELOG.md`: NEW — this file
- `.claude/REVIEW_LENSES.md`: NEW — 6 Review Lenses with pre-check + verify checklists
- `.claude/hooks/pre-commit-gate.ps1`: NEW — lint hard gate + test advisory before commits
- `.claude/skills/code-review/SKILL.md`: NEW — /code-review adversarial review skill
- `.claude/settings.json`: NEW — enterprise hook registration (180s timeout)
- `.github/workflows/ci.yml`: NEW — TypeScript CI (lint + type-check + test on push to master)
- `.claude/CLAUDE.md`: MERGED — appended PROPOSE/PATCH/VERIFY workflow, Change Classification (8 types), 6 Review Lenses triggers, Bug Hunt Schedule, Evidence-Based Output Standard, Codebase Navigation Index, Definition of Done
- `.claude/BUILD_PLAN.md`: REWRITTEN — P0-P7 structure: personal season hardening as P0, Auctioneer integration as P1, pre-season validation as P2, commercialization deferred to P3+ (CONDITIONAL with explicit gates)
- `.claude/WORKING_STATE.md`: UPDATED — enterprise sections added (Last 48h, What Works/Broken, Blockers, Sheets setup, Commands reference)

**Testing:**
- Verified git diff shows no src/ changes
- CLAUDE.md search confirmed: PROPOSE, PATCH, VERIFY, Review Lens, Bug Hunt present
- BUILD_PLAN.md confirmed: P0→P7 structure, Gate: lines on P3-P7

**Result:** ✅ Enterprise tier active
**Commit:** [see git log]

---

## Entry Types

- `[FEATURE]` - New functionality
- `[FIX]` - Bug fix
- `[REFACTOR]` - Code reorganization (no behavior change)
- `[DOCS]` - Documentation only
- `[TEST]` - Test additions/updates
- `[CHORE]` - Dependencies, config, tooling

---

## Prior Work (Summary)

Phases 0–8 complete as of 2026-03-22 to 2026-04-14. Full history preserved in `BUILD_PLAN.md` Completed Work section. Highlights:
- Phase 0-2: Foundation + data pipeline + strategy engine
- Phase 3: Live draft mode (auction + snake)
- Phase 4-5: Polish + custom scoring intelligence
- Phase 6-7.5: FFIntelligence UI redesign (Tactical Hologram) + Player Intelligence System
- Phase 8: In-season AI companion (start/sit, waiver, trade, alerts)
