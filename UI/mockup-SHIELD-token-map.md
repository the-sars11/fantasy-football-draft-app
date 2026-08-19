# Mockup → SHIELD translation map (shared, reusable)

> The 5 outsourced wireframes in `UI/mockup-*/` arrive in a generic dark palette (sky-blue + lime-green, Outfit/Geist). This file is the ONE guide for recreating any of them inside the app's LOCKED **SHIELD v4** system (`.claude/DESIGN_SYSTEM.md`) — red / white / blue. Each per-screen `DESIGN.md` references this file instead of repeating it.
>
> **Two decisions locked with Joe (2026-08-17):**
> 1. **Every green → SHIELD steel-blue.** SHIELD has no green; "success reads steel-blue." Zero new hues, palette stays locked.
> 2. **These 5 are the new keeper reference for the two unbuilt screens (D5 sim-results, D6 live-room).** The older `.claude/mockups/sim-results-v1.html` is annotated superseded.
>
> The mockups are already ~90% SHIELD: mockup ink `#EAF1F8` **is** SHIELD ink exactly; bg/surfaces/hairlines are near-identical. Translation is a few hue swaps + a font swap, not a redesign.

## Color (mockup values CONFIRMED 2026-08-17 from the 5 `figma.css` exports; SHIELD values from `src/app/globals.css`)

| Mockup token | Mockup value (real) | → SHIELD token | SHIELD value | Notes |
|---|---|---|---|---|
| primary text | `#F8FAFC` / `#EAF1F8` | `--ffi-ink` | `#EAF1F8` | mockup uses both; `#EAF1F8` is already SHIELD ink |
| secondary text | `#94A3B8` | `--ffi-ink-2` | `#9FB2C6` | |
| tertiary / muted | `#64748B` / `#5E708A` | `--ffi-ink-3` | `#5E708A` | `#5E708A` already SHIELD |
| deepest bg | `#0A0D14` | `--ffi-bg-1` | `#08101C` | near-identical |
| card / panel | `#121824` / `#182030` | `--ffi-surface-1` / `--ffi-surface-2` | `#121A28` / `#1A2637` | use SHIELD surfaces |
| lifted panel | `#202C3D` | `--ffi-surface-2` / `--ffi-surface-3` | `#1A2637` / `#26364E` | most common mockup panel |
| hairline | faint border | `--ffi-hairline` | `rgba(180,200,224,0.10)` | light-catch, NOT a gray border |
| sky-blue accent | `#38BDF8` | `--ffi-blue` | `#5FA8E0` | steel-blue = structure/info. (Mockup already uses `#5FA8E0` in places.) |
| **lime-green** (win / projected-finish / grade / value) | `#A3E635` | `--ffi-success` (= `--ffi-blue`) | `#5FA8E0` | **all green → steel-blue.** No new hue. |
| red / negative | `#EF4444` | `--ffi-danger` | `#FF6E8A` | negative / bust |
| "your action / value / the moment" | (n/a in mockup) | `--ffi-volt` | `#A63C41` | brick-red, used SPARINGLY |
| position chips QB/RB/WR/TE | uniform cyan | `--ffi-pos-*` | unchanged v3 | mockup makes them all cyan; **SHIELD keeps per-position colors** |

### Per-screen cross-check (all 5 `figma.css` + PNGs, 2026-08-17)
| Screen | Palette state | Green? | Red? | Notes |
|---|---|---|---|---|
| research-hub | **already SHIELD-toned** (`#EAF1F8`/`#5FA8E0`/`#5E708A`/`#9FB2C6`) | no | no | nearly pre-translated; still Geist fonts → swap to SHIELD families |
| player-browser | generic sky/slate | no | no | **thinner than the shipped D4 card** — mockup lacks the range bar + tier the app already has; app is AHEAD here |
| strategy-detail | generic sky/slate | yes (projected finish) | no | budget bar = cyan→**purple** gradient → single steel-blue |
| post-draft-review | generic sky/slate | yes (grade B+, value +$18, best-pick, +$ row deltas) | no | Key Pivots copy has an **em-dash** → strip on build |
| roster-pressure | generic sky/slate | yes (remaining budget, open-slot target) | yes (spent budget, LIVE pill) | budget bar = **red-spent→green-remaining** (see rule below); "Next Target" banner has an **em-dash** + is the element to REMOVE |

**Two content/semantic issues to fix on build (not color-map issues):**
- **Budget bar red/green is a semantic mismatch with SHIELD.** SHIELD red = your-action-moment, not "spent." Translate the bar to: **remaining = steel-blue fill on a muted track; spent = muted/neutral, NOT brick-red.**
- **Mockup copy contains em-dashes** (roster-pressure "Next Target", post-draft "Key Pivots"). Joe's rule is **NO em-dashes** in app copy — strip them wherever this copy is reused.

### Confirmed divergences to fix in translation (found in the real files)
- **Budget/utilization bar is a cyan→purple gradient** (`#38BDF8 → #A78BFA/#818CF8`). SHIELD is single-hue: render it **solid steel-blue**, no purple, no rainbow gradient.
- **Position chips are uniform cyan** in the mockup. Do NOT copy that — SHIELD keeps the QB/RB/WR/TE data-encoding colors (`--ffi-pos-*`).
- **Bottom-nav "Draft" uses the `Zap` bolt** in the mockup. SHIELD retired the bolt → use the **`Gavel`** for Live Draft.
- Stray one-off accents (`#A78BFA`, `#818CF8`, `#60A5FA`) appear only inside that gradient — none become a new SHIELD hue.

**Rule of thumb:** every mockup blue → `--ffi-blue`; every mockup green → `--ffi-blue`/`--ffi-success` (positive info reads steel-blue); reserve brick-red `--ffi-volt` for section HEADERS + the user's own action/value moments only, sparingly. Never introduce a green.

## Type

Confirmed from `figma.css`: **Geist** (dominant, UI + names), **Geist Mono** (all numbers), **Outfit** (a few big titles).

| Mockup font (real) | Role | → SHIELD font | SHIELD var / class |
|---|---|---|---|
| Outfit / Geist (large) | page/section titles | **Oswald, brick-red** (headers) / **Kanit** (names·stats) | `.ffi-title-red` / `.font-display` |
| Geist | body, labels, copy | **Hanken Grotesk** | `--font-saira` / `font-sans` |
| Geist Mono | prices, ranks, % | **JetBrains Mono**, tabular | `font-mono` |

**Do NOT adopt Outfit/Geist.** Keep SHIELD's four families. Numbers are always JetBrains Mono, tabular, right-aligned in lists.

## Components — reuse, do not rebuild

When a screen is eventually built, it maps onto existing primitives:
- `src/components/ui/ffi-primitives.tsx` — FFICard, FFIBadge/FFIPositionBadge, FFIProgress (the % bars), FFIGrade, FFISectionHeader, FFIButton.
- `src/components/prep/ffi-player-intel-card.tsx` — D4 player card (already has range + tier + star + expand).
- `src/components/draft/review-cards.tsx` — GradeHero, StatTile, PickCard, PositionalPowerRankings, BudgetAnalysisCard, TagAccuracyCard.
- `src/components/draft/live-room/*` — on-the-block-card, budget-strip, my-team-roster (RosterRow), bottom-nav, scoped `theme.ts`.
- `src/components/draft/ffi-player-card.tsx` — the tap-star / target interaction Joe LOVES; keep exactly.

## Capturing assets from Figma (free mode — no HTML export)
Free-tier Figma cannot export HTML. For each screen drop TWO files into its folder:
- **`screen.png`** — right-click the frame → Copy/Paste as → Copy as PNG, save as `screen.png`.
- **`figma.css`** — right-click → Copy/Paste as → Copy as code → **CSS (all layers)**, save as `figma.css`.
These are the raw source-of-truth values; translate them through the color/type tables above when building. (There is no `code.html`.)

## Status flags used in the per-screen DESIGN.md files
- **BUILT** — exists in the app today.
- **NEW** — not built yet.
- **CHANGE** — modify something that exists.
