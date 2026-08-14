// D0 session 2 — ROUND 2. Two-color elegant palettes + genuinely distinct type.
// Same Stitch layout. Shared body edited ONCE to thread a highlight token (hl) through
// the status line / accent bar / sim spark / Monte-Carlo tag, then stamped per-variant.
// Body stays identical across the 4 — only token VALUES + fonts change.
const fs = require('fs');
const path = require('path');

const SRC = 'C:\\Users\\jrasa\\AI Projects\\fantasy_football_draft_app\\UI\\stitch_multi_theme_layout_variations\\code.html';
const OUT = 'C:\\Users\\jrasa\\AI Projects\\fantasy_football_draft_app\\.claude\\mockups\\d0-themes-v2';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const raw = fs.readFileSync(SRC, 'utf8');
const bodyOpenMatch = raw.match(/<body([^>]*)>/);
const bodyAttrs = bodyOpenMatch[1];
const innerStart = raw.indexOf('>', raw.indexOf('<body')) + 1;
const innerEnd = raw.lastIndexOf('</body>');
let body = raw.slice(innerStart, innerEnd);

// --- shared-body edits: weave the highlight token in elegantly (applied once) ---
// 1) fresh status -> highlight (elegant second color at top)
body = body.split('text-green-400/70').join('text-hl/70');
body = body.split('text-green-400').join('text-hl');
body = body.split('bg-green-500').join('bg-hl');
// 2) pull-card left accent bar -> two-tone highlight->primary
body = body.split('from-royal-gold-light via-royal-gold to-transparent')
           .join('from-hl via-royal-gold to-transparent');
// 3) sim spark: tallest two bars -> highlight, so it ramps primary->highlight
body = body.split('<div class="w-1 bg-royal-gold rounded-t h-6"></div>')
           .join('<div class="w-1 bg-hl rounded-t h-6"></div>');
body = body.split('<div class="w-1 bg-royal-gold/80 rounded-t h-5"></div>')
           .join('<div class="w-1 bg-hl/70 rounded-t h-5"></div>');
// 4) Monte Carlo tag -> highlight (only the mt-2 instance)
body = body.split('text-royal-gold/60 uppercase mt-2')
           .join('text-hl/90 uppercase mt-2');

const variants = [
  {
    id: '1_broadcast_crimson', name: 'Broadcast Crimson', ref: 'F1 TV / ESPN',
    ground:'#0D0B0C', surface:'#17131A', border:'#2C2530',
    primary:'#D11A3A', primaryLight:'#FF4D66', primaryDark:'#8E0E24', primaryRGB:'209,26,58',
    hl:'#37E0D0', hlLight:'#7FF0E6', hlDark:'#1FA598', hlRGB:'55,224,208',
    text:'#F6EEEA',
    display:'Big Shoulders Display', displayWghts:'500;600;700;800',
    note:'crimson + cyan highlight · Big Shoulders (industrial-tall)',
  },
  {
    id: '2_turf_pine', name: 'Turf Pine', ref: 'golf broadcast / DraftKings',
    ground:'#08120E', surface:'#0F1F18', border:'#1C3A2C',
    primary:'#12855F', primaryLight:'#2FBE88', primaryDark:'#0A5C40', primaryRGB:'18,133,95',
    hl:'#CDF24B', hlLight:'#E4FA8C', hlDark:'#9BC021', hlRGB:'205,242,75',
    text:'#EEF6F0',
    display:'Bebas Neue', displayWghts:'400',
    note:'pine + chartreuse highlight · Bebas Neue (ultra-condensed)',
  },
  {
    id: '3_league_indigo', name: 'League Indigo', ref: 'NBA League Pass',
    ground:'#0B0A14', surface:'#16142A', border:'#2A2547',
    primary:'#5A54E6', primaryLight:'#8B86FF', primaryDark:'#3A34B0', primaryRGB:'90,84,230',
    hl:'#FF6B5A', hlLight:'#FF9488', hlDark:'#D84433', hlRGB:'255,107,90',
    text:'#EFEFFA',
    display:'Space Grotesk', displayWghts:'500;600;700',
    note:'slate-indigo + coral highlight · Space Grotesk (geometric)',
  },
  {
    id: '4_copper_teal', name: 'Copper Teal', ref: 'Tracksmith / athleisure',
    ground:'#120E10', surface:'#1E1618', border:'#352730',
    primary:'#C56B4A', primaryLight:'#E4906F', primaryDark:'#96482C', primaryRGB:'197,107,74',
    hl:'#2DD4BF', hlLight:'#6BE8D8', hlDark:'#159687', hlRGB:'45,212,191',
    text:'#FBF3EF',
    display:'Syne', displayWghts:'600;700;800',
    note:'terracotta-copper + teal highlight · Syne (quirky-humanist)',
  },
];

function hexToRgb(h){const n=h.replace('#','');return `${parseInt(n.slice(0,2),16)},${parseInt(n.slice(2,4),16)},${parseInt(n.slice(4,6),16)}`;}

function head(v){
  const fam=v.display.replace(/ /g,'+');
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Gridiron Research — ${v.name}</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script>
  tailwind.config = { theme: { extend: {
    colors: {
      'royal-navy':'${v.ground}','navy-surface':'${v.surface}','navy-border':'${v.border}',
      'royal-gold':'${v.primary}','royal-gold-light':'${v.primaryLight}','royal-gold-dark':'${v.primaryDark}',
      'hl':'${v.hl}','hl-light':'${v.hlLight}','hl-dark':'${v.hlDark}',
      'ivory':'${v.text}'
    },
    fontFamily: {
      sans:['Inter','ui-sans-serif','system-ui','sans-serif'],
      serif:['${v.display}','Inter','ui-sans-serif','sans-serif'],
      mono:['JetBrains Mono','ui-monospace','Menlo','monospace'],
    }
  }}}
</script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=${fam}:wght@${v.displayWghts}&display=swap');
  body{background-color:${v.ground};color:${v.text};font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
  .glass-panel{background:rgba(${hexToRgb(v.surface)},0.8);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(${v.primaryRGB},0.2);}
  .gold-gradient-text{background:linear-gradient(135deg,${v.primaryLight} 0%,${v.primary} 55%,${v.primaryDark} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .gold-gradient-border{position:relative;background:${v.surface};background-clip:padding-box;border:1px solid transparent;border-radius:1rem;}
  .gold-gradient-border::before{content:'';position:absolute;top:0;right:0;bottom:0;left:0;z-index:-1;margin:-1px;border-radius:inherit;background:linear-gradient(to bottom,rgba(${v.primaryRGB},0.5),rgba(${v.primaryRGB},0.1));}
  .pb-safe{padding-bottom:env(safe-area-inset-bottom);}
</style>
</head>
<body${bodyAttrs}>`;
}

for (const v of variants){
  let vbody = body.split('212,175,55').join(v.primaryRGB).split('212, 175, 55').join(v.primaryRGB);
  vbody = vbody.split('34,197,94').join(v.hlRGB); // fresh-dot glow -> highlight
  const html = head(v)+vbody+'</body></html>';
  fs.writeFileSync(path.join(OUT, v.id+'.html'), html, 'utf8');
  console.log('wrote', v.id+'.html', html.length);
}
console.log('DONE. shared body len:', body.length);
