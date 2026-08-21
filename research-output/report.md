# The Nasties - Draft Research Dataset

Generated 2026-08-21T20:02:16.364Z. 12-team, $200 auction, full PPR, no kicker.
Roster: QB1, RB1, WR1, TE1, FLEX3, DEF1, Bench5.
Players: 978. Cache last updated 2026-08-20T01:00:27.018+00:00 (stale=true).
Sims: 400 Monte-Carlo runs per strategy, 14-game season, seed 42.

## Strategy leaderboard (which approach wins, and why)

| # | Strategy | Proj record | Modal record | Mean starter pts | Ceiling / Floor |
|---|----------|-------------|--------------|------------------|-----------------|
| 1 | Hero RB (RB + WR-WR), heavy anchors | 9.2-4.8 | 9-5 (16.5%) | 1929.1 | $86 / $62 |
| 2 | RB-WR, heavy anchors | 9.1-4.9 | 9-5 (17.8%) | 1922.7 | $86 / $62 |
| 3 | Robust RB (RB-RB), heavy anchors | 9-5 | 9-5 (14%) | 1923.8 | $86 / $62 |
| 4 | Double RB + WR, heavy anchors | 8.9-5.1 | 8-6 (14.5%) | 1921.7 | $86 / $62 |
| 5 | Triple WR, heavy anchors | 8.8-5.2 | 10-4 (15%) | 1866.6 | $85 / $61 |
| 6 | WR-WR, heavy anchors | 8.8-5.2 | 10-4 (15%) | 1866.6 | $85 / $61 |
| 7 | Robust RB (RB-RB), even split | 8.8-5.2 | 9-5 (17.8%) | 1879.7 | $83 / $59 |
| 8 | Double RB + WR, even split | 8.8-5.2 | 9-5 (16.3%) | 1879.8 | $83 / $59 |
| 9 | Hero RB (RB + WR-WR), light anchors | 8.8-5.2 | 9-5 (16.3%) | 1887.8 | $81 / $67 |
| 10 | Double RB + WR, light anchors | 8.8-5.2 | 9-5 (16%) | 1878.7 | $80 / $66 |
| 11 | RB-WR, light anchors | 8.7-5.3 | 9-5 (16.8%) | 1879.5 | $82 / $68 |
| 12 | Robust RB (RB-RB), light anchors | 8.7-5.3 | 9-5 (17.8%) | 1879.2 | $81 / $67 |
| 13 | Elite QB anchor, heavy anchors | 8.5-5.5 | 8-6 (16.8%) | 1874.6 | $84 / $60 |
| 14 | RB-WR, even split | 8.4-5.6 | 10-4 (15.3%) | 1868 | $84 / $60 |
| 15 | Hero RB (RB + WR-WR), even split | 8.4-5.6 | 8-6 (14.5%) | 1876.3 | $83 / $59 |
| 16 | WR-WR, light anchors | 8.4-5.6 | 8-6 (18.5%) | 1818.8 | $80 / $66 |
| 17 | Triple WR, light anchors | 8.4-5.6 | 8-6 (18.5%) | 1818.7 | $80 / $66 |
| 18 | Zero RB (WR-WR-TE), light anchors | 8.4-5.6 | 8-6 (18.5%) | 1818.7 | $80 / $66 |
| 19 | Elite TE anchor, even split | 8.3-5.7 | 9-5 (15%) | 1801.9 | $81 / $57 |
| 20 | Elite TE anchor, heavy anchors | 8.1-5.9 | 9-5 (17%) | 1794.2 | $84 / $60 |
| 21 | Elite QB anchor, even split | 8.1-5.9 | 9-5 (17.5%) | 1823.7 | $81 / $57 |
| 22 | Elite QB anchor, light anchors | 8-6 | 9-5 (16.5%) | 1783 | $79 / $65 |
| 23 | Balanced (no anchor) | 8-6 | 8-6 (16.3%) | 1780.3 | $75 / $61 |
| 24 | Triple WR, even split | 7.9-6.1 | 8-6 (18%) | 1805.8 | $82 / $58 |
| 25 | WR-WR, even split | 7.9-6.1 | 8-6 (18%) | 1805.8 | $82 / $58 |
| 26 | Elite TE anchor, light anchors | 7.3-6.7 | 8-6 (14.3%) | 1762.1 | $79 / $65 |

_Records above are graded with the measured risk model ON (real per-player
durability + tier bust/breakout from 15 seasons of Sleeper actuals)._

## Before/after: what the risk model did to each strategy

BEFORE grades every drafted player as if he plays all 14 games at his full
projection (the old basis that made "spend on two studs" look unbeatable).
AFTER applies the measured model. A bigger drop = a strategy the old grader
flattered because it never priced in that studs bust or miss time.

| # | Strategy | Before (healthy) | After (risk on) | Wins lost to risk |
|---|----------|------------------|-----------------|-------------------|
| 1 | Hero RB (RB + WR-WR), heavy anchors | 10.3-3.7 | 9.2-4.8 | -1.1 |
| 2 | RB-WR, heavy anchors | 10.2-3.8 | 9.1-4.9 | -1.1 |
| 3 | Robust RB (RB-RB), heavy anchors | 10.2-3.8 | 9-5 | -1.2 |
| 4 | Double RB + WR, heavy anchors | 10.2-3.8 | 8.9-5.1 | -1.3 |
| 5 | Triple WR, heavy anchors | 9.5-4.5 | 8.8-5.2 | -0.7 |
| 6 | WR-WR, heavy anchors | 9.5-4.5 | 8.8-5.2 | -0.7 |
| 7 | Robust RB (RB-RB), even split | 9.6-4.4 | 8.8-5.2 | -0.8 |
| 8 | Double RB + WR, even split | 9.6-4.4 | 8.8-5.2 | -0.8 |
| 9 | Hero RB (RB + WR-WR), light anchors | 9.8-4.2 | 8.8-5.2 | -1 |
| 10 | Double RB + WR, light anchors | 9.6-4.4 | 8.8-5.2 | -0.8 |
| 11 | RB-WR, light anchors | 9.6-4.4 | 8.7-5.3 | -0.9 |
| 12 | Robust RB (RB-RB), light anchors | 9.6-4.4 | 8.7-5.3 | -0.9 |
| 13 | Elite QB anchor, heavy anchors | 9.5-4.5 | 8.5-5.5 | -1 |
| 14 | RB-WR, even split | 9.4-4.6 | 8.4-5.6 | -1 |
| 15 | Hero RB (RB + WR-WR), even split | 9.6-4.4 | 8.4-5.6 | -1.2 |
| 16 | WR-WR, light anchors | 8.8-5.2 | 8.4-5.6 | -0.4 |
| 17 | Triple WR, light anchors | 8.8-5.2 | 8.4-5.6 | -0.4 |
| 18 | Zero RB (WR-WR-TE), light anchors | 8.8-5.2 | 8.4-5.6 | -0.4 |
| 19 | Elite TE anchor, even split | 8.5-5.5 | 8.3-5.7 | -0.2 |
| 20 | Elite TE anchor, heavy anchors | 8.3-5.7 | 8.1-5.9 | -0.2 |
| 21 | Elite QB anchor, even split | 8.8-5.2 | 8.1-5.9 | -0.7 |
| 22 | Elite QB anchor, light anchors | 8.2-5.8 | 8-6 | -0.2 |
| 23 | Balanced (no anchor) | 8.2-5.8 | 8-6 | -0.2 |
| 24 | Triple WR, even split | 8.5-5.5 | 7.9-6.1 | -0.6 |
| 25 | WR-WR, even split | 8.5-5.5 | 7.9-6.1 | -0.6 |
| 26 | Elite TE anchor, light anchors | 7.9-6.1 | 7.3-6.7 | -0.6 |

Healthy-basis winner: **Hero RB (RB + WR-WR), heavy anchors** (10.3 wins).
Risk-adjusted winner: **Hero RB (RB + WR-WR), heavy anchors** (9.2 wins).
The top strategy is unchanged once risk is priced in.

### 1. Hero RB (RB + WR-WR), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 9.2-4.8 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $183 on anchors and keeps $17 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 33%, TE 6%, DST 3%, K 0%, bench 7%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $171 + reserve $8 = $179 of $200 (completable).

  Most common roster cores this strategy landed:
  - 59.5% of drafts: Jahmyr Gibbs + Amon-Ra St. Brown - avg spend $200, avg record 9.4-4.6.
  - 0.3% of drafts: Jahmyr Gibbs + Emeka Egbuka + George Kittle + Jayden Daniels + Travis Etienne Jr. + Cam Skattebo - avg spend $200, avg record 9-5.
  - 0.3% of drafts: Kyren Williams + Jahmyr Gibbs + Emeka Egbuka + Jaylen Waddle + Jalen Hurts + Travis Etienne Jr. - avg spend $200, avg record 12-2.

  Players you land most:
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 70.8% of drafts, avg $1.
  - Amon-Ra St. Brown (WR): 66% of drafts, avg $85.
  - TreVeyon Henderson (RB): 53.8% of drafts, avg $1.
  - Tee Higgins (WR): 51.8% of drafts, avg $1.
  - DJ Moore (WR): 50.5% of drafts, avg $1.
  - Denver Broncos (DEF): 50.2% of drafts, avg $1.
  - D'Andre Swift (RB): 46.5% of drafts, avg $5.

### 2. RB-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/DEF/TE), rest at room price.

- Projected record: 9.1-4.9 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $190 on anchors and keeps $10 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 39%, TE 3%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $179 + reserve $8 = $187 of $200 (completable).

  Most common roster cores this strategy landed:
  - 39.3% of drafts: Jahmyr Gibbs + Luther Burden III + Amon-Ra St. Brown - avg spend $200, avg record 9.3-4.7.
  - 20.5% of drafts: Jahmyr Gibbs + Amon-Ra St. Brown - avg spend $200, avg record 9.3-4.7.
  - 0.5% of drafts: Jahmyr Gibbs + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins - avg spend $200, avg record 11-3.

  Players you land most:
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Luther Burden III (WR): 79.3% of drafts, avg $16.
  - Houston Texans (DEF): 70.8% of drafts, avg $1.
  - Amon-Ra St. Brown (WR): 66% of drafts, avg $85.
  - Tee Higgins (WR): 59% of drafts, avg $1.
  - TreVeyon Henderson (RB): 56.5% of drafts, avg $1.
  - Zach Charbonnet (RB): 49.8% of drafts, avg $1.
  - Denver Broncos (DEF): 46.8% of drafts, avg $1.

### 3. Robust RB (RB-RB), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/DEF/TE), rest at room price.

- Projected record: 9-5 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $194 on anchors and keeps $6 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 14%, TE 3%, DST 3%, K 0%, bench 1%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Davante Adams $12 (room $13, 0.94x durability) (win by $13).
  Targets $175 + reserve $8 = $183 of $200 (completable).

  Most common roster cores this strategy landed:
  - 32.5% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.3-4.7.
  - 13.5% of drafts: Jahmyr Gibbs + Christian McCaffrey - avg spend $200, avg record 9.4-4.6.
  - 1% of drafts: Jahmyr Gibbs + Davante Adams + Christian McCaffrey - avg spend $200, avg record 7.5-6.5.

  Players you land most:
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Luther Burden III (WR): 83.3% of drafts, avg $17.
  - Houston Texans (DEF): 65.5% of drafts, avg $1.
  - Christian McCaffrey (RB): 51.5% of drafts, avg $84.
  - TreVeyon Henderson (RB): 47.8% of drafts, avg $1.
  - Tee Higgins (WR): 47.5% of drafts, avg $1.
  - Denver Broncos (DEF): 47% of drafts, avg $1.
  - Zach Charbonnet (RB): 44.5% of drafts, avg $1.

### 4. Double RB + WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.9-5.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $188 on anchors and keeps $12 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 8%, TE 6%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $169 + reserve $8 = $177 of $200 (completable).

  Most common roster cores this strategy landed:
  - 32.8% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 9.3-4.7.
  - 14.3% of drafts: Jahmyr Gibbs + Christian McCaffrey - avg spend $200, avg record 9.2-4.8.
  - 0.5% of drafts: Jahmyr Gibbs + Kenneth Walker III + Luther Burden III + Travis Etienne Jr. - avg spend $195, avg record 8-6.

  Players you land most:
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Luther Burden III (WR): 83.3% of drafts, avg $17.
  - Houston Texans (DEF): 66.5% of drafts, avg $1.
  - Christian McCaffrey (RB): 51.5% of drafts, avg $84.
  - TreVeyon Henderson (RB): 49.8% of drafts, avg $1.
  - Tee Higgins (WR): 49.5% of drafts, avg $1.
  - Denver Broncos (DEF): 46% of drafts, avg $1.
  - Tony Pollard (RB): 43.8% of drafts, avg $1.

### 5. Triple WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $192 on anchors and keeps $8 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 71%, TE 2%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Amon-Ra St. Brown $64 (win by $70), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 26.8% of drafts: Puka Nacua + Amon-Ra St. Brown - avg spend $200, avg record 9.5-4.5.
  - 0.3% of drafts: Puka Nacua + Emeka Egbuka + Jayden Daniels + Travis Etienne Jr. + Nico Collins - avg spend $200, avg record 11-3.
  - 0.3% of drafts: Javonte Williams + Puka Nacua + Kyren Williams + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Travis Etienne Jr. + George Pickens - avg spend $200, avg record 7-7.

  Players you land most:
  - Houston Texans (DEF): 67.8% of drafts, avg $1.
  - Amon-Ra St. Brown (WR): 65.5% of drafts, avg $85.
  - D'Andre Swift (RB): 56.8% of drafts, avg $6.
  - Denver Broncos (DEF): 43.8% of drafts, avg $1.
  - Harold Fannin Jr. (TE): 42.5% of drafts, avg $15.
  - Ladd McConkey (WR): 41.5% of drafts, avg $8.
  - Puka Nacua (WR): 41% of drafts, avg $88.
  - Kyren Williams (RB): 40.8% of drafts, avg $16.

### 6. WR-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $192 on anchors and keeps $8 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 70%, TE 3%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Amon-Ra St. Brown $64 (win by $70), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 26.8% of drafts: Puka Nacua + Amon-Ra St. Brown - avg spend $200, avg record 9.5-4.5.
  - 0.3% of drafts: Puka Nacua + Emeka Egbuka + Jayden Daniels + Travis Etienne Jr. + Nico Collins - avg spend $200, avg record 11-3.
  - 0.3% of drafts: Javonte Williams + Puka Nacua + Kyren Williams + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Travis Etienne Jr. + George Pickens - avg spend $200, avg record 7-7.

  Players you land most:
  - Houston Texans (DEF): 67.8% of drafts, avg $1.
  - Amon-Ra St. Brown (WR): 65.5% of drafts, avg $85.
  - D'Andre Swift (RB): 56.8% of drafts, avg $6.
  - Denver Broncos (DEF): 43.8% of drafts, avg $1.
  - Harold Fannin Jr. (TE): 42.5% of drafts, avg $15.
  - Ladd McConkey (WR): 41.5% of drafts, avg $8.
  - Puka Nacua (WR): 41% of drafts, avg $88.
  - Kyren Williams (RB): 40.8% of drafts, avg $16.

### 7. Robust RB (RB-RB), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$29), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $165 on anchors and keeps $35 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 53%, WR 15%, TE 6%, DST 3%, K 0%, bench 16%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $29 (win by $32), Emeka Egbuka $16 (win by $18), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14).
  Targets $148 + reserve $8 = $156 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Jahmyr Gibbs + Emeka Egbuka + Davante Adams + Luther Burden III + Nico Collins + George Pickens - avg spend $200, avg record 7.3-6.7.
  - 0.5% of drafts: Jahmyr Gibbs + Davante Adams + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins + George Pickens - avg spend $200, avg record 9.5-4.5.
  - 0.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jaylen Waddle + Jayden Daniels + Luther Burden III + Travis Etienne Jr. - avg spend $200, avg record 9.5-4.5.

  Players you land most:
  - Luther Burden III (WR): 96.3% of drafts, avg $17.
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 67.3% of drafts, avg $1.
  - George Pickens (WR): 53.3% of drafts, avg $13.
  - Javonte Williams (RB): 49.8% of drafts, avg $13.
  - Ladd McConkey (WR): 45.5% of drafts, avg $8.
  - Jaylen Waddle (WR): 45% of drafts, avg $9.
  - Tyler Warren (TE): 44.8% of drafts, avg $11.

### 8. Double RB + WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$29), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $150 on anchors and keeps $50 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 53%, WR 8%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $29 (win by $32), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $138 + reserve $8 = $146 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Jahmyr Gibbs + Davante Adams + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins + George Pickens - avg spend $200, avg record 9.5-4.5.
  - 0.5% of drafts: Jahmyr Gibbs + Kenneth Walker III + Luther Burden III + Travis Etienne Jr. - avg spend $195, avg record 8-6.
  - 0.5% of drafts: Kyren Williams + Jahmyr Gibbs + George Kittle + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins - avg spend $200, avg record 9.5-4.5.

  Players you land most:
  - Luther Burden III (WR): 96.3% of drafts, avg $17.
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 67.8% of drafts, avg $1.
  - George Pickens (WR): 56% of drafts, avg $13.
  - Javonte Williams (RB): 50.5% of drafts, avg $13.
  - Tyler Warren (TE): 47% of drafts, avg $11.
  - Jaylen Waddle (WR): 46.3% of drafts, avg $9.
  - George Kittle (TE): 44.5% of drafts, avg $10.

### 9. Hero RB (RB + WR-WR), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/QB/TE/WR/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jalen Hurts (~$13), Quinshon Judkins (~$12). RB runs COOL (0.84x room vs national). This shape spends $125 on anchors and keeps $75 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 4%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7), Carnell Tate $6 (win by $7).
  Targets $113 + reserve $8 = $121 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Jahmyr Gibbs + Davante Adams + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins + George Pickens - avg spend $200, avg record 9.5-4.5.
  - 0.5% of drafts: Jahmyr Gibbs + Harold Fannin Jr. + Kenneth Walker III + Travis Etienne Jr. - avg spend $195, avg record 9-5.
  - 0.5% of drafts: Javonte Williams + Kyren Williams + Jahmyr Gibbs + Davante Adams + Travis Etienne Jr. + Nico Collins + George Pickens - avg spend $200, avg record 8-6.

  Players you land most:
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 67.5% of drafts, avg $1.
  - George Pickens (WR): 57% of drafts, avg $14.
  - Javonte Williams (RB): 55% of drafts, avg $13.
  - Kyren Williams (RB): 51.8% of drafts, avg $16.
  - Harold Fannin Jr. (TE): 50.2% of drafts, avg $15.
  - Tyler Warren (TE): 50% of drafts, avg $11.
  - Davante Adams (WR): 49% of drafts, avg $17.

### 10. Double RB + WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.8-5.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Luther Burden III (~$14), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $128 on anchors and keeps $72 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 42%, WR 8%, TE 6%, DST 3%, K 0%, bench 34%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Rhamondre Stevenson $7 (win by $8), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $116 + reserve $8 = $124 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Jahmyr Gibbs + Davante Adams + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins + George Pickens - avg spend $200, avg record 9.5-4.5.
  - 0.5% of drafts: Jahmyr Gibbs + Kenneth Walker III + Luther Burden III + Travis Etienne Jr. - avg spend $195, avg record 8-6.
  - 0.5% of drafts: Kyren Williams + Jahmyr Gibbs + George Kittle + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins - avg spend $200, avg record 9.5-4.5.

  Players you land most:
  - Luther Burden III (WR): 96.3% of drafts, avg $17.
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 68.3% of drafts, avg $1.
  - George Pickens (WR): 56% of drafts, avg $13.
  - Javonte Williams (RB): 50.5% of drafts, avg $13.
  - Tyler Warren (TE): 47% of drafts, avg $11.
  - Jaylen Waddle (WR): 46.3% of drafts, avg $9.
  - George Kittle (TE): 44.5% of drafts, avg $10.

### 11. RB-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Luther Burden III (~$14), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $138 on anchors and keeps $62 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 10%, TE 6%, DST 3%, K 0%, bench 30%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $121 + reserve $8 = $129 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Jahmyr Gibbs + Davante Adams + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins + George Pickens - avg spend $200, avg record 9.5-4.5.
  - 0.5% of drafts: Jahmyr Gibbs + Kenneth Walker III + Luther Burden III + Travis Etienne Jr. - avg spend $195, avg record 8-6.
  - 0.5% of drafts: Kyren Williams + Jahmyr Gibbs + George Kittle + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins - avg spend $200, avg record 9.5-4.5.

  Players you land most:
  - Luther Burden III (WR): 96.3% of drafts, avg $17.
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 67.8% of drafts, avg $1.
  - George Pickens (WR): 56.3% of drafts, avg $14.
  - Javonte Williams (RB): 50.2% of drafts, avg $13.
  - Tyler Warren (TE): 46.5% of drafts, avg $11.
  - Jaylen Waddle (WR): 46% of drafts, avg $9.
  - George Kittle (TE): 44.8% of drafts, avg $10.

### 12. Robust RB (RB-RB), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.7-5.3 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Emeka Egbuka (~$16), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $143 on anchors and keeps $57 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 42%, WR 15%, TE 6%, DST 3%, K 0%, bench 27%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Emeka Egbuka $16 (win by $18), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Rhamondre Stevenson $7 (win by $8).
  Targets $126 + reserve $8 = $134 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Jahmyr Gibbs + Emeka Egbuka + Davante Adams + Luther Burden III + Nico Collins + George Pickens - avg spend $200, avg record 7.3-6.7.
  - 0.5% of drafts: Jahmyr Gibbs + Davante Adams + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Nico Collins + George Pickens - avg spend $200, avg record 9.5-4.5.
  - 0.5% of drafts: Jahmyr Gibbs + Emeka Egbuka + Jaylen Waddle + Jayden Daniels + Luther Burden III + Travis Etienne Jr. - avg spend $200, avg record 9.5-4.5.

  Players you land most:
  - Luther Burden III (WR): 96.3% of drafts, avg $17.
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 68% of drafts, avg $1.
  - George Pickens (WR): 53.3% of drafts, avg $13.
  - Javonte Williams (RB): 49.8% of drafts, avg $13.
  - Ladd McConkey (WR): 45.5% of drafts, avg $8.
  - Jaylen Waddle (WR): 45% of drafts, avg $9.
  - Tyler Warren (TE): 44.8% of drafts, avg $11.

### 13. Elite QB anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.5-5.5 (best 14-0, worst 0-14).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Josh Allen (~$36), Zay Flowers (~$24). RB runs COOL (0.84x room vs national). This shape spends $179 on anchors and keeps $21 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 44%, WR 19%, TE 6%, DST 3%, K 0%, bench 10%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Josh Allen $36 (win by $40), Zay Flowers $24 (win by $26), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13).
  Targets $162 + reserve $8 = $170 of $200 (completable).

  Most common roster cores this strategy landed:
  - 39% of drafts: Josh Allen + Jahmyr Gibbs + Zay Flowers + Luther Burden III - avg spend $200, avg record 8.7-5.3.
  - 3.8% of drafts: Josh Allen + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 8.3-5.7.
  - 1% of drafts: Jahmyr Gibbs + Zay Flowers + Harold Fannin Jr. + Luther Burden III + Travis Etienne Jr. - avg spend $200, avg record 10-4.

  Players you land most:
  - Zay Flowers (WR): 95.3% of drafts, avg $29.
  - Luther Burden III (WR): 94.5% of drafts, avg $17.
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 68.8% of drafts, avg $1.
  - Josh Allen (QB): 48.5% of drafts, avg $51.
  - TreVeyon Henderson (RB): 45.8% of drafts, avg $1.
  - Tee Higgins (WR): 44.8% of drafts, avg $1.
  - Denver Broncos (DEF): 41.3% of drafts, avg $1.

### 14. RB-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.4-5.6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Zay Flowers (~$24), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $156 on anchors and keeps $44 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 19%, TE 6%, DST 3%, K 0%, bench 21%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Zay Flowers $24 (win by $26), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 1.5% of drafts: Jahmyr Gibbs + Zay Flowers + Luther Burden III + Travis Etienne Jr. - avg spend $199, avg record 10-4.
  - 1.5% of drafts: Javonte Williams + Kyren Williams + Jahmyr Gibbs + Zay Flowers + Luther Burden III + George Pickens - avg spend $200, avg record 10.3-3.7.
  - 1.5% of drafts: Jahmyr Gibbs + Zay Flowers + Luther Burden III - avg spend $200, avg record 9-5.

  Players you land most:
  - Luther Burden III (WR): 95.8% of drafts, avg $17.
  - Zay Flowers (WR): 95.3% of drafts, avg $29.
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 64.3% of drafts, avg $1.
  - George Kittle (TE): 49% of drafts, avg $9.
  - Javonte Williams (RB): 48.8% of drafts, avg $12.
  - George Pickens (WR): 46% of drafts, avg $13.
  - Ladd McConkey (WR): 45% of drafts, avg $8.

### 15. Hero RB (RB + WR-WR), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.4-5.6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Zay Flowers (~$24), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $151 on anchors and keeps $49 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 17%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Zay Flowers $24 (win by $26), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Rome Odunze $9 (win by $10).
  Targets $134 + reserve $8 = $142 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Jahmyr Gibbs + Zay Flowers + Travis Etienne Jr. - avg spend $199, avg record 11-3.
  - 0.8% of drafts: Kyren Williams + Jahmyr Gibbs + Zay Flowers + Tyler Warren + Harold Fannin Jr. + Travis Etienne Jr. + George Pickens - avg spend $200, avg record 5.3-8.7.
  - 0.8% of drafts: Jahmyr Gibbs + Zay Flowers + Tyler Warren + Harold Fannin Jr. + Travis Etienne Jr. + George Pickens - avg spend $200, avg record 10-4.

  Players you land most:
  - Zay Flowers (WR): 95.3% of drafts, avg $29.
  - Jahmyr Gibbs (RB): 92% of drafts, avg $87.
  - Houston Texans (DEF): 69.3% of drafts, avg $1.
  - Rome Odunze (WR): 64.8% of drafts, avg $8.
  - George Pickens (WR): 53.3% of drafts, avg $13.
  - Harold Fannin Jr. (TE): 50.2% of drafts, avg $14.
  - Javonte Williams (RB): 48% of drafts, avg $12.
  - Tyler Warren (TE): 48% of drafts, avg $11.

### 16. WR-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 8.4-5.6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), D'Andre Swift (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $140 on anchors and keeps $60 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 41%, TE 6%, DST 3%, K 0%, bench 29%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $112 + reserve $8 = $120 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Javonte Williams + Puka Nacua + Drake Maye + George Kittle + Harold Fannin Jr. + Travis Etienne Jr. + Ladd McConkey - avg spend $200, avg record 14-0.
  - 0.3% of drafts: Puka Nacua + Kyren Williams + George Kittle + Davante Adams + Jayden Daniels + Travis Etienne Jr. + George Pickens - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Javonte Williams + Puka Nacua + Rome Odunze + George Kittle + Tyler Warren + Jayden Daniels + Travis Etienne Jr. + Nico Collins + George Pickens - avg spend $200, avg record 13-1.

  Players you land most:
  - Houston Texans (DEF): 65% of drafts, avg $1.
  - George Pickens (WR): 54% of drafts, avg $15.
  - Davante Adams (WR): 52.3% of drafts, avg $18.
  - Javonte Williams (RB): 50.5% of drafts, avg $14.
  - Nico Collins (WR): 49.8% of drafts, avg $20.
  - Tyler Warren (TE): 48.8% of drafts, avg $12.
  - Kyren Williams (RB): 48.3% of drafts, avg $17.
  - Harold Fannin Jr. (TE): 48% of drafts, avg $15.

### 17. Triple WR, light anchors  (wr-heavy-auction, balanced risk)

Pool-generated WR Heavy (Auction): 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.4-5.6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), D'Andre Swift (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $134 on anchors and keeps $66 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, light anchors. Built from the live board: wr heavy shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 42%, TE 2%, DST 3%, K 0%, bench 32%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Carnell Tate $6 (win by $7).
  Targets $112 + reserve $8 = $120 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Javonte Williams + Puka Nacua + Drake Maye + George Kittle + Harold Fannin Jr. + Travis Etienne Jr. + Ladd McConkey - avg spend $200, avg record 14-0.
  - 0.3% of drafts: Puka Nacua + Kyren Williams + George Kittle + Davante Adams + Jayden Daniels + Travis Etienne Jr. + George Pickens - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Javonte Williams + Puka Nacua + Rome Odunze + George Kittle + Tyler Warren + Jayden Daniels + Travis Etienne Jr. + Nico Collins + George Pickens - avg spend $200, avg record 13-1.

  Players you land most:
  - Houston Texans (DEF): 65.8% of drafts, avg $1.
  - George Pickens (WR): 54% of drafts, avg $15.
  - Davante Adams (WR): 52.3% of drafts, avg $18.
  - Javonte Williams (RB): 50.5% of drafts, avg $14.
  - Nico Collins (WR): 49.8% of drafts, avg $20.
  - Tyler Warren (TE): 48.8% of drafts, avg $12.
  - Kyren Williams (RB): 48.3% of drafts, avg $17.
  - Harold Fannin Jr. (TE): 48% of drafts, avg $15.

### 18. Zero RB (WR-WR-TE), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 8.4-5.6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), D'Andre Swift (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $134 on anchors and keeps $66 to complete the roster at room prices.
- Philosophy: Pattern sweep: Zero RB (WR-WR-TE), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 41%, TE 3%, DST 3%, K 0%, bench 32%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Carnell Tate $6 (win by $7).
  Targets $112 + reserve $8 = $120 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Javonte Williams + Puka Nacua + Drake Maye + George Kittle + Harold Fannin Jr. + Travis Etienne Jr. + Ladd McConkey - avg spend $200, avg record 14-0.
  - 0.3% of drafts: Puka Nacua + Kyren Williams + George Kittle + Davante Adams + Jayden Daniels + Travis Etienne Jr. + George Pickens - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Javonte Williams + Puka Nacua + Rome Odunze + George Kittle + Tyler Warren + Jayden Daniels + Travis Etienne Jr. + Nico Collins + George Pickens - avg spend $200, avg record 13-1.

  Players you land most:
  - Houston Texans (DEF): 65.8% of drafts, avg $1.
  - George Pickens (WR): 54% of drafts, avg $15.
  - Davante Adams (WR): 52.3% of drafts, avg $18.
  - Javonte Williams (RB): 50.5% of drafts, avg $14.
  - Nico Collins (WR): 49.8% of drafts, avg $20.
  - Tyler Warren (TE): 48.8% of drafts, avg $12.
  - Kyren Williams (RB): 48.3% of drafts, avg $17.
  - Harold Fannin Jr. (TE): 48% of drafts, avg $15.

### 19. Elite TE anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 8.3-5.7 (best 14-0, worst 1-13).
- Why: The board supports paying up for Justin Jefferson (~$57), Brock Bowers (~$49), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $158 on anchors and keeps $42 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 29%, TE 27%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Justin Jefferson $53 (room $57, 0.94x durability) (win by $58), Brock Bowers $46 (room $49, 0.94x durability) (win by $51), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.8% of drafts: Justin Jefferson + Brock Bowers - avg spend $200, avg record 6-8.
  - 0.5% of drafts: Kyren Williams + Justin Jefferson + Tyler Warren + Brock Bowers - avg spend $200, avg record 7.5-6.5.
  - 0.5% of drafts: Justin Jefferson + Tyler Warren + Brock Bowers - avg spend $200, avg record 11.5-2.5.

  Players you land most:
  - Justin Jefferson (WR): 67.8% of drafts, avg $70.
  - Houston Texans (DEF): 63% of drafts, avg $1.
  - George Pickens (WR): 51% of drafts, avg $14.
  - Javonte Williams (RB): 48.3% of drafts, avg $13.
  - Tyler Warren (TE): 48.3% of drafts, avg $12.
  - Kyren Williams (RB): 48% of drafts, avg $16.
  - George Kittle (TE): 47.3% of drafts, avg $11.
  - Harold Fannin Jr. (TE): 46.5% of drafts, avg $15.

### 20. Elite TE anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 8.1-5.9 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Brock Bowers (~$49), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $190 on anchors and keeps $10 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 45%, TE 27%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Brock Bowers $46 (room $49, 0.94x durability) (win by $51), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14).
  Targets $154 + reserve $8 = $162 of $200 (completable).

  Most common roster cores this strategy landed:
  - 5.3% of drafts: Puka Nacua + Luther Burden III + Brock Bowers - avg spend $200, avg record 7.3-6.7.
  - 0.3% of drafts: Javonte Williams + Puka Nacua + Kyren Williams + George Kittle + Tyler Warren + Jayden Daniels + Harold Fannin Jr. + Luther Burden III + Travis Etienne Jr. + Nico Collins - avg spend $200, avg record 13-1.
  - 0.3% of drafts: Puka Nacua + Kyren Williams + Jaylen Waddle + Tyler Warren + Jayden Daniels + Travis Etienne Jr. + Nico Collins - avg spend $200, avg record 8-6.

  Players you land most:
  - Luther Burden III (WR): 96.8% of drafts, avg $17.
  - Houston Texans (DEF): 69% of drafts, avg $1.
  - George Pickens (WR): 45.5% of drafts, avg $14.
  - Tyler Warren (TE): 45% of drafts, avg $11.
  - Javonte Williams (RB): 44.8% of drafts, avg $13.
  - Ladd McConkey (WR): 42% of drafts, avg $8.
  - D'Andre Swift (RB): 41.8% of drafts, avg $6.
  - Puka Nacua (WR): 41.5% of drafts, avg $88.

### 21. Elite QB anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 8.1-5.9 (best 14-0, worst 1-13).
- Why: The board supports paying up for Christian McCaffrey (~$67), Josh Allen (~$36), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $152 on anchors and keeps $48 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 40%, WR 10%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Josh Allen $36 (win by $40), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $128 + reserve $8 = $136 of $200 (completable).

  Most common roster cores this strategy landed:
  - 4.3% of drafts: Josh Allen + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 8.6-5.4.
  - 2.5% of drafts: Josh Allen + Zay Flowers + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 6.8-7.2.
  - 1.8% of drafts: Josh Allen + Tyler Warren + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 6.7-7.3.

  Players you land most:
  - Luther Burden III (WR): 96.3% of drafts, avg $17.
  - Houston Texans (DEF): 69% of drafts, avg $1.
  - Christian McCaffrey (RB): 52.5% of drafts, avg $84.
  - Josh Allen (QB): 50.2% of drafts, avg $50.
  - Tyler Warren (TE): 46.5% of drafts, avg $11.
  - George Kittle (TE): 44% of drafts, avg $10.
  - Jaylen Waddle (WR): 44% of drafts, avg $9.
  - Ladd McConkey (WR): 43.8% of drafts, avg $8.

### 22. Elite QB anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 8-6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Saquon Barkley (~$42), Josh Allen (~$36), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $127 on anchors and keeps $73 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 27%, WR 10%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (durability-adjusted expect / walk-up to win): Saquon Barkley $39 (room $42, 0.94x durability) (win by $43), Josh Allen $36 (win by $40), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $107 + reserve $8 = $115 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Josh Allen + Harold Fannin Jr. + Kenneth Walker III + Luther Burden III + Travis Etienne Jr. + George Pickens + Cam Skattebo - avg spend $200, avg record 7-7.
  - 0.5% of drafts: Josh Allen + Davante Adams + Breece Hall + Kenneth Walker III + Luther Burden III + Nico Collins + George Pickens - avg spend $200, avg record 7-7.
  - 0.3% of drafts: George Kittle + Jayden Daniels + Omarion Hampton + Chris Olave + Luther Burden III + Travis Etienne Jr. + Nico Collins + Tetairoa McMillan - avg spend $200, avg record 13-1.

  Players you land most:
  - Luther Burden III (WR): 96.3% of drafts, avg $17.
  - Houston Texans (DEF): 65.5% of drafts, avg $1.
  - Josh Allen (QB): 50.5% of drafts, avg $50.
  - George Pickens (WR): 45% of drafts, avg $15.
  - George Kittle (TE): 45% of drafts, avg $10.
  - Tyler Warren (TE): 42.8% of drafts, avg $12.
  - Javonte Williams (RB): 42.5% of drafts, avg $14.
  - Kyren Williams (RB): 42% of drafts, avg $17.

### 23. Balanced (no anchor)  (balanced-auction, conservative risk)

Pool-generated Balanced Auction: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 8-6 (best 14-0, worst 0-14).
- Why: The board supports paying up for Emeka Egbuka (~$16), D'Andre Swift (~$16), Luther Burden III (~$14). WR runs HOT (1.18x room vs national). This shape spends $88 on anchors and keeps $112 to complete the roster at room prices.
- Philosophy: Pattern sweep: Balanced (no anchor). Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 15%, TE 6%, DST 3%, K 0%, bench 55%.
- Target prices (durability-adjusted expect / walk-up to win): Emeka Egbuka $16 (win by $18), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $70 + reserve $8 = $78 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Kyren Williams + Jaylen Waddle + Davante Adams + Tyler Warren + Breece Hall + Luther Burden III + Travis Etienne Jr. + Cam Skattebo + Tetairoa McMillan - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Javonte Williams + Bo Nix + Omarion Hampton + Kenneth Walker III + Luther Burden III + Travis Etienne Jr. + Nico Collins - avg spend $200, avg record 12-2.
  - 0.3% of drafts: Josh Jacobs + Tyler Warren + Jayden Daniels + Chris Olave + Kenneth Walker III + Luther Burden III + Travis Etienne Jr. + George Pickens - avg spend $200, avg record 12-2.

  Players you land most:
  - Luther Burden III (WR): 96.3% of drafts, avg $17.
  - Houston Texans (DEF): 64.8% of drafts, avg $1.
  - Nico Collins (WR): 48.3% of drafts, avg $21.
  - George Pickens (WR): 48.3% of drafts, avg $15.
  - Cam Skattebo (RB): 46.5% of drafts, avg $27.
  - Davante Adams (WR): 45.5% of drafts, avg $19.
  - Kyren Williams (RB): 45% of drafts, avg $18.
  - Harold Fannin Jr. (TE): 44% of drafts, avg $16.

### 24. Triple WR, even split  (wr-heavy-auction, aggressive risk)

Pool-generated WR Heavy (Auction): 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Zay Flowers (~$24), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $160 on anchors and keeps $40 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, even split. Built from the live board: wr heavy shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 55%, TE 2%, DST 3%, K 0%, bench 19%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Zay Flowers $24 (win by $26), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $130 + reserve $8 = $138 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Puka Nacua + Zay Flowers + Harold Fannin Jr. + George Pickens - avg spend $200, avg record 6.5-7.5.
  - 0.5% of drafts: Puka Nacua + Zay Flowers + Davante Adams + Jayden Daniels + Luther Burden III + George Pickens - avg spend $200, avg record 8.5-5.5.
  - 0.5% of drafts: Puka Nacua + George Kittle + Zay Flowers + Davante Adams + Tyler Warren + Jayden Daniels - avg spend $200, avg record 10-4.

  Players you land most:
  - Zay Flowers (WR): 93.8% of drafts, avg $29.
  - Houston Texans (DEF): 65.8% of drafts, avg $1.
  - George Pickens (WR): 50.2% of drafts, avg $14.
  - Javonte Williams (RB): 48.8% of drafts, avg $13.
  - Tyler Warren (TE): 46% of drafts, avg $12.
  - Kyren Williams (RB): 44.3% of drafts, avg $17.
  - D'Andre Swift (RB): 44.3% of drafts, avg $7.
  - Harold Fannin Jr. (TE): 44% of drafts, avg $15.

### 25. WR-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Zay Flowers (~$24), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $158 on anchors and keeps $42 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 50%, TE 6%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Zay Flowers $24 (win by $26), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $130 + reserve $8 = $138 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Puka Nacua + Zay Flowers + Harold Fannin Jr. + George Pickens - avg spend $200, avg record 6.5-7.5.
  - 0.5% of drafts: Puka Nacua + Zay Flowers + Davante Adams + Jayden Daniels + Luther Burden III + George Pickens - avg spend $200, avg record 8.5-5.5.
  - 0.5% of drafts: Puka Nacua + George Kittle + Zay Flowers + Davante Adams + Tyler Warren + Jayden Daniels - avg spend $200, avg record 10-4.

  Players you land most:
  - Zay Flowers (WR): 93.8% of drafts, avg $29.
  - Houston Texans (DEF): 65.8% of drafts, avg $1.
  - George Pickens (WR): 50.2% of drafts, avg $14.
  - Javonte Williams (RB): 48.8% of drafts, avg $13.
  - Tyler Warren (TE): 46% of drafts, avg $12.
  - Kyren Williams (RB): 44.3% of drafts, avg $17.
  - D'Andre Swift (RB): 44.3% of drafts, avg $7.
  - Harold Fannin Jr. (TE): 44% of drafts, avg $15.

### 26. Elite TE anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (TE/WR/RB/QB/DEF), rest at room price.

- Projected record: 7.3-6.7 (best 14-0, worst 0-14).
- Why: The board supports paying up for Brock Bowers (~$49), Zay Flowers (~$24), D'Andre Swift (~$16). TE runs HOT (1.17x room vs national). This shape spends $133 on anchors and keeps $67 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 17%, TE 27%, DST 3%, K 0%, bench 32%.
- Target prices (durability-adjusted expect / walk-up to win): Brock Bowers $46 (room $49, 0.94x durability) (win by $51), Zay Flowers $24 (win by $26), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $110 + reserve $8 = $118 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: DeVonta Smith + Tyler Warren + Jayden Daniels + Chris Olave + Harold Fannin Jr. + Travis Etienne Jr. + George Pickens + Cam Skattebo - avg spend $200, avg record 10-4.
  - 0.3% of drafts: Emeka Egbuka + George Kittle + Jayden Daniels + Omarion Hampton + Harold Fannin Jr. + Nico Collins + Cam Skattebo + Tetairoa McMillan - avg spend $200, avg record 7-7.
  - 0.3% of drafts: Javonte Williams + Zay Flowers + Bo Nix + Davante Adams + Chris Olave + Travis Etienne Jr. + Cam Skattebo - avg spend $200, avg record 8-6.

  Players you land most:
  - Zay Flowers (WR): 95.3% of drafts, avg $29.
  - Houston Texans (DEF): 65.5% of drafts, avg $1.
  - George Pickens (WR): 54.5% of drafts, avg $15.
  - Davante Adams (WR): 50.2% of drafts, avg $18.
  - Kyren Williams (RB): 50% of drafts, avg $17.
  - Tyler Warren (TE): 48% of drafts, avg $12.
  - Harold Fannin Jr. (TE): 46.5% of drafts, avg $15.
  - Nico Collins (WR): 45.5% of drafts, avg $20.

## Specific stud combos (which exact players to target)

The strategy leaderboard above says which SHAPE wins. This tier says which
exact studs to buy inside each shape. Every combo is a completable $200
roster (the named anchors forced in, the rest filled at room price) graded
with the risk model on. Grouped by pattern, best projected record first.

### Top combos overall

| # | Anchors | Pattern | Proj record | Mean starter pts |
|---|---------|---------|-------------|------------------|
| 1 | Jahmyr Gibbs + Puka Nacua | RB-WR | 9.2-4.8 | 1925.2 |
| 2 | Jahmyr Gibbs + Jaxon Smith-Njigba | RB-WR | 9.2-4.8 | 1942.5 |
| 3 | Josh Allen + Jahmyr Gibbs + Puka Nacua | Elite QB anchor | 9.2-4.8 | 1926.6 |
| 4 | Jahmyr Gibbs + Bijan Robinson | Robust RB (RB-RB) | 9.1-4.9 | 1952.9 |
| 5 | Jahmyr Gibbs + Amon-Ra St. Brown | RB-WR | 9.1-4.9 | 1922.7 |
| 6 | Jaxon Smith-Njigba + Amon-Ra St. Brown + Brock Bowers | Zero RB (WR-WR-TE) | 9.1-4.9 | 1877.2 |
| 7 | Jahmyr Gibbs + Christian McCaffrey | Robust RB (RB-RB) | 9-5 | 1923.8 |
| 8 | Drake Maye + Jahmyr Gibbs + Puka Nacua | Elite QB anchor | 9-5 | 1911.6 |
| 9 | Christian McCaffrey + Bijan Robinson | Robust RB (RB-RB) | 8.9-5.1 | 1899.1 |
| 10 | Puka Nacua + Jaxon Smith-Njigba | WR-WR | 8.9-5.1 | 1880.9 |
| 11 | Puka Nacua + Jaxon Smith-Njigba + Trey McBride | Zero RB (WR-WR-TE) | 8.9-5.1 | 1881.8 |
| 12 | Trey McBride + Puka Nacua + Ja'Marr Chase | Elite TE anchor | 8.9-5.1 | 1883.2 |

### Robust RB (RB-RB)

- **Jahmyr Gibbs + Bijan Robinson**: 9.1-4.9, 1952.9 starter pts - target Jahmyr Gibbs $76, Bijan Robinson $70.
- **Jahmyr Gibbs + Christian McCaffrey**: 9-5, 1923.8 starter pts - target Jahmyr Gibbs $76, Christian McCaffrey $60.
- **Christian McCaffrey + Bijan Robinson**: 8.9-5.1, 1899.1 starter pts - target Bijan Robinson $70, Christian McCaffrey $60.

### WR-WR

- **Puka Nacua + Jaxon Smith-Njigba**: 8.9-5.1, 1880.9 starter pts - target Puka Nacua $66, Jaxon Smith-Njigba $72.
- **Puka Nacua + Amon-Ra St. Brown**: 8.8-5.2, 1866.6 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64.
- **Puka Nacua + Ja'Marr Chase**: 8.8-5.2, 1878.5 starter pts - target Ja'Marr Chase $75, Puka Nacua $66.

### RB-WR

- **Jahmyr Gibbs + Puka Nacua**: 9.2-4.8, 1925.2 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66.
- **Jahmyr Gibbs + Jaxon Smith-Njigba**: 9.2-4.8, 1942.5 starter pts - target Jahmyr Gibbs $76, Jaxon Smith-Njigba $72.
- **Jahmyr Gibbs + Amon-Ra St. Brown**: 9.1-4.9, 1922.7 starter pts - target Jahmyr Gibbs $76, Amon-Ra St. Brown $64.

### Zero RB (WR-WR-TE)

- **Jaxon Smith-Njigba + Amon-Ra St. Brown + Brock Bowers**: 9.1-4.9, 1877.2 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Brock Bowers $46.
- **Puka Nacua + Jaxon Smith-Njigba + Trey McBride**: 8.9-5.1, 1881.8 starter pts - target Puka Nacua $66, Jaxon Smith-Njigba $72, Trey McBride $35.
- **Puka Nacua + Amon-Ra St. Brown + Brock Bowers**: 8.6-5.4, 1857.9 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64, Brock Bowers $46.

### Elite QB anchor

- **Josh Allen + Jahmyr Gibbs + Puka Nacua**: 9.2-4.8, 1926.6 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Josh Allen $36.
- **Drake Maye + Jahmyr Gibbs + Puka Nacua**: 9-5, 1911.6 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Drake Maye $25.
- **Lamar Jackson + Jahmyr Gibbs + Puka Nacua**: 8.5-5.5, 1857 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Lamar Jackson $32.

### Elite TE anchor

- **Trey McBride + Puka Nacua + Ja'Marr Chase**: 8.9-5.1, 1883.2 starter pts - target Ja'Marr Chase $75, Puka Nacua $66, Trey McBride $35.
- **Trey McBride + Jaxon Smith-Njigba + Amon-Ra St. Brown**: 8.9-5.1, 1882.2 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Trey McBride $35.
- **Trey McBride + Puka Nacua + Amon-Ra St. Brown**: 8.8-5.2, 1867.4 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64, Trey McBride $35.

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
- **Jayden Daniels** (WAS, bye 7) - $15-$26 (base $21) league band, land odds 6.3%.
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
- **Harold Fannin Jr.** (CLE, bye 11) - $24-$27 (base $26) league band, land odds 0%.
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
- **Rico Dowdle** (RB, PIT) - Let him go - room pays ~$5 over his ~$1 worth here.

---

Full machine-readable data (every player, every strategy sim, league intel) is in `dataset.json`.
