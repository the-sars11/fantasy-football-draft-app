# The Nasties - Draft Research Dataset

Generated 2026-08-20T17:52:21.178Z. 12-team, $200 auction, full PPR, no kicker.
Roster: QB1, RB1, WR1, TE1, FLEX3, DEF1, Bench5.
Players: 1000. Cache last updated 2026-08-20T01:00:27.018+00:00 (stale=false).
Sims: 400 Monte-Carlo runs per strategy, 14-game season, seed 42.

## Strategy leaderboard (which approach wins, and why)

| # | Strategy | Proj record | Modal record | Mean starter pts | Ceiling / Floor |
|---|----------|-------------|--------------|------------------|-----------------|
| 1 | Studs & Duds | 10.8-3.2 | 11-3 (24.8%) | 1944.3 | $88 / $64 |
| 2 | Stars & Scrubs | 10.7-3.3 | 11-3 (25.3%) | 1939.1 | $90 / $66 |
| 3 | Balanced Auction | 10.2-3.8 | 11-3 (21%) | 1910.8 | $83 / $69 |

### 1. Studs & Duds  (studs-and-duds, aggressive risk)

Pool-generated Studs & Duds: 8 anchors (RB/WR/QB/TE), rest at room price.

- Projected record: 10.8-3.2 (best 14-0, worst 3-11).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Zay Flowers (~$24), Garrett Wilson (~$23). RB runs COOL (0.84x room vs national). This shape spends $154 on anchors and keeps $46 to complete the roster at room prices.
- Philosophy: Built from the live board: studs and duds shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 7%, RB 45%, WR 24%, TE 2%, DST 0%, K 0%, bench 22%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Zay Flowers $24 (win by $26), Garrett Wilson $23 (win by $25), Jalen Hurts $23 (win by $25), Quinshon Judkins $35 (win by $39).
  Targets $181 + reserve $8 = $189 of $200 (completable).

  Most common roster cores this strategy landed:
  - 11.5% of drafts: Jahmyr Gibbs + Bijan Robinson - avg spend $200, avg record 11.3-2.7.
  - 9.3% of drafts: Jahmyr Gibbs + Christian McCaffrey - avg spend $200, avg record 11.9-2.1.
  - 5.5% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 11-3.

  Players you land most:
  - Jahmyr Gibbs (RB): 93% of drafts, avg $96.
  - Sam LaPorta (TE): 88.3% of drafts, avg $1.
  - Courtland Sutton (WR): 85.3% of drafts, avg $1.
  - Jameson Williams (WR): 85% of drafts, avg $1.
  - Tony Pollard (RB): 75.5% of drafts, avg $1.
  - Rhamondre Stevenson (RB): 74.5% of drafts, avg $1.
  - Houston Texans (DEF): 65.3% of drafts, avg $1.
  - Zach Charbonnet (RB): 64% of drafts, avg $1.

### 2. Stars & Scrubs  (stars-and-scrubs, aggressive risk)

Pool-generated Stars & Scrubs: 8 anchors (RB/WR/TE/QB), rest at room price.

- Projected record: 10.7-3.3 (best 14-0, worst 5-9).
- Why: The board supports paying up for Jahmyr Gibbs (~$76), Puka Nacua (~$76), Jeremiyah Love (~$29). RB runs COOL (0.84x room vs national). This shape spends $191 on anchors and keeps $9 to complete the roster at room prices.
- Philosophy: Built from the live board: stars and scrubs shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 2%, RB 53%, WR 39%, TE 2%, DST 0%, K 0%, bench 4%.
- Target prices (expect / walk-up to win): Jahmyr Gibbs $76 (win by $84), Puka Nacua $79 (win by $87).
  Targets $155 + reserve $11 = $166 of $200 (completable).

  Most common roster cores this strategy landed:
  - 13% of drafts: Puka Nacua + Jahmyr Gibbs - avg spend $200, avg record 11.2-2.8.
  - 8% of drafts: Jahmyr Gibbs + Bijan Robinson - avg spend $200, avg record 11.4-2.6.
  - 6.3% of drafts: Jahmyr Gibbs + Christian McCaffrey - avg spend $200, avg record 12-2.

  Players you land most:
  - Sam LaPorta (TE): 88.5% of drafts, avg $1.
  - Courtland Sutton (WR): 86% of drafts, avg $1.
  - Jameson Williams (WR): 84.8% of drafts, avg $1.
  - Tony Pollard (RB): 77.5% of drafts, avg $1.
  - Rhamondre Stevenson (RB): 75% of drafts, avg $1.
  - Jahmyr Gibbs (RB): 67.5% of drafts, avg $96.
  - Zach Charbonnet (RB): 66% of drafts, avg $1.
  - Houston Texans (DEF): 63.8% of drafts, avg $1.

### 3. Balanced Auction  (balanced-auction, balanced risk)

Pool-generated Balanced Auction: 8 anchors (RB/WR/TE/QB/DEF), rest at room price.

- Projected record: 10.2-3.8 (best 14-0, worst 4-10).
- Why: The board supports paying up for Omarion Hampton (~$37), Josh Allen (~$36), Trey McBride (~$35). RB runs COOL (0.84x room vs national). This shape spends $194 on anchors and keeps $6 to complete the roster at room prices.
- Philosophy: Built from the live board: balanced shape emerged as a completable $200 roster given the current pool.
- Budget split: QB 18%, RB 33%, WR 24%, TE 20%, DST 3%, K 0%, bench 2%.
- Target prices (expect / walk-up to win): Omarion Hampton $37 (win by $41), Josh Allen $36 (win by $40), Trey McBride $49 (win by $54), Jeremiyah Love $57 (win by $63).
  Targets $179 + reserve $9 = $188 of $200 (completable).

  Most common roster cores this strategy landed:
  - 5.3% of drafts: Jahmyr Gibbs + Christian McCaffrey - avg spend $200, avg record 11.8-2.2.
  - 4.8% of drafts: Jahmyr Gibbs + Bijan Robinson - avg spend $200, avg record 11-3.
  - 4.5% of drafts: Jahmyr Gibbs + Bijan Robinson + Luther Burden III - avg spend $200, avg record 11.1-2.9.

  Players you land most:
  - Sam LaPorta (TE): 86.3% of drafts, avg $1.
  - Courtland Sutton (WR): 80.5% of drafts, avg $1.
  - Jameson Williams (WR): 76.8% of drafts, avg $1.
  - Rhamondre Stevenson (RB): 70% of drafts, avg $1.
  - Tony Pollard (RB): 67.8% of drafts, avg $1.
  - Houston Texans (DEF): 62.5% of drafts, avg $1.
  - Carnell Tate (WR): 58% of drafts, avg $1.
  - Zach Charbonnet (RB): 55.8% of drafts, avg $1.

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
- **Drake London** (ATL, bye 11) - $41-$48 (base $45) league band, land odds 0%.
  Let him go - room pays ~$48 over his ~$41 worth here.  [-$7 TAX]
- **Zay Flowers** (BAL, bye 13) - $24-$41 (base $33) league band, land odds 6.3%.
  Target - worth ~$41, room pays ~$24. Win him at or under $33. Watch the injury tag - trim the bid.  [+$17 POCKET, INJ QUESTIONABLE]
- **Garrett Wilson** (NYJ, bye 13) - $23-$40 (base $32) league band, land odds 12.5%.
  Target - worth ~$40, room pays ~$23. Win him at or under $32.  [+$17 POCKET]

### TE

- **Brock Bowers** (LV, bye 13) - $49-$53 (base $51) league band, land odds 18.8%.
  Target - worth ~$53, room pays ~$49. Win him at or under $51.  [+$4 POCKET]
- **Trey McBride** (ARI, bye 14) - $40-$49 (base $45) league band, land odds 18.8%.
  Let him go - room pays ~$49 over his ~$40 worth here.  [-$9 TAX]
- **Colston Loveland** (CHI, bye 10) - $28-$35 (base $32) league band, land odds 6.3%.
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
