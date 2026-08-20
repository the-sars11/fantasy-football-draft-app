#!/usr/bin/env python3
"""
Extract Nasties league history from the ESPN .docx season exports into one
canonical JSON. This is the PERMANENT source of truth for real end-of-season
finishes and champions (RK=1). Re-run any time new season .docx files are
dropped into source-docx/.

Source:  src/data/league-history/source-docx/*.docx   (raw ESPN exports, archived)
Output:  src/data/league-history/nasties-standings.json

Each docx's Table 0 = "Final Records & Stats":
  RK | Team (Owner) | REC | PF | PA | PF/G | PA/G | DIFF
RK is the FINAL end-of-season rank (playoffs included); RK=1 is the champion.

Usage:  python scripts/extract_league_history.py
Requires: python-docx  (already installed on this machine)
"""
import glob
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SRC = os.path.join(REPO, "src", "data", "league-history", "source-docx")
OUT = os.path.join(REPO, "src", "data", "league-history", "nasties-standings.json")

# Owner display name (from ESPN) -> canonical id used in history.json.
# Only ids that exist in history.json get a real id; others use a slug of the name.
OWNER_ID = {
    "joe rasar": "rasar",
    "garrett hanstead": "garrett",
    "rey salinas": "reggie",
    "john shultz": "shultz",
    "matt lehman": "leems",
    "bruce lehman": "bruce",
    "jason moe": "moe",
    "andy cross": "cross",
    "kevin roth": "kevin",
    "nick crandall": "crandall",
    "robbie johnson": "robbie",
    "aaron hendrickson": "hendrickson",
    "daniel oliver": "oliver",
    "tom wuellner": "wuellner",
    "wuellner wuellner": "wuellner",
    "james rasar": "james-rasar",
    "joe wilbur": "wilbur",
    "mario manrique": "manrique",
}


def owner_id(name: str) -> str:
    key = name.strip().lower()
    if key in OWNER_ID:
        return OWNER_ID[key]
    return re.sub(r"[^a-z0-9]+", "-", key).strip("-")


def num(s):
    s = (s or "").strip().replace("+", "")
    if s in ("", "-", "--"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_team_cell(text: str):
    """'UNCLE RICO  (Matt Lehman)' -> ('UNCLE RICO', 'Matt Lehman')."""
    text = " ".join(text.split())
    m = re.match(r"^(.*?)\s*\(([^)]+)\)\s*$", text)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return text, ""


def main():
    from docx import Document

    files = sorted(glob.glob(os.path.join(SRC, "*.docx")))
    if not files:
        raise SystemExit(f"No .docx found in {SRC}")

    seasons = []
    for f in files:
        year = int(re.search(r"(\d{4})", os.path.basename(f)).group(1))
        doc = Document(f)
        table = doc.tables[0]
        header = [c.text.strip() for c in table.rows[0].cells]
        # tolerate the trailing empty header column
        cols = [h for h in header if h]
        standings = []
        for row in table.rows[1:]:
            cells = [c.text.strip() for c in row.cells]
            rk = cells[0].strip()
            if not rk.isdigit():
                continue
            team_name, owner = parse_team_cell(cells[1])
            standings.append(
                {
                    "rank": int(rk),
                    "team": team_name,
                    "owner": owner,
                    "ownerId": owner_id(owner),
                    "record": cells[2].strip() if len(cells) > 2 else "",
                    "pf": num(cells[3]) if len(cells) > 3 else None,
                    "pa": num(cells[4]) if len(cells) > 4 else None,
                    "pfg": num(cells[5]) if len(cells) > 5 else None,
                    "pag": num(cells[6]) if len(cells) > 6 else None,
                    "diff": num(cells[7]) if len(cells) > 7 else None,
                }
            )
        standings.sort(key=lambda r: r["rank"])
        champ = next((r for r in standings if r["rank"] == 1), None)
        runner = next((r for r in standings if r["rank"] == 2), None)
        seasons.append(
            {
                "year": year,
                "teams": len(standings),
                "columns": cols,
                "champion": {"owner": champ["owner"], "ownerId": champ["ownerId"], "team": champ["team"]} if champ else None,
                "runnerUp": {"owner": runner["owner"], "ownerId": runner["ownerId"], "team": runner["team"]} if runner else None,
                "standings": standings,
            }
        )

    seasons.sort(key=lambda s: s["year"])

    # championship tally by ownerId
    titles = {}
    for s in seasons:
        if s["champion"]:
            oid = s["champion"]["ownerId"]
            titles.setdefault(oid, {"owner": s["champion"]["owner"], "years": []})
            titles[oid]["years"].append(s["year"])
    champ_counts = sorted(
        ({"ownerId": k, "owner": v["owner"], "titles": len(v["years"]), "years": v["years"]} for k, v in titles.items()),
        key=lambda x: (-x["titles"], x["owner"]),
    )

    out = {
        "league": "The Nasties",
        "source": "ESPN season history .docx exports (src/data/league-history/source-docx/)",
        "note": "RK is final end-of-season rank (playoffs included). RK=1 = champion. Authoritative real finishes.",
        "yearsCovered": [s["year"] for s in seasons],
        "championshipCounts": champ_counts,
        "seasons": seasons,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)

    print(f"Wrote {OUT}")
    print(f"Seasons: {out['yearsCovered'][0]}-{out['yearsCovered'][-1]} ({len(seasons)} years)")
    print("\nChampionships (most to fewest):")
    for c in champ_counts:
        print(f"  {c['titles']}  {c['owner']:<18} {c['years']}")


if __name__ == "__main__":
    main()
