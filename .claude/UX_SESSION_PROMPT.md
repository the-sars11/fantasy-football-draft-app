# UX Sprint — Universal Session Prompt

Paste the block below into a **fresh** session to do the next UX sprint of the Stadium Primetime visual upgrade. It is self-perpetuating: each session does one sprint, finishes it completely, then tells you to paste the same prompt again for the next one. Repeat until the whole UX track is `[x]`.

**Which model:** Opus for **UX-2** and **UX-5** (live draft hero + celebration — most design judgment). Sonnet for **UX-3, UX-4, UX-6** (data-density, forms, QA polish — well-specified, mechanical).

---

```
Continue the AAA visual upgrade ("Stadium Primetime") of FFIntelligence.
Repo: C:\Users\jrasa\AI Projects\fantasy_football_draft_app  (Windows: use C:\ paths + PowerShell syntax, never Mac/Linux.)

This is a self-perpetuating loop: each session does ONE UX sprint, finishes it completely (build, test, screenshots, commit, push, docs), then tells me to paste this same prompt again for the next one.

1) ORIENT - read these first, in order:
   - .claude/UI_UPGRADE_PLAN.md   (UX track + direction + guardrails)
   - .claude/DESIGN_SYSTEM.md      (v2.0 "Stadium Primetime" - the visual source of truth)
   - .claude/BUILD_PLAN.md         (find the UX track; your work is the FIRST unchecked [ ] UX sprint)
   - .claude/CLAUDE.md             (dev system: PROPOSE/PATCH/VERIFY, review lenses, Definition of Done, commit format)

2) SCOPE - do the next whole unchecked UX sprint (all of UX-2, or all of UX-3, etc.). State which one before you start. If every UX item is already [x], run a final QA pass and tell me the UX track is COMPLETE.

3) BUILD - using ONLY the v2.0 system:
   - Color meaning: BLUE = structure/action; GOLD = the moment (your pick, draft complete, grade hero, on-the-clock); GREEN = value/steal/success only.
   - Reuse existing utilities: .ffi-btn-hero / .ffi-btn-value, the 3-tier glass + light-catch hairline (never gray 1px borders), the loaded fonts (Space Grotesk / Manrope / JetBrains Mono), .ffi-animate-reveal (+ gold flash) / .ffi-animate-stagger, .stadium-atmos / .atmos-clock.
   - Recolor any leftover lime in the components you touch to the correct meaning.
   - VISUAL-ONLY: no engine/data/logic changes. If a screen needs a logic fix to look right, STOP and flag it - do not do it.
   - Mobile-first is a hard requirement: 44px touch targets, one-thumb reach, verify at 390px.

4) VERIFY - prove it, do not just claim it:
   - npm run type-check ; npm run lint (your changed files must be clean) ; npm run test:run (all pass).
   - Start the dev server (preview server name "fantasy-draft", port 3003 - if another session already holds it, reuse it, never kill it) and capture before/after screenshots at 390px (mobile) and 1280px (desktop) for every screen you touched; confirm the console is clean. If you cannot drive a preview, say so plainly instead of claiming visual verification.

5) LAND - commit directly to master with a functional prefix (feat:), one commit for the sprint, using the commit format in .claude/CLAUDE.md; push to origin master (this triggers Vercel - remind me to deploy if auto-deploy is off). Then update: .claude/BUILD_PLAN.md (mark items [x]), .claude/CHANGELOG.md (new entry), .claude/WORKING_STATE.md, and .claude/UI_UPGRADE_PLAN.md (mark the sprint done).

6) HAND OFF - report what you built, what to test on my phone, and anything you flagged. Then tell me to paste THIS SAME PROMPT for the next sprint and which model to use:
   Opus -> UX-2 and UX-5 (live draft hero + celebration; most design judgment).
   Sonnet -> UX-3, UX-4, UX-6 (data-density, forms, QA polish; well-specified, mechanical).

HALT and ask me first before: anything that costs Claude API money, destructive git ops (reset --hard, force push, deleting branches), scope beyond the visual sprint, or a design choice the v2.0 system does not already answer.
```
