# FFIntelligence Design System — "Stadium Primetime"

> **Status: LOCKED** — Do not modify palette, typography, or core classes without Joe's explicit approval.
> **Version:** 2.0 (2026-06-02)
> **Supersedes:** v1.2 "Tactical Hologram" (archived in Version History below).
> **Track:** `.claude/UI_UPGRADE_PLAN.md` (UX sprint track). Implemented in `src/app/globals.css`.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-22 | Initial Tactical Hologram token lock |
| 1.1 | 2026-03-22 | Migration checklist + Tailwind usage patterns |
| 1.2 | 2026-04-14 | P0 redesign patterns: pinned entry bar, draft mode selector, connection status, keeper row markers |
| **2.0** | **2026-06-02** | **Stadium Primetime: atmospheric backgrounds, real font loading, gold "moment" accent, green demoted to value-only, light-catch glass, motion reveal. Built UX-1.** |

## Creative North Star — Stadium Primetime

The app should feel like **NFL primetime broadcast graphics**: a dark stadium-night arena, lit from above by a warm spotlight, with cool ambient field light and a faint turf glow. Structure and data are rendered in cool **Gridiron Blue**; the big **moments** (your pick, draft complete, the grade hero, the champion) glow in warm **metallic gold**; and **value** (a steal, a positive ADP delta, success) reads in **electric green**. Surfaces are light-emitting glass suspended in an atmospheric void — never flat panels on a flat page.

**Key principles**
- **Color carries meaning:** Blue = structure/action. Gold = the moment/focal point. Green = value/steal/success. Never decorative.
- **Lit, not filled:** every surface reads as lit (spotlight, ambient glow, light-catch hairline), not a solid fill.
- **Surgical glass:** glassmorphism for panels/nav/overlays, not everything.
- **Atmosphere first:** a fixed, layered, fuzzy stadium background under all content.
- **Premium restraint:** depth and warmth over neon overload.

---

## Color Palette

### Core tokens (in `globals.css` `@theme` + `:root`)
```
/* Base atmosphere (deep stadium-night navy) */
--ffi-background: #01040a;   --color-surface-dim: #031018;
--color-surface-container-low: #05151e;  --color-surface-container: #0a1b25;
--color-surface-container-high: #0f222c; --color-surface-container-highest: #142834;

/* Structure / action — Gridiron Blue */
--color-gridiron-primary / --ffi-primary: #5582e6   (bright: #8bacff)

/* THE MOMENT — Stadium Gold (your pick, draft complete, grade hero, on-the-clock, metallic names) */
--ffi-gold / --color-gold:        #e0c27a   (antique gold, primary)
--ffi-gold-bright / -bright:      #fdefb6   (highlight)
--ffi-gold-deep / -deep:          #d3c791
--ffi-gold-ink / -ink:            #383008   (text on gold)
--ffi-gold-glow:                  rgba(253,239,182,0.30)

/* VALUE / STEAL / SUCCESS only — Electric Green (demoted from generic CTA) */
--value-green / --color-value-green: #2ff801   (legacy --ffi-accent #39ff14 retained for back-compat)

/* Semantic */
--ffi-warning: #fbbf24    --ffi-danger: #ef4444

/* Text */
--color-on-surface: #deedf9   --color-on-surface-variant: #9eadb8   --ffi-text-muted: #64748b
```

**Meaning rule (enforce in every component):**
- **Blue** — navigation, primary actions, structural data, active-link structure.
- **Gold** — the focal moment only: your pick/team, pick reveal, draft-complete, grade/champion hero, "on the clock", metallic name treatments, active nav (the spotlight follows you).
- **Green** — value signals only: steal, great value, positive delta, success/confirmation.

---

## Typography

Loaded via `next/font/google` in `src/app/layout.tsx` (distinct variable names so the `.font-*` classes resolve at runtime):

```
--font-space-grotesk → Space Grotesk   (headlines, labels, numbers)   .font-headline / .font-label
--font-manrope        → Manrope          (body, default app font)        .font-body / base font-sans
--font-jetbrains      → JetBrains Mono    (stats, tabular numbers)        font-mono
--font-oswald         → Oswald            (condensed primetime display)   .font-display
```
- **Numbers in data lists:** JetBrains Mono, `tabular-nums`, right-aligned.
- Base app font is **Manrope** (warm, legible). Inter is removed.

---

## Atmospheric Background System (UX-1.4)

Two fixed, full-bleed layers behind all content (content sits at `z-10`), rendered in `app-shell.tsx`:

```html
<div className="stadium-atmos" aria-hidden="true" />   <!-- overhead gold spotlight + cool ambient + turf hint + night-navy base -->
<div className="atmos-grain" aria-hidden="true" />      <!-- film grain, top layer, ~4% overlay -->
```
- `.stadium-atmos` — layered radial gradients (warm gold at 50%/-5%, cool blue bottom-right, turf-green bottom-left) over a vertical night-navy gradient. GPU-promoted.
- `.atmos-grain` — SVG `fractalNoise` at ~4% `mix-blend-mode: overlay`. Grain is a **top** layer, never behind a blur.
- `.stadium-atmos.atmos-clock` — per-screen tint: intensifies the overhead gold spotlight + a slow brightness pulse for the live "on the clock" state (disabled under reduced-motion).

---

## Glass System (UX-1.5) — light-catch, not gray lines

The v1.2 **"No-Line Rule"** still holds: no gray 1px structural borders. Boundaries come from tonal shift + blur + a **light-catch hairline** (translucent white ≤10%, the spec's permitted ghost border).

```css
.ffi-glass        { background: rgba(10,27,37,0.58); backdrop-filter: blur(12px) saturate(1.1); border: 1px solid rgba(255,255,255,0.06); }
.ffi-glass-heavy  { background: rgba(5,21,30,0.72);  backdrop-filter: blur(18px) saturate(1.1); }   /* nav, pinned bar, modals */
.glass-panel      { background: rgba(10,27,37,0.6);  backdrop-filter: blur(16px) saturate(1.1); border: 1px solid rgba(255,255,255,0.06); }
.glass-interactive{ /* + hover: lift, gold edge rgba(253,239,182,0.35), gold ambient glow */ }
.ffi-scrim        { linear-gradient(180deg, transparent, rgba(1,4,10,0.35)); }   /* legibility over busy bg */
```
**Cards** (`.ffi-card`, `.ffi-card-elevated`, `.ffi-card-interactive`) now use the hairline + `0 8px 32px rgba(0,0,0,0.36)` shadow; interactive hover lifts with a **gold** light-catch edge (was lime).

---

## Buttons (UX-1.6) — meaning-driven

```css
.ffi-btn-primary  /* BLUE gradient #5582e6→#3f63c4, white text — structure/action (default) */
.ffi-btn-hero     /* GOLD gradient #fdefb6→#e0c27a→#d3c791, #383008 text — commit moments (Record Pick, Start Draft, Confirm) */
.ffi-btn-value    /* GREEN gradient #39ff14→#2de210, black text — value/steal/positive confirmation */
.ffi-btn-secondary/* glass ghost */     .ffi-btn-ghost /* text ghost */
```
`FFIButton variant="primary" | "hero" | "value" | "secondary" | "ghost"`. All keep 44px mobile touch targets + `:active` press feedback + reduced-motion guards.

---

## Motion (UX-1.7)

Spring easing `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- `.ffi-animate-reveal` — pick/moment reveal: scale 0.85→1.05→1 **+ gold flash** (`ffi-reveal` + `ffi-gold-flash`). Use on confirmed-pick / hero reveals.
- `.ffi-animate-stagger` — list entrance fade-up.
- Existing: `.ffi-animate-expand/-grade/-success/-attention/-trash-talk`. All disabled under `prefers-reduced-motion`.

---

## Component Patterns (still current)

The v1.2 P0 component patterns remain valid under v2.0 — apply the new palette/glass/buttons to them:
- **Pinned Quick-Entry Bar (FF-257)** — `ffi-glass-heavy`; Record button becomes `.ffi-btn-hero` (gold).
- **Draft Mode Selector (FF-258)** — selected card edge shifts to gold; "Start Draft" = `.ffi-btn-hero`.
- **Connection Status Pill (FF-259)** — 4-state (LIVE/STALE/OFFLINE/MANUAL) unchanged in logic.
- **Keeper Pick Row Markers (FF-274)** — 🔒 + muted name + K1/K2/K3 unchanged.
- **Player Card / Position Filters / Grade Hero / Timeline** — see `UI/*/code.html`; rank → bold Space Grotesk (gold top-tier), value → green, grade hero → metallic gold (UX-3/UX-5).

---

## What NOT to Do

**PROHIBITED classes** (in draft components): `bg-muted`, `text-muted-foreground`, `border-border`, generic `<Table>/<TableRow>` for player lists.

**PROHIBITED patterns**
- **NO gray 1px solid borders** — use tonal shift + blur + light-catch hairline (white ≤10%).
- **NO green as a generic CTA** — green = value/steal/success only; commit actions are gold, structure is blue.
- **NO film grain behind a blur** — grain is a top overlay layer.
- **NO rounded corners larger than `2xl`** — keep it tactical.
- **NO HTML tables for player lists** — card-based layouts.

---

## Implementation Notes

- Tokens registered in `globals.css` `@theme inline` (Tailwind utilities like `text-gold-bright`, `bg-gold`) and `:root` (raw `var(--ffi-gold*)` for inline styles).
- Atmospheric layers + glass are GPU-promoted; verify performance on mobile (UX-6).
- Reduced-motion: every animation + the atmos-clock pulse collapse to none.
