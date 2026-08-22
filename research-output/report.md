# The Nasties - Draft Research Dataset

Generated 2026-08-22T15:31:16.765Z. 12-team, $200 auction, full PPR, no kicker.
Roster: QB1, RB1, WR1, TE1, FLEX3, DEF1, Bench5.
Players: 978. Cache last updated 2026-08-20T01:00:27.018+00:00 (stale=true).
Sims: 400 Monte-Carlo runs per strategy, 14-game season, seed 42.

## Strategy leaderboard (which approach wins, and why)

| # | Strategy | Proj record | Modal record | Mean starter pts | Ceiling / Floor |
|---|----------|-------------|--------------|------------------|-----------------|
| 1 | RB-WR, even split | 8.2-5.8 | 9-5 (16%) | 1910.2 | $84 / $60 |
| 2 | Hero RB (RB + WR-WR), even split | 8.2-5.8 | 10-4 (14.3%) | 1917 | $83 / $59 |
| 3 | Double RB + WR, even split | 8.2-5.8 | 9-5 (15.5%) | 1909.4 | $83 / $59 |
| 4 | RB-WR, light anchors | 8.2-5.8 | 8-6 (16.5%) | 1909.7 | $82 / $68 |
| 5 | Robust RB (RB-RB), light anchors | 8.2-5.8 | 10-4 (14.8%) | 1909.7 | $81 / $67 |
| 6 | Double RB + WR, light anchors | 8.2-5.8 | 9-5 (15.5%) | 1911.1 | $80 / $66 |
| 7 | Robust RB (RB-RB), heavy anchors | 8.1-5.9 | 8-6 (15.8%) | 1930.8 | $86 / $62 |
| 8 | RB-WR, heavy anchors | 8.1-5.9 | 9-5 (14.5%) | 1923.2 | $86 / $62 |
| 9 | Double RB + WR, heavy anchors | 8.1-5.9 | 10-4 (14.8%) | 1930.6 | $86 / $62 |
| 10 | Hero RB (RB + WR-WR), heavy anchors | 8.1-5.9 | 8-6 (14%) | 1934.1 | $86 / $62 |
| 11 | Elite TE anchor, heavy anchors | 8.1-5.9 | 8-6 (16.5%) | 1857.6 | $84 / $60 |
| 12 | Robust RB (RB-RB), even split | 8.1-5.9 | 9-5 (15.3%) | 1908.1 | $83 / $59 |
| 13 | Hero RB (RB + WR-WR), light anchors | 8.1-5.9 | 8-6 (14.8%) | 1917.6 | $81 / $67 |
| 14 | Elite QB anchor, heavy anchors | 8-6 | 9-5 (17.3%) | 1909 | $84 / $60 |
| 15 | Elite TE anchor, even split | 8-6 | 8-6 (15.8%) | 1842.5 | $81 / $57 |
| 16 | Triple WR, heavy anchors | 7.9-6.1 | 8-6 (16.3%) | 1887.8 | $85 / $61 |
| 17 | WR-WR, heavy anchors | 7.9-6.1 | 8-6 (16.3%) | 1887.8 | $85 / $61 |
| 18 | Triple WR, even split | 7.9-6.1 | 9-5 (15.5%) | 1864.3 | $82 / $58 |
| 19 | WR-WR, even split | 7.9-6.1 | 9-5 (15.5%) | 1864.3 | $82 / $58 |
| 20 | WR-WR, light anchors | 7.9-6.1 | 8-6 (15.3%) | 1867.6 | $80 / $66 |
| 21 | Triple WR, light anchors | 7.9-6.1 | 8-6 (15.5%) | 1868.2 | $80 / $66 |
| 22 | Zero RB (WR-WR-TE), light anchors | 7.9-6.1 | 8-6 (15.5%) | 1868.2 | $80 / $66 |
| 23 | Balanced (no anchor) | 7.9-6.1 | 9-5 (16%) | 1833.5 | $75 / $61 |
| 24 | Elite QB anchor, even split | 7.8-6.2 | 9-5 (15.5%) | 1863.5 | $81 / $57 |
| 25 | Elite TE anchor, light anchors | 7.8-6.2 | 9-5 (15.3%) | 1836.3 | $79 / $65 |
| 26 | Elite QB anchor, light anchors | 7.8-6.2 | 9-5 (16.3%) | 1832.9 | $79 / $65 |

_Records above are graded with the measured risk model ON (real per-player
durability + tier bust/breakout from 15 seasons of Sleeper actuals)._

## Before/after: what the risk model did to each strategy

BEFORE grades every drafted player as if he plays all 14 games at his full
projection (the old basis that made "spend on two studs" look unbeatable).
AFTER applies the measured model. A bigger drop = a strategy the old grader
flattered because it never priced in that studs bust or miss time.

| # | Strategy | Before (healthy) | After (risk on) | Wins lost to risk |
|---|----------|------------------|-----------------|-------------------|
| 1 | RB-WR, even split | 8.8-5.2 | 8.2-5.8 | -0.6 |
| 2 | Hero RB (RB + WR-WR), even split | 8.9-5.1 | 8.2-5.8 | -0.7 |
| 3 | Double RB + WR, even split | 8.7-5.3 | 8.2-5.8 | -0.5 |
| 4 | RB-WR, light anchors | 8.7-5.3 | 8.2-5.8 | -0.5 |
| 5 | Robust RB (RB-RB), light anchors | 8.7-5.3 | 8.2-5.8 | -0.5 |
| 6 | Double RB + WR, light anchors | 8.7-5.3 | 8.2-5.8 | -0.5 |
| 7 | Robust RB (RB-RB), heavy anchors | 9.1-4.9 | 8.1-5.9 | -1 |
| 8 | RB-WR, heavy anchors | 9-5 | 8.1-5.9 | -0.9 |
| 9 | Double RB + WR, heavy anchors | 9.1-4.9 | 8.1-5.9 | -1 |
| 10 | Hero RB (RB + WR-WR), heavy anchors | 9.1-4.9 | 8.1-5.9 | -1 |
| 11 | Elite TE anchor, heavy anchors | 8-6 | 8.1-5.9 | +0.1 |
| 12 | Robust RB (RB-RB), even split | 8.7-5.3 | 8.1-5.9 | -0.6 |
| 13 | Hero RB (RB + WR-WR), light anchors | 8.9-5.1 | 8.1-5.9 | -0.8 |
| 14 | Elite QB anchor, heavy anchors | 8.7-5.3 | 8-6 | -0.7 |
| 15 | Elite TE anchor, even split | 7.8-6.2 | 8-6 | +0.2 |
| 16 | Triple WR, heavy anchors | 8.5-5.5 | 7.9-6.1 | -0.6 |
| 17 | WR-WR, heavy anchors | 8.5-5.5 | 7.9-6.1 | -0.6 |
| 18 | Triple WR, even split | 8.2-5.8 | 7.9-6.1 | -0.3 |
| 19 | WR-WR, even split | 8.2-5.8 | 7.9-6.1 | -0.3 |
| 20 | WR-WR, light anchors | 8.2-5.8 | 7.9-6.1 | -0.3 |
| 21 | Triple WR, light anchors | 8.2-5.8 | 7.9-6.1 | -0.3 |
| 22 | Zero RB (WR-WR-TE), light anchors | 8.2-5.8 | 7.9-6.1 | -0.3 |
| 23 | Balanced (no anchor) | 7.7-6.3 | 7.9-6.1 | +0.2 |
| 24 | Elite QB anchor, even split | 8.1-5.9 | 7.8-6.2 | -0.3 |
| 25 | Elite TE anchor, light anchors | 7.7-6.3 | 7.8-6.2 | +0.1 |
| 26 | Elite QB anchor, light anchors | 7.6-6.4 | 7.8-6.2 | +0.2 |

Healthy-basis winner: **Robust RB (RB-RB), heavy anchors** (9.1 wins).
Risk-adjusted winner: **RB-WR, even split** (8.2 wins).
The top strategy CHANGES once risk is priced in: "Robust RB (RB-RB), heavy anchors" no longer leads.

### 1. RB-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.2-5.8 (best 14-0, worst 0-14).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Zay Flowers (~$24), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $156 on anchors and keeps $44 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 19%, TE 6%, DST 3%, K 0%, bench 21%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Zay Flowers $24 (win by $26), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Jahmyr Gibbs + Zay Flowers + Bo Nix + Luther Burden III - avg spend $199, avg record 9-5.
  - 0.5% of drafts: Jahmyr Gibbs + Zay Flowers + Luther Burden III + Travis Etienne Jr. + Cam Skattebo - avg spend $199, avg record 9-5.
  - 0.3% of drafts: Jahmyr Gibbs + Colston Loveland + Drake Maye + Zay Flowers + Travis Etienne Jr. + Derrick Henry + Cam Skattebo - avg spend $197, avg record 11-3.

  Players you land most:
  - Zay Flowers (WR): 95.8% of drafts, avg $28.
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 80.8% of drafts, avg $15.
  - Michael Pittman Jr. (WR): 35% of drafts, avg $1.
  - Josh Downs (WR): 26% of drafts, avg $1.
  - Travis Etienne Jr. (RB): 23.3% of drafts, avg $14.
  - Los Angeles Rams (DEF): 22.5% of drafts, avg $1.
  - Alec Pierce (WR): 21.8% of drafts, avg $1.

### 2. Hero RB (RB + WR-WR), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.2-5.8 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Zay Flowers (~$24), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $151 on anchors and keeps $49 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 17%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Zay Flowers $24 (win by $26), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Rome Odunze $9 (win by $10).
  Targets $134 + reserve $8 = $142 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Jahmyr Gibbs + Zay Flowers - avg spend $190, avg record 9-5.
  - 0.5% of drafts: Kyren Williams + Jahmyr Gibbs + Emeka Egbuka + Zay Flowers + Kenneth Walker III + Travis Etienne Jr. - avg spend $199, avg record 8.5-5.5.
  - 0.5% of drafts: Jahmyr Gibbs + Zay Flowers + Tony Pollard + Kenneth Walker III + Luther Burden III - avg spend $199, avg record 11-3.

  Players you land most:
  - Zay Flowers (WR): 96% of drafts, avg $28.
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Michael Pittman Jr. (WR): 34.5% of drafts, avg $1.
  - Luther Burden III (WR): 31.5% of drafts, avg $13.
  - Travis Etienne Jr. (RB): 25.8% of drafts, avg $14.
  - Josh Downs (WR): 25.8% of drafts, avg $1.
  - Kenneth Walker III (RB): 23.5% of drafts, avg $17.
  - Colston Loveland (TE): 23.5% of drafts, avg $14.

### 3. Double RB + WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.2-5.8 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$29), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $150 on anchors and keeps $50 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 53%, WR 8%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $29 (win by $32), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $138 + reserve $8 = $146 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: DeVonta Smith + Jahmyr Gibbs + Colston Loveland + Josh Jacobs + Chris Olave + Jalen Hurts - avg spend $200, avg record 8-6.
  - 0.3% of drafts: DeVonta Smith + Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Malik Nabers + Garrett Wilson - avg spend $200, avg record 5-9.
  - 0.3% of drafts: Jahmyr Gibbs + Bo Nix + Breece Hall + Luther Burden III + Travis Etienne Jr. + Drake London - avg spend $200, avg record 9-5.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 80.5% of drafts, avg $15.
  - Michael Pittman Jr. (WR): 34.5% of drafts, avg $1.
  - Colston Loveland (TE): 27.5% of drafts, avg $16.
  - Kenneth Walker III (RB): 26.3% of drafts, avg $18.
  - Travis Etienne Jr. (RB): 25.8% of drafts, avg $15.
  - Josh Downs (WR): 25.8% of drafts, avg $1.
  - Cam Skattebo (RB): 24.3% of drafts, avg $16.

### 4. RB-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.2-5.8 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Luther Burden III (~$14), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $138 on anchors and keeps $62 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 10%, TE 6%, DST 3%, K 0%, bench 30%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $121 + reserve $8 = $129 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Jahmyr Gibbs + Bo Nix + Breece Hall + Luther Burden III + Travis Etienne Jr. + Drake London - avg spend $200, avg record 9-5.
  - 0.3% of drafts: TreVeyon Henderson + Jahmyr Gibbs + Colston Loveland + Bo Nix + Breece Hall + Garrett Wilson - avg spend $200, avg record 5-9.
  - 0.3% of drafts: DeVonta Smith + Kyren Williams + Jahmyr Gibbs + Colston Loveland + Breece Hall + Luther Burden III + Garrett Wilson + Tetairoa McMillan - avg spend $195, avg record 6-8.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 80.5% of drafts, avg $15.
  - Michael Pittman Jr. (WR): 34.8% of drafts, avg $1.
  - Kenneth Walker III (RB): 27.5% of drafts, avg $18.
  - Travis Etienne Jr. (RB): 27.5% of drafts, avg $15.
  - Colston Loveland (TE): 27% of drafts, avg $16.
  - Josh Downs (WR): 26% of drafts, avg $1.
  - Cam Skattebo (RB): 24.8% of drafts, avg $16.

### 5. Robust RB (RB-RB), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.2-5.8 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Emeka Egbuka (~$16), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $143 on anchors and keeps $57 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 42%, WR 15%, TE 6%, DST 3%, K 0%, bench 27%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Emeka Egbuka $16 (win by $18), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Rhamondre Stevenson $7 (win by $8).
  Targets $126 + reserve $8 = $134 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: DeVonta Smith + Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Malik Nabers + Garrett Wilson - avg spend $200, avg record 5-9.
  - 0.3% of drafts: Jahmyr Gibbs + Emeka Egbuka + Drake Maye + Zay Flowers + Chris Olave + Luther Burden III + Derrick Henry + Carnell Tate - avg spend $200, avg record 11-3.
  - 0.3% of drafts: Jahmyr Gibbs + Bo Nix + Breece Hall + Luther Burden III + Travis Etienne Jr. + Drake London - avg spend $200, avg record 9-5.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 79.8% of drafts, avg $16.
  - Emeka Egbuka (WR): 38% of drafts, avg $16.
  - Michael Pittman Jr. (WR): 35.3% of drafts, avg $1.
  - Kenneth Walker III (RB): 26% of drafts, avg $18.
  - Colston Loveland (TE): 25.8% of drafts, avg $16.
  - Josh Downs (WR): 25.8% of drafts, avg $1.
  - Travis Etienne Jr. (RB): 24.5% of drafts, avg $15.

### 6. Double RB + WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.2-5.8 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Luther Burden III (~$14), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $128 on anchors and keeps $72 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 42%, WR 8%, TE 6%, DST 3%, K 0%, bench 34%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Rhamondre Stevenson $7 (win by $8), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $116 + reserve $8 = $124 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: DeVonta Smith + Jahmyr Gibbs + Colston Loveland + Josh Jacobs + Chris Olave + Jalen Hurts - avg spend $200, avg record 8-6.
  - 0.3% of drafts: DeVonta Smith + Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Malik Nabers + Garrett Wilson - avg spend $200, avg record 5-9.
  - 0.3% of drafts: Jahmyr Gibbs + Bo Nix + Breece Hall + Luther Burden III + Travis Etienne Jr. + Drake London - avg spend $200, avg record 9-5.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 80.5% of drafts, avg $15.
  - Michael Pittman Jr. (WR): 34.8% of drafts, avg $1.
  - Colston Loveland (TE): 27.8% of drafts, avg $16.
  - Kenneth Walker III (RB): 26.8% of drafts, avg $18.
  - Travis Etienne Jr. (RB): 26.5% of drafts, avg $15.
  - Josh Downs (WR): 25.8% of drafts, avg $1.
  - Emeka Egbuka (WR): 25% of drafts, avg $16.

### 7. Robust RB (RB-RB), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/DEF/TE), rest at room price.

- Projected record: 8.1-5.9 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $194 on anchors and keeps $6 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 14%, TE 3%, DST 3%, K 0%, bench 1%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Davante Adams $12 (room $13, 0.94x durability) (win by $13).
  Targets $175 + reserve $8 = $183 of $200 (completable).

  Most common roster cores this strategy landed:
  - 29.3% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 8.3-5.7.
  - 14.3% of drafts: Jahmyr Gibbs + Christian McCaffrey - avg spend $200, avg record 7.5-6.5.
  - 1.5% of drafts: Jahmyr Gibbs + Jalen Hurts + Christian McCaffrey - avg spend $200, avg record 8.2-5.8.

  Players you land most:
  - Jahmyr Gibbs (RB): 92.8% of drafts, avg $87.
  - Luther Burden III (WR): 74.8% of drafts, avg $15.
  - Christian McCaffrey (RB): 53.3% of drafts, avg $83.
  - Michael Pittman Jr. (WR): 37% of drafts, avg $1.
  - Josh Downs (WR): 28.5% of drafts, avg $1.
  - Alec Pierce (WR): 23.8% of drafts, avg $1.
  - Los Angeles Rams (DEF): 23.5% of drafts, avg $1.
  - Davante Adams (WR): 23% of drafts, avg $9.

### 8. RB-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/DEF/TE), rest at room price.

- Projected record: 8.1-5.9 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $190 on anchors and keeps $10 to complete the roster at room prices.
- Philosophy: Pattern sweep: RB-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 39%, TE 3%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $179 + reserve $8 = $187 of $200 (completable).

  Most common roster cores this strategy landed:
  - 34.3% of drafts: Jahmyr Gibbs + Luther Burden III + Amon-Ra St. Brown - avg spend $200, avg record 8.1-5.9.
  - 20% of drafts: Jahmyr Gibbs + Amon-Ra St. Brown - avg spend $200, avg record 8.1-5.9.
  - 1.5% of drafts: Jahmyr Gibbs + Jalen Hurts + Amon-Ra St. Brown - avg spend $200, avg record 8.8-5.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 93.5% of drafts, avg $87.
  - Luther Burden III (WR): 71.5% of drafts, avg $15.
  - Amon-Ra St. Brown (WR): 66.3% of drafts, avg $83.
  - Michael Pittman Jr. (WR): 37.3% of drafts, avg $1.
  - Josh Downs (WR): 28.8% of drafts, avg $1.
  - Alec Pierce (WR): 24.5% of drafts, avg $1.
  - Los Angeles Rams (DEF): 24% of drafts, avg $1.
  - Mike Evans (WR): 21% of drafts, avg $1.

### 9. Double RB + WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.1-5.9 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Christian McCaffrey (~$67), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $188 on anchors and keeps $12 to complete the roster at room prices.
- Philosophy: Pattern sweep: Double RB + WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 72%, WR 8%, TE 6%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $169 + reserve $8 = $177 of $200 (completable).

  Most common roster cores this strategy landed:
  - 29.5% of drafts: Jahmyr Gibbs + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 8.3-5.7.
  - 15.3% of drafts: Jahmyr Gibbs + Christian McCaffrey - avg spend $200, avg record 7.4-6.6.
  - 1.5% of drafts: Jahmyr Gibbs + Jalen Hurts + Christian McCaffrey - avg spend $200, avg record 7.7-6.3.

  Players you land most:
  - Jahmyr Gibbs (RB): 92.8% of drafts, avg $87.
  - Luther Burden III (WR): 74.8% of drafts, avg $15.
  - Christian McCaffrey (RB): 53.3% of drafts, avg $83.
  - Michael Pittman Jr. (WR): 37% of drafts, avg $1.
  - Josh Downs (WR): 28% of drafts, avg $1.
  - Los Angeles Rams (DEF): 24% of drafts, avg $1.
  - Alec Pierce (WR): 23.8% of drafts, avg $1.
  - Green Bay Packers (DEF): 20.5% of drafts, avg $1.

### 10. Hero RB (RB + WR-WR), heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.1-5.9 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Amon-Ra St. Brown (~$64), Jalen Hurts (~$13). RB runs COOL (0.84x room vs national). This shape spends $183 on anchors and keeps $17 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 33%, TE 6%, DST 3%, K 0%, bench 7%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Amon-Ra St. Brown $64 (win by $70), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $171 + reserve $8 = $179 of $200 (completable).

  Most common roster cores this strategy landed:
  - 47.8% of drafts: Jahmyr Gibbs + Amon-Ra St. Brown - avg spend $200, avg record 8.2-5.8.
  - 3.8% of drafts: Jahmyr Gibbs + Jalen Hurts + Amon-Ra St. Brown - avg spend $200, avg record 8.9-5.1.
  - 1.5% of drafts: Jahmyr Gibbs + Quinshon Judkins + Amon-Ra St. Brown - avg spend $200, avg record 6.8-7.2.

  Players you land most:
  - Jahmyr Gibbs (RB): 94.3% of drafts, avg $87.
  - Amon-Ra St. Brown (WR): 66.8% of drafts, avg $83.
  - Michael Pittman Jr. (WR): 37% of drafts, avg $1.
  - Josh Downs (WR): 29% of drafts, avg $1.
  - Alec Pierce (WR): 24.5% of drafts, avg $1.
  - Los Angeles Rams (DEF): 24.3% of drafts, avg $1.
  - Mike Evans (WR): 21% of drafts, avg $1.
  - Harold Fannin Jr. (TE): 20.8% of drafts, avg $7.

### 11. Elite TE anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 8.1-5.9 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Brock Bowers (~$49), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $190 on anchors and keeps $10 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 45%, TE 27%, DST 3%, K 0%, bench 4%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Brock Bowers $46 (room $49, 0.94x durability) (win by $51), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14).
  Targets $154 + reserve $8 = $162 of $200 (completable).

  Most common roster cores this strategy landed:
  - 4.5% of drafts: Puka Nacua + Luther Burden III + Brock Bowers - avg spend $200, avg record 7.7-6.3.
  - 0.5% of drafts: Puka Nacua + Jalen Hurts + Luther Burden III + Brock Bowers - avg spend $200, avg record 7.5-6.5.
  - 0.5% of drafts: Puka Nacua + J.K. Dobbins + Luther Burden III + Brock Bowers - avg spend $200, avg record 8.5-5.5.

  Players you land most:
  - Luther Burden III (WR): 77% of drafts, avg $16.
  - Puka Nacua (WR): 47.8% of drafts, avg $87.
  - Michael Pittman Jr. (WR): 33.3% of drafts, avg $1.
  - Kenneth Walker III (RB): 30.8% of drafts, avg $19.
  - Breece Hall (RB): 30.5% of drafts, avg $20.
  - Tetairoa McMillan (WR): 27.3% of drafts, avg $22.
  - Colston Loveland (TE): 26% of drafts, avg $18.
  - Emeka Egbuka (WR): 25.5% of drafts, avg $17.

### 12. Robust RB (RB-RB), even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8.1-5.9 (best 14-0, worst 1-13).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jeremiyah Love (~$29), Emeka Egbuka (~$16). RB runs COOL (0.84x room vs national). This shape spends $165 on anchors and keeps $35 to complete the roster at room prices.
- Philosophy: Pattern sweep: Robust RB (RB-RB), even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 53%, WR 15%, TE 6%, DST 3%, K 0%, bench 16%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jeremiyah Love $29 (win by $32), Emeka Egbuka $16 (win by $18), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14).
  Targets $148 + reserve $8 = $156 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: DeVonta Smith + Jahmyr Gibbs + Quinshon Judkins + Jalen Hurts + Malik Nabers + Garrett Wilson - avg spend $200, avg record 5-9.
  - 0.3% of drafts: Jahmyr Gibbs + Emeka Egbuka + Drake Maye + Zay Flowers + Chris Olave + Luther Burden III + Derrick Henry + Carnell Tate - avg spend $200, avg record 11-3.
  - 0.3% of drafts: Jahmyr Gibbs + Bo Nix + Breece Hall + Luther Burden III + Travis Etienne Jr. + Drake London - avg spend $200, avg record 9-5.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Luther Burden III (WR): 79.8% of drafts, avg $16.
  - Emeka Egbuka (WR): 37.3% of drafts, avg $16.
  - Michael Pittman Jr. (WR): 35% of drafts, avg $1.
  - Josh Downs (WR): 25.8% of drafts, avg $1.
  - Kenneth Walker III (RB): 25.5% of drafts, avg $18.
  - Colston Loveland (TE): 25.5% of drafts, avg $16.
  - Travis Etienne Jr. (RB): 23.8% of drafts, avg $15.

### 13. Hero RB (RB + WR-WR), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (RB/QB/TE/WR/DEF), rest at room price.

- Projected record: 8.1-5.9 (best 14-0, worst 0-14).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Jalen Hurts (~$13), Quinshon Judkins (~$12). RB runs COOL (0.84x room vs national). This shape spends $125 on anchors and keeps $75 to complete the roster at room prices.
- Philosophy: Pattern sweep: Hero RB (RB + WR-WR), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 44%, WR 4%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7), Carnell Tate $6 (win by $7).
  Targets $113 + reserve $8 = $121 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: DJ Moore + DeVonta Smith + Jahmyr Gibbs + Bo Nix + Breece Hall + Kyle Monangai + Kenneth Walker III + Luther Burden III + Derrick Henry + Malik Nabers - avg spend $190, avg record 7-7.
  - 0.3% of drafts: DeVonta Smith + Jahmyr Gibbs + Emeka Egbuka + Drake Maye + Chris Olave + Nico Collins + Derrick Henry + George Pickens - avg spend $200, avg record 10-4.
  - 0.3% of drafts: Jahmyr Gibbs + Emeka Egbuka + Colston Loveland + Jayden Daniels + Dallas Goedert + Derrick Henry + Garrett Wilson - avg spend $200, avg record 10-4.

  Players you land most:
  - Jahmyr Gibbs (RB): 95% of drafts, avg $87.
  - Michael Pittman Jr. (WR): 35% of drafts, avg $1.
  - Luther Burden III (WR): 31.8% of drafts, avg $13.
  - Travis Etienne Jr. (RB): 31% of drafts, avg $15.
  - Colston Loveland (TE): 29.3% of drafts, avg $15.
  - Kenneth Walker III (RB): 29% of drafts, avg $18.
  - Davante Adams (WR): 26.5% of drafts, avg $14.
  - Breece Hall (RB): 26% of drafts, avg $19.

### 14. Elite QB anchor, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/QB/TE/DEF), rest at room price.

- Projected record: 8-6 (best 14-0, worst 0-14).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Josh Allen (~$36), Zay Flowers (~$24). RB runs COOL (0.84x room vs national). This shape spends $179 on anchors and keeps $21 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 44%, WR 19%, TE 6%, DST 3%, K 0%, bench 10%.
- Target prices (durability-adjusted expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Josh Allen $36 (win by $40), Zay Flowers $24 (win by $26), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13).
  Targets $162 + reserve $8 = $170 of $200 (completable).

  Most common roster cores this strategy landed:
  - 25.8% of drafts: Josh Allen + Jahmyr Gibbs + Zay Flowers + Luther Burden III - avg spend $200, avg record 7.7-6.3.
  - 3.3% of drafts: Josh Allen + Jahmyr Gibbs + Zay Flowers - avg spend $200, avg record 8-6.
  - 1.3% of drafts: Josh Allen + Jahmyr Gibbs + Zay Flowers + Rhamondre Stevenson - avg spend $200, avg record 5.2-8.8.

  Players you land most:
  - Zay Flowers (WR): 95.3% of drafts, avg $28.
  - Jahmyr Gibbs (RB): 94.5% of drafts, avg $87.
  - Luther Burden III (WR): 75.5% of drafts, avg $15.
  - Josh Allen (QB): 54.8% of drafts, avg $47.
  - Michael Pittman Jr. (WR): 36.5% of drafts, avg $1.
  - Josh Downs (WR): 28.8% of drafts, avg $1.
  - Alec Pierce (WR): 22% of drafts, avg $1.
  - Los Angeles Rams (DEF): 21.8% of drafts, avg $1.

### 15. Elite TE anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (WR/TE/RB/QB/DEF), rest at room price.

- Projected record: 8-6 (best 14-0, worst 1-13).
- Why: The board supports paying up for Justin Jefferson (~$57), Brock Bowers (~$49), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $158 on anchors and keeps $42 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 29%, TE 27%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Justin Jefferson $53 (room $57, 0.94x durability) (win by $58), Brock Bowers $46 (room $49, 0.94x durability) (win by $51), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $139 + reserve $8 = $147 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Colston Loveland + Justin Jefferson + Bo Nix + Ashton Jeanty + Garrett Wilson + Tetairoa McMillan - avg spend $200, avg record 7-7.
  - 0.3% of drafts: Emeka Egbuka + Colston Loveland + Justin Jefferson + Bo Nix + Terry McLaurin + Breece Hall + Derrick Henry + Garrett Wilson - avg spend $200, avg record 12-2.
  - 0.3% of drafts: Drake Maye + Justin Jefferson + Davante Adams + Rashee Rice + Breece Hall + Harold Fannin Jr. + Courtland Sutton + Cam Skattebo - avg spend $200, avg record 7-7.

  Players you land most:
  - Justin Jefferson (WR): 72.3% of drafts, avg $70.
  - Kenneth Walker III (RB): 32.8% of drafts, avg $20.
  - Cam Skattebo (RB): 32.3% of drafts, avg $17.
  - Michael Pittman Jr. (WR): 32% of drafts, avg $1.
  - Breece Hall (RB): 31.5% of drafts, avg $21.
  - Colston Loveland (TE): 29.3% of drafts, avg $18.
  - Luther Burden III (WR): 29% of drafts, avg $14.
  - Tetairoa McMillan (WR): 26.8% of drafts, avg $21.

### 16. Triple WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $192 on anchors and keeps $8 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 71%, TE 2%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Amon-Ra St. Brown $64 (win by $70), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 22.3% of drafts: Puka Nacua + Amon-Ra St. Brown - avg spend $200, avg record 8-6.
  - 1.3% of drafts: Puka Nacua + Jalen Hurts + Amon-Ra St. Brown - avg spend $200, avg record 10.8-3.2.
  - 1.3% of drafts: Puka Nacua + Amon-Ra St. Brown + D'Andre Swift - avg spend $200, avg record 6-8.

  Players you land most:
  - Amon-Ra St. Brown (WR): 66.8% of drafts, avg $84.
  - Puka Nacua (WR): 47.5% of drafts, avg $87.
  - Michael Pittman Jr. (WR): 35.8% of drafts, avg $1.
  - Josh Downs (WR): 26.5% of drafts, avg $1.
  - Breece Hall (RB): 26.3% of drafts, avg $21.
  - Cam Skattebo (RB): 24.3% of drafts, avg $16.
  - Travis Etienne Jr. (RB): 23.8% of drafts, avg $14.
  - Nico Collins (WR): 23% of drafts, avg $12.

### 17. WR-WR, heavy anchors  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Amon-Ra St. Brown (~$64), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $192 on anchors and keeps $8 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, heavy anchors. Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 70%, TE 3%, DST 3%, K 0%, bench 3%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Amon-Ra St. Brown $64 (win by $70), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $170 + reserve $8 = $178 of $200 (completable).

  Most common roster cores this strategy landed:
  - 22.3% of drafts: Puka Nacua + Amon-Ra St. Brown - avg spend $200, avg record 8-6.
  - 1.3% of drafts: Puka Nacua + Jalen Hurts + Amon-Ra St. Brown - avg spend $200, avg record 10.8-3.2.
  - 1.3% of drafts: Puka Nacua + Amon-Ra St. Brown + D'Andre Swift - avg spend $200, avg record 6-8.

  Players you land most:
  - Amon-Ra St. Brown (WR): 66.8% of drafts, avg $84.
  - Puka Nacua (WR): 47.5% of drafts, avg $87.
  - Michael Pittman Jr. (WR): 35.8% of drafts, avg $1.
  - Josh Downs (WR): 26.5% of drafts, avg $1.
  - Breece Hall (RB): 26.3% of drafts, avg $21.
  - Cam Skattebo (RB): 24.3% of drafts, avg $16.
  - Travis Etienne Jr. (RB): 23.8% of drafts, avg $14.
  - Nico Collins (WR): 23% of drafts, avg $12.

### 18. Triple WR, even split  (wr-heavy-auction, aggressive risk)

Pool-generated WR Heavy (Auction): 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Zay Flowers (~$24), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $160 on anchors and keeps $40 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, even split. Built from the live board: wr heavy shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 55%, TE 2%, DST 3%, K 0%, bench 19%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Zay Flowers $24 (win by $26), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $130 + reserve $8 = $138 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Puka Nacua + Zay Flowers + Luther Burden III + D'Andre Swift + Cam Skattebo - avg spend $197, avg record 8-6.
  - 0.3% of drafts: Puka Nacua + Emeka Egbuka + Zay Flowers + Tyler Warren + Breece Hall + Kenneth Walker III + Travis Etienne Jr. + Cam Skattebo - avg spend $191, avg record 5-9.
  - 0.3% of drafts: Puka Nacua + Kyren Williams + Quinshon Judkins + Zay Flowers + Harold Fannin Jr. + Travis Etienne Jr. - avg spend $193, avg record 10-4.

  Players you land most:
  - Zay Flowers (WR): 96% of drafts, avg $28.
  - Puka Nacua (WR): 48% of drafts, avg $87.
  - Breece Hall (RB): 32.3% of drafts, avg $20.
  - Michael Pittman Jr. (WR): 31.8% of drafts, avg $1.
  - Luther Burden III (WR): 29.3% of drafts, avg $13.
  - Colston Loveland (TE): 28.3% of drafts, avg $17.
  - Kenneth Walker III (RB): 28% of drafts, avg $20.
  - Cam Skattebo (RB): 27.5% of drafts, avg $18.

### 19. WR-WR, even split  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), Zay Flowers (~$24), D'Andre Swift (~$16). WR runs HOT (1.18x room vs national). This shape spends $158 on anchors and keeps $42 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, even split. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 50%, TE 6%, DST 3%, K 0%, bench 20%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), Zay Flowers $24 (win by $26), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $130 + reserve $8 = $138 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.5% of drafts: Puka Nacua + Zay Flowers + Luther Burden III + D'Andre Swift + Cam Skattebo - avg spend $197, avg record 8-6.
  - 0.3% of drafts: Puka Nacua + Emeka Egbuka + Zay Flowers + Tyler Warren + Breece Hall + Kenneth Walker III + Travis Etienne Jr. + Cam Skattebo - avg spend $191, avg record 5-9.
  - 0.3% of drafts: Puka Nacua + Kyren Williams + Quinshon Judkins + Zay Flowers + Harold Fannin Jr. + Travis Etienne Jr. - avg spend $193, avg record 10-4.

  Players you land most:
  - Zay Flowers (WR): 96% of drafts, avg $28.
  - Puka Nacua (WR): 48% of drafts, avg $87.
  - Breece Hall (RB): 32.3% of drafts, avg $20.
  - Michael Pittman Jr. (WR): 31.8% of drafts, avg $1.
  - Luther Burden III (WR): 29.3% of drafts, avg $13.
  - Colston Loveland (TE): 28.3% of drafts, avg $17.
  - Kenneth Walker III (RB): 28% of drafts, avg $20.
  - Cam Skattebo (RB): 27.5% of drafts, avg $18.

### 20. WR-WR, light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), D'Andre Swift (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $140 on anchors and keeps $60 to complete the roster at room prices.
- Philosophy: Pattern sweep: WR-WR, light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 41%, TE 6%, DST 3%, K 0%, bench 29%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $112 + reserve $8 = $120 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Puka Nacua + Josh Allen + Breece Hall + Travis Etienne Jr. + Garrett Wilson + Tetairoa McMillan - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Puka Nacua + Bo Nix + Josh Jacobs + Parker Washington + Kenneth Walker III + De'Von Achane + D'Andre Swift - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Puka Nacua + Colston Loveland + Jayden Daniels + Breece Hall + Derrick Henry + Cam Skattebo - avg spend $193, avg record 10-4.

  Players you land most:
  - Puka Nacua (WR): 48% of drafts, avg $87.
  - Breece Hall (RB): 35.5% of drafts, avg $21.
  - Colston Loveland (TE): 35.5% of drafts, avg $18.
  - Kenneth Walker III (RB): 33.8% of drafts, avg $20.
  - Cam Skattebo (RB): 33.5% of drafts, avg $18.
  - Michael Pittman Jr. (WR): 32.5% of drafts, avg $1.
  - Tetairoa McMillan (WR): 32.3% of drafts, avg $22.
  - Travis Etienne Jr. (RB): 30.5% of drafts, avg $15.

### 21. Triple WR, light anchors  (wr-heavy-auction, balanced risk)

Pool-generated WR Heavy (Auction): 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), D'Andre Swift (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $134 on anchors and keeps $66 to complete the roster at room prices.
- Philosophy: Pattern sweep: Triple WR, light anchors. Built from the live board: wr heavy shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 42%, TE 2%, DST 3%, K 0%, bench 32%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Carnell Tate $6 (win by $7).
  Targets $112 + reserve $8 = $120 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Puka Nacua + Josh Allen + Breece Hall + Travis Etienne Jr. + Garrett Wilson + Tetairoa McMillan - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Puka Nacua + Bo Nix + Josh Jacobs + Parker Washington + Kenneth Walker III + De'Von Achane + D'Andre Swift - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Puka Nacua + Colston Loveland + Jayden Daniels + Breece Hall + Derrick Henry + Cam Skattebo - avg spend $193, avg record 10-4.

  Players you land most:
  - Puka Nacua (WR): 48% of drafts, avg $87.
  - Breece Hall (RB): 35% of drafts, avg $21.
  - Colston Loveland (TE): 34.8% of drafts, avg $18.
  - Kenneth Walker III (RB): 33.3% of drafts, avg $20.
  - Cam Skattebo (RB): 33% of drafts, avg $18.
  - Michael Pittman Jr. (WR): 32.8% of drafts, avg $1.
  - Tetairoa McMillan (WR): 32.3% of drafts, avg $22.
  - Travis Etienne Jr. (RB): 30% of drafts, avg $15.

### 22. Zero RB (WR-WR-TE), light anchors  (studs-and-duds, balanced risk)

Pool-generated Studs & Duds: 8 anchors (WR/RB/QB/DEF/TE), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Puka Nacua (~$76), D'Andre Swift (~$16), Jalen Hurts (~$13). WR runs HOT (1.18x room vs national). This shape spends $134 on anchors and keeps $66 to complete the roster at room prices.
- Philosophy: Pattern sweep: Zero RB (WR-WR-TE), light anchors. Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 41%, TE 3%, DST 3%, K 0%, bench 32%.
- Target prices (durability-adjusted expect / walk-up to win): Puka Nacua $66 (room $76, 0.87x durability) (win by $73), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13), Carnell Tate $6 (win by $7).
  Targets $112 + reserve $8 = $120 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Puka Nacua + Josh Allen + Breece Hall + Travis Etienne Jr. + Garrett Wilson + Tetairoa McMillan - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Puka Nacua + Bo Nix + Josh Jacobs + Parker Washington + Kenneth Walker III + De'Von Achane + D'Andre Swift - avg spend $200, avg record 8-6.
  - 0.3% of drafts: Puka Nacua + Colston Loveland + Jayden Daniels + Breece Hall + Derrick Henry + Cam Skattebo - avg spend $193, avg record 10-4.

  Players you land most:
  - Puka Nacua (WR): 48% of drafts, avg $87.
  - Breece Hall (RB): 35% of drafts, avg $21.
  - Colston Loveland (TE): 34.8% of drafts, avg $18.
  - Kenneth Walker III (RB): 33.3% of drafts, avg $20.
  - Cam Skattebo (RB): 33% of drafts, avg $18.
  - Michael Pittman Jr. (WR): 32.8% of drafts, avg $1.
  - Tetairoa McMillan (WR): 32.3% of drafts, avg $22.
  - Travis Etienne Jr. (RB): 30% of drafts, avg $15.

### 23. Balanced (no anchor)  (balanced-auction, conservative risk)

Pool-generated Balanced Auction: 8 anchors (WR/RB/QB/TE/DEF), rest at room price.

- Projected record: 7.9-6.1 (best 14-0, worst 1-13).
- Why: The board supports paying up for Emeka Egbuka (~$16), D'Andre Swift (~$16), Luther Burden III (~$14). WR runs HOT (1.18x room vs national). This shape spends $88 on anchors and keeps $112 to complete the roster at room prices.
- Philosophy: Pattern sweep: Balanced (no anchor). Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 15%, TE 6%, DST 3%, K 0%, bench 55%.
- Target prices (durability-adjusted expect / walk-up to win): Emeka Egbuka $16 (win by $18), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Luther Burden III $14 (win by $15), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $70 + reserve $8 = $78 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Colston Loveland + Bo Nix + Josh Jacobs + Breece Hall + Ashton Jeanty + Travis Etienne Jr. + Nico Collins + Garrett Wilson + Tetairoa McMillan - avg spend $200, avg record 7-7.
  - 0.3% of drafts: Zay Flowers + Bo Nix + Davante Adams + Rashee Rice + Jameson Williams + Chris Olave + Jaxon Smith-Njigba + Derrick Henry - avg spend $200, avg record 11-3.
  - 0.3% of drafts: DeVonta Smith + Drake Maye + Zay Flowers + Chris Olave + Luther Burden III + Nico Collins + Derrick Henry + Carnell Tate + Malik Nabers - avg spend $194, avg record 9-5.

  Players you land most:
  - Luther Burden III (WR): 72.8% of drafts, avg $16.
  - Chris Olave (WR): 40.3% of drafts, avg $26.
  - Colston Loveland (TE): 39.3% of drafts, avg $20.
  - Tetairoa McMillan (WR): 39% of drafts, avg $23.
  - Breece Hall (RB): 38.5% of drafts, avg $22.
  - Kenneth Walker III (RB): 36% of drafts, avg $21.
  - Derrick Henry (RB): 35.5% of drafts, avg $27.
  - Bo Nix (QB): 33.8% of drafts, avg $22.

### 24. Elite QB anchor, even split  (balanced-auction, aggressive risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 7.8-6.2 (best 14-0, worst 0-14).
- Why: The board supports paying up for Christian McCaffrey (~$67), Josh Allen (~$36), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $152 on anchors and keeps $48 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, even split. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 40%, WR 10%, TE 6%, DST 3%, K 0%, bench 23%.
- Target prices (durability-adjusted expect / walk-up to win): Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66), Josh Allen $36 (win by $40), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $128 + reserve $8 = $136 of $200 (completable).

  Most common roster cores this strategy landed:
  - 1.3% of drafts: Josh Allen + Zay Flowers + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 7.6-6.4.
  - 0.5% of drafts: Josh Allen + Christian McCaffrey + Kenneth Walker III + Luther Burden III - avg spend $200, avg record 10-4.
  - 0.5% of drafts: Josh Allen + Emeka Egbuka + Jayden Daniels + Christian McCaffrey + Luther Burden III - avg spend $200, avg record 6.5-7.5.

  Players you land most:
  - Luther Burden III (WR): 78% of drafts, avg $16.
  - Josh Allen (QB): 58.8% of drafts, avg $47.
  - Christian McCaffrey (RB): 56.8% of drafts, avg $83.
  - Michael Pittman Jr. (WR): 33.8% of drafts, avg $1.
  - Kenneth Walker III (RB): 26.3% of drafts, avg $19.
  - Colston Loveland (TE): 26.3% of drafts, avg $17.
  - Emeka Egbuka (WR): 26% of drafts, avg $16.
  - Josh Downs (WR): 25.5% of drafts, avg $1.

### 25. Elite TE anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (TE/WR/RB/QB/DEF), rest at room price.

- Projected record: 7.8-6.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Brock Bowers (~$49), Zay Flowers (~$24), D'Andre Swift (~$16). TE runs HOT (1.17x room vs national). This shape spends $133 on anchors and keeps $67 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite TE anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 14%, WR 17%, TE 27%, DST 3%, K 0%, bench 32%.
- Target prices (durability-adjusted expect / walk-up to win): Brock Bowers $46 (room $49, 0.94x durability) (win by $51), Zay Flowers $24 (win by $26), D'Andre Swift $15 (room $16, 0.93x durability) (win by $17), Jalen Hurts $13 (win by $14), Quinshon Judkins $12 (win by $13).
  Targets $110 + reserve $8 = $118 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Colston Loveland + Zay Flowers + Jayden Daniels + Breece Hall + Ashton Jeanty + Travis Etienne Jr. + Garrett Wilson + Tetairoa McMillan - avg spend $200, avg record 6-8.
  - 0.3% of drafts: Zay Flowers + Bo Nix + Jameson Williams + Jaxson Dart + Chris Olave + Luther Burden III + Jaxon Smith-Njigba + Brock Bowers - avg spend $200, avg record 10-4.
  - 0.3% of drafts: DeVonta Smith + Zay Flowers + Josh Jacobs + Jameson Williams + Breece Hall + Jalen Hurts + Bhayshul Tuten + Garrett Wilson + Brock Bowers - avg spend $198, avg record 7-7.

  Players you land most:
  - Zay Flowers (WR): 96.3% of drafts, avg $28.
  - Breece Hall (RB): 38.5% of drafts, avg $22.
  - Chris Olave (WR): 35% of drafts, avg $25.
  - Tetairoa McMillan (WR): 34.5% of drafts, avg $22.
  - Kenneth Walker III (RB): 34.3% of drafts, avg $21.
  - Michael Pittman Jr. (WR): 32% of drafts, avg $1.
  - Colston Loveland (TE): 31.3% of drafts, avg $18.
  - Cam Skattebo (RB): 31% of drafts, avg $20.

### 26. Elite QB anchor, light anchors  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (RB/QB/WR/TE/DEF), rest at room price.

- Projected record: 7.8-6.2 (best 14-0, worst 1-13).
- Why: The board supports paying up for Saquon Barkley (~$42), Josh Allen (~$36), Luther Burden III (~$14). RB runs COOL (0.84x room vs national). This shape spends $127 on anchors and keeps $73 to complete the roster at room prices.
- Philosophy: Pattern sweep: Elite QB anchor, light anchors. Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 27%, WR 10%, TE 6%, DST 3%, K 0%, bench 36%.
- Target prices (durability-adjusted expect / walk-up to win): Saquon Barkley $39 (room $42, 0.94x durability) (win by $43), Josh Allen $36 (win by $40), Luther Burden III $14 (win by $15), Quinshon Judkins $12 (win by $13), Sam LaPorta $6 (room $7, 0.93x durability) (win by $7).
  Targets $107 + reserve $8 = $115 of $200 (completable).

  Most common roster cores this strategy landed:
  - 0.3% of drafts: Colston Loveland + Bo Nix + Breece Hall + Ashton Jeanty + Garrett Wilson + Tetairoa McMillan - avg spend $155, avg record 6-8.
  - 0.3% of drafts: Zay Flowers + Bo Nix + Davante Adams + Rashee Rice + Jameson Williams + Chris Olave + Jaxon Smith-Njigba + Derrick Henry - avg spend $200, avg record 10-4.
  - 0.3% of drafts: Josh Allen + Emeka Egbuka + Colston Loveland + Saquon Barkley + Bucky Irving + Kenneth Walker III + Travis Etienne Jr. + Cam Skattebo - avg spend $194, avg record 11-3.

  Players you land most:
  - Luther Burden III (WR): 72.8% of drafts, avg $16.
  - Josh Allen (QB): 60.3% of drafts, avg $46.
  - Chris Olave (WR): 36% of drafts, avg $26.
  - Kenneth Walker III (RB): 36% of drafts, avg $20.
  - Breece Hall (RB): 35.8% of drafts, avg $22.
  - Tetairoa McMillan (WR): 33.3% of drafts, avg $23.
  - Cam Skattebo (RB): 32.8% of drafts, avg $20.
  - Michael Pittman Jr. (WR): 31.8% of drafts, avg $1.

## Specific stud combos (which exact players to target)

The strategy leaderboard above says which SHAPE wins. This tier says which
exact studs to buy inside each shape. Every combo is a completable $200
roster (the named anchors forced in, the rest filled at room price) graded
with the risk model on. Grouped by pattern, best projected record first.

### Top combos overall

| # | Anchors | Pattern | Proj record | Mean starter pts |
|---|---------|---------|-------------|------------------|
| 1 | Jahmyr Gibbs + Puka Nacua | RB-WR | 8.2-5.8 | 1937.5 |
| 2 | Jahmyr Gibbs + Christian McCaffrey | Robust RB (RB-RB) | 8.1-5.9 | 1930.8 |
| 3 | Jahmyr Gibbs + Bijan Robinson | Robust RB (RB-RB) | 8.1-5.9 | 1942.1 |
| 4 | Jahmyr Gibbs + Jaxon Smith-Njigba | RB-WR | 8.1-5.9 | 1939.4 |
| 5 | Jahmyr Gibbs + Amon-Ra St. Brown | RB-WR | 8.1-5.9 | 1923.2 |
| 6 | Drake Maye + Jahmyr Gibbs + Puka Nacua | Elite QB anchor | 8.1-5.9 | 1938.4 |
| 7 | Christian McCaffrey + Bijan Robinson | Robust RB (RB-RB) | 8-6 | 1911 |
| 8 | Josh Allen + Jahmyr Gibbs + Puka Nacua | Elite QB anchor | 8-6 | 1935.7 |
| 9 | Lamar Jackson + Jahmyr Gibbs + Puka Nacua | Elite QB anchor | 8-6 | 1936.2 |
| 10 | Trey McBride + Puka Nacua + Ja'Marr Chase | Elite TE anchor | 8-6 | 1900.2 |
| 11 | Puka Nacua + Amon-Ra St. Brown | WR-WR | 7.9-6.1 | 1887.8 |
| 12 | Puka Nacua + Ja'Marr Chase | WR-WR | 7.9-6.1 | 1898.9 |

### Robust RB (RB-RB)

- **Jahmyr Gibbs + Christian McCaffrey**: 8.1-5.9, 1930.8 starter pts - target Jahmyr Gibbs $76, Christian McCaffrey $60.
- **Jahmyr Gibbs + Bijan Robinson**: 8.1-5.9, 1942.1 starter pts - target Jahmyr Gibbs $76, Bijan Robinson $70.
- **Christian McCaffrey + Bijan Robinson**: 8-6, 1911 starter pts - target Bijan Robinson $70, Christian McCaffrey $60.

### WR-WR

- **Puka Nacua + Amon-Ra St. Brown**: 7.9-6.1, 1887.8 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64.
- **Puka Nacua + Ja'Marr Chase**: 7.9-6.1, 1898.9 starter pts - target Ja'Marr Chase $75, Puka Nacua $66.
- **Puka Nacua + Jaxon Smith-Njigba**: 7.8-6.2, 1894.3 starter pts - target Puka Nacua $66, Jaxon Smith-Njigba $72.

### RB-WR

- **Jahmyr Gibbs + Puka Nacua**: 8.2-5.8, 1937.5 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66.
- **Jahmyr Gibbs + Jaxon Smith-Njigba**: 8.1-5.9, 1939.4 starter pts - target Jahmyr Gibbs $76, Jaxon Smith-Njigba $72.
- **Jahmyr Gibbs + Amon-Ra St. Brown**: 8.1-5.9, 1923.2 starter pts - target Jahmyr Gibbs $76, Amon-Ra St. Brown $64.

### Zero RB (WR-WR-TE)

- **Puka Nacua + Amon-Ra St. Brown + Brock Bowers**: 7.8-6.2, 1880.8 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64, Brock Bowers $46.
- **Puka Nacua + Jaxon Smith-Njigba + Trey McBride**: 7.8-6.2, 1893.7 starter pts - target Puka Nacua $66, Jaxon Smith-Njigba $72, Trey McBride $35.
- **Jaxon Smith-Njigba + Amon-Ra St. Brown + Brock Bowers**: 7.7-6.3, 1883 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Brock Bowers $46.

### Elite QB anchor

- **Drake Maye + Jahmyr Gibbs + Puka Nacua**: 8.1-5.9, 1938.4 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Drake Maye $25.
- **Josh Allen + Jahmyr Gibbs + Puka Nacua**: 8-6, 1935.7 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Josh Allen $36.
- **Lamar Jackson + Jahmyr Gibbs + Puka Nacua**: 8-6, 1936.2 starter pts - target Jahmyr Gibbs $76, Puka Nacua $66, Lamar Jackson $32.

### Elite TE anchor

- **Trey McBride + Puka Nacua + Ja'Marr Chase**: 8-6, 1900.2 starter pts - target Ja'Marr Chase $75, Puka Nacua $66, Trey McBride $35.
- **Trey McBride + Puka Nacua + Amon-Ra St. Brown**: 7.9-6.1, 1887.3 starter pts - target Puka Nacua $66, Amon-Ra St. Brown $64, Trey McBride $35.
- **Trey McBride + Jaxon Smith-Njigba + Amon-Ra St. Brown**: 7.8-6.2, 1889.8 starter pts - target Jaxon Smith-Njigba $72, Amon-Ra St. Brown $64, Trey McBride $35.

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
  Target - worth ~$39, room pays ~$32. Win him at or under $36.  [+$7 POCKET]
- **Drake Maye** (NE, bye 11) - $32-$38 (base $35) league band, land odds 6.3%.
  Target - worth ~$38, room pays ~$32. Win him at or under $35.  [+$6 POCKET]
- **Jalen Hurts** (PHI, bye 10) - $23-$33 (base $28) league band, land odds 0%.
  Target - worth ~$33, room pays ~$23. Win him at or under $28.  [+$10 POCKET]
- **Bo Nix** (DEN, bye 10) - $28-$33 (base $31) league band, land odds 0%.
  Target - worth ~$33, room pays ~$28. Win him at or under $31.  [+$5 POCKET]
- **Jayden Daniels** (WAS, bye 7) - $15-$26 (base $21) league band, land odds 6.3%.
  Target - worth ~$26, room pays ~$15. Win him at or under $21.  [+$11 POCKET]

### RB

- **Jahmyr Gibbs** (DET, bye 6) - $76-$96 (base $86) league band, land odds 12.5%.
  Anchor - pay up to $86 to lock a Tier 1 player.  [ELITE, +$20 POCKET]
- **Christian McCaffrey** (SF, bye 8) - $70-$83 (base $77) league band, land odds 0%.
  Target - worth ~$83, room pays ~$70. Win him at or under $77. Watch the injury tag - trim the bid.  [+$13 POCKET, INJ QUESTIONABLE]
- **Bijan Robinson** (ATL, bye 11) - $67-$80 (base $74) league band, land odds 6.3%.
  Anchor - pay up to $74 to lock a Tier 1 player.  [ELITE, +$13 POCKET]
- **Jonathan Taylor** (IND, bye 13) - $59-$60 (base $60) league band, land odds 0%.
  Fair value ~$60 (band $59-$60).
- **Ashton Jeanty** (LV, bye 13) - $57 league band, land odds 25%.
  Fair value ~$57.
- **Saquon Barkley** (PHI, bye 10) - $56-$60 (base $58) league band, land odds 12.5%.
  Let him go - room pays ~$60 over his ~$56 worth here.  [-$4 TAX]
- **Jeremiyah Love** (ARI, bye 14) - $44-$57 (base $51) league band, land odds 12.5%.
  Let him go - room pays ~$57 over his ~$44 worth here.  [-$13 TAX, INJ QUESTIONABLE]
- **James Cook III** (BUF, bye 7) - $43-$53 (base $48) league band, land odds 12.5%.
  Let him go - room pays ~$53 over his ~$43 worth here.  [-$10 TAX]
- **Chase Brown** (CIN, bye 6) - $41-$50 (base $46) league band, land odds 0%.
  Let him go - room pays ~$50 over his ~$41 worth here.  [-$9 TAX]
- **De'Von Achane** (MIA, bye 6) - $39-$45 (base $42) league band, land odds 0%.
  Let him go - room pays ~$45 over his ~$39 worth here.  [-$6 TAX]

### WR

- **Puka Nacua** (LAR, bye 11) - $79-$86 (base $83) league band, land odds 12.5%.
  Anchor - pay up to $83 to lock a Tier 1 player. Watch the injury tag - trim the bid.  [ELITE, +$7 POCKET, INJ QUESTIONABLE]
- **Jaxon Smith-Njigba** (SEA, bye 11) - $76-$78 (base $77) league band, land odds 12.5%.
  Anchor - pay up to $77 to lock a Tier 1 player.  [ELITE]
- **Amon-Ra St. Brown** (DET, bye 6) - $72-$74 (base $73) league band, land odds 18.8%.
  Anchor - pay up to $73 to lock a Tier 1 player.  [ELITE]
- **Ja'Marr Chase** (CIN, bye 6) - $64-$72 (base $68) league band, land odds 12.5%.
  Anchor - pay up to $68 to lock a Tier 1 player.  [ELITE, +$8 POCKET]
- **Justin Jefferson** (MIN, bye 6) - $57-$60 (base $59) league band, land odds 0%.
  Fair value ~$59 (band $57-$60).
- **CeeDee Lamb** (DAL, bye 14) - $49-$57 (base $53) league band, land odds 0%.
  Let him go - room pays ~$57 over his ~$49 worth here.  [-$8 TAX]
- **A.J. Brown** (NE, bye 11) - $43-$54 (base $49) league band, land odds 0%.
  Let him go - room pays ~$54 over his ~$43 worth here.  [-$11 TAX]
- **Drake London** (ATL, bye 11) - $41-$48 (base $45) league band, land odds 0%.
  Let him go - room pays ~$48 over his ~$41 worth here.  [-$7 TAX]
- **Zay Flowers** (BAL, bye 13) - $24-$41 (base $33) league band, land odds 0%.
  Target - worth ~$41, room pays ~$24. Win him at or under $33. Watch the injury tag - trim the bid.  [+$17 POCKET, INJ QUESTIONABLE]
- **Garrett Wilson** (NYJ, bye 13) - $23-$40 (base $32) league band, land odds 0%.
  Target - worth ~$40, room pays ~$23. Win him at or under $32.  [+$17 POCKET]

### TE

- **Brock Bowers** (LV, bye 13) - $49-$53 (base $51) league band, land odds 6.3%.
  Target - worth ~$53, room pays ~$49. Win him at or under $51.  [+$4 POCKET]
- **Trey McBride** (ARI, bye 14) - $40-$49 (base $45) league band, land odds 6.3%.
  Let him go - room pays ~$49 over his ~$40 worth here.  [-$9 TAX]
- **Colston Loveland** (CHI, bye 10) - $28-$35 (base $32) league band, land odds 6.3%.
  Let him go - room pays ~$35 over his ~$28 worth here.  [-$7 TAX]
- **Harold Fannin Jr.** (CLE, bye 11) - $24-$27 (base $26) league band, land odds 6.3%.
  Fair value ~$26 (band $24-$27).
- **Tyler Warren** (IND, bye 13) - $21-$23 (base $22) league band, land odds 25%.
  Fair value ~$22 (band $21-$23). Watch the injury tag - trim the bid.  [INJ QUESTIONABLE]
- **George Kittle** (SF, bye 8) - $21-$23 (base $22) league band, land odds 12.5%.
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
