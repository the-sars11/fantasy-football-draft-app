# Draft App — Mobile-First UI/UX Overhaul (Auctioneer FINISH, GRIDIRON BRAINS)

**Created:** 2026-07-12 · **Status:** DIRECTION CORRECTED & LOCKED with Joe · pre-build
**Reference look (finish only):** `C:\Users\jrasa\AI Projects\fantasy_auction_auctioneer` (deployed, Joe-approved)
**Target:** `C:\Users\jrasa\AI Projects\fantasy_football_draft_app`

> ⚠️ CORRECTION NOTE (read first). An earlier version of this doc proposed *replacing* the draft
> app's screens with the auctioneer's sparse player-card layout. That was WRONG and Joe rejected it —
> the mockup looked pretty but stripped out the decision intel that makes the cockpit useful
> (PROJ PTS / ADP / POS RANK / VONA, the AI READ, YOUR SQUAD, the SOLD feed, tier/fills). This doc is
> the corrected direction. **No screen code was changed this session** — only throwaway scratchpad
> mockups (now gone) and this doc. The GRIDIRON screens are fully intact.

---

## The one-sentence direction

**Keep GRIDIRON's information architecture on every screen; swap its visual system for the
auctioneer's (fonts + colors + card finish + broadcast polish); and redesign every screen
MOBILE-FIRST because the current layouts are busted.**

Put differently: **GRIDIRON brains, auctioneer finish, brand-new mobile-first layouts.**

---

## What to KEEP (do not strip)

The current live draft room and prep screens carry real decision intelligence. Keep ALL of it:
- On-block intel: **PROJ PTS · ADP · POS RANK · VONA**, plus **CIN · BYE 10 · TIER 1 · FILLS WR2**.
- **BID UP TO / value / walk-away**, EST COST · BUDGET · SPEND CAP.
- **RECORD SALE** stepper + WON BY + RECORD PICK.
- **AI READ** with confidence %.
- **YOUR SQUAD** roster-slot chips + spend-cap progress.
- **SOLD / last N** feed.
- Prep hub's cards for Configure / Strategies / Board / Player Browser / Runs / Keepers / Dry Run, and
  all the data on the secondary/season screens.
Information may be RE-ORGANIZED for a better/more efficient mobile layout, but never DELETED.

## What to CHANGE (the auctioneer finish + mobile-first layout)

1. **Fonts** → the auctioneer's three: **Rajdhani** (display/headlines/big numbers), **Archivo** (UI/body),
   **JetBrains Mono** (all stat numerals, tabular). Replace GRIDIRON's Anton/Saira set.
   Source: `fantasy_auction_auctioneer/src/app/layout.tsx` (next/font wiring).
2. **Color system** → the auctioneer's `.cockpit` `--ck-*` tokens + the **5-identity WA theme bank**
   (default **OG Seahawks green**; Burlington, Mariners, Sonics, Huskies), gold accents (`--ck-gold`),
   red reserved for record/commit only, position colors `--ck-qb/rb/wr/te`.
   Source: `fantasy_auction_auctioneer/src/app/globals.css` (lines ~32-217 for tokens; the whole file is
   standalone `.ck-*` CSS — only one Tailwind line, no @apply).
3. **On-block player card** → the auctioneer's team-tinted card WITH real ESPN headshot + team logo +
   gold hero + depth — but keep GRIDIRON's stats/intel docked around/under it. Real headshots come from
   `https://a.espncdn.com/i/headshots/nfl/players/full/<espnId>.png`, logos from
   `.../teamlogos/nfl/500/<slug>.png` (WAS→wsh). Team-tint logic: `fantasy_auction_auctioneer/src/lib/team-colors.ts`.
4. **Surface finish** → auctioneer glass panels (`.ck-hud`), accent-gradient CTAs (`.ck-cta`), panel
   broadcast top-rule, glass rows, stadium-field background (`CockpitShell` / `.ck-env`), motion +
   reduced-motion discipline.
5. **Layouts** → full **mobile-first** rebuild (design at ~390px FIRST, then scale up). Fix hierarchy,
   spacing, flow. **Expandable rows, not card grids** (Joe's standing rule). One screen = one clear job.

---

## Reference files to read (both repos are on disk)

Auctioneer (the finish):
- `src/app/globals.css` — the entire `--ck-*` / `.ck-*` system + 5 WA themes + motion.
- `src/app/layout.tsx` — the 3-font wiring.
- `src/components/layout/CockpitShell.tsx` — themed stadium shell.
- `src/lib/team-colors.ts` — per-team card tint.
- `src/components/draft/PlayerCard.tsx` — on-block card markup.

Draft app (the brains + what to redesign):
- `src/app/globals.css` (current GRIDIRON tokens — being replaced).
- `src/app/(app)/draft/live/client.tsx` — the live cockpit (all the intel to preserve).
- `src/app/(app)/prep/*`, `src/app/(app)/season/*`, `src/components/ui/*`, `src/components/layout/app-shell.tsx`.
- `.claude/mockups/draft-room-phone-shot.png` + `real-prep-gridiron.png` — the current look (keep the info, fix the layout).
- `.claude/BUILD_PLAN.md`, `.claude/UX_REDESIGN_STATE.md`, `.claude/UX_IA_PROPOSAL.md` — existing plan/IA (this overhaul supersedes the old "EA FC + Linear, no gold, new fonts" direction).

Stack is identical in both: Next 16, React 19.2.4, Tailwind 4, framer-motion 12.38.0, lucide 0.577.0 —
so the auctioneer CSS ports as plain CSS. Draft app also has shadcn-on-@base-ui primitives + an FFI CSS
layer that will be retired screen-by-screen as the `.ck-*` layer lands.

---

## Screen inventory (mobile-first redesign, keep info)

HERO (richest, do first): `/draft/live` (live cockpit), `/draft/review`, `/prep/board`, live multi-team board.
SECONDARY: `/prep` hub, `/prep/configure|strategies|keepers|runs|simulate`, `/draft/setup`,
`/season` + `/season/matchups|start-sit|trade|waivers`, `/settings`.
UTILITY: landing `/`, `(auth)/*`. Deferred: `/prep/players` (intel data is mocked).

## Build order

1. **Foundation:** port the `--ck-*` tokens + 5 WA themes + 3 fonts + `CockpitShell` + `.ck-*` primitive
   CSS into the draft app; wire `team-colors.ts` + one position-color source (kills the 3 duplicate palettes).
2. **HERO screens** mobile-first, keeping every stat/AI-read/squad/sold element.
3. **SECONDARY** sweep. 4. **UTILITY** token pass.

## Guardrails (non-negotiable)

- **Mobile-first, every screen.** Design at ~390px first. Expandable rows, not card grids.
- **Never delete information** — reorganize for clarity, keep the intel.
- **Per screen: mockup → Joe's explicit yes → build → real screenshot proof.** No "it should look good."
- Evidence rule: no "done/works/fixed" without pasted proof in the same message.
- Follow the draft app's PROPOSE/PATCH/VERIFY workflow + BUILD_PLAN; commit by explicit path.
