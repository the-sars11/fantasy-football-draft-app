# Changelog — FFIntelligence

---

## 2026-04-16 — FF-283: Dynamic Max-Bid Recompute on Every Pick

**Task:** FF-283 — Every pick from any source triggers `calculateMaxBidAdvice()` recompute for remaining players  
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** `calculateMaxBidAdvice()` was defined in `auction-advisor.ts` but **never called anywhere** in the live UI. Player cards in the pool showed a single global `getMaxBid()` value (flat absolute max) — the same number for every player regardless of strategy score, position need, or scarcity. Per-player strategy-aware advice was completely unwired.

**Approach:** Added a `maxBidAdviceMap: Map<string, number>` useMemo in `live/client.tsx` keyed by lowercase player name. It depends on `[state, scoredPlayers, draftedNames, strategy]` — every pick from any source (Auctioneer BroadcastChannel/localStorage → `addManualPick` → `setState`, Sheets → `handleNewSheetPicks` → `setState`, manual → `addManualPick` → `setState`) invalidates the memo and recomputes `calculateMaxBidAdvice()` for all remaining undrafted players. The result map is passed to `PlayerPool` as new `maxBidMap` prop; each `FFIPlayerCard` gets its own per-player value (fallback to global `maxBid` if map absent). `MySquadPanel` continues to use the simple `getMaxBid()` result for its "Max bid" line — correct behavior since it's a squad-level overview, not a per-player decision.

**Changes:**
- `src/app/(app)/draft/live/client.tsx`: import `calculateMaxBidAdvice`; add `maxBidAdviceMap` useMemo (deps: state + scoredPlayers + draftedNames + strategy); pass `maxBidMap={isAuction ? maxBidAdviceMap : undefined}` to `<PlayerPool>`
- `src/components/draft/player-pool.tsx`: add `maxBidMap?: Map<string, number>` prop; card render uses `maxBidMap.get(sp.player.name.toLowerCase()) ?? null` per card (fallback to `maxBid`)

**Architecture notes:**
- Pure computation — no async, no network calls; computing for ~100–300 players is sub-millisecond (simple math + one `.filter()` per player over `scoredPlayers`)
- `MySquadPanel` keeps `maxBid={myMaxBid}` (simple global max) — squad-level overview doesn't need per-player strategy advice
- `maxBidMap` is `undefined` in snake mode — `FFIPlayerCard` hides the MAX display when `maxBid` is null/undefined

**Verification:** `npm run type-check` — clean. `npm run lint` — zero new errors in changed files.

---

## 2026-04-16 — FF-282: use-draft-feed.ts Unified Multi-Source Pick Feed

**Task:** FF-282 — Generalize `use-draft-polling.ts` → `use-draft-feed.ts`  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** `live/client.tsx` called `useAuctioneerfeed` directly with `AuctioneerPick[]` — a raw internal type from the Auctioneer integration layer. Downstream code (FF-283 max-bid recompute, future Sheets unification) needs a stable `NormalizedPickEvent[]` interface that abstracts the source. Also eliminated explicit `enabled`/`connectionType` gating boilerplate from the call site.

**Approach:** New `src/hooks/use-draft-feed.ts` wraps `useAuctioneerfeed` and converts its `AuctioneerPick[]` output to `NormalizedPickEvent[]` using `createPickMerger()` (FF-281) + `playerNameToPickId()`. Gating is internal: hook is a no-op when `format !== 'auction'` or `connectionType` is null — callers pass `session.format` and `aifParam` unconditionally. `connectionTypeToSource()` maps the connection type to `FeedSource` tag. The `mergerRef` (one `createPickMerger()` per mount) deduplicates pickIds across BroadcastChannel and localStorage poll paths; it's primed to also dedup against Sheets picks once that source is routed through here. Re-exports `NormalizedPickEvent` and `AuctioneerConnectionType` so `live/client.tsx` has a single import point. `use-draft-state.ts` and `use-draft-polling.ts` are untouched — Tyler's Sheets + manual entry path has zero behavior change.

**Changes:**
- `src/hooks/use-draft-feed.ts` (new): `useDraftFeed(format, connectionType, onNewPicks)` → `UseDraftFeedResult`; `toNormalizedEvent()`; `connectionTypeToSource()`; re-exports `NormalizedPickEvent`, `AuctioneerConnectionType`
- `src/app/(app)/draft/live/client.tsx`: import swapped (`useAuctioneerfeed`/`AuctioneerPick` → `useDraftFeed`/`NormalizedPickEvent`); `handleAuctioneerPicksRef` type updated; handler body `pick.player_name` → `pick.playerName`; `onAuctioneerpicks` callback type updated; hook call simplified to `useDraftFeed({format, connectionType, onNewPicks})`

**Architecture notes:**
- `use-draft-polling.ts` is NOT deleted — `use-draft-state.ts` still uses it for Sheets polling; the "generalize" step is additive (new hook) not a replacement yet
- Source priority (BroadcastChannel > localStorage > file) is enforced inside `useAuctioneerfeed`; `useDraftFeed` adds the normalization and cross-source dedup layer on top
- `mergerRef` persists for the hook's lifetime; `reset()` is available for future session-restart use cases

**Verification:** `npm run type-check` — clean. `npm run lint` — zero new errors in changed files.

---

## 2026-04-16 — FF-281: auction-feed-merge.ts Cross-Source Pick Dedup Utility

**Task:** FF-281 — `src/lib/draft/auction-feed-merge.ts` (NEW) — dedup pick events across sources by `pickId`  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** Picks now arrive from up to four paths (BroadcastChannel, localStorage poll, file poll, Sheets poll). Each path may deliver the same pick. A shared, testable dedup layer prevents double-add regardless of which path fires first. Sets up FF-282's multi-source `use-draft-feed.ts`.

**Approach:** Pure utility module — no React, no `'use client'`, SSR-safe. `createPickMerger()` factory owns a private `Set<string>` of seen pickIds and returns a `PickMerger` interface with three members: `merge(picks)` filters incoming batches to unseen IDs only (mutates internal set), `reset()` clears the set for session restart, and `seenCount` getter for observability. `playerNameToPickId(name)` synthesizes a `sheets:<name>` ID for Sheets picks that carry no Auctioneer pick ID — the `sheets:` prefix ensures these never collide with Auctioneer's `pick-N` IDs. `NormalizedPickEvent` is the canonical cross-source pick type: `pickId`, `playerName`, `manager`, `price`, `position?`, `source: FeedSource`. FF-282 will instantiate one merger per session in a `useRef` and route all source batches through it.

**Changes:**
- `src/lib/draft/auction-feed-merge.ts` (new): `FeedSource`, `NormalizedPickEvent`, `PickMerger`, `createPickMerger()`, `playerNameToPickId()`

**Architecture notes:**
- `createPickMerger()` stores its Set privately — callers cannot accidentally mutate it
- `playerNameToPickId` prefix (`sheets:`) guarantees no collision with Auctioneer IDs (`pick-1`, `pick-2`)
- The module has zero dependencies — safe to import from hooks, server components, or tests

**Verification:** `npm run lint` — zero errors in new file. `npm run type-check` — clean.

---

## 2026-04-16 — FF-280: Auctioneer BroadcastChannel Subscriber

**Task:** FF-280 — Subscribe to Auctioneer's `ffi-auction-feed` BroadcastChannel for instant pick sync  
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Root Cause:** FF-279 added 3-second localStorage polling, but picks were delayed up to 3s from when Auctioneer committed them. With both apps open in the same browser, a BroadcastChannel can deliver picks in sub-100ms with no polling overhead.

**Approach:** New `useEffect` in `useAuctioneerfeed` (between `processBatch` definition and the existing localStorage poll). Gates on `enabled && connectionType === 'localstorage'` — channel is meaningless for the file path and would silently receive nothing. SSR-safe (`typeof window === 'undefined'` guard). Opens `BroadcastChannel('ffi-auction-feed')`, sets `onmessage` handler: reads teamNameMap from `auctioneer-draft-v1` localStorage for teamId→name resolution, routes the single `_AAPick` through `processBatch` (same dedup ref as the poll). Sets `connected=true` + clears error on each message. Cleanup closes the channel. The 3-second poll below it continues running as catch-up for any messages missed during a brief disconnect. `seenPickIdsRef` ensures each pick ID is emitted to `onNewPicks` exactly once regardless of which path delivers it first. No changes to Auctioneer repo — `ffiBroadcastRef.postMessage(pick)` was already wired in `draft/page.tsx` as part of AA-INT1.

**Changes:**
- `src/hooks/use-auctioneer-feed.ts`: new BroadcastChannel subscriber `useEffect` before the localStorage poll effect; comment on the existing localStorage poll updated to "catch-up fallback"

**Architecture notes:**
- Channel subscriber scoped to `'localstorage'` only — file path users are on a different device where a same-origin BroadcastChannel would never receive messages
- Both paths call `processBatch` → `seenPickIdsRef` dedup → `onNewPicks` exactly once per pick ID
- Channel open/close is tied to effect lifecycle; no global channel instance needed

**Verification:** `npm run lint` — zero new errors in changed file. `npm run type-check` — clean. Auctioneer `npx tsc --noEmit` — clean.

---

## 2026-04-16 — FF-279: Auctioneer JSON Import with Hot-Reload

**Task:** FF-279 — FFI reads Auctioneer's JSON export at auction setup  
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Root Cause:** P1 milestone — Joe's ESPN auction draft uses the Auctioneer app to run the live auction; FFI had no way to receive picks from it. Each pick was re-entered manually, doubling work and creating sync lag.

**Approach:** `useAuctioneerfeed` hook with two polling paths at 3-second intervals. (1) localStorage: reads `auctioneer-ffi-feed-v1` (Auctioneer's append-only pick feed) + `auctioneer-draft-v1` (for teamId→name resolution) directly from `window.localStorage` — works when both apps run in the same browser tab on the same device. (2) File System Access API: polls a `FileSystemFileHandle` selected at setup time; supports all three Auctioneer JSON shapes (storage envelope, StoredDraft, raw Pick[]). Dedup across polls via `seenPickIdsRef` (Auctioneer pick IDs). At live-client boundary, picks are filtered against `draftedNames` before `addManualPick` to prevent double-recording on cold-start. `onNewPicks` is stabilized via `useCallback([])` + a handler ref so the 3-second interval never restarts mid-draft. File handle survives client-side navigation via module-level `_globalFileHandle` / `setGlobalFileHandle()`. Gated: hook is a no-op unless `enabled===true` (caller gates on `session.format === 'auction'`); Tyler's snake/Sleeper flow is completely unaffected.

**Changes:**
- `src/hooks/use-auctioneer-feed.ts` (new): `useAuctioneerfeed(enabled, connectionType, onNewPicks)` hook; `AuctioneerConnectionType`, `AuctioneerPick` types; `setGlobalFileHandle()` / `getGlobalFileHandle()` module-level API; `parseFileContent()` for multi-shape file support; `buildTeamNameMap()` + `normalizeAAPick()` helpers
- `src/app/(app)/draft/setup/client.tsx`: imports `setGlobalFileHandle`, `AuctioneerConnectionType`; `auctioneerConnectionType` + `auctioneerFileName` + `aifError` state; Auctioneer Sync card in Step 3 (only rendered when `isAuction`): "Same Device" toggle (localStorage) + "Export File" button (File System Access API with type filter); `?aif=` param appended to live page navigation URL
- `src/app/(app)/draft/live/client.tsx`: imports `useAuctioneerfeed`, `AuctioneerConnectionType`, `AuctioneerPick`; reads `?aif=` from searchParams; `handleAuctioneerPicksRef` declared early, updated post-`useDraftState`; `onAuctioneerpicks` via `useCallback([])` (stable); `useAuctioneerfeed` call with `aifEnabled` gate; `AA ✓N` / `AA …` badge in header when `aifEnabled`

**Architecture notes:**
- `onNewPicks` must be stable at call site — empty-dep `useCallback` + handler ref pattern avoids interval restarts
- `setError` never called synchronously in `useEffect` (react-compiler rule) — error state flows from failed poll attempts only
- Module-level `_globalFileHandle` is cleared by the user navigating back to setup and picking a new file; no explicit cleanup needed for one-session use

**Verification:** `npm run type-check` — clean. `npm run lint` — zero new errors in changed files. All pre-existing errors unchanged.

---

## 2026-04-16 — FF-311: Owner History System

**Task:** FF-311 — Owner history system for trash talk context injection  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** `generateTrashTalk()` was calling `/api/trash-talk` with an empty `historyBlock`. The Nasties league has 10 years of roast ammo (Le'Veon Bell $73, CMC $82, Bowers $3, etc.) that Claude could use to sharpen lines — but nothing was surfacing it.

**Approach:** Ported `trash-talk-history.ts` from the auctioneer with two key adaptations: (1) `buildTeamOwnerMap` takes `string[]` manager names instead of `Array<{ id, name }>` — in FFI managers are plain strings in `state.manager_order`; (2) `buildHistoryBlock` uses `TrashTalkType` and extends the trigger map for FFI-specific types (`keeper_steal` → steal moments, `bad_keeper` → overpay/bust moments). History loaded from bundled JSON at runtime (no network call). `teamOwnerMapRef` built once when `state.manager_order` first populates; per-alert owner lookup + historyBlock construction happens inline in the fire-and-forget loop.

**Changes:**
- `src/data/history.json` (new): 10 Nasties owner profiles — aliases, championships, worst seasons, signature moments, roast ammo; copied from auctioneer
- `src/lib/draft/trash-talk-history.ts` (new): `loadHistory()`, `matchOwnerToHistory()`, `buildTeamOwnerMap(managers: string[], history)`, `buildHistoryBlock(trigger: TrashTalkType, owner)`, all types exported
- `src/app/(app)/draft/live/client.tsx`:
  - Imports `loadHistory`, `buildTeamOwnerMap`, `buildHistoryBlock`, `TeamOwnerMap`
  - `teamOwnerMapRef`: built once from `state.manager_order` via one-time `useEffect`
  - Per-pick effect: owner lookup + `buildHistoryBlock()` → `historyBlock` passed to `generateTrashTalk()`
  - Keeper effect: same pattern

**Verification:** `npm run type-check` — clean. `npm run lint` — no new errors.

---

## 2026-04-16 — FF-310: Claude Haiku Trash Talk Generation

**Task:** FF-310 — Replace hardcoded message arrays with Claude Haiku generation  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** `analyzePickForTrashTalk()` returned alerts with hardcoded message strings from static arrays. FF-307 created the `/api/trash-talk` Claude Haiku endpoint but nothing called it from the live client.

**Approach:** Added `generateTrashTalk(alert, mode, historyBlock?)` to `src/lib/draft/trash-talk.ts` as a thin async wrapper that maps `TrashTalkAlert` fields to `TrashTalkRequest` and calls `/api/trash-talk`. In `live/client.tsx`, both trash talk `useEffect` hooks (per-pick and keeper one-time) now fire-and-forget this function after adding alerts to state. Alerts appear immediately with the hardcoded fallback message; when Haiku responds with a non-null line, the alert's `message` is updated in-place via a targeted `prev.map()`. Null response from API = hardcoded message kept, alert not dropped. All errors handled silently inside `generateTrashTalk()`. Draft UI never blocks.

**Changes:**
- `src/lib/draft/trash-talk.ts`: Added `export async function generateTrashTalk()` — maps `TrashTalkAlert` → `TrashTalkRequest` body, fetches `/api/trash-talk`, returns `line` or null; catch-all fail-silent
- `src/app/(app)/draft/live/client.tsx`:
  - Import updated to include `generateTrashTalk`
  - Per-pick `useEffect`: after `setTrashTalkAlerts([...prev, ...newAlerts])`, loops over `newAlerts` firing `void generateTrashTalk(alert, mode).then(line => { if (line) setTrashTalkAlerts(...map update) })`
  - Keeper `useEffect`: same fire-and-forget pattern applied to `keeperAlerts`

**Verification:** `npm run type-check` — clean. `npm run lint` — no new errors introduced (pre-existing errors in unrelated files).

---

## 2026-04-16 — FF-309 + Keeper/Sleeper Augmentation

**Task:** FF-309 + Tyler's Sleeper keeper league augmentation (pipeline)
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** Snake/both-format triggers were missing (market_mismatch, late_roster_qb_panic). Keeper league QB-detection was broken — `state.keepers` not included in `allPicks`, so `lone_wolf_qb` and `late_roster_qb_panic` would false-fire for any team with a keeper QB. No keeper value trash talk existed. Tyler's league moved from Yahoo to Sleeper.

**Approach:** `market_mismatch` iterates `allPicks` at same position within 15 ADP spots and compares price spread (auction) or round difference (snake). `late_roster_qb_panic` mirrors `lone_wolf_qb` but snake-only at lower threshold (7 vs 9 picks). Keeper fix: live client now prepends `keepersToPicks(state.keepers)` to `allPicksWithKeepers` before passing to trigger engine — no signature change needed, `is_keeper: true` flag already guards out keeper picks from triggering on themselves. New `analyzeKeeperPicksForTrashTalk()` fires once at draft start via a second effect with a processed ref guard.

**Changes:**
- `src/lib/draft/trash-talk.ts`:
  - `TrashTalkType` union: added `market_mismatch | late_roster_qb_panic | keeper_steal | bad_keeper`
  - Import `KeeperAssignment` from `./keepers`
  - `detectMarketMismatch()`: position-matched ADP-comparable picks, ≥35% price spread (auction) or ≥3 round diff (snake); skips keeper picks via `comp.is_keeper` guard
  - `detectLateRosterQbPanic()`: snake-only, 7+ picks, no QB — fires before `lone_wolf_qb` kicks in at 9
  - `export analyzeKeeperPicksForTrashTalk()`: batch keeper value analysis, returns `keeper_steal` (surplus ≥3 rounds or ≥$10) / `bad_keeper` (surplus ≤-2 rounds or ≤-$10) alerts
  - `analyzePickForTrashTalk`: `market_mismatch` wired after `steal`; `late_roster_qb_panic` wired after `lone_wolf_qb` (snake-only gate)
- `src/components/draft/trash-talk.tsx`: extended `trashTalkConfig` with 4 new type entries
- `src/app/(app)/draft/live/client.tsx`:
  - Import `keepersToPicks`, `analyzeKeeperPicksForTrashTalk`
  - `keeperAlertsProcessedRef`: one-time guard for keeper analysis
  - Per-pick effect: builds `allPicksWithKeepers` from keepers + regular picks before passing to trigger engine
  - New one-time effect: calls `analyzeKeeperPicksForTrashTalk` on draft load, populates alert feed
- `src/components/prep/league-config-form.tsx`: Tyler's preset → `"Tyler's Sleeper League"`, `platform: 'sleeper'`; button label updated

---

## 2026-04-16 — FF-308: Auction Trigger Engine Upgrade

**Task:** FF-308 (pipeline)
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** Trigger engine only had 4 rules (overpay, reach, imbalance, steal) using flat position-average fallbacks. No auction-specific budget/spending triggers.

**Approach:** Ported 6 triggers from AA reference spec. Added `impliedAuctionValue()` quadratic decay as the shared value baseline. Budget signals derived from `allPicks` + `DEFAULT_AUCTION_BUDGET` ($200) since budget config isn't passed through to the trigger layer. `first_defense_buy` required special pre-guard placement before the K/DEF skip. League-state triggers (`last_big_spender`, `budget_dominance`) fire regardless of who the current picker is.

**Changes:**
- `src/lib/draft/trash-talk.ts`:
  - `TrashTalkType` union: added `budget_buster | last_big_spender | cheapskate_special | budget_dominance | first_defense_buy | lone_wolf_qb`
  - `DEFAULT_AUCTION_BUDGET = 200`, `DEFAULT_ROSTER_SPOTS = 15`
  - `impliedAuctionValue(player, budget, teamCount)`: quadratic decay from ADP; uses `consensusAuctionValue` if set
  - `detectOverpay`: updated signature (budget, teamCount), uses `impliedAuctionValue`, guards `!player` to avoid false positives
  - `detectSteal`: updated signature (budget), uses `impliedAuctionValue`
  - Added: `detectBudgetBuster`, `detectLastBigSpender`, `detectCheapskateSpecial`, `detectBudgetDominance`, `detectFirstDefenseBuy`, `detectLoneWolfQb`
  - `analyzePickForTrashTalk`: `first_defense_buy` fires before K/DEF guard; `budget_buster` fires before self-pick gate; new priority order: `budget_buster > overpay > steal > last_big_spender > budget_dominance > lone_wolf_qb > cheapskate_special > first_defense_buy > reach > imbalance`
- `src/components/draft/trash-talk.tsx`: extended `trashTalkConfig` map with 6 new type entries

---

## 2026-04-16 — FF-307: Trash Talk API Route (Claude Haiku Generation)

**Task:** FF-307 (pipeline)
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Root Cause:** No server-side generation endpoint existed — trash talk messages were rule-based hardcoded strings with no AI variation.

**Approach:** Ported from AA reference (`fantasy_auction_auctioneer/src/app/api/trash-talk/route.ts`), using the project's existing `@anthropic-ai/sdk` pattern. Fail-silent throughout — trash talk is non-critical and must never surface errors to the draft UI.

**Changes:**
- `src/app/api/trash-talk/route.ts` (NEW):
  - `TrashTalkRequest` and `TrashTalkResponse` types exported (consumed by FF-310 client wrapper)
  - Family-Safe system prompt: PG-13, ≤80 chars, punches at situation not person
  - Adult-Only system prompt: Jeselnik/Ross/Hinchcliffe style, profanity required, ≤120 chars
  - `buildUserMessage()`: assembles trigger context, player/price/pick data, optional history block
  - Claude Haiku (`claude-haiku-4-5-20251001`), temperature 1.0, no streaming
  - Family-Safe max_tokens 60, Adult-Only max_tokens 80
  - Em-dash hard-strip: `raw.replace(/\u2014/g, '-').replace(/--/g, '-)` enforced post-response regardless of prompt compliance
  - Missing `ANTHROPIC_API_KEY` → `{ line: null }` (silent, not 500)
  - Any Claude SDK error → `{ line: null }` (silent)

---

## 2026-04-16 — FF-306: Trash Talk Mode Toggle at Session Setup

**Task:** FF-306 (output)
**Class:** `output` | **Lenses:** Delivery, QA

**Root Cause:** No way to configure trash talk intensity at session start — all users got the same rule-based alerts with no opt-out.

**Approach:** Session-scoped mode stored as `&ttm=` URL param (no DB migration needed — mode is fixed at session start, not persisted across sessions). Default: `family-safe`.

**Changes:**
- `src/app/(app)/draft/setup/client.tsx`:
  - Added `TrashTalkMode = 'off' | 'family-safe' | 'adult-only'` type
  - Added `trashTalkMode` state (default: `'family-safe'`)
  - Added 3-button selector card in Step 3 (Off 🔇 / Family-Safe 😄 / Adult-Only 🔥) using existing card-button pattern
  - Appended `&ttm=${trashTalkMode}` to `router.push` on session start
- `src/app/(app)/draft/live/client.tsx`:
  - Added `TrashTalkMode` type alias
  - Reads `ttm` from `useSearchParams()` (default: `'family-safe'`)
  - Trash talk `useEffect` returns early when mode is `'off'`; `trashTalkMode` added to dep array

---

## 2026-04-16 — FF-305: Wire Live Trash Talk Alerts into Live Draft Client

**Task:** FF-305 (shared)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** `analyzePickForTrashTalk()` and the `LiveTrashTalkAlert`/`TrashTalkFeed` components existed but were never called from any live draft page. Alerts never fired during a draft session.

**Approach:** Detect new picks via a `useEffect` watching `state` (which gets a new reference on every pick confirmation, whether from manual entry or sheet polling). A `processedPickCountRef` skips historical picks loaded on session start, then tracks the last analyzed index so only incremental picks get evaluated.

**Changes:**
- `src/app/(app)/draft/live/client.tsx`:
  - Added `useRef` to imports
  - Added imports: `TrashTalkFeed`, `SavedTrashTalk`, `analyzePickForTrashTalk`, `TrashTalkAlert`
  - Added `trashTalkAlerts` and `savedAlerts` useState arrays
  - Added `processedPickCountRef` (null until first state load)
  - Added `useEffect(deps: [state, players])` — on first load sets ref to skip existing picks; on subsequent state changes, slices new picks, calls `analyzePickForTrashTalk()` for each, pushes non-null results
  - Added `handleDismissTrashTalk`, `handleSaveTrashTalk`, `handleRemoveSavedAlert` callbacks
  - Renders `<TrashTalkFeed>` below `<PickFeed>` in left column
  - Renders `<SavedTrashTalk>` conditionally when saved alerts exist

---

## 2026-04-14 (session 8) — FF-276 / FF-277 / FF-278: Pre-Draft Tools

### FF-278: Consensus Shift Alerts

**Task:** FF-278 (shared)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** No visual signal existed to flag players whose ADP was being called differently across sources (ESPN vs. Sleeper vs. FantasyPros). A player with a wide ADP range across sources is either a breakout candidate or a volatile pick — either way worth flagging before draft day.

**Approach:** Cross-source divergence proxy (max ADP − min ADP across sourceData). Real historical ADP movement data is not stored, so this is honest about what the data supports.

**Changes:**
- `src/app/(app)/prep/board/client.tsx`: Stores raw `adp: Record<string, number>` from API response before `cacheToPlayers` conversion (conversion loses per-source data). Computes `adpDivergenceMap` (playerId → divergence). Renders "ADP Movers" chip strip above tabs when any player has divergence > 10 (top 6 shown, sorted descending by divergence).
- `src/components/draft/ffi-player-card.tsx`: Added `adpDivergence?: number` prop. Shows orange `↕N` indicator next to ADP in the value column when divergence > 10.
- `src/components/draft/player-pool.tsx`: Added `getAdpDivergence()` helper that inspects the raw `Record<string, number>` adp field on live draft players (typed as `number` but runtime is object from raw API). Passes computed divergence to each `FFIPlayerCard`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

### FF-277: Injury Watch Panel

**Task:** FF-277 (output)
**Class:** `output` | **Lenses:** Delivery, QA

**Root Cause:** During a live draft, injury news can break at any moment. There was no panel surfacing which undrafted players had active injury flags — forcing the user to mentally track status from memory or context-switch to a separate source.

**Changes:**
- `src/components/draft/injury-watch.tsx` (NEW): `InjuryWatch` component accepts `players[]` and `draftedNames`. Filters undrafted players with flagged status. Handles both `Player.injuryStatus` (camelCase, set by cacheToPlayer) and raw `injury_status` (snake_case, present on live draft's raw API data). Color-coded status badges: OUT/IR/PUP = red, DOUBTFUL = orange, QUESTIONABLE = amber, SUSPENDED = red/dim. Truncated to top 8. Auto-hides when no flagged players.
- `src/app/(app)/draft/live/client.tsx`: Added `InjuryWatch` import and rendered in right column between `PositionScarcityTracker` and `PlayerPool`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

### FF-276: Dry Run Simulation

**Task:** FF-276 (output)
**Class:** `output` | **Lenses:** Delivery, QA

**Root Cause:** No way to stress-test a draft strategy before draft day. Entering the live draft without knowing how the strategy performs against field competition leaves unanswered questions: "Would I end up with good RBs? Could I get shut out at a position?"

**Changes:**
- `src/app/(app)/prep/simulate/page.tsx` (NEW): Server component wrapper at `/prep/simulate`.
- `src/app/(app)/prep/simulate/client.tsx` (NEW): Full simulation client. Fetches `/api/players` and `/api/strategies`. Runs client-side simulation: for snake, user picks by `scorePlayersWithStrategy` combinedScore, others pick by ADP. For auction, round-robin with budget constraints, same pick logic. Outputs: simulated roster (player / position / round or price), per-position grades (A/B/C/F based on tier-1 starter coverage), overall verdict (Strong = 5+ top-50 players, Average = 3-4, Weak < 3), and shutout position alerts.
- `src/app/(app)/prep/page.tsx`: Added "Dry Run" HubCard linking to `/prep/simulate`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean (54 pages, `/prep/simulate` included)

---

All notable changes tracked here with root cause analysis.

---

## 2026-04-14 (session 7, cont.) — FF-272: Strategy Drift Alert

**Task:** FF-272 (shared)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** When all of a strategy's player targets get drafted by other managers, the AI silently shifts to best-available mode with no notification. The user has no idea the plan has changed — they think the AI is still targeting specific players when it isn't.

**Changes:**
- `src/lib/draft/flow-monitor.ts`: Added `StrategyDrift` type and `detectStrategyDrift(strategyTargets, draftedNames, myPickedNames)`. Classifies each strategy target as gone (drafted by others) or remaining (still on board). Targets the user themselves drafted are excluded. `active = true` when `goneTargets.length > 0 && remainingTargets.length === 0`. Also imports `StrategyPlayerTarget` from database types.
- `src/app/(app)/draft/live/client.tsx`: `myPickedNames` useMemo (user's own picks by `state.manager_order[0]`); `driftAlert` useMemo (fires after pick 3, null when dismissed); `handleDismissDrift` callback (`driftDismissed` state); `driftAlert` + `onDismissDrift` passed to `DraftFlowAlerts`.
- `src/components/draft/draft-flow-alerts.tsx`: Renders orange "Strategy drift" banner with struck-through target name badges and "Got it" dismiss button between the pivot suggestion and flow alerts. Early return guard updated to include `driftAlert`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-271: Data Source Attribution

**Task:** FF-271 (shared)
**Class:** `shared` | **Lenses:** QA

**Root Cause:** Recommendations showed reasoning but gave no indication of which data sources contributed. Users had no way to judge whether a recommendation was backed by 1 source or 4.

**Changes:**
- `src/lib/draft/explain.ts`: Added `sources: string[]` to `Explanation` type. In `explainPlayer()`, collects unique display names from `player.sourceData` (espn→ESPN, yahoo→Yahoo, sleeper→Sleeper, fantasypros→FantasyPros) plus `AI Analysis` when `player.analysis` exists.
- `src/components/draft/ffi-ai-insight.tsx`: Renders a muted pill row above the Key Factors block showing "Sources: ESPN · FantasyPros · AI Analysis" (or whatever applies). Empty if no sources.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-270: Confidence Indicators — Thin Data Flag

**Task:** FF-270 (shared)
**Class:** `shared` | **Lenses:** QA

**Root Cause:** `explainPlayer()` calculated confidence purely from factor consistency (positive vs. negative counts). A player with 1 data source and no ADP could still receive "medium" or "high" confidence, misleading the user on draft day.

**Changes:**
- `src/lib/draft/explain.ts`: Added `dataWarning?: string` to `Explanation` type. Added `assessDataCoverage(player)` helper — returns a warning string when `sourceData.length < 2` or when both `adp` and `consensusRank` are 0. In `explainPlayer()`, if triggered: appends a `Thin Data` sentinel factor (weight 0, neutral) and forces `confidence = 'low'`. Returns `dataWarning` on the `Explanation` object.
- `src/components/draft/ffi-ai-insight.tsx`: When `dataWarning` is set, renders an amber "Low confidence — [reason]" banner above the insight text. Confidence bar color shifts: amber for thin data, red for conflicting signals, green otherwise. `Thin Data` sentinel filtered out of Key Factors chips and insight text construction.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-243: Confirm/Dismiss System Tag Actions

**Task:** FF-243 (shared + pipeline)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** System tags (BREAKOUT/VALUE/SLEEPER/BUST/AVOID) generated by AI analysis could not be dismissed by users. A dismissed tag still contributed to scoring and still cluttered the UI even when the user disagreed with the AI's assessment. The build plan note "UI ready — needs API only" was inaccurate; the card had no dismiss controls at all.

**Changes:**
- `src/app/api/user-tags/route.ts`: Extended PATCH handler to accept `action: 'dismissSystemTag' | 'undismissSystemTag'` with `tag` field. Atomically adds/removes the tag from `dismissed_system_tags` (JSONB array) in `user_tags` table. Creates the row with `tags: []` on first dismissal if none exists.
- `src/hooks/use-user-tags.ts`: Added `useSystemTagActions(leagueId?)` hook exposing `dismissSystemTag(playerCacheId, tag)` and `undismissSystemTag(playerCacheId, tag)` (same PATCH pattern as `useToggleTag`).
- `src/components/prep/ffi-player-intel-card.tsx`: Added `dismissedSystemTags`, `onDismissSystemTag`, `onUndismissSystemTag` props. Dismissed tags render grayed-out (opacity-40, muted badge) with a "restore" text link. Active tags show a hover-visible × dismiss button. `primaryBadge` useMemo skips dismissed tags in compact view.
- `src/app/(app)/prep/players/client.tsx`: Imports and calls `useSystemTagActions`; adds `handleDismissSystemTag`/`handleUndismissSystemTag` callbacks; passes `dismissedSystemTags` and handlers to `FFIPlayerIntelCard`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-273: Keeper Equity Panel

**Task:** FF-273 (new feature)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** Keeper leagues need a way to evaluate whether each keeper is a good deal vs. current market. No equity visibility means Tyler is flying blind when deciding which players to keep and at what round cost.

**Changes:**
- `src/app/(app)/prep/keepers/client.tsx`: Added "Keeper Equity" card below the declared keepers list. Lazy-loads `/api/players` only when keepers exist. Uses existing `analyzeKeeperValues()` from `lib/draft/keepers.ts` to compute `surplus = round cost − ADP round` (snake) or `market − cost` (auction). Rows sorted descending by surplus (best deals first). Each row shows position, player name, round cost, ADP round, and a color-coded surplus badge (green = bargain, red = overpay, muted = no market data). Legend line explains the sign convention. Auction vs. snake display adapts to league format.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-268: Mobile-First Primary Action Audit

**Task:** FF-268 (output/UX)
**Class:** `output` | **Lenses:** QA, Delivery, Design

**Root Cause:** Setup wizard CTAs were at the bottom of free-scrolling containers, so on Step 3 with 10+ managers the "Start Draft" button was buried below the fold. Back buttons were text-only links with no touch target sizing. The ManualPickEntry clear (×) button had no height/width, making it a ~20px tap target.

**Changes:**
- `src/app/(app)/draft/setup/client.tsx`: All 4 steps now return a Fragment with scrollable content (`pb-24`) + fixed bottom CTA bar (`fixed inset-x-0 bottom-0 z-30 ffi-glass-heavy`), matching the live draft bar pattern. Error display for steps 3/4 moved into the fixed bar so it's always visible. Back buttons in steps 2/3/4 now have `min-h-[44px] flex items-center px-1`.
- `src/components/draft/manual-pick-entry.tsx`: Clear nomination button in bar variant changed from `text-lg leading-none` to `w-11 h-11 flex items-center justify-center` — 44px tap target.
- `src/app/(app)/draft/review/client.tsx`: View mode tab buttons (`My Draft / All Teams / Trash Talk`) bumped from `py-2.5` (~36px) to `min-h-[44px]`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7) — FF-275: Yahoo Keeper Assignment Import

**Task:** FF-275 (new feature)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** Tyler's keeper league (Yahoo snake) requires entering keepers manually one-by-one. Yahoo's keeper confirmation page can be copy-pasted but there was no import path, making setup tedious for 3+ keepers.

**Changes:**
- `src/app/(app)/prep/keepers/client.tsx`: Added "Import from Yahoo" collapsible section (collapsed by default) above the manual keeper list, visible only for snake leagues. Section contains a textarea for paste input, a "Parse & Import" button, and inline feedback (e.g. "3 keepers imported, 1 line skipped"). Added pure `parseYahooKeeperText()` function handling two Yahoo copy-paste formats: colon-style (`Round 3: Justin Jefferson (WR) - Tyler`) and tabular (`Justin Jefferson  WR  Round 3  Tyler`). Position normalization: DEF/D/ST → DST. Invalid lines are skipped with a count shown. Parsed entries are appended (not replaced), deduplicated by player_name case-insensitively. Added `normalizePosition()` helper.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6, cont.) — FF-267: Format Gate as First Live Draft Screen

**Task:** FF-267 (new feature / UX)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** The draft format (auction vs snake) was inherited silently from the league config with no explicit confirmation step. A user with a misconfigured league or who just forgot which format was set could enter the wrong mode without any friction.

**Changes:**
- `src/app/(app)/draft/setup/client.tsx`: Inserted new Step 1 (Format Gate) as the literal first screen of live draft setup. Shows a large, visually distinct confirmation card — green + "AUCTION DRAFT" or blue + "SNAKE DRAFT" — with league name, team count, and budget/format details. Requires explicit "Confirm — Start [Auction/Snake] Draft →" click to proceed. Includes "Wrong format? Update your league config" escape link. If multiple leagues exist, the league dropdown is on this screen. Renumbered old steps 1→2 (input method), 2→3 (session details), 3→4 (keepers); all internal step transitions updated. League dropdown removed from Step 3 (now handled in Step 1).

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6, cont.) — FF-266: Split recommend.ts into auction/snake variants

**Task:** FF-266 (refactor + feature)
**Class:** `pipeline` + `shared` | **Lenses:** Architecture, QA

**Root Cause:** `recommend.ts` handled both auction and snake with a single `fetchRecommendation` function that mixed auction-specific fields (`budgetRemaining`, `consensusAuctionValue`, `maxBid`) into a shared type. The API route prompt branched on `isAuction` inline, producing a diluted prompt for each format. Snake responses returned `maxBid: number` which has no meaning in a snake draft.

**Changes:**
- `src/lib/draft/recommend-auction.ts` (NEW): `LLMAuctionTarget` (has `maxBid`), `LLMAuctionRecommendation`, `fetchAuctionRecommendation`, `clearAuctionRecommendationCache`. Payload uses `consensusValue`/`adjustedValue` (auction values). Cache key prefixed `auction:`.
- `src/lib/draft/recommend-snake.ts` (NEW): `LLMSnakeTarget` (has `pickRound` instead of `maxBid`), `LLMSnakeRecommendation`, `fetchSnakeRecommendation`, `clearSnakeRecommendationCache`. Payload uses `adp`/`consensusRank`/`adjustedRound`. Recent picks include `round`, not `price`. Cache key prefixed `snake:`.
- `src/lib/draft/recommend.ts` (BARREL): Re-exports both modules. `clearRecommendationCache()` clears both caches — `client.tsx` import unchanged.
- `src/app/api/draft/recommend/route.ts`: Replaced single mixed prompt with `buildAuctionPrompts()` (budget-focused, `maxBid` in response) and `buildSnakePrompts()` (ADP/round-focused, `pickRound` in response). Dispatches on `format`. No format bleed.
- `src/components/draft/auction-advisor.tsx`: Imports `fetchAuctionRecommendation + LLMAuctionRecommendation`.
- `src/components/draft/snake-advisor.tsx`: Imports `fetchSnakeRecommendation + LLMSnakeRecommendation`. Target rendering updated to show `Rd {t.pickRound}` instead of `$maxBid`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6, cont.) — FF-264: Per-Player Max Comfortable Bid Display

**Task:** FF-264 (new feature)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** Auction managers had no quick way to see whether their current budget allowed them to bid competitively on a given player. The consensus value is visible, but without knowing their max comfortable bid alongside it, they had to mentally cross-reference the Budget Health Panel to make an on-the-spot decision.

**Changes:**
- `src/components/draft/ffi-player-card.tsx`: Added `maxBid?: number | null` to `FFIPlayerCardProps`. Computed `maxBidDelta = maxBid - player.consensusAuctionValue`. In the value display column, when `isAuction && maxBid != null`, renders "MAX $X" (`text-sm font-bold`) and a colored delta line (`text-[9px]`): green (+$X OVER) when max > consensus by >$2, orange (−$X UNDER) when max < consensus by >$2, muted (AT VALUE) within ±$2. Only shown in auction mode — snake cards unchanged.
- `src/components/draft/player-pool.tsx`: Added `maxBid?: number | null` to `PlayerPoolProps`, threaded through to each `FFIPlayerCard`.
- `src/app/(app)/draft/live/client.tsx`: Added `maxBid={myMaxBid}` to `PlayerPool` call. `myMaxBid` was already computed via `getMaxBidFor(myManager)`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6) — FF-263: Budget Health Panel + FF-265: Auction/Snake Bleed Audit

**Tasks:** FF-263 (new feature) + FF-265 (audit + fix)
**Class:** `output` + `shared` | **Lenses:** QA, Delivery, Architecture

**FF-263 — Budget Health Panel:**

**Root Cause:** Managers drafting in auction had no single at-a-glance view of how their budget was tracking — the existing FF-043 pacing block shows percentages and projections but not raw dollar numbers or slot counts, making it hard to mentally compute "what can I actually bid right now?"

**Changes:**
- `src/components/draft/auction-advisor.tsx`: Added FF-263 derived values (`totalSlots`, `filledSlots`, `remainingSlots`, `healthSpent`, `healthSafeRemaining`, `healthImpliedPerSlot`, `healthDelta`, `healthBurnStatus`) in component body. Added compact "Budget Health Panel" section above the FF-043 block: row 1 = `Spent $X · $Y left` + `N/M slots` (font-mono, tabular-nums); row 2 = `~$Z/slot remaining` + burn rate indicator (`+$X vs avg` green, `−$X vs avg` orange, `≈ avg` muted). Implied $/slot uses getMaxBid reserve logic ($1 per remaining empty slot). Row 2 hidden when no slots remain.

**FF-265 — Auction vs. Snake Bleed Audit:**

**Root Cause:** 12 draft components needed auditing to ensure no cross-mode concept bleed (round/pick-order in auction UI, prices/budgets in snake UI).

**Findings:** 11 files clean. One real bleed:
- `position-scarcity.tsx` has `showSpendRanges = true` default. `calculateScarcityExtended()` in `explain.ts` always populates `spendRange`/`avgValue` from player auction values, regardless of draft format. The call site in `client.tsx` passed no `showSpendRanges` prop → dollar spend ranges appeared in snake mode.

**Changes:**
- `src/app/(app)/draft/live/client.tsx`: Added `showSpendRanges={state.format === 'auction'}` to `PositionScarcityTracker` call.

**Verification:**
- ✅ `npm run lint` — no new errors in changed files (23 pre-existing errors unchanged)
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run build` — `✓ Compiled successfully in 3.7s`, 53 pages

---

## 2026-04-14 (session 5) — FF-262: Position Budget Tracker + FF-261 Audit

**Tasks:** FF-261 (audit, no code changes) + FF-262 (new feature)
**Class:** `shared` + `output` | **Lenses:** Architecture, QA, Delivery

**FF-261 — ESPN Auction Math Audit (no code changes):**
Math confirmed correct — see previous CHANGELOG entry below.

**FF-262 — Position Budget Tracker:**

**Root Cause:** During a live auction, managers have no live view of per-position spending vs. their pre-draft allocation plan. Without this, it's easy to overspend on RBs and arrive at TE/WR needing $30 of value with $8 left.

**Changes:**
- `src/lib/draft/auction-advisor.ts`: Added `PositionBudgetRow` interface + `getPositionBudgetBreakdown()` — iterates QB/RB/WR/TE/K/DST, computes `planned = (alloc% / 100) * budget_total` and `spent` from picks, returns `delta = planned - spent`; DST row matches both 'DST' and 'DEF' pick positions; filters to rows with spent > 0 or planned > 0
- `src/components/draft/auction-advisor.tsx`: Added "By Position" section inside `AuctionAdvisor` between budget-pace block and urgency warnings; shows position badge + mini progress bar + `$spent/$planned` text + colored delta (`+$X` green / `-$X` orange); section hidden when no picks + no plan; `league-overview.tsx` comment added to clear stale Turbopack cache (pre-existing stale error, not introduced here)

**Verification:**
- ✅ `npm run lint` — no new errors in changed files
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run build` — `✓ Compiled successfully in 3.4s`, 53 pages

**Reverse rationale (unchanged):**
- Existing `analyzeBudgetStrategy()` / `getPositionUrgencyWarnings()` — untouched
- `AuctionAdvisorProps` interface — no new props needed (strategy already passed)
- All API routes and DB schema — untouched

---

## 2026-04-14 (session 5 — audit only) — FF-261: ESPN Auction Math Audit

**Task:** Audit `src/lib/draft/auction-advisor.ts` for ESPN $200/15-slot model accuracy
**Class:** `bugfix` (audit — no code changed) | **Lens:** QA

**Findings:** Math is correct. No changes needed.

**Formula verified:**
- `calculateMaxBidAdvice()` lines 44–46: `emptySlots = totalSlots - picks.length - 1`; `absoluteMax = budget_remaining - emptySlots`
- Trace (5 slots filled, $80 remaining, 10 slots left): `emptySlots = 15 - 5 - 1 = 9`; `absoluteMax = 80 - 9 = 71` ✓
- Matches ESPN rule exactly: max bid = budget_remaining - (unfilled_slots - 1)
- `-1` correctly accounts for the player currently on the nomination block (fills one slot, needs no reserve)
- `getMaxBid()` in `state.ts:247` uses identical formula; consistent across both implementations
- No hardcoded slot counts — `totalSlots` always computed dynamically from `state.roster_slots`
- `mgr.budget_total ?? 200` fallback at line 121 is display-only (position budget advisory factor), not the safety constraint — non-$200 leagues unaffected

**Changes:** None (audit only)
- `BUILD_PLAN.md`: FF-261 marked [x] with confirmed-correct note

---

## 2026-04-14 (session 4) — P0 Redesign Sprint (FF-257 revision, FF-258, FF-259, FF-274)

**Task:** Implement all 4 P0 redesign decisions (Verdict B from FF-254 UI eval) + /prep/keepers page
**Class:** `output` + `shared` | **Lenses:** Architecture, QA, Delivery, Design
**Plan:** `docs/superpowers/plans/2026-04-14-p0-redesign.md` | **Spec:** `docs/superpowers/specs/2026-04-14-p0-redesign-design.md`

**Root Cause:** UI eval returned 3 hard FAILs (criteria a/b/e) and 3 partials (c/d/f). This sprint fixes a/b/c/e before P0 sub-tier 1–7 implementation begins.

**Changes:**

**FF-257 revision — Always-open On Block bar + BID button:**
- `manual-pick-entry.tsx`: bar variant rewritten — no collapse/expand; On Block slot replaces search input; price pre-fills from `consensusAuctionValue`; isBarValid gated on onBlockPlayer + manager + price; Undo always visible (disabled when no picks); auction manager defaults to `myManager`
- `ffi-player-card.tsx`: optional `onBid` prop + BID pill button (stopPropagation); 44px touch target
- `player-pool.tsx`: `onBidPlayer` prop threaded to each card; `useCallback` for stable identity
- `live/client.tsx`: `onBlockPlayer` state; `handleBidPlayer` wrapped in `useCallback`

**FF-259 — 4-state ConnectionStatusPill:**
- Created `connection-status-pill.tsx`: LIVE (green, pulsing dot) / STALE (amber) / OFFLINE (red, tap to expand error bar) / MANUAL (gray); 1s tick for elapsed timestamp; error bar auto-hides when state leaves OFFLINE
- `live/client.tsx`: replaced binary Wifi icon pill; always visible regardless of `session.sheet_url`; removed duplicate sheetError banner card

**FF-274 — Keeper visual markers:**
- `lib/draft/keepers.ts`: extracted `isKeeperPick()` + `displayPickNum()` as shared exports
- `live/client.tsx` (PickFeed): K1/K2/K3 numbers, 🔒 after position badge, muted name, no price; composite `manager-picknum` key prevents React key collisions
- `league-overview.tsx`: same keeper markers in expanded pick rows; 🔒 right-aligned replacing price/round

**/prep/keepers — New keeper declaration page:**
- Created `src/app/(app)/prep/keepers/` (page.tsx + client.tsx + loading.tsx)
- `KeeperDeclarationClient`: CRUD for keepers; auto-saves to `localStorage` (key: `ffi_keepers_{leagueId}`); `initialized` ref prevents spurious "Saved" flash on load; only shows keeper-enabled leagues
- `prep/page.tsx`: hub link added via `HubCard` component

**FF-258 — Multi-step draft setup flow:**
- `draft/setup/client.tsx`: 3-step flow — mode selector → league confirm + managers → keeper review
- Step 1: mode cards gate all else; Continue disabled until selection
- Step 2: read-only league confirmation card; Sheets URL shown for sheets mode only; keeper entry block removed
- Step 3: reads declared keepers from localStorage; K1/K2/K3 display with 🔒 and muted names; `handleSubmit(keepersOverride)` avoids React batching issue

**Verification:**
- ✅ `npm run lint` — no new errors in changed files
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run build` — 52 pages compiled

**Reverse rationale (unchanged):**
- All existing API contracts — untouched
- DB schema — no new tables or columns
- `applyKeepersToState()` logic — untouched
- DESIGN_SYSTEM.md Tactical Hologram tokens — untouched
- 27 research pipeline tests — all passing

---

## 2026-04-14 (session 3)

### [FEAT] FF-257 — Sticky pinned ManualPickEntry bar
**Task:** P0 sub-tier 1 first item — promote `ManualPickEntry` to always-visible pinned quick-entry bar at viewport bottom
**Class:** `output` + `shared` | **Lenses:** Architecture, QA, Delivery, Design

**Root Cause:** UI eval (FF-254) verdict-B FAIL on criterion (a). Live draft scrolling — user spots a player in the pool, scrolls down to find them, then has to scroll all the way back to the top to record the pick. Under auction time pressure this is a real failure mode.

**Changes:**
- `src/components/draft/manual-pick-entry.tsx`: Add `variant?: 'card' | 'bar'` prop. `bar` = chrome-less horizontal layout for sticky parent. Adds collapse/expand state, defaults collapsed on mobile (search + price + Record visible) and expanded on desktop (also shows Manager + Undo). Backward compatible: `card` is default. Search results dropdown opens UPWARD (`bottom-full`) so it's visible above the bar. 44px touch targets per FF-269 Tactical Hologram standard.
- `src/app/(app)/draft/live/client.tsx`: Removed `<ManualPickEntry>` from left column. Renders as `position: fixed inset-x-0 bottom-0 z-40` with `ffi-glass-heavy` background + `env(safe-area-inset-bottom)` padding (matches locked HTML prototype `UI/auction_live_draft/code.html:426–462`). Page wrapper now uses `pb-32` to clear bar. Conditional on `state.status !== 'completed'` (no entry needed post-draft).

**Verification:**
- ✅ `npm run lint` — both changed files clean (23 pre-existing errors in unrelated files unchanged)
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run type-check` — clean
- ✅ `npm run build` — `✓ Compiled successfully in 3.5s`

**Reverse rationale (what's NOT changed):**
- Submit logic (`handleSubmit`, `onSubmit` prop contract) — preserved
- Player search filtering (`useMemo` for filtered/available) — preserved
- DESIGN_SYSTEM.md tokens — untouched
- Database schema, API routes — untouched

---

## 2026-04-14 (session 2)

### [DOCS] FF-253/254 — UI evaluation gate complete
**Task:** Audit all live-draft screens against 6 criteria; produce `UI_EVAL_2026.md`
**Scope:** Read-only audit + `.claude/UI_EVAL_2026.md` (new file) + BUILD_PLAN.md checkpoint marks

**Root Cause:** P0 sub-tier 0 requires a UI verdict before any code work begins, to scope whether a full redesign or targeted fixes are needed.

**Findings:**
- 3 hard FAILs: (a) ManualPickEntry not pinned, (b) no mode selector at setup, (e) no keeper visual distinction
- 3 partial FAILs: (c) connection status binary/tiny/conditional, (d) confidence badges exist but no source attribution, (f) design system inconsistency (setup screen and 3 left-column components still use raw shadcn)

**Verdict: B — Targeted redesign.** Scope is contained:
- `DraftSetupClient` → add mode selector + FFI styling
- `ManualPickEntry` → promote to sticky pinned bottom bar
- `LeagueOverview` + `PickFeed` → keeper visual markers
- Connection status → 3-state indicator with size fix
All fixes are already scheduled as FF-257–259, FF-274. FF-255/256 (full redesign sprint) NOT triggered.

**Changes:**
- `.claude/UI_EVAL_2026.md`: NEW — full per-screen audit with evidence
- `.claude/BUILD_PLAN.md`: FF-253/254 marked [x]; dashboard nextItems updated; FF-255/256 marked as skipped

---

## 2026-04-14

### [CHORE] Enterprise dev system upgrade
**Task:** Upgrade `.claude/` to Enterprise tier per overhaul plan
**Scope:** `.claude/` directory only — no `src/` code touched

**Root Cause:** FFI's ad-hoc dev docs were missing navigation indexes, audit trail, review lenses, hooks, and skills that dev-workflow-builder generates at Enterprise tier. BUILD_PLAN.md also treated commercialization as near-term when personal season hardening is the actual P0.

**Changes:**
- `.claude/FEATURES_INDEX.md`: NEW — feature-to-code mapping with tags
- `.claude/CODE_AREAS.md`: NEW — API endpoints, hooks, and key functions index with line numbers
- `.claude/CHANGELOG.md`: NEW — this file
- `.claude/REVIEW_LENSES.md`: NEW — 6 Review Lenses with pre-check + verify checklists
- `.claude/hooks/pre-commit-gate.ps1`: NEW — lint hard gate + test advisory before commits
- `.claude/skills/code-review/SKILL.md`: NEW — /code-review adversarial review skill
- `.claude/settings.json`: NEW — enterprise hook registration (180s timeout)
- `.github/workflows/ci.yml`: NEW — TypeScript CI (lint + type-check + test on push to master)
- `.claude/CLAUDE.md`: MERGED — appended PROPOSE/PATCH/VERIFY workflow, Change Classification (8 types), 6 Review Lenses triggers, Bug Hunt Schedule, Evidence-Based Output Standard, Codebase Navigation Index, Definition of Done
- `.claude/BUILD_PLAN.md`: REWRITTEN — P0-P7 structure: personal season hardening as P0, Auctioneer integration as P1, pre-season validation as P2, commercialization deferred to P3+ (CONDITIONAL with explicit gates)
- `.claude/WORKING_STATE.md`: UPDATED — enterprise sections added (Last 48h, What Works/Broken, Blockers, Sheets setup, Commands reference)

**Testing:**
- Verified git diff shows no src/ changes
- CLAUDE.md search confirmed: PROPOSE, PATCH, VERIFY, Review Lens, Bug Hunt present
- BUILD_PLAN.md confirmed: P0→P7 structure, Gate: lines on P3-P7

**Result:** ✅ Enterprise tier active
**Commit:** [see git log]

---

## Entry Types

- `[FEATURE]` - New functionality
- `[FIX]` - Bug fix
- `[REFACTOR]` - Code reorganization (no behavior change)
- `[DOCS]` - Documentation only
- `[TEST]` - Test additions/updates
- `[CHORE]` - Dependencies, config, tooling

---

## Prior Work (Summary)

Phases 0–8 complete as of 2026-03-22 to 2026-04-14. Full history preserved in `BUILD_PLAN.md` Completed Work section. Highlights:
- Phase 0-2: Foundation + data pipeline + strategy engine
- Phase 3: Live draft mode (auction + snake)
- Phase 4-5: Polish + custom scoring intelligence
- Phase 6-7.5: FFIntelligence UI redesign (Tactical Hologram) + Player Intelligence System
- Phase 8: In-season AI companion (start/sit, waiver, trade, alerts)
