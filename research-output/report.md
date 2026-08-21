# The Nasties - Draft Research Dataset

Generated 2026-08-21T01:57:46.383Z. 12-team, $200 auction, full PPR, no kicker.
Roster: QB1, RB1, WR1, TE1, FLEX3, DEF1, Bench5.
Players: 1000. Cache last updated 2026-08-20T01:00:27.018+00:00 (stale=true).
Sims: 400 Monte-Carlo runs per strategy, 14-game season, seed 42.

## Strategy leaderboard (which approach wins, and why)

| # | Strategy | Proj record | Modal record | Mean starter pts | Ceiling / Floor |
|---|----------|-------------|--------------|------------------|-----------------|
| 1 | Robust RB (RB-RB), heavy anchors | 9.8-4.2 | 11-3 (17.8%) | 1974.1 | $86 / $62 |
| 2 | RB-WR, heavy anchors | 9.8-4.2 | 11-3 (18.3%) | 1965.1 | $86 / $62 |
| 3 | Double RB + WR, heavy anchors | 9.8-4.2 | 11-3 (17.8%) | 1974.1 | $86 / $62 |
| 4 | WR-WR, heavy anchors | 9.8-4.2 | 12-2 (17.5%) | 1954.4 | $86 / $62 |
| 5 | Triple WR, heavy anchors | 9.8-4.2 | 12-2 (17.5%) | 1954.4 | $86 / $62 |
| 6 | Hero RB (RB + WR-WR), heavy anchors | 9.8-4.2 | 11-3 (18.3%) | 1965.1 | $86 / $62 |
| 7 | Elite TE anchor, heavy anchors | 9.7-4.3 | 11-3 (16.5%) | 1946.5 | $85 / $61 |
| 8 | Elite QB anchor, heavy anchors | 9.7-4.3 | 12-2 (16.5%) | 1955.2 | $84 / $60 |
| 9 | RB-WR, even split | 9.7-4.3 | 12-2 (16.5%) | 1953.2 | $84 / $60 |
| 10 | Robust RB (RB-RB), even split | 9.7-4.3 | 11-3 (16.5%) | 1953.3 | $83 / $59 |
| 11 | Triple WR, even split | 9.7-4.3 | 11-3 (16%) | 1947.9 | $83 / $59 |
| 12 | WR-WR, even split | 9.7-4.3 | 11-3 (16%) | 1947.9 | $83 / $59 |
| 13 | Hero RB (RB + WR-WR), even split | 9.7-4.3 | 12-2 (16.5%) | 1953.2 | $83 / $59 |
| 14 | Double RB + WR, even split | 9.7-4.3 | 11-3 (16.5%) | 1953.3 | $83 / $59 |
| 15 | Robust RB (RB-RB), light anchors | 9.7-4.3 | 12-2 (16.5%) | 1953.3 | $82 / $68 |
| 16 | RB-WR, light anchors | 9.7-4.3 | 12-2 (16.5%) | 1953.2 | $82 / $68 |
| 17 | Double RB + WR, light anchors | 9.7-4.3 | 12-2 (16.5%) | 1953.3 | $81 / $67 |
| 18 | WR-WR, light anchors | 9.7-4.3 | 11-3 (16%) | 1947.9 | $81 / $67 |
| 19 | Triple WR, light anchors | 9.7-4.3 | 11-3 (16%) | 1947.9 | $81 / $67 |
| 20 | Hero RB (RB + WR-WR), light anchors | 9.7-4.3 | 12-2 (16.5%) | 1953.2 | $81 / $67 |
| 21 | Zero RB (WR-WR-TE), light anchors | 9.7-4.3 | 11-3 (16%) | 1947.9 | $81 / $67 |
| 22 | Elite QB anchor, even split | 9.6-4.4 | 10-4 (17.5%) | 1949 | $81 / $57 |
| 23 | Elite TE anchor, even split | 9.5-4.5 | 11-3 (17%) | 1929.5 | $81 / $57 |
| 24 | Elite QB anchor, light anchors | 9.5-4.5 | 11-3 (16.5%) | 1933.4 | $79 / $65 |
| 25 | Elite TE anchor, light anchors | 9.4-4.6 | 10-4 (16.5%) | 1921.6 | $80 / $66 |
| 26 | Balanced (no anchor) | 9.4-4.6 | 10-4 (15.5%) | 1925.8 | $76 / $62 |

_Records above are graded with the measured risk model ON (real per-player
durability + tier bust/breakout from 15 seasons of Sleeper actuals)._

## Before/after: what the risk model did to each strategy

BEFORE grades every drafted player as if he plays all 14 games at his full
projection (the old basis that made "spend on two studs" look unbeatable).
AFTER applies the measured model. A bigger drop = a strategy the old grader
flattered because it never priced in that studs bust or miss time.

| # | Strategy | Before (healthy) | After (risk on) | Wins lost to risk |
|---|----------|------------------|-----------------|-------------------|
| 1 | Robust RB (RB-RB), heavy anchors | 11.2-2.8 | 9.8-4.2 | -1.4 |
| 2 | RB-WR, heavy anchors | 11-3 | 9.8-4.2 | -1.2 |
| 3 | Double RB + WR, heavy anchors | 11.2-2.8 | 9.8-4.2 | -1.4 |
| 4 | WR-WR, heavy anchors | 10.9-3.1 | 9.8-4.2 | -1.1 |
| 5 | Triple WR, heavy anchors | 10.9-3.1 | 9.8-4.2 | -1.1 |
| 6 | Hero RB (RB + WR-WR), heavy anchors | 11-3 | 9.8-4.2 | -1.2 |
| 7 | Elite TE anchor, heavy anchors | 10.7-3.3 | 9.7-4.3 | -1 |
| 8 | Elite QB anchor, heavy anchors | 10.9-3.1 | 9.7-4.3 | -1.2 |
| 9 | RB-WR, even split | 10.9-3.1 | 9.7-4.3 | -1.2 |
| 10 | Robust RB (RB-RB), even split | 10.9-3.1 | 9.7-4.3 | -1.2 |
| 11 | Triple WR, even split | 10.8-3.2 | 9.7-4.3 | -1.1 |
| 12 | WR-WR, even split | 10.8-3.2 | 9.7-4.3 | -1.1 |
| 13 | Hero RB (RB + WR-WR), even split | 10.9-3.1 | 9.7-4.3 | -1.2 |
| 14 | Double RB + WR, even split | 10.9-3.1 | 9.7-4.3 | -1.2 |
| 15 | Robust RB (RB-RB), light anchors | 10.9-3.1 | 9.7-4.3 | -1.2 |
| 16 | RB-WR, light anchors | 10.9-3.1 | 9.7-4.3 | -1.2 |
| 17 | Double RB + WR, light anchors | 10.9-3.1 | 9.7-4.3 | -1.2 |
| 18 | WR-WR, light anchors | 10.8-3.2 | 9.7-4.3 | -1.1 |
| 19 | Triple WR, light anchors | 10.8-3.2 | 9.7-4.3 | -1.1 |
| 20 | Hero RB (RB + WR-WR), light anchors | 10.9-3.1 | 9.7-4.3 | -1.2 |
| 21 | Zero RB (WR-WR-TE), light anchors | 10.8-3.2 | 9.7-4.3 | -1.1 |
| 22 | Elite QB anchor, even split | 10.8-3.2 | 9.6-4.4 | -1.2 |
| 23 | Elite TE anchor, even split | 10.6-3.4 | 9.5-4.5 | -1.1 |
| 24 | Elite QB anchor, light anchors | 10.6-3.4 | 9.5-4.5 | -1.1 |
| 25 | Elite TE anchor, light anchors | 10.4-3.6 | 9.4-4.6 | -1 |
| 26 | Balanced (no anchor) | 10.5-3.5 | 9.4-4.6 | -1.1 |

Healthy-basis winner: **Robust RB (RB-RB), heavy anchors** (11.2 wins).
Risk-adjusted winner: **Robust RB (RB-RB), heavy anchors** (9.8 wins).
The top strategy is unchanged once risk is priced in.

### 1. Robust RB (RB-RB), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/DEF/TE), rest at room price.

- Projected record: 9.8-4.2 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $194 on anchors and keeps $6 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 14%, TE 3%, DST 3%, K 0%, bench 1%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $67 (win by $74), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Davante Adams $13 (win by $14).
  Targets $183 + reserve $8 = $191 of $200 (completable).

  Most common roster cores this strategy landed:
  - 36% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 7% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10.2-3.8.
  - 4.5% of drafts: Jahmyr Gibbs + Jayden Daniels + Christian McCaffrey - avg spend $200, avg record 9.4-4.6.

  Players you land most:
  - Tony Pollard (RB): 85.8% of drafts, avg $1.
  - Zach Charbonnet (RB): 83.3% of drafts, avg $1.
  - Jahmyr Gibbs (RB): 83% of drafts, avg $88.
  - Jameson Williams (WR): 81.8% of drafts, avg $1.
  - Christian McCaffrey (RB): 81% of drafts, avg $85.
  - Luther Burden (WR): 77.5% of drafts, avg $1.
  - Courtland Sutton (WR): 76.8% of drafts, avg $1.
  - Houston Texans (DEF): 64.3% of drafts, avg $1.

### 2. RB-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/DEF/TE), rest at room price.

- Projected record: 9.8-4.2 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $190 on anchors and keeps $10 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 39%, TE 3%, DST 3%, K 0%, bench 4%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $179 + reserve $8 = $187 of $200 (completable).

  Most common roster cores this strategy landed:
  - 16% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.9-4.1.
  - 11.5% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.5-4.5.
  - 11% of drafts: Jahmyr Gibbs + Luther Burden III + Amon-Ra St. Brown - avg spend $200, avg record 9.4-4.6.

  Players you land most:
  - Jahmyr Gibbs (RB): 86.5% of drafts, avg $88.
  - Tony Pollard (RB): 84.8% of drafts, avg $1.
  - Jameson Williams (WR): 83% of drafts, avg $1.
  - Zach Charbonnet (RB): 82.8% of drafts, avg $1.
  - Courtland Sutton (WR): 76.8% of drafts, avg $1.
  - Luther Burden (WR): 75.8% of drafts, avg $1.
  - Houston Texans (DEF): 64.8% of drafts, avg $1.
  - Tee Higgins (WR): 61.8% of drafts, avg $1.

### 3. Double RB + WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.8-4.2 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $188 on anchors and keeps $12 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 8%, TE 6%, DST 3%, K 0%, bench 4%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $67 (win by $74), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $7 (win by $8).
  Targets $177 + reserve $8 = $185 of $200 (completable).

  Most common roster cores this strategy landed:
  - 36% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 7% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10.2-3.8.
  - 4.5% of drafts: Jahmyr Gibbs + Jayden Daniels + Christian McCaffrey - avg spend $200, avg record 9.4-4.6.

  Players you land most:
  - Tony Pollard (RB): 85.8% of drafts, avg $1.
  - Zach Charbonnet (RB): 83.3% of drafts, avg $1.
  - Jahmyr Gibbs (RB): 83% of drafts, avg $88.
  - Jameson Williams (WR): 81.8% of drafts, avg $1.
  - Christian McCaffrey (RB): 81% of drafts, avg $85.
  - Luther Burden (WR): 77.5% of drafts, avg $1.
  - Courtland Sutton (WR): 76.8% of drafts, avg $1.
  - Houston Texans (DEF): 64.3% of drafts, avg $1.

### 4. WR-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 9.8-4.2 (best 14-0, worst 2-12).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $183 on anchors and keeps $17 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 70%, TE 6%, DST 3%, K 0%, bench 7%.
- Target prices (expect / walk-up to win): Puka Nacua $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $7 (win by $8).
  Targets $172 + reserve $8 = $180 of $200 (completable).

  Most common roster cores this strategy landed:
  - 8.3% of drafts: Puka Nacua + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.9-4.1.
  - 7% of drafts: Puka Nacua + Jahmyr Gibbs + Luther Burden III - avg spend $200, avg record 10.6-3.4.
  - 7% of drafts: Puka Nacua + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.6-4.4.

  Players you land most:
  - Tony Pollard (RB): 82.8% of drafts, avg $1.
  - Jameson Williams (WR): 82.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 82% of drafts, avg $1.
  - Luther Burden (WR): 79.3% of drafts, avg $1.
  - Courtland Sutton (WR): 70.5% of drafts, avg $1.
  - Houston Texans (DEF): 68.8% of drafts, avg $1.
  - Puka Nacua (WR): 64.5% of drafts, avg $88.
  - Tee Higgins (WR): 64.5% of drafts, avg $1.

### 5. Triple WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 9.8-4.2 (best 14-0, worst 2-12).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $177 on anchors and keeps $23 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 71%, TE 2%, DST 3%, K 0%, bench 10%.
- Target prices (expect / walk-up to win): Puka Nacua $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Houston Texans $6 (win by $7).
  Targets $171 + reserve $8 = $179 of $200 (completable).

  Most common roster cores this strategy landed:
  - 8.3% of drafts: Puka Nacua + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.9-4.1.
  - 7% of drafts: Puka Nacua + Jahmyr Gibbs + Luther Burden III - avg spend $200, avg record 10.6-3.4.
  - 7% of drafts: Puka Nacua + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.6-4.4.

  Players you land most:
  - Tony Pollard (RB): 82.8% of drafts, avg $1.
  - Jameson Williams (WR): 82.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 82% of drafts, avg $1.
  - Luther Burden (WR): 79.3% of drafts, avg $1.
  - Courtland Sutton (WR): 70.5% of drafts, avg $1.
  - Houston Texans (DEF): 68.8% of drafts, avg $1.
  - Puka Nacua (WR): 64.5% of drafts, avg $88.
  - Tee Higgins (WR): 64.5% of drafts, avg $1.

### 6. Hero RB (RB + WR-WR), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.8-4.2 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $183 on anchors and keeps $17 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 33%, TE 6%, DST 3%, K 0%, bench 7%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $7 (win by $8).
  Targets $172 + reserve $8 = $180 of $200 (completable).

  Most common roster cores this strategy landed:
  - 16% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.9-4.1.
  - 11.5% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.5-4.5.
  - 11% of drafts: Jahmyr Gibbs + Luther Burden III + Amon-Ra St. Brown - avg spend $200, avg record 9.4-4.6.

  Players you land most:
  - Jahmyr Gibbs (RB): 86.5% of drafts, avg $88.
  - Tony Pollard (RB): 84.8% of drafts, avg $1.
  - Jameson Williams (WR): 83% of drafts, avg $1.
  - Zach Charbonnet (RB): 82.8% of drafts, avg $1.
  - Courtland Sutton (WR): 76.8% of drafts, avg $1.
  - Luther Burden (WR): 75.8% of drafts, avg $1.
  - Houston Texans (DEF): 64.8% of drafts, avg $1.
  - Tee Higgins (WR): 61.8% of drafts, avg $1.

### 7. Elite TE anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 2-12).
- Why: The board supports paying up for Puka Nacua (~$76), Brock Bowers (~$49), Luther Burden III (~$14). WR runs HOT (1.18x room vs national). This shape spends $175 on anchors and keeps $25 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 45%, TE 27%, DST 3%, K 0%, bench 11%.
- Target prices (expect / walk-up to win): Puka Nacua $76 (win by $84), Brock Bowers $49 (win by $54), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $164 + reserve $8 = $172 of $200 (completable).

  Most common roster cores this strategy landed:
  - 11% of drafts: Puka Nacua + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 8.3% of drafts: Puka Nacua + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 8% of drafts: Puka Nacua + Jahmyr Gibbs + Luther Burden III - avg spend $200, avg record 10.6-3.4.

  Players you land most:
  - Tony Pollard (RB): 84% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.8% of drafts, avg $1.
  - Jameson Williams (WR): 80.8% of drafts, avg $1.
  - Luther Burden (WR): 78% of drafts, avg $1.
  - Courtland Sutton (WR): 70.5% of drafts, avg $1.
  - Puka Nacua (WR): 68.3% of drafts, avg $88.
  - Houston Texans (DEF): 67% of drafts, avg $1.
  - Tee Higgins (WR): 63.8% of drafts, avg $1.

### 8. Elite QB anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Josh Allen (~$36), Zay Flowers (~$24). RB runs COOL (0.84x room vs national). This shape spends $179 on anchors and keeps $21 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 44%, WR 19%, TE 6%, DST 3%, K 0%, bench 10%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Josh Allen $36 (win by $40), Zay Flowers $24 (win by $26), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13).
  Targets $162 + reserve $8 = $170 of $200 (completable).

  Most common roster cores this strategy landed:
  - 18.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 15% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 4% of drafts: Ja'Marr Chase + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 10.8-3.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $88.
  - Tony Pollard (RB): 83.3% of drafts, avg $1.
  - Jameson Williams (WR): 82.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.3% of drafts, avg $1.
  - Courtland Sutton (WR): 76.5% of drafts, avg $1.
  - Luther Burden (WR): 76% of drafts, avg $1.
  - Houston Texans (DEF): 62.5% of drafts, avg $1.
  - Tee Higgins (WR): 60.3% of drafts, avg $1.

### 9. RB-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Zay Flowers (~$24), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $156 on anchors and keeps $44 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 19%, TE 6%, DST 3%, K 0%, bench 21%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Zay Flowers $24 (win by $26), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 18.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 15% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 4% of drafts: Ja'Marr Chase + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 10.8-3.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $88.
  - Tony Pollard (RB): 83% of drafts, avg $1.
  - Jameson Williams (WR): 82.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.3% of drafts, avg $1.
  - Courtland Sutton (WR): 76% of drafts, avg $1.
  - Luther Burden (WR): 75.3% of drafts, avg $1.
  - Houston Texans (DEF): 62.5% of drafts, avg $1.
  - Tee Higgins (WR): 60.3% of drafts, avg $1.

### 10. Robust RB (RB-RB), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$29), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $165 on anchors and keeps $35 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 53%, WR 15%, TE 6%, DST 3%, K 0%, bench 16%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $29 (win by $32), Emeka Egbuka $16 (win by $18), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14).
  Targets $148 + reserve $8 = $156 of $200 (completable).

  Most common roster cores this strategy landed:
  - 18.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 15% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 4% of drafts: Ja'Marr Chase + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 10.8-3.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $88.
  - Tony Pollard (RB): 82.8% of drafts, avg $1.
  - Jameson Williams (WR): 82.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.3% of drafts, avg $1.
  - Courtland Sutton (WR): 76% of drafts, avg $1.
  - Luther Burden (WR): 75.3% of drafts, avg $1.
  - Houston Texans (DEF): 62.8% of drafts, avg $1.
  - Tee Higgins (WR): 60.3% of drafts, avg $1.

### 11. Triple WR, even split  (wr-heavy-auction, aggressive risk)

Pool-generated WR Heavy (Auction): 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Zay Flowers (~$24), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $145 on anchors and keeps $55 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, even split. Built from the live board: wr heavy shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 55%, TE 2%, DST 3%, K 0%, bench 26%.
- Target prices (expect / walk-up to win): Puka Nacua $76 (win by $84), Zay Flowers $24 (win by $26), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Rome Odunze $9 (win by $10).
  Targets $134 + reserve $8 = $142 of $200 (completable).

  Most common roster cores this strategy landed:
  - 11% of drafts: Puka Nacua + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 8.3% of drafts: Puka Nacua + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 8% of drafts: Puka Nacua + Jahmyr Gibbs + Luther Burden III - avg spend $200, avg record 10.6-3.4.

  Players you land most:
  - Tony Pollard (RB): 83.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 82% of drafts, avg $1.
  - Jameson Williams (WR): 80% of drafts, avg $1.
  - Luther Burden (WR): 77.5% of drafts, avg $1.
  - Courtland Sutton (WR): 70.8% of drafts, avg $1.
  - Puka Nacua (WR): 68.3% of drafts, avg $88.
  - Houston Texans (DEF): 67% of drafts, avg $1.
  - Tee Higgins (WR): 63% of drafts, avg $1.

### 12. WR-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Zay Flowers (~$24), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $143 on anchors and keeps $57 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 50%, TE 6%, DST 3%, K 0%, bench 27%.
- Target prices (expect / walk-up to win): Puka Nacua $76 (win by $84), Zay Flowers $24 (win by $26), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $7 (win by $8).
  Targets $132 + reserve $8 = $140 of $200 (completable).

  Most common roster cores this strategy landed:
  - 11% of drafts: Puka Nacua + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 8.3% of drafts: Puka Nacua + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 8% of drafts: Puka Nacua + Jahmyr Gibbs + Luther Burden III - avg spend $200, avg record 10.6-3.4.

  Players you land most:
  - Tony Pollard (RB): 83.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 82% of drafts, avg $1.
  - Jameson Williams (WR): 80% of drafts, avg $1.
  - Luther Burden (WR): 77.5% of drafts, avg $1.
  - Courtland Sutton (WR): 70.8% of drafts, avg $1.
  - Puka Nacua (WR): 68.3% of drafts, avg $88.
  - Houston Texans (DEF): 67% of drafts, avg $1.
  - Tee Higgins (WR): 63% of drafts, avg $1.

### 13. Hero RB (RB + WR-WR), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Zay Flowers (~$24), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $151 on anchors and keeps $49 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 17%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Zay Flowers $24 (win by $26), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Rome Odunze $9 (win by $10).
  Targets $134 + reserve $8 = $142 of $200 (completable).

  Most common roster cores this strategy landed:
  - 18.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 15% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 4% of drafts: Ja'Marr Chase + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 10.8-3.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $88.
  - Tony Pollard (RB): 83% of drafts, avg $1.
  - Jameson Williams (WR): 82.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.3% of drafts, avg $1.
  - Courtland Sutton (WR): 76% of drafts, avg $1.
  - Luther Burden (WR): 75.3% of drafts, avg $1.
  - Houston Texans (DEF): 62.5% of drafts, avg $1.
  - Tee Higgins (WR): 60.3% of drafts, avg $1.

### 14. Double RB + WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$29), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $150 on anchors and keeps $50 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 53%, WR 8%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $29 (win by $32), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $7 (win by $8).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 18.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 15% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 4% of drafts: Ja'Marr Chase + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 10.8-3.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $88.
  - Tony Pollard (RB): 82.8% of drafts, avg $1.
  - Jameson Williams (WR): 82.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.3% of drafts, avg $1.
  - Courtland Sutton (WR): 76% of drafts, avg $1.
  - Luther Burden (WR): 75.3% of drafts, avg $1.
  - Houston Texans (DEF): 62.8% of drafts, avg $1.
  - Tee Higgins (WR): 60.3% of drafts, avg $1.

### 15. Robust RB (RB-RB), light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Emeka Egbuka (~$16), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $137 on anchors and keeps $63 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 39%, WR 15%, TE 6%, DST 3%, K 0%, bench 30%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Emeka Egbuka $16 (win by $18), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $7 (win by $8).
  Targets $126 + reserve $8 = $134 of $200 (completable).

  Most common roster cores this strategy landed:
  - 18.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 15% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 4% of drafts: Ja'Marr Chase + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 10.8-3.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $88.
  - Tony Pollard (RB): 83% of drafts, avg $1.
  - Jameson Williams (WR): 82.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.3% of drafts, avg $1.
  - Courtland Sutton (WR): 76% of drafts, avg $1.
  - Luther Burden (WR): 75.3% of drafts, avg $1.
  - Houston Texans (DEF): 62.5% of drafts, avg $1.
  - Tee Higgins (WR): 60.3% of drafts, avg $1.

### 16. RB-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Luther Burden III (~$14), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $138 on anchors and keeps $62 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 10%, TE 6%, DST 3%, K 0%, bench 30%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $7 (win by $8).
  Targets $122 + reserve $8 = $130 of $200 (completable).

  Most common roster cores this strategy landed:
  - 18.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 15% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 4% of drafts: Ja'Marr Chase + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 10.8-3.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $88.
  - Tony Pollard (RB): 83% of drafts, avg $1.
  - Jameson Williams (WR): 82.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.3% of drafts, avg $1.
  - Courtland Sutton (WR): 76% of drafts, avg $1.
  - Luther Burden (WR): 75.3% of drafts, avg $1.
  - Houston Texans (DEF): 62.5% of drafts, avg $1.
  - Tee Higgins (WR): 60.3% of drafts, avg $1.

### 17. Double RB + WR, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Luther Burden III (~$14), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $127 on anchors and keeps $73 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 39%, WR 10%, TE 6%, DST 3%, K 0%, bench 35%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $7 (win by $8), Carnell Tate $6 (win by $7).
  Targets $116 + reserve $8 = $124 of $200 (completable).

  Most common roster cores this strategy landed:
  - 18.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 15% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 4% of drafts: Ja'Marr Chase + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 10.8-3.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $88.
  - Tony Pollard (RB): 83% of drafts, avg $1.
  - Jameson Williams (WR): 82.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.3% of drafts, avg $1.
  - Courtland Sutton (WR): 76% of drafts, avg $1.
  - Luther Burden (WR): 75.3% of drafts, avg $1.
  - Houston Texans (DEF): 62.5% of drafts, avg $1.
  - Tee Higgins (WR): 60.3% of drafts, avg $1.

### 18. WR-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Jalen Hurts (~$13), Quinshon Judkins (~$12). WR runs HOT (1.18x room vs national). This shape spends $125 on anchors and keeps $75 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 41%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (expect / walk-up to win): Puka Nacua $76 (win by $84), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $7 (win by $8), Carnell Tate $6 (win by $7).
  Targets $114 + reserve $8 = $122 of $200 (completable).

  Most common roster cores this strategy landed:
  - 11% of drafts: Puka Nacua + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 8.3% of drafts: Puka Nacua + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 8% of drafts: Puka Nacua + Jahmyr Gibbs + Luther Burden III - avg spend $200, avg record 10.6-3.4.

  Players you land most:
  - Tony Pollard (RB): 83.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 82% of drafts, avg $1.
  - Jameson Williams (WR): 80% of drafts, avg $1.
  - Luther Burden (WR): 77.5% of drafts, avg $1.
  - Courtland Sutton (WR): 70.8% of drafts, avg $1.
  - Puka Nacua (WR): 68.3% of drafts, avg $88.
  - Houston Texans (DEF): 67% of drafts, avg $1.
  - Tee Higgins (WR): 63% of drafts, avg $1.

### 19. Triple WR, light anchors  (wr-heavy-auction, balanced risk)

Pool-generated WR Heavy (Auction): 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Jalen Hurts (~$13), Quinshon Judkins (~$12). WR runs HOT (1.18x room vs national). This shape spends $119 on anchors and keeps $81 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, light anchors. Built from the live board: wr heavy shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 42%, TE 2%, DST 3%, K 0%, bench 39%.
- Target prices (expect / walk-up to win): Puka Nacua $76 (win by $84), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Carnell Tate $6 (win by $7), Houston Texans $6 (win by $7).
  Targets $113 + reserve $8 = $121 of $200 (completable).

  Most common roster cores this strategy landed:
  - 11% of drafts: Puka Nacua + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 8.3% of drafts: Puka Nacua + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 8% of drafts: Puka Nacua + Jahmyr Gibbs + Luther Burden III - avg spend $200, avg record 10.6-3.4.

  Players you land most:
  - Tony Pollard (RB): 83.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 82% of drafts, avg $1.
  - Jameson Williams (WR): 80% of drafts, avg $1.
  - Luther Burden (WR): 77.5% of drafts, avg $1.
  - Courtland Sutton (WR): 70.8% of drafts, avg $1.
  - Puka Nacua (WR): 68.3% of drafts, avg $88.
  - Houston Texans (DEF): 67% of drafts, avg $1.
  - Tee Higgins (WR): 63% of drafts, avg $1.

### 20. Hero RB (RB + WR-WR), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/QB/TE/WR/DEF), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jalen Hurts (~$13), Quinshon Judkins (~$12). RB runs COOL (0.84x room vs national). This shape spends $125 on anchors and keeps $75 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 4%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $7 (win by $8), Carnell Tate $6 (win by $7).
  Targets $114 + reserve $8 = $122 of $200 (completable).

  Most common roster cores this strategy landed:
  - 18.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 15% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 4% of drafts: Ja'Marr Chase + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 10.8-3.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $88.
  - Tony Pollard (RB): 83% of drafts, avg $1.
  - Jameson Williams (WR): 82.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 81.3% of drafts, avg $1.
  - Courtland Sutton (WR): 76% of drafts, avg $1.
  - Luther Burden (WR): 75.3% of drafts, avg $1.
  - Houston Texans (DEF): 62.5% of drafts, avg $1.
  - Tee Higgins (WR): 60.3% of drafts, avg $1.

### 21. Zero RB (WR-WR-TE), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 9.7-4.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Jalen Hurts (~$13), Quinshon Judkins (~$12). WR runs HOT (1.18x room vs national). This shape spends $119 on anchors and keeps $81 to complete the roster at room prices.
- Philosophy: Pattern sweep: Zero RB (WR-WR-TE), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 41%, TE 3%, DST 3%, K 0%, bench 39%.
- Target prices (expect / walk-up to win): Puka Nacua $76 (win by $84), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Carnell Tate $6 (win by $7), Houston Texans $6 (win by $7).
  Targets $113 + reserve $8 = $121 of $200 (completable).

  Most common roster cores this strategy landed:
  - 11% of drafts: Puka Nacua + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 8.3% of drafts: Puka Nacua + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.8-4.2.
  - 8% of drafts: Puka Nacua + Jahmyr Gibbs + Luther Burden III - avg spend $200, avg record 10.6-3.4.

  Players you land most:
  - Tony Pollard (RB): 83.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 82% of drafts, avg $1.
  - Jameson Williams (WR): 80% of drafts, avg $1.
  - Luther Burden (WR): 77.5% of drafts, avg $1.
  - Courtland Sutton (WR): 70.8% of drafts, avg $1.
  - Puka Nacua (WR): 68.3% of drafts, avg $88.
  - Houston Texans (DEF): 67% of drafts, avg $1.
  - Tee Higgins (WR): 63% of drafts, avg $1.

### 22. Elite QB anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 9.6-4.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Christian McCaffrey (~$67), Josh Allen (~$36), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $152 on anchors and keeps $48 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 40%, WR 10%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (expect / walk-up to win): Christian McCaffrey $67 (win by $74), Josh Allen $36 (win by $40), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13), Sam LaPorta $7 (win by $8).
  Targets $136 + reserve $8 = $144 of $200 (completable).

  Most common roster cores this strategy landed:
  - 23.3% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.6-4.4.
  - 7.8% of drafts: Bijan Robinson + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9-5.
  - 5% of drafts: Zay Flowers + Bijan Robinson + Christian McCaffrey - avg spend $200, avg record 9.7-4.3.

  Players you land most:
  - Christian McCaffrey (RB): 86.8% of drafts, avg $85.
  - Tony Pollard (RB): 84.3% of drafts, avg $1.
  - Jameson Williams (WR): 82.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 80.8% of drafts, avg $1.
  - Luther Burden (WR): 75% of drafts, avg $1.
  - Courtland Sutton (WR): 74.8% of drafts, avg $1.
  - Houston Texans (DEF): 65.5% of drafts, avg $1.
  - Sam LaPorta (TE): 63.5% of drafts, avg $1.

### 23. Elite TE anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 9.5-4.5 (best 14-0, worst 1-13).
- Why: The board supports paying up for Justin Jefferson (~$57), Brock Bowers (~$49), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $143 on anchors and keeps $57 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 29%, TE 27%, DST 3%, K 0%, bench 27%.
- Target prices (expect / walk-up to win): Justin Jefferson $57 (win by $63), Brock Bowers $49 (win by $54), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Houston Texans $6 (win by $7).
  Targets $137 + reserve $8 = $145 of $200 (completable).

  Most common roster cores this strategy landed:
  - 13% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.6-4.4.
  - 9.3% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 2.8% of drafts: Jahmyr Gibbs + Zay Flowers + Justin Jefferson - avg spend $200, avg record 9.9-4.1.

  Players you land most:
  - Jameson Williams (WR): 81.3% of drafts, avg $1.
  - Tony Pollard (RB): 81.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 80.3% of drafts, avg $1.
  - Courtland Sutton (WR): 74.5% of drafts, avg $1.
  - Luther Burden (WR): 73% of drafts, avg $1.
  - Houston Texans (DEF): 63% of drafts, avg $1.
  - Sam LaPorta (TE): 60.3% of drafts, avg $1.
  - Tee Higgins (WR): 59.3% of drafts, avg $1.

### 24. Elite QB anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 9.5-4.5 (best 14-0, worst 1-13).
- Why: The board supports paying up for Saquon Barkley (~$42), Josh Allen (~$36), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $127 on anchors and keeps $73 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 27%, WR 10%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (expect / walk-up to win): Saquon Barkley $42 (win by $46), Josh Allen $36 (win by $40), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13), Sam LaPorta $7 (win by $8).
  Targets $111 + reserve $8 = $119 of $200 (completable).

  Most common roster cores this strategy landed:
  - 12.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.6-4.4.
  - 9.3% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 2.8% of drafts: Jahmyr Gibbs + Bijan Robinson + Garrett Wilson - avg spend $200, avg record 9.9-4.1.

  Players you land most:
  - Jameson Williams (WR): 81.8% of drafts, avg $1.
  - Tony Pollard (RB): 80.8% of drafts, avg $1.
  - Zach Charbonnet (RB): 79.8% of drafts, avg $1.
  - Courtland Sutton (WR): 75.3% of drafts, avg $1.
  - Luther Burden (WR): 74% of drafts, avg $1.
  - Houston Texans (DEF): 63.5% of drafts, avg $1.
  - Sam LaPorta (TE): 60.5% of drafts, avg $1.
  - Jahmyr Gibbs (RB): 59% of drafts, avg $87.

### 25. Elite TE anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (TE/WR/RB/QB/DEF), rest at room price.

- Projected record: 9.4-4.6 (best 14-0, worst 2-12).
- Why: The board supports paying up for Brock Bowers (~$49), Zay Flowers (~$24), Jalen Hurts (~$13). TE runs HOT (1.17x room vs national). This shape spends $118 on anchors and keeps $82 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 17%, TE 27%, DST 3%, K 0%, bench 39%.
- Target prices (expect / walk-up to win): Brock Bowers $49 (win by $54), Zay Flowers $24 (win by $26), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Rome Odunze $9 (win by $10).
  Targets $107 + reserve $8 = $115 of $200 (completable).

  Most common roster cores this strategy landed:
  - 13% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.6-4.4.
  - 9.3% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 3% of drafts: Bijan Robinson + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 8.6-5.4.

  Players you land most:
  - Tony Pollard (RB): 80.8% of drafts, avg $1.
  - Jameson Williams (WR): 79.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 78% of drafts, avg $1.
  - Courtland Sutton (WR): 73.3% of drafts, avg $1.
  - Luther Burden (WR): 71.5% of drafts, avg $1.
  - Houston Texans (DEF): 63.3% of drafts, avg $1.
  - Sam LaPorta (TE): 60.3% of drafts, avg $1.
  - Jahmyr Gibbs (RB): 59% of drafts, avg $87.

### 26. Balanced (no anchor)  (balanced-auction, conservative risk)

Pool-generated Balanced Auction: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 9.4-4.6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Emeka Egbuka (~$16), Luther Burden III (~$14), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $73 on anchors and keeps $127 to complete the roster at room prices.
- Philosophy: Pattern sweep: Balanced (no anchor). Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 7%, WR 15%, TE 6%, DST 3%, K 0%, bench 62%.
- Target prices (expect / walk-up to win): Emeka Egbuka $16 (win by $18), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $7 (win by $8).
  Targets $62 + reserve $8 = $70 of $200 (completable).

  Most common roster cores this strategy landed:
  - 13% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.6-4.4.
  - 9.3% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 10-4.
  - 3% of drafts: Bijan Robinson + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 8.6-5.4.

  Players you land most:
  - Tony Pollard (RB): 80% of drafts, avg $1.
  - Jameson Williams (WR): 79.8% of drafts, avg $1.
  - Zach Charbonnet (RB): 78% of drafts, avg $1.
  - Courtland Sutton (WR): 72% of drafts, avg $1.
  - Luther Burden (WR): 70.3% of drafts, avg $1.
  - Houston Texans (DEF): 63.8% of drafts, avg $1.
  - Sam LaPorta (TE): 59.3% of drafts, avg $1.
  - Jahmyr Gibbs (RB): 59% of drafts, avg $87.

## Specific stud combos (which exact players to target)

The strategy leaderboard above says which SHAPE wins. This tier says which
exact studs to buy inside each shape. Every combo is a completable $200
roster (the named anchors forced in, the rest filled at room price) graded
with the risk model on. Grouped by pattern, best projected record first.

### Top combos overall

| # | Anchors | Pattern | Proj record | Mean starter pts |
|---|---------|---------|-------------|------------------|
| 1 | Puka Nacua + Jaxon Smith-Njigba | WR-WR | 9.9-4.1 | 1956 |
| 2 | Jahmyr Gibbs + Puka Nacua | RB-WR | 9.9-4.1 | 1966 |
| 3 | Puka Nacua + Jaxon Smith-Njigba + Trey McBride | Zero RB (WR-WR-TE) | 9.9-4.1 | 1956 |
| 4 | Josh Allen + Jahmyr Gibbs + Puka Nacua | Elite QB anchor | 9.9-4.1 | 1965.8 |
| 5 | Lamar Jackson + Jahmyr Gibbs + Puka Nacua | Elite QB anchor | 9.9-4.1 | 1964.5 |
| 6 | Drake Maye + Jahmyr Gibbs + Puka Nacua | Elite QB anchor | 9.9-4.1 | 1965.5 |
| 7 | Jahmyr Gibbs + Christian McCaffrey | Robust RB (RB-RB) | 9.8-4.2 | 1974.1 |
| 8 | Jahmyr Gibbs + Bijan Robinson | Robust RB (RB-RB) | 9.8-4.2 | 1969.5 |
| 9 | Puka Nacua + Amon-Ra St. Brown | WR-WR | 9.8-4.2 | 1954.4 |
| 10 | Puka Nacua + Ja'Marr Chase | WR-WR | 9.8-4.2 | 1952.6 |
| 11 | Jahmyr Gibbs + Jaxon Smith-Njigba | RB-WR | 9.8-4.2 | 1963.4 |
| 12 | Jahmyr Gibbs + Amon-Ra St. Brown | RB-WR | 9.8-4.2 | 1965.1 |

### Robust RB (RB-RB)

- **Jahmyr Gibbs + Christian McCaffrey**: 9.8-4.2, 1974.1 starter pts - target Jahmyr Gibbs $76, Christian McCaffrey $67.
- **Jahmyr Gibbs + Bijan Robinson**: 9.8-4.2, 1969.5 starter pts - target Jahmyr Gibbs $76, Bijan Robinson $70.
- **Christian McCaffrey + Bijan Robinson**: 9.7-4.3, 1960.8 starter pts - target Bijan Robinson $70, Christian McCaffrey $67.

### WR-WR

- **Puka Nacua + Jaxon Smith-Njigba**: 9.9-4.1, 1956 starter pts - target Puka Nacua $76, Jaxon Smith-Njigba $72.
- **Puka Nacua + Amon-Ra St. Brown**: 9.8-4.2, 1954.4 starter pts - target Puka Nacua $76, Amon-Ra St. Brown $64.
- **Puka Nacua + Ja'Marr Chase**: 9.8-4.2, 1952.6 starter pts - target Ja'Marr Chase $79, Puka Nacua $76.

### RB-WR

- **Jahmyr Gibbs + Puka Nacua**: 9.9-4.1, 1966 starter pts - target Jahmyr Gibbs $76, Puka Nacua $76.
- **Jahmyr Gibbs + Jaxon Smith-Njigba**: 9.8-4.2, 1963.4 starter pts - target Jahmyr Gibbs $76, Jaxon Smith-Njigba $72.
- **Jahmyr Gibbs + Amon-Ra St. Brown**: 9.8-4.2, 1965.1 starter pts - target Jahmyr Gibbs $76, Amon-Ra St. Brown $64.

### Zero RB (WR-WR-TE)

- **Puka Nacua + Jaxon Smith-Njigba + Trey McBride**: 9.9-4.1, 1956 starter pts - target Puka Nacua $76, Jaxon Smith-Njigba $72, Trey McBride $35.
- **Puka Nacua + Amon-Ra St. Brown + Brock Bowers**: 9.8-4.2, 1953.4 starter pts - target Puka Nacua $76, Amon-Ra St. Brown $64, Brock Bowers $49.
- **Jaxon Smith-Njigba + Amon-Ra St. Brown + Brock Bowers**: 9.8-4.2, 1950.3 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Brock Bowers $49.

### Elite QB anchor

- **Josh Allen + Jahmyr Gibbs + Puka Nacua**: 9.9-4.1, 1965.8 starter pts - target Jahmyr Gibbs $76, Puka Nacua $76, Josh Allen $36.
- **Lamar Jackson + Jahmyr Gibbs + Puka Nacua**: 9.9-4.1, 1964.5 starter pts - target Jahmyr Gibbs $76, Puka Nacua $76, Lamar Jackson $32.
- **Drake Maye + Jahmyr Gibbs + Puka Nacua**: 9.9-4.1, 1965.5 starter pts - target Jahmyr Gibbs $76, Puka Nacua $76, Drake Maye $28.

### Elite TE anchor

- **Trey McBride + Puka Nacua + Amon-Ra St. Brown**: 9.8-4.2, 1954.4 starter pts - target Puka Nacua $76, Amon-Ra St. Brown $64, Trey McBride $35.
- **Trey McBride + Puka Nacua + Ja'Marr Chase**: 9.8-4.2, 1952.6 starter pts - target Ja'Marr Chase $79, Puka Nacua $76, Trey McBride $35.
- **Trey McBride + Jaxon Smith-Njigba + Amon-Ra St. Brown**: 9.8-4.2, 1951.2 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Trey McBride $35.

_No affordable elite combo: Triple WR, Double RB + WR, Hero RB (RB + WR-WR). The top studs at
those positions cost more than $200 combined at room price, so no concrete
elite combination completes a $200 roster - the room prices these shapes out._

## League intel (Nasties ledger)

Derived from 4 drafts (2022, 2023, 2024, 2025).

Simulated opponents (11 seats, real ledger owners drafting to their leans): Bruce, Crandall, Cross, Garrett, Kevin, Moe, Reggie, Shultz, Leems, Robbie, Moonshine.

Positional inflation (where the room over- or under-pays vs national):

| Pos | Room share | National | Multiplier | Read |
|-----|-----------|----------|-----------|------|
| RB | 38.6% | 46% | 0.8x | COOL |
| WR | 44.7% | 38% | 1.2x | HOT |
| QB | 7.7% | 8% | 1x | NEUTRAL |
| TE | 8.2% | 7% | 1.2x | HOT |
| DEF | 0.9% | 1% | 0.9x | NEUTRAL |

## Top targets by position (with the read)

### QB

- **Josh Allen** (BUF, bye 7) - $36-$39 (base $38) league band, land odds 12.5%.
  Fair value ~$38 (band $36-$39).
- **Lamar Jackson** (BAL, bye 13) - $32-$39 (base $36) league band, land odds 6.3%.
  Target - worth ~$39, room pays ~$32. Win him at or under $36.  [+$7 POCKET]
- **Drake Maye** (NE, bye 11) - $32-$38 (base $35) league band, land odds 12.5%.
  Target - worth ~$38, room pays ~$32. Win him at or under $35.  [+$6 POCKET]
- **Jalen Hurts** (PHI, bye 10) - $23-$33 (base $28) league band, land odds 0%.
  Target - worth ~$33, room pays ~$23. Win him at or under $28.  [+$10 POCKET]
- **Bo Nix** (DEN, bye 10) - $28-$33 (base $31) league band, land odds 0%.
  Target - worth ~$33, room pays ~$28. Win him at or under $31.  [+$5 POCKET]
- **Jayden Daniels** (WAS, bye 7) - $15-$26 (base $21) league band, land odds 12.5%.
  Target - worth ~$26, room pays ~$15. Win him at or under $21.  [+$11 POCKET]

### RB

- **Jahmyr Gibbs** (DET, bye 6) - $76-$96 (base $86) league band, land odds 0%.
  Anchor - pay up to $86 to lock a Tier 1 player.  [ELITE, +$20 POCKET]
- **Christian McCaffrey** (SF, bye 8) - $70-$83 (base $77) league band, land odds 6.3%.
  Target - worth ~$83, room pays ~$70. Win him at or under $77. Watch the injury tag - trim the bid.  [+$13 POCKET, INJ QUESTIONABLE]
- **Bijan Robinson** (ATL, bye 11) - $67-$80 (base $74) league band, land odds 12.5%.
  Anchor - pay up to $74 to lock a Tier 1 player.  [ELITE, +$13 POCKET]
- **Jonathan Taylor** (IND, bye 13) - $59-$60 (base $60) league band, land odds 12.5%.
  Fair value ~$60 (band $59-$60).
- **Ashton Jeanty** (LV, bye 13) - $57 league band, land odds 6.3%.
  Fair value ~$57.
- **Saquon Barkley** (PHI, bye 10) - $56-$60 (base $58) league band, land odds 6.3%.
  Let him go - room pays ~$60 over his ~$56 worth here.  [-$4 TAX]
- **Jeremiyah Love** (ARI, bye 14) - $44-$57 (base $51) league band, land odds 12.5%.
  Let him go - room pays ~$57 over his ~$44 worth here.  [-$13 TAX, INJ QUESTIONABLE]
- **James Cook III** (BUF, bye 7) - $43-$53 (base $48) league band, land odds 18.8%.
  Let him go - room pays ~$53 over his ~$43 worth here.  [-$10 TAX]
- **Chase Brown** (CIN, bye 6) - $41-$50 (base $46) league band, land odds 6.3%.
  Let him go - room pays ~$50 over his ~$41 worth here.  [-$9 TAX]
- **De'Von Achane** (MIA, bye 6) - $39-$45 (base $42) league band, land odds 12.5%.
  Let him go - room pays ~$45 over his ~$39 worth here.  [-$6 TAX]

### WR

- **Puka Nacua** (LAR, bye 11) - $79-$86 (base $83) league band, land odds 6.3%.
  Anchor - pay up to $83 to lock a Tier 1 player. Watch the injury tag - trim the bid.  [ELITE, +$7 POCKET, INJ QUESTIONABLE]
- **Jaxon Smith-Njigba** (SEA, bye 11) - $76-$78 (base $77) league band, land odds 0%.
  Anchor - pay up to $77 to lock a Tier 1 player.  [ELITE]
- **Amon-Ra St. Brown** (DET, bye 6) - $72-$74 (base $73) league band, land odds 12.5%.
  Anchor - pay up to $73 to lock a Tier 1 player.  [ELITE]
- **Ja'Marr Chase** (CIN, bye 6) - $64-$72 (base $68) league band, land odds 12.5%.
  Anchor - pay up to $68 to lock a Tier 1 player.  [ELITE, +$8 POCKET]
- **Justin Jefferson** (MIN, bye 6) - $57-$60 (base $59) league band, land odds 6.3%.
  Fair value ~$59 (band $57-$60).
- **CeeDee Lamb** (DAL, bye 14) - $49-$57 (base $53) league band, land odds 25%.
  Let him go - room pays ~$57 over his ~$49 worth here.  [-$8 TAX]
- **A.J. Brown** (NE, bye 11) - $43-$54 (base $49) league band, land odds 18.8%.
  Let him go - room pays ~$54 over his ~$43 worth here.  [-$11 TAX]
- **Drake London** (ATL, bye 11) - $41-$48 (base $45) league band, land odds 6.3%.
  Let him go - room pays ~$48 over his ~$41 worth here.  [-$7 TAX]
- **Zay Flowers** (BAL, bye 13) - $24-$41 (base $33) league band, land odds 6.3%.
  Target - worth ~$41, room pays ~$24. Win him at or under $33. Watch the injury tag - trim the bid.  [+$17 POCKET, INJ QUESTIONABLE]
- **Garrett Wilson** (NYJ, bye 13) - $23-$40 (base $32) league band, land odds 12.5%.
  Target - worth ~$40, room pays ~$23. Win him at or under $32.  [+$17 POCKET]

### TE

- **Brock Bowers** (LV, bye 13) - $49-$53 (base $51) league band, land odds 12.5%.
  Target - worth ~$53, room pays ~$49. Win him at or under $51.  [+$4 POCKET]
- **Trey McBride** (ARI, bye 14) - $40-$49 (base $45) league band, land odds 18.8%.
  Let him go - room pays ~$49 over his ~$40 worth here.  [-$9 TAX]
- **Colston Loveland** (CHI, bye 10) - $28-$35 (base $32) league band, land odds 0%.
  Let him go - room pays ~$35 over his ~$28 worth here.  [-$7 TAX]
- **Harold Fannin Jr.** (CLE, bye 11) - $24-$27 (base $26) league band, land odds 12.5%.
  Fair value ~$26 (band $24-$27).
- **Tyler Warren** (IND, bye 13) - $21-$23 (base $22) league band, land odds 0%.
  Fair value ~$22 (band $21-$23). Watch the injury tag - trim the bid.  [INJ QUESTIONABLE]
- **George Kittle** (SF, bye 8) - $21-$23 (base $22) league band, land odds 0%.
  Late flier - a $21-$23 bench dollar with real upside. Watch the injury tag - trim the bid.  [INJ PUP, SLEEPER]

### DEF

- **Houston Texans** (HOU, bye 8) - $6-$14 (base $10) league band.
  Target - worth ~$14, room pays ~$6. Win him at or under $10.  [+$8 POCKET]
- **Denver Broncos** (DEN, bye 10) - $3-$14 (base $9) league band.
  Target - worth ~$14, room pays ~$3. Win him at or under $9.  [+$11 POCKET]
- **Philadelphia Eagles** (PHI, bye 10) - $2-$13 (base $8) league band.
  Target - worth ~$13, room pays ~$2. Win him at or under $8.  [+$11 POCKET]
- **Pittsburgh Steelers** (PIT, bye 9) - $3-$13 (base $8) league band.
  Target - worth ~$13, room pays ~$3. Win him at or under $8.  [+$10 POCKET]
- **Baltimore Ravens** (BAL, bye 13) - $2-$10 (base $6) league band.
  Target - worth ~$10, room pays ~$2. Win him at or under $6.  [+$8 POCKET]
- **Los Angeles Rams** (LAR, bye 11) - $1-$8 (base $5) league band.
  Target - worth ~$8, room pays ~$1. Win him at or under $5.  [+$7 POCKET]

## Value pockets and sleepers (win them below the room)

- **Jahmyr Gibbs** (RB, DET) - Anchor - pay up to $86 to lock a Tier 1 player.  [ELITE, +$20 POCKET]
- **Zay Flowers** (WR, BAL) - Target - worth ~$41, room pays ~$24. Win him at or under $33. Watch the injury tag - trim the bid.  [+$17 POCKET, INJ QUESTIONABLE]
- **Garrett Wilson** (WR, NYJ) - Target - worth ~$40, room pays ~$23. Win him at or under $32.  [+$17 POCKET]
- **Bijan Robinson** (RB, ATL) - Anchor - pay up to $74 to lock a Tier 1 player.  [ELITE, +$13 POCKET]
- **Christian McCaffrey** (RB, SF) - Target - worth ~$83, room pays ~$70. Win him at or under $77. Watch the injury tag - trim the bid.  [+$13 POCKET, INJ QUESTIONABLE]
- **Luther Burden III** (WR, CHI) - Target - worth ~$27, room pays ~$14. Win him at or under $21.  [+$13 POCKET]
- **Jayden Daniels** (QB, WAS) - Target - worth ~$26, room pays ~$15. Win him at or under $21.  [+$11 POCKET]
- **Denver Broncos** (DEF, DEN) - Target - worth ~$14, room pays ~$3. Win him at or under $9.  [+$11 POCKET]
- **Philadelphia Eagles** (DEF, PHI) - Target - worth ~$13, room pays ~$2. Win him at or under $8.  [+$11 POCKET]
- **Jalen Hurts** (QB, PHI) - Target - worth ~$33, room pays ~$23. Win him at or under $28.  [+$10 POCKET]
- **Pittsburgh Steelers** (DEF, PIT) - Target - worth ~$13, room pays ~$3. Win him at or under $8.  [+$10 POCKET]
- **Ja'Marr Chase** (WR, CIN) - Anchor - pay up to $68 to lock a Tier 1 player.  [ELITE, +$8 POCKET]
- **Houston Texans** (DEF, HOU) - Target - worth ~$14, room pays ~$6. Win him at or under $10.  [+$8 POCKET]
- **Baltimore Ravens** (DEF, BAL) - Target - worth ~$10, room pays ~$2. Win him at or under $6.  [+$8 POCKET]
- **Puka Nacua** (WR, LAR) - Anchor - pay up to $83 to lock a Tier 1 player. Watch the injury tag - trim the bid.  [ELITE, +$7 POCKET, INJ QUESTIONABLE]
- **Lamar Jackson** (QB, BAL) - Target - worth ~$39, room pays ~$32. Win him at or under $36.  [+$7 POCKET]
- **Travis Etienne Jr.** (RB, NO) - Target - worth ~$26, room pays ~$19. Win him at or under $23.  [+$7 POCKET]
- **Chris Godwin Jr.** (WR, TB) - Target - worth ~$10, room pays ~$3. Win him at or under $7.  [+$7 POCKET]
- **Michael Pittman Jr.** (WR, PIT) - Target - worth ~$8, room pays ~$1. Win him at or under $5.  [+$7 POCKET]
- **Jaxson Dart** (QB, NYG) - Target - worth ~$20, room pays ~$13. Win him at or under $17.  [+$7 POCKET]
- **Los Angeles Rams** (DEF, LAR) - Target - worth ~$8, room pays ~$1. Win him at or under $5.  [+$7 POCKET]
- **Drake Maye** (QB, NE) - Target - worth ~$38, room pays ~$32. Win him at or under $35.  [+$6 POCKET]
- **Minnesota Vikings** (DEF, MIN) - Target - worth ~$7, room pays ~$1. Win him at or under $4.  [+$6 POCKET]
- **Cincinnati Bengals** (DEF, CIN) - Target - worth ~$7, room pays ~$1. Win him at or under $4.  [+$6 POCKET]
- **Breece Hall** (RB, NYJ) - Target - worth ~$31, room pays ~$26. Win him at or under $29. Watch the injury tag - trim the bid.  [+$5 POCKET, INJ QUESTIONABLE]

## Room tax (let someone else overpay)

- **Jeremiyah Love** (RB, ARI) - Let him go - room pays ~$57 over his ~$44 worth here.
- **A.J. Brown** (WR, NE) - Let him go - room pays ~$54 over his ~$43 worth here.
- **James Cook III** (RB, BUF) - Let him go - room pays ~$53 over his ~$43 worth here.
- **Chase Brown** (RB, CIN) - Let him go - room pays ~$50 over his ~$41 worth here.
- **Trey McBride** (TE, ARI) - Let him go - room pays ~$49 over his ~$40 worth here.
- **CeeDee Lamb** (WR, DAL) - Let him go - room pays ~$57 over his ~$49 worth here.
- **Aaron Jones** (RB, MIN) - Let him go - room pays ~$9 over his ~$1 worth here.
- **Drake London** (WR, ATL) - Let him go - room pays ~$48 over his ~$41 worth here.
- **Colston Loveland** (TE, CHI) - Let him go - room pays ~$35 over his ~$28 worth here.
- **Jaylen Warren** (RB, PIT) - Let him go - room pays ~$8 over his ~$1 worth here.
- **Kyle Monangai** (RB, CHI) - Let him go - room pays ~$9 over his ~$2 worth here.
- **De'Von Achane** (RB, MIA) - Let him go - room pays ~$45 over his ~$39 worth here.
- **Kenny Gainwell** (RB, TB) - Let him go - room pays ~$7 over his ~$1 worth here.
- **DeVonta Smith** (WR, PHI) - Let him go - room pays ~$38 over his ~$33 worth here.
- **Jadarian Price** (RB, SEA) - Let him go - room pays ~$6 over his ~$1 worth here.
- **Chuba Hubbard** (RB, CAR) - Let him go - room pays ~$6 over his ~$1 worth here.
- **Rashee Rice** (WR, KC) - Let him go - room pays ~$42 over his ~$38 worth here.
- **Saquon Barkley** (RB, PHI) - Let him go - room pays ~$60 over his ~$56 worth here.
- **Josh Jacobs** (RB, GB) - Let him go - room pays ~$42 over his ~$38 worth here.
- **Parker Washington** (WR, JAC) - Let him go - room pays ~$9 over his ~$5 worth here.

---

Full machine-readable data (every player, every strategy sim, league intel) is in `dataset.json`.
