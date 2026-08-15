# D0 Craft — Design Notes

## DECISION (Joe, 2026-08-14): Option B — Blacked-Out Shield is the ANCHOR
Joe picked B over A. B goes all the way; A stays on file as the alternate identity piece.
Files: `optionB_shield.html` / `optionB_shield.png` (generator: scratchpad `build-craftB.js`).
- Palette: field `#0C1524→#05070C` · cards steel-blue `#26364E→#1A2637` · steel titles chrome-silver
  · accent = muted brick red `#A63C41` (RUN / left bar / active nav / tallest sim bar) · info = steel-blue `#5FA8E0`.
- Type: Kanit (broadcast display) + Hanken Grotesk (UI). Blacked-out stadium shield photo as bg (`shield-bg.png`).
- Turn-8 fixes applied: cards lifted off the field (were blue-on-blue); red muted (was fire-engine bright).
- Readability fix (Joe: "embossed text hard to read when small"): `.silver-bevel` floor raised to
  `#FFFFFF→#EFF4FA→#D3DEEA`, shadow softened to `0 1px 0 rgba(0,0,0,0.30)` — keeps sheen, stays legible.
- ICON DIRECTION (Joe, 2026-08-14): **DUOTONE** — muted-red accent chip (`bg-ffred/15 border border-ffred/45`)
  + white glyph (`text-white`). Picked over outline + etched-steel. Baked into `build-craftB.js` so
  `optionB_shield.html/.png` is the single canonical locked screen (icon_*.html were the exploration, now superseded).

### D0 GATE — CLOSED (Joe, 2026-08-14)
- Palette ✓ (Shield / Option B) · Type ✓ (Kanit + Hanken) · Icons ✓ (duotone).
- Canonical locked screen: `optionB_shield.png`. D1 is unblocked.

## Option A — League Trophy (LOCKED as an option)
Files: `optionA_trophy.html` / `optionA_trophy.png`
Palette (Joe-supplied): bg `#080909` · card `#12100D` · border `#463425` · bronze `#9B683E` · CTA `#CB935F`
(+ oak honey wood + engraved gold `#CBA24E/#EBCE86` added to match the trophy)
Type: Cinzel (engraved serif titles) + Hanken Grotesk (UI). Trophy photo as bg (`trophy-bg.png`).

### OPEN REFINEMENT (Joe, 2026-08-14) — MUST DO before Option A is final
- **REAL oak wood texture**, like the actual trophy — not a CSS gradient approximation. The header/nav
  (and card frames) should read as genuine grained oak: visible wood grain, growth lines, warmth,
  slight sheen. Consider using a real oak wood texture image (cropped from the trophy photo or a real
  wood photo) tiled/framed, rather than `repeating-linear-gradient`.
- **REAL plaque/engraving:** the cards should look like actual engraved plaques — real metal/black-plate
  material with lettering that looks physically engraved (bevel, incised depth, light catching the cut
  edges), like the CHAMPIONS plate and the carved NFFL oak shield. Not flat text with a drop shadow.
- **Capture the real essence + textures of the trophy** throughout: oak grain, glossy black nameplate,
  brass/gold incised engraving, carved oak shield. Materials must feel physical, not vector-flat.
