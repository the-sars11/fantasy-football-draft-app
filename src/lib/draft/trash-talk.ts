/**
 * Trash Talk System (FF-076)
 *
 * Detects draft mistakes and generates trash talk alerts.
 * Types: overpay, roster imbalance, bye week disaster, reach, steal
 */

import type { DraftPick } from './state'
import type { Player, Position } from '@/lib/players/types'

export type TrashTalkType = 'overpay' | 'imbalance' | 'bye_disaster' | 'reach' | 'steal'

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
  if (!pos || pos === 'K' || pos === 'DEF') return null // Skip kickers and defense

  const player = players.find(
    p => p.name.toLowerCase() === pick.player_name.toLowerCase()
  )

  // Don't trash talk yourself
  if (pick.manager === myManagerName) {
    // But DO alert if you got a steal
    const stealAlert = detectSteal(pick, player, format, teamCount)
    if (stealAlert) {
      return {
        ...stealAlert,
        managerName: pick.manager,
        severity: 'mild', // Don't be too excited about your own steals
      }
    }
    return null
  }

  // Check for overpay (auction)
  if (format === 'auction' && pick.price != null) {
    const overpayAlert = detectOverpay(pick, player, pos)
    if (overpayAlert) return overpayAlert
  }

  // Check for reach (snake)
  if (format === 'snake' && pick.round != null) {
    const reachAlert = detectReach(pick, player, pos, pick.round)
    if (reachAlert) return reachAlert
  }

  // Check for roster imbalance
  const managerPicks = allPicks.filter(p => p.manager === pick.manager)
  const imbalanceAlert = detectRosterImbalance(pick, managerPicks, pos, teamCount)
  if (imbalanceAlert) return imbalanceAlert

  // Check for steal (opponent got great value - still worth noting)
  const stealAlert = detectSteal(pick, player, format, teamCount)
  if (stealAlert) return stealAlert

  return null
}

/**
 * Detect overpay in auction drafts
 */
function detectOverpay(
  pick: DraftPick,
  player: Player | undefined,
  pos: Position,
): TrashTalkAlert | null {
  const price = pick.price!
  const expectedValue = player?.consensusAuctionValue ?? AVG_POSITION_VALUES[pos]
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
): TrashTalkAlert | null {
  if (!player) return null

  if (format === 'auction' && pick.price != null) {
    const expectedValue = player.consensusAuctionValue
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
