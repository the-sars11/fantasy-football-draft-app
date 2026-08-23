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

> Reference: `DESIGN_SYSTEM.md` SHIELD v4.0/4.1 (LOCKED). SHIELD is a navy-steel broadcast cockpit: one disciplined brick-RED that only ever means "act now", steel-blue as the everyday structure color, chrome-silver readouts, on a navy-steel FIELD. The legacy volt-green and all gold are removed from the palette.

**Pre-check (PROPOSE):**
- [ ] Does this UI build with the SHIELD component contract (`src/components/ui/shield.tsx`): cards are `<Nameplate>` / `<Nameplate interactive>`, page headline `<PageTitle>`, chrome title `<CardTitle>`, icon chip `<IconChip>`, canvas `<ShieldBackground>`? Never raw `.ffi-card`, never shadcn `Card`, never an inline `bg-[#...] border` div.
- [ ] Does color carry meaning on the SET palette: brick-RED (`#A63C41` body, `#C25A5E` Oswald headers) reserved for headers plus the moment/value/user action and used sparingly in the body; steel-blue (`#5FA8E0`) for structure/info/depth; chrome-silver ink for names and stat readouts? No new color literals.
- [ ] Does it meet the one-thumb mobile usability standard (NORTH_STAR criterion 5)?

**Verify (VERIFY):**
- [ ] All color is inline `var(--ffi-*)` / rgba tokens: zero hardcoded structure hex, zero shadcn `Card`, zero `blur-3xl` wallpaper, no off-token color literals (no legacy volt-green, no gold, no non-SHIELD blue). Grep the touched files clean.
- [ ] Type is on-system: Oswald brick-red headers (`.ffi-title-red`), Kanit for names/stats/labels, Hanken Grotesk for body and UI. Numbers use `tabular-nums`.
- [ ] Boundaries follow the No-Line Rule: tonal shift plus a cool-steel hairline (<=18%), not gray borders, not backdrop-blur. The navy FIELD (`.stadium-atmos`) is present (inherited from `app-shell.tsx` for the `(app)` group; the `(auth)` group must mount it explicitly).
- [ ] Tested on mobile viewport; 44px minimum touch targets on all interactive elements.

---

## Ops Lens

**Pre-check (PROPOSE):**
- [ ] Is there a rollback path if this Vercel deploy fails?
- [ ] Does this change require a Supabase migration?

**Verify (VERIFY):**
- [ ] Deploy is reversible (prior commit can be re-deployed)
- [ ] Migration is idempotent and tested locally
- [ ] No new required env vars without updating `.env.example`
