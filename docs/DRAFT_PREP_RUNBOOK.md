# DRAFT PREP RUNBOOK — The Nasties

**What this is:** the repeatable, start-to-finish process that turns a fresh data
pull into the printable draft board Joe drafts off of. Run it every August. Same
steps next year and the year after. The year only changes in the filenames.

**League:** 12-team, $200, full-PPR, no-kicker, ESPN auction. Roster QB1 / RB1 /
WR1 / TE1 / FLEX3 / DEF1 / Bench5. Settings of record live in
`FANTASY_FOOTBALL_MASTER.md` (root of this repo and the auctioneer repo).

**The one rule that never changes:** no fabrication. Every price, tier, and pocket
number traces to `dataset.json` (real engine functions over the fresh data). The
only hand-gathered numbers are the breakout/bust source counts, and those trace to
real articles listed in `source-counts.json`. If the data does not support an
answer, the board says nothing, it does not guess.

---

## The pipeline in one picture

```
  npm run data:pull        (Sleeper players + FantasyPros ranks + auction values)
        v
  npm run data:calibrate   (league inflation + owner leans from the ledger)   [only if the ledger changed]
        v
  npm run risk:derive      (durability + bust/breakout risk model)            [only if you want a fresh risk pull]
        v
  npm run research:run     -> research-output/dataset.json  +  report.md      (the machine truth)
        v
  [ hand-tally articles ]  -> research-output/source-counts.json              (the ONE manual step)
        v
  python research-output/build-draft-board.py
        v
  {League}_Draft_Board_{data-date}.xlsx   (in research-output AND your Downloads)
```

Four automated commands, one hour of manual research, one board.

---

## Step 0 — Confirm league settings (2 minutes)

Open `FANTASY_FOOTBALL_MASTER.md`. Confirm teams, budget, roster slots, and scoring
still match. These rarely change. If they did change, update the constants at the
top of `scripts/research-run.ts` (`NUM_MANAGERS`, `BUDGET`, `NASTIES_LEAGUE`, the
league `id` string) before running anything. The `id` string carries the year
(`nasties-2026`); bump it so the dataset is labeled correctly.

## Step 1 — Fresh data pull (automated)

```bash
npm run data:pull
```

Seeds the player cache from Sleeper, layers on FantasyPros consensus ranks, and
computes the auction-value model. This is what makes the numbers current. Needs
`.env.local` with the Supabase keys (already set on Joe's machine).

## Step 2 — Recalibrate and re-derive risk (automated, optional most years)

```bash
npm run data:calibrate      # only if the Nasties ledger got a new draft added
npm run risk:derive         # only if you want a fresh durability/risk pull
```

Skip both if nothing upstream changed since last run. They are safe to run anyway;
they are deterministic and cost nothing.

## Step 3 — Run the research engine (automated)

```bash
npm run research:run
```

Chains the whole $0 engine (strategies, Monte-Carlo sims, per-player value bands,
tags, the read, league intel) and writes:

- `research-output/dataset.json` — the machine truth the board and every answer
  are built from.
- `research-output/report.md` — the human-readable strategy leaderboard and reads.

No Claude API call, no cost. Fixed seed, so reruns are identical.

## Step 4 — Hand-tally the articles (MANUAL — the only step a computer can't do)

This is the one step that requires reading real 2026 preseason articles, because
inventing a "breakout" or "bust" mention would be fabrication.

Open `research-output/source-counts.json`. For each outlet, update the list of
players it named as a breakout/sleeper or a bust this year. Rules:

- One outlet counts once per player, even if it calls him both a breakout and a
  sleeper.
- Only real mentions from real articles. Never add a name to pad a count.
- If an article only partially loaded, note it in the `notes` field and undercount
  rather than guess (that is what the 2026 Yahoo bust note does).
- Add a `season` bump and update `notes` each year.

The outlets checked this year: 8 breakout/sleeper (PFF, ESPN, SI, NFL.com,
FantasyPros, DraftSharks, CBS, Yahoo) and 6 bust (ESPN, FFToday, Yahoo, RotoWire,
CBS, WalterFootball). Add or drop outlets freely; the board counts whatever is in
the file and prints the outlet list on the "How to read this" tab automatically.

## Step 5 — Build the board (automated)

```bash
python research-output/build-draft-board.py
```

Reads `dataset.json` + `source-counts.json` and writes
`{League}_Draft_Board_{data-date}.xlsx` to BOTH `research-output/` (versioned copy)
and your `Downloads/` folder (for draft day). One tab per position plus a plain
English "How to read this" tab.

The three price columns, spelled out so they are never confused:

| Column | Means | Example (Drake London) |
|---|---|---|
| **Good $ (steal)** | bottom of the band, a clear win | $39 |
| **Win $ (target bid)** (yellow) | the number you aim for | **$47** |
| **Max $ (walk-away)** | hard ceiling, stop one dollar over | $54 |

Requires `openpyxl` (`pip install openpyxl`) — already installed on Joe's machine.

## Step 6 — Eyeball sign-off (Joe)

Open the board. Sanity-check the top of each position against the target sheet and
the report. Make any last pen-edits by hand (e.g. this year: nudging a Target down
one for a player with a heavy bust count the formula didn't fully penalize). The
board is the tool; your read is the final filter.

---

## What is automated vs. what is manual

| Step | Automated? |
|---|---|
| 0. Confirm settings | manual, 2 min |
| 1. `data:pull` | automated |
| 2. `data:calibrate` / `risk:derive` | automated (skip if nothing changed) |
| 3. `research:run` | automated |
| 4. Tally article mentions | **manual, ~1 hour** — the only real research |
| 5. `build-draft-board.py` | automated |
| 6. Eyeball sign-off | manual |

## Files that make this repeatable (committed, survive forever)

- `scripts/research-run.ts` — the engine orchestrator (already committed).
- `research-output/source-counts.json` — the editable outlet tallies (Step 4).
- `research-output/build-draft-board.py` — the board generator (Steps 5).
- `docs/DRAFT_PREP_RUNBOOK.md` — this file.

## Optional: the target sheet

`research-output/NASTIES_TARGET_SHEET.md` is the narrative one-pager (anchor plan,
pockets, let-them-overpay list). It is written by hand off `dataset.json` and
`report.md` each year. The board (Steps 5) is the mechanical, every-player tool;
the target sheet is the strategy summary. Regenerate it from the fresh report when
you want the narrative view.
