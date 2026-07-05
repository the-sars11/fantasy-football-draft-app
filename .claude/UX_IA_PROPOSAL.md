# UX IA Proposal - Fantasy Football Draft Advisor

**Status:** LOCKED 2026-07-05, AMENDED 2026-07-05. G1 passed - Joe "approval all" - all 8 bold moves approved. AMENDMENT (L5): Joe corrected that the app does NOT drive a TV/shared display. BM1 rewritten to phone-only (no TV board, no new `/draft/board` route); HERO set reduced from 5 to 4. See `UX_REDESIGN_STATE.md` L5.
**Step:** 1 of the dev-workflow-builder UX/UI universal process.
**Created:** 2026-07-05 (after G0 approval "yes, go").
**Starting state:** FULL-BUT-TRASH. Engine untouched; UI rebuilt screen-by-screen.
**Global anchor (personality lead):** EA FC 25 + Linear. Per-screen anchors are assigned at G1.5 (Step 2 screen map), not here.
**Feeds:** `.claude/UX_DISCOVERY_AGENT_OUTPUTS.md` (Step 0 findings). Audit trail: `.claude/UX_REDESIGN_STATE.md`.

---

## 1. Group destinations (4 top-level, phase-based)

The app has three real temporal modes plus settings. Mobile-first bottom nav, 4 groups:

| Group | Purpose | When it is the star |
|---|---|---|
| **Prep** | Research, board, strategies, keepers, runs, league config, simulate | Weeks before the draft |
| **Draft** | Setup, live cockpit (phone), multi-team board (phone), post-draft review | Draft day |
| **Season** | Start/sit, waivers, matchups, trade | After the draft, weekly |
| **More** | Settings, account, help | Anytime |

During a LIVE draft the cockpit is immersive and the bottom nav recedes (the draft is a full-attention moment, not a browsing tab). Prep and Season behave as normal browsing shells.

---

## 2. Screen inventory + HERO / SECONDARY / UTILITY

| Screen | Route | Class | Notes |
|---|---|---|---|
| Live draft cockpit (phone) | `/draft/live` | **HERO** | Hero element = on-the-block card + max-bid advice + record-sale |
| Multi-team board (phone) | `/draft/live` (full-screen view) | **HERO** | Your all-teams roster/budget view, promoted from a cramped panel to a first-class surface |
| Prep board / player pool | `/prep/board` | **HERO** | Dense rankable player list |
| Post-draft review | `/draft/review` | **HERO** | Grade reveal + breakdown |
| Draft setup | `/draft/setup` | SECONDARY | Mode -> league -> keeper review flow |
| Prep hub | `/prep` | SECONDARY | Entry surface to prep tools |
| Configure league | `/prep/configure` | SECONDARY | League settings form |
| Strategies | `/prep/strategies` | SECONDARY | Strategy editor + proposals |
| Keepers | `/prep/keepers` | SECONDARY | Keeper selection/discount |
| Runs / compare | `/prep/runs` | SECONDARY | Saved research runs |
| Simulate | `/prep/simulate` | SECONDARY | Dry-run draft |
| Player intel | `/prep/players` | SECONDARY (DEFERRED) | Data is MOCKED (`intel/service.ts:46-58`); design later once real |
| Season hub | `/season` | SECONDARY | In-season entry |
| Start/sit | `/season/start-sit` | SECONDARY | |
| Waivers | `/season/waivers` | SECONDARY | |
| Matchups | `/season/matchups` | SECONDARY | |
| Trade | `/season/trade` | SECONDARY | |
| Landing | `/` | UTILITY | |
| Settings | `/settings` | UTILITY | |
| Auth (4 screens) | `/(auth)/*` | UTILITY | Token + primitive sweep only |

HERO = full spec + mockup + two-session build cadence. SECONDARY = token + primitive + state sweep against Linear after the heroes land. UTILITY = token sweep only.

---

## 3. Bold moves (vote per move at G1)

Each move gets an approve / reject / revise vote. My recommendation is stated on each.

**BM1 (AMENDED L5) - Promote the multi-team board to a first-class full-screen surface.** The live draft stays a single phone cockpit whose hero is the private on-the-block card + advice + record-sale. The all-teams roster/budget view ("read the room") is promoted from a cramped drawer/panel to its own full-screen surface reachable from the cockpit. All on the phone. NO TV/shared display, NO new `/draft/board` route. (Original BM1 proposed a separate room-safe TV board; Joe corrected 2026-07-05 that the app does not drive a TV display, so that half is dropped.)
- *Recommend: APPROVE (amended).* The valuable half was making the all-teams view a real surface instead of a squeezed panel; the shared-display half was a mis-port of the auctioneer two-device model and is removed.

**BM2 - The cockpit hero is the on-the-block card, strategy + record-sale model.** No bid stepper, no "Place Bid" button (per the corrected product model in `BUILD_PLAN.md:147-152`: Joe's auction is live in-person; the app advises and records results, it does not place bids). Hero card = your max + value + estimated cost, then Record Sale.
- *Recommend: APPROVE.* This is already the locked product model; the IA just makes it the visual center.

**BM3 - Real imagery becomes a system requirement.** Player headshots (ESPN/Sleeper) and team marks on the card, board, and review. Kills the letter-in-a-box default that caps the app at slop.
- *Recommend: APPROVE.* Biggest single lever on cinematic depth; the data is already in the cache.

**BM4 - Discard the GRIDIRON token layer and Anton; rebuild on OKLCH tokens with a font set differentiated from auctioneer.** Anton is NASCAR's face; auctioneer already uses Rajdhani/Archivo/JetBrains Mono. Proposed FFDA set (locked at G5, not here): Saira (display) + Inter Tight (UI) + Geist Mono (numerals).
- *Recommend: APPROVE the discard now; treat the exact font pick as a G5 decision.*

**BM5 - One position-color token source.** Collapse the three duplicate palettes (`globals.css`, `prep/board/client.tsx:38-45`, `draft-board-table.tsx:18-25`) into a single OKLCH token set.
- *Recommend: APPROVE.* Pure hygiene; removes drift and a floor-failure source.

**BM6 - Decompose the two god-components inside the Session-B rebuilds, not as a separate code ticket.** `draft/live/client.tsx` (1255 lines) extraction happens when the cockpit is rebuilt; `draft/review/client.tsx` (1074) when review is rebuilt. Sequenced into the design work, not bolted on after.
- *Recommend: APPROVE.* Matches the kickoff's note; avoids a redundant standalone refactor.

**BM7 - Defer player-intel (`/prep/players`) out of the HERO set.** Its sentiment/tags are mocked (`intel/service.ts:46-58`, `getMockSystemTags()`). Keep it SECONDARY and redesign once the data is real.
- *Recommend: APPROVE.* Designing a hero screen on fake data is a trap.

**BM8 - Command palette on desktop prep/season surfaces only, not the phone cockpit.** Adds the one missing premium element (Cmd-K, Linear anchor) where it fits, and deliberately does not force it onto the touch-first draft cockpit.
- *Recommend: APPROVE.* Right tool, right surface; a Cmd-K on a phone at arm's length is theater.

---

## 4. Kill list (scrap, one-line reason)

- GRIDIRON `globals.css` token layer + the `--ffi-gold`-means-volt naming - the token system lies about what ships.
- Anton display face - NASCAR Hat Draw's locked face; cross-portfolio convergence slop.
- Three duplicate position-color palettes - drift + floor-failure source; collapse to one.
- Literal gold rgba on the live hero (`draft/live/client.tsx:985-987,1065,1097`) - bypasses the token remap.
- Ambient backdrop-blur (`app-shell.tsx:212` nav, `draft/live/client.tsx:937` sim HUD) - blur off the Sheet/Dialog/CommandPalette allowlist.
- Letter-in-a-circle avatar as the app's only imagery (`app-shell.tsx:38-57`) - the anti-imagery default.
- Bare spinner + text loading states (`review/client.tsx:279-286,384-389`, `board/client.tsx:293-299`) - replace with skeletons.
- `/prep/research` route (no `page.tsx`) - confirm dead scaffolding, then remove.

## 5. Repurpose list (kept structurally, reskinned)

- The entire engine, hooks, feeds, and sim mode - untouched logic, reskinned surfaces.
- The route structure - kept as-is. No new routes (the TV board route was dropped at L5).
- `explain.ts`, the format-split recommendation modules, the trash-talk trigger engine - keep.
- The designed empty state at `review/client.tsx:302-312` - the one good state pattern; promote it as the template for every empty/loading/error state.
- Auctioneer logic/state/patterns (state machine shape, board layout logic, feed dual-sync, trash-talk) - candidate reuse at build time, NOT its cockpit visual identity (cloning the look is convergence slop).
- The GRIDIRON mockups (`.claude/mockups/*`) - demoted to Reference Board tiles ("Pit Lane"), never the baseline.

---

## 6. G1 - how to vote

Reply per bold move: `APPROVE`, `REJECT`, or `REVISE: <what>`. You can batch (e.g. "BM1-8 approve" or "approve all except BM8"). On approval I log each as an `L#` entry in `UX_REDESIGN_STATE.md` and proceed to Step 2 (screen map + per-screen EA FC anchors, gated at G1.5). Kill list and repurpose list ride along with the bold-move votes unless you flag a specific line.
