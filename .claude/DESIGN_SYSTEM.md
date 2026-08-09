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
| **3.1** | **2026-08-09** | **Shipped Live Auction Room (UXV2-6/7). The room ships from its own locally-scoped `theme.ts` palette (amber-gold + a brighter lime-volt, four color-coded moves), lean by construction (no framer-motion, no filters, no will-change), with a reduced-motion DIAL-DOWN policy. This is a documented, scoped departure from the global GRIDIRON tokens; the rest of the app is unchanged. See "Shipped Live Auction Room" below.** |

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

## Shipped Live Auction Room (UXV2-6/7): as-built, scoped departure

> This section documents what actually shipped in `src/components/draft/live-room/`, which intentionally differs from the global GRIDIRON tokens above. Everything in this section is scoped to the live auction room ONLY. The rest of the app (prep, board, review, shell) still uses the global palette, fonts, and motion described elsewhere in this file. Source of record for the look: `.claude/mockups/draft-room-v4-two-screen.html` (the approved v4 mockup); palette source of truth: `src/components/draft/live-room/theme.ts`.

### Why a scoped palette
The room's whole job is one at-a-glance directive: HOLD / BID / PUSH / PASS. Those four moves need four colors that read apart under arm's-length, fast-auction conditions. To get that separation the room uses its own `theme.ts` `ROOM` constant rather than the two-color global SET palette. This is deliberate and locally scoped (inline styles + the `.ffi-live-room` class), so it does not leak into or reskin the rest of the app.

### Room palette (from `theme.ts`, authoritative)
```
/* Canvas + surfaces (darker, bluer than the global tokens) */
bg      #060c14   surface #09121d   card #0d1a27   cardEl #132234
border  rgba(255,255,255,0.07)   border2 rgba(255,255,255,0.04)

/* Text */
t1 #edf4fb   t2 #7a98b4   t3 #3d5a73

/* The four color-coded moves (What-To-Do block) */
volt   #d4ff00   -> BID  (brighter lime than the global --ffi-volt #8BFF45)
gold   #f5a623   -> HOLD / target / the moment  (the room DOES use gold, on purpose)
orange #f97316   -> PUSH
red    #dc2626   -> PASS

/* Status */
live #22c55e   offline #f97316
```
- **Gold is intentional here.** The global "NO gold" rule (What NOT to Do) governs the app-wide palette; the room re-introduces a single amber gold as the HOLD / moment color because the four-move system needs it. This is the one sanctioned exception and it is scoped to the room.
- **Position badges** in the room match the app-wide position colors via `posColors()` (QB green, RB red, WR blue, TE purple, DEF/K grey).

### Performance stance: lean by construction
The room ships with essentially no heavy motion or compositing cost, and that absence is the design:
- **No framer-motion, no entrance keyframes, no persistent glows, no animating background/filter layers.** A live-DOM audit across 735 room elements found 0 CSS `filter` layers, 0 `backdrop-filter` layers, 0 animated `box-shadow` transitions, and 0 elements holding `will-change`.
- The only motion in the room is Tailwind utilities: color/opacity cross-fades and two `active:scale` transform tap-feedbacks, plus one `motion-safe:animate-pulse` LIVE dot in the status bar.
- This is why the room composites smoothly on a phone and does not reproduce the old build's heavy-filter-stack non-compositing failure. It is a deliberate contrast with the "Motion is FIRST-CLASS" cinematic section below, which describes the aspirational global system, not the shipped room.

### Reduced-motion: DIAL-DOWN, not strict-off
Per Joe's reduced-motion rule the room dials motion down rather than killing it. Scoped block in `globals.css` (guarded by `.ffi-live-room`, added right after the existing reduced-motion block):
```css
@media (prefers-reduced-motion: reduce) {
  .ffi-live-room *, .ffi-live-room *::before, .ffi-live-room *::after {
    transition-duration: 0.075s !important; /* cross-fades stay, halved from 150ms */
  }
  .ffi-live-room *:active { transform: none !important; } /* drop active:scale tap-feedback */
}
```
Cross-fades (color/opacity) are kept so state changes still read, just at half duration; the `active:scale-90/95` tap-scale is neutralized. The LIVE dot pulse is separately gated by its `motion-safe:` variant, so it stops under reduced-motion with no extra rule.

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

> **As-built note:** this cinematic motion vision describes the aspirational global system. The **shipped** Live Auction Room (UXV2-6/7) deliberately does NOT use it: it has no framer-motion and no signature-moment choreography, and it ships lean by construction. See "Shipped Live Auction Room" above for the room's actual motion (Tailwind cross-fades + `active:scale` only) and its reduced-motion dial-down policy.

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

- **NO gold, NO glassmorphism-as-everything, NO gradient-glow wallpaper** (that was the rejected slop). *(Exception: the shipped Live Auction Room uses a single scoped amber gold as its HOLD / moment color for the four-move system. See "Shipped Live Auction Room" above. That exception does not extend to the rest of the app.)*
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
- Reference mockup for the global GRIDIRON direction: `.claude/mockups/draft-room-phone.html`. The **shipped** Live Auction Room follows the later approved v4 mockup `.claude/mockups/draft-room-v4-two-screen.html`, with palette in `src/components/draft/live-room/theme.ts` (see "Shipped Live Auction Room").
- Verify on a real phone width + reduced-motion; confirm screenshot-able (the old build was not).
