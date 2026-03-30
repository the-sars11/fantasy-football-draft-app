# FFIntelligence Testing Guide

**Version:** Phase 8 Complete
**Last Updated:** March 2026
**App URL:** https://fantasyfootballdraftapp-lac.vercel.app (or localhost:3000)

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Account & Authentication](#account--authentication)
3. [League Setup](#league-setup)
4. [Draft Prep Features](#draft-prep-features)
5. [Live Draft Mode](#live-draft-mode)
6. [In-Season Features (Phase 8)](#in-season-features-phase-8)
7. [Known Limitations](#known-limitations)

---

## Getting Started

### Running Locally

```bash
cd "C:\Users\jrasa\AI Projects\fantasy_football_draft_app"
npm run dev
```

Open http://localhost:3000 in your browser.

### Environment Requirements

- Supabase project connected (check `.env.local` has SUPABASE_URL and keys)
- Anthropic API key for AI features (ANTHROPIC_API_KEY)
- Optional: Google Sheets API credentials for live draft sheet sync

---

## Account & Authentication

### Test Flow: Sign Up

1. Navigate to `/sign-up`
2. Enter email and password
3. Check email for confirmation link (Supabase sends this)
4. Click link to verify account
5. Should redirect to app

### Test Flow: Sign In

1. Navigate to `/sign-in`
2. Enter credentials
3. Verify redirect to Prep Hub (`/prep`)

### Test Flow: Password Reset

1. Navigate to `/forgot-password`
2. Enter email
3. Check email for reset link
4. Set new password at `/update-password`

---

## League Setup

### Test Flow: Create a League

1. Go to **Settings** (`/settings`)
2. Click "Add League" or navigate to `/prep/configure`
3. Fill in league details:
   - **League Name:** "Test League"
   - **Platform:** ESPN, Yahoo, or Sleeper
   - **Format:** Auction or Snake
   - **Team Size:** 10 or 12
   - **Budget:** $200 (auction) or leave blank (snake)
   - **Roster Slots:** QB:1, RB:2, WR:2, TE:1, FLEX:1, K:1, DEF:1, Bench:6
   - **Scoring Format:** PPR, Half-PPR, or Standard

### Test Flow: Custom Scoring

1. In league config, expand "Custom Scoring"
2. Modify values:
   - Passing TD: 6 pts (instead of 4)
   - 40+ yard TD bonus: 2 pts
   - PPR: 1.0 (full point per reception)
3. Save and verify scoring displays on draft board

### Test Flow: Keeper Entry

1. In league config, enable "Keeper League"
2. Add keepers:
   - Player Name, Round/Cost, Your Team or Opponent
3. Verify keepers appear as "kept" on draft board
4. Verify remaining budget/picks adjust correctly

---

## Draft Prep Features

### Test Flow: Player Browser (`/prep/players`)

1. Navigate to Prep Hub → "Player Browser"
2. **Position Filter:** Click QB, RB, WR, TE tabs - verify list filters
3. **ADP Slider:** Adjust range - verify players filter by ADP
4. **Tag Filter:** Click BREAKOUT, SLEEPER, VALUE tags - verify filtering
5. **Expand Player Card:** Click a player to see:
   - Full projection details
   - AI insights with confidence %
   - User tag controls (TARGET, AVOID)
6. **Add TARGET Tag:** Click TARGET button on any player
   - Verify lime badge appears
   - Verify player shows in "My Targets" filter

### Test Flow: AI Strategy Generation (`/prep/strategies`)

1. Navigate to Prep Hub → "Strategies"
2. Click "Generate Strategies" (requires configured league)
3. Wait for AI to propose 4-6 strategies
4. Review each strategy card:
   - Name and philosophy
   - Key targets list
   - Position allocation percentages
   - Risk profile
5. **Select a Strategy:** Click "Use This Strategy"
6. Verify strategy badge appears on draft board

### Test Flow: Strategy Editor

1. From strategy list, click "Edit" on any strategy
2. Modify:
   - Target specific players (add/remove)
   - Avoid players or teams
   - Adjust position weights via sliders
3. Click "Preview Changes" - verify value shifts
4. Save as new profile or overwrite

### Test Flow: Draft Board (`/prep/board`)

1. Navigate to Prep Hub → "Draft Board"
2. **Verify Display:**
   - Players sorted by strategy-adjusted value
   - Position badges with colors
   - Auction values or round projections
   - Tier indicators (tier breaks visible)
3. **Sorting:** Click column headers - verify sort works
4. **Filtering:** Use position tabs, tier filter, target/avoid filter
5. **Expand Player:** Click any player row
   - AI insight with confidence bar
   - "RECOMMENDED" or "AVOID" badges
   - Full reasoning text

### Test Flow: Research Runs (`/prep/runs`)

1. Navigate to Prep Hub → "Research Runs"
2. Click "New Run" to generate fresh analysis
3. Wait for completion (shows progress)
4. View saved run - verify all data present
5. Click "Compare" to compare two runs side-by-side

---

## Live Draft Mode

### Test Flow: Draft Setup (`/draft/setup`)

1. Navigate to Draft Hub → "Start Draft"
2. Select league
3. Enter manager names (your position + opponents)
4. Optional: Connect Google Sheet
   - Enter Sheet ID
   - Map columns (Pick #, Player, Team, Position, Manager, Price)
5. Click "Start Draft"

### Test Flow: Auction Draft (`/draft/live`)

**Pre-requisites:** League set to Auction format

1. Verify your budget displays correctly
2. **Simulate a Pick:**
   - Use manual entry or wait for sheet sync
   - Enter: Player name, Price, Manager who won
3. **Check AI Recommendations:**
   - "Top 3 Targets Now" panel should update
   - Max bid calculator shows suggested limits
   - Position urgency warnings appear as players go
4. **Budget Tracking:**
   - Your remaining budget updates
   - Other managers' budgets visible in League Overview
5. **Strategy Pivot Alert:**
   - If draft conditions change significantly, alert should appear
   - Test by simulating a "run" on RBs (enter 5+ RBs drafted)
   - Verify "Consider pivoting to..." suggestion

### Test Flow: Snake Draft (`/draft/live`)

**Pre-requisites:** League set to Snake format

1. Verify draft order displays correctly
2. Verify "Your Next Pick" shows correct round/pick
3. **Simulate Picks:**
   - Enter picks in order
   - Verify "Best Available at Your Pick" updates
4. **Check AI Recommendations:**
   - Position need + value analysis
   - Tier break warnings
5. **Trade Suggestions:**
   - If enabled, verify trade-up/down suggestions appear

### Test Flow: Google Sheets Sync

1. Create a Google Sheet with columns:
   - A: Pick #
   - B: Player
   - C: Team
   - D: Position
   - E: Manager
   - F: Price (auction) or Round (snake)
2. Share sheet with service account email
3. In draft setup, enter Sheet ID
4. Start draft
5. Add a row to the sheet manually
6. Wait 5-10 seconds - verify pick appears in app

### Test Flow: Post-Draft Review (`/draft/review`)

1. After completing a draft (or loading a saved one)
2. Navigate to Draft Hub → "Review"
3. **Verify Grade Display:**
   - Overall letter grade (A+ to F)
   - Glow effect on grade
4. **Positional Power Rankings:**
   - Bar charts per position
   - Your team vs league average
5. **Pick-by-Pick Timeline:**
   - Each pick listed chronologically
   - Badges: STEAL, REACH, AI PIVOT, GREAT VALUE
   - Expandable reasoning per pick
6. **Export:** Click export button - verify CSV downloads

---

## In-Season Features (Phase 8)

### Test Flow: Season Hub (`/season`)

1. Navigate to "Season" tab in bottom nav
2. Verify four feature cards display:
   - Start/Sit Advisor
   - Waiver Wire
   - Trade Analyzer
   - Matchup Preview

### Test Flow: Start/Sit Advisor (`/season/start-sit`)

**Note:** Requires connected platform (ESPN/Yahoo/Sleeper) or manual roster entry

1. Navigate to Season → "Start/Sit"
2. If no platform connected:
   - Click "Connect Platform" or use demo mode
3. **Side-by-Side Comparison:**
   - Select two players at same position
   - View projections, floor/ceiling ranges
   - View matchup ratings (Elite/Favorable/Neutral/Tough/Brutal)
4. **AI Recommendation:**
   - Confidence bar shows consensus strength
   - Expandable reasoning with source citations
5. **Test Different Positions:**
   - Switch between QB, RB, WR, TE
   - Verify recommendations update

### Test Flow: Waiver Wire (`/season/waivers`)

1. Navigate to Season → "Waiver Wire"
2. **Top Pickups List:**
   - Verify players sorted by pickup priority
   - Ownership % displayed
   - Trend indicator (hot/rising/stable)
3. **FAAB Bid Suggestions:**
   - Each player shows recommended bid
   - Percentage of remaining budget
4. **Roster Fit Analysis:**
   - Click a player to expand
   - Shows which roster hole they fill
   - Schedule favorability indicator
5. **Add to Watchlist:**
   - Click watchlist button
   - Verify player appears in watchlist section

### Test Flow: Trade Analyzer (`/season/trade`)

1. Navigate to Season → "Trade Analyzer"
2. **Enter a Trade:**
   - "You Give" section: Add 1-3 players
   - "You Get" section: Add 1-3 players
3. **Instant Analysis:**
   - Trade value bar (who wins?)
   - ROS impact percentage
   - Position impact breakdown
4. **Veto Predictor:**
   - If trade is lopsided, warning appears
   - Shows "League might veto this"
5. **Fair Trade Finder:**
   - Select a player you want
   - Click "Find Fair Trades"
   - View suggested package combinations

### Test Flow: Weekly Matchup Preview (`/season/matchups`)

1. Navigate to Season → "Matchup Preview"
2. Click "Load Preview" or connect platform
3. **Score Projection Card:**
   - Your team projected total
   - Opponent projected total
   - Win probability bar (green vs red)
   - Projected margin (+/- points)
4. **View Tabs:**
   - **Overview:** Key insights, position summary, top leverage play
   - **By Position:** Position-by-position breakdown with margins
   - **Leverage Plays:** High-impact roster decisions
5. **Position Chips:**
   - Green = your advantage
   - Red = opponent advantage
   - Shows point differential
6. **Leverage Plays:**
   - Each play shows:
     - Player involved
     - Recommendation (DO IT / CONSIDER / RISKY)
     - Impact score (1-10)
     - Reasoning
7. **Risk Assessment:**
   - If risk level is medium/high, warning banner shows
   - Risk factors listed (injuries, variance, tight margin)

### Test Flow: Notifications (API Only - UI Pending)

**Note:** Notification bell UI not yet built. Test via API.

1. **Get Notifications:**
```
GET /api/notifications
Authorization: Bearer <your-session-token>
```

2. **Get Preferences:**
```
GET /api/notifications/preferences
```

3. **Update Preferences:**
```
PUT /api/notifications/preferences
Body: { "injuryAlerts": true, "waiverResults": true }
```

4. **Mark as Read:**
```
PATCH /api/notifications
Body: { "action": "read", "notificationId": "<id>" }
```

5. **Push Subscription (if testing push):**
```
POST /api/notifications/push
Body: { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
```

---

## Known Limitations

### Data Sources

- **2026 Season Data:** Real projections not available until closer to season. App shows default/mock data.
- **Yahoo OAuth:** Deferred. Manual roster entry required for Yahoo leagues.
- **Real-time Sync:** ESPN/Sleeper sync may have delays. Manual refresh available.

### Platform Connections

- **ESPN:** Unofficial API - may break if ESPN changes their site
- **Sleeper:** Public API - most reliable
- **Yahoo:** OAuth not implemented yet

### In-Season Features

- **Opponent Roster:** Matchup preview may not fetch opponent roster automatically. Shows projection without opponent data.
- **Push Notifications:** Requires PWA installation and browser permission. Not all browsers support.
- **Injury Data:** Updates from external sources may lag real-world announcements.

### UI Polish

- **Notification Bell:** Not yet added to app header
- **Notification Settings Page:** Not yet built (API works, no UI)
- **Mobile Edge Cases:** Some modals may need scroll fixes on very small screens

---

## Quick Test Checklist

### Must Work

- [ ] Sign up / Sign in / Sign out
- [ ] Create and configure a league
- [ ] View draft board with player cards
- [ ] Generate AI strategies
- [ ] Start a live draft (manual entry mode)
- [ ] Enter picks and see recommendations update
- [ ] Complete draft and view post-draft review
- [ ] Access Season hub
- [ ] View Start/Sit advisor (demo mode)
- [ ] View Waiver Wire recommendations
- [ ] Analyze a trade
- [ ] View Matchup Preview

### Should Work

- [ ] Google Sheets sync during live draft
- [ ] Strategy pivot alerts
- [ ] Export draft results to CSV
- [ ] Compare research runs
- [ ] User tag management (TARGET/AVOID)

### May Need Setup

- [ ] Platform connections (ESPN/Sleeper credentials)
- [ ] Push notifications (requires HTTPS + browser permission)
- [ ] Full projection data (requires season data availability)

---

## Reporting Issues

If something doesn't work as expected:

1. Note the URL/page where issue occurred
2. Screenshot any error messages
3. Check browser console (F12 → Console tab) for errors
4. Add to build plan or discuss with Claude

---

*Generated for FFIntelligence Phase 8 Testing*
