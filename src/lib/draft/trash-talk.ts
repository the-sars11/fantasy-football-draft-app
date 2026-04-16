/**
 * Trash Talk System (FF-076)
 *
 * Detects draft mistakes and generates trash talk alerts.
 * Types: overpay, roster imbalance, bye week disaster, reach, steal
 */

import type { DraftPick } from './state'
import type { KeeperAssignment } from './keepers'
import type { Player, Position } from '@/lib/players/types'

export type TrashTalkType =
  | 'overpay'
  | 'imbalance'
  | 'bye_disaster'
  | 'reach'
  | 'steal'
  | 'budget_buster'
  | 'last_big_spender'
  | 'cheapskate_special'
  | 'budget_dominance'
  | 'first_defense_buy'
  | 'lone_wolf_qb'
  | 'market_mismatch'
  | 'late_roster_qb_panic'
  | 'keeper_steal'
  | 'bad_keeper'

export interface TrashTalkAlert {
  id: string
  type: TrashTalkType
  managerName: string
  message: string
  detail: string
  pickNumber: number
  severity: 'mild' | 'medium' | 'savage'
  timestamp: number
  playerName?: string
  savedForLater?: boolean
}

// Average auction values by position (baseline for overpay detection)
const AVG_POSITION_VALUES: Record<Position, number> = {
  QB: 12,
  RB: 30,
  WR: 25,
  TE: 10,
  K: 1,
  DEF: 2,
}

// Average draft rounds by position (baseline for reach detection)
const AVG_POSITION_ROUNDS: Record<Position, number> = {
  QB: 7,
  RB: 3,
  WR: 3,
  TE: 6,
  K: 14,
  DEF: 14,
}

// Roster requirements for imbalance detection
const MIN_ROSTER_COUNTS: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
}

// Default league constants (used when config is not passed through to trigger engine)
const DEFAULT_AUCTION_BUDGET = 200
const DEFAULT_ROSTER_SPOTS = 15

/**
 * Compute implied auction value using quadratic decay from ADP.
 * Returns consensusAuctionValue if available, otherwise derives from rank + budget.
 */
function impliedAuctionValue(player: Player | undefined, budget: number, teamCount: number): number {
  if (player && player.consensusAuctionValue > 0) return player.consensusAuctionValue
  if (!player || player.adp <= 0) return 1
  const maxValue = budget * 0.35
  const maxRank = teamCount * 10
  const decay = Math.max(0, 1 - (player.adp - 1) / maxRank)
  return Math.max(1, Math.round(maxValue * decay * decay))
}

/**
 * Analyze a pick and generate trash talk if warranted
 */
export function analyzePickForTrashTalk(
  pick: DraftPick,
  allPicks: DraftPick[],
  players: Player[],
  format: 'auction' | 'snake',
  myManagerName: string,
  teamCount: number,
): TrashTalkAlert | null {
  const pos = pick.position?.toUpperCase() as Position

  // first_defense_buy: must fire BEFORE the K/DEF guard
  const defAlert = detectFirstDefenseBuy(pick, allPicks, pos)
  if (defAlert) return defAlert

  if (!pos || pos === 'K' || pos === 'DEF') return null

  const player = players.find(
    p => p.name.toLowerCase() === pick.player_name.toLowerCase()
  )
  const managerPicks = allPicks.filter(p => p.manager === pick.manager)

  // budget_buster: auction-only, fires even on your own picks
  if (format === 'auction') {
    const bbAlert = detectBudgetBuster(pick, managerPicks, DEFAULT_AUCTION_BUDGET, DEFAULT_ROSTER_SPOTS)
    if (bbAlert) return bbAlert
  }

  // Don't trash talk yourself (but DO alert if you got a steal)
  if (pick.manager === myManagerName) {
    const stealAlert = detectSteal(pick, player, format, teamCount, DEFAULT_AUCTION_BUDGET)
    if (stealAlert) {
      return {
        ...stealAlert,
        managerName: pick.manager,
        severity: 'mild',
      }
    }
    return null
  }

  // overpay (auction, opponents only)
  if (format === 'auction' && pick.price != null) {
    const overpayAlert = detectOverpay(pick, player, pos, DEFAULT_AUCTION_BUDGET, teamCount)
    if (overpayAlert) return overpayAlert
  }

  // steal (opponents)
  const stealAlert = detectSteal(pick, player, format, teamCount, DEFAULT_AUCTION_BUDGET)
  if (stealAlert) return stealAlert

  // market_mismatch (both formats): comparable player at same position, wildly different price/round
  const mmAlert = detectMarketMismatch(pick, allPicks, player, players, format)
  if (mmAlert) return mmAlert

  // last_big_spender (auction, league-state)
  if (format === 'auction') {
    const lbsAlert = detectLastBigSpender(pick, allPicks, teamCount, DEFAULT_AUCTION_BUDGET)
    if (lbsAlert) return lbsAlert
  }

  // budget_dominance (auction, league-state)
  if (format === 'auction') {
    const bdAlert = detectBudgetDominance(pick, allPicks, teamCount, DEFAULT_AUCTION_BUDGET)
    if (bdAlert) return bdAlert
  }

  // lone_wolf_qb (both formats)
  const lwqbAlert = detectLoneWolfQb(pick, managerPicks)
  if (lwqbAlert) return lwqbAlert

  // late_roster_qb_panic (snake-only — lower threshold than lone_wolf_qb, covers picks 7-8)
  if (format === 'snake') {
    const lqpAlert = detectLateRosterQbPanic(pick, managerPicks)
    if (lqpAlert) return lqpAlert
  }

  // cheapskate_special (auction)
  if (format === 'auction') {
    const csAlert = detectCheapskateSpecial(pick, managerPicks)
    if (csAlert) return csAlert
  }

  // reach (snake)
  if (format === 'snake' && pick.round != null) {
    const reachAlert = detectReach(pick, player, pos, pick.round)
    if (reachAlert) return reachAlert
  }

  // imbalance (both formats)
  const imbalanceAlert = detectRosterImbalance(pick, managerPicks, pos, teamCount)
  if (imbalanceAlert) return imbalanceAlert

  return null
}

/**
 * Detect overpay in auction drafts
 */
function detectOverpay(
  pick: DraftPick,
  player: Player | undefined,
  pos: Position,
  budget: number,
  teamCount: number,
): TrashTalkAlert | null {
  if (!player) return null
  const price = pick.price!
  const expectedValue = impliedAuctionValue(player, budget, teamCount)
  const overpayAmount = price - expectedValue
  const overpayPercent = expectedValue > 0 ? (overpayAmount / expectedValue) * 100 : 0

  if (overpayAmount >= 10 || overpayPercent >= 30) {
    const severity = overpayAmount >= 20 || overpayPercent >= 50 ? 'savage'
      : overpayAmount >= 15 || overpayPercent >= 40 ? 'medium'
      : 'mild'

    const messages = severity === 'savage'
      ? [
          `${pick.manager} just LIT MONEY ON FIRE 🔥`,
          `Someone call the police, ${pick.manager} just got ROBBED`,
          `${pick.manager} said "I don't need this money anyway"`,
        ]
      : severity === 'medium'
      ? [
          `${pick.manager} paid the premium premium`,
          `That's... a choice, ${pick.manager}`,
          `${pick.manager} really wanted ${pick.player_name}`,
        ]
      : [
          `${pick.manager} paid a bit extra`,
          `Slight overpay from ${pick.manager}`,
        ]

    return {
      id: `overpay-${pick.pick_number}`,
      type: 'overpay',
      managerName: pick.manager,
      message: messages[Math.floor(Math.random() * messages.length)],
      detail: `Paid $${price} for ${pick.player_name} — that's $${overpayAmount} OVER consensus value ($${expectedValue}). Easy target for trash talk.`,
      pickNumber: pick.pick_number,
      severity,
      timestamp: Date.now(),
      playerName: pick.player_name,
    }
  }

  return null
}

/**
 * Detect reach picks in snake drafts
 */
function detectReach(
  pick: DraftPick,
  player: Player | undefined,
  pos: Position,
  round: number,
): TrashTalkAlert | null {
  const expectedRound = player
    ? Math.ceil(player.adp / 12) // Rough round estimate from ADP
    : AVG_POSITION_ROUNDS[pos]

  const reachRounds = expectedRound - round

  if (reachRounds >= 3) {
    const severity = reachRounds >= 5 ? 'savage' : reachRounds >= 4 ? 'medium' : 'mild'

    const messages = severity === 'savage'
      ? [
          `${pick.manager} panicked and reached HARD`,
          `${pick.player_name} wasn't going anywhere, ${pick.manager}...`,
          `${pick.manager} must have different rankings than everyone else`,
        ]
      : [
          `${pick.manager} reached a bit early`,
          `Could've waited on that one, ${pick.manager}`,
        ]

    return {
      id: `reach-${pick.pick_number}`,
      type: 'reach',
      managerName: pick.manager,
      message: messages[Math.floor(Math.random() * messages.length)],
      detail: `Drafted ${pick.player_name} in Round ${round}, but ADP suggested Round ${expectedRound}. That's ${reachRounds} rounds early.`,
      pickNumber: pick.pick_number,
      severity,
      timestamp: Date.now(),
      playerName: pick.player_name,
    }
  }

  return null
}

/**
 * Detect roster imbalance
 */
function detectRosterImbalance(
  pick: DraftPick,
  managerPicks: DraftPick[],
  currentPos: Position,
  teamCount: number,
): TrashTalkAlert | null {
  const totalPicks = managerPicks.length
  const expectedPicksPerPosition = Math.floor(totalPicks / 4) // Rough balance

  // Count positions
  const posCounts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 }
  for (const p of managerPicks) {
    const pos = p.position?.toUpperCase()
    if (pos && posCounts[pos] !== undefined) {
      posCounts[pos]++
    }
  }

  // Check for hoarding one position while neglecting others
  const thisCount = posCounts[currentPos] || 0

  // Check for WR/RB hoarding with empty other positions
  if ((currentPos === 'RB' || currentPos === 'WR') && thisCount >= 4) {
    const otherPos = currentPos === 'RB' ? 'WR' : 'RB'
    const otherCount = posCounts[otherPos] || 0

    if (otherCount === 0 && totalPicks >= 6) {
      return {
        id: `imbalance-${pick.pick_number}`,
        type: 'imbalance',
        managerName: pick.manager,
        message: `${pick.manager} is building a ${currentPos}-only team apparently`,
        detail: `${thisCount} ${currentPos}s and ZERO ${otherPos}s after ${totalPicks} picks. Classic rookie move.`,
        pickNumber: pick.pick_number,
        severity: 'medium',
        timestamp: Date.now(),
      }
    }
  }

  // Check for too many QBs early
  if (currentPos === 'QB' && thisCount >= 2 && totalPicks <= 8) {
    return {
      id: `imbalance-qb-${pick.pick_number}`,
      type: 'imbalance',
      managerName: pick.manager,
      message: `${pick.manager} really trusts their QB research`,
      detail: `${thisCount} QBs in the first ${totalPicks} picks? Interesting strategy...`,
      pickNumber: pick.pick_number,
      severity: 'mild',
      timestamp: Date.now(),
    }
  }

  return null
}

/**
 * Detect steal picks (great value)
 */
function detectSteal(
  pick: DraftPick,
  player: Player | undefined,
  format: 'auction' | 'snake',
  teamCount: number,
  budget: number,
): TrashTalkAlert | null {
  if (!player) return null

  if (format === 'auction' && pick.price != null) {
    const expectedValue = impliedAuctionValue(player, budget, teamCount)
    const discount = expectedValue - pick.price
    const discountPercent = expectedValue > 0 ? (discount / expectedValue) * 100 : 0

    if (discount >= 10 || discountPercent >= 30) {
      return {
        id: `steal-${pick.pick_number}`,
        type: 'steal',
        managerName: pick.manager,
        message: `${pick.manager} just got away with robbery`,
        detail: `Snagged ${pick.player_name} for $${pick.price} — that's $${discount} under value ($${expectedValue}). League was sleeping.`,
        pickNumber: pick.pick_number,
        severity: discount >= 20 ? 'medium' : 'mild',
        timestamp: Date.now(),
        playerName: pick.player_name,
      }
    }
  }

  if (format === 'snake' && pick.round != null) {
    const expectedRound = Math.ceil(player.adp / teamCount)
    const stealRounds = pick.round - expectedRound

    if (stealRounds >= 3) {
      return {
        id: `steal-${pick.pick_number}`,
        type: 'steal',
        managerName: pick.manager,
        message: `${pick.manager} got a late-round steal`,
        detail: `${pick.player_name} fell to Round ${pick.round} (ADP: Round ${expectedRound}). That's ${stealRounds} rounds of value.`,
        pickNumber: pick.pick_number,
        severity: stealRounds >= 5 ? 'medium' : 'mild',
        timestamp: Date.now(),
        playerName: pick.player_name,
      }
    }
  }

  return null
}

/**
 * Detect budget buster: team spent >60% of budget with <35% of roster slots filled (auction-only)
 */
function detectBudgetBuster(
  pick: DraftPick,
  managerPicks: DraftPick[],
  budget: number,
  totalRosterSpots: number,
): TrashTalkAlert | null {
  const spent = managerPicks.reduce((s, p) => s + (p.price ?? 0), 0)
  const pickCount = managerPicks.length
  const spentPct = spent / budget
  const filledPct = pickCount / totalRosterSpots

  if (spentPct > 0.60 && filledPct < 0.35) {
    const remaining = budget - spent
    const spotsLeft = totalRosterSpots - pickCount
    const severity: TrashTalkAlert['severity'] = spentPct > 0.75 ? 'savage' : 'medium'
    const messages =
      severity === 'savage'
        ? [
            `${pick.manager} just torched their budget`,
            `${pick.manager} has money problems and it's only pick ${pick.pick_number}`,
          ]
        : [
            `${pick.manager} is spending like there's no tomorrow`,
            `${pick.manager} blew through 60% of their budget already`,
          ]

    return {
      id: `budget_buster-${pick.pick_number}`,
      type: 'budget_buster',
      managerName: pick.manager,
      message: messages[Math.floor(Math.random() * messages.length)],
      detail: `Team has spent $${spent} of $${budget} with ${pickCount} of ${totalRosterSpots} spots filled ($${remaining} left for ${spotsLeft} spots)`,
      pickNumber: pick.pick_number,
      severity,
      timestamp: Date.now(),
    }
  }

  return null
}

/**
 * Detect last big spender: pick 30+, exactly 1 team has remaining budget >2x league avg AND >$30 (auction-only)
 */
function detectLastBigSpender(
  pick: DraftPick,
  allPicks: DraftPick[],
  teamCount: number,
  budget: number,
): TrashTalkAlert | null {
  if (pick.pick_number < 30) return null

  const spentByManager: Record<string, number> = {}
  for (const p of allPicks) {
    spentByManager[p.manager] = (spentByManager[p.manager] ?? 0) + (p.price ?? 0)
  }

  const managersSeen = Object.keys(spentByManager)
  const allRemaining = managersSeen.map(name => ({
    name,
    remaining: budget - (spentByManager[name] ?? 0),
  }))

  // Teams not yet seen: assume full budget remaining
  const unseenCount = Math.max(0, teamCount - managersSeen.length)
  const totalRemaining =
    allRemaining.reduce((s, m) => s + m.remaining, 0) + unseenCount * budget
  const leagueAvg = totalRemaining / teamCount

  const richTeams = allRemaining.filter(m => m.remaining > 2 * leagueAvg && m.remaining > 30)
  if (richTeams.length !== 1) return null

  const richTeam = richTeams[0]
  return {
    id: `last_big_spender-${pick.pick_number}`,
    type: 'last_big_spender',
    managerName: richTeam.name,
    message: `${richTeam.name} is sitting on a war chest while everyone else scrapes`,
    detail: `${richTeam.name} has $${richTeam.remaining} left; rest of league averages $${Math.round(leagueAvg)}`,
    pickNumber: pick.pick_number,
    severity: 'medium',
    timestamp: Date.now(),
  }
}

/**
 * Detect cheapskate special: price ≤$3, team has 4+ picks, avg spend <$7/pick (auction-only)
 */
function detectCheapskateSpecial(
  pick: DraftPick,
  managerPicks: DraftPick[],
): TrashTalkAlert | null {
  const price = pick.price ?? 0
  const pickCount = managerPicks.length
  if (price > 3 || pickCount < 4) return null

  const totalSpent = managerPicks.reduce((s, p) => s + (p.price ?? 0), 0)
  const avgSpend = totalSpent / pickCount

  if (avgSpend < 7) {
    return {
      id: `cheapskate_special-${pick.pick_number}`,
      type: 'cheapskate_special',
      managerName: pick.manager,
      message: `${pick.manager} found the dollar menu section of the draft`,
      detail: `Team averaging $${avgSpend.toFixed(2)} per player across ${pickCount} picks; just paid $${price}`,
      pickNumber: pick.pick_number,
      severity: 'mild',
      timestamp: Date.now(),
      playerName: pick.player_name,
    }
  }

  return null
}

/**
 * Detect budget dominance: pick 40+, top team's remaining >1.5x league avg AND >$30 (auction-only)
 */
function detectBudgetDominance(
  pick: DraftPick,
  allPicks: DraftPick[],
  teamCount: number,
  budget: number,
): TrashTalkAlert | null {
  if (pick.pick_number < 40) return null

  const spentByManager: Record<string, number> = {}
  for (const p of allPicks) {
    spentByManager[p.manager] = (spentByManager[p.manager] ?? 0) + (p.price ?? 0)
  }

  const managersSeen = Object.keys(spentByManager)
  const allRemaining = managersSeen.map(name => ({
    name,
    remaining: budget - (spentByManager[name] ?? 0),
  }))

  const unseenCount = Math.max(0, teamCount - managersSeen.length)
  const totalRemaining =
    allRemaining.reduce((s, m) => s + m.remaining, 0) + unseenCount * budget
  const leagueAvg = totalRemaining / teamCount

  const top = allRemaining.reduce<{ name: string; remaining: number } | null>(
    (best, m) => (best === null || m.remaining > best.remaining ? m : best),
    null,
  )
  if (!top) return null

  if (top.remaining > 1.5 * leagueAvg && top.remaining > 30) {
    return {
      id: `budget_dominance-${pick.pick_number}`,
      type: 'budget_dominance',
      managerName: top.name,
      message: `${top.name} is running a budget masterclass out here`,
      detail: `${top.name} has $${top.remaining} left; league average is $${Math.round(leagueAvg)}`,
      pickNumber: pick.pick_number,
      severity: 'medium',
      timestamp: Date.now(),
    }
  }

  return null
}

/**
 * Detect first defense buy: first DEF pick in the entire draft (both formats).
 * Must be called BEFORE the K/DEF guard in analyzePickForTrashTalk.
 */
function detectFirstDefenseBuy(
  pick: DraftPick,
  allPicks: DraftPick[],
  pos: Position | undefined,
): TrashTalkAlert | null {
  if (pos !== 'DEF') return null

  const priorDefPicks = allPicks.filter(
    p => p.pick_number < pick.pick_number && p.position?.toUpperCase() === 'DEF',
  )
  if (priorDefPicks.length > 0) return null

  return {
    id: `first_defense_buy-${pick.pick_number}`,
    type: 'first_defense_buy',
    managerName: pick.manager,
    message: `${pick.manager} is the first to grab a defense — bold early move`,
    detail: `First DEF bought at pick #${pick.pick_number}; all other teams still have zero defenses`,
    pickNumber: pick.pick_number,
    severity: 'mild',
    timestamp: Date.now(),
    playerName: pick.player_name,
  }
}

/**
 * Detect lone wolf QB: team has 9+ picks, no QB drafted, current pick is not QB (both formats)
 */
function detectLoneWolfQb(
  pick: DraftPick,
  managerPicks: DraftPick[],
): TrashTalkAlert | null {
  const pickCount = managerPicks.length
  if (pickCount < 9) return null
  if (pick.position?.toUpperCase() === 'QB') return null

  const hasQb = managerPicks.some(p => p.position?.toUpperCase() === 'QB')
  if (hasQb) return null

  return {
    id: `lone_wolf_qb-${pick.pick_number}`,
    type: 'lone_wolf_qb',
    managerName: pick.manager,
    message: `${pick.manager} still has no QB after ${pickCount} picks`,
    detail: `${pickCount} players drafted and still no QB — either a genius or a disaster waiting to happen`,
    pickNumber: pick.pick_number,
    severity: pickCount >= 12 ? 'medium' : 'mild',
    timestamp: Date.now(),
  }
}

/**
 * Detect market mismatch: comparable player at same position drafted at wildly different price/round (both formats)
 */
function detectMarketMismatch(
  pick: DraftPick,
  allPicks: DraftPick[],
  player: Player | undefined,
  players: Player[],
  format: 'auction' | 'snake',
): TrashTalkAlert | null {
  if (!player || player.adp <= 0) return null
  const pos = pick.position?.toUpperCase()
  if (!pos) return null
  const pickAdp = player.adp

  for (const comp of allPicks) {
    if (comp.manager === pick.manager) continue
    if (comp.pick_number === pick.pick_number) continue
    if (comp.position?.toUpperCase() !== pos) continue
    if (comp.is_keeper) continue

    const compPlayer = players.find(p => p.name.toLowerCase() === comp.player_name.toLowerCase())
    if (!compPlayer || compPlayer.adp <= 0) continue
    if (Math.abs(compPlayer.adp - pickAdp) > 15) continue

    if (format === 'auction' && pick.price != null && comp.price != null) {
      const avgPrice = (pick.price + comp.price) / 2
      if (avgPrice === 0) continue
      const spread = Math.abs(pick.price - comp.price) / avgPrice
      if (spread >= 0.35) {
        const isSteal = pick.price < comp.price
        return {
          id: `market_mismatch-${pick.pick_number}`,
          type: 'market_mismatch',
          managerName: pick.manager,
          message: isSteal
            ? `${pick.manager} got ${pick.player_name} at a steal vs comparable picks`
            : `${pick.manager} paid a premium vs comparable picks at the same tier`,
          detail: `${pick.player_name} (ADP ${Math.round(pickAdp)}) at $${pick.price} — ${comp.manager} got comparable ${comp.player_name} (ADP ${Math.round(compPlayer.adp)}) for $${comp.price}`,
          pickNumber: pick.pick_number,
          severity: spread >= 0.5 ? 'medium' : 'mild',
          timestamp: Date.now(),
          playerName: pick.player_name,
        }
      }
    }

    if (format === 'snake' && pick.round != null && comp.round != null) {
      const roundDiff = pick.round - comp.round
      const n = Math.abs(roundDiff)
      if (n >= 3) {
        const isLater = roundDiff > 0 // current pick went later = better value
        return {
          id: `market_mismatch-${pick.pick_number}`,
          type: 'market_mismatch',
          managerName: pick.manager,
          message: isLater
            ? `${pick.manager} snagged ${pick.player_name} way later than a comparable pick`
            : `${pick.manager} reached early vs a comparable pick`,
          detail: `${pick.player_name} (ADP ${Math.round(pickAdp)}) drafted Round ${pick.round}; comparable ${comp.player_name} (ADP ${Math.round(compPlayer.adp)}) went to ${comp.manager} Round ${comp.round} — ${n} rounds ${isLater ? 'cheaper/later' : 'earlier'} for similar-tier ${pos}`,
          pickNumber: pick.pick_number,
          severity: n >= 5 ? 'medium' : 'mild',
          timestamp: Date.now(),
          playerName: pick.player_name,
        }
      }
    }
  }

  return null
}

/**
 * Detect late roster QB panic: snake-only, team has 7+ picks with no QB and current pick is not QB
 */
function detectLateRosterQbPanic(
  pick: DraftPick,
  managerPicks: DraftPick[],
): TrashTalkAlert | null {
  const pickCount = managerPicks.length
  if (pickCount < 7) return null
  if (pick.position?.toUpperCase() === 'QB') return null

  const hasQb = managerPicks.some(p => p.position?.toUpperCase() === 'QB')
  if (hasQb) return null

  const currentRound = pick.round ?? pickCount
  return {
    id: `late_roster_qb_panic-${pick.pick_number}`,
    type: 'late_roster_qb_panic',
    managerName: pick.manager,
    message: `${pick.manager} still no QB — Round ${currentRound} problem incoming`,
    detail: `Team has ${pickCount} players and still no QB; just drafted another ${pick.position ?? '?'} in Round ${currentRound}`,
    pickNumber: pick.pick_number,
    severity: pickCount >= 10 ? 'savage' : pickCount >= 8 ? 'medium' : 'mild',
    timestamp: Date.now(),
  }
}

/**
 * Analyze all keepers for trash talk value alerts.
 * Call once at draft start. Returns keeper_steal / bad_keeper alerts for notable keepers.
 */
export function analyzeKeeperPicksForTrashTalk(
  keepers: KeeperAssignment[],
  players: Player[],
  format: 'auction' | 'snake',
  teamCount: number,
): TrashTalkAlert[] {
  const alerts: TrashTalkAlert[] = []

  for (let i = 0; i < keepers.length; i++) {
    const keeper = keepers[i]
    const player = players.find(p => p.name.toLowerCase() === keeper.player_name.toLowerCase())
    if (!player) continue

    if (format === 'snake') {
      const adpRound = Math.max(1, Math.ceil(player.adp / teamCount))
      const keeperRound = keeper.cost
      const surplus = keeperRound - adpRound // positive = steal (paying later round for earlier talent)

      if (surplus >= 3) {
        alerts.push({
          id: `keeper_steal-${i}`,
          type: 'keeper_steal',
          managerName: keeper.manager,
          message: `${keeper.manager} kept ${keeper.player_name} at a STEAL`,
          detail: `Kept at Round ${keeperRound} — ADP is Round ${adpRound}. That's ${surplus} rounds of free value.`,
          pickNumber: -(i + 1),
          severity: surplus >= 5 ? 'savage' : 'medium',
          timestamp: Date.now(),
          playerName: keeper.player_name,
        })
      } else if (surplus <= -2) {
        const overpayRounds = Math.abs(surplus)
        alerts.push({
          id: `bad_keeper-${i}`,
          type: 'bad_keeper',
          managerName: keeper.manager,
          message: `${keeper.manager} is locked into a questionable keeper`,
          detail: `Keeping ${keeper.player_name} at Round ${keeperRound}, but ADP is Round ${adpRound}. Overpaying by ${overpayRounds} rounds.`,
          pickNumber: -(i + 1),
          severity: overpayRounds >= 4 ? 'medium' : 'mild',
          timestamp: Date.now(),
          playerName: keeper.player_name,
        })
      }
    } else {
      const expectedValue = impliedAuctionValue(player, DEFAULT_AUCTION_BUDGET, teamCount)
      const surplus = expectedValue - keeper.cost // positive = deal (market > cost)

      if (surplus >= 10) {
        alerts.push({
          id: `keeper_steal-${i}`,
          type: 'keeper_steal',
          managerName: keeper.manager,
          message: `${keeper.manager} is keeping ${keeper.player_name} at a massive discount`,
          detail: `Keeper cost $${keeper.cost}, market value ~$${expectedValue}. That's $${surplus} of free money going into the draft.`,
          pickNumber: -(i + 1),
          severity: surplus >= 20 ? 'savage' : 'medium',
          timestamp: Date.now(),
          playerName: keeper.player_name,
        })
      } else if (surplus <= -10) {
        const overpay = Math.abs(surplus)
        alerts.push({
          id: `bad_keeper-${i}`,
          type: 'bad_keeper',
          managerName: keeper.manager,
          message: `${keeper.manager} is keeping ${keeper.player_name} well above market`,
          detail: `Keeper cost $${keeper.cost}, market value ~$${expectedValue}. Overpaying by $${overpay} before the draft even starts.`,
          pickNumber: -(i + 1),
          severity: overpay >= 20 ? 'medium' : 'mild',
          timestamp: Date.now(),
          playerName: keeper.player_name,
        })
      }
    }
  }

  return alerts
}

/**
 * Detect bye week disasters
 */
export function detectByeWeekDisaster(
  managerPicks: DraftPick[],
  players: Player[],
): TrashTalkAlert | null {
  // Count players by bye week
  const byeWeeks: Record<number, string[]> = {}

  for (const pick of managerPicks) {
    const player = players.find(
      p => p.name.toLowerCase() === pick.player_name.toLowerCase()
    )
    if (player && player.byeWeek) {
      if (!byeWeeks[player.byeWeek]) byeWeeks[player.byeWeek] = []
      byeWeeks[player.byeWeek].push(player.name)
    }
  }

  // Find bye weeks with 4+ players
  for (const [week, playerNames] of Object.entries(byeWeeks)) {
    if (playerNames.length >= 4) {
      const managerName = managerPicks[0]?.manager || 'Someone'
      return {
        id: `bye-disaster-${week}`,
        type: 'bye_disaster',
        managerName,
        message: `${managerName}'s Week ${week} is gonna be ROUGH`,
        detail: `${playerNames.length} players share bye week ${week}: ${playerNames.join(', ')}. Hope they like auto-loss.`,
        pickNumber: managerPicks[managerPicks.length - 1]?.pick_number || 0,
        severity: playerNames.length >= 5 ? 'savage' : 'medium',
        timestamp: Date.now(),
      }
    }
  }

  return null
}

// --- Post-Draft Roast Report ---

export interface RoastReportEntry {
  managerName: string
  roastType: string
  title: string
  description: string
  severity: 'mild' | 'medium' | 'savage'
}

export interface RoastReport {
  entries: RoastReportEntry[]
  mvpOfOverpaying: string | null
  mostPanicked: string | null
  luckyBastard: string | null
  byeWeekChampion: string | null
}

/**
 * Generate post-draft roast report
 */
export function generateRoastReport(
  allPicks: DraftPick[],
  players: Player[],
  managers: string[],
  format: 'auction' | 'snake',
  teamCount: number,
): RoastReport {
  const entries: RoastReportEntry[] = []
  const overpayTotals: Record<string, number> = {}
  const reachCounts: Record<string, number> = {}
  const stealCounts: Record<string, number> = {}
  const byeWeekIssues: Record<string, number> = {}

  for (const manager of managers) {
    const managerPicks = allPicks.filter(p => p.manager === manager)
    let totalOverpay = 0
    let reaches = 0
    let steals = 0

    for (const pick of managerPicks) {
      const player = players.find(
        p => p.name.toLowerCase() === pick.player_name.toLowerCase()
      )
      const pos = pick.position?.toUpperCase() as Position

      // Track overpays
      if (format === 'auction' && pick.price != null && player) {
        const expected = player.consensusAuctionValue
        const overpay = pick.price - expected
        if (overpay > 0) totalOverpay += overpay
      }

      // Track reaches
      if (format === 'snake' && pick.round != null && player) {
        const expectedRound = Math.ceil(player.adp / teamCount)
        if (expectedRound - pick.round >= 3) reaches++
      }

      // Track steals
      if (format === 'auction' && pick.price != null && player) {
        if (player.consensusAuctionValue - pick.price >= 10) steals++
      } else if (format === 'snake' && pick.round != null && player) {
        if (pick.round - Math.ceil(player.adp / teamCount) >= 3) steals++
      }
    }

    overpayTotals[manager] = totalOverpay
    reachCounts[manager] = reaches
    stealCounts[manager] = steals

    // Check bye week disasters
    const byeDisaster = detectByeWeekDisaster(managerPicks, players)
    if (byeDisaster) {
      byeWeekIssues[manager] = 1
      entries.push({
        managerName: manager,
        roastType: 'bye_disaster',
        title: '💀 Bye Week Catastrophe',
        description: byeDisaster.detail,
        severity: byeDisaster.severity,
      })
    }

    // Roster imbalance check
    const posCounts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 }
    for (const p of managerPicks) {
      const pos = p.position?.toUpperCase()
      if (pos && posCounts[pos] !== undefined) {
        posCounts[pos]++
      }
    }

    if (posCounts.RB >= 6 && posCounts.WR <= 2) {
      entries.push({
        managerName: manager,
        roastType: 'hoarding',
        title: '🏃 RB Hoarding Syndrome',
        description: `${manager} drafted ${posCounts.RB} RBs and only ${posCounts.WR} WRs. Did they forget WRs exist?`,
        severity: 'medium',
      })
    }
    if (posCounts.WR >= 6 && posCounts.RB <= 2) {
      entries.push({
        managerName: manager,
        roastType: 'hoarding',
        title: '📡 WR Collector',
        description: `${manager} went Zero-RB... and then Zero-RB again. ${posCounts.WR} WRs, ${posCounts.RB} RBs.`,
        severity: 'medium',
      })
    }
  }

  // Add overpay entries
  const sortedOverpay = Object.entries(overpayTotals).sort((a, b) => b[1] - a[1])
  if (sortedOverpay[0] && sortedOverpay[0][1] >= 20) {
    entries.push({
      managerName: sortedOverpay[0][0],
      roastType: 'overpay',
      title: '🔥 MVP of Overpaying',
      description: `${sortedOverpay[0][0]} overpaid by $${sortedOverpay[0][1]} total. That's not how auctions work.`,
      severity: sortedOverpay[0][1] >= 40 ? 'savage' : 'medium',
    })
  }

  // Add reach entries
  const sortedReaches = Object.entries(reachCounts).sort((a, b) => b[1] - a[1])
  if (sortedReaches[0] && sortedReaches[0][1] >= 3) {
    entries.push({
      managerName: sortedReaches[0][0],
      roastType: 'reach',
      title: '😬 Serial Reacher',
      description: `${sortedReaches[0][0]} reached on ${sortedReaches[0][1]} picks. Panic mode: ENGAGED.`,
      severity: sortedReaches[0][1] >= 5 ? 'savage' : 'medium',
    })
  }

  // Add steal entries (positive - but still roast-worthy)
  const sortedSteals = Object.entries(stealCounts).sort((a, b) => b[1] - a[1])
  if (sortedSteals[0] && sortedSteals[0][1] >= 3) {
    entries.push({
      managerName: sortedSteals[0][0],
      roastType: 'steal',
      title: '🎯 Lucky Bastard Award',
      description: `${sortedSteals[0][0]} got ${sortedSteals[0][1]} steals. Either they're good or you all weren't paying attention.`,
      severity: 'mild',
    })
  }

  return {
    entries,
    mvpOfOverpaying: sortedOverpay[0]?.[1] >= 20 ? sortedOverpay[0][0] : null,
    mostPanicked: sortedReaches[0]?.[1] >= 3 ? sortedReaches[0][0] : null,
    luckyBastard: sortedSteals[0]?.[1] >= 3 ? sortedSteals[0][0] : null,
    byeWeekChampion: Object.keys(byeWeekIssues)[0] || null,
  }
}
