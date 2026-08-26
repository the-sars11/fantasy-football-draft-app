# The Nasties - Draft Research Dataset

Generated 2026-08-26T17:34:01.889Z. 12-team, $200 auction, full PPR, no kicker.
Roster: QB1, RB1, WR1, TE1, FLEX3, DEF1, Bench5.
Players: 981. Cache last updated 2026-08-26T17:33:30.552+00:00 (stale=false).
Sims: 400 Monte-Carlo runs per strategy, 14-game season, seed 42.

## Strategy leaderboard (which approach wins, and why)

| # | Strategy | Proj record | Modal record | Mean starter pts | Ceiling / Floor |
|---|----------|-------------|--------------|------------------|-----------------|
| 1 | RB-WR, heavy anchors | 9-5 | 10-4 (14.3%) | 1959.3 | $86 / $62 |
| 2 | Hero RB (RB + WR-WR), heavy anchors | 8.9-5.1 | 10-4 (14%) | 1961.4 | $86 / $62 |
| 3 | Triple WR, light anchors | 8.9-5.1 | 10-4 (15.8%) | 1919.7 | $85 / $61 |
| 4 | Robust RB (RB-RB), even split | 8.9-5.1 | 10-4 (15.5%) | 1937.5 | $83 / $59 |
| 5 | RB-WR, light anchors | 8.9-5.1 | 10-4 (13.8%) | 1923.7 | $82 / $68 |
| 6 | Hero RB (RB + WR-WR), light anchors | 8.8-5.2 | 9-5 (15.3%) | 1950.8 | $86 / $62 |
| 7 | RB-WR, even split | 8.8-5.2 | 10-4 (14.5%) | 1931.8 | $84 / $60 |
| 8 | Hero RB (RB + WR-WR), even split | 8.8-5.2 | 10-4 (15.5%) | 1928.1 | $83 / $59 |
| 9 | Double RB + WR, even split | 8.8-5.2 | 10-4 (15.3%) | 1934.4 | $83 / $59 |
| 10 | Triple WR, heavy anchors | 8.7-5.3 | 10-4 (16.3%) | 1923 | $86 / $62 |
| 11 | WR-WR, heavy anchors | 8.7-5.3 | 10-4 (16.3%) | 1923 | $85 / $61 |
| 12 | Elite TE anchor, even split | 8.7-5.3 | 9-5 (15.5%) | 1867.6 | $81 / $57 |
| 13 | Double RB + WR, heavy anchors | 8.6-5.4 | 10-4 (17.8%) | 1943.2 | $86 / $62 |
| 14 | Robust RB (RB-RB), heavy anchors | 8.6-5.4 | 10-4 (15.8%) | 1943.9 | $86 / $62 |
| 15 | Zero RB (WR-WR-TE), light anchors | 8.6-5.4 | 11-3 (13.8%) | 1880.9 | $84 / $60 |
| 16 | Robust RB (RB-RB), light anchors | 8.6-5.4 | 9-5 (15.8%) | 1909.1 | $81 / $67 |
| 17 | WR-WR, light anchors | 8.6-5.4 | 8-6 (14%) | 1880 | $81 / $67 |
| 18 | Double RB + WR, light anchors | 8.6-5.4 | 10-4 (16.5%) | 1909.2 | $80 / $66 |
| 19 | Elite QB anchor, heavy anchors | 8.5-5.5 | 9-5 (14%) | 1917.6 | $84 / $60 |
| 20 | Triple WR, even split | 8.5-5.5 | 10-4 (14.5%) | 1883.6 | $83 / $59 |
| 21 | WR-WR, even split | 8.5-5.5 | 10-4 (14.5%) | 1883.6 | $83 / $59 |
| 22 | Elite TE anchor, light anchors | 8.5-5.5 | 10-4 (14.8%) | 1841.9 | $80 / $66 |
| 23 | Balanced (no anchor) | 8.5-5.5 | 11-3 (13.5%) | 1832.1 | $76 / $62 |
| 24 | Elite TE anchor, heavy anchors | 8.4-5.6 | 9-5 (14.5%) | 1868.7 | $85 / $61 |
| 25 | Elite QB anchor, even split | 8.4-5.6 | 10-4 (14.3%) | 1885.7 | $81 / $57 |
| 26 | Elite QB anchor, light anchors | 8.4-5.6 | 8-6 (15%) | 1868.5 | $78 / $64 |

_Records above are graded with the measured risk model ON (real per-player
durability + tier bust/breakout from 15 seasons of Sleeper actuals)._

## Before/after: what the risk model did to each strategy

BEFORE grades every drafted player as if he plays all 14 games at his full
projection (the old basis that made "spend on two studs" look unbeatable).
AFTER applies the measured model. A bigger drop = a strategy the old grader
flattered because it never priced in that studs bust or miss time.

| # | Strategy | Before (healthy) | After (risk on) | Wins lost to risk |
|---|----------|------------------|-----------------|-------------------|
| 1 | RB-WR, heavy anchors | 9.8-4.2 | 9-5 | -0.8 |
| 2 | Hero RB (RB + WR-WR), heavy anchors | 9.8-4.2 | 8.9-5.1 | -0.9 |
| 3 | Triple WR, light anchors | 9.3-4.7 | 8.9-5.1 | -0.4 |
| 4 | Robust RB (RB-RB), even split | 9.5-4.5 | 8.9-5.1 | -0.6 |
| 5 | RB-WR, light anchors | 9.3-4.7 | 8.9-5.1 | -0.4 |
| 6 | Hero RB (RB + WR-WR), light anchors | 9.7-4.3 | 8.8-5.2 | -0.9 |
| 7 | RB-WR, even split | 9.5-4.5 | 8.8-5.2 | -0.7 |
| 8 | Hero RB (RB + WR-WR), even split | 9.4-4.6 | 8.8-5.2 | -0.6 |
| 9 | Double RB + WR, even split | 9.5-4.5 | 8.8-5.2 | -0.7 |
| 10 | Triple WR, heavy anchors | 9.2-4.8 | 8.7-5.3 | -0.5 |
| 11 | WR-WR, heavy anchors | 9.2-4.8 | 8.7-5.3 | -0.5 |
| 12 | Elite TE anchor, even split | 8.5-5.5 | 8.7-5.3 | +0.2 |
| 13 | Double RB + WR, heavy anchors | 9.6-4.4 | 8.6-5.4 | -1 |
| 14 | Robust RB (RB-RB), heavy anchors | 9.5-4.5 | 8.6-5.4 | -0.9 |
| 15 | Zero RB (WR-WR-TE), light anchors | 8.7-5.3 | 8.6-5.4 | -0.1 |
| 16 | Robust RB (RB-RB), light anchors | 9.1-4.9 | 8.6-5.4 | -0.5 |
| 17 | WR-WR, light anchors | 8.7-5.3 | 8.6-5.4 | -0.1 |
| 18 | Double RB + WR, light anchors | 9.1-4.9 | 8.6-5.4 | -0.5 |
| 19 | Elite QB anchor, heavy anchors | 9.3-4.7 | 8.5-5.5 | -0.8 |
| 20 | Triple WR, even split | 8.8-5.2 | 8.5-5.5 | -0.3 |
| 21 | WR-WR, even split | 8.8-5.2 | 8.5-5.5 | -0.3 |
| 22 | Elite TE anchor, light anchors | 8.1-5.9 | 8.5-5.5 | +0.4 |
| 23 | Balanced (no anchor) | 8-6 | 8.5-5.5 | +0.5 |
| 24 | Elite TE anchor, heavy anchors | 8.5-5.5 | 8.4-5.6 | -0.1 |
| 25 | Elite QB anchor, even split | 8.7-5.3 | 8.4-5.6 | -0.3 |
| 26 | Elite QB anchor, light anchors | 8.5-5.5 | 8.4-5.6 | -0.1 |

Healthy-basis winner: **RB-WR, heavy anchors** (9.8 wins).
Risk-adjusted winner: **RB-WR, heavy anchors** (9 wins).
The top strategy is unchanged once risk is priced in.

### 1. RB-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9-5 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $192 on anchors and keeps $8 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 40%, TE 3%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Emeka Egbuka $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12).
  Targets $180 + reserve $8 = $188 of $200 (completable).

  Most common roster cores this strategy landed:
  - 35.3% of drafts: Jahmyr Gibbs + Quinshon Judkins + Amon-Ra St. Brown - avg spend $198, avg record 9.3-4.7.
  - 16% of drafts: Jahmyr Gibbs + Emeka Egbuka + Amon-Ra St. Brown - avg spend $199, avg record 7.9-6.1.
  - 10.8% of drafts: Jahmyr Gibbs + Jalen Hurts + Amon-Ra St. Brown - avg spend $198, avg record 9.3-4.7.

  Players you land most:
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Amon-Ra St. Brown (WR): 91.5% of drafts, avg $76.
  - Bo Nix (QB): 67.8% of drafts, avg $1.
  - Quinshon Judkins (RB): 67.3% of drafts, avg $14.
  - Courtland Sutton (WR): 67% of drafts, avg $1.
  - Zach Charbonnet (RB): 57% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 37.8% of drafts, avg $1.
  - Emeka Egbuka (WR): 35.5% of drafts, avg $19.

### 2. Hero RB (RB + WR-WR), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.9-5.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $182 on anchors and keeps $18 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 33%, TE 6%, DST 3%, K 0%, bench 7%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 44% of drafts: Jahmyr Gibbs + Quinshon Judkins + Amon-Ra St. Brown - avg spend $198, avg record 9-5.
  - 13.8% of drafts: Jahmyr Gibbs + Jalen Hurts + Amon-Ra St. Brown - avg spend $198, avg record 8.9-5.1.
  - 4.5% of drafts: Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Amon-Ra St. Brown - avg spend $200, avg record 8-6.

  Players you land most:
  - Jahmyr Gibbs (RB): 92.3% of drafts, avg $87.
  - Amon-Ra St. Brown (WR): 91.5% of drafts, avg $76.
  - Quinshon Judkins (RB): 77% of drafts, avg $14.
  - Bo Nix (QB): 67.8% of drafts, avg $1.
  - Courtland Sutton (WR): 66% of drafts, avg $1.
  - Zach Charbonnet (RB): 55% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 37% of drafts, avg $1.
  - Josh Downs (WR): 29.5% of drafts, avg $1.

### 3. Triple WR, light anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/QB/RB/DEF/TE), rest at room price.

- Projected record: 8.9-5.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Jaxon Smith-Njigba (~$72), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $191 on anchors and keeps $9 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, light anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 6%, WR 78%, TE 2%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Jaxon Smith-Njigba $72 (win by $79), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12), Rome Odunze $8 (win by $9).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 25.3% of drafts: Puka Nacua + Quinshon Judkins + Jaxon Smith-Njigba - avg spend $200, avg record 8.8-5.2.
  - 11.5% of drafts: Puka Nacua + Rome Odunze + Jaxon Smith-Njigba - avg spend $198, avg record 8.7-5.3.
  - 4.5% of drafts: Puka Nacua + Jaxon Smith-Njigba - avg spend $198, avg record 9.5-4.5.

  Players you land most:
  - Jaxon Smith-Njigba (WR): 93% of drafts, avg $85.
  - Quinshon Judkins (RB): 74% of drafts, avg $14.
  - Bo Nix (QB): 68% of drafts, avg $1.
  - Courtland Sutton (WR): 61.5% of drafts, avg $1.
  - Puka Nacua (WR): 56.3% of drafts, avg $87.
  - Zach Charbonnet (RB): 54% of drafts, avg $1.
  - Rome Odunze (WR): 40.8% of drafts, avg $10.
  - Michael Pittman Jr. (WR): 34.3% of drafts, avg $1.

### 4. Robust RB (RB-RB), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.9-5.1 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$26), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $161 on anchors and keeps $39 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 51%, WR 14%, TE 6%, DST 3%, K 0%, bench 19%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $26 (win by $29), Emeka Egbuka $16 (win by $18), Jalen Hurts $13 (win by $14), Davante Adams $12 (room $13, 0.94x durability) (win by $13).
  Targets $143 + reserve $8 = $151 of $200 (completable).

  Most common roster cores this strategy landed:
  - 5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jeremiyah Love + Davante Adams + Jalen Hurts - avg spend $193, avg record 8.8-5.2.
  - 1.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jeremiyah Love + Jalen Hurts + Travis Etienne Jr. - avg spend $194, avg record 7.7-6.3.
  - 1.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jeremiyah Love + Zay Flowers + Jalen Hurts - avg spend $197, avg record 8.3-5.7.

  Players you land most:
  - Jeremiyah Love (RB): 95.8% of drafts, avg $32.
  - Jahmyr Gibbs (RB): 94.5% of drafts, avg $87.
  - Emeka Egbuka (WR): 78.3% of drafts, avg $19.
  - Bo Nix (QB): 65% of drafts, avg $1.
  - Davante Adams (WR): 56.8% of drafts, avg $15.
  - Courtland Sutton (WR): 51% of drafts, avg $1.
  - Jalen Hurts (QB): 45.3% of drafts, avg $18.
  - Zach Charbonnet (RB): 42.3% of drafts, avg $1.

### 5. RB-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.9-5.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Emeka Egbuka (~$16), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $141 on anchors and keeps $59 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 12%, TE 6%, DST 3%, K 0%, bench 28%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Emeka Egbuka $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12), Rome Odunze $8 (win by $9).
  Targets $124 + reserve $8 = $132 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Jahmyr Gibbs + Emeka Egbuka + Quinshon Judkins + Jaylen Waddle + Jalen Hurts + Travis Etienne Jr. - avg spend $197, avg record 9.3-4.7.
  - 0.8% of drafts: Rome Odunze + Kyren Williams + Jahmyr Gibbs + Emeka Egbuka + Quinshon Judkins + Jalen Hurts - avg spend $193, avg record 11.3-2.7.
  - 0.8% of drafts: Rome Odunze + Jahmyr Gibbs + Emeka Egbuka + Quinshon Judkins + Zay Flowers + Davante Adams + Jalen Hurts - avg spend $197, avg record 12-2.

  Players you land most:
  - Jahmyr Gibbs (RB): 94.5% of drafts, avg $87.
  - Quinshon Judkins (RB): 90% of drafts, avg $14.
  - Emeka Egbuka (WR): 79% of drafts, avg $19.
  - Bo Nix (QB): 65% of drafts, avg $1.
  - Courtland Sutton (WR): 47.5% of drafts, avg $1.
  - Rome Odunze (WR): 46.5% of drafts, avg $10.
  - Jalen Hurts (QB): 45.3% of drafts, avg $18.
  - Zach Charbonnet (RB): 40.3% of drafts, avg $1.

### 6. Hero RB (RB + WR-WR), light anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/DEF/TE), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Puka Nacua (~$76), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $195 on anchors and keeps $5 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), light anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 42%, TE 3%, DST 3%, K 0%, bench 1%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12), Rome Odunze $8 (win by $9).
  Targets $174 + reserve $8 = $182 of $200 (completable).

  Most common roster cores this strategy landed:
  - 26% of drafts: Puka Nacua + Jahmyr Gibbs + Quinshon Judkins - avg spend $200, avg record 8.8-5.2.
  - 11% of drafts: Puka Nacua + Rome Odunze + Jahmyr Gibbs - avg spend $199, avg record 8.9-5.1.
  - 7.5% of drafts: Puka Nacua + Jahmyr Gibbs - avg spend $199, avg record 9.1-4.9.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $87.
  - Quinshon Judkins (RB): 73.8% of drafts, avg $14.
  - Bo Nix (QB): 68% of drafts, avg $1.
  - Courtland Sutton (WR): 62% of drafts, avg $1.
  - Puka Nacua (WR): 56.3% of drafts, avg $87.
  - Zach Charbonnet (RB): 52.8% of drafts, avg $1.
  - Rome Odunze (WR): 39.5% of drafts, avg $10.
  - Michael Pittman Jr. (WR): 36% of drafts, avg $1.

### 7. RB-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Garrett Wilson (~$24), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $157 on anchors and keeps $43 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 20%, TE 6%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Garrett Wilson $22 (room $24, 0.91x durability) (win by $24), Emeka Egbuka $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12).
  Targets $138 + reserve $8 = $146 of $200 (completable).

  Most common roster cores this strategy landed:
  - 2% of drafts: Jahmyr Gibbs + Emeka Egbuka + Quinshon Judkins + Davante Adams + Jalen Hurts + Garrett Wilson - avg spend $197, avg record 10.8-3.2.
  - 1.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Quinshon Judkins + Jalen Hurts + Garrett Wilson + Cam Skattebo - avg spend $198, avg record 7.8-6.2.
  - 1.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Quinshon Judkins + Jalen Hurts + Garrett Wilson - avg spend $189, avg record 10.3-3.7.

  Players you land most:
  - Jahmyr Gibbs (RB): 94.5% of drafts, avg $87.
  - Quinshon Judkins (RB): 89.8% of drafts, avg $14.
  - Garrett Wilson (WR): 83.3% of drafts, avg $28.
  - Emeka Egbuka (WR): 78.3% of drafts, avg $19.
  - Bo Nix (QB): 64.3% of drafts, avg $1.
  - Courtland Sutton (WR): 50.2% of drafts, avg $1.
  - Jalen Hurts (QB): 44.8% of drafts, avg $18.
  - Zach Charbonnet (RB): 41.8% of drafts, avg $1.

### 8. Hero RB (RB + WR-WR), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Garrett Wilson (~$24), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $149 on anchors and keeps $51 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 16%, TE 6%, DST 3%, K 0%, bench 24%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Garrett Wilson $22 (room $24, 0.91x durability) (win by $24), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12), Rome Odunze $8 (win by $9).
  Targets $130 + reserve $8 = $138 of $200 (completable).

  Most common roster cores this strategy landed:
  - 1% of drafts: Jahmyr Gibbs + Quinshon Judkins + Zay Flowers + Jalen Hurts + Garrett Wilson - avg spend $192, avg record 9.5-4.5.
  - 1% of drafts: Rome Odunze + Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Harold Fannin Jr. + Garrett Wilson - avg spend $193, avg record 10-4.
  - 1% of drafts: Rome Odunze + Kyren Williams + Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Garrett Wilson - avg spend $195, avg record 9.5-4.5.

  Players you land most:
  - Jahmyr Gibbs (RB): 94.5% of drafts, avg $87.
  - Quinshon Judkins (RB): 89.8% of drafts, avg $14.
  - Garrett Wilson (WR): 83.8% of drafts, avg $28.
  - Bo Nix (QB): 65% of drafts, avg $1.
  - Courtland Sutton (WR): 51% of drafts, avg $1.
  - Rome Odunze (WR): 46.8% of drafts, avg $10.
  - Jalen Hurts (QB): 44.5% of drafts, avg $18.
  - Zach Charbonnet (RB): 41% of drafts, avg $1.

### 9. Double RB + WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$26), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $156 on anchors and keeps $44 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 51%, WR 12%, TE 6%, DST 3%, K 0%, bench 21%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $26 (win by $29), Emeka Egbuka $16 (win by $18), Jalen Hurts $13 (win by $14), Rome Odunze $8 (win by $9).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 1.3% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jeremiyah Love + Jalen Hurts + Travis Etienne Jr. - avg spend $194, avg record 8.4-5.6.
  - 1% of drafts: Rome Odunze + Jahmyr Gibbs + Emeka Egbuka + Jeremiyah Love + Jalen Hurts + Tetairoa McMillan - avg spend $199, avg record 10-4.
  - 1% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jeremiyah Love + Zay Flowers + Jalen Hurts - avg spend $199, avg record 8.8-5.2.

  Players you land most:
  - Jeremiyah Love (RB): 96% of drafts, avg $32.
  - Jahmyr Gibbs (RB): 94.5% of drafts, avg $87.
  - Emeka Egbuka (WR): 79.3% of drafts, avg $19.
  - Bo Nix (QB): 65.3% of drafts, avg $1.
  - Courtland Sutton (WR): 49.8% of drafts, avg $1.
  - Rome Odunze (WR): 47.5% of drafts, avg $10.
  - Jalen Hurts (QB): 44.8% of drafts, avg $18.
  - Zach Charbonnet (RB): 42.5% of drafts, avg $1.

### 10. Triple WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), Cam Skattebo (~$16). WR runs HOT (1.18x room vs national). This shape spends $191 on anchors and keeps $9 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 71%, TE 2%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Amon-Ra St. Brown $64 (win by $70), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 20.8% of drafts: Puka Nacua + Quinshon Judkins + Amon-Ra St. Brown - avg spend $198, avg record 8.8-5.2.
  - 8.5% of drafts: Puka Nacua + Amon-Ra St. Brown + Cam Skattebo - avg spend $199, avg record 9-5.
  - 8% of drafts: Puka Nacua + Jalen Hurts + Amon-Ra St. Brown - avg spend $198, avg record 8.6-5.4.

  Players you land most:
  - Amon-Ra St. Brown (WR): 92% of drafts, avg $76.
  - Quinshon Judkins (RB): 74.3% of drafts, avg $14.
  - Bo Nix (QB): 67.5% of drafts, avg $1.
  - Courtland Sutton (WR): 59.5% of drafts, avg $1.
  - Puka Nacua (WR): 58% of drafts, avg $87.
  - Zach Charbonnet (RB): 50.2% of drafts, avg $1.
  - Cam Skattebo (RB): 48.3% of drafts, avg $19.
  - Jalen Hurts (QB): 35% of drafts, avg $18.

### 11. WR-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), Cam Skattebo (~$16). WR runs HOT (1.18x room vs national). This shape spends $192 on anchors and keeps $8 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 70%, TE 3%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Amon-Ra St. Brown $64 (win by $70), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 20.8% of drafts: Puka Nacua + Quinshon Judkins + Amon-Ra St. Brown - avg spend $198, avg record 8.8-5.2.
  - 8.5% of drafts: Puka Nacua + Amon-Ra St. Brown + Cam Skattebo - avg spend $199, avg record 9-5.
  - 8% of drafts: Puka Nacua + Jalen Hurts + Amon-Ra St. Brown - avg spend $198, avg record 8.6-5.4.

  Players you land most:
  - Amon-Ra St. Brown (WR): 92% of drafts, avg $76.
  - Quinshon Judkins (RB): 74.3% of drafts, avg $14.
  - Bo Nix (QB): 67.5% of drafts, avg $1.
  - Courtland Sutton (WR): 59.5% of drafts, avg $1.
  - Puka Nacua (WR): 58% of drafts, avg $87.
  - Zach Charbonnet (RB): 50.2% of drafts, avg $1.
  - Cam Skattebo (RB): 48.3% of drafts, avg $19.
  - Jalen Hurts (QB): 35% of drafts, avg $18.

### 12. Elite TE anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 2-12).
- Why: The board supports paying up for Justin Jefferson (~$57), Brock Bowers (~$49), Cam Skattebo (~$16). WR runs HOT (1.18x room vs national). This shape spends $157 on anchors and keeps $43 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 29%, TE 27%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Justin Jefferson $53 (room $57, 0.94x durability) (win by $58), Brock Bowers $46 (room $49, 0.94x durability) (win by $51), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 2.3% of drafts: Quinshon Judkins + Justin Jefferson + Jalen Hurts + Cam Skattebo + Brock Bowers - avg spend $198, avg record 10.7-3.3.
  - 0.8% of drafts: Quinshon Judkins + Justin Jefferson + Cam Skattebo + Brock Bowers - avg spend $197, avg record 10.7-3.3.
  - 0.5% of drafts: Quinshon Judkins + Justin Jefferson + Breece Hall + Jalen Hurts + Cam Skattebo - avg spend $170, avg record 7.5-6.5.

  Players you land most:
  - Quinshon Judkins (RB): 89.8% of drafts, avg $14.
  - Justin Jefferson (WR): 86.8% of drafts, avg $67.
  - Cam Skattebo (RB): 69.3% of drafts, avg $19.
  - Bo Nix (QB): 64.3% of drafts, avg $1.
  - Courtland Sutton (WR): 48.3% of drafts, avg $1.
  - Jalen Hurts (QB): 46.3% of drafts, avg $18.
  - Zach Charbonnet (RB): 41% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 31% of drafts, avg $1.

### 13. Double RB + WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $190 on anchors and keeps $10 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 9%, TE 6%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Emeka Egbuka $16 (win by $18), Jalen Hurts $13 (win by $14), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $171 + reserve $8 = $179 of $200 (completable).

  Most common roster cores this strategy landed:
  - 27% of drafts: Jahmyr Gibbs + Emeka Egbuka + Christian McCaffrey - avg spend $199, avg record 8.1-5.9.
  - 14.3% of drafts: Jahmyr Gibbs + Jalen Hurts + Christian McCaffrey - avg spend $199, avg record 8.6-5.4.
  - 12.8% of drafts: Jahmyr Gibbs + Christian McCaffrey - avg spend $197, avg record 8.6-5.4.

  Players you land most:
  - Jahmyr Gibbs (RB): 91% of drafts, avg $87.
  - Christian McCaffrey (RB): 70.8% of drafts, avg $81.
  - Bo Nix (QB): 66.8% of drafts, avg $1.
  - Courtland Sutton (WR): 64.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 57.8% of drafts, avg $1.
  - Emeka Egbuka (WR): 57.5% of drafts, avg $19.
  - Michael Pittman Jr. (WR): 37.5% of drafts, avg $1.
  - Jalen Hurts (QB): 32.8% of drafts, avg $18.

### 14. Robust RB (RB-RB), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $192 on anchors and keeps $8 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 12%, TE 3%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Emeka Egbuka $16 (win by $18), Jalen Hurts $13 (win by $14), Rome Odunze $8 (win by $9).
  Targets $173 + reserve $8 = $181 of $200 (completable).

  Most common roster cores this strategy landed:
  - 20.8% of drafts: Jahmyr Gibbs + Emeka Egbuka + Christian McCaffrey - avg spend $200, avg record 8-6.
  - 17.8% of drafts: Rome Odunze + Jahmyr Gibbs + Christian McCaffrey - avg spend $198, avg record 8.4-5.6.
  - 11.5% of drafts: Jahmyr Gibbs + Jalen Hurts + Christian McCaffrey - avg spend $200, avg record 8.5-5.5.

  Players you land most:
  - Jahmyr Gibbs (RB): 90.8% of drafts, avg $87.
  - Christian McCaffrey (RB): 70.3% of drafts, avg $81.
  - Bo Nix (QB): 67% of drafts, avg $1.
  - Courtland Sutton (WR): 62.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 56.5% of drafts, avg $1.
  - Emeka Egbuka (WR): 52.5% of drafts, avg $19.
  - Rome Odunze (WR): 43.5% of drafts, avg $10.
  - Michael Pittman Jr. (WR): 36.3% of drafts, avg $1.

### 15. Zero RB (WR-WR-TE), light anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Brock Bowers (~$49), Cam Skattebo (~$16). WR runs HOT (1.18x room vs national). This shape spends $183 on anchors and keeps $17 to complete the roster at room prices.
- Philosophy: Pattern sweep: Zero RB (WR-WR-TE), light anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 42%, TE 27%, DST 3%, K 0%, bench 7%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Brock Bowers $46 (room $49, 0.94x durability) (win by $51), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12).
  Targets $152 + reserve $8 = $160 of $200 (completable).

  Most common roster cores this strategy landed:
  - 3.8% of drafts: Puka Nacua + Quinshon Judkins + Cam Skattebo + Brock Bowers - avg spend $199, avg record 8.5-5.5.
  - 1.5% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + Brock Bowers - avg spend $197, avg record 9.5-4.5.
  - 1.5% of drafts: Puka Nacua + Quinshon Judkins + Brock Bowers - avg spend $199, avg record 8.3-5.7.

  Players you land most:
  - Quinshon Judkins (RB): 89.3% of drafts, avg $14.
  - Cam Skattebo (RB): 68.3% of drafts, avg $19.
  - Bo Nix (QB): 65.5% of drafts, avg $1.
  - Puka Nacua (WR): 59.5% of drafts, avg $87.
  - Courtland Sutton (WR): 49.3% of drafts, avg $1.
  - Jalen Hurts (QB): 46.8% of drafts, avg $18.
  - Zach Charbonnet (RB): 42% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 31% of drafts, avg $1.

### 16. Robust RB (RB-RB), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Emeka Egbuka (~$16), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $142 on anchors and keeps $58 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 42%, WR 14%, TE 6%, DST 3%, K 0%, bench 28%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Emeka Egbuka $16 (win by $18), Jalen Hurts $13 (win by $14), Davante Adams $12 (room $13, 0.94x durability) (win by $13), Rhamondre Stevenson $7 (win by $8).
  Targets $124 + reserve $8 = $132 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Jahmyr Gibbs + Emeka Egbuka + Davante Adams + Jalen Hurts + Travis Etienne Jr. - avg spend $184, avg record 8.7-5.3.
  - 0.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Colston Loveland + Davante Adams + Breece Hall - avg spend $195, avg record 9.5-4.5.
  - 0.5% of drafts: Kyren Williams + Jahmyr Gibbs + Emeka Egbuka + Davante Adams + Josh Jacobs + Jalen Hurts - avg spend $198, avg record 11.5-2.5.

  Players you land most:
  - Jahmyr Gibbs (RB): 94.5% of drafts, avg $87.
  - Emeka Egbuka (WR): 83.3% of drafts, avg $19.
  - Bo Nix (QB): 64.8% of drafts, avg $1.
  - Davante Adams (WR): 58.8% of drafts, avg $15.
  - Courtland Sutton (WR): 49% of drafts, avg $1.
  - Jalen Hurts (QB): 46.3% of drafts, avg $18.
  - Rhamondre Stevenson (RB): 45.3% of drafts, avg $9.
  - Zach Charbonnet (RB): 41.5% of drafts, avg $1.

### 17. WR-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Cam Skattebo (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $141 on anchors and keeps $59 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 42%, TE 6%, DST 3%, K 0%, bench 28%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12), Rome Odunze $8 (win by $9).
  Targets $114 + reserve $8 = $122 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Puka Nacua + DeVonta Smith + Rome Odunze + Quinshon Judkins + Jalen Hurts + Cam Skattebo - avg spend $194, avg record 9-5.
  - 0.5% of drafts: Puka Nacua + Rome Odunze + Quinshon Judkins + Chris Olave + Cam Skattebo - avg spend $189, avg record 8-6.
  - 0.5% of drafts: Puka Nacua + Rome Odunze + Quinshon Judkins + Zay Flowers + Jalen Hurts + Cam Skattebo - avg spend $194, avg record 8.5-5.5.

  Players you land most:
  - Quinshon Judkins (RB): 90% of drafts, avg $14.
  - Cam Skattebo (RB): 68.5% of drafts, avg $19.
  - Bo Nix (QB): 65.8% of drafts, avg $1.
  - Puka Nacua (WR): 59.5% of drafts, avg $87.
  - Jalen Hurts (QB): 46.8% of drafts, avg $18.
  - Courtland Sutton (WR): 45.5% of drafts, avg $1.
  - Rome Odunze (WR): 42.3% of drafts, avg $10.
  - Zach Charbonnet (RB): 39.3% of drafts, avg $1.

### 18. Double RB + WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Emeka Egbuka (~$16), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $130 on anchors and keeps $70 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 42%, WR 9%, TE 6%, DST 3%, K 0%, bench 33%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Emeka Egbuka $16 (win by $18), Jalen Hurts $13 (win by $14), Rhamondre Stevenson $7 (win by $8), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $118 + reserve $8 = $126 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Chris Olave + Travis Etienne Jr. - avg spend $188, avg record 7-7.
  - 0.5% of drafts: Kyren Williams + Jahmyr Gibbs + Emeka Egbuka + Jalen Hurts + Travis Etienne Jr. - avg spend $194, avg record 9.5-4.5.
  - 0.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jalen Hurts + Harold Fannin Jr. + Garrett Wilson - avg spend $195, avg record 7-7.

  Players you land most:
  - Jahmyr Gibbs (RB): 94.5% of drafts, avg $87.
  - Emeka Egbuka (WR): 84.3% of drafts, avg $19.
  - Bo Nix (QB): 65% of drafts, avg $1.
  - Courtland Sutton (WR): 49.8% of drafts, avg $1.
  - Jalen Hurts (QB): 46.3% of drafts, avg $18.
  - Rhamondre Stevenson (RB): 45.5% of drafts, avg $9.
  - Zach Charbonnet (RB): 42.3% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 32.5% of drafts, avg $1.

### 19. Elite QB anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.5-5.5 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Josh Allen (~$36), Garrett Wilson (~$24). RB runs COOL (0.84x room vs national). This shape spends $180 on anchors and keeps $20 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 44%, WR 20%, TE 6%, DST 3%, K 0%, bench 9%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Josh Allen $36 (win by $40), Garrett Wilson $22 (room $24, 0.91x durability) (win by $24), Emeka Egbuka $16 (win by $18), Quinshon Judkins $11 (win by $12).
  Targets $161 + reserve $8 = $169 of $200 (completable).

  Most common roster cores this strategy landed:
  - 16.8% of drafts: Josh Allen + Jahmyr Gibbs + Quinshon Judkins + Garrett Wilson - avg spend $198, avg record 8.4-5.6.
  - 8.3% of drafts: Josh Allen + Jahmyr Gibbs + Emeka Egbuka + Garrett Wilson - avg spend $198, avg record 7.6-6.4.
  - 1.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Quinshon Judkins + Garrett Wilson - avg spend $165, avg record 8.8-5.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 93.8% of drafts, avg $87.
  - Garrett Wilson (WR): 82% of drafts, avg $28.
  - Quinshon Judkins (RB): 78.8% of drafts, avg $14.
  - Bo Nix (QB): 67% of drafts, avg $1.
  - Emeka Egbuka (WR): 60.5% of drafts, avg $19.
  - Courtland Sutton (WR): 55.3% of drafts, avg $1.
  - Josh Allen (QB): 47% of drafts, avg $50.
  - Zach Charbonnet (RB): 46.3% of drafts, avg $1.

### 20. Triple WR, even split  (wr-heavy-auction, aggressive risk)

Pool-generated WR Heavy (Auction): 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.5-5.5 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Garrett Wilson (~$24), Cam Skattebo (~$16). WR runs HOT (1.18x room vs national). This shape spends $158 on anchors and keeps $42 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, even split. Built from the live board: wr heavy shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 54%, TE 2%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Garrett Wilson $22 (room $24, 0.91x durability) (win by $24), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12).
  Targets $128 + reserve $8 = $136 of $200 (completable).

  Most common roster cores this strategy landed:
  - 1.3% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + Garrett Wilson + Cam Skattebo - avg spend $192, avg record 9.8-4.2.
  - 1% of drafts: Puka Nacua + Quinshon Judkins + Garrett Wilson + Cam Skattebo - avg spend $173, avg record 9.8-4.2.
  - 0.8% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + Travis Etienne Jr. + Garrett Wilson + Cam Skattebo - avg spend $198, avg record 10.3-3.7.

  Players you land most:
  - Quinshon Judkins (RB): 89.5% of drafts, avg $14.
  - Garrett Wilson (WR): 83% of drafts, avg $28.
  - Cam Skattebo (RB): 67% of drafts, avg $19.
  - Bo Nix (QB): 66% of drafts, avg $1.
  - Puka Nacua (WR): 59.5% of drafts, avg $87.
  - Courtland Sutton (WR): 46.5% of drafts, avg $1.
  - Jalen Hurts (QB): 45% of drafts, avg $18.
  - Zach Charbonnet (RB): 39.3% of drafts, avg $1.

### 21. WR-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 8.5-5.5 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Garrett Wilson (~$24), Cam Skattebo (~$16). WR runs HOT (1.18x room vs national). This shape spends $157 on anchors and keeps $43 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 50%, TE 6%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Garrett Wilson $22 (room $24, 0.91x durability) (win by $24), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12).
  Targets $128 + reserve $8 = $136 of $200 (completable).

  Most common roster cores this strategy landed:
  - 1.3% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + Garrett Wilson + Cam Skattebo - avg spend $192, avg record 9.8-4.2.
  - 1% of drafts: Puka Nacua + Quinshon Judkins + Garrett Wilson + Cam Skattebo - avg spend $173, avg record 9.8-4.2.
  - 0.8% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + Travis Etienne Jr. + Garrett Wilson + Cam Skattebo - avg spend $198, avg record 10.3-3.7.

  Players you land most:
  - Quinshon Judkins (RB): 89.5% of drafts, avg $14.
  - Garrett Wilson (WR): 83% of drafts, avg $28.
  - Cam Skattebo (RB): 67% of drafts, avg $19.
  - Bo Nix (QB): 66% of drafts, avg $1.
  - Puka Nacua (WR): 59.5% of drafts, avg $87.
  - Courtland Sutton (WR): 46.5% of drafts, avg $1.
  - Jalen Hurts (QB): 45% of drafts, avg $18.
  - Zach Charbonnet (RB): 39.3% of drafts, avg $1.

### 22. Elite TE anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (TE/WR/RB/QB/DEF), rest at room price.

- Projected record: 8.5-5.5 (best 14-0, worst 1-13).
- Why: The board supports paying up for Brock Bowers (~$49), Garrett Wilson (~$24), Cam Skattebo (~$16). TE runs HOT (1.17x room vs national). This shape spends $131 on anchors and keeps $69 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 16%, TE 27%, DST 3%, K 0%, bench 33%.
- Target prices (durability-adjusted expect / walk-up to win): Brock Bowers $46 (room $49, 0.94x durability) (win by $51), Garrett Wilson $22 (room $24, 0.91x durability) (win by $24), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14), Quinshon Judkins $11 (win by $12).
  Targets $108 + reserve $8 = $116 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Quinshon Judkins + Jeremiyah Love + Breece Hall + Jalen Hurts + Garrett Wilson + Brock Bowers - avg spend $194, avg record 9-5.
  - 0.3% of drafts: Quinshon Judkins + Rashee Rice + Saquon Barkley + Travis Etienne Jr. + Garrett Wilson + Cam Skattebo + Tetairoa McMillan - avg spend $199, avg record 8-6.
  - 0.3% of drafts: Quinshon Judkins + Colston Loveland + Jeremiyah Love + Terry McLaurin + Breece Hall + Garrett Wilson + Tetairoa McMillan - avg spend $176, avg record 9-5.

  Players you land most:
  - Quinshon Judkins (RB): 88.5% of drafts, avg $14.
  - Garrett Wilson (WR): 84.5% of drafts, avg $28.
  - Cam Skattebo (RB): 66% of drafts, avg $19.
  - Bo Nix (QB): 63.3% of drafts, avg $1.
  - Jalen Hurts (QB): 47.5% of drafts, avg $18.
  - Courtland Sutton (WR): 44% of drafts, avg $1.
  - Zach Charbonnet (RB): 37.3% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 29.8% of drafts, avg $1.

### 23. Balanced (no anchor)  (balanced-auction, conservative risk)

Pool-generated Balanced Auction: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 8.5-5.5 (best 14-0, worst 1-13).
- Why: The board supports paying up for Emeka Egbuka (~$16), Cam Skattebo (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $86 on anchors and keeps $114 to complete the roster at room prices.
- Philosophy: Pattern sweep: Balanced (no anchor). Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 14%, TE 6%, DST 3%, K 0%, bench 56%.
- Target prices (durability-adjusted expect / walk-up to win): Emeka Egbuka $16 (win by $18), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14), Davante Adams $12 (room $13, 0.94x durability) (win by $13), Quinshon Judkins $11 (win by $12).
  Targets $68 + reserve $8 = $76 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Emeka Egbuka + Quinshon Judkins + Jalen Hurts + Kenneth Walker III + Cam Skattebo - avg spend $112, avg record 9-5.
  - 0.3% of drafts: Emeka Egbuka + Quinshon Judkins + Davante Adams + Tyler Warren + Jaxon Smith-Njigba + Malik Nabers + Cam Skattebo - avg spend $179, avg record 2-12.
  - 0.3% of drafts: Emeka Egbuka + Quinshon Judkins + Colston Loveland + Jeremiyah Love + Davante Adams + Josh Jacobs + Tee Higgins + Derrick Henry + Tetairoa McMillan - avg spend $200, avg record 12-2.

  Players you land most:
  - Quinshon Judkins (RB): 87.3% of drafts, avg $14.
  - Emeka Egbuka (WR): 72.8% of drafts, avg $19.
  - Bo Nix (QB): 63.3% of drafts, avg $1.
  - Cam Skattebo (RB): 62% of drafts, avg $19.
  - Davante Adams (WR): 49.3% of drafts, avg $16.
  - Jalen Hurts (QB): 47.3% of drafts, avg $18.
  - Courtland Sutton (WR): 42% of drafts, avg $1.
  - Zach Charbonnet (RB): 35.3% of drafts, avg $1.

### 24. Elite TE anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 8.4-5.6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Brock Bowers (~$49), Tetairoa McMillan (~$19). WR runs HOT (1.18x room vs national). This shape spends $194 on anchors and keeps $6 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 48%, TE 27%, DST 3%, K 0%, bench 1%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Brock Bowers $46 (room $49, 0.94x durability) (win by $51), Tetairoa McMillan $19 (win by $21), Cam Skattebo $16 (win by $18), Jalen Hurts $13 (win by $14).
  Targets $160 + reserve $8 = $168 of $200 (completable).

  Most common roster cores this strategy landed:
  - 3.3% of drafts: Puka Nacua + Tetairoa McMillan + Brock Bowers - avg spend $199, avg record 9.3-4.7.
  - 1.3% of drafts: Puka Nacua + Cam Skattebo + Brock Bowers - avg spend $194, avg record 8.2-5.8.
  - 0.8% of drafts: Puka Nacua + Tyler Warren + Jalen Hurts + Cam Skattebo + Tetairoa McMillan - avg spend $181, avg record 7.7-6.3.

  Players you land most:
  - Tetairoa McMillan (WR): 84.8% of drafts, avg $22.
  - Cam Skattebo (RB): 68.5% of drafts, avg $19.
  - Bo Nix (QB): 65.8% of drafts, avg $1.
  - Puka Nacua (WR): 59.5% of drafts, avg $87.
  - Courtland Sutton (WR): 51.5% of drafts, avg $1.
  - Jalen Hurts (QB): 44.8% of drafts, avg $18.
  - Zach Charbonnet (RB): 42.8% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 31.3% of drafts, avg $1.

### 25. Elite QB anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 8.4-5.6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Christian McCaffrey (~$67), Josh Allen (~$36), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $153 on anchors and keeps $47 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 39%, WR 11%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Josh Allen $36 (win by $40), Emeka Egbuka $16 (win by $18), Quinshon Judkins $11 (win by $12), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $129 + reserve $8 = $137 of $200 (completable).

  Most common roster cores this strategy landed:
  - 2.3% of drafts: Josh Allen + Emeka Egbuka + Quinshon Judkins + Christian McCaffrey + Cam Skattebo - avg spend $197, avg record 5.3-8.7.
  - 2.3% of drafts: Josh Allen + Emeka Egbuka + Quinshon Judkins + Christian McCaffrey - avg spend $193, avg record 9.3-4.7.
  - 1.5% of drafts: Josh Allen + Emeka Egbuka + Quinshon Judkins + Terry McLaurin + Christian McCaffrey - avg spend $196, avg record 8.3-5.7.

  Players you land most:
  - Quinshon Judkins (RB): 91% of drafts, avg $14.
  - Emeka Egbuka (WR): 80% of drafts, avg $19.
  - Christian McCaffrey (RB): 72.5% of drafts, avg $80.
  - Bo Nix (QB): 65.8% of drafts, avg $1.
  - Josh Allen (QB): 52.5% of drafts, avg $49.
  - Courtland Sutton (WR): 51.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 41% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 31.8% of drafts, avg $1.

### 26. Elite QB anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 8.4-5.6 (best 14-0, worst 0-14).
- Why: The board supports paying up for Saquon Barkley (~$45), Josh Allen (~$36), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $126 on anchors and keeps $74 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 28%, WR 9%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (durability-adjusted expect / walk-up to win): Saquon Barkley $42 (room $45, 0.94x durability) (win by $46), Josh Allen $36 (win by $40), Emeka Egbuka $16 (win by $18), Quinshon Judkins $11 (win by $12), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $111 + reserve $8 = $119 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Josh Allen + Emeka Egbuka + Quinshon Judkins + Saquon Barkley + Malik Nabers - avg spend $184, avg record 5.3-8.7.
  - 0.8% of drafts: Josh Allen + Emeka Egbuka + Quinshon Judkins + Saquon Barkley + Derrick Henry - avg spend $195, avg record 10.3-3.7.
  - 0.8% of drafts: DeVonta Smith + Josh Allen + Emeka Egbuka + Quinshon Judkins + Saquon Barkley - avg spend $185, avg record 7.7-6.3.

  Players you land most:
  - Quinshon Judkins (RB): 88.5% of drafts, avg $14.
  - Saquon Barkley (RB): 83% of drafts, avg $53.
  - Emeka Egbuka (WR): 78% of drafts, avg $19.
  - Bo Nix (QB): 66.5% of drafts, avg $1.
  - Josh Allen (QB): 53.5% of drafts, avg $49.
  - Courtland Sutton (WR): 45.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 39.8% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 30.3% of drafts, avg $1.

## Specific stud combos (which exact players to target)

The strategy leaderboard above says which SHAPE wins. This tier says which
exact studs to buy inside each shape. Every combo is a completable $200
roster (the named anchors forced in, the rest filled at room price) graded
with the risk model on. Grouped by pattern, best projected record first.

### Top combos overall

| # | Anchors | Pattern | Proj record | Mean starter pts |
|---|---------|---------|-------------|------------------|
| 1 | Jahmyr Gibbs + Jaxon Smith-Njigba | RB-WR | 9-5 | 1952.8 |
| 2 | Jahmyr Gibbs + Amon-Ra St. Brown | RB-WR | 9-5 | 1959.3 |
| 3 | Jahmyr Gibbs + Bijan Robinson | Robust RB (RB-RB) | 8.8-5.2 | 1943.3 |
| 4 | Puka Nacua + Jaxon Smith-Njigba | WR-WR | 8.8-5.2 | 1918.2 |
| 5 | Jahmyr Gibbs + Puka Nacua | RB-WR | 8.8-5.2 | 1950.8 |
| 6 | Trey McBride + Jaxon Smith-Njigba + Amon-Ra St. Brown | Elite TE anchor | 8.8-5.2 | 1905.8 |
| 7 | Puka Nacua + Amon-Ra St. Brown | WR-WR | 8.7-5.3 | 1923 |
| 8 | Puka Nacua + Ja'Marr Chase | WR-WR | 8.7-5.3 | 1904.6 |
| 9 | Jaxon Smith-Njigba + Amon-Ra St. Brown + Brock Bowers | Zero RB (WR-WR-TE) | 8.7-5.3 | 1906 |
| 10 | Jahmyr Gibbs + Christian McCaffrey | Robust RB (RB-RB) | 8.6-5.4 | 1943.9 |
| 11 | Puka Nacua + Jaxon Smith-Njigba + Trey McBride | Zero RB (WR-WR-TE) | 8.6-5.4 | 1903.8 |
| 12 | Trey McBride + Puka Nacua + Ja'Marr Chase | Elite TE anchor | 8.6-5.4 | 1885.4 |

### Robust RB (RB-RB)

- **Jahmyr Gibbs + Bijan Robinson**: 8.8-5.2, 1943.3 starter pts - target Jahmyr Gibbs $76, Bijan Robinson $70.
- **Jahmyr Gibbs + Christian McCaffrey**: 8.6-5.4, 1943.9 starter pts - target Jahmyr Gibbs $76, Christian McCaffrey $60.
- **Christian McCaffrey + Bijan Robinson**: 8.4-5.6, 1919.9 starter pts - target Bijan Robinson $70, Christian McCaffrey $60.

### WR-WR

- **Puka Nacua + Jaxon Smith-Njigba**: 8.8-5.2, 1918.2 starter pts - target Puka Nacua $66, Jaxon Smith-Njigba $72.
- **Puka Nacua + Amon-Ra St. Brown**: 8.7-5.3, 1923 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64.
- **Puka Nacua + Ja'Marr Chase**: 8.7-5.3, 1904.6 starter pts - target Ja'Marr Chase $75, Puka Nacua $66.

### RB-WR

- **Jahmyr Gibbs + Jaxon Smith-Njigba**: 9-5, 1952.8 starter pts - target Jahmyr Gibbs $76, Jaxon Smith-Njigba $72.
- **Jahmyr Gibbs + Amon-Ra St. Brown**: 9-5, 1959.3 starter pts - target Jahmyr Gibbs $76, Amon-Ra St. Brown $64.
- **Jahmyr Gibbs + Puka Nacua**: 8.8-5.2, 1950.8 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66.

### Zero RB (WR-WR-TE)

- **Jaxon Smith-Njigba + Amon-Ra St. Brown + Brock Bowers**: 8.7-5.3, 1906 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Brock Bowers $46.
- **Puka Nacua + Jaxon Smith-Njigba + Trey McBride**: 8.6-5.4, 1903.8 starter pts - target Puka Nacua $66, Jaxon Smith-Njigba $72, Trey McBride $35.
- **Puka Nacua + Amon-Ra St. Brown + Brock Bowers**: 8.5-5.5, 1903.9 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64, Brock Bowers $46.

### Elite QB anchor

- **Josh Allen + Jahmyr Gibbs + Puka Nacua**: 8.5-5.5, 1927.6 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Josh Allen $36.
- **Lamar Jackson + Jahmyr Gibbs + Puka Nacua**: 8.5-5.5, 1928.4 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Lamar Jackson $32.
- **Drake Maye + Jahmyr Gibbs + Puka Nacua**: 8.4-5.6, 1932.1 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Drake Maye $25.

### Elite TE anchor

- **Trey McBride + Jaxon Smith-Njigba + Amon-Ra St. Brown**: 8.8-5.2, 1905.8 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Trey McBride $35.
- **Trey McBride + Puka Nacua + Ja'Marr Chase**: 8.6-5.4, 1885.4 starter pts - target Ja'Marr Chase $75, Puka Nacua $66, Trey McBride $35.
- **Trey McBride + Puka Nacua + Amon-Ra St. Brown**: 8.5-5.5, 1903.5 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64, Trey McBride $35.

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

- **Josh Allen** (BUF, bye 7) - $36-$39 (base $38) league band, land odds 6.3%.
  Fair value ~$38 (band $36-$39).
- **Lamar Jackson** (BAL, bye 13) - $32-$39 (base $36) league band, land odds 18.8%.
  Fair value ~$36 (band $32-$39).
- **Drake Maye** (NE, bye 11) - $28-$34 (base $31) league band, land odds 0%.
  Fair value ~$31 (band $28-$34).  [FRAGILE]
- **Jalen Hurts** (PHI, bye 10) - $13-$33 (base $23) league band, land odds 6.3%.
  Target - worth ~$33, room pays ~$13. Win him at or under $23.  [+$6 POCKET]
- **Bo Nix** (DEN, bye 10) - $1-$33 (base $17) league band, land odds 6.3%.
  Target - worth ~$33, room pays ~$1. Win him at or under $17.  [+$10 POCKET]
- **Jayden Daniels** (WAS, bye 7) - $15-$21 (base $18) league band, land odds 12.5%.
  Fair value ~$18 (band $15-$21).  [FRAGILE]

### RB

- **Jahmyr Gibbs** (DET, bye 6) - $76-$97 (base $87) league band, land odds 12.5%.
  Anchor - pay up to $87 to lock a Tier 1 player.  [ELITE, +$6 POCKET]
- **Christian McCaffrey** (SF, bye 8) - $67-$70 (base $69) league band, land odds 0%.
  Fair value ~$69 (band $67-$70).  [FRAGILE]
- **Bijan Robinson** (ATL, bye 11) - $70-$80 (base $75) league band, land odds 6.3%.
  Anchor - pay up to $75 to lock a Tier 1 player.  [ELITE]
- **Jonathan Taylor** (IND, bye 13) - $53-$60 (base $57) league band, land odds 0%.
  Fair value ~$57 (band $53-$60).  [FRAGILE]
- **Saquon Barkley** (PHI, bye 10) - $45-$53 (base $49) league band, land odds 25%.
  Fair value ~$49 (band $45-$53).
- **Jeremiyah Love** (ARI, bye 14) - $26-$42 (base $34) league band, land odds 0%.
  Target - worth ~$44, room pays ~$26. Win him at or under $34.  [+$5 POCKET]
- **James Cook III** (BUF, bye 7) - $43-$57 (base $50) league band, land odds 0%.
  Let him go - room pays ~$57 over his ~$43 worth here.  [-$4 TAX]
- **Ashton Jeanty** (LV, bye 13) - $35-$40 (base $38) league band, land odds 0%.
  Fair value ~$38 (band $35-$40).
- **Chase Brown** (CIN, bye 6) - $41-$53 (base $47) league band, land odds 0%.
  Let him go - room pays ~$53 over his ~$41 worth here.  [-$4 TAX]
- **De'Von Achane** (MIA, bye 6) - $35-$50 (base $43) league band, land odds 0%.
  Let him go - room pays ~$50 over his ~$39 worth here.  [-$4 TAX, FRAGILE]

### WR

- **Puka Nacua** (LAR, bye 11) - $71-$76 (base $74) league band, land odds 12.5%.
  Anchor - pay up to $74 to lock a Tier 1 player.  [ELITE, FRAGILE]
- **Jaxon Smith-Njigba** (SEA, bye 11) - $72-$78 (base $75) league band, land odds 12.5%.
  Anchor - pay up to $75 to lock a Tier 1 player.  [ELITE]
- **Amon-Ra St. Brown** (DET, bye 6) - $64-$75 (base $70) league band, land odds 18.8%.
  Anchor - pay up to $70 to lock a Tier 1 player.  [ELITE]
- **Ja'Marr Chase** (CIN, bye 6) - $65-$79 (base $72) league band, land odds 12.5%.
  Anchor - pay up to $72 to lock a Tier 1 player.  [ELITE, -$4 TAX]
- **Justin Jefferson** (MIN, bye 6) - $53-$57 (base $55) league band, land odds 0%.
  Fair value ~$55 (band $53-$57).
- **CeeDee Lamb** (DAL, bye 14) - $48-$60 (base $54) league band, land odds 12.5%.
  Let him go - room pays ~$60 over his ~$49 worth here.  [-$4 TAX]
- **A.J. Brown** (NE, bye 11) - $40-$48 (base $44) league band, land odds 12.5%.
  Fair value ~$44 (band $40-$48).
- **Drake London** (ATL, bye 11) - $39-$54 (base $47) league band, land odds 12.5%.
  Let him go - room pays ~$54 over his ~$42 worth here.  [-$4 TAX]
- **Garrett Wilson** (NYJ, bye 13) - $24-$37 (base $31) league band, land odds 0%.
  Target - worth ~$41, room pays ~$24. Win him at or under $31.  [+$4 POCKET]
- **Zay Flowers** (BAL, bye 13) - $23-$38 (base $31) league band, land odds 0%.
  Target - worth ~$40, room pays ~$23. Win him at or under $31.  [+$5 POCKET]

### TE

- **Brock Bowers** (LV, bye 13) - $49-$51 (base $50) league band, land odds 12.5%.
  Fair value ~$50 (band $49-$51).
- **Trey McBride** (ARI, bye 14) - $35-$40 (base $38) league band, land odds 6.3%.
  Fair value ~$38 (band $35-$40).
- **Colston Loveland** (CHI, bye 10) - $27-$28 (base $28) league band, land odds 6.3%.
  Fair value ~$28 (band $27-$28).
- **Harold Fannin Jr.** (CLE, bye 11) - $18-$24 (base $21) league band, land odds 25%.
  Fair value ~$21 (band $18-$24).
- **Tyler Warren** (IND, bye 13) - $21-$22 (base $22) league band, land odds 6.3%.
  Fair value ~$22 (band $21-$22).
- **George Kittle** (SF, bye 8) - $4-$19 (base $12) league band, land odds 12.5%.
  Target - worth ~$23, room pays ~$4. Win him at or under $12.  [+$5 POCKET, FRAGILE, SLEEPER]

### DEF

- **Houston Texans** (HOU, bye 8) - $6-$14 (base $10) league band.
  Fair value ~$10 (band $6-$14).
- **Denver Broncos** (DEN, bye 10) - $3-$14 (base $9) league band.
  Fair value ~$9 (band $3-$14).
- **Philadelphia Eagles** (PHI, bye 10) - $2-$13 (base $8) league band.
  Fair value ~$8 (band $2-$13).
- **Pittsburgh Steelers** (PIT, bye 9) - $1-$13 (base $7) league band.
  Target - worth ~$13, room pays ~$1. Win him at or under $7.  [+$4 POCKET]
- **Baltimore Ravens** (BAL, bye 13) - $1-$10 (base $6) league band.
  Fair value ~$6 (band $1-$10).
- **Los Angeles Rams** (LAR, bye 11) - $3-$8 (base $6) league band.
  Fair value ~$6 (band $3-$8).

## Value pockets and sleepers (win them below the room)

- **Bo Nix** (QB, DEN) - Target - worth ~$33, room pays ~$1. Win him at or under $17.  [+$10 POCKET]
- **Quinshon Judkins** (RB, CLE) - Target - worth ~$33, room pays ~$11. Win him at or under $22.  [+$7 POCKET]
- **Jahmyr Gibbs** (RB, DET) - Anchor - pay up to $87 to lock a Tier 1 player.  [ELITE, +$6 POCKET]
- **Jalen Hurts** (QB, PHI) - Target - worth ~$33, room pays ~$13. Win him at or under $23.  [+$6 POCKET]
- **Zay Flowers** (WR, BAL) - Target - worth ~$40, room pays ~$23. Win him at or under $31.  [+$5 POCKET]
- **Jeremiyah Love** (RB, ARI) - Target - worth ~$44, room pays ~$26. Win him at or under $34.  [+$5 POCKET]
- **Josh Jacobs** (RB, GB) - Target - worth ~$38, room pays ~$21. Win him at or under $29.  [+$5 POCKET]
- **Courtland Sutton** (WR, DEN) - Target - worth ~$18, room pays ~$1. Win him at or under $10.  [+$5 POCKET]
- **Jaxson Dart** (QB, NYG) - Target - worth ~$20, room pays ~$3. Win him at or under $12.  [+$5 POCKET]
- **George Kittle** (TE, SF) - Target - worth ~$23, room pays ~$4. Win him at or under $12.  [+$5 POCKET, FRAGILE, SLEEPER]
- **Garrett Wilson** (WR, NYJ) - Target - worth ~$41, room pays ~$24. Win him at or under $31.  [+$4 POCKET]
- **Rome Odunze** (WR, CHI) - Target - worth ~$20, room pays ~$8. Win him at or under $14.  [+$4 POCKET]
- **Carnell Tate** (WR, TEN) - Target - worth ~$19, room pays ~$6. Win him at or under $13.  [+$4 POCKET]
- **Pittsburgh Steelers** (DEF, PIT) - Target - worth ~$13, room pays ~$1. Win him at or under $7.  [+$4 POCKET]
- **J.K. Dobbins** (RB, DEN) - Late flier - a $2-$12 bench dollar with real upside.  [FRAGILE, SLEEPER]
- **Dallas Goedert** (TE, PHI) - Late flier - a $2-$11 bench dollar with real upside.  [FRAGILE, SLEEPER]
- **Zach Charbonnet** (RB, SEA) - Late flier - a $1-$10 bench dollar with real upside. He's injured now - trim the bid or stash only.  [OUT PUP, SLEEPER]
- **Wan'Dale Robinson** (WR, TEN) - Late flier - a $1-$5 bench dollar with real upside.  [SLEEPER]
- **Travis Kelce** (TE, KC) - Late flier - a $5-$7 bench dollar with real upside.  [SLEEPER]
- **Jakobi Meyers** (WR, JAC) - Late flier - a $1-$3 bench dollar with real upside.  [SLEEPER]
- **Kyle Monangai** (RB, CHI) - Late flier - a $1-$2 bench dollar with real upside.  [SLEEPER]
- **Isaiah Likely** (TE, NYG) - Late flier - a $1-$2 bench dollar with real upside.  [SLEEPER]
- **Matthew Golden** (WR, GB) - Late flier - a $1-$2 bench dollar with real upside.  [SLEEPER]
- **Hunter Henry** (TE, NE) - Late flier - a $1-$2 bench dollar with real upside.  [SLEEPER]
- **T.J. Hockenson** (TE, MIN) - Late flier - a $1-$1 bench dollar with real upside.  [SLEEPER]

## Room tax (let someone else overpay)

- **Nico Collins** (WR, HOU) - Let him go - room pays ~$42 over his ~$25 worth here.
- **Joe Burrow** (QB, CIN) - Let him go - room pays ~$23 over his ~$5 worth here.
- **Ja'Marr Chase** (WR, CIN) - Anchor - pay up to $72 to lock a Tier 1 player.
- **CeeDee Lamb** (WR, DAL) - Let him go - room pays ~$60 over his ~$49 worth here.
- **Drake London** (WR, ATL) - Let him go - room pays ~$54 over his ~$42 worth here.
- **James Cook III** (RB, BUF) - Let him go - room pays ~$57 over his ~$43 worth here.
- **Chase Brown** (RB, CIN) - Let him go - room pays ~$53 over his ~$41 worth here.
- **George Pickens** (WR, DAL) - Let him go - room pays ~$38 over his ~$23 worth here.
- **De'Von Achane** (RB, MIA) - Let him go - room pays ~$50 over his ~$39 worth here.

---

Full machine-readable data (every player, every strategy sim, league intel) is in `dataset.json`.
