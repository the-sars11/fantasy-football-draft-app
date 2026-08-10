# FFIntelligence — AAA Visual Upgrade Plan ("Stadium Primetime")

> Canonical reference for the **UX** sprint track in `BUILD_PLAN.md`.
> Design tokens/classes live in `DESIGN_SYSTEM.md` v2.0. Implemented in `src/app/globals.css`.
> Approved by Joe 2026-06-02. Direction: **Stadium Primetime** · backgrounds: **atmospheric CSS renders** · rollout: **foundation, then screens**.

## Context

The app is functionally hardened (P0/P1 ~complete) but the visual layer read ~7.5/10: no background imagery, the intended premium fonts never actually loaded, cards used gray 1px borders that violated the app's own "No-Line Rule", dated italic rank numbers, and lime overused as a generic CTA. This track takes it to AAA — pulling the proven premium treatments from the NCAA Wrestling app (layered fuzzy backgrounds, glassmorphism, metallic gold moments, tasteful motion) and grounding them in 2026 dark-glassmorphism + data-density research — built in sprints inside the PROPOSE/PATCH/VERIFY dev system.

## Direction (locked)

- **Stadium Primetime:** keep dark navy + Gridiron Blue *structure*; add NCAA arena depth (atmospheric backgrounds + spotlight glows + grain + glass); **metallic GOLD = the moment** (your pick, draft complete, grade hero, on-the-clock); **electric GREEN demoted to value/steal/success only**. Reads like NFL primetime broadcast while keeping the data/intelligence feel.
- **Atmospheric backgrounds:** blurred abstract stadium-light / field-turf gradients + spotlight glows + film grain, built CSS-first (zero photo-licensing risk, fully tunable; entirely code-side / Joe's domain). Optional WebP textures later.
- **Foundation, then screens:** UX-1 lifts the whole app globally; UX-2..6 take individual screens to AAA.

## Research anchors (2026, 12–18 mo window)

- Dark glassmorphism is the premium aesthetic — applied surgically; blur 10–20px, low-opacity dark fill, faint white ~8–10% light-catch hairline (also the a11y boundary), shadow `0 8px 32px rgba(0,0,0,0.36)`, internal scrim. Film grain on a top layer, not behind blur.
- Data-dense lists: tight 4/8/12px spacing, tabular mono numbers right-aligned, two-color hierarchy, group separation by spacing not borders, sticky filters, expandable rows, density modes.
- Live-draft UX: fast, scannable, informed-without-overload; prominent on-the-clock state.
- Competitor bar: Underdog polish + Sleeper clarity, without the cramped-desktop trap.

## Sprint Track

### UX-1 — Stadium Primetime Foundation (global) — ✅ DONE 2026-06-02
- [x] UX-1.1 `DESIGN_SYSTEM.md` v2.0 (supersedes v1.2) + this plan + spec addendum
- [x] UX-1.2 `globals.css` gold ramp + value-green token + effects; blue/surface names kept stable
- [x] UX-1.3 Load Space Grotesk / Manrope / JetBrains Mono via `next/font`; drop Inter (verified live on :3003)
- [x] UX-1.4 Atmospheric background system (`stadium-atmos` + `atmos-grain` + `atmos-clock` tint) in `app-shell.tsx`
- [x] UX-1.5 Glass system → 3 tiers + light-catch hairline; all card gray borders removed; scrim utility
- [x] UX-1.6 Button system: `.ffi-btn-primary` (blue), `.ffi-btn-hero` (gold), `.ffi-btn-value` (green); `FFIButton` variants
- [x] UX-1.7 Motion: `.ffi-animate-reveal` (scale + gold flash), `.ffi-animate-stagger`; reduced-motion guards
- Also: active nav accent shifted lime → gold (the spotlight follows where you are).

### UX-2 — Live Draft Room (hero screen) — ✅ DONE 2026-06-03 · ⬆️ Opus elevation 2026-06-03
- [x] UX-2.1 On-the-clock `atmos-clock` spotlight + AUCTION/SNAKE mode badge
- [x] UX-2.2 Pinned quick-entry bar → gold Record button, glass-heavy
- [x] UX-2.3 Your-pick gold rail + gold name; `.ffi-pick-flash` gold glow on newest pick
- [x] UX-2.4 Connection pill + trash-talk feed restyled to v2.0
- **Opus elevation (2026-06-03):** Sonnet's UX-2 was a competent token-swap that missed the design-judgment core. Fixed: (1) the spotlight pulsed for the *entire* draft (`status !== 'completed'`), devaluing gold-as-the-moment — re-wired to a true `onTheClock` signal (snake: `current_manager` is you; auction: a player is on the block) via `body.ffi-on-the-clock`; (2) added the missing **on-the-clock HERO banner** (`.ffi-onclock-banner` — gold light-catch + breathing spotlight glow + Framer spring reveal); (3) completed the recolor Sonnet left behind — `--ffi-accent`/`--ffi-success` (both lime `#39ff14`) → blue for structure (StrategyPicker, MySquad Target) + `--value-green` for "Roster complete!"; (4) replaced a forbidden gray `--ffi-border` hairline with a white light-catch one. Visual-only (reads existing state). Verified live on snake + auction sessions at 1280 + 390; type-check / lint / 27 tests green.

### UX-3 — Draft Board / Player Pool (data-dense) — ✅ DONE 2026-06-03
- [x] UX-3.1 Rank → bold Space Grotesk (gold top-tier / blue rest); kill italic-30%
- [x] UX-3.2 Tabular JetBrains Mono numbers right-aligned; two-color hierarchy; spacing not borders
- [x] UX-3.3 Position badges → palette; sticky filter header; row-density modes; skeleton loaders

### UX-4 — Prep Hub + Configure / Strategies
- [ ] UX-4.1 Hub cards `glass-interactive` + gold hover; menu/layout cleanup
- [ ] UX-4.2 Glow-focus form inputs (NCAA pattern) for league config + strategy editor

### UX-5 — Post-Draft Review + Celebration
- [ ] UX-5.1 Grade hero metallic gold; timeline pick cards v2.0
- [ ] UX-5.2 Confetti on reveal; card-as-hero shareable

### UX-6 — Cross-cutting polish + QA gate
- [ ] UX-6.1 Empty states + skeletons across remaining screens
- [ ] UX-6.2 WCAG ≥4.5:1 contrast pass; reduced-motion audit
- [ ] UX-6.3 Background-layer performance (GPU promote); arm's-length mobile re-test (ties FF-269/FFT-008)
- [ ] UX-6.4 Before/after screenshot set

## Verification (per sprint)

Dev server `localhost:3003`. Before/after screenshots at 390px (mobile) + 1280px (desktop) for every touched screen; clean console; `npm run build` + `test:run` + `lint` clean; mark `[x]`, update `WORKING_STATE.md` + `CHANGELOG.md`, commit + push.

> **UX-1 verification:** type-check clean, 27/27 tests pass, changed files lint clean, `globals.css` brace-balanced; font swap confirmed live on the running :3003 server (Space Grotesk + Manrope + JetBrains served; Inter font absent). Full `next build` to be run when port 3003 is free (a parallel dev server held `.next`).

## Guardrails

- **Visual-only track** — no engine/data/logic changes. Flag + re-propose separately if a screen needs a logic fix.
- **Token stability** — blue + surface token *names* stay stable; we changed values/meaning (gold added, green demoted), not the whole map.
- **No new Claude API spend** — UI/CSS/component work only.
- **NCAA firewall** — generic visual technique transferred, never NCAA identity/branding/content.
