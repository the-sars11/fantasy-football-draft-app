# FFIntelligence Design System — "GRIDIRON"

> **Status: LOCKED** — Do not modify palette, typography, or core tokens without Joe's explicit approval.
> **Version:** 3.0 (2026-06-04)
> **Supersedes:** v2.0 "Stadium Primetime" (rejected 2026-06-04 as generic AI slop; archived in Version History).
> **Direction chosen by Joe** from a 10-app reference review: **EA Sports FC Ultimate Team energy + Linear discipline.**
> **Track:** BUILD_PLAN `UX-V2`. Implemented in `src/app/globals.css` + `src/app/layout.tsx`.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0-1.2 | 2026-03 / 04 | Tactical Hologram (lime accent) |
| 2.0 | 2026-06-02 | Stadium Primetime (navy + glass + gold "moment") — **REJECTED 2026-06-04 as generic AI slop** |
| **3.0** | **2026-06-04** | **GRIDIRON: colorful-dark canvas + volt/electric-blue SET palette, broadcast type (Anton/Saira), performant (no backdrop-filter stacks), auction co-pilot components. Built UXV2-2.** |

## Creative North Star — GRIDIRON

The app should feel like an **EA Sports FC Ultimate Team menu run with Linear's discipline**: bold and confident where the draft is *live*, ruthlessly clean everywhere else. A deep, **colorful-dark** arena (not flat black, never light), one tight accent system, broadcast-weight typography, and player cards as hero objects. It must have a **point of view** — the opposite of the no-opinion dark-glass-gradient default that was rejected.

**Key principles**
- **One committed point of view.** Bold where live (EA FC), disciplined elsewhere (Linear). Never the mushy middle.
- **Color carries meaning, on a SET palette.** Volt = the moment / value / your action. Electric blue = structure / info / depth. Nothing decorative, never a rainbow.
- **Colorful-dark, with depth.** The dark itself has hue (blue + violet + faint turf-green lit depth). Never flat black, never light mode.
- **Type and numbers are craft.** Heavy broadcast display + tabular mono numbers.
- **Performance is design.** Solid layered surfaces + box-shadow glows + transform/opacity motion. NO stacked `backdrop-filter: blur()` (it killed the old build's perf and screenshots).

---

## Color Palette (SET — do not add hues)

```
/* Colorful-dark canvas (depth via layered radial glows, never flat black) */
--ffi-bg-0:        #05080F   /* deepest */
--ffi-bg-1:        #080D18   /* app base */
--ffi-surface-1:   #0C1322   /* lifted panel */
--ffi-surface-2:   #111A2E   /* card */
--ffi-surface-3:   #16223A   /* raised / hero */
--ffi-hairline:        rgba(150,180,255,0.10)   /* light-catch edge */
--ffi-hairline-bright: rgba(180,205,255,0.18)

/* VOLT — the moment / value / your action ONLY (on-the-clock, your max, CTAs, steal, your pick) */
--ffi-volt:        #8BFF45   --ffi-volt-deep: #5FE21F   --ffi-volt-ink: #0a1f02
--ffi-volt-glow:   rgba(139,255,69,0.32)

/* ELECTRIC BLUE — structure / info / depth (nav, links, secondary, AI read, crest) */
--ffi-blue:        #4D82FF   --ffi-blue-bright: #79A6FF
--ffi-blue-glow:   rgba(77,130,255,0.28)

/* Text */
--ffi-ink:   #EAF1FF   --ffi-ink-2: #9FB0CE   --ffi-ink-3: #637396

/* Position chips — MUTED on purpose (never loud, never rainbow) */
--ffi-pos-qb: #FF6E8A   --ffi-pos-rb: #56E0A0   --ffi-pos-wr: #6CA8FF   --ffi-pos-te: #FFB05C

/* Semantic (reuse volt/blue where possible) */
--ffi-warning: #FFB05C   --ffi-danger: #FF6E8A
```

**Meaning rule (enforce everywhere):**
- **Volt** — the moment + value + the user's own action: on-the-clock, your max bid, primary CTA (Record Pick), a steal, your pick, active nav, positive delta.
- **Electric blue** — structure: nav, info, AI-read panel, secondary data, depth highlights.
- **Muted position chips** — QB/RB/WR/TE identity only, small.
- **One iridescent sheen** rides the hero card edge — that is *texture*, not a fourth color.
- **NO gold. NO rainbow. NO decorative color.**

---

## Typography (no blur, big confidence)

Loaded via `next/font/google` in `layout.tsx`:
```
Anton            → broadcast hero (player names, big stats, verdicts)   .font-display
Saira Condensed  → labels, section heads, mode badges (uppercase)       .font-cond / .font-label
Saira            → body + UI (default app font)                          .font-body / font-sans
JetBrains Mono   → EVERY number (budgets, prices, ranks), tabular        font-mono
```
- All numbers: JetBrains Mono, `tabular-nums`, right-aligned in lists.
- Labels: Saira Condensed, uppercase, wide letter-spacing.
- Hero moments: Anton, large, tight leading.

---

## Canvas & Atmosphere (performant)

One fixed, full-bleed colorful-dark layer behind content. Layered radial glows + a vertical gradient. **No animated blur, no grain-behind-blur, no stacked filters.**
```css
body background:
  radial-gradient(... at 22% -6%, rgba(77,130,255,0.16), transparent 58%)   /* blue light */
  radial-gradient(... at 92% 6%,  rgba(139,255,69,0.07), transparent 55%)    /* faint turf */
  radial-gradient(... at 50% 120%, rgba(120,80,255,0.10), transparent 60%)   /* violet depth */
  linear-gradient(180deg, #060A14, #04060D)
```
On-the-clock: brighten the top blue/turf glow + a slow `filter: brightness` pulse (reduced-motion → static). No spotlight blur layers.

---

## Surfaces, Glass & Cards (light-catch, NOT blur)

The "No-Line Rule" holds: boundaries from tonal shift + a light-catch hairline (white-blue ≤18%), **not** gray borders and **not** backdrop-blur.
```css
.ffi-card          { background: var(--ffi-surface-2); border:1px solid var(--ffi-hairline);
                     box-shadow: 0 8px 32px rgba(0,0,0,.36), 0 0 15px var(--ffi-blue-glow)/.4; border-radius: 16px; }
.ffi-card-interactive:hover { transform: translateY(-2px); border-color: var(--ffi-hairline-bright); }
.ffi-hero          { background: layered blue+volt radial over surface-3; border: hairline-bright;
                     + ::before iridescent sheen sweep (texture). }
```
Old `.ffi-glass*` / `.glass-*` names are KEPT but re-skinned to solid layered surfaces (no `backdrop-filter`).

---

## Auction Co-Pilot Components (the live draft room)

> **Product model:** live IN-PERSON auction. The app does NOT bid. It (1) advises and (2) records results. No bid stepper, no "Place Bid".

- **`.ffi-hero` (On The Block):** player as a hero card — position chip + Anton name + meta + stat row (Proj/ADP/PosRank/VONA) + iridescent edge.
- **Decision block:** `BID UP TO $X` (volt, the hero number) + value note; market column (Est. cost / Budget / Spend cap).
- **`.ffi-record` (Record Sale):** price stepper + winner select + full-width volt `Record Pick` button. This replaces "Place Bid".
- **`.ffi-feed` (broadcast lower-thirds):** sold rows — muted position chip + Saira Condensed name + mono price + manager; newest gets a volt left rail.
- **AI Read:** electric-blue panel, dry declarative copy, mono confidence %.

---

## Buttons (meaning-driven)

```css
.ffi-btn-hero     /* VOLT gradient, --ffi-volt-ink text — the moment: Record Pick, Start Draft, Confirm */
.ffi-btn-primary  /* ELECTRIC BLUE gradient, white — structure/default action */
.ffi-btn-value    /* VOLT — value/steal confirmation (same family as hero; use hero for primary commits) */
.ffi-btn-secondary/* surface-1 + hairline ghost */     .ffi-btn-ghost /* text ghost */
```
44px min touch target, `:active` press feedback, reduced-motion guards.

---

## Motion (FIRST-CLASS — this is half of "AAA")

Motion is a primary pillar, not polish. The bar is Family (fluid, weighted, nothing just appears) + EA FC (cinematic moments) + Linear (crisp, never gratuitous). Tech: Framer Motion + View Transitions API (`src/lib/view-transition.ts`) + CSS `@property`. Named curves: `--ease-broadcast` (wipes), `--ease-spring` (reveals/pops), `--ease-standard` (UI).

**Signature moments (cinematic):**
- On-the-clock: hero card spring-in (scale 0.9->1), canvas glow brightens + breathes, one-shot volt edge sheen, "Bid Up To" counts up.
- Pick lands: feed row wipes in (broadcast lower-third) + sheen, list springs down, price counts up.
- Steal: volt flash on the row, small burst for a big one.
- Record Pick: button depress + volt glow ring, player morphs into the squad slot (shared element), budget ticks down, slot pops.
- Draft complete: grade hero spring-in, volt ring sweep, Anton verdict word snap, confetti.

**Transitions (continuity):** Board->Live morphs the tapped player card into the on-the-block hero (View Transitions / `layoutId`). Tabs/routes spring cross-fade, never a hard cut.

**Micro (everywhere, Linear-crisp):** button press scale+glow, card lift, stepper number roll, filter-pill slide. Numbers tick + flash on change (volt=value, blue=info), tabular so zero layout shift. Lists cascade-in + FLIP reorder.

**Discipline (elegant, not exhausting):** cinematic on the moments; routine picks get a ~200ms acknowledgment only (a fast auction must not become a fireworks show). Reserve celebration for the user's picks, steals, and the finish.

**Perf + a11y (non-negotiable):** transform / opacity / box-shadow only (no layout thrash, no blur) so it stays smooth on a phone during rapid-fire input. Every animation collapses under `prefers-reduced-motion`.

---

## What NOT to Do

- **NO gold, NO glassmorphism-as-everything, NO gradient-glow wallpaper** (that was the rejected slop).
- **NO stacked `backdrop-filter: blur()`** — solid layered surfaces + box-shadow only.
- **NO rainbow** — volt + blue + muted position chips, period.
- **NO flat black and NO light mode** — colorful-dark only.
- **NO bidding UI** in the auction room — advise + record results only.
- **NO em-dashes, NO emojis** in any rendered copy (ESLint dash guard stays).
- **NO HTML tables for player lists** — card/row layouts.

---

## Implementation Notes

- Re-skin in place: keep existing class/token NAMES (`.ffi-card`, `.ffi-btn-*`, `--ffi-primary`, etc.) so all screens shift at once; map their VALUES to the GRIDIRON palette.
- `globals.css` `@theme inline` registers Tailwind utilities; `:root`/`.dark` hold raw vars for inline styles.
- Reference mockup (source of truth for the look): `.claude/mockups/draft-room-phone.html`.
- Verify on a real phone width + reduced-motion; confirm screenshot-able (the old build was not).
