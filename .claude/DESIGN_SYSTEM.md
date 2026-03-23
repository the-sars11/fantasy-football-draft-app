# FFIntelligence Design System — "Tactical Hologram"

> **Status: LOCKED** — Do not modify palette, typography, or core classes without Joe's explicit approval.
> **Version:** 1.1 (updated 2026-03-22)
> **Source:** `UI/draft_board/DESIGN.md`

## Creative North Star

This design system is engineered to feel like a **high-end heads-up display (HUD)** for elite performance. We depart from the "flat web" by treating the UI as a series of light-emitting, projected surfaces suspended in a deep, atmospheric void.

**Key Principles:**
- **Intentional asymmetry** over rigid grids
- **Editorial edge** with premium feel
- **"Gridiron Lens" perspective:** precise, data-rich, tactical
- **Liquid glass textures** + ambient light-based elevation
- **"Flash streaks"** that imply motion and momentum

The goal is a tactical engine feel — every element rendered in real-time, not simply placed on a page.

---

## Source Files (The Truth)

All implementations MUST reference these HTML prototypes:

| Screen | File | Lines |
|--------|------|-------|
| Draft Board | `UI/draft_board/code.html` | 287 |
| Prep Hub | `UI/Fantasy_Football - Prep Hub 1/code.html` | 203 |
| Post-Draft | `UI/Post Draft Analysis Screen/code.html` | 318 |

---

## Color Palette

### Core Colors (from draft_board/code.html)
```javascript
colors: {
  "primary": "#8bacff",           // Gridiron Blue - actions, active states
  "secondary": "#2ff801",         // Electric Lime - alerts, success, CTAs
  "background": "#031018",        // The Void - deep non-black navy
  "surface": "#031018",
  "surface-dim": "#031018",
  "surface-bright": "#192f3b",
  "surface-container": "#0a1b25",
  "surface-container-low": "#05151e",
  "surface-container-high": "#0f222c",
  "surface-container-highest": "#142834",
  "surface-container-lowest": "#000000",
  "on-surface": "#deedf9",        // Primary text
  "on-surface-variant": "#9eadb8", // Secondary text
  "outline": "#697782",
  "outline-variant": "#3c4a53",
  "error": "#ff716c",
  "error-container": "#9f0519",
  "secondary-container": "#106e00",
  "on-secondary": "#0b5800",
}
```

### Alternative Palette (from Prep Hub)
```javascript
colors: {
  primary: "#5582e6",             // Gridiron Blue
  secondary: "#050a1b",           // Deeper Navy
  tertiary: "#39ff14",            // Electric Lime / Neon Green
  "background-dark": "#01040a",   // Deeper black-navy
}
```

---

## Typography

### Font Families
```javascript
fontFamily: {
  "headline": ["Space Grotesk"],  // Headlines, numbers, action labels
  "body": ["Manrope"],            // Body text, descriptions
  "label": ["Space Grotesk"],     // Labels, badges
}
```

### Font Imports
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
```

### Usage
- **Display/Headlines:** Space Grotesk - technical, futuristic, authoritative
- **Body/UI Labels:** Manrope - warm, legible, modern
- **Numbers:** Always Space Grotesk for tactical data feel

---

## Core CSS Classes

### Glass Panel
```css
.glass-panel {
    backdrop-filter: blur(16px);
    background: rgba(10, 27, 37, 0.6);
}
```

### Flash Streak
```css
.flash-streak {
    background: linear-gradient(115deg, transparent 0%, rgba(47, 248, 1, 0.1) 50%, transparent 100%);
}
```

### Neon Glow
```css
.neon-glow {
    box-shadow: 0 0 20px rgba(57, 255, 20, 0.4);
}
```

### Card Glow
```css
.shadow-card-glow {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(85, 130, 230, 0.1);
}
```

---

## Component Patterns

### Player Card (from draft_board/code.html lines 131-175)
```html
<div class="glass-panel rounded-xl overflow-hidden shadow-[0_0_20px_rgba(47,248,1,0.05)] border border-secondary/10">
  <div class="p-5 flex items-center gap-4 relative">
    <div class="font-headline text-3xl font-extrabold text-primary/30 tracking-tighter italic">01</div>
    <div class="flex-1">
      <h3 class="font-headline text-lg font-bold text-on-surface leading-tight">CHRISTIAN MCCAFFREY</h3>
      <p class="font-body text-[10px] text-on-surface-variant tracking-widest uppercase mt-0.5">SF • RB • BYE 9</p>
      <div class="flex gap-2 mt-2">
        <span class="px-2 py-0.5 rounded-full bg-secondary-container/30 text-secondary text-[9px] font-bold tracking-wider">TARGET</span>
      </div>
    </div>
    <div class="text-right">
      <div class="font-headline text-2xl font-bold text-secondary">$72</div>
      <div class="font-body text-[10px] text-on-surface-variant">$68-$76 RANGE</div>
    </div>
  </div>
</div>
```

### Position Filter Buttons (from draft_board/code.html lines 120-127)
```html
<!-- Active -->
<button class="px-6 py-2 rounded-lg bg-secondary text-on-secondary font-headline font-bold text-xs tracking-tighter shadow-[0_0_15px_rgba(47,248,1,0.3)]">ALL</button>
<!-- Inactive -->
<button class="px-6 py-2 rounded-lg bg-surface-container-high text-on-surface-variant font-headline font-bold text-xs tracking-tighter hover:bg-surface-bright">QB</button>
```

### Hub Card (from Prep Hub code.html lines 113-122)
```html
<button class="w-full flex items-center p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50 shadow-card-glow hover:border-tertiary/50 transition-all group backdrop-blur-md">
  <div class="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center mr-4">
    <span class="material-icons text-tertiary">settings</span>
  </div>
  <div class="flex-grow text-left">
    <h3 class="font-bold text-slate-100">Configure League</h3>
    <p class="text-xs text-slate-400">Rules & Scoring Matrix</p>
  </div>
  <span class="material-icons text-slate-500 group-hover:text-tertiary">chevron_right</span>
</button>
```

### Grade Hero (from Post-Draft code.html lines 128-140)
```html
<div class="flex items-baseline gap-2">
  <h2 class="font-headline text-8xl font-bold text-primary tracking-tighter">B+</h2>
  <span class="font-headline text-2xl text-on-surface-variant mb-2">/ Tier 1</span>
</div>
```

### Timeline Pick Card (from Post-Draft code.html lines 228-240)
```html
<div class="bg-surface-container-low rounded-xl p-5 border border-primary/20 shadow-xl">
  <div class="flex justify-between items-start mb-2">
    <div>
      <span class="font-label text-[10px] font-bold text-primary uppercase tracking-widest">Round 1, Pick 6</span>
      <h5 class="font-headline text-xl font-bold text-white mt-1">Justin Jefferson <span class="text-on-surface-variant text-sm">WR | MIN</span></h5>
    </div>
    <div class="bg-primary/10 text-primary px-3 py-1 rounded text-xs font-black tracking-tighter">+3.2 ADP VALUE</div>
  </div>
</div>
```

---

## What NOT to Do

### PROHIBITED Classes
Do NOT use these generic shadcn classes in draft components:
- `bg-muted`, `bg-muted/50`
- `text-muted-foreground`
- `border-border`
- Generic `<Table>`, `<TableRow>`, `<TableCell>` for player lists

### PROHIBITED Patterns
- **NO 1px solid borders** — use tonal shifts, backdrop blurs, or ghost borders (15% opacity max)
- **NO traditional drop shadows** — use tinted ambient glows
- **NO rounded corners larger than xl** — keep aesthetic tactical and sharp
- **NO HTML tables for player lists** — use card-based layouts

### The "No-Line" Rule
Boundaries must be created through:
1. **Tonal Shifts:** `surface-container-high` card on `surface-container-low` background
2. **Backdrop Blurs:** 12-20px blur on semi-transparent surfaces
3. **Ambient Glow:** Subtle outer bloom that defines edge through light

---

## Elevation & Depth

Light is the primary architect of space.

- **Tonal Layering:** Stack surfaces (`surface-container-lowest` inside `surface-container-low`)
- **Ambient Shadows:** For floating elements, use bloom effect:
  - Color: `secondary` or `primary` at 10% opacity
  - Blur: 24px - 40px
- **Ghost Border:** If container needs extra definition, use `outline-variant` at 15% opacity max
- **Glassmorphism:** Navigation bars and floating cards:
  - Fill: `surface-container` at 60% opacity
  - Filter: `backdrop-filter: blur(16px)`

---

## Icons

Use Material Symbols Outlined:
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
```

Style settings:
```css
.material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

---

## Migration Checklist (Sprint 10.7)

### Foundation
- [x] FF-095: DESIGN_SYSTEM.md locked reference created
- [x] FF-096: globals.css has all color tokens from HTML prototypes

### Draft Board Port
- [x] FF-097: FFIPlayerCard component (glass-panel, rank number, badges, auction value)
- [x] FF-098: FFIAIInsight component (confidence bar, expandable section)
- [x] FF-099: player-pool.tsx uses FFIPlayerCard (not HTML tables)
- [x] FF-100: Position filter tabs with active glow shadow

### Post-Draft & Navigation
- [x] FF-102: Post-draft review page (grade hero, timeline, badges)
- [x] FF-103: Bottom navigation (glass blur, active glow, rounded top)

### Component Verification
- [x] Player cards use glass-panel styling (not HTML tables)
- [x] Numbered rank badges (01, 02) in primary/30 italic
- [x] Position filter tabs have active glow shadow
- [x] AI Insight sections expand with confidence bars
- [x] Prep Hub matches prototype layout exactly
- [x] Post-draft grade hero displays correctly
- [x] Timeline shows STEAL/REACH/PIVOT badges
- [x] Bottom navigation has glass blur + glow states

---

## Implementation Notes

### Using the Tactical Hologram Colors in Tailwind

The prototype colors are registered in `globals.css` under `@theme inline`. Use them with:

```html
<!-- Surface hierarchy -->
<div class="bg-surface-dim">...</div>
<div class="bg-surface-container">...</div>
<div class="bg-surface-container-high">...</div>

<!-- Text colors -->
<span class="text-on-surface">Primary text</span>
<span class="text-on-surface-variant">Secondary text</span>

<!-- Primary/Secondary -->
<div class="text-gridiron-primary">Blue accent</div>
<div class="text-gridiron-secondary">Lime accent</div>
<div class="bg-secondary-container">Green container</div>

<!-- Fonts -->
<h1 class="font-headline">Space Grotesk headline</h1>
<p class="font-body">Manrope body text</p>
```

### Shadow Patterns

```html
<!-- Active filter button glow -->
shadow-[0_0_15px_rgba(47,248,1,0.3)]

<!-- Expanded card ambient glow -->
shadow-[0_0_20px_rgba(47,248,1,0.05)]

<!-- Confidence bar inner glow -->
shadow-[0_0_8px_#2ff801]

<!-- FAB glow -->
shadow-[0_0_24px_rgba(47,248,1,0.4)]
```
