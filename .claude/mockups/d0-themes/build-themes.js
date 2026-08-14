// D0 session 2 — stamp the IDENTICAL Stitch body into 4 sports-app palettes.
// Only the <head> tokens/fonts and the accent-glow rgb change. Body markup is byte-identical
// except a mechanical recolor of the gold glow literal 212,175,55 -> variant accent rgb.
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\Users\\jrasa\\AI Projects\\fantasy_football_draft_app\\UI\\stitch_multi_theme_layout_variations\\code.html';
const OUT = 'C:\\Users\\jrasa\\AI Projects\\fantasy_football_draft_app\\.claude\\mockups\\d0-themes';

const raw = fs.readFileSync(SRC, 'utf8');

// Extract the inner body (everything between <body ...> and </body>), plus the body's own class attr.
const bodyOpenMatch = raw.match(/<body([^>]*)>/);
const bodyAttrs = bodyOpenMatch[1]; // includes leading space + class="..."
const innerStart = raw.indexOf('>', raw.indexOf('<body')) + 1;
const innerEnd = raw.lastIndexOf('</body>');
let body = raw.slice(innerStart, innerEnd);

const variants = [
  {
    id: 'A_sunday_red', name: 'A — Sunday Red', ref: 'ESPN app',
    ground: '#0C0D10', surface: '#17191E', border: '#2B2E35',
    accent: '#E8202A', accentLight: '#FF5A60', accentDark: '#A8121A',
    text: '#F5F6F8', accentRGB: '232,32,42',
    display: 'Archivo', displayWghts: '600;700;800',
    note: 'graphite black + signal red · broadcast/scoreboard energy',
  },
  {
    id: 'B_field_green', name: 'B — Field Green', ref: 'DraftKings',
    ground: '#080A08', surface: '#121711', border: '#223019',
    accent: '#22A85A', accentLight: '#3FD07E', accentDark: '#12673A',
    text: '#F1F6F2', accentRGB: '34,168,90',
    display: 'Manrope', displayWghts: '600;700;800',
    note: 'near-black + controlled emerald (not lime-neon) · turf / sportsbook',
  },
  {
    id: 'C_sports_steel', name: 'C — Sports Steel', ref: 'Apple Sports',
    ground: '#060708', surface: '#141518', border: '#2A2C31',
    accent: '#CBD5E1', accentLight: '#F1F5F9', accentDark: '#64748B',
    text: '#F8FAFC', accentRGB: '125,211,252', // ice-blue for glows
    display: 'Space Grotesk', displayWghts: '500;600;700',
    note: 'true black + brushed silver, one ice-blue accent · premium data',
  },
  {
    id: 'D_courtside_orange', name: 'D — Courtside Orange', ref: 'NBA app',
    ground: '#121110', surface: '#1E1B17', border: '#34291C',
    accent: '#F26D21', accentLight: '#FF9A52', accentDark: '#B84A0E',
    text: '#FBF6F1', accentRGB: '242,109,33',
    display: 'Barlow Semi Condensed', displayWghts: '600;700',
    note: 'warm charcoal + tangerine · jersey / basketball broadcast',
  },
];

function head(v) {
  const fam = v.display.replace(/ /g, '+');
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Gridiron Research — ${v.name}</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script>
  tailwind.config = {
    theme: { extend: {
      colors: {
        'royal-navy': '${v.ground}',
        'royal-gold': '${v.accent}',
        'royal-gold-light': '${v.accentLight}',
        'royal-gold-dark': '${v.accentDark}',
        'ivory': '${v.text}',
        'navy-surface': '${v.surface}',
        'navy-border': '${v.border}'
      },
      fontFamily: {
        sans: ['Inter','ui-sans-serif','system-ui','sans-serif'],
        serif: ['${v.display}','Inter','ui-sans-serif','sans-serif'],
        mono: ['JetBrains Mono','ui-monospace','Menlo','monospace'],
      }
    }}
  }
</script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=${fam}:wght@${v.displayWghts}&display=swap');
  body { background-color: ${v.ground}; color: ${v.text}; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  .glass-panel { background: rgba(${hexToRgb(v.surface)}, 0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(${v.accentBorderRGB || hexToRgb(v.accent)}, 0.2); }
  .gold-gradient-text { background: linear-gradient(135deg, ${v.accentLight} 0%, ${v.accent} 50%, ${v.accentDark} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .gold-gradient-border { position: relative; background: ${v.surface}; background-clip: padding-box; border: 1px solid transparent; border-radius: 1rem; }
  .gold-gradient-border::before { content:''; position:absolute; top:0;right:0;bottom:0;left:0; z-index:-1; margin:-1px; border-radius:inherit; background: linear-gradient(to bottom, rgba(${hexToRgb(v.accent)}, 0.5), rgba(${hexToRgb(v.accent)}, 0.1)); }
  .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
</style>
</head>
<body${bodyAttrs}>`;
}

function hexToRgb(h) {
  const n = h.replace('#','');
  const r = parseInt(n.slice(0,2),16), g = parseInt(n.slice(2,4),16), b = parseInt(n.slice(4,6),16);
  return `${r},${g},${b}`;
}

for (const v of variants) {
  // Recolor the hardcoded gold glow literal in the body to the variant accent glow color.
  let vbody = body.split('212,175,55').join(v.accentRGB).split('212, 175, 55').join(v.accentRGB);
  const html = head(v) + vbody + '</body></html>';
  fs.writeFileSync(path.join(OUT, v.id + '.html'), html, 'utf8');
  console.log('wrote', v.id + '.html', html.length, 'bytes');
}
console.log('DONE. body len (shared):', body.length);
