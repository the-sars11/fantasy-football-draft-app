# UX Redesign Screen Map - Fantasy Football Draft Advisor

**Status:** APPROVED 2026-07-05 (G1.5 passed - Joe "approve"). 4 HERO screens, each with its own EA FC 25 surface anchor. TV board dropped at L5. Step 3 (personality lock) is now unblocked. See `UX_REDESIGN_STATE.md` L6.
**Step:** 2 of the dev-workflow-builder UX/UI universal process.
**Created:** 2026-07-05 (after G1 passed).
**Global anchor (personality lead):** EA FC 25 + Linear. Per the G1.5 rule, each HERO screen below names its OWN specific EA FC 25 surface. "EA FC" in general on every row is a failed map.
**Proof step:** Step B2 Reference Board. Before the first mockup of each HERO screen, Claude researches current EA FC 25 screens (Mobbin / gameplay stills, 12-18 month window) and builds a viewable annotated board so Joe points at which real screens land. This map assigns the anchors; the Reference Board proves them per screen at Step 4.

---

## HERO screens (4) - each with its own JTBD and its own named anchor

*(Amended L5 2026-07-05: the app does not drive a TV/shared display, so the former "TV board" HERO was dropped. HERO set is 4. "Broadcast feel" is now only a possible aesthetic for the personality lock, not a screen.)*

### 1. Live draft cockpit (phone) - `/draft/live`
- **JTBD:** When a player goes on the block, I want my max bid, value, and estimated cost instantly, so I decide in two seconds and log the sale.
- **Hero element:** the on-the-block player card (headshot + team mark + max / value / cost) with a Record Sale action. Strategy + record model, no bid stepper (BM2).
- **Anchor:** EA FC 25 **Ultimate Team player item detail screen** for the card composition (single-player hero: rating, position, key attributes as one confident object), plus the **pack-reveal / walkout** moment for the on-the-clock reveal. Linear for the calm advice + feed stack beneath the card.
- **Reasoning:** the item screen is EA's answer to "one player, all the numbers that matter, presented as a hero," which is exactly the two-second decision this screen serves.

### 2. Multi-team board (phone) - `/draft/live` (full-screen view)
- **JTBD:** When it is not my turn, I want every team's budget and roster at a glance, so I read the room and plan my next move.
- **Hero element:** the all-teams grid (per-team budget health + roster slots filled/open), promoted from a cramped panel to a first-class full-screen surface (BM1, amended L5).
- **Anchor:** EA FC 25 **Squad screen / Squad Building Challenge grid** (many slots, each a compact filled-or-empty card, whole-squad state readable at once).
- **Reasoning:** the squad grid is purpose-built for reading many roster slots in one look, which maps directly to reading twelve teams' rosters and money.

### 3. Prep board / player pool (phone + desktop) - `/prep/board`
- **JTBD:** When I prep, I want to scan and rank who is available by my scoring, so I build my draft board.
- **Hero element:** the dense rankable player list (rank, value, ADP, position, score) with filters and target/avoid cycling.
- **Anchor:** EA FC 25 **Transfer Market search-results list** (dense, filterable, numerals-forward rows) with Linear list discipline for density without claustrophobia.
- **Reasoning:** the transfer market is EA's dense, sortable, numbers-first list, matching a scan-and-rank prep board where the numerals are the hero.

### 4. Post-draft review - `/draft/review`
- **JTBD:** When the draft ends, I want my grade and the story of my picks, so I know how I did and what to fix.
- **Hero element:** the grade reveal + per-pick breakdown (steal / fair / reach verdicts, budget or snake analysis).
- **Anchor:** EA FC 25 **post-match player-ratings / match-summary screen** (a hero result up top, then a per-item breakdown below).
- **Reasoning:** the post-match summary is EA's "here is your result and the breakdown behind it," which is precisely this screen's job.

---

## SECONDARY and UTILITY screens (no own EA FC anchor required at G1.5)

These are rebuilt AFTER the heroes, as a token + primitive + state sweep, anchored to **Linear** (dense forms, lists, tables, command palette, designed states). They do not each need a bespoke EA FC surface; they inherit the locked personality tokens.

- SECONDARY (Linear sweep): draft setup, prep hub, configure league, strategies, keepers, runs/compare, simulate, season hub + start-sit + waivers + matchups + trade.
- SECONDARY, DEFERRED: player intel (`/prep/players`) - data is mocked; redesign once real (BM7).
- UTILITY (token sweep only): landing, settings, the four auth screens.

---

## Proposed HERO build order (confirmable at Step 4)

The personality lock (Step 3, G5) sets shared tokens first. Then one HERO screen at a time, Session A (mockup + lock, no code) then Session B (build + verify). Proposed order and reasoning:

1. **Live draft cockpit** - the flagship, carries the most, and is what UXV2-6 was blocked on. Building it first forces the token system to prove itself on the hardest screen.
2. **Multi-team board (phone)** - shares the card, board, and feed components with the cockpit, so it lands fast right after; completes the live-draft family.
3. **Prep board / player pool** - the highest-traffic non-draft-day screen.
4. **Post-draft review** - the finish; least time-critical, benefits from the mature token system.

*Recommendation:* build in this order. Alternative if you want a lower-risk warm-up: start with the prep board (a dense list is a smaller surface to shake down the tokens on) before the cockpit. My pick is still cockpit-first, because the tokens should be forged on the hardest screen, not retrofitted to it.

---

## G1.5 - how to approve

This is a HARD STOP. Reply per row or all: `APPROVE` the anchors as assigned, or `REVISE: <screen> -> <different EA FC surface>`. On approval I log it in `UX_REDESIGN_STATE.md` and proceed to Step 3 (personality lock, 8-section vote at G5), which is the gate that unblocks UI code.
