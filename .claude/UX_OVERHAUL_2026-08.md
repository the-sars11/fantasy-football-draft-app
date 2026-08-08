# UX Overhaul Plan — August 2026 (Nasties Auction ONLY)

**Status:** IA SPINE LOCKED 2026-08-08 — Joe approved the 4-tab spine (Research / Draft / Review / Setup, Research as landing) "as-is". Session 2 (nav reskeleton) is cleared to start.
**Supersedes:** `UX_IA_PROPOSAL.md` (2026-07-05), `UX_REDESIGN_SCREEN_MAP.md`, `UX_REDESIGN_STATE.md`. Those assumed a 4-group Prep/Draft/Season/More structure and a two-league (Joe auction + Tyler snake/keeper) product. Joe's 2026-08-08 direction resets that.
**Scope of THIS session:** review + document. No code. UX only (where things live, what buttons do). UI comes after sign-off; wiring/verify comes after UI.
**Hard scope for the whole overhaul:** The Nasties, ESPN, **auction only**. No snake. No keeper. No Tyler. No Season section. Mobile-first is the primary target; desktop is secondary.

---

## 1. What I actually found (review, with evidence)

I loaded all 9 screenshots and read the code behind them.

| Screen (shot) | Route | The problem | Evidence |
|---|---|---|---|
| Home / "Prep hub" (01) | `/prep` | A dumping ground. League Config, Player Research, Draft Board, Strategies, Run History, Player Browser, Keepers, Dry Run, Start Draft — all crammed as cards on one screen. No hierarchy. | `src/app/(app)/prep/page.tsx` |
| Configure League (02) | `/prep/configure` | Confusing, and renders the **WRONG roster** (K:1, RB:2, WR:2, FLEX:1, Bench:6 = the generic ESPN default the MASTER explicitly calls a "fire drill" mistake). Lives on the daily Home flow instead of admin. | `src/components/prep/league-config-form.tsx:242-250` (form defaults are the generic default) vs `:28` (`PRESETS.joe` is correct but only applies on manual button click) |
| Draft hub (03) | `/draft` | Four unrelated things on one screen: Draft Setup, Live Draft, Post-Draft Review, Demo Draft. "Draft" should be the live draft, nothing else. | `src/app/(app)/draft/page.tsx` |
| Live draft sim (04) | `/draft/live` | Undifferentiated wall of panels: SIM controls, squad, live feed, auction advisor, position scarcity grid, warnings, filters, player pool — no visual priority, nothing tells you where to look. | `src/app/(app)/draft/live/page.tsx` (client is a ~1255-line god component) |
| Settings (05) | `/settings` | Nearly empty AND wrong. Shows `joe.rasar@propermuse.co` (this is a **personal** app — PM firewall leak) and a pointless "Draft sounds" toggle. None of the real settings (league config, draft setup, run log) live here. | `src/app/(app)/settings/page.tsx` |
| Draft Board (06) | `/prep/board` | "Failed to load data / Failed to fetch leagues" — the data layer is broken. | `src/app/(app)/prep/board/page.tsx` |
| Research (07) | `/prep/research` | Page not found — dead route referenced somewhere in nav/cards. | no `page.tsx` at that path |
| Run History (08) | `/prep/runs` | "No leagues configured." Unclear what it is or why it's a top-level card. It's just a log of research runs. | `src/app/(app)/prep/runs/page.tsx` |
| Draft Setup (09) | `/draft/setup` | "No leagues configured yet" — same broken data layer; contradicts the Configure screen which shows a saved Nasties preset. | `src/app/(app)/draft/setup/page.tsx` |

**Mobile-first? Partially.** The shell HAS a mobile layout — bottom tab bar + swipe carousel + mobile header (`src/components/layout/app-shell.tsx:172-276`). So the plumbing exists. The screenshots are all desktop (the sidebar). The real failure isn't "no mobile" — it's that the **information architecture only has 3 tabs** (`app-shell.tsx:32-36`: Home / Draft / Settings), so ~15 real screens get dumped as cards onto 2 "hub" screens. Three tabs cannot hold this app. That is the root cause of "shit thrown all over."

---

## 2. Root problems (why it feels like garbage)

1. **IA collapse.** 3 nav tabs, ~15 real routes. Everything that doesn't fit becomes a card on a hub. No screen has one obvious home.
2. **The most-used thing is buried.** Player Research (where Joe lives pre-draft) is a card on Home, not a destination.
3. **Setup mixed into daily surfaces.** League config, draft setup, and a dev-only Demo button sit next to the things you use every day.
4. **The data layer is broken.** Configure shows a saved league; Board, Setup, and Runs all say "no leagues / failed to fetch." Nothing is actually persisted or read back consistently.
5. **Wrong defaults.** The config form renders the fire-drill ESPN default, not Joe's locked Nasties roster, even though the correct preset exists in code.
6. **Snake/keeper clutter.** Format toggle, keeper rules, keeper screen — dead weight in an auction-only app.
7. **Settings is empty of settings** and leaks a ProperMuse email into a personal app.
8. **The live draft is a wall.** No hierarchy, no clear "what do I do right now."
9. **Live auctioneer connection doesn't exist yet.** FF-314 (spec'd 2026-08-07) is unbuilt; there's no auto-detect, no persistent status chip, no interruption handling.

---

## 3. Proposed IA — the new spine (NEEDS JOE SIGN-OFF)

**Kill the generic Home hub.** Replace 3 tabs with **4 phase-based tabs**, each with exactly one job. Mobile bottom nav = these 4 (thumb-reachable). Desktop sidebar = the same 4.

| Tab | Icon | Purpose | This is the star when… | What lives here |
|---|---|---|---|---|
| **Research** (default landing) | search/target | Everything you do to prep. | Weeks before draft — where Joe lives most. | Run research, Player Browser, Draft Board / rankings, Tiers, Targets & Avoids. Research runs happen here; the run *log* lives in Setup. |
| **Draft** | lightning | The **live auction room ONLY**. | Draft night. | Pre-draft: a "Go Live" state showing auctioneer connection status. Live: the auction co-pilot (on-the-block card, max-bid advice, record-sale, budget, feed, scarcity). Post-draft: a single link to Review. Nothing else. |
| **Review** | trophy | Post-draft grade + breakdown. | Right after the draft. | Grade reveal, roster value, spend breakdown, targets hit/missed. Empty state before a draft exists; auto-surfaces after; also linked from Draft. |
| **Setup** | gear | League config + draft setup + admin + account. | When configuring, rarely. | League Config (Nasties defaults, editable), Draft Setup (connect auctioneer), Demo Draft (dev), Run History log, Account, Appearance. |

**Why 4 and not 3:** Joe explicitly wants Research as its own destination and Review as a separate screen. Four tabs is still thumb-friendly. Everything gets exactly one home.

**Why Research is the landing (not a dashboard):** a generic dashboard hub IS the "shit thrown everywhere" Joe hates. Research is the real home base during prep.

**What leaves the primary flow entirely:** League Config, Draft Setup, and Demo Draft all move OUT of daily surfaces into **Setup**. Run History becomes a log inside Setup.

**Parked / out of scope:** the `season/*` routes (start-sit, waivers, matchups, trade) are not in the current nav and Joe didn't mention them. They stay parked — not deleted, not surfaced — until Joe asks.

---

## 4. Per-screen spec — where everything lives + what every button does

### TAB 1 — Research (landing)
- **Primary action:** `Run Research` — runs the analysis engine for the Nasties scoring/roster. Shows last-run time + player count. (Cost note: this triggers Claude API calls — must stay behind an explicit button, never auto-run.)
- **Player Browser:** searchable/filterable full player pool. Filter by position, tier, target/avoid.
- **Draft Board:** the rankable, position-colored player list (fix the "failed to fetch" so it actually loads the Nasties league).
- **Tiers / Targets / Avoids:** surfaced from the latest run.
- **Empty state (no run yet):** one clear "Run your first research" call, not a scatter of cards.
- **Removed from here:** League Config card, Keepers card, Dry Run card, Start Draft card, Run History card → all move to their real homes.

### TAB 2 — Draft (live auction ONLY)
- **Before draft (not connected):** a single focused screen — "Connect to auctioneer" with the persistent connection chip (Section 6). One primary button: `Go Live`. Secondary: `Manual mode` (record picks by hand if the auctioneer isn't up).
- **During draft:** the co-pilot. Hierarchy top-to-bottom: on-the-block card + max-bid advice → record sale → your squad/budget → live feed → position scarcity → available players/filters. (This is the god-component that gets decomposed during the UI phase.)
- **After draft:** collapse the cockpit to a summary + one `Go to Review` link.
- **Removed from here:** Draft Setup, Demo Draft → move to Setup. Post-Draft Review → its own tab, linked from here.

### TAB 3 — Review (separate screen)
- Grade reveal + roster value + spend-by-position + targets hit/missed.
- **Empty state:** "No completed draft yet." Once a draft finishes, this populates and Draft links to it.

### TAB 4 — Setup (config + admin + account)
- **League Config:** the Nasties, pre-filled with the LOCKED roster (QB1/RB1/WR1/TE1/FLEX3/DEF1/**K0**/Bench5/IR1, 12 teams, $200, Full PPR — from `FANTASY_FOOTBALL_MASTER.md`). Fully editable. This is the ONLY config surface. Remove the Snake toggle and all keeper fields.
- **Draft Setup:** connect the auctioneer / choose manual mode / confirm managers. (The auction-night pre-flight.)
- **Demo Draft:** dev-only, clearly labeled, launches the sim.
- **Run History:** the log of past research runs (load/compare). Demoted from a top-level card to a list here.
- **Account:** name + email pulled from the signed-in user — NOT a hardcoded propermuse.co address.
- **Appearance:** light/dark. **Remove "Draft sounds" entirely.**

---

## 5. Auction-only cleanup (kill list)

- Snake format toggle (`league-config-form.tsx:182-199`) — remove; auction is the only format.
- All keeper UI: `/prep/keepers` route, the keeper card on Home, keeper rules block in config (`league-config-form.tsx:354+`), "import keepers" copy in Draft Setup.
- The dead `/prep/research` route (07 = 404) — remove or repoint to the Research tab.
- Fix the wrong roster default so the form renders Joe's locked Nasties roster by default (not the generic ESPN default).

## 6. Live auctioneer connection UX (FF-314) — the flows

Per the verified 2026-08-07 spec in `BUILD_PLAN.md:247-254`:
- **Auto-detect:** on the Draft tab, poll our own server proxy (`/api/auctioneer-feed`, which server-side fetches the deployed auctioneer's `/api/state` to dodge CORS) every ~3s. A non-null payload with `phase === 'drafting'` (or picks present) ⇒ auto-connect.
- **Persistent connection chip (always visible on Draft):** reuse the 4-state `ConnectionStatusPill` (LIVE / STALE / OFFLINE / MANUAL) from `FF-259`. LIVE = pulsing green + elapsed timer. STALE = last-seen time. OFFLINE = tap to expand error + `Retry`.
- **Interruption handling:** on poll failure, don't blow away state — go STALE, keep last-known picks/budget, keep retrying with backoff, surface `Retry now`.
- **Manual fallback:** if the auctioneer never comes up, `MANUAL` mode lets Joe record sales by hand; the chip shows MANUAL so he always knows the source.
- **Success criterion:** auctioneer live on its Vercel URL + one pick recorded ⇒ this app on a *different device* shows that pick within ~5s, budget/max-bid recompute, no CORS error.

---

## 7. Session plan (what we do, in order)

Each row is one session. Nothing after Session 1 starts until Joe signs off on Section 3.

| # | Session | Deliverable | Gate |
|---|---|---|---|
| 1 | **Review + plan** (this session) | This doc. | ✅ done — awaiting IA sign-off |
| 2 | **IA reskeleton** | New 4-tab nav (Research/Draft/Review/Setup), routes moved to match, no visual polish. Prove navigation works on mobile + desktop with screenshots. | IA signed off |
| 3 | **Research tab consolidation** | Research landing + Player Browser + Draft Board (data-layer fixed so it loads the Nasties league), tiers/targets. Kill the Home hub. | S2 merged |
| 4 | **Draft tab = live-only + connection** | Strip Draft to the live room; build FF-314 auto-connect + persistent chip + interruption/retry + manual fallback. | S3 merged |
| 5 | **Setup + data correctness** | Setup tab (config w/ locked Nasties defaults auto-seeded + editable, draft setup, demo, run log), Account from real user, remove sounds/snake/keeper. Fix "failed to fetch leagues." | S4 merged |
| 6 | **Review screen** | Post-draft review as its own tab, linked from Draft. | S5 merged |
| — | **UI phase** | Only after UX is right: visual system, hierarchy, motion, real imagery, arm's-length pass. Reference app + mockup + Joe sign-off before building (per quality gate). | S2-6 done |
| — | **Works-for-real phase** | End-to-end: seed Nasties, run research, go live against the auctioneer on a second device, record a full mock draft, review. Paste proof. | UI done |

---

## 8. Open decision for Joe (sign-off gate)

The only thing blocking Session 2 is the **spine in Section 3**: the 4 tabs **Research / Draft / Review / Setup**, Research as the landing, and everything setup-related pushed into Setup. Approve that (or revise the tab list) and we start executing sessions in order.

---

## 9. Per-screen layout blueprint (UX-S2.5) — the spec S3–S6 build to

**Written:** 2026-08-08 (docs only, no code). **This is the contract each build session implements — no screen gets built without its blueprint here.** It defines, for every screen: the ONE hero, the top-to-bottom section order, the single primary action (and what's demoted to secondary), the empty/loading/error states, and the tap-flow in and out. Grounded in the real routes on disk (confirmed 2026-08-08) and the locked Nasties config in `FANTASY_FOOTBALL_MASTER.md` (12 teams · $200 · Full PPR · QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1 · 13 draftable slots · no keepers).

### 9.0 Global frame conventions (apply to every screen)

The whole app is designed **phone-portrait first (~390pt)**. Desktop is the same content in a wider column — never a different layout.

- **One hero per screen, top.** Each screen has exactly ONE dominant element in the first viewport that answers "where am I / what's the one thing here." Never two co-equal heroes.
- **Vertical rhythm, not card confetti.** Sections stack top-to-bottom in priority order with clear hairline separation and generous spacing. No grid-of-equal-cards "hub" layouts anywhere (that pattern IS the problem this overhaul kills).
- **Primary action lives in the thumb zone.** The single primary action is a full-width (or bottom-pinned) button in the lower third of the screen, reachable one-handed. Everything else is a secondary control (text link, chip, icon, overflow menu).
- **Bottom tab bar is permanent** (Research / Draft / Review / Setup) except inside the **live draft room**, which goes full-screen focus (tab bar hidden, one "Leave draft" affordance) so nothing competes with the auction.
- **Three states are mandatory for every data surface:** loading (skeleton matching the real layout, never a bare spinner where content will land), empty (one clear next-step call, never a dead end), error (plain-language cause + one `Retry`, never a raw "Failed to fetch"). Any screen that reads the league/players/session must define all three below.
- **Sticky screen header** shows the screen name + at most one context chip (e.g. league name "The Nasties", or the connection pill on Draft). Back/close is top-left; overflow (rare secondary actions) top-right.
- **Tap-flow rule:** every screen states how you got in and the one obvious way out/forward, so no screen is a trap.

---

### TAB 1 — RESEARCH

#### 9.1 Research landing  (`/prep`)
The home base during prep. Replaces the current card-dump hub.

- **Hero:** the **Research Run panel** — big status block showing either "No research yet" or "Last run: {relative time} · {N} players analyzed", with the primary action inside it.
- **Section order (top→bottom):**
  1. Sticky header: "Research" + "The Nasties" chip.
  2. **Hero — Research Run panel** (status + primary CTA).
  3. **Jump-to row** (max 3 destinations, as a compact list, not a card grid): Player Browser · Draft Board · Strategies. Each is a single tappable row with label + one-line "what it's for" + chevron.
  4. **Latest-run highlights** (only after a run exists): top Targets, top Avoids, tier snapshot — read-only teasers that deep-link into the Board/Browser filtered to that view.
- **Primary action:** `Run Research` (full-width, in the hero). **Cost guard: this fires Claude API calls — always an explicit tap, never auto-run; button shows an inline "uses AI" hint.**
- **Demoted to secondary:** Player Browser, Draft Board, Strategies (now quiet list rows, not hero cards). Run History is GONE from here → it lives in Setup.
- **States:**
  - *Loading:* skeleton hero + 3 skeleton rows.
  - *Empty (no run):* hero reads "Run your first research" with one `Run Research` button and a single line explaining what it does. No highlights section, no scatter of cards.
  - *Error (run failed / league unreadable):* hero shows "Couldn't reach the research engine" + `Retry`; keeps last good highlights if any.
- **Tap-flow:** In = app launch / Research tab. Out = tap a jump row (Browser/Board/Strategies) or `Run Research` → progress → back to landing with fresh highlights.

#### 9.2 Player Browser  (`/prep/players`)
Search/scan the full player pool.

- **Hero:** the **search + filter bar** pinned at the top (this screen's job is find-a-player, so the finder is the hero, not any one player).
- **Section order:**
  1. Sticky header: "Players" + result count chip.
  2. **Hero — search field** + horizontal filter pills (Position · Tier · Target/Avoid). Pills scroll horizontally, thumb-swipeable.
  3. **Virtualized player list** — one row per player: name, position chip, team/bye, consensus value ($), tier. Tap a row → expand in place (intel/tags/why), not a new page.
- **Primary action:** none destructive — the primary interaction is **filter + tap-to-expand**. The per-row affordance (target/avoid toggle) is the only write action and is secondary.
- **Demoted to secondary:** advanced sort, tag management — behind the filter pills / row expansion.
- **States:**
  - *Loading:* shimmer rows in the list shape.
  - *Empty (no players cached):* "No player data yet — run research to populate the pool" + a `Run Research` deep-link (routes to 9.1).
  - *Empty (filters match nothing):* "No players match these filters" + `Clear filters`.
  - *Error:* "Couldn't load players" + `Retry`.
- **Tap-flow:** In = Research landing jump row (or deep-link from a highlight). Out = back to Research; or expand a row to read, collapse to continue.

#### 9.3 Draft Board  (`/prep/board`)
The rankable, position-colored big list — the pre-draft cheat sheet.

- **Hero:** the **ranked board list itself** (this screen IS the list; the meta strip sits above it but the list is the star).
- **Section order:**
  1. Sticky header: "Draft Board" + league chip.
  2. **Meta strip** (thin, above the list): format badge (Auction), strategy badge, player count, `Refresh`. League is fixed to The Nasties (single-league app) — no league picker clutter.
  3. **Filter/sort pills:** position pills (color-coded), sort (Value/Rank/ADP + direction), target/avoid cycle.
  4. **Hero — the board rows:** rank (mono), name, position chip, value $, ADP, score bar. Tap → expand insight/confidence/tags inline.
  5. **ADP movers** strip (horizontal chips) if data present.
- **Primary action:** `Refresh` board data (secondary-weight; this screen is mostly read/scan). No destructive primary.
- **Demoted to secondary:** everything is scan-first; expansion holds the detail.
- **States:**
  - *Loading:* skeleton rows.
  - *Empty (no league / no run):* "Run research to build your board" + deep-link to 9.1 — **replaces today's "Failed to load data / Failed to fetch leagues"** (that broken data layer is fixed in S3/S5; this blueprint says the surface must degrade to a real empty state, never a raw fetch error).
  - *Error:* plain "Couldn't load the board" + `Retry`.
- **Tap-flow:** In = Research jump row. Out = back to Research; expand/collapse rows in place.

#### 9.4 Strategies  (`/prep/strategies`) — Research sub-screen
- **Hero:** the **active strategy summary** (name + the plan in one glance: budget-by-position targets).
- **Section order:** header → active-strategy hero → editable position/budget allocations → saved-strategy list (load/compare) at the bottom.
- **Primary action:** `Save strategy`. Secondary: load a saved one, duplicate, edit allocations.
- **States:** *Loading* skeleton; *Empty* "No strategy yet — start from a template or build one" + one CTA; *Error* + `Retry`.
- **Tap-flow:** In = Research jump row. Out = back to Research; the active strategy then feeds the Board + live room.

> **Research sub-surfaces Tiers / Targets / Avoids** are not separate screens — they are **filtered views of the Board/Browser** reached from the landing's highlights. Do not build them as standalone routes.

> **Dry Run (`/prep/simulate`)** stays reachable but is a **Research power-tool, not a hero** — a single quiet entry (list row at the bottom of Strategies or the landing) labeled "Dry-run this strategy." It launches the sim; it is not a top-level card.

---

### TAB 2 — DRAFT  (live auction ONLY)

Two conceptual screens under one tab: the **pre-draft "Go Live"** state and the **live room**. The tab auto-shows whichever matches reality (poll says a draft is live → room; otherwise → Go Live).

#### 9.5 Draft — pre-draft "Go Live"  (`/draft`)
- **Hero:** the **connection status block** — the persistent 4-state `ConnectionStatusPill` (LIVE / STALE / OFFLINE / MANUAL) large and centered, with the current auctioneer status in plain words.
- **Section order:**
  1. Sticky header: "Draft" + the small pill (mirrors the hero).
  2. **Hero — connection block:** "Auctioneer not detected yet / Auctioneer is LIVE" + status detail.
  3. **Primary CTA:** `Go Live` (enters the room; enabled once a feed is detected, otherwise it says "Waiting for auctioneer…").
  4. **Secondary:** `Start in Manual mode` (record sales by hand if the auctioneer never comes up) — a text button under the primary, not a co-equal card.
  5. Tiny pre-flight line: which league/managers (read from Setup), with a link to Setup if something's wrong.
- **Primary action:** `Go Live`. **Demoted:** Manual mode (secondary button). **Removed from here entirely:** Draft Setup and Demo Draft (→ Setup tab), Post-Draft Review (→ Review tab).
- **States:**
  - *Loading (first poll):* pill = "Checking for a live auction…" spinner in the hero.
  - *Empty (no draft configured):* "Set up your draft first" + deep-link to Setup → Draft Setup.
  - *OFFLINE/error:* pill = OFFLINE, tap expands the error + `Retry now`; Manual mode always still available so Joe is never blocked.
- **Tap-flow:** In = Draft tab (default when no live draft). Out = `Go Live` → live room (9.6); or Manual mode → live room seeded manual.

#### 9.6 Draft — live auction room  (`/draft/live`)
The cockpit. Full-screen focus: **bottom tab bar hidden**, one "Leave draft" affordance top-left. This is the highest-stakes screen; strict hierarchy is the whole point (today it's an undifferentiated wall).

- **Hero:** the **On-the-Block card** — the player currently being auctioned + your **max-bid advice** (bid-up-to $X · value · est. cost). This is the one thing Joe looks at during a bid. Per the locked product model: **strategy + record-sale only — no bid stepper, no "Place Bid."**
- **Section order (strict priority, top→bottom):**
  1. Slim status bar: connection pill + elapsed + "Leave" (top-left).
  2. **Hero — On-the-Block card** (max-bid advice).
  3. **Record Sale** action (primary, directly under the hero — final price + winner).
  4. **Your squad + budget** (spent/remaining, slots filled of 13, $/slot remaining).
  5. **Live feed** (recent sales).
  6. **Position scarcity** (how many quality players left per position).
  7. **Available players / filters** (nominate-next scanning) — bottom, pull-up.
- **Primary action:** `Record Sale`. Everything below the fold is monitoring, not action. **Demoted/pulled-up:** player pool + filters live at the bottom / behind a pull-up so they never crowd the hero.
- **States:**
  - *Loading:* hero skeleton + "connecting to auctioneer".
  - *Between nominations (no one on the block):* hero shows "Waiting for next nomination" + your budget stays visible; feed keeps last sales.
  - *STALE (poll failed):* keep last-known board/budget, banner "Reconnecting…" + `Retry now` — never blank the cockpit.
  - *Draft complete:* hero collapses to a summary + single `Go to Review` button (→ 9.7).
- **Tap-flow:** In = `Go Live` from 9.5. Out = auto-transition to a "complete" summary → `Go to Review`; or "Leave draft" (confirm) back to the Draft tab.

---

### TAB 3 — REVIEW  (`/draft/review`)

#### 9.7 Post-draft Review
- **Hero:** the **grade reveal** — big letter grade + one-line verdict (broadcast moment), no gold (per GRIDIRON DNA).
- **Section order:** header → **grade hero** → roster value summary → spend-by-position breakdown → targets hit/missed → pick-by-pick timeline.
- **Primary action:** `Share / export` (secondary-weight; this screen is read-mostly). The real "action" is scanning the breakdown.
- **States:**
  - *Empty (no completed draft):* "No completed draft yet — your grade shows up here after draft night." Single line, no cards.
  - *Loading:* skeleton hero + skeleton stat tiles.
  - *Error:* "Couldn't load your draft review" + `Retry`.
- **Tap-flow:** In = auto-surfaced after a draft completes, or the `Go to Review` link from the live room, or the Review tab. Out = back to Research to prep next, or Draft.

---

### TAB 4 — SETUP  (`/settings` + admin sub-screens)

#### 9.8 Setup landing  (`/settings`)
Config + admin + account — the rarely-visited "back office." A clean settings **list**, not a hub of cards.

- **Hero:** none by design — this is a **grouped settings list** (a hero here would over-dramatize admin). The screen title "Setup" is the anchor.
- **Section order (grouped list, top→bottom):**
  1. **League** → League Config (9.9).
  2. **Draft** → Draft Setup (9.10) · Demo Draft (dev, clearly labeled).
  3. **History** → Run History (9.11).
  4. **Account** → name + email from the signed-in user.
  5. **Appearance** → light/dark.
- **Primary action:** none at the landing — each row navigates to its detail screen. Rows are single-tap with label + current-value summary + chevron.
- **Removed here:** the "Draft sounds" toggle (delete), any snake/keeper settings (auction-only).
- **States:** *Loading* skeleton rows; no empty state (settings always exist); *Error* only per-sub-screen.
- **Tap-flow:** In = Setup tab. Out = tap a group row → its detail; back returns to the list.

#### 9.9 League Config  (`/prep/configure`, surfaced under Setup)
The ONLY config surface.

- **Hero:** the **league identity summary** — "The Nasties · ESPN · Auction · 12 teams · $200 · Full PPR" as a read-first header, editable below.
- **Section order:** header → identity summary hero → roster slots (pre-filled to the LOCKED Nasties roster: QB1/RB1/WR1/TE1/FLEX3/DEF1/**K0**/Bench5/IR1) → budget/teams → scoring (Full PPR) → `Save`.
- **Primary action:** `Save league`. **Defaults must render the locked Nasties roster, NOT the generic ESPN 2RB/2WR/1FLEX/6-bench default** (today's bug — fixed in S5). **Remove** the snake/format toggle and all keeper fields.
- **States:** *Loading* skeleton form; *Empty (first run)* form pre-seeded with the Nasties defaults (never blank, never the generic default); *Error on save* inline message + values preserved.
- **Tap-flow:** In = Setup → League. Out = `Save` → back to Setup with the updated summary.

#### 9.10 Draft Setup  (`/draft/setup`, surfaced under Setup)
Auction-night pre-flight.

- **Hero:** the **connect-auctioneer block** (choose source: auto-detect auctioneer / manual mode) — mirrors the Draft tab's Go-Live intent but this is the configuration side.
- **Section order:** header → source/connection hero → confirm managers (the 12 Nasties owners) → `Confirm setup`.
- **Primary action:** `Confirm setup`. Secondary: choose manual mode. **Remove** the "import keepers" copy (auction-only).
- **States:** *Loading* skeleton; *Empty (no league)* "Configure your league first" + deep-link to 9.9 — **replaces today's "No leagues configured yet"** (broken data layer, fixed in S5); *Error* + `Retry`.
- **Tap-flow:** In = Setup → Draft, or the Draft tab's "set up first" deep-link. Out = `Confirm` → back to Setup; the Draft tab then shows Go Live.

#### 9.11 Run History  (`/prep/runs`, surfaced under Setup)
Demoted from a top-level card to a log.

- **Hero:** none — a **reverse-chronological list** of past research runs (date, player count, strategy). The list is the screen.
- **Section order:** header → run list (each row: timestamp, count, `Load` / `Compare`).
- **Primary action:** `Load` a run (secondary: `Compare`). Read-mostly.
- **States:** *Loading* shimmer rows; *Empty* "No research runs yet — run your first from Research" + deep-link to 9.1; *Error* + `Retry`.
- **Tap-flow:** In = Setup → History. Out = `Load` a run → returns you to Research/Board with that run active; back → Setup.

#### 9.12 Account  (under Setup)
- **Hero:** none — a short read-only profile block.
- **Section order:** name + email **pulled from the signed-in Supabase user** (NOT a hardcoded `propermuse.co` address — that PM-leak is removed in S5) → sign-out.
- **Primary action:** `Sign out` (secondary-weight).
- **States:** *Loading* skeleton line; *Error* "Couldn't load your account" + `Retry`.
- **Tap-flow:** In = Setup → Account. Out = back to Setup, or sign out → auth.

#### 9.13 Appearance  (under Setup)
- **Hero:** none — a single light/dark control.
- **Primary action:** toggle theme. **"Draft sounds" toggle is deleted.**
- **Tap-flow:** In = Setup → Appearance. Out = back to Setup.

---

### 9.14 Parked (not in scope this overhaul)
`season/*` (start-sit, waivers, matchups, trade) and `/prep/keepers` are **not surfaced** in the 4-tab spine. Keepers is on the auction-only kill list (Section 5). Season routes stay parked — not deleted, not navigable from the new nav — until Joe asks. No blueprint is written for them here.

---

**Blueprint sign-off gate:** S3–S6 implement the screens above exactly as specified. If a screen needs to deviate (a hero doesn't work, a state is missing), re-propose against this section before coding — do not silently redesign.
