# 🏈 Fantasy Football — MASTER REFERENCE (The Nasties)

**Purpose:** one canonical reference for Joe Rasar's fantasy football league — league config, roster makeup, every owner/drafter, all league lore + records, and scoring — for ANY future fantasy-football project. Read this before hardcoding league facts anywhere.

**Snapshot date:** 2026-07-12. **This is a consolidated snapshot, not the live source.** If league settings change, update the live sources below AND this file.

**Stored in two synced copies (keep them identical when editing):**
- `fantasy_auction_auctioneer/FANTASY_FOOTBALL_MASTER.md` (canonical)
- `fantasy_football_draft_app/FANTASY_FOOTBALL_MASTER.md` (copy)

**Live sources of truth (verify against these, never a session header):**
| Fact | Live source |
|------|-------------|
| League config + roster + scoring | `fantasy_football_draft_app/src/components/prep/league-config-form.tsx` → `PRESETS.joe`, and `.../src/lib/scoring-presets.ts` → `JOES_ESPN_SCORING` |
| Roster (auctioneer copy) | `fantasy_auction_auctioneer/src/data/nasties-league.json` (`rosterSlots`) + `.../src/types/index.ts` `DEFAULT_ROSTER_SLOTS` |
| Owner lore / draft history | `history.json` — byte-identical in both apps (`.../src/data/history.json`) |

---

## League identity

| | |
|---|---|
| **League** | The Nasties |
| **Platform** | ESPN |
| **Format** | Auction, full redraft (no keepers) |
| **Teams** | **12** |
| **Budget** | **$200** per team |
| **Scoring** | Full PPR, custom ESPN (see below) |
| **Kickers** | **None** (K:0) |
| **Founded** | 2011 (per `history.json`; some owner lore references "2010" / "17 years" — minor source inconsistency, left unresolved). 15 recorded seasons 2011–2025. |

---

## Roster makeup — **Joe-confirmed 2026-07-12, LOCKED**

Joe's real ESPN Nasties starting lineup + bench:

| Slot | Count |
|------|-------|
| QB | 1 |
| RB | 1 |
| WR | 1 |
| TE | 1 |
| FLEX (RB/WR/TE) | 3 |
| DEF (D/ST) | 1 |
| K | 0 |
| Bench | 5 |
| IR | 1 |
| **Total** | **14** (13 draftable + 1 IR) |

- **IR is EXCLUDED from the auction** (filled in-season with injured players). So an auction draft = **13 draftable slots/team = 156 total picks** (12 × 13).
- Do NOT use the generic 2RB/2WR/1FLEX/6-bench ESPN default — that is wrong for this league (it was seeded by mistake once and caused a fire drill).

---

## The 12 current owners / drafters

Team-name slug (as used in `nasties-league.json`) · known aliases · one-line identity.

| Owner | Aliases | Identity |
|-------|---------|----------|
| **Rasar** | Joe, Joe Rasar | The commissioner/you. Nose for late WR steals (Jefferson $1 '20, Chase $2 '21), blind spot for RB1 overpays. No titles. |
| **Leems** | — | Top-heavy every year. Holds the single richest price on record: **$84 CMC (2020)**. Two-three studs, then a $1 bench. Founding member (2010). |
| **Reggie** | Rey, Rey Reggie | Best single-season point diff in league history (**+35.6, 2011**). Freezes early in the auction. Infamous for "trade-raping" Hendrickson (2014). |
| **Crandall** | — | Panics at QB ($65 Vick '11, $33–39 Josh Allen). Stars-and-scrubs. Founding member (2010). |
| **Kevin** | — | **2024 champion** (first title in ~a decade) with only 8 roster moves, +24.4 diff. Quiet, low-activity. |
| **Bruce** | GOLDEN LIKE A SHOWER, Golden Shower | All-in on one elite RB. **$82 CMC (2024)** → finished last (2nd-highest price on record). Went 1-12 in 2013. |
| **Garrett** | — | High-activity chaos manager. 2020: **$77 Saquon, 92 roster moves, -33.0 diff** — worst-managed season in league history. |
| **Cross** | — | Pays full retail for elite WRs. 2024: **$74 CeeDee Lamb + $70 Ja'Marr Chase** ($144 on 2 WRs). $80 Kamara (2019). |
| **Shultz** | — | Pays up for the #1 TE every single year for a decade (Jimmy Graham → Kelce $21/$42/$61/$49/$43). Founding member (2010). |
| **Moe** | — | **Most cumulative points in league history: 27,473.4 PF all-time.** Quietly the best scorer, rarely dramatic. |
| **Robbie** | Team Johnson | Same team name "Team Johnson" for 17 straight years. Worst modern record (**2-12, 2023**). Rare bargain: $3 Brock Bowers (2024). |
| **Danny** | Moonshine, Moonshine Express | Overpays at TE. **$40 Sam LaPorta (2024)** the same year Kelce went $43. |

**Former/lore-only member (NOT in the current 12):**
- **Hendrickson** (Aaron, Aaron Hendrickson) — decade-long member best known for being on the wrong end of Reggie's infamous 2014 trade. Kept for lore/roast context only.

> ⚠️ Roast-code note: `trash-talk-history.ts` matches current team names to these owner ids by alias. If a current owner (e.g. Danny→moonshine) isn't getting lore-based roasts, check that alias mapping — the DATA for all 12 is present here.

---

## League records & notable history (from lore)

- **Richest single price ever:** Leems, **$84 for Christian McCaffrey (2020)**.
- **2nd richest:** Bruce, **$82 CMC (2024)** → finished last.
- **Best single-season point differential:** Reggie, **+35.6 (2011)**.
- **Most points all-time:** Moe, **27,473.4 PF**.
- **Worst-managed season:** Garrett 2020 — $77 Saquon, 92 moves, -33.0 diff.
- **Worst modern record:** Robbie, **2-12 (2023)**.
- **Most infamous trade:** Reggie fleecing Hendrickson (2014), still referenced.
- **Best steals:** Rasar's $1 Justin Jefferson (2020) & $2 Ja'Marr Chase (2021); Robbie's $3 Brock Bowers (2024).
- **Signature bust:** Rasar's **$73 Le'Veon Bell (2018) → 0.0 FPTS**, finished last.
- **2024 champion:** Kevin.

*(Per-owner detail — championships, worst seasons, signature moments, patterns, and full roast_ammo — is in `history.json`. Every entry above traces to that file; nothing here is invented.)*

---

## Scoring — `JOES_ESPN_SCORING` (Full PPR, custom ESPN)

**Passing:** 0.04/yd (1pt per 25 yds) · TD 4 · INT −2 · 2pt 2 · 40+yd TD +1 · 50+yd TD +2 · 300-yd game +2 · 400-yd game +4
**Rushing:** 0.1/yd · TD 6 · 2pt 2 · 40+yd TD +1 · 50+yd TD +2 · 100-yd game +2 · 200-yd game +4
**Receiving (Full PPR):** 0.1/yd · **1.0/reception** · TD 6 · 2pt 2 · 40+yd TD +1 · 50+yd TD +2 · 100-yd game +2 · 200-yd game +4
**D/ST:** sack 1 · INT 3 · fumble rec 3 · TD 6 · safety 2 · block 2
**Misc:** fumble lost −2

*(Full field-level values live in `scoring-presets.ts` → `JOES_ESPN_SCORING`. No kicker scoring — league has no K.)*

---

## How to use this file

- **New FF project?** Read this first. Copy the roster/teams/scoring from here (or the live sources) — never guess or reuse a generic ESPN default.
- **Changing league settings?** Update the live source files AND this snapshot's date + affected section.
- **Adding lore / new seasons?** `history.json` is the structured home; mirror the highlight here.
