# FFIntelligence — UI Design Specification

> **Product:** FFIntelligence Fantasy Football Draft Advisor
> **Tagline:** Real-time AI draft companion for auction and snake leagues
> **Last Updated:** 2026-06-02

---

> ## ⚡ v2.0 "Stadium Primetime" (2026-06-02) — supersedes the Tactical Hologram direction below
> The aesthetic evolved to **Stadium Primetime** (NFL-primetime broadcast feel). Canonical tokens/classes now live in **`DESIGN_SYSTEM.md` v2.0**; sprint track in **`UI_UPGRADE_PLAN.md`**. These override Sections 1–5 and 9–10 below:
> - **Backgrounds:** layered atmospheric system (`stadium-atmos` + `atmos-grain` + `atmos-clock` tint), not a flat void.
> - **Color meaning:** Blue = structure/action · **Gold (`--ffi-gold*`) = the moment** (your pick, draft complete, grade hero, on-the-clock, active nav) · **Green = value/steal/success only** (no longer a generic CTA).
> - **Type:** Space Grotesk / Manrope / JetBrains Mono now actually load via `next/font` (Inter removed).
> - **Glass:** light-catch hairline (white ≤10%) replaces gray 1px borders on all cards.
> - **Buttons:** `.ffi-btn-primary` (blue), `.ffi-btn-hero` (gold), `.ffi-btn-value` (green).
> - **Motion:** `.ffi-animate-reveal` (scale + gold flash), `.ffi-animate-stagger`.
>
> Sections 6–8 and 11–17 remain current. Where this spec and DESIGN_SYSTEM.md v2.0 differ, v2.0 wins.

---

> ## 🏟️ Live Auction Room as-built (UXV2-6/7, 2026-08-09): overrides this spec inside `/draft/live`
> The shipped Live Auction Room (`src/components/draft/live-room/`) is the current source of truth for that screen and departs from the general spec below. Canonical detail lives in **`DESIGN_SYSTEM.md` -> "Shipped Live Auction Room"**; palette in **`src/components/draft/live-room/theme.ts`**; look-of-record mockup **`.claude/mockups/draft-room-v4-two-screen.html`**. Key differences from the sections below:
> - **Scoped palette, not the global tokens.** Own `theme.ts` `ROOM` constant: canvas `#060c14`, and four color-coded moves - lime-volt `#d4ff00` (BID), amber-gold `#f5a623` (HOLD / moment), orange `#f97316` (PUSH), red `#dc2626` (PASS). The room deliberately uses a single scoped gold; the app-wide "no gold" rule still holds everywhere else.
> - **Lean by construction, no Framer Motion in the room.** No framer-motion, no entrance keyframes, no `backdrop-filter`, no `will-change`, no animating filter layers (audited: 0 across 735 room elements). Motion is Tailwind cross-fades + two `active:scale` tap-feedbacks + one `motion-safe:animate-pulse` LIVE dot. This overrides Section 8 (Framer Motion physics) and the glass/backdrop-blur patterns in Section 9 for this screen.
> - **Reduced-motion is DIAL-DOWN, not strict-off** for the room (see Section 13 note): cross-fades stay but halve to 75ms; `active:scale` tap-feedback is neutralized.

---

> ## 🎬 Visual plan (opt-in) before substantial UI work
> For a **substantial** UI change (a new screen, component, layout, or a
> multi-screen flow) the AI offers a visual plan BEFORE writing code:
>
> > "This is a substantial UI change. Author a visual plan first (storyboard +
> > plan doc) so you can approve the look before I build? (y/n)"
>
> - **Yes** -> invoke the `visual-plan` skill in **local / private mode** (no
>   upload; the plan stays on this machine). Storyboard the real screen states
>   (idle / on-the-block / recording / recorded, etc.) plus a short plan doc,
>   hand over the local URL and the file paths, and wait for approval before
>   composing code. This satisfies the Quality Gate's "design sign-off before
>   building" for substantial UI.
> - **No**, or a trivial tweak (copy, a single color, a one-line change) -> skip
>   the plan and compose directly. Do not force a storyboard onto small changes.
>
> Never upload a plan to a hosted service without explicit per-task approval.

---

## 1. Design Vision & Aesthetic Direction

### Visual Aesthetic
**Primary style:** Tactical Hologram — high-end heads-up display (HUD) for elite performance. UI surfaces feel like light-emitting projected panes suspended in a deep atmospheric void, not flat web cards.

**Design mood/reference:**
- Military/sports performance HUD — precise, data-rich, tactical
- Liquid glass with ambient light-based elevation
- "Gridiron Lens" — real-time tactical engine, every element rendered live

### Visual Goals
- Every element should feel rendered in real-time, not placed on a page
- Premium depth through tonal surface layering and ambient light, not borders or drop shadows
- "Flash streaks" imply motion and momentum — the UI communicates urgency during live drafts
- Intentional asymmetry over rigid grids; editorial edge over corporate clean
- Distinct from auction companion (Auctioneer) despite shared design DNA — FFI is the advisor, not the auctioneer

### Explicit Avoidances
- No flat, white, or light-mode aesthetics — Tactical Hologram is always dark
- No 1px solid borders — use tonal shifts, backdrop blurs, or ghost borders (≤15% opacity)
- No traditional drop shadows — use tinted ambient glows only
- No rounded corners larger than `xl` — keep aesthetic tactical and sharp
- No HTML tables for player lists — card-based layouts only
- No generic shadcn classes (`bg-muted`, `text-muted-foreground`, `border-border`) in FFI components

---

## 2. Image Rendering Strategy

### When to Use Generated Images
**Use for:**
- Marketing/landing pages only: hero backgrounds, promotional assets

**Image generation approach:**
- Tool: Not used in the app itself
- Style consistency: N/A — app is pure UI, no player photos

### Web UI Only
**Don't generate images for:**
- Player cards: Use styled position badges (QB/RB/WR/TE/DEF) and rank numbers instead
- Backgrounds: Use CSS gradients, glassmorphism, and flash streaks
- Icons: Use Lucide React (app) or Material Symbols Outlined (prototypes)

---

## 3. Layout System

### Core Layout Zones
| Zone | Purpose | Priority |
|------|---------|----------|
| **Left Column** | Quick-entry bar (pinned), recommendations, pick feed, squad panel | Primary |
| **Right Column / Player Pool** | Player pool with filters, AI insight cards, scarcity tracker | Primary |
| **Fixed Bottom Bar** | ManualPickEntry — always pinned, never scrolls away | Overlay |
| **Header** | Mode label, connection status pill, budget summary | Persistent |

### Persistent Shell Elements

#### Top Navigation Bar (live draft header, ~52px)
- Left: Mode label (AUCTION / SNAKE) + connection status pill
- Center: League name / draft position indicator
- Right: Budget summary (auction: `$X left`) or round indicator (snake: `Rd X`)

#### Primary Navigation (prep mode)
- Structure: Bottom tab bar — Prep / Board / Settings (3 tabs)
- Active state: `text-gridiron-secondary` + lime glow `shadow-[0_0_8px_#2ff801]`
- Mobile behavior: Fixed bottom, glassmorphism background, safe-area padding

#### Pinned Quick-Entry Bar (live draft only)
- Position: `fixed inset-x-0 bottom-0 z-40`
- Background: `ffi-glass-heavy` (same as nav bar)
- Safe area: `padding-bottom: env(safe-area-inset-bottom)`
- Page offset: Wrapper uses `pb-32` to clear the bar
- Always open — no collapse/expand toggle
- Anatomy: [On Block slot] → [Manager dropdown] → [Price field] → [Record] → [Undo]

---

## 4. Color Palette

### Primary Palette (Tactical Hologram)
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Background (Void)** | Deep Navy-Black | `#031018` | Page background — "the void" |
| **Background Alt** | Deeper Black | `#01040a` | Alternate page bg (FFI tokens) |
| **Surface** | Slate Container | `#0a1b25` | Card/panel backgrounds |
| **Surface Low** | Dark Slate | `#05151e` | Nested containers |
| **Surface High** | Lighter Slate | `#0f222c` | Elevated cards |
| **Surface Highest** | Highlight Slate | `#142834` | Top-elevation elements |
| **Surface Bright** | Accent Surface | `#192f3b` | Active/selected surfaces |
| **Accent Primary** | Gridiron Blue | `#8bacff` | Actions, active states, links |
| **Accent Secondary** | Electric Lime | `#2ff801` | CTAs, success, alerts, active filters |
| **On-Surface** | Ice White | `#deedf9` | Primary text |
| **On-Surface Variant** | Cool Grey | `#9eadb8` | Secondary/muted text |
| **Outline** | Dark Steel | `#697782` | Subtle borders |
| **Outline Variant** | Deeper Steel | `#3c4a53` | Ghost borders at ≤15% opacity |
| **Success** | Lime | `#39ff14` | Status success (FFI tokens) |
| **Warning** | Amber | `#fbbf24` | Stale status, cautions |
| **Error** | Coral Red | `#ef4444` / `#ff716c` | Error states, danger |
| **On-Secondary** | Dark Green | `#0b5800` | Text on lime CTA buttons |
| **Secondary Container** | Dark Green Bg | `#106e00` | TARGET badge background |

### FFI Token Aliases (globals.css)
```css
--color-ffi-primary: #5582e6;          /* Gridiron Blue (token alias) */
--color-ffi-accent: #39ff14;           /* Electric Lime */
--color-ffi-background: #01040a;       /* The Void */
--color-ffi-surface: #0f172a;
--color-ffi-surface-elevated: #1e293b;
--color-ffi-text-primary: #ffffff;
--color-ffi-text-secondary: #94a3b8;
--color-ffi-text-muted: #64748b;
--color-ffi-border: #334155;
--color-ffi-success: #39ff14;
--color-ffi-warning: #fbbf24;
--color-ffi-danger: #ef4444;
```

---

## 5. Typography

| Role | Font | Weight | Size | Class | Usage |
|------|------|--------|------|-------|-------|
| **Display / Hero** | Space Grotesk | 800 | 48–80px | `font-headline text-8xl font-bold` | Grade hero, big numbers |
| **Heading 1** | Space Grotesk | 700 | 18–24px | `font-headline text-lg font-bold` | Player names, section titles |
| **Heading 2** | Space Grotesk | 600 | 14–16px | `font-headline text-base font-semibold` | Card titles, panel headers |
| **Body** | Manrope | 400 | 14px | `font-body text-sm` | Descriptions, insights, reasoning |
| **Label / Badge** | Space Grotesk | 700 | 9–10px | `font-label text-[10px] font-bold tracking-widest uppercase` | Position badges, status labels |
| **Caption** | Manrope | 400 | 10px | `font-body text-[10px] text-on-surface-variant` | Meta info, ADP ranges |
| **Number / Rank** | Space Grotesk | 800 | 24–30px | `font-headline text-3xl font-extrabold text-primary/30 tracking-tighter italic` | Rank badges (01, 02, 03) |
| **Mono** | JetBrains Mono | 400 | 11px | `font-mono text-[11px]` | Pick numbers in feed |

### Font Imports (globals.css)
```css
/* Space Grotesk — tactical/technical */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
/* Manrope — warm, legible body */
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap');
/* Oswald — display/impact (app-level, via Next.js font) */
```

### Typography Rules
- **Numbers always** Space Grotesk — tactical data feel
- **All-caps labels** always with `tracking-widest` or `tracking-wider` — never sentence case for badges
- **Position badges** always uppercase, 9–10px, bold
- **Player names** ALL CAPS in draft board (mimics scoreboard), sentence case in other views

---

## 6. Component Design System

### Primary Controls

#### Button — Primary CTA
- **Style:** Lime gradient pill — `bg-secondary text-on-secondary font-headline font-bold text-xs tracking-tighter`
- **Active glow:** `shadow-[0_0_15px_rgba(47,248,1,0.3)]`
- **States:** Default (lime fill), Hover (+10% glow), Disabled (`bg-surface-container text-on-surface-variant cursor-not-allowed`), Loading (spinner)
- **Padding:** `px-6 py-2`
- **Border radius:** `rounded-lg`
- **Rule:** Disabled state must visually communicate when no action is selected (mode selector CTA, etc.)

#### Button — Secondary (Glass)
- **Style:** `bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors`
- **Padding:** `px-2 py-1`
- **Use case:** BID button on player cards, ghost actions

#### Button — Ghost
- **Style:** No background, `text-on-surface-variant hover:text-on-surface`
- **Use case:** Undo, dismiss, secondary actions

#### Input Field
- **Style:** Recessed dark — `bg-surface-container-low border border-outline-variant/50`
- **Focus state:** `ring-1 ring-gridiron-primary` lime/blue glow
- **Error state:** `border-error-dim` + error text below
- **Prefix:** `$` for price fields (left-padded)

#### Position Filter Pills
- **Active:** `bg-secondary text-on-secondary font-headline font-bold text-xs tracking-tighter shadow-[0_0_15px_rgba(47,248,1,0.3)] min-h-[44px]`
- **Inactive:** `bg-surface-container-high text-on-surface-variant font-headline font-bold text-xs tracking-tighter hover:bg-surface-bright min-h-[44px]`

### Containers & Cards

#### FFI Player Card (glass-panel variant)
```html
<div class="glass-panel rounded-xl overflow-hidden shadow-[0_0_20px_rgba(47,248,1,0.05)] border border-secondary/10">
  <!-- Rank: font-headline text-3xl font-extrabold text-primary/30 tracking-tighter italic -->
  <!-- Name: font-headline text-lg font-bold text-on-surface -->
  <!-- Meta: font-body text-[10px] text-on-surface-variant tracking-widest uppercase -->
  <!-- Price: font-headline text-2xl font-bold text-secondary -->
</div>
```
- **Border radius:** `rounded-xl`
- **Hover effect:** Slight glow increase on `border-secondary/10 → border-secondary/20`

#### FFI Card / Panel (general)
- **Style:** `bg-surface-container border border-outline-variant/15 rounded-2xl`
- **Padding:** `p-4` or `p-5`
- **Interactive variant:** `hover:border-primary/30 data-[selected]:border-secondary/50 data-[selected]:bg-secondary/5`

#### Glass Panel (nav, pinned bars)
```css
.ffi-glass { backdrop-filter: blur(16px); background: rgba(10, 27, 37, 0.6); }
.ffi-glass-heavy { backdrop-filter: blur(20px); background: rgba(10, 27, 37, 0.85); }
```

#### Connection Status Pill
| State | BG | Text/Dot Color | Border | Dot |
|-------|----|----------------|--------|-----|
| LIVE | `rgba(34,197,94,0.15)` | `#22c55e` | `rgba(34,197,94,0.25)` | CSS pulse 1.5s |
| STALE | `rgba(251,191,36,0.15)` | `#fbbf24` | `rgba(251,191,36,0.25)` | Solid |
| OFFLINE | `rgba(239,68,68,0.15)` | `#ef4444` | `rgba(239,68,68,0.3)` | Solid |
| MANUAL | `rgba(148,163,184,0.1)` | `#94a3b8` | `rgba(148,163,184,0.15)` | Solid, no timestamp |

#### Position Badges
```html
<!-- Per position: distinct colors -->
QB: bg-red-500/20 text-red-400 border-red-500/30
RB: bg-emerald-500/20 text-emerald-400 border-emerald-500/30
WR: bg-sky-500/20 text-sky-400 border-sky-500/30
TE: bg-orange-500/20 text-orange-400 border-orange-500/30
K:  bg-purple-500/20 text-purple-400 border-purple-500/30
DEF: bg-slate-500/20 text-slate-400 border-slate-500/30
```

#### Keeper Row Markers (FF-274)
- Detection: `pick.is_keeper === true` OR `pick.pick_number < 0`
- Negative pick display: `-1 → K1`, `-2 → K2`, `-3 → K3`
- Pick number: `text-[#334155]` (darker than draft picks)
- Player name: `text-[#94a3b8]` (muted vs `#e2e8f0` for real picks)
- Right-aligned 🔒 icon — no price/round display for keepers

#### Confidence Badge / AI Insight
- **High:** `border-green-500/40 text-green-400`
- **Medium:** `border-yellow-500/40 text-yellow-400`
- **Low:** `border-red-500/40 text-red-400` + amber warning banner ("Thin Data")
- Source attribution: muted pill row below confidence bar

#### Trash Talk Alert
- **Style:** Dark pill with position-relevant color accent
- **Types:** overpay (red), steal (green), reach, imbalance, budget_buster, lone_wolf_qb, etc.
- Dismissible — moves to saved feed on save

### Modal / Dialog
- **Overlay:** `bg-black/60 backdrop-blur-sm`
- **Animation:** Scale + fade from center, 200ms ease-out

---

## 7. Interaction Principles

1. **Arm's-Length Readability First**
   - Rationale: Live draft use case — phone may be across the table or in bad lighting
   - Implementation: All critical text ≥12px; status pills ≥11px bold; all tap targets ≥44px min-height; connection status pill always visible in header

2. **Primary Action Never Behind a Scroll**
   - Rationale: During an auction, a user scrolling to find a player must not lose access to the bid entry bar
   - Implementation: ManualPickEntry bar is `position: fixed bottom-0` — always accessible regardless of scroll position; BID button on player cards populates bar without navigation

3. **Zero Ambiguity on Mode Entry**
   - Rationale: Entering the wrong draft mode (auction vs snake) mid-draft is catastrophic and unrecoverable
   - Implementation: Mode selector is the literal first screen — impossible to reach live draft without explicit choice; impossible to change mid-session

4. **Fail-Safe Degradation**
   - Rationale: Google Sheets polling can fail; Claude API can timeout; connection can drop
   - Implementation: Manual entry fallback always available; AI recommendations fail-silent (don't block UI); Sheets errors surface in expandable error bar with "Retry" — never a dead screen

5. **Explicit Over Implicit for Destructive Actions**
   - Rationale: Undoing a pick during a live draft has real consequences
   - Implementation: Undo button present but not prominent; confirmation pattern for session-ending actions

---

## 8. Motion & Animation

### Motion Philosophy
Motion communicates state change and urgency in a live draft environment. Animations are purposeful — a new pick appearing, a recommendation updating, a budget warning firing. No decorative motion that adds latency to the user's decision loop.

### Animation Timing
| Context | Duration | Easing |
|---------|----------|--------|
| Micro-interactions (button tap) | 150ms | ease-out |
| Card expand/collapse | 200ms | ease-in-out |
| Panel slide-in | 250ms | ease-out |
| Page navigation (prep mode) | 300ms | ease-in-out |
| Data state change (new pick) | 200ms | ease-out |
| Alert/trash talk entry | 400ms | spring |

### Interaction Physics (Framer Motion)
**Library:** Framer Motion (FF-082 through FF-094)

```js
// Page transitions
initial: { opacity: 0, x: 20 }
animate: { opacity: 1, x: 0 }
exit: { opacity: 0, x: -20 }
transition: { duration: 0.25, ease: 'easeOut' }

// Spring for alerts/picks entering feed
type: 'spring', stiffness: 300, damping: 30

// Swipe navigation (mobile)
drag: 'x', dragConstraints: { left: 0, right: 0 }
onDragEnd: threshold ±50px to trigger navigation
```

### Flash Streak Effect
```css
.flash-streak {
  background: linear-gradient(115deg, transparent 0%, rgba(47,248,1,0.1) 50%, transparent 100%);
}
```
Used: On player cards when nominated (BID tapped), on new pick confirmation.

---

## 9. Glassmorphism & Modern Effects

### Glassmorphism Usage
**Used for:**
- Bottom nav bar (always)
- Pinned ManualPickEntry bar (always)
- Floating modals and overlays
- Connection status pill background

```css
/* Standard glass */
backdrop-filter: blur(16px);
background: rgba(10, 27, 37, 0.6);

/* Heavy glass (bars, nav) */
backdrop-filter: blur(20px);
background: rgba(10, 27, 37, 0.85);
```

### Neon Glow Effects
```css
/* Active filter button */
shadow-[0_0_15px_rgba(47,248,1,0.3)]

/* Player card ambient */
shadow-[0_0_20px_rgba(47,248,1,0.05)]

/* Confidence bar inner */
shadow-[0_0_8px_#2ff801]

/* FAB / primary CTA */
shadow-[0_0_24px_rgba(47,248,1,0.4)]

/* Card ambient (blue) */
shadow: 0 8px 30px rgba(0,0,0,0.6), 0 0 15px rgba(85,130,230,0.1);
```

### Shadow Depth
| Elevation | Box Shadow | Usage |
|-----------|-----------|-------|
| **Base** | `0 2px 8px rgba(0,0,0,0.4)` | Resting cards |
| **Mid** | `0 8px 30px rgba(0,0,0,0.6), 0 0 15px rgba(85,130,230,0.1)` | Hovered/elevated cards |
| **High** | `0 20px 60px rgba(0,0,0,0.8)` | Modals |
| **Glow** | `0 0 20px rgba(47,248,1,0.05)` | Player card ambient |

### The "No-Line" Rule
Boundaries must be created through one of:
1. **Tonal Shifts:** `surface-container-high` card on `surface-container-low` background
2. **Backdrop Blurs:** 12–20px blur on semi-transparent surfaces
3. **Ambient Glow:** Subtle outer bloom at ≤15% accent opacity

---

## 10. Responsive & Mobile Strategy

### Breakpoints
| Range | Name | Behavior |
|-------|------|----------|
| ≥ 1280px | Desktop | Two-column layout — left (advisor) / right (player pool); full panel visibility |
| 768–1279px | Tablet | Two-column compressed; some panels collapse to tabs |
| < 768px | Mobile | Single-column; player pool below advisor; pinned bottom bar always visible |

### Mobile-First Approach
**Strategy:** Mobile-First — all components built for phone first, enhanced for desktop

**Mobile considerations:**
- Touch targets: Minimum **44px** height on ALL interactive elements (FF-269 requirement — enforced in code)
- Affected elements: position filter pills, sort tabs, expand chevron, error bar buttons, manual entry submit/undo
- Spacing: 16px outer padding minimum; 12px gap between interactive elements
- Navigation: Fixed bottom bar with `env(safe-area-inset-bottom)` padding
- Player pool: Card-based, not tables — thumb-scrollable single column
- Text size: Minimum 10px for critical labels (11px preferred for status indicators)

### Orientation Changes
- Portrait → Landscape: Layout shifts to compressed two-column on tablet; phone landscape not primary use case
- Notch/safe area: `env(safe-area-inset-bottom)` on pinned bars and nav; `env(safe-area-inset-top)` on header

### Arm's-Length Test (FF-269 / FFT-008)
Physical verification required before draft day: Joe on phone at normal arm's length in standard indoor lighting. All primary actions must be reachable one-handed without precision tapping.

---

## 11. Accessibility & Usability

### WCAG Compliance
- **Level:** WCAG AA (target)
- **Scope:** All user-facing screens — prep mode, draft setup, live draft, post-draft review

### Color & Contrast
- **Text on dark background:** 4.5:1 minimum — `#deedf9` on `#031018` passes at ~14:1
- **Status badges:** Color alone never the only indicator — text label always accompanies color
- **Warning states:** Amber + text label (not color-only)

### Keyboard Navigation
- **Tab order:** Logical top-to-bottom, left-to-right within panels
- **Focus indicators:** Visible ring — `ring-1 ring-gridiron-primary` (blue) on interactive elements
- **Keyboard shortcuts:** None implemented (live draft is touch-primary)

### Screen Reader Support
- **Semantic HTML:** Yes — headings hierarchy maintained in all screens
- **ARIA labels:** Applied to icon-only buttons (BID, Undo, ×), status pills (`aria-live` for LIVE/STALE/OFFLINE changes), confidence indicators
- **Live regions:** `aria-live="polite"` on pick feed (new picks announced); `aria-live="assertive"` on critical alerts (budget warnings)

### Mobile Usability
- **Text size:** Minimum 10px on mobile (11px for status-critical labels)
- **Form inputs:** `inputmode="numeric"` on price fields; `autocomplete="off"` on player search
- **Tap targets:** 44px minimum — enforced across all interactive elements per FF-269 code audit

---

## 12. Dark Mode

### Strategy
**Enabled:** Yes — dark mode is the ONLY mode  
**Default:** Dark (forced — `class="dark"` on `<html>` element, never toggled)  
**User control:** None — the Tactical Hologram aesthetic requires dark. Light mode is not supported and will not be added.

### Dark Palette (the only palette)
| Component | Color |
|-----------|-------|
| **Background** | `#031018` (The Void) |
| **Surface** | `#0a1b25` |
| **Elevated Surface** | `#0f222c` |
| **Primary Text** | `#deedf9` |
| **Secondary Text** | `#9eadb8` |
| **Accent Blue** | `#8bacff` |
| **Accent Lime** | `#2ff801` |
| **Error** | `#ff716c` |
| **Warning** | `#fbbf24` |

---

## 13. Performance Considerations

### Image Optimization
- **Format:** No player images in the app — position badges and rank numbers replace photos
- **Lazy loading:** N/A (no images)
- **Fonts:** Space Grotesk + Manrope loaded via Google Fonts with `display=swap`; Oswald via Next.js `next/font`

### Animation Performance
- **GPU acceleration:** Yes — Framer Motion uses `transform` and `opacity` only for animated properties; no layout-triggering props
- **Frame rate target:** 60fps on mid-range phones (iPhone SE / Android mid-tier)
- **Reduced motion:** across the general app, `prefers-reduced-motion` is respected via Framer Motion's `useReducedMotion()` hook - animations disabled, state changes instant. **The shipped Live Auction Room is the exception: it DIALS DOWN rather than killing motion** (per Joe's reduced-motion rule) - cross-fades stay but halve to 75ms and `active:scale` tap-feedback is neutralized via the scoped `.ffi-live-room` block in `globals.css`. See `DESIGN_SYSTEM.md` -> "Shipped Live Auction Room".

### Bundle Size Targets
- **CSS:** Tailwind CSS 4 (purged) — target ≤30kb gzipped
- **JS:** Next.js App Router code-splitting per route
- **Fonts:** Space Grotesk + Manrope ≤60kb total (subset: Latin only)
- **Framer Motion:** ~40kb gzipped — used across live draft + page transitions

### Data Performance
- **Player pool:** Filtered client-side from `players_cache` — no re-fetch on filter change
- **Polling:** Google Sheets: 7s interval. Sleeper: 5s interval. BroadcastChannel: instant
- **AI calls:** Incremental per pick (~500 tokens) — not batched; streaming used for recommendations

---

## 14. Implementation Checklist

### Phase 0: Foundation ✅
- [x] Color palette documented and locked (`DESIGN_SYSTEM.md` v1.2)
- [x] Typography system defined (Space Grotesk / Manrope / JetBrains Mono)
- [x] Spacing/grid: 4px base via Tailwind
- [x] Shadow system documented (ambient glow patterns)
- [x] CSS tokens registered in `globals.css` under `@theme inline`

### Phase 1: Core Components ✅
- [x] Buttons (primary lime, secondary glass, ghost)
- [x] Input fields (recessed, glow focus)
- [x] Cards (default, elevated, interactive) — `FFICard` in `ffi-primitives.tsx`
- [x] Navigation shell — `app-shell.tsx` with FFI branding
- [x] Position filter tabs with active glow

### Phase 2: Data Display ✅
- [x] Player cards (`FFIPlayerCard`) — glass-panel, rank badge, position badge, auction value
- [x] Status badges — position-specific colors, confidence badges, system tags
- [x] Empty states and loading states
- [x] AI insight cards (`FFIAIInsight`) — confidence bar, source attribution pills

### Phase 3: Interactions ✅
- [x] Manual pick entry form (pinned bar variant — FF-257)
- [x] Draft mode selector (3-step flow — FF-258)
- [x] Connection status pill (4-state — FF-259)
- [x] Keeper row markers (🔒 visual distinction — FF-274)
- [x] BID button on player cards (populates On Block slot)

### Phase 4: Polish ✅
- [x] Framer Motion page transitions and micro-interactions (FF-082–094)
- [x] Trash talk alerts with animation (FF-305)
- [x] Confidence indicators on AI recommendations (FF-270)
- [x] Source attribution badges (FF-271)
- [x] Strategy drift alerts (FF-272)

### Phase 5: Advanced ✅
- [x] Dark mode (forced — only mode)
- [x] Mobile gesture navigation (swipe between prep screens)
- [x] Notch/safe-area handling on pinned bars
- [x] 44px touch targets (FF-269 code audit complete)
- [ ] Arm's-length physical test (FFT-008 — requires Joe on phone)

---

## 15. Design Decisions Log

| Decision | Options Considered | Chosen | Rationale | Date |
|----------|-------------------|--------|-----------|------|
| Dark mode only | Dark-only / Light+Dark toggle / System preference | Dark-only forced | Tactical Hologram aesthetic requires dark; light mode would destroy the ambient glow and glass effects that define the brand | 2026-03-22 |
| Player card layout | HTML tables / CSS grid / Glass card | Glass card (FFIPlayerCard) | Tables destroy arm's-length scannability; glass cards allow ambient glow, rank badge, and position color to work together | 2026-03-22 |
| No solid borders | 1px borders / Tonal shifts / Ghost borders | Tonal shifts + ghost borders (≤15% opacity) | Solid borders make the UI feel like a spreadsheet — tonal layering creates depth without visual noise | 2026-03-22 |
| Pinned entry bar | Collapsible drawer / Always-visible / Floating FAB | Always-visible fixed bar | During auctions, speed matters — a collapsed state adds a tap; a floating button obscures content; fixed always-visible bar is always ready | 2026-04-14 |
| Mode selector as first screen | Inline sheet URL input / First-screen modal / Dedicated step | First-screen dedicated step (3-step flow) | Ambiguous mode entry caused Tyler to start without realizing he was in Sheets-dependent mode; explicit choice eliminates this | 2026-04-14 |
| Connection pill states | Binary (on/off) / 3-state / 4-state | 4-state (LIVE/STALE/OFFLINE/MANUAL) | STALE catches the case where polling is technically active but hasn't received data in >30s — a real failure mode that binary didn't surface | 2026-04-14 |
| Keeper visual distinction | None (existing) / Color only / 🔒 icon + muted name | 🔒 icon + muted name color + K1/K2 number | Color alone fails accessibility; muted name prevents keepers from being confused as valuable available picks; 🔒 is universally recognized | 2026-04-14 |
| Typography: Space Grotesk vs. Oswald | Oswald (original) / Space Grotesk | Space Grotesk (primary) + Oswald (display accent) | Space Grotesk is more legible at small sizes (badge text, 9–10px); Oswald kept for display-level headlines | 2026-03-22 |
| Trash talk mode toggle | Auto-on / Off/On toggle / 3-way Off/Safe/Adult | 3-way Off/Family-Safe/Adult-Only | Binary on/off too coarse — different social contexts (kids present, work colleagues) need different tone ceilings | 2026-04-16 |
| FFI vs. Auctioneer separation | Shared design system / Distinct | Distinct (shared DNA, not shared code) | FFI is advisor-centric (player intelligence, strategy); Auctioneer is auctioneer-tool-centric. Different primary actions, different layouts | 2026-04-14 |

---

## 16. Tools & Frameworks

| Category | Tool | Version | Purpose |
|----------|------|---------|---------|
| **Framework** | Next.js (App Router) | 15.x | Full-stack React, SSR, API routes |
| **Styling** | Tailwind CSS 4 | 4.x | Utility-first; all FFI tokens in `@theme inline` |
| **Base Components** | shadcn/ui (New York style) | Latest | Form primitives — NOT used in FFI draft components |
| **Animation** | Framer Motion | 11.x | Page transitions, micro-interactions, spring physics |
| **Icons** | Lucide React | Latest | App icons; Material Symbols Outlined in prototypes |
| **Fonts** | Google Fonts + next/font | — | Space Grotesk, Manrope, JetBrains Mono, Oswald |
| **Database** | Supabase | Latest | Player cache, draft sessions, auth |
| **AI** | Anthropic SDK (@anthropic-ai/sdk) | Latest | Claude Sonnet for analysis; Claude Haiku for trash talk |
| **Testing** | Vitest + React Testing Library | Latest | Unit tests (advisory) |
| **Hosting** | Vercel | Free tier | Auto-deploy from main |

### shadcn/ui Usage Rules
- **Use for:** Form primitives in prep/settings screens (Input, Select, Label, Dialog)
- **NEVER use for:** Any component that appears in the live draft room
- **Migration path:** `ManualPickEntry`, `AuctionAdvisor`, `LeagueOverview` still use shadcn — migration to FFI primitives is scheduled (non-blocking cosmetic)
- **Known quirk:** shadcn/ui v4 uses base-ui (not Radix) — no `asChild` prop on Button/TooltipTrigger; `buttonVariants()` is client-only, cannot call in server components

---

## 17. Design System Maintenance

### Update Process
1. Document decision in Section 15 "Design Decisions Log" (this file)
2. Update `DESIGN_SYSTEM.md` if token or core pattern changes
3. **`DESIGN_SYSTEM.md` is LOCKED** — changes to palette, typography, or core classes require Joe's explicit approval
4. Update affected component specs in this file (Section 6)
5. Update `CHANGELOG.md` with the change and rationale

### Adding New Components
1. Check `ffi-primitives.tsx` — does a variant already exist?
2. Verify the "No-Line" rule applies — no solid borders
3. Touch targets ≥44px for any interactive element
4. Test at arm's length on phone before shipping
5. Document in Section 6 (Component Design System)

### Review Cadence
- **Component additions:** Every P0 feature sprint — review Section 6 before writing new components
- **Style updates:** Locked until post-Aug-2026 draft day — no changes during hardening period
- **Accessibility audit:** Before Aug 2026 draft day (FFT-008 physical test)
- **Performance review:** Post-season (after Aug 2026 drafts)

### Prohibited Modifications (Draft Day Freeze)
Do not change during Aug 2026 hardening period (P0):
- Color palette (`DESIGN_SYSTEM.md` Section: Color Palette)
- Font families
- Core CSS classes (`glass-panel`, `flash-streak`, `neon-glow`)
- `globals.css` `@theme inline` block

---

## Sign-Off

| Role | Name | Date |
|------|------|------|
| **Product / Engineering** | Joe Rasar | 2026-06-02 |

---

**Next Review Date:** Post-Aug-2026 draft day  
**Last Updated:** 2026-06-02
