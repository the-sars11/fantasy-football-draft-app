# Nasties Backtest — Draft Quality on Actual Points

Each team scored **as drafted** (exact picks, no waivers/trades) on that season's **actual weekly PPR points**, best legal lineup each week (QB1/RB1/WR1/TE1/FLEX3/DEF1), weeks 1-14. Data: local draft bundle + Sleeper historical stats. Injuries are baked in via real games played. Ranking = total points within the year (schedule luck removed).

Years attempted: 2010, 2011, 2012, 2013, 2014, 2015, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025.


**Data confidence:** 2010, 2011 are EXCLUDED from the concentration analysis — Sleeper's NFL player map omits players who retired before ~2012, so those drafts lose real studs that cannot be name-joined (unmatched > $100). Clean years used: 2012, 2013, 2014, 2015, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025. Per-year unmatched $: 2010=$413, 2011=$191, 2012=$83, 2013=$70, 2014=$67, 2015=$30, 2017=$21, 2018=$28, 2019=$75, 2020=$22, 2021=$17, 2022=$18, 2023=$15, 2024=$16, 2025=$0. Real end-of-season finishes for every year live in `src/data/league-history/nasties-standings.json`.


## The question: does spending big on two players win?

| Group | avg top-2 spend | avg as-drafted finish | made top-6 |
|---|---|---|---|
| HIGH concentration (top third) | 64% of budget | 6.77 / 12 | 48% |
| LOW concentration (bottom third) | 42% of budget | 5.96 / 12 | 56% |

Correlation(top-2 spend %, finish rank) = **0.123** (positive = concentration finishes worse). Sample: 156 team-seasons across 13 clean years; directional, not conclusive.


## Rasar (you) — as-drafted finishes

| Year | As-drafted finish | Total pts | Top-2 spend |
|---|---|---|---|
| 2010 | 2 / 12 | 1384 | 32% ($63) |
| 2011 | 2 / 12 | 1592 | 47% ($93) |
| 2012 | 6 / 12 | 1507 | 52% ($104) |
| 2013 | 11 / 12 | 1420 | 60% ($119) |
| 2014 | 2 / 12 | 1981 | 56% ($111) |
| 2015 | 10 / 12 | 1335 | 62% ($124) |
| 2017 | 4 / 12 | 1541 | 51% ($101) |
| 2018 | 12 / 12 | 1436 | 64% ($127) |
| 2019 | 1 / 12 | 1827 | 49% ($98) |
| 2020 | 1 / 12 | 1817 | 55% ($110) |
| 2021 | 10 / 12 | 1454 | 62% ($123) |
| 2022 | 1 / 12 | 1693 | 45% ($89) |
| 2023 | 1 / 12 | 1794 | 50% ($99) |
| 2024 | 3 / 12 | 1665 | 38% ($75) |
| 2025 | 3 / 12 | 1682 | 29% ($58) |

## Biggest draft-capital busts (>= $30, worst points-per-dollar)

| Year | Owner | Player | Price | Actual pts (wk1-14) |
|---|---|---|---|---|
| 2010 | Reggie | Cedric Benson | $38 | 0 |
| 2010 | Shultz | Ryan Grant | $35 | 0 |
| 2010 | Shultz | Dallas Clark | $30 | 0 |
| 2010 | Jason | Rashard Mendenhall | $37 | 0 |
| 2011 | Shultz | Felix Jones | $30 | 0 |
| 2011 | Robbie | Reshard Medenhall | $50 | 0 |
| 2017 | Leems | David Johnson | $78 | 0 |
| 2018 | Rasar | Le'Veon Bell | $73 | 0 |
| 2018 | Bruce | Jerick McKinnon | $30 | 0 |
| 2018 | Garrett | David Johnson | $76 | 0 |
| 2019 | Leems | Johnson,David | $50 | 0 |
| 2014 | Crandall | Adrian Peterson | $66 | 11 |

## Full standings by year


### 2010

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Funk | 1563 | $40 | $80 | 40% |
| 2 | Rasar | 1384 | $33 | $63 | 32% |
| 3 | Robbie | 1314 | $35 | $66 | 33% |
| 4 | Reggie | 1290 | $42 | $81 | 41% |
| 5 | Shultz | 1261 | $75 | $110 | 55% |
| 6 | Cross | 1190 | $59 | $99 | 50% |
| 7 | Wilbur | 1171 | $75 | $120 | 60% |
| 8 | Jason | 1078 | $65 | $102 | 51% |
| 9 | Aaron | 1052 | $69 | $119 | 60% |
| 10 | Crandall | 1042 | $49 | $92 | 46% |
| 11 | Leems | 905 | $74 | $118 | 59% |
| 12 | Bruce | 868 | $47 | $89 | 45% |

### 2011

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Reggie | 1683 | $67 | $102 | 51% |
| 2 | Rasar | 1592 | $53 | $93 | 47% |
| 3 | Shultz | 1532 | $41 | $76 | 38% |
| 4 | Bruce | 1500 | $60 | $83 | 42% |
| 5 | Crandall | 1363 | $65 | $102 | 51% |
| 6 | Funk | 1256 | $73 | $118 | 59% |
| 7 | Robbie | 1248 | $60 | $110 | 55% |
| 8 | Jason | 1235 | $64 | $115 | 57% |
| 9 | Cross | 1158 | $68 | $127 | 64% |
| 10 | Wilbur | 1066 | $69 | $110 | 55% |
| 11 | Leems | 1027 | $50 | $99 | 50% |
| 12 | Aaron | 1008 | $39 | $78 | 39% |

### 2012

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Shultz | 1706 | $42 | $83 | 42% |
| 2 | Funk | 1615 | $65 | $108 | 54% |
| 3 | Wilbur | 1569 | $51 | $86 | 43% |
| 4 | Reggie | 1541 | $68 | $112 | 56% |
| 5 | Jason | 1529 | $60 | $103 | 52% |
| 6 | Rasar | 1507 | $73 | $104 | 52% |
| 7 | Cross | 1487 | $73 | $127 | 64% |
| 8 | Crandall | 1384 | $70 | $99 | 50% |
| 9 | Robbie | 1359 | $46 | $92 | 46% |
| 10 | Bruce | 1358 | $50 | $93 | 47% |
| 11 | Aaron | 1322 | $44 | $80 | 40% |
| 12 | Leems | 1315 | $46 | $89 | 45% |

### 2013

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Robbie | 1838 | $60 | $92 | 46% |
| 2 | Shultz | 1835 | $47 | $87 | 44% |
| 3 | Wuellner | 1744 | $54 | $86 | 43% |
| 4 | Jason | 1702 | $54 | $99 | 50% |
| 5 | Cross | 1603 | $64 | $120 | 60% |
| 6 | Leems | 1546 | $61 | $105 | 53% |
| 7 | Reggie | 1541 | $63 | $112 | 56% |
| 8 | Bruce | 1526 | $35 | $62 | 31% |
| 9 | Funk | 1513 | $54 | $100 | 50% |
| 10 | Aaron | 1511 | $60 | $103 | 52% |
| 11 | Rasar | 1420 | $70 | $119 | 60% |
| 12 | Crandall | 1397 | $66 | $107 | 54% |

### 2014

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Wuellner | 2027 | $42 | $81 | 41% |
| 2 | Rasar | 1981 | $61 | $111 | 56% |
| 3 | Shultz | 1820 | $40 | $79 | 40% |
| 4 | Aaron | 1684 | $60 | $120 | 60% |
| 5 | Jason | 1604 | $37 | $71 | 36% |
| 6 | Cross | 1590 | $67 | $112 | 56% |
| 7 | Robbie | 1583 | $42 | $81 | 41% |
| 8 | Funk | 1577 | $61 | $87 | 44% |
| 9 | Reggie | 1483 | $71 | $107 | 54% |
| 10 | Leems | 1280 | $68 | $97 | 49% |
| 11 | Crandall | 1241 | $66 | $102 | 51% |
| 12 | Bruce | 1233 | $48 | $83 | 42% |

### 2015

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Shultz | 1866 | $45 | $89 | 45% |
| 2 | Wuellner | 1705 | $62 | $117 | 59% |
| 3 | Leems | 1668 | $55 | $77 | 39% |
| 4 | Jason | 1663 | $66 | $121 | 61% |
| 5 | Bruce | 1658 | $48 | $94 | 47% |
| 6 | Funk | 1613 | $62 | $90 | 45% |
| 7 | Cross | 1510 | $65 | $107 | 54% |
| 8 | Robbie | 1396 | $63 | $107 | 54% |
| 9 | Aaron | 1371 | $57 | $111 | 56% |
| 10 | Rasar | 1335 | $65 | $124 | 62% |
| 11 | Crandall | 1330 | $51 | $93 | 47% |
| 12 | Reggie | 1231 | $66 | $128 | 64% |

### 2017

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Thomas | 1657 | $79 | $117 | 59% |
| 2 | Shultz | 1603 | $47 | $72 | 36% |
| 3 | Garrett | 1594 | $55 | $89 | 45% |
| 4 | Rasar | 1541 | $55 | $101 | 51% |
| 5 | Moe | 1524 | $63 | $108 | 54% |
| 6 | Robbie | 1475 | $55 | $94 | 47% |
| 7 | Cross | 1456 | $69 | $129 | 65% |
| 8 | Reggie | 1437 | $67 | $101 | 51% |
| 9 | Bruce | 1384 | $52 | $92 | 46% |
| 10 | Crandall | 1365 | $52 | $97 | 49% |
| 11 | Kevin | 1322 | $80 | $142 | 71% |
| 12 | Leems | 675 | $78 | $107 | 54% |

### 2018

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Reggie | 1847 | $62 | $123 | 62% |
| 2 | Crandall | 1810 | $54 | $102 | 51% |
| 3 | Shultz | 1782 | $70 | $110 | 55% |
| 4 | Kevin | 1744 | $77 | $142 | 71% |
| 5 | Cross | 1694 | $69 | $134 | 67% |
| 6 | Robbie | 1577 | $49 | $93 | 47% |
| 7 | Thomas | 1576 | $60 | $95 | 48% |
| 8 | Garrett | 1573 | $76 | $137 | 69% |
| 9 | Moe | 1498 | $70 | $96 | 48% |
| 10 | Leems | 1487 | $74 | $129 | 65% |
| 11 | Bruce | 1448 | $42 | $72 | 36% |
| 12 | Rasar | 1436 | $73 | $127 | 64% |

### 2019

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Rasar | 1827 | $51 | $98 | 49% |
| 2 | Bruce | 1594 | $78 | $147 | 74% |
| 3 | Robbie | 1594 | $51 | $93 | 47% |
| 4 | Moe | 1557 | $61 | $101 | 51% |
| 5 | Kevin | 1555 | $54 | $99 | 50% |
| 6 | Thomas | 1491 | $60 | $113 | 56% |
| 7 | Cross | 1470 | $80 | $135 | 68% |
| 8 | Shultz | 1428 | $51 | $93 | 47% |
| 9 | Leems | 1375 | $50 | $94 | 47% |
| 10 | Reggie | 1294 | $79 | $143 | 72% |
| 11 | Crandall | 1293 | $65 | $107 | 54% |
| 12 | Garrett | 1178 | $51 | $77 | 39% |

### 2020

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Rasar | 1817 | $61 | $110 | 55% |
| 2 | Moe | 1761 | $54 | $103 | 52% |
| 3 | Cross | 1753 | $69 | $133 | 67% |
| 4 | Leems | 1701 | $84 | $108 | 54% |
| 5 | Bruce | 1602 | $52 | $96 | 48% |
| 6 | Kevin | 1596 | $53 | $91 | 46% |
| 7 | Crandall | 1575 | $70 | $124 | 62% |
| 8 | Robbie | 1548 | $70 | $111 | 56% |
| 9 | Thomas | 1455 | $60 | $102 | 51% |
| 10 | Shultz | 1410 | $50 | $84 | 42% |
| 11 | Reggie | 1251 | $74 | $114 | 57% |
| 12 | Garrett | 979 | $77 | $133 | 67% |

### 2021

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Robbie | 1759 | $62 | $114 | 57% |
| 2 | Garrett | 1692 | $43 | $74 | 37% |
| 3 | Shultz | 1651 | $61 | $96 | 48% |
| 4 | Kevin | 1640 | $40 | $75 | 38% |
| 5 | Leems | 1630 | $60 | $102 | 51% |
| 6 | Crandall | 1602 | $79 | $144 | 72% |
| 7 | Bruce | 1526 | $68 | $109 | 55% |
| 8 | Cross | 1487 | $66 | $130 | 65% |
| 9 | Moonshine | 1467 | $69 | $124 | 62% |
| 10 | Rasar | 1454 | $81 | $123 | 62% |
| 11 | Moe | 1448 | $79 | $112 | 56% |
| 12 | Reggie | 1315 | $68 | $127 | 64% |

### 2022

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Rasar | 1693 | $61 | $89 | 45% |
| 2 | Kevin | 1649 | $75 | $117 | 59% |
| 3 | Shultz | 1619 | $49 | $79 | 40% |
| 4 | Robbie | 1619 | $71 | $107 | 54% |
| 5 | Moonshine | 1611 | $65 | $115 | 57% |
| 6 | Bruce | 1565 | $63 | $120 | 60% |
| 7 | Crandall | 1511 | $39 | $70 | 35% |
| 8 | Leems | 1503 | $57 | $100 | 50% |
| 9 | Cross | 1500 | $75 | $128 | 64% |
| 10 | Reggie | 1458 | $71 | $115 | 57% |
| 11 | Moe | 1377 | $56 | $109 | 55% |
| 12 | Garrett | 1168 | $67 | $112 | 56% |

### 2023

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Rasar | 1794 | $61 | $99 | 50% |
| 2 | Bruce | 1667 | $68 | $132 | 66% |
| 3 | Moonshine | 1639 | $52 | $99 | 50% |
| 4 | Robbie | 1598 | $55 | $105 | 53% |
| 5 | Shultz | 1592 | $43 | $70 | 35% |
| 6 | Leems | 1453 | $71 | $92 | 46% |
| 7 | Crandall | 1451 | $70 | $110 | 55% |
| 8 | Garrett | 1446 | $81 | $114 | 57% |
| 9 | Kevin | 1439 | $49 | $81 | 41% |
| 10 | Moe | 1385 | $59 | $104 | 52% |
| 11 | Cross | 1361 | $85 | $141 | 71% |
| 12 | Reggie | 1303 | $65 | $125 | 63% |

### 2024

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Kevin | 1904 | $67 | $117 | 59% |
| 2 | Cross | 1751 | $74 | $144 | 72% |
| 3 | Rasar | 1665 | $44 | $75 | 38% |
| 4 | Leems | 1617 | $75 | $131 | 66% |
| 5 | Garrett | 1614 | $72 | $114 | 57% |
| 6 | Robbie | 1565 | $58 | $107 | 54% |
| 7 | Shultz | 1517 | $43 | $83 | 42% |
| 8 | Moonshine | 1510 | $53 | $105 | 53% |
| 9 | Reggie | 1488 | $70 | $115 | 57% |
| 10 | Crandall | 1476 | $39 | $72 | 36% |
| 11 | Moe | 1346 | $72 | $127 | 64% |
| 12 | Bruce | 1163 | $82 | $113 | 56% |

### 2025

| # | Owner | Points | Top-1 | Top-2 | Top-2 % |
|---|---|---|---|---|---|
| 1 | Robbie | 1706 | $43 | $83 | 42% |
| 2 | Bruce | 1685 | $71 | $130 | 65% |
| 3 | Rasar | 1682 | $31 | $58 | 29% |
| 4 | Reggie | 1586 | $75 | $127 | 64% |
| 5 | Crandall | 1573 | $79 | $125 | 63% |
| 6 | Garrett | 1529 | $74 | $134 | 67% |
| 7 | Shultz | 1528 | $53 | $93 | 47% |
| 8 | Leems | 1477 | $59 | $98 | 49% |
| 9 | Danny | 1468 | $65 | $102 | 51% |
| 10 | Moe | 1440 | $71 | $129 | 65% |
| 11 | Kevin | 1403 | $54 | $86 | 43% |
| 12 | Cross | 1096 | $77 | $121 | 61% |
