# Review Lenses — FFIntelligence

Six lenses applied during PROPOSE (pre-checks) and VERIFY (completion checklist).

## Lens Reference

| Lens | Focus | Triggered By |
|------|-------|-------------|
| Architecture | Module boundaries, coupling, data flow | pipeline, shared, schema |
| QA | Test coverage, edge cases, regressions | ALL change classes |
| Security | Auth, input validation, secrets, OWASP | pipeline, schema, infra |
| Delivery | Output quality, formatting, completeness | output, prompt, docs |
| Design | UI/UX consistency, accessibility | output (if UI) |
| Ops | Deploy safety, rollback, monitoring | infra, schema |

---

## Architecture Lens

**Pre-check (PROPOSE):**
- [ ] Will this change cross module boundaries in a new way?
- [ ] Are there circular dependencies introduced?
- [ ] Does data flow remain unidirectional where required?

**Verify (VERIFY):**
- [ ] Module boundaries respected
- [ ] No new coupling introduced
- [ ] Data flow diagrams in ARCHITECTURE.md still accurate

---

## QA Lens

**Pre-check (PROPOSE):**
- [ ] What test file covers this code path?
- [ ] What edge cases exist (null, empty, boundary)?
- [ ] Can this break existing tests?

**Verify (VERIFY):**
- [ ] All existing tests still pass (`npm run test:run`)
- [ ] New code paths have test coverage
- [ ] Edge cases tested

---

## Security Lens

**Pre-check (PROPOSE):**
- [ ] Does this touch auth, sessions, or API keys?
- [ ] Is any user input passed to a database or shell?
- [ ] Are any secrets exposed in logs or responses?

**Verify (VERIFY):**
- [ ] No hardcoded secrets
- [ ] Input validation at trust boundaries
- [ ] No sensitive data in logs or error messages

---

## Delivery Lens

**Pre-check (PROPOSE):**
- [ ] Is the output format (prompt, report, UI) specified?
- [ ] What does "correct" output look like?

**Verify (VERIFY):**
- [ ] Output matches specified format
- [ ] No fabricated data in LLM outputs
- [ ] Sources cited where required

---

## Design Lens

**Pre-check (PROPOSE):**
- [ ] Does this UI change match DESIGN_SYSTEM.md (Tactical Hologram)?
- [ ] Does it meet the one-thumb mobile usability standard (NORTH_STAR criterion 5)?

**Verify (VERIFY):**
- [ ] Visual matches DESIGN_SYSTEM.md tokens (colors `#8bacff`/`#2ff801`/`#031018`, typography Space Grotesk/Manrope, no 1px borders)
- [ ] Tested on mobile viewport
- [ ] 44px minimum touch targets on all interactive elements

---

## Ops Lens

**Pre-check (PROPOSE):**
- [ ] Is there a rollback path if this Vercel deploy fails?
- [ ] Does this change require a Supabase migration?

**Verify (VERIFY):**
- [ ] Deploy is reversible (prior commit can be re-deployed)
- [ ] Migration is idempotent and tested locally
- [ ] No new required env vars without updating `.env.example`
