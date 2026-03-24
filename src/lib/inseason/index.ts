/**
 * In-Season Module Index
 *
 * Central export for all in-season features:
 * - Weekly projections
 * - Injury tracking
 * - Matchup data
 * - Waiver trending
 * - Roster sync
 * - Start/Sit advisor
 * - Waiver wire advisor
 */

// Re-export common types from players/types
export type {
  Position,
  ScoringFormat,
  Platform,
  MatchupData,
  WeeklyProjection,
  InjuryUpdate,
  WaiverTrending,
} from '@/lib/players/types'

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

// Roster Sync (FF-114)
export {
  getSleeperUser,
  getSleeperLeagues,
  getSleeperRoster,
  connectSleeper,
  syncUserRoster,
  getUserLeagues,
  getUserConnections,
  getUserConnection,
  saveUserConnection,
  type UserRoster,
  type RosterPlayer,
  type RosterSettings,
  type RosterSlot,
  type LeagueInfo,
} from './roster-sync'

// Start/Sit Advisor (FF-115 to FF-118)
export {
  getExpertRankings,
  getStartSitRecommendation,
  compareStartSit,
  analyzeRosterStartSit,
  type ExpertRanking,
  type StartSitRecommendation,
  type StartSitDecision,
  type RosterStartSitAnalysis,
  type StartSitAlert,
} from './start-sit-advisor'

// Waiver Wire Advisor (FF-119 to FF-122)
export {
  scanWaiverWire,
  analyzeWaiverWire,
  getTopWaiverPickups,
  getFaabRecommendation,
  type WaiverTarget,
  type FaabRecommendation,
  type RosterFitAnalysis,
  type WaiverWireAnalysis,
} from './waiver-wire-advisor'

// Trade Analyzer (FF-124 to FF-127)
export {
  analyzeTrade,
  findFairTrades,
  getPlayerValues,
  calculatePlayerValue,
  type PlayerValue,
  type TradePackage,
  type RosterImpact,
  type TradeAnalysis,
  type FairTradeOption,
} from './trade-analyzer'
