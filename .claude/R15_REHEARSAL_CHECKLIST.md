# R15 — Rehearsal GATE Checklist (Joe's hands, Joe's phone)

**This is a runbook, not a plan.** The plan of record stays the R15 card in `BUILD_PLAN.md`.
This file is the tap-through checklist Joe follows on his phone during the live rehearsal.

**Done-when (the gate):** Joe has run a full mock draft against the live auctioneer on his
phone with picks tracking, roster-aware advice correct, budgets right, offline-resync proven,
and no surprises. Anything that breaks becomes a short R15-fix list.

---

## What is confirmed live right now (verified 2026-08-20)

| Piece | URL | Status |
|-------|-----|--------|
| Draft app (Joe's phone opens this) | `https://fantasy-football-draft-app.vercel.app` | HTTP 200 |
| Live auctioneer (system of record) | `https://fantasy-auction-auctioneer.vercel.app` | HTTP 200 |
| Auctioneer `/api/state` | `.../api/state` | HTTP 200, returns live draft JSON |

Both are deployed and reachable. No dev server or same-LAN setup needed. Joe just opens
the app URL on his phone.

**One caveat about the auctioneer:** it holds exactly ONE active draft at a time (single
Redis key `draft-current`, 24h expiry). Right now it already has a live "The Nasties" draft
in it (team Rasar shows $169 spent). Starting a fresh mock on the auctioneer OVERWRITES that
one. That is fine for a rehearsal, just know the old state gets replaced.

---

## TWO decisions Joe makes before starting

### Decision 1 — Cost gate: rule-based ($0) or AI panels on (bills Claude)?

- **Rule-based only ($0)** — What-To-Do (HOLD/BID/PUSH/PASS), max bid, budget/pace, roster
  fit, scarcity. All 100% rule-based, zero API cost. **Recommended for the first rehearsal**
  so Joe proves the plumbing (picks tracking, budgets, offline-resync) without spending a cent.
- **AI panels on** — adds the optional Claude recommendation panels per pick. Real money.
  Requires Joe's typed approval ("yes / go / approved") BEFORE the run per the $0 gate.

**Recommendation: run the first R15 rule-based ($0).** Prove the mechanics are solid first;
turn AI panels on for a second pass only once the rule-based path is clean. No point paying
Claude to watch a run that might surface a plumbing bug.

### Decision 2 — Is the deployed app on the latest code?

The R14 fixes (F1 user-tags, F2 hub copy, F3 no-K board, F4 sim league name, F5 strategy
load) are committed and pushed to `main`. Vercel auto-deploys `main` on push, so the live URL
should already have them. **Pre-flight check below confirms this** so Joe is not rehearsing
against a stale build.

---

## Pre-flight (about 5 minutes, before touching the phone)

- [ ] **Confirm deployed build is current.** In an interactive terminal:
      `git log origin/main -1 --oneline` and confirm the top commit includes the R14 fixes
      (873f0eb / 6a31095 or later). If Vercel has not picked it up, redeploy from the Vercel
      dashboard (or push a no-op). Do NOT rehearse against a stale build.
- [ ] **Auctioneer draft is fresh.** Open the auctioneer on the laptop, start a NEW mock draft
      for "The Nasties" (12 teams, $200, PPR, no-kicker) so `draft-current` reflects a clean
      rehearsal, not leftover state. Confirm it shows `phase: drafting`.
- [ ] **Have a real session in the app.** On the phone, open the app, go to Draft Setup, and
      make sure there is a live `draft_session` pointed at the Nasties league (the room reads
      `?session=<id>`). If Joe is starting cold, create the session first.
- [ ] **Phone ready.** App open at `https://fantasy-football-draft-app.vercel.app`, screen
      timeout bumped up so it does not sleep mid-draft, on wifi or good signal.

---

## The walkthrough (Joe's hands, mobile, in order)

Walk it like a real draft night. At each step, the question is "does this do the right thing
and does it feel right on the phone," not just "does it load."

### Prep path (quick sanity, most of this is already signed off)
- [ ] **Research / hub** — the pull badge and the button agree (e.g. "3,150 players · FRESH"
      next to "Pull fresh data"). No contradictory copy. (F2 check.)
- [ ] **Player card** — open a player. Tags, projection range, sources, and roster fit all read
      cleanly. No raw IDs, no "-" where a number belongs.
- [ ] **Targets / avoids** — set a graded target and a graded avoid. They stick.
- [ ] **Strategies** — the ranked strategies render without a "Generate" button, an active one
      is selected. (F5: the live room should later inherit this active strategy.)
- [ ] **Cheat Sheet** — opens, readable at arm's length, no kicker rows anywhere. (F3 check.)

### Live room (the real test)
- [ ] **Enter the live room** for the session. It loads the session, league, players, AND the
      active strategy (advisor should NOT say "No strategy set"). (F5 check.)
- [ ] **Auto-connect to the auctioneer.** There is NO manual "join" button. The app polls the
      auctioneer every ~3 seconds and connects itself once it sees `phase: drafting`. Expect
      the connection to go live within about **3 to 6 seconds** of entering the room. The
      connection chip should read LIVE.
- [ ] **Make a pick on the auctioneer** (laptop). Within ~3s it should appear in the app's pick
      feed, correctly attributed to the manager and price. No duplicates.
- [ ] **Budget + pace** — after a pick, the buyer's remaining budget and the pace numbers
      update correctly. Money left, max-bid-per-player, and slots all move.
- [ ] **Roster-aware advice** — the What-To-Do call (HOLD/BID/PUSH/PASS) and max bid reflect
      Joe's actual roster and remaining needs, not a generic number. Target/avoid grades bias
      the advice.
- [ ] **Run several more picks** through to a realistic mid-draft state. Watch for any drift,
      double-count, or stale row.
- [ ] **F6 check** — watch for any rows showing `$1` with `PROJ = "-"`. If they appear on the
      real phone, note exactly which players and when (this was flagged in R14 as possibly a
      sandbox-only egress artifact; the phone is the real test).
- [ ] **Post Draft / review** — after the mock, the review screen summarizes the draft
      correctly (roster, spend, results).

### Offline-resync proof (the one that is easy to skip and must not be)
- [ ] With the room live and picks flowing, **turn the phone's wifi/data OFF** for ~15 seconds.
      The app should fall back to the last cached session (a "using cached data" state), and the
      pick feed should back off its polling (3s → 6s → 12s, capped ~15s) instead of erroring out
      to a dead screen.
- [ ] **Turn wifi/data back ON.** The app should resync on the next poll, reset to the ~3s
      cadence, and catch up to any picks that happened while offline. No lost picks, no dead-end.

---

## Pass / fail

**PASS the gate only if ALL of these were true on the real phone:**
- Picks tracked live from the auctioneer, correct manager + price, no dupes.
- Advisor loaded the active strategy (no "No strategy set") and gave roster-aware calls.
- Budgets, max bids, pace, and slots all correct throughout.
- Auto-connect landed within ~3 to 6 seconds, no manual join needed.
- Offline-resync proven: went offline, degraded gracefully, came back and caught up.
- No surprises, no dead-ends, nothing that looked cheap or broken.

**If anything failed:** write it as a short R15-fix list (one line each, with what/where), add
it under the R15 card in `BUILD_PLAN.md`, and fix before calling R15 done. Finding issues here
is expected and is exactly what this gate is for.

---

## After R15 passes

- [ ] Mark R15 `[x]` in `BUILD_PLAN.md`, update `WORKING_STATE.md`, add a `CHANGELOG.md` entry.
- [ ] Next up: Phase 4 — the SHIELD SP-track reskin (paused, retained). Functionality and
      rehearsal come first; the reskin runs last.
