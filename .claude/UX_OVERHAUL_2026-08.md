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
