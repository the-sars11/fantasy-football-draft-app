# FFIntelligence Design System — "SHIELD"

> **Status: LOCKED** — Do not modify palette, typography, or core tokens without Joe's explicit approval.
> **Version:** 4.0 (2026-08-14)
> **Supersedes:** v3.x "GRIDIRON" (volt-green + electric-blue on colorful-dark; superseded, NOT reskinned, per BUILD_PLAN D-track). Archived in Version History.
> **Direction chosen by Joe** at the D0 identity gate: **a navy-steel broadcast SHIELD** — a defensive-front, arm's-length-legible auction cockpit. Reference register: NFL broadcast lower-thirds + a defensive coordinator's tablet, not a neon arcade.
> **Track:** BUILD_PLAN `D0` (identity locked) -> `D1` (ported to the app). Implemented in `src/app/globals.css` + `src/app/layout.tsx`. Proof: `.claude/mockups/d0-craft/d1_prep_shield.png`.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0-1.2 | 2026-03 / 04 | Tactical Hologram (lime accent) |
| 2.0 | 2026-06-02 | Stadium Primetime (navy + glass + gold "moment") — **REJECTED 2026-06-04 as generic AI slop** |
| **3.0** | **2026-06-04** | **GRIDIRON: colorful-dark canvas + volt/electric-blue SET palette, broadcast type (Anton/Saira), performant (no backdrop-filter stacks), auction co-pilot components. Built UXV2-2.** |
| **3.1** | **2026-08-09** | **Shipped Live Auction Room (UXV2-6/7). The room ships from its own locally-scoped `theme.ts` palette (amber-gold + a brighter lime-volt, four color-coded moves), lean by construction (no framer-motion, no filters, no will-change), with a reduced-motion DIAL-DOWN policy. This is a documented, scoped departure from the global tokens; the rest of the app is unchanged. See "Shipped Live Auction Room" below.** |
| **4.0** | **2026-08-14** | **SHIELD: full new identity locked at the D0 gate and ported to the app (D1). Navy-steel FIELD canvas + muted brick-RED action accent (used sparingly) + STEEL-BLUE info/structure + chrome-silver titles + lifted steel-blue cards. Type -> Kanit (broadcast display) + Hanken Grotesk (UI). Icons -> duotone (red chip + white glyph); the `Zap` bolt is retired, Live Draft now carries a `Gavel`. GRIDIRON's volt-green and all gold are removed from the global palette. Token/class NAMES kept stable from v3 so all 61 screens repaint at once; only VALUES + treatments changed. Proven on `/prep`.** |

## Creative North Star — SHIELD

The app should feel like a **defensive coordinator's tablet on a broadcast night**: a dark navy-steel FIELD, chrome-silver readouts, and one disciplined RED that only ever means *act now*. Calm and structural at rest; a single hot accent when there is a decision to make. It must have a **point of view** — a defensive-front, arm's-length-legible cockpit — the opposite of the no-opinion dark-glass-gradient default that was rejected, and a clean break from GRIDIRON's neon volt-green.

**Key principles**
- **One committed point of view.** Steel and silence at rest; RED only for the moment of action. Never a second loud color competing with it.
- **Color carries meaning, on a SET palette.** Brick-RED = page/section HEADERS (Oswald) + the moment / value / your action (sparing in the body). Steel-blue = structure / info / depth (the everyday workhorse). Chrome-silver = player names + big stat readouts. Nothing decorative, never a rainbow.
- **Navy-steel FIELD, with depth.** The dark is a cool navy-steel gradient (`#0C1524 -> #05070C`) with faint steel-blue lit depth and one whisper of red. Never flat black, never light mode, never colorful-dark neon.
- **Type and numbers are craft.** Oswald red headers + Kanit broadcast display (names/stats) + Hanken Grotesk UI + tabular mono numbers.
- **Performance is design.** Solid layered surfaces + box-shadow glows + transform/opacity motion. NO stacked `backdrop-filter: blur()` (it killed the old build's perf and screenshots).

---

## Color Palette (SET — do not add hues)

> Values below are the authoritative truth as shipped in `src/app/globals.css` (`:root`, D1). Token NAMES are unchanged from GRIDIRON v3 — the `--ffi-volt*` name now carries RED and `--ffi-blue*` carries steel-blue, so every screen repainted without per-component edits. (The legacy `--ffi-gold*` names also resolve to the same RED, since older gold-era components still reference them.)

```
/* Navy-steel FIELD (depth via layered radial glows, never flat black) */
--ffi-bg-0:        #05070C   /* deepest */
--ffi-bg-1:        #08101C   /* app base */
--ffi-surface-1:   #121A28   /* lifted panel */
--ffi-surface-2:   #1A2637   /* card */
--ffi-surface-3:   #26364E   /* raised / hero (lifted steel-blue) */
--ffi-hairline:        rgba(180,200,224,0.10)   /* cool steel light-catch edge */
--ffi-hairline-bright: rgba(200,215,235,0.18)

/* RED (brick) — the moment / value / your action ONLY, used SPARINGLY (on-the-clock, your max, CTAs, steal, your pick, active nav) */
--ffi-volt:        #A63C41   --ffi-volt-deep: #6E2225   --ffi-volt-ink: #FFFFFF
--ffi-volt-glow:   rgba(166,60,65,0.32)

/* STEEL-BLUE — structure / info / depth, the everyday workhorse (nav frame, links, secondary, AI read, crest, "Intelligence" wordmark) */
--ffi-blue:        #5FA8E0   --ffi-blue-bright: #7FC0EA
--ffi-blue-glow:   rgba(95,168,224,0.28)

/* Text — chrome-silver ink on navy */
--ffi-ink:   #EAF1F8   --ffi-ink-2: #9FB2C6   --ffi-ink-3: #5E708A

/* Position chips — data-encoding system, carried UNCHANGED from v3 (cross-screen; re-evaluate as a separate task, NOT part of D1) */
--ffi-pos-qb: #FF6E8A   --ffi-pos-rb: #56E0A0   --ffi-pos-wr: #6CA8FF   --ffi-pos-te: #FFB05C

/* Semantic — success reads STEEL-BLUE (informational), never red */
--ffi-success: #5FA8E0   --ffi-warning: #FFB05C   --ffi-danger: #FF6E8A
```

**Meaning rule (enforce everywhere):**
- **RED (brick)** — two roles: (1) **page + section HEADERS** wear brick-red as the identity treatment (Oswald, `.ffi-title-red`); (2) the moment + value + the user's own action, used SPARINGLY in the BODY: on-the-clock, your max bid, primary CTA (RUN RESEARCH / Record Pick), a steal, your pick, active nav, positive delta. The "sparing" test applies to body/interactive elements, NOT to headers — headers are expected to be red. (Joe pick 2026-08-15; supersedes the earlier chrome-silver-titles direction.)
- **Steel-blue** — structure, the default non-action color: nav frame, info, AI-read panel, secondary data, depth highlights, confirmation/info boxes, `success` state.
- **Chrome-silver ink** — player names + big stat readouts (Kanit) sit in `--ffi-ink`, reading as brushed metal on navy. (Page/section HEADERS are the exception: Oswald solid brick-red, see Typography.)
- **Duotone icons** — an icon is a RED chip (`bg rgba(166,60,65,0.15)`, `border rgba(166,60,65,0.45)`) with a WHITE glyph. Consistent across a screen; never per-icon rainbow colors.
- **Position chips** — QB/RB/WR/TE identity only, small; a separate data-encoding system left intact from v3.
- **NO gold. NO volt-green. NO rainbow. NO decorative color.**

---

## Typography (no blur, big confidence)

Loaded via `next/font/google` in `layout.tsx`. **CSS-var names kept stable from v3** (`--font-anton` / `--font-saira` / `--font-saira-cond`) so every screen re-typed at once; only the loaded families changed. **Oswald (`--font-oswald`) was added 2026-08-15** for page/section HEADERS only, scoped to `.ffi-title-red`.
```
Oswald           → page + section HEADERS, solid brick-red  (var --font-oswald)              .ffi-title-red
Kanit            → player names, stat readouts, labels, chips (var --font-anton / --font-saira-cond)   .font-display / .font-cond
Hanken Grotesk   → body + UI (default app font)      (var --font-saira)                     .font-body / font-sans
JetBrains Mono   → EVERY number (budgets, prices, ranks), tabular  (var --font-jetbrains)    font-mono
```
- All numbers: JetBrains Mono, `tabular-nums`, right-aligned in lists.
- Labels: Kanit, uppercase, wide letter-spacing.
- **HEADERS (page titles + prominent section titles): Oswald, solid brick-red `#C25A5E` via `.ffi-title-red`. No emboss, no gradient, no silver bevel** (both were tried and rejected 2026-08-15 — flat-white read as plain, embossed read as cheesy). Oswald in red is the locked header treatment.
- Player names + big stat readouts: Kanit, large, tight leading, in chrome-silver `--ffi-ink`.

---

## Canvas & Atmosphere (performant)

One fixed, full-bleed navy-steel FIELD layer behind content (`.stadium-atmos`). Layered radial glows + a vertical gradient. **No animated blur, no grain-behind-blur, no stacked filters.** As shipped in `globals.css`:
```css
.stadium-atmos background:
  radial-gradient(60% 42% at 22% -6%, rgba(95,168,224,0.16), transparent 58%)   /* steel-blue light */
  radial-gradient(46% 40% at 92% 6%,  rgba(166,60,65,0.06),  transparent 55%)   /* one faint red whisper */
  radial-gradient(60% 50% at 50% 116%, rgba(95,168,224,0.12), transparent 60%)   /* steel-blue depth */
  linear-gradient(180deg, #0C1524 0%, #08101C 50%, #05070C 100%)                /* navy-steel field */
```
On-the-clock (`body.ffi-on-the-clock`): brighten the top steel glow (`rgba(95,168,224,0.26)`) and the red whisper (`0.10`) + a slow brightness pulse (reduced-motion -> static). No spotlight blur layers.

---

## Surfaces, Glass & Cards (light-catch, NOT blur)

The "No-Line Rule" holds: boundaries from tonal shift + a light-catch hairline (cool-steel ≤18%), **not** gray borders and **not** backdrop-blur.
```css
.ffi-card          { background: var(--ffi-surface-2); border:1px solid var(--ffi-hairline);
                     box-shadow: 0 8px 32px rgba(0,0,0,.36), 0 0 15px var(--ffi-blue-glow)/.4; border-radius: 16px; }
.ffi-card-interactive:hover { transform: translateY(-2px); border-color: var(--ffi-hairline-bright); }
.ffi-hero          { background: layered steel-blue radial over surface-3 (lifted #26364E->#1A2637); border: hairline-bright;
                     + ::before steel sheen sweep (texture). }
```
Old `.ffi-glass*` / `.glass-*` names are KEPT but re-skinned to solid layered surfaces (no `backdrop-filter`).

---

## Auction Co-Pilot Components (the live draft room)

> **Product model:** live IN-PERSON auction. The app does NOT bid. It (1) advises and (2) records results. No bid stepper, no "Place Bid".

- **`.ffi-hero` (On The Block):** player as a hero card — position chip + Kanit name (chrome-silver) + meta + stat row (Proj/ADP/PosRank/VONA) + steel sheen edge.
- **Decision block:** `BID UP TO $X` (RED, the hero number) + value note; market column (Est. cost / Budget / Spend cap).
- **`.ffi-record` (Record Sale):** price stepper + winner select + full-width RED `Record Pick` button. This replaces "Place Bid".
- **`.ffi-feed` (broadcast lower-thirds):** sold rows — muted position chip + Kanit name + mono price + manager; newest gets a RED left rail.
- **AI Read:** steel-blue panel, dry declarative copy, mono confidence %.

---

## Shipped Live Auction Room (UXV2-6/7): as-built, scoped departure

> This section documents what actually shipped in `src/components/draft/live-room/`, which intentionally differs from the global SHIELD tokens above (and always did — it predates SHIELD and was a scoped departure from GRIDIRON too). Everything in this section is scoped to the live auction room ONLY. The rest of the app (prep, board, review, shell) uses the global SHIELD palette, fonts, and motion described elsewhere in this file. Palette source of truth: `src/components/draft/live-room/theme.ts`. **Note:** re-skinning this room to SHIELD (or deciding to keep its four-move palette) is an open follow-on, not part of D1.

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
.ffi-btn-hero     /* RED gradient linear-gradient(180deg,#A63C41,#6E2225), white text — the moment: RUN RESEARCH, Record Pick, Start Draft, Confirm */
.ffi-btn-primary  /* STEEL-BLUE gradient linear-gradient(180deg,#5FA8E0,#3E6E96), white — structure/default action */
.ffi-btn-value    /* RED — value/steal confirmation (same family as hero; use hero for primary commits) */
.ffi-btn-secondary/* surface-1 + hairline ghost */     .ffi-btn-ghost /* text ghost */
```
44px min touch target, `:active` press feedback, reduced-motion guards. Red buttons are the loudest thing on any screen — at most one per view.

---

## Motion (FIRST-CLASS — this is half of "AAA")

> **As-built note:** this cinematic motion vision describes the aspirational global system. The **shipped** Live Auction Room (UXV2-6/7) deliberately does NOT use it: it has no framer-motion and no signature-moment choreography, and it ships lean by construction. See "Shipped Live Auction Room" above for the room's actual motion (Tailwind cross-fades + `active:scale` only) and its reduced-motion dial-down policy.

> **SHIELD color note:** where this section says "volt" read **RED** and where it says "blue" read **steel-blue** — the semantic roles are unchanged, only the hues moved (see Color Palette). Red choreography stays reserved for the user's own moments so it never floods.

Motion is a primary pillar, not polish. The bar is Family (fluid, weighted, nothing just appears) + EA FC (cinematic moments) + Linear (crisp, never gratuitous). Tech: Framer Motion + View Transitions API (`src/lib/view-transition.ts`) + CSS `@property`. Named curves: `--ease-broadcast` (wipes), `--ease-spring` (reveals/pops), `--ease-standard` (UI).

**Signature moments (cinematic):**
- On-the-clock: hero card spring-in (scale 0.9->1), canvas glow brightens + breathes, one-shot volt edge sheen, "Bid Up To" counts up.
- Pick lands: feed row wipes in (broadcast lower-third) + sheen, list springs down, price counts up.
- Steal: volt flash on the row, small burst for a big one.
- Record Pick: button depress + volt glow ring, player morphs into the squad slot (shared element), budget ticks down, slot pops.
- Draft complete: grade hero spring-in, red ring sweep, Kanit verdict word snap, confetti.

**Transitions (continuity):** Board->Live morphs the tapped player card into the on-the-block hero (View Transitions / `layoutId`). Tabs/routes spring cross-fade, never a hard cut.

**Micro (everywhere, Linear-crisp):** button press scale+glow, card lift, stepper number roll, filter-pill slide. Numbers tick + flash on change (volt=value, blue=info), tabular so zero layout shift. Lists cascade-in + FLIP reorder.

**Discipline (elegant, not exhausting):** cinematic on the moments; routine picks get a ~200ms acknowledgment only (a fast auction must not become a fireworks show). Reserve celebration for the user's picks, steals, and the finish.

**Perf + a11y (non-negotiable):** transform / opacity / box-shadow only (no layout thrash, no blur) so it stays smooth on a phone during rapid-fire input. Every animation collapses under `prefers-reduced-motion`.

---

## What NOT to Do

- **NO gold, NO volt-green, NO glassmorphism-as-everything, NO gradient-glow wallpaper** (gold + neon-green were the rejected/superseded looks). *(Exception: the shipped Live Auction Room still uses a single scoped amber gold as its HOLD / moment color for the four-move system, from its own `theme.ts`. See "Shipped Live Auction Room" above. That exception does not extend to the rest of the app, which is SHIELD red + steel-blue.)*
- **NO stacked `backdrop-filter: blur()`** — solid layered surfaces + box-shadow only.
- **NO rainbow** — red + steel-blue + chrome-silver + muted position chips, period.
- **Red is SPARING** — action only. If a screen reads red-heavy, that is a bug.
- **NO flat black and NO light mode** — navy-steel field only.
- **NO bidding UI** in the auction room — advise + record results only.
- **NO em-dashes, NO emojis** in any rendered copy (ESLint dash guard stays).
- **NO HTML tables for player lists** — card/row layouts.

---

## Implementation Notes

- Re-skin in place: keep existing class/token NAMES (`.ffi-card`, `.ffi-btn-*`, `--ffi-volt*`, `--ffi-blue*`, legacy `--ffi-gold*`, etc.) so all screens shift at once; map their VALUES to the SHIELD palette. This is exactly how D1 repainted all 61 screens by editing only `globals.css` + `layout.tsx`.
- **D1 tail (known, not yet swept):** component-level inline color literals (hardcoded hex/rgba inside `.tsx` `style={}`/className) are NOT reached by the globals-only swap. The `/prep` hub was hand-cleaned as the D1 proof; a full component-literal sweep across the remaining screens is a separate follow-on task.
- `globals.css` `@theme inline` registers Tailwind utilities; `:root`/`.dark` hold raw vars for inline styles.
- Identity source of truth for SHIELD: the D0 lock + proof `.claude/mockups/d0-craft/d1_prep_shield.png`. The **shipped** Live Auction Room is a scoped departure with palette in `src/components/draft/live-room/theme.ts` (see "Shipped Live Auction Room").
- Verify on a real phone width + reduced-motion; confirm screenshot-able (the old build was not).
