# AAA UI Research and the "Sunday Night Gridiron" System (2026-06)

The research half of the premium UI/UX upgrade: what makes a sports/fantasy app feel S-tier
right now, the personality chosen for this app, the signature "wow" moments, and exactly what
shipped. Personality and scope were chosen by Joe.

## What makes a sports/fantasy app feel S-tier (2025-2026)

- DFS leaders win on speed + clarity + a live pulse, not visual maximalism. Underdog reads as
  clean/low-friction; Sleeper as best-in-class flows; DraftKings leans on live in-game updates.
  ([CBS Sports](https://www.cbssports.com/betting/news/best-dfs-apps/), [FOX Sports](https://www.foxsports.com/stories/betting/best-dfs-apps))
- The most-cited "expensive UI" decision across top-tier design teams is color-temperature
  discipline (every surface and shadow shares one hue/temperature), one type family per role,
  six crafted button states, behavioral density over visual density, and designed motion curves
  (define your curves and durations, do not default them).
  ([Mantlr](https://mantlr.com/blog/stripe-linear-vercel-premium-ui))
- The deepest craft reference is Rauno Freiberg's Devouring Details (simulate physics, motion
  choreography, contained gestures) with the bar that interactions hold up to extreme input,
  not just demo conditions - which is exactly the bar for a rapid-fire live draft.
  ([Devouring Details](https://devouringdetails.com/), [rauno.me](https://rauno.me/))
- Apple Sports / Live Activities is the consumer model for "a game happening now on a glanceable
  surface": a dense, self-updating strip that you stop refreshing.
  ([MacRumors](https://www.macrumors.com/2024/09/16/apple-sports-app-live-activities/))
- Broadcast graphics are the football-specific differentiator. ESPN's 2025 NFL Draft was a
  from-scratch broadcast build; the reusable primitives - the lower-third name strip, the ranked
  big board, the persistent score-bug, the ticker - read instantly as "real sports product" on a
  phone. ([SVG](https://www.sportsvideo.org/2025/04/24/live-from-nfl-draft-2025-espns-massive-production-features-1700-foot-cabled-aerial-camera-multiple-studio-sets/), [NewscastStudio](https://www.newscaststudio.com/2025/09/19/espn-college-football-branding-design-graphics/))

## Modern web techniques and which are safe in this stack (Next 16 / React 19 / Tailwind 4 / FM12 / Vercel)

| Technique | Status 2025-2026 | Used here |
|-----------|------------------|-----------|
| Same-document View Transitions | Baseline late 2025 | Helper shipped (src/lib/view-transition.ts), feature-detected. ([web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available)) |
| @property custom props | Baseline | Yes - animatable --ffi-sheen-angle drives the lower-third sheen and the champion grade ring. ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@property)) |
| OKLCH / color-mix | Shipped | Deferred a full palette migration (would shift the locked hexes); new cyan token defined with an OKLCH note. ([Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4)) |
| Scroll-driven animations | NOT baseline (no stable Safari/FF) | Not used (enhancement-only territory). ([caniuse](https://caniuse.com/mdn-css_properties_animation-timeline_scroll)) |
| navigator.vibrate | Android only, NOT iOS Safari | Yes - Android-only bonus; visuals always stand alone. ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)) |
| Gesture-unlocked Web Audio | Universal | Yes - opt-in, muted by default, synthesized cues (no asset files). |

Critical constraint honored: iOS Safari has no Vibration API and Joe drafts on a phone, so no
confirmation depends on haptics; every cue has a visual + motion equivalent.

## Personality: "Sunday Night Gridiron" (chosen)

NFL primetime broadcast graphics rendered as a live app. It keeps the locked Stadium Primetime
DNA (deep navy + gridiron blue + gold "moment" + value-green) so it is distinct from the NASCAR
app's asphalt-and-amber by construction, and adds exactly one new signal color:

- --ffi-live = broadcast cyan (#6fe3ff, ~oklch(85% 0.10 215)). Meaning: LIVE DATA only (pick
  wipes, ticker, score-bug flashes). Never a CTA, never a value signal. Gold stays the moment,
  blue stays structure, green stays value/steals.
- Type role discipline (no new fonts): Oswald = broadcast voice (lower-third name, grade verdict),
  Space Grotesk = ranks/titles, JetBrains Mono = every number (now globally tabular), Manrope = body.
- Named motion curves: --ease-broadcast (wipes/tickers), --ease-spring (reveals), --ease-standard (UI).

## The "wow" inventory (what shipped)

| Moment | Where | Technique |
|--------|-------|-----------|
| Lower-third pick reveal | live PickFeed (src/components/draft/pick-lower-third.tsx) | Broadcast name strip wipes in with --ease-broadcast + a one-shot sheen sweep; gold rail for your pick, cyan for others; fixed height = zero layout shift. |
| Live score-bug | live header (src/components/draft/live-scorebug.tsx) | Heavy-glass glanceable chip; budget/round/roster in tabular mono; each value flashes cyan when it changes. Format-pure. |
| Position-run ticker | live (src/components/draft/position-run-ticker.tsx) | Cyan insight strip slides in on a 3+ position run; counts only, no $ or rounds. |
| On-the-clock + sensory | live (existing banner + new cues) | Spotlight banner already existed; now also fires your-turn haptic + opt-in sound. |
| Champion grade reveal | review GradeHero | Grade is now GOLD (was lime); rotating conic gold ring (@property), gold FFICelebration burst + FFIConfettiBurst, Oswald verdict word ("ELITE DRAFT"), champion sound + haptic. Reduced-motion -> static. |
| Continuity helper | src/lib/view-transition.ts | withViewTransition() ready for the board->live morph; SharedPlayerCard layoutId morph already exists for in-tree morphs. |

## Assets

Net required assets: zero. All four fonts already load free via next/font; backgrounds stay
code-rendered (inline SVG grain); sound is synthesized via Web Audio (no files). DALL-E /
Midjourney were evaluated and are NOT needed. Optional future: one Unsplash hero on a marketing
page only.

## Hard rules (enforced)

Zero em-dashes/en-dashes (ESLint guard added), zero emojis (all replaced with Lucide), zero
AI-cheese voice (dry/declarative copy: "RB run", "ELITE DRAFT"). Mobile-first, format-pure,
reduced-motion respected on every new animation, WCAG-minded (cyan and gold-on-glass).

## Sources

CBS Sports DFS; FOX Sports DFS; Mantlr (premium UI craft); Devouring Details;
rauno.me; Apple Sports Live Activities (MacRumors); ESPN NFL Draft 2025 production (SVG);
ESPN football graphics overhaul (NewscastStudio); View Transitions baseline (web.dev); MDN
@property; Tailwind v4 OKLCH; caniuse scroll-driven animations; MDN Navigator.vibrate. Full URLs
inline above.
