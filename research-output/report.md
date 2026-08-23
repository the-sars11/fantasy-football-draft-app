# The Nasties - Draft Research Dataset

Generated 2026-08-23T00:36:17.093Z. 12-team, $200 auction, full PPR, no kicker.
Roster: QB1, RB1, WR1, TE1, FLEX3, DEF1, Bench5.
Players: 978. Cache last updated 2026-08-20T01:00:27.018+00:00 (stale=true).
Sims: 400 Monte-Carlo runs per strategy, 14-game season, seed 42.

## Strategy leaderboard (which approach wins, and why)

| # | Strategy | Proj record | Modal record | Mean starter pts | Ceiling / Floor |
|---|----------|-------------|--------------|------------------|-----------------|
| 1 | RB-WR, even split | 9-5 | 9-5 (15%) | 1933.5 | $84 / $60 |
| 2 | Hero RB (RB + WR-WR), even split | 9-5 | 10-4 (15%) | 1938.8 | $83 / $59 |
| 3 | RB-WR, light anchors | 9-5 | 11-3 (17%) | 1926.2 | $82 / $68 |
| 4 | Hero RB (RB + WR-WR), light anchors | 9-5 | 10-4 (16.5%) | 1931.3 | $81 / $67 |
| 5 | RB-WR, heavy anchors | 8.9-5.1 | 11-3 (15.3%) | 1957.6 | $86 / $62 |
| 6 | Hero RB (RB + WR-WR), heavy anchors | 8.9-5.1 | 11-3 (14%) | 1965 | $86 / $62 |
| 7 | Robust RB (RB-RB), even split | 8.9-5.1 | 9-5 (15%) | 1931.1 | $83 / $59 |
| 8 | Double RB + WR, even split | 8.9-5.1 | 10-4 (17.3%) | 1931.3 | $83 / $59 |
| 9 | Robust RB (RB-RB), light anchors | 8.8-5.2 | 9-5 (15.8%) | 1909.2 | $81 / $67 |
| 10 | Elite TE anchor, even split | 8.8-5.2 | 10-4 (14.8%) | 1869.9 | $81 / $57 |
| 11 | Double RB + WR, light anchors | 8.8-5.2 | 10-4 (14.8%) | 1908.6 | $80 / $66 |
| 12 | Triple WR, heavy anchors | 8.7-5.3 | 8-6 (14%) | 1926.1 | $85 / $61 |
| 13 | WR-WR, heavy anchors | 8.7-5.3 | 8-6 (14%) | 1926.1 | $85 / $61 |
| 14 | Elite QB anchor, heavy anchors | 8.7-5.3 | 11-3 (14.3%) | 1918.8 | $84 / $60 |
| 15 | Triple WR, even split | 8.7-5.3 | 9-5 (17.5%) | 1891.2 | $82 / $58 |
| 16 | WR-WR, even split | 8.7-5.3 | 9-5 (17.5%) | 1891.2 | $82 / $58 |
| 17 | WR-WR, light anchors | 8.7-5.3 | 10-4 (17.3%) | 1885.8 | $80 / $66 |
| 18 | Triple WR, light anchors | 8.7-5.3 | 10-4 (15.5%) | 1882.6 | $80 / $66 |
| 19 | Zero RB (WR-WR-TE), light anchors | 8.7-5.3 | 10-4 (15.5%) | 1882.6 | $80 / $66 |
| 20 | Robust RB (RB-RB), heavy anchors | 8.6-5.4 | 9-5 (14.5%) | 1944.6 | $86 / $62 |
| 21 | Double RB + WR, heavy anchors | 8.6-5.4 | 9-5 (14.3%) | 1943.5 | $86 / $62 |
| 22 | Elite TE anchor, heavy anchors | 8.6-5.4 | 9-5 (15.3%) | 1861.3 | $84 / $60 |
| 23 | Elite TE anchor, light anchors | 8.6-5.4 | 9-5 (17.3%) | 1852.3 | $79 / $65 |
| 24 | Elite QB anchor, light anchors | 8.6-5.4 | 10-4 (18.3%) | 1869.9 | $79 / $65 |
| 25 | Balanced (no anchor) | 8.6-5.4 | 10-4 (18.3%) | 1837.7 | $75 / $61 |
| 26 | Elite QB anchor, even split | 8.3-5.7 | 8-6 (16.8%) | 1879.4 | $81 / $57 |

_Records above are graded with the measured risk model ON (real per-player
durability + tier bust/breakout from 15 seasons of Sleeper actuals)._

## Before/after: what the risk model did to each strategy

BEFORE grades every drafted player as if he plays all 14 games at his full
projection (the old basis that made "spend on two studs" look unbeatable).
AFTER applies the measured model. A bigger drop = a strategy the old grader
flattered because it never priced in that studs bust or miss time.

| # | Strategy | Before (healthy) | After (risk on) | Wins lost to risk |
|---|----------|------------------|-----------------|-------------------|
| 1 | RB-WR, even split | 9.4-4.6 | 9-5 | -0.4 |
| 2 | Hero RB (RB + WR-WR), even split | 9.3-4.7 | 9-5 | -0.3 |
| 3 | RB-WR, light anchors | 9.2-4.8 | 9-5 | -0.2 |
| 4 | Hero RB (RB + WR-WR), light anchors | 9.3-4.7 | 9-5 | -0.3 |
| 5 | RB-WR, heavy anchors | 9.6-4.4 | 8.9-5.1 | -0.7 |
| 6 | Hero RB (RB + WR-WR), heavy anchors | 9.7-4.3 | 8.9-5.1 | -0.8 |
| 7 | Robust RB (RB-RB), even split | 9.2-4.8 | 8.9-5.1 | -0.3 |
| 8 | Double RB + WR, even split | 9.3-4.7 | 8.9-5.1 | -0.4 |
| 9 | Robust RB (RB-RB), light anchors | 9-5 | 8.8-5.2 | -0.2 |
| 10 | Elite TE anchor, even split | 8.4-5.6 | 8.8-5.2 | +0.4 |
| 11 | Double RB + WR, light anchors | 9-5 | 8.8-5.2 | -0.2 |
| 12 | Triple WR, heavy anchors | 9.2-4.8 | 8.7-5.3 | -0.5 |
| 13 | WR-WR, heavy anchors | 9.2-4.8 | 8.7-5.3 | -0.5 |
| 14 | Elite QB anchor, heavy anchors | 9.1-4.9 | 8.7-5.3 | -0.4 |
| 15 | Triple WR, even split | 8.7-5.3 | 8.7-5.3 | -0 |
| 16 | WR-WR, even split | 8.7-5.3 | 8.7-5.3 | -0 |
| 17 | WR-WR, light anchors | 8.6-5.4 | 8.7-5.3 | +0.1 |
| 18 | Triple WR, light anchors | 8.6-5.4 | 8.7-5.3 | +0.1 |
| 19 | Zero RB (WR-WR-TE), light anchors | 8.6-5.4 | 8.7-5.3 | +0.1 |
| 20 | Robust RB (RB-RB), heavy anchors | 9.5-4.5 | 8.6-5.4 | -0.9 |
| 21 | Double RB + WR, heavy anchors | 9.5-4.5 | 8.6-5.4 | -0.9 |
| 22 | Elite TE anchor, heavy anchors | 8.2-5.8 | 8.6-5.4 | +0.4 |
| 23 | Elite TE anchor, light anchors | 8.1-5.9 | 8.6-5.4 | +0.5 |
| 24 | Elite QB anchor, light anchors | 8.4-5.6 | 8.6-5.4 | +0.2 |
| 25 | Balanced (no anchor) | 7.9-6.1 | 8.6-5.4 | +0.7 |
| 26 | Elite QB anchor, even split | 8.5-5.5 | 8.3-5.7 | -0.2 |

Healthy-basis winner: **Hero RB (RB + WR-WR), heavy anchors** (9.7 wins).
Risk-adjusted winner: **RB-WR, even split** (9 wins).
The top strategy CHANGES once risk is priced in: "Hero RB (RB + WR-WR), heavy anchors" no longer leads.

### 1. RB-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9-5 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Zay Flowers (~$24), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $156 on anchors and keeps $44 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 19%, TE 6%, DST 3%, K 0%, bench 21%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Zay Flowers $24 (win by $26), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 2.5% of drafts: Jahmyr Gibbs + Quinshon Judkins + Zay Flowers + Jalen Hurts + Luther Burden III - avg spend $183, avg record 8.7-5.3.
  - 2.3% of drafts: Jahmyr Gibbs + Quinshon Judkins + Zay Flowers + Jalen Hurts + Luther Burden III + Travis Etienne Jr. - avg spend $195, avg record 7.4-6.6.
  - 2% of drafts: Jahmyr Gibbs + Quinshon Judkins + Zay Flowers + Jalen Hurts + Luther Burden III + Cam Skattebo - avg spend $195, avg record 9.5-4.5.

  Players you land most:
  - Zay Flowers (WR): 96.3% of drafts, avg $29.
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Quinshon Judkins (RB): 90.5% of drafts, avg $15.
  - Luther Burden III (WR): 73.8% of drafts, avg $17.
  - Bo Nix (QB): 69.8% of drafts, avg $1.
  - Jalen Hurts (QB): 49% of drafts, avg $18.
  - Courtland Sutton (WR): 44% of drafts, avg $1.
  - Zach Charbonnet (RB): 39.8% of drafts, avg $1.

### 2. Hero RB (RB + WR-WR), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9-5 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Zay Flowers (~$24), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $151 on anchors and keeps $49 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 17%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Zay Flowers $24 (win by $26), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Rome Odunze $9 (win by $10).
  Targets $134 + reserve $8 = $142 of $200 (completable).

  Most common roster cores this strategy landed:
  - 1.3% of drafts: Rome Odunze + Jahmyr Gibbs + Quinshon Judkins + Zay Flowers + Jalen Hurts + Travis Etienne Jr. - avg spend $195, avg record 7.4-6.6.
  - 1% of drafts: Rome Odunze + Jahmyr Gibbs + Quinshon Judkins + Zay Flowers + Jalen Hurts - avg spend $179, avg record 10.5-3.5.
  - 1% of drafts: Jahmyr Gibbs + Quinshon Judkins + Zay Flowers + Jalen Hurts - avg spend $163, avg record 9.8-4.2.

  Players you land most:
  - Zay Flowers (WR): 96% of drafts, avg $29.
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Quinshon Judkins (RB): 91.8% of drafts, avg $15.
  - Bo Nix (QB): 70.3% of drafts, avg $1.
  - Jalen Hurts (QB): 49.5% of drafts, avg $18.
  - Rome Odunze (WR): 49.5% of drafts, avg $11.
  - Courtland Sutton (WR): 43.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 39% of drafts, avg $1.

### 3. RB-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9-5 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Luther Burden III (~$14), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $138 on anchors and keeps $62 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 10%, TE 6%, DST 3%, K 0%, bench 30%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $121 + reserve $8 = $129 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Jahmyr Gibbs + Quinshon Judkins + Josh Jacobs + Jalen Hurts + Luther Burden III + Travis Etienne Jr. - avg spend $194, avg record 7.7-6.3.
  - 0.8% of drafts: Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Luther Burden III + Malik Nabers - avg spend $181, avg record 9.3-4.7.
  - 0.8% of drafts: Kyren Williams + Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Tee Higgins + Luther Burden III - avg spend $193, avg record 8-6.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Quinshon Judkins (RB): 90.8% of drafts, avg $15.
  - Luther Burden III (WR): 78.3% of drafts, avg $17.
  - Bo Nix (QB): 70.3% of drafts, avg $1.
  - Jalen Hurts (QB): 50.2% of drafts, avg $18.
  - Courtland Sutton (WR): 44.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 38% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 31.8% of drafts, avg $1.

### 4. Hero RB (RB + WR-WR), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/QB/TE/WR/DEF), rest at room price.

- Projected record: 9-5 (best 14-0, worst 0-14).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jalen Hurts (~$13), Quinshon Judkins (~$12). RB runs COOL (0.84x room vs national). This shape spends $125 on anchors and keeps $75 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 4%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7), Carnell Tate $6 (win by $7).
  Targets $113 + reserve $8 = $121 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Quinshon Judkins + Jalen Hurts + Malik Nabers - avg spend $190, avg record 11-3.
  - 0.5% of drafts: Jahmyr Gibbs + Quinshon Judkins + Nico Collins + Garrett Wilson - avg spend $190, avg record 11.5-2.5.
  - 0.5% of drafts: Jahmyr Gibbs + Quinshon Judkins + D'Andre Swift - avg spend $139, avg record 6.5-7.5.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Quinshon Judkins (RB): 91.8% of drafts, avg $15.
  - Bo Nix (QB): 70.3% of drafts, avg $1.
  - Jalen Hurts (QB): 49.8% of drafts, avg $18.
  - Carnell Tate (WR): 43.5% of drafts, avg $8.
  - Courtland Sutton (WR): 43% of drafts, avg $1.
  - Zach Charbonnet (RB): 38.5% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 32.8% of drafts, avg $1.

### 5. RB-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/DEF/TE), rest at room price.

- Projected record: 8.9-5.1 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $190 on anchors and keeps $10 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 39%, TE 3%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $179 + reserve $8 = $187 of $200 (completable).

  Most common roster cores this strategy landed:
  - 28.8% of drafts: Jahmyr Gibbs + Quinshon Judkins + Amon-Ra St. Brown - avg spend $198, avg record 8.7-5.3.
  - 16.3% of drafts: Jahmyr Gibbs + Luther Burden III + Amon-Ra St. Brown - avg spend $198, avg record 9.5-4.5.
  - 12.5% of drafts: Jahmyr Gibbs + Jalen Hurts + Amon-Ra St. Brown - avg spend $198, avg record 9.1-4.9.

  Players you land most:
  - Amon-Ra St. Brown (WR): 92.3% of drafts, avg $76.
  - Jahmyr Gibbs (RB): 91.8% of drafts, avg $87.
  - Bo Nix (QB): 72.3% of drafts, avg $1.
  - Courtland Sutton (WR): 60.8% of drafts, avg $1.
  - Quinshon Judkins (RB): 60.3% of drafts, avg $15.
  - Zach Charbonnet (RB): 53% of drafts, avg $1.
  - Dallas Goedert (TE): 42.3% of drafts, avg $1.
  - Luther Burden III (WR): 39.5% of drafts, avg $17.

### 6. Hero RB (RB + WR-WR), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.9-5.1 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $183 on anchors and keeps $17 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 33%, TE 6%, DST 3%, K 0%, bench 7%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $171 + reserve $8 = $179 of $200 (completable).

  Most common roster cores this strategy landed:
  - 39.3% of drafts: Jahmyr Gibbs + Quinshon Judkins + Amon-Ra St. Brown - avg spend $198, avg record 8.6-5.4.
  - 15.5% of drafts: Jahmyr Gibbs + Jalen Hurts + Amon-Ra St. Brown - avg spend $198, avg record 9.3-4.7.
  - 3.5% of drafts: Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Amon-Ra St. Brown - avg spend $199, avg record 8.4-5.6.

  Players you land most:
  - Amon-Ra St. Brown (WR): 92.3% of drafts, avg $76.
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Bo Nix (QB): 72% of drafts, avg $1.
  - Quinshon Judkins (RB): 71.3% of drafts, avg $15.
  - Courtland Sutton (WR): 59% of drafts, avg $1.
  - Zach Charbonnet (RB): 53.5% of drafts, avg $1.
  - Dallas Goedert (TE): 36.8% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 36% of drafts, avg $1.

### 7. Robust RB (RB-RB), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.9-5.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$29), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $165 on anchors and keeps $35 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 53%, WR 15%, TE 6%, DST 3%, K 0%, bench 16%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $29 (win by $32), Emeka Egbuka $16 (win by $18), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14).
  Targets $148 + reserve $8 = $156 of $200 (completable).

  Most common roster cores this strategy landed:
  - 8% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jeremiyah Love + Jalen Hurts + Luther Burden III - avg spend $196, avg record 8.8-5.2.
  - 1.8% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jeremiyah Love + Luther Burden III + Cam Skattebo - avg spend $197, avg record 8.9-5.1.
  - 1.8% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jeremiyah Love + Luther Burden III - avg spend $180, avg record 10.9-3.1.

  Players you land most:
  - Jeremiyah Love (RB): 96.3% of drafts, avg $35.
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 75.8% of drafts, avg $17.
  - Emeka Egbuka (WR): 71.5% of drafts, avg $19.
  - Bo Nix (QB): 71% of drafts, avg $1.
  - Courtland Sutton (WR): 47.8% of drafts, avg $1.
  - Jalen Hurts (QB): 46.8% of drafts, avg $18.
  - Zach Charbonnet (RB): 41% of drafts, avg $1.

### 8. Double RB + WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.9-5.1 (best 14-0, worst 2-12).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$29), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $150 on anchors and keeps $50 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 53%, WR 8%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $29 (win by $32), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $138 + reserve $8 = $146 of $200 (completable).

  Most common roster cores this strategy landed:
  - 1.5% of drafts: Jahmyr Gibbs + Jeremiyah Love + Jalen Hurts + Luther Burden III + Cam Skattebo - avg spend $194, avg record 8.7-5.3.
  - 1.5% of drafts: Javonte Williams + Jahmyr Gibbs + Jeremiyah Love + Jalen Hurts + Luther Burden III - avg spend $196, avg record 8.5-5.5.
  - 1.3% of drafts: Jahmyr Gibbs + Jeremiyah Love + Jalen Hurts + Luther Burden III - avg spend $175, avg record 8.2-5.8.

  Players you land most:
  - Jeremiyah Love (RB): 96.5% of drafts, avg $35.
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 80% of drafts, avg $17.
  - Bo Nix (QB): 70.3% of drafts, avg $1.
  - Jalen Hurts (QB): 49.5% of drafts, avg $18.
  - Courtland Sutton (WR): 47.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 42% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 33.3% of drafts, avg $1.

### 9. Robust RB (RB-RB), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Emeka Egbuka (~$16), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $143 on anchors and keeps $57 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 42%, WR 15%, TE 6%, DST 3%, K 0%, bench 27%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Emeka Egbuka $16 (win by $18), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Rhamondre Stevenson $7 (win by $8).
  Targets $126 + reserve $8 = $134 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jalen Hurts + Luther Burden III + Malik Nabers - avg spend $192, avg record 11-3.
  - 0.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jalen Hurts + Luther Burden III + Travis Etienne Jr. + Cam Skattebo - avg spend $200, avg record 9-5.
  - 0.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Josh Jacobs + Jalen Hurts + Luther Burden III + Rhamondre Stevenson - avg spend $194, avg record 8-6.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 78.8% of drafts, avg $17.
  - Emeka Egbuka (WR): 77% of drafts, avg $19.
  - Bo Nix (QB): 69.5% of drafts, avg $1.
  - Jalen Hurts (QB): 49% of drafts, avg $18.
  - Courtland Sutton (WR): 44.8% of drafts, avg $1.
  - Rhamondre Stevenson (RB): 44.5% of drafts, avg $9.
  - Zach Charbonnet (RB): 38% of drafts, avg $1.

### 10. Elite TE anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 2-12).
- Why: The board supports paying up for Justin Jefferson (~$57), Brock Bowers (~$49), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $158 on anchors and keeps $42 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 29%, TE 27%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Justin Jefferson $53 (room $57, 0.94x durability) (win by $58), Brock Bowers $46 (room $49, 0.94x durability) (win by $51), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Quinshon Judkins + Justin Jefferson + Jalen Hurts + D'Andre Swift + Brock Bowers - avg spend $199, avg record 8-6.
  - 0.5% of drafts: Quinshon Judkins + Justin Jefferson + Breece Hall + Brock Bowers - avg spend $188, avg record 8.5-5.5.
  - 0.5% of drafts: Quinshon Judkins + Justin Jefferson + Davante Adams + Luther Burden III + Brock Bowers - avg spend $191, avg record 9-5.

  Players you land most:
  - Quinshon Judkins (RB): 90% of drafts, avg $15.
  - Justin Jefferson (WR): 86% of drafts, avg $67.
  - Bo Nix (QB): 70% of drafts, avg $1.
  - Jalen Hurts (QB): 47.5% of drafts, avg $18.
  - Courtland Sutton (WR): 44% of drafts, avg $1.
  - Zach Charbonnet (RB): 38.8% of drafts, avg $1.
  - D'Andre Swift (RB): 34% of drafts, avg $19.
  - Michael Pittman Jr. (WR): 31.8% of drafts, avg $1.

### 11. Double RB + WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Luther Burden III (~$14), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $128 on anchors and keeps $72 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 42%, WR 8%, TE 6%, DST 3%, K 0%, bench 34%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Rhamondre Stevenson $7 (win by $8), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $116 + reserve $8 = $124 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Jahmyr Gibbs + Davante Adams + Breece Hall + Luther Burden III + Travis Etienne Jr. - avg spend $189, avg record 11-3.
  - 0.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Josh Jacobs + Jalen Hurts + Luther Burden III - avg spend $188, avg record 9.5-4.5.
  - 0.5% of drafts: Jahmyr Gibbs + Jalen Hurts + Harold Fannin Jr. + Luther Burden III + Malik Nabers - avg spend $193, avg record 11-3.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 83% of drafts, avg $17.
  - Bo Nix (QB): 69.8% of drafts, avg $1.
  - Jalen Hurts (QB): 48.8% of drafts, avg $18.
  - Rhamondre Stevenson (RB): 44.5% of drafts, avg $9.
  - Courtland Sutton (WR): 43.8% of drafts, avg $1.
  - Zach Charbonnet (RB): 38.8% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 32.8% of drafts, avg $1.

### 12. Triple WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $192 on anchors and keeps $8 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 71%, TE 2%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Amon-Ra St. Brown $64 (win by $70), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 22.3% of drafts: Puka Nacua + Quinshon Judkins + Amon-Ra St. Brown - avg spend $198, avg record 9.1-4.9.
  - 6.8% of drafts: Puka Nacua + Jalen Hurts + Amon-Ra St. Brown - avg spend $198, avg record 8.6-5.4.
  - 6.3% of drafts: Puka Nacua + Amon-Ra St. Brown + D'Andre Swift - avg spend $199, avg record 8.7-5.3.

  Players you land most:
  - Amon-Ra St. Brown (WR): 91.5% of drafts, avg $77.
  - Quinshon Judkins (RB): 78.3% of drafts, avg $15.
  - Bo Nix (QB): 71% of drafts, avg $1.
  - Puka Nacua (WR): 56.8% of drafts, avg $87.
  - Courtland Sutton (WR): 55.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 48.3% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 35.5% of drafts, avg $1.
  - Jalen Hurts (QB): 33.8% of drafts, avg $18.

### 13. WR-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $192 on anchors and keeps $8 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 70%, TE 3%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Amon-Ra St. Brown $64 (win by $70), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 22.3% of drafts: Puka Nacua + Quinshon Judkins + Amon-Ra St. Brown - avg spend $198, avg record 9.1-4.9.
  - 6.8% of drafts: Puka Nacua + Jalen Hurts + Amon-Ra St. Brown - avg spend $198, avg record 8.6-5.4.
  - 6.3% of drafts: Puka Nacua + Amon-Ra St. Brown + D'Andre Swift - avg spend $199, avg record 8.7-5.3.

  Players you land most:
  - Amon-Ra St. Brown (WR): 91.5% of drafts, avg $77.
  - Quinshon Judkins (RB): 78.3% of drafts, avg $15.
  - Bo Nix (QB): 71% of drafts, avg $1.
  - Puka Nacua (WR): 56.8% of drafts, avg $87.
  - Courtland Sutton (WR): 55.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 48.3% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 35.5% of drafts, avg $1.
  - Jalen Hurts (QB): 33.8% of drafts, avg $18.

### 14. Elite QB anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Josh Allen (~$36), Zay Flowers (~$24). RB runs COOL (0.84x room vs national). This shape spends $179 on anchors and keeps $21 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 44%, WR 19%, TE 6%, DST 3%, K 0%, bench 10%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Josh Allen $36 (win by $40), Zay Flowers $24 (win by $26), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13).
  Targets $162 + reserve $8 = $170 of $200 (completable).

  Most common roster cores this strategy landed:
  - 14.3% of drafts: Josh Allen + Jahmyr Gibbs + Quinshon Judkins + Zay Flowers - avg spend $197, avg record 8.4-5.6.
  - 10.8% of drafts: Josh Allen + Jahmyr Gibbs + Zay Flowers + Luther Burden III - avg spend $198, avg record 8.5-5.5.
  - 4.3% of drafts: Josh Allen + Jahmyr Gibbs + Quinshon Judkins + Zay Flowers + Luther Burden III - avg spend $199, avg record 7.8-6.2.

  Players you land most:
  - Zay Flowers (WR): 94.8% of drafts, avg $29.
  - Jahmyr Gibbs (RB): 94.3% of drafts, avg $87.
  - Quinshon Judkins (RB): 76.8% of drafts, avg $15.
  - Bo Nix (QB): 71.8% of drafts, avg $1.
  - Luther Burden III (WR): 63.8% of drafts, avg $17.
  - Courtland Sutton (WR): 48.5% of drafts, avg $1.
  - Josh Allen (QB): 45.3% of drafts, avg $50.
  - Zach Charbonnet (RB): 43.3% of drafts, avg $1.

### 15. Triple WR, even split  (wr-heavy-auction, aggressive risk)

Pool-generated WR Heavy (Auction): 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 2-12).
- Why: The board supports paying up for Puka Nacua (~$76), Zay Flowers (~$24), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $160 on anchors and keeps $40 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, even split. Built from the live board: wr heavy shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 55%, TE 2%, DST 3%, K 0%, bench 19%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Zay Flowers $24 (win by $26), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $130 + reserve $8 = $138 of $200 (completable).

  Most common roster cores this strategy landed:
  - 2% of drafts: Puka Nacua + Quinshon Judkins + Zay Flowers + Jalen Hurts + D'Andre Swift - avg spend $186, avg record 10.3-3.7.
  - 1% of drafts: Puka Nacua + Quinshon Judkins + Zay Flowers + Jalen Hurts + Cam Skattebo - avg spend $188, avg record 10-4.
  - 0.8% of drafts: Puka Nacua + Quinshon Judkins + Zay Flowers + Tyler Warren + Jalen Hurts - avg spend $173, avg record 11-3.

  Players you land most:
  - Zay Flowers (WR): 95.3% of drafts, avg $29.
  - Quinshon Judkins (RB): 90% of drafts, avg $15.
  - Bo Nix (QB): 68.8% of drafts, avg $1.
  - Puka Nacua (WR): 59.8% of drafts, avg $87.
  - Jalen Hurts (QB): 48.8% of drafts, avg $18.
  - Courtland Sutton (WR): 44.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 38.3% of drafts, avg $1.
  - D'Andre Swift (RB): 34% of drafts, avg $19.

### 16. WR-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 2-12).
- Why: The board supports paying up for Puka Nacua (~$76), Zay Flowers (~$24), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $158 on anchors and keeps $42 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 50%, TE 6%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Zay Flowers $24 (win by $26), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $130 + reserve $8 = $138 of $200 (completable).

  Most common roster cores this strategy landed:
  - 2% of drafts: Puka Nacua + Quinshon Judkins + Zay Flowers + Jalen Hurts + D'Andre Swift - avg spend $186, avg record 10.3-3.7.
  - 1% of drafts: Puka Nacua + Quinshon Judkins + Zay Flowers + Jalen Hurts + Cam Skattebo - avg spend $188, avg record 10-4.
  - 0.8% of drafts: Puka Nacua + Quinshon Judkins + Zay Flowers + Tyler Warren + Jalen Hurts - avg spend $173, avg record 11-3.

  Players you land most:
  - Zay Flowers (WR): 95.3% of drafts, avg $29.
  - Quinshon Judkins (RB): 90% of drafts, avg $15.
  - Bo Nix (QB): 68.8% of drafts, avg $1.
  - Puka Nacua (WR): 59.8% of drafts, avg $87.
  - Jalen Hurts (QB): 48.8% of drafts, avg $18.
  - Courtland Sutton (WR): 44.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 38.3% of drafts, avg $1.
  - D'Andre Swift (RB): 34% of drafts, avg $19.

### 17. WR-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), D'Andre Swift (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $140 on anchors and keeps $60 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 41%, TE 6%, DST 3%, K 0%, bench 29%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $112 + reserve $8 = $120 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + D'Andre Swift + Garrett Wilson - avg spend $183, avg record 9-5.
  - 0.5% of drafts: Puka Nacua + Emeka Egbuka + Quinshon Judkins + Jalen Hurts + Garrett Wilson - avg spend $187, avg record 7.5-6.5.
  - 0.5% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + D'Andre Swift + Tetairoa McMillan - avg spend $183, avg record 6.5-7.5.

  Players you land most:
  - Quinshon Judkins (RB): 92.5% of drafts, avg $15.
  - Bo Nix (QB): 68.5% of drafts, avg $1.
  - Puka Nacua (WR): 59.8% of drafts, avg $87.
  - Jalen Hurts (QB): 51.3% of drafts, avg $18.
  - Courtland Sutton (WR): 42.8% of drafts, avg $1.
  - Zach Charbonnet (RB): 37.8% of drafts, avg $1.
  - D'Andre Swift (RB): 35% of drafts, avg $19.
  - Michael Pittman Jr. (WR): 31.8% of drafts, avg $1.

### 18. Triple WR, light anchors  (wr-heavy-auction, balanced risk)

Pool-generated WR Heavy (Auction): 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), D'Andre Swift (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $134 on anchors and keeps $66 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, light anchors. Built from the live board: wr heavy shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 42%, TE 2%, DST 3%, K 0%, bench 32%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Carnell Tate $6 (win by $7).
  Targets $112 + reserve $8 = $120 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + D'Andre Swift + Tetairoa McMillan - avg spend $188, avg record 7.5-6.5.
  - 0.5% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + Luther Burden III + D'Andre Swift + Ladd McConkey - avg spend $189, avg record 5.5-8.5.
  - 0.3% of drafts: Puka Nacua + Quinshon Judkins + Zay Flowers + Josh Jacobs + Tyler Warren + Tee Higgins - avg spend $198, avg record 5-9.

  Players you land most:
  - Quinshon Judkins (RB): 91.3% of drafts, avg $15.
  - Bo Nix (QB): 67.8% of drafts, avg $1.
  - Puka Nacua (WR): 59.8% of drafts, avg $87.
  - Jalen Hurts (QB): 50.5% of drafts, avg $18.
  - Carnell Tate (WR): 42% of drafts, avg $8.
  - Courtland Sutton (WR): 42% of drafts, avg $1.
  - Zach Charbonnet (RB): 37% of drafts, avg $1.
  - D'Andre Swift (RB): 33.8% of drafts, avg $19.

### 19. Zero RB (WR-WR-TE), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), D'Andre Swift (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $134 on anchors and keeps $66 to complete the roster at room prices.
- Philosophy: Pattern sweep: Zero RB (WR-WR-TE), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 41%, TE 3%, DST 3%, K 0%, bench 32%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Carnell Tate $6 (win by $7).
  Targets $112 + reserve $8 = $120 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + D'Andre Swift + Tetairoa McMillan - avg spend $188, avg record 7.5-6.5.
  - 0.5% of drafts: Puka Nacua + Quinshon Judkins + Jalen Hurts + Luther Burden III + D'Andre Swift + Ladd McConkey - avg spend $189, avg record 5.5-8.5.
  - 0.3% of drafts: Puka Nacua + Quinshon Judkins + Zay Flowers + Josh Jacobs + Tyler Warren + Tee Higgins - avg spend $198, avg record 5-9.

  Players you land most:
  - Quinshon Judkins (RB): 91.3% of drafts, avg $15.
  - Bo Nix (QB): 67.8% of drafts, avg $1.
  - Puka Nacua (WR): 59.8% of drafts, avg $87.
  - Jalen Hurts (QB): 50.5% of drafts, avg $18.
  - Carnell Tate (WR): 42% of drafts, avg $8.
  - Courtland Sutton (WR): 42% of drafts, avg $1.
  - Zach Charbonnet (RB): 37% of drafts, avg $1.
  - D'Andre Swift (RB): 33.8% of drafts, avg $19.

### 20. Robust RB (RB-RB), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/DEF/TE), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $194 on anchors and keeps $6 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 14%, TE 3%, DST 3%, K 0%, bench 1%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Davante Adams $12 (room $13, 0.94x durability) (win by $13).
  Targets $175 + reserve $8 = $183 of $200 (completable).

  Most common roster cores this strategy landed:
  - 23.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $199, avg record 8.5-5.5.
  - 14.3% of drafts: Jahmyr Gibbs + Davante Adams + Christian McCaffrey - avg spend $199, avg record 8.5-5.5.
  - 12.3% of drafts: Jahmyr Gibbs + Jalen Hurts + Christian McCaffrey - avg spend $199, avg record 8.5-5.5.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.3% of drafts, avg $87.
  - Bo Nix (QB): 71.3% of drafts, avg $1.
  - Christian McCaffrey (RB): 69.8% of drafts, avg $81.
  - Courtland Sutton (WR): 62% of drafts, avg $1.
  - Luther Burden III (WR): 57.5% of drafts, avg $17.
  - Zach Charbonnet (RB): 50.5% of drafts, avg $1.
  - Dallas Goedert (TE): 42% of drafts, avg $1.
  - Davante Adams (WR): 37.8% of drafts, avg $16.

### 21. Double RB + WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $188 on anchors and keeps $12 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 8%, TE 6%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $169 + reserve $8 = $177 of $200 (completable).

  Most common roster cores this strategy landed:
  - 28.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $199, avg record 8.6-5.4.
  - 14.5% of drafts: Jahmyr Gibbs + Jalen Hurts + Christian McCaffrey - avg spend $199, avg record 8.4-5.6.
  - 11% of drafts: Jahmyr Gibbs + Christian McCaffrey - avg spend $196, avg record 7.5-6.5.

  Players you land most:
  - Jahmyr Gibbs (RB): 91.8% of drafts, avg $87.
  - Bo Nix (QB): 72.5% of drafts, avg $1.
  - Christian McCaffrey (RB): 70% of drafts, avg $81.
  - Courtland Sutton (WR): 62.5% of drafts, avg $1.
  - Luther Burden III (WR): 61.8% of drafts, avg $17.
  - Zach Charbonnet (RB): 52.5% of drafts, avg $1.
  - Dallas Goedert (TE): 37% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 35.5% of drafts, avg $1.

### 22. Elite TE anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 2-12).
- Why: The board supports paying up for Puka Nacua (~$76), Brock Bowers (~$49), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $190 on anchors and keeps $10 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 45%, TE 27%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Brock Bowers $46 (room $49, 0.94x durability) (win by $51), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14).
  Targets $154 + reserve $8 = $162 of $200 (completable).

  Most common roster cores this strategy landed:
  - 2% of drafts: Puka Nacua + Luther Burden III + Brock Bowers - avg spend $197, avg record 9.6-4.4.
  - 1% of drafts: Puka Nacua + Luther Burden III + D'Andre Swift + Brock Bowers - avg spend $199, avg record 7.5-6.5.
  - 1% of drafts: Puka Nacua + Jalen Hurts + Luther Burden III + Brock Bowers - avg spend $199, avg record 10-4.

  Players you land most:
  - Luther Burden III (WR): 77.5% of drafts, avg $17.
  - Bo Nix (QB): 69.3% of drafts, avg $1.
  - Puka Nacua (WR): 59.8% of drafts, avg $87.
  - Jalen Hurts (QB): 49.3% of drafts, avg $18.
  - Courtland Sutton (WR): 45.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 40.5% of drafts, avg $1.
  - D'Andre Swift (RB): 36.3% of drafts, avg $19.
  - Michael Pittman Jr. (WR): 32.3% of drafts, avg $1.

### 23. Elite TE anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (TE/WR/RB/QB/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Brock Bowers (~$49), Zay Flowers (~$24), D'Andre Swift (~$16). TE runs HOT (1.17x room vs national). This shape spends $133 on anchors and keeps $67 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 17%, TE 27%, DST 3%, K 0%, bench 32%.
- Target prices (durability-adjusted expect / walk-up to win): Brock Bowers $46 (room $49, 0.94x durability) (win by $51), Zay Flowers $24 (win by $26), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $110 + reserve $8 = $118 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: DeVonta Smith + Jonathan Taylor + Jeremiyah Love + Zay Flowers + Chris Olave - avg spend $200, avg record 11-3.
  - 0.3% of drafts: Rome Odunze + Quinshon Judkins + Colston Loveland + Zay Flowers + Rashee Rice + Omarion Hampton + Derrick Henry - avg spend $190, avg record 10-4.
  - 0.3% of drafts: Quinshon Judkins + Colston Loveland + Jeremiyah Love + Rashee Rice + Omarion Hampton + Jalen Hurts + Garrett Wilson - avg spend $200, avg record 7-7.

  Players you land most:
  - Zay Flowers (WR): 96.3% of drafts, avg $29.
  - Quinshon Judkins (RB): 89.5% of drafts, avg $15.
  - Bo Nix (QB): 69% of drafts, avg $1.
  - Jalen Hurts (QB): 48.8% of drafts, avg $18.
  - Courtland Sutton (WR): 39.8% of drafts, avg $1.
  - Zach Charbonnet (RB): 36.5% of drafts, avg $1.
  - D'Andre Swift (RB): 33.3% of drafts, avg $19.
  - Michael Pittman Jr. (WR): 30% of drafts, avg $1.

### 24. Elite QB anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 2-12).
- Why: The board supports paying up for Saquon Barkley (~$42), Josh Allen (~$36), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $127 on anchors and keeps $73 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 27%, WR 10%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (durability-adjusted expect / walk-up to win): Saquon Barkley $39 (room $42, 0.94x durability) (win by $43), Josh Allen $36 (win by $40), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $107 + reserve $8 = $115 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Josh Allen + Quinshon Judkins + Jeremiyah Love + Saquon Barkley + Luther Burden III - avg spend $190, avg record 11.5-2.5.
  - 0.5% of drafts: Josh Allen + Quinshon Judkins + Josh Jacobs + Saquon Barkley + Luther Burden III + Travis Etienne Jr. - avg spend $186, avg record 3-11.
  - 0.5% of drafts: Josh Allen + Quinshon Judkins + Saquon Barkley + Luther Burden III + Tetairoa McMillan + Ladd McConkey - avg spend $189, avg record 8.5-5.5.

  Players you land most:
  - Quinshon Judkins (RB): 90.5% of drafts, avg $15.
  - Saquon Barkley (RB): 87.3% of drafts, avg $50.
  - Luther Burden III (WR): 73.8% of drafts, avg $17.
  - Bo Nix (QB): 69.8% of drafts, avg $1.
  - Josh Allen (QB): 51.3% of drafts, avg $50.
  - Courtland Sutton (WR): 41.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 36% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 31.5% of drafts, avg $1.

### 25. Balanced (no anchor)  (balanced-auction, conservative risk)

Pool-generated Balanced Auction: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 8.6-5.4 (best 14-0, worst 1-13).
- Why: The board supports paying up for Emeka Egbuka (~$16), D'Andre Swift (~$16), Luther Burden III (~$14). WR runs HOT (1.18x room vs national). This shape spends $88 on anchors and keeps $112 to complete the roster at room prices.
- Philosophy: Pattern sweep: Balanced (no anchor). Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 15%, TE 6%, DST 3%, K 0%, bench 55%.
- Target prices (durability-adjusted expect / walk-up to win): Emeka Egbuka $16 (win by $18), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $70 + reserve $8 = $78 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Quinshon Judkins + Josh Jacobs + Rashee Rice + Omarion Hampton + Derrick Henry + Garrett Wilson - avg spend $190, avg record 12-2.
  - 0.3% of drafts: Emeka Egbuka + Quinshon Judkins + Jeremiyah Love + Jaylen Waddle + Saquon Barkley + Jalen Hurts + Luther Burden III + Travis Etienne Jr. - avg spend $194, avg record 8-6.
  - 0.3% of drafts: TreVeyon Henderson + DeVonta Smith + Emeka Egbuka + Quinshon Judkins + Jeremiyah Love + Josh Jacobs + Jalen Hurts + Luther Burden III - avg spend $179, avg record 12-2.

  Players you land most:
  - Quinshon Judkins (RB): 88.8% of drafts, avg $15.
  - Luther Burden III (WR): 69.3% of drafts, avg $17.
  - Emeka Egbuka (WR): 67.5% of drafts, avg $19.
  - Bo Nix (QB): 66.8% of drafts, avg $1.
  - Jalen Hurts (QB): 49.5% of drafts, avg $18.
  - Courtland Sutton (WR): 38.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 34% of drafts, avg $1.
  - D'Andre Swift (RB): 32% of drafts, avg $20.

### 26. Elite QB anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 8.3-5.7 (best 14-0, worst 0-14).
- Why: The board supports paying up for Christian McCaffrey (~$67), Josh Allen (~$36), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $152 on anchors and keeps $48 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 40%, WR 10%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Josh Allen $36 (win by $40), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $128 + reserve $8 = $136 of $200 (completable).

  Most common roster cores this strategy landed:
  - 2.3% of drafts: Josh Allen + Quinshon Judkins + Christian McCaffrey + Luther Burden III - avg spend $191, avg record 8.1-5.9.
  - 2% of drafts: Josh Allen + Quinshon Judkins + Christian McCaffrey + Luther Burden III + Ladd McConkey - avg spend $197, avg record 6.4-7.6.
  - 1.5% of drafts: Josh Allen + Emeka Egbuka + Quinshon Judkins + Christian McCaffrey + Luther Burden III - avg spend $193, avg record 8.5-5.5.

  Players you land most:
  - Quinshon Judkins (RB): 90.5% of drafts, avg $15.
  - Luther Burden III (WR): 76% of drafts, avg $17.
  - Christian McCaffrey (RB): 71.8% of drafts, avg $80.
  - Bo Nix (QB): 70.3% of drafts, avg $1.
  - Josh Allen (QB): 52.3% of drafts, avg $50.
  - Courtland Sutton (WR): 42.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 39.8% of drafts, avg $1.
  - Michael Pittman Jr. (WR): 32.5% of drafts, avg $1.

## Specific stud combos (which exact players to target)

The strategy leaderboard above says which SHAPE wins. This tier says which
exact studs to buy inside each shape. Every combo is a completable $200
roster (the named anchors forced in, the rest filled at room price) graded
with the risk model on. Grouped by pattern, best projected record first.

### Top combos overall

| # | Anchors | Pattern | Proj record | Mean starter pts |
|---|---------|---------|-------------|------------------|
| 1 | Jahmyr Gibbs + Jaxon Smith-Njigba | RB-WR | 8.9-5.1 | 1956.7 |
| 2 | Jahmyr Gibbs + Amon-Ra St. Brown | RB-WR | 8.9-5.1 | 1957.6 |
| 3 | Jahmyr Gibbs + Bijan Robinson | Robust RB (RB-RB) | 8.8-5.2 | 1943.8 |
| 4 | Puka Nacua + Jaxon Smith-Njigba | WR-WR | 8.8-5.2 | 1920.1 |
| 5 | Puka Nacua + Ja'Marr Chase | WR-WR | 8.8-5.2 | 1906.9 |
| 6 | Jahmyr Gibbs + Puka Nacua | RB-WR | 8.8-5.2 | 1953.5 |
| 7 | Puka Nacua + Amon-Ra St. Brown | WR-WR | 8.7-5.3 | 1926.1 |
| 8 | Puka Nacua + Jaxon Smith-Njigba + Trey McBride | Zero RB (WR-WR-TE) | 8.7-5.3 | 1907.3 |
| 9 | Drake Maye + Jahmyr Gibbs + Puka Nacua | Elite QB anchor | 8.7-5.3 | 1937.5 |
| 10 | Trey McBride + Puka Nacua + Ja'Marr Chase | Elite TE anchor | 8.7-5.3 | 1891.5 |
| 11 | Jahmyr Gibbs + Christian McCaffrey | Robust RB (RB-RB) | 8.6-5.4 | 1944.6 |
| 12 | Jaxon Smith-Njigba + Amon-Ra St. Brown + Brock Bowers | Zero RB (WR-WR-TE) | 8.6-5.4 | 1911.7 |

### Robust RB (RB-RB)

- **Jahmyr Gibbs + Bijan Robinson**: 8.8-5.2, 1943.8 starter pts - target Jahmyr Gibbs $76, Bijan Robinson $70.
- **Jahmyr Gibbs + Christian McCaffrey**: 8.6-5.4, 1944.6 starter pts - target Jahmyr Gibbs $76, Christian McCaffrey $60.
- **Christian McCaffrey + Bijan Robinson**: 8.5-5.5, 1916.7 starter pts - target Bijan Robinson $70, Christian McCaffrey $60.

### WR-WR

- **Puka Nacua + Jaxon Smith-Njigba**: 8.8-5.2, 1920.1 starter pts - target Puka Nacua $66, Jaxon Smith-Njigba $72.
- **Puka Nacua + Ja'Marr Chase**: 8.8-5.2, 1906.9 starter pts - target Ja'Marr Chase $75, Puka Nacua $66.
- **Puka Nacua + Amon-Ra St. Brown**: 8.7-5.3, 1926.1 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64.

### RB-WR

- **Jahmyr Gibbs + Jaxon Smith-Njigba**: 8.9-5.1, 1956.7 starter pts - target Jahmyr Gibbs $76, Jaxon Smith-Njigba $72.
- **Jahmyr Gibbs + Amon-Ra St. Brown**: 8.9-5.1, 1957.6 starter pts - target Jahmyr Gibbs $76, Amon-Ra St. Brown $64.
- **Jahmyr Gibbs + Puka Nacua**: 8.8-5.2, 1953.5 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66.

### Zero RB (WR-WR-TE)

- **Puka Nacua + Jaxon Smith-Njigba + Trey McBride**: 8.7-5.3, 1907.3 starter pts - target Puka Nacua $66, Jaxon Smith-Njigba $72, Trey McBride $35.
- **Jaxon Smith-Njigba + Amon-Ra St. Brown + Brock Bowers**: 8.6-5.4, 1911.7 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Brock Bowers $46.
- **Puka Nacua + Amon-Ra St. Brown + Brock Bowers**: 8.5-5.5, 1908.1 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64, Brock Bowers $46.

### Elite QB anchor

- **Drake Maye + Jahmyr Gibbs + Puka Nacua**: 8.7-5.3, 1937.5 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Drake Maye $25.
- **Josh Allen + Jahmyr Gibbs + Puka Nacua**: 8.5-5.5, 1933.2 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Josh Allen $36.
- **Lamar Jackson + Jahmyr Gibbs + Puka Nacua**: 8.5-5.5, 1933.1 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Lamar Jackson $32.

### Elite TE anchor

- **Trey McBride + Puka Nacua + Ja'Marr Chase**: 8.7-5.3, 1891.5 starter pts - target Ja'Marr Chase $75, Puka Nacua $66, Trey McBride $35.
- **Trey McBride + Puka Nacua + Amon-Ra St. Brown**: 8.6-5.4, 1909.4 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64, Trey McBride $35.
- **Trey McBride + Jaxon Smith-Njigba + Amon-Ra St. Brown**: 8.6-5.4, 1910.6 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Trey McBride $35.

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
- **Drake Maye** (NE, bye 11) - $28-$34 (base $31) league band, land odds 6.3%.
  Fair value ~$31 (band $28-$34).
- **Jalen Hurts** (PHI, bye 10) - $13-$33 (base $23) league band, land odds 0%.
  Target - worth ~$33, room pays ~$13. Win him at or under $23.  [+$6 POCKET]
- **Bo Nix** (DEN, bye 10) - $1-$33 (base $17) league band, land odds 0%.
  Target - worth ~$33, room pays ~$1. Win him at or under $17.  [+$10 POCKET]
- **Jayden Daniels** (WAS, bye 7) - $15-$21 (base $18) league band, land odds 6.3%.
  Fair value ~$18 (band $15-$21).

### RB

- **Jahmyr Gibbs** (DET, bye 6) - $76-$96 (base $86) league band, land odds 12.5%.
  Anchor - pay up to $86 to lock a Tier 1 player.  [ELITE, +$6 POCKET]
- **Christian McCaffrey** (SF, bye 8) - $67-$70 (base $69) league band, land odds 0%.
  Fair value ~$69 (band $67-$70). Watch the injury tag - trim the bid.  [INJ QUESTIONABLE]
- **Bijan Robinson** (ATL, bye 11) - $70-$80 (base $75) league band, land odds 6.3%.
  Anchor - pay up to $75 to lock a Tier 1 player.  [ELITE]
- **Jonathan Taylor** (IND, bye 13) - $52-$60 (base $56) league band, land odds 0%.
  Fair value ~$56 (band $52-$60).
- **Ashton Jeanty** (LV, bye 13) - $57 league band, land odds 25%.
  Fair value ~$57.
- **Saquon Barkley** (PHI, bye 10) - $42-$53 (base $48) league band, land odds 12.5%.
  Fair value ~$48 (band $42-$53).
- **Jeremiyah Love** (ARI, bye 14) - $29-$42 (base $36) league band, land odds 12.5%.
  Target - worth ~$44, room pays ~$29. Win him at or under $36. Watch the injury tag - trim the bid.  [+$4 POCKET, INJ QUESTIONABLE]
- **James Cook III** (BUF, bye 7) - $43-$53 (base $48) league band, land odds 12.5%.
  Fair value ~$48 (band $43-$53).
- **Chase Brown** (CIN, bye 6) - $41-$50 (base $46) league band, land odds 0%.
  Fair value ~$46 (band $41-$50).
- **De'Von Achane** (MIA, bye 6) - $35-$45 (base $40) league band, land odds 0%.
  Fair value ~$40 (band $35-$45).

### WR

- **Puka Nacua** (LAR, bye 11) - $71-$76 (base $74) league band, land odds 12.5%.
  Anchor - pay up to $74 to lock a Tier 1 player. Watch the injury tag - trim the bid.  [ELITE, INJ QUESTIONABLE]
- **Jaxon Smith-Njigba** (SEA, bye 11) - $72-$78 (base $75) league band, land odds 12.5%.
  Anchor - pay up to $75 to lock a Tier 1 player.  [ELITE]
- **Amon-Ra St. Brown** (DET, bye 6) - $64-$74 (base $69) league band, land odds 18.8%.
  Anchor - pay up to $69 to lock a Tier 1 player.  [ELITE]
- **Ja'Marr Chase** (CIN, bye 6) - $68-$79 (base $74) league band, land odds 12.5%.
  Anchor - pay up to $74 to lock a Tier 1 player.  [ELITE]
- **Justin Jefferson** (MIN, bye 6) - $53-$57 (base $55) league band, land odds 0%.
  Fair value ~$55 (band $53-$57).
- **CeeDee Lamb** (DAL, bye 14) - $48-$60 (base $54) league band, land odds 0%.
  Let him go - room pays ~$60 over his ~$49 worth here.  [-$4 TAX]
- **A.J. Brown** (NE, bye 11) - $40-$48 (base $44) league band, land odds 0%.
  Fair value ~$44 (band $40-$48).
- **Drake London** (ATL, bye 11) - $38-$54 (base $46) league band, land odds 0%.
  Let him go - room pays ~$54 over his ~$41 worth here.  [-$5 TAX]
- **Zay Flowers** (BAL, bye 13) - $24-$39 (base $32) league band, land odds 0%.
  Target - worth ~$41, room pays ~$24. Win him at or under $32. Watch the injury tag - trim the bid.  [+$4 POCKET, INJ QUESTIONABLE]
- **Garrett Wilson** (NYJ, bye 13) - $23-$36 (base $30) league band, land odds 0%.
  Target - worth ~$40, room pays ~$23. Win him at or under $30.  [+$4 POCKET]

### TE

- **Brock Bowers** (LV, bye 13) - $49-$50 (base $50) league band, land odds 6.3%.
  Fair value ~$50 (band $49-$50).
- **Trey McBride** (ARI, bye 14) - $35-$40 (base $38) league band, land odds 6.3%.
  Fair value ~$38 (band $35-$40).
- **Colston Loveland** (CHI, bye 10) - $27-$28 (base $28) league band, land odds 6.3%.
  Fair value ~$28 (band $27-$28).
- **Harold Fannin Jr.** (CLE, bye 11) - $18-$24 (base $21) league band, land odds 6.3%.
  Fair value ~$21 (band $18-$24).
- **Tyler Warren** (IND, bye 13) - $21-$22 (base $22) league band, land odds 25%.
  Fair value ~$22 (band $21-$22). Watch the injury tag - trim the bid.  [INJ QUESTIONABLE]
- **George Kittle** (SF, bye 8) - $4-$12 (base $8) league band, land odds 12.5%.
  Late flier - a $4-$12 bench dollar with real upside. Watch the injury tag - trim the bid.  [INJ PUP, SLEEPER]

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
- **Los Angeles Rams** (LAR, bye 11) - $2-$8 (base $5) league band.
  Fair value ~$5 (band $2-$8).

## Value pockets and sleepers (win them below the room)

- **Bo Nix** (QB, DEN) - Target - worth ~$33, room pays ~$1. Win him at or under $17.  [+$10 POCKET]
- **Jahmyr Gibbs** (RB, DET) - Anchor - pay up to $86 to lock a Tier 1 player.  [ELITE, +$6 POCKET]
- **Jalen Hurts** (QB, PHI) - Target - worth ~$33, room pays ~$13. Win him at or under $23.  [+$6 POCKET]
- **Quinshon Judkins** (RB, CLE) - Target - worth ~$33, room pays ~$12. Win him at or under $22. Watch the injury tag - trim the bid.  [+$6 POCKET, INJ QUESTIONABLE]
- **Courtland Sutton** (WR, DEN) - Target - worth ~$18, room pays ~$1. Win him at or under $10.  [+$5 POCKET]
- **Jaxson Dart** (QB, NYG) - Target - worth ~$20, room pays ~$3. Win him at or under $12.  [+$5 POCKET]
- **Zay Flowers** (WR, BAL) - Target - worth ~$41, room pays ~$24. Win him at or under $32. Watch the injury tag - trim the bid.  [+$4 POCKET, INJ QUESTIONABLE]
- **Garrett Wilson** (WR, NYJ) - Target - worth ~$40, room pays ~$23. Win him at or under $30.  [+$4 POCKET]
- **Jeremiyah Love** (RB, ARI) - Target - worth ~$44, room pays ~$29. Win him at or under $36. Watch the injury tag - trim the bid.  [+$4 POCKET, INJ QUESTIONABLE]
- **Josh Jacobs** (RB, GB) - Target - worth ~$38, room pays ~$22. Win him at or under $29. Watch the injury tag - trim the bid.  [+$4 POCKET, INJ QUESTIONABLE]
- **Luther Burden III** (WR, CHI) - Target - worth ~$27, room pays ~$14. Win him at or under $21.  [+$4 POCKET]
- **Pittsburgh Steelers** (DEF, PIT) - Target - worth ~$13, room pays ~$1. Win him at or under $7.  [+$4 POCKET]
- **J.K. Dobbins** (RB, DEN) - Late flier - a $2-$12 bench dollar with real upside.  [SLEEPER]
- **Dallas Goedert** (TE, PHI) - Late flier - a $1-$11 bench dollar with real upside.  [SLEEPER]
- **Zach Charbonnet** (RB, SEA) - Late flier - a $1-$10 bench dollar with real upside. Watch the injury tag - trim the bid.  [INJ PUP, SLEEPER]
- **George Kittle** (TE, SF) - Late flier - a $4-$12 bench dollar with real upside. Watch the injury tag - trim the bid.  [INJ PUP, SLEEPER]
- **Wan'Dale Robinson** (WR, TEN) - Late flier - a $1-$4 bench dollar with real upside.  [SLEEPER]
- **Jakobi Meyers** (WR, JAC) - Late flier - a $1-$3 bench dollar with real upside.  [SLEEPER]
- **Travis Kelce** (TE, KC) - Late flier - a $5-$6 bench dollar with real upside.  [SLEEPER]
- **Kyle Monangai** (RB, CHI) - Late flier - a $1-$2 bench dollar with real upside. Watch the injury tag - trim the bid.  [INJ QUESTIONABLE, SLEEPER]
- **Isaiah Likely** (TE, NYG) - Late flier - a $2-$2 bench dollar with real upside.  [VOLATILE, SLEEPER]
- **Matthew Golden** (WR, GB) - Late flier - a $1-$2 bench dollar with real upside.  [SLEEPER]
- **Hunter Henry** (TE, NE) - Late flier - a $1-$2 bench dollar with real upside.  [SLEEPER]
- **T.J. Hockenson** (TE, MIN) - Late flier - a $1-$1 bench dollar with real upside.  [SLEEPER]

## Room tax (let someone else overpay)

- **Nico Collins** (WR, HOU) - Let him go - room pays ~$42 over his ~$25 worth here.
- **Joe Burrow** (QB, CIN) - Let him go - room pays ~$23 over his ~$5 worth here.
- **Drake London** (WR, ATL) - Let him go - room pays ~$54 over his ~$41 worth here.
- **George Pickens** (WR, DAL) - Let him go - room pays ~$39 over his ~$23 worth here.
- **CeeDee Lamb** (WR, DAL) - Let him go - room pays ~$60 over his ~$49 worth here.

---

Full machine-readable data (every player, every strategy sim, league intel) is in `dataset.json`.
