/**
 * In-Season Module Index
 *
 * Central export for all in-season features:
 * - Weekly projections
 * - Injury tracking
 * - Matchup data
 * - Waiver trending
 */

// Weekly Projections
export {
  fetchWeeklyProjections,
  cacheWeeklyProjections,
  readWeeklyProjections,
  getCurrentWeek,
  isWeeklyProjectionsStale,
} from './weekly-projections'

// Injury Tracking
export {
  checkInjuryUpdates,
  getPlayerInjuryHistory,
  getRecentInjuryUpdates,
  getInjuredPlayers,
} from './injury-tracker'

// Matchup Data
export {
  getTeamMatchup,
  getWeekMatchups,
  getDefensiveRank,
  rateMatchup,
  calculateImpliedScore,
  upsertMatchupData,
  getFavorableMatchups,
  getToughMatchups,
} from './matchup-data'

// Waiver Trending
export {
  fetchWaiverTrending,
  getTopWaiverTargets,
  getMostDropped,
  getRisingPlayers,
  getFallingPlayers,
  getTrendingByPosition,
  getTrendingSummary,
  type TrendingSummary,
} from './waiver-trending'
