/**
 * dataset-types.ts - the shared contract for the headless research dataset.
 *
 * `scripts/research-run.ts` produces one big, data-backed snapshot (every
 * strategy sim, every stud combo, every enriched player, the Nasties league
 * intel) and writes it to `research-output/dataset.json`. Until now that file
 * was the ONLY consumer's shape - the app never read it. This contract makes the
 * snapshot a typed, first-class object so three things share one definition:
 *
 *   1. the writer   - research-run.ts types its `dataset` const as ResearchDataset
 *   2. the store    - research-publish.ts persists it to Supabase (kind: 'dataset')
 *   3. the readers  - /api/research-dataset + use-research-dataset return it typed
 *
 * Every field here already exists in the file research-run.ts writes; nothing is
 * invented. The composite types just reference the engine's own return types so
 * the contract can never silently drift from what the engine produces.
 */

import type { League, Position } from '@/lib/players/types'
import type { PlayerTag } from '@/lib/players/tags'
import type { PlayerRecommendation } from '@/lib/players/recommendation'
import type { CalibratedValueRange } from '@/lib/players/value-range'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { PersistedSimResults } from '@/lib/draft/sim-results'
import type {
  CalibratedPosition,
  PositionInflation,
  OwnerLean,
} from '@/lib/draft/league-calibration'

/**
 * Discriminates a dataset snapshot from the other `research_runs` rows.
 * Mirrors SIM_RUN_KIND ('sim') so both live in one table with no migration:
 * reads filter on `strategy_settings->>kind`.
 */
export const RESEARCH_DATASET_KIND = 'dataset' as const

/** Run-level provenance - all sourced from the fresh cache + engine, no LLM. */
export interface DatasetMeta {
  generatedAt: string
  league: string
  playerCount: number
  simRunsPerStrategy: number
  simSeed: number
  regularSeasonGames: number
  cacheLastUpdated: string | null
  cacheStale: boolean
  note: string
}

/** One anchor strategy graded with the risk model on (records, modal rosters, landed). */
export interface DatasetStrategy {
  proposal: StrategyProposal
  sim: PersistedSimResults
}

/** A concrete stud pair/trio inside an anchor pattern, sim-graded (risk on). */
export interface DatasetStudCombo {
  patternKey: string
  patternLabel: string
  anchorNames: string[]
  proposal: StrategyProposal
  sim: PersistedSimResults
}

/**
 * The Nasties ledger that grounds every recommendation: positional inflation
 * (where the room over/under-pays vs national), owner leans, and the 11
 * simulated opponents (real ledger owners) in seat order.
 */
export interface DatasetLeagueIntel {
  era: number[]
  draftsUsed: number
  positionalInflation: Record<CalibratedPosition, PositionInflation>
  ownerLeans: Record<string, OwnerLean>
  replicatedOpponents: string[]
}

/**
 * Per-player enrichment: the raw calibrated fields plus the durability-adjusted
 * value band, tags, the plain-English "read", and land odds. Mirrors the object
 * research-run.ts builds at its enrichment step exactly.
 */
export interface EnrichedPlayer {
  id: string
  name: string
  team: string
  position: Position
  byeWeek: number
  injuryStatus: string | null
  consensusRank: number
  adp: number
  consensusAuctionValue: number
  ceilingValue: number | null
  expectedRoomPrice: number | null
  valueGap: number | null
  projectedPoints: number | null
  vorp: number | null
  expertTier: number | null
  ecrPositionRank: number | null
  valueBand: CalibratedValueRange
  tags: PlayerTag[]
  read: PlayerRecommendation
  landProbability: number | null
  /** Injury-durability haircut on the room price, in (0,1]. 1 means no discount (healthy baseline or unmeasurable). */
  durabilityPriceFactor: number
}

/** The whole snapshot - one interrogable object the app and any LLM can read. */
export interface ResearchDataset {
  meta: DatasetMeta
  league: League
  leagueIntel: DatasetLeagueIntel
  strategies: DatasetStrategy[]
  studCombos: DatasetStudCombo[]
  players: EnrichedPlayer[]
}

/**
 * The row shape returned to callers of /api/research-dataset. `dataset` is the
 * snapshot above; the envelope carries the store's own bookkeeping so the client
 * can show "generated X, N players" without reparsing the whole payload.
 */
export interface ResearchDatasetRun {
  id: string
  leagueId: string
  createdAt: string
  completedAt: string | null
  dataset: ResearchDataset
}
