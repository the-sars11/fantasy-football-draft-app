/**
 * Post-Draft Review (FF-053)
 *
 * Grades a completed draft vs. the active strategy.
 * Shows: overall grade, position grades, target hit/miss,
 * budget/round efficiency, deviations, and pivot impact.
 */

import type { DraftPick } from '@/lib/draft/state'
import type { Strategy, RosterSlots, DraftFormat, Position } from '@/lib/supabase/database.types'

// --- Types ---

export interface PositionGrade {
  position: string
  picks: Array<{ name: string; price?: number; round?: number; pickNumber: number }>
  grade: string
  score: number
  notes: string[]
}

export interface TargetResult {
  playerName: string
  status: 'hit' | 'missed' | 'avoided_success' | 'avoided_fail'
  detail: string
}

export interface DraftReview {
  overallGrade: string
  overallScore: number
  summary: string
  positionGrades: PositionGrade[]
  targetResults: TargetResult[]
  budgetAnalysis: BudgetAnalysis | null
  snakeAnalysis: SnakeAnalysis | null
  strengths: string[]
  weaknesses: string[]
  pivotImpact: string | null
}

export interface BudgetAnalysis {
  totalSpent: number
  totalBudget: number
  remaining: number
  avgPrice: number
  highestPick: { name: string; price: number }
  lowestPick: { name: string; price: number }
  allocationVsPlan: Array<{ position: string; planned: number; actual: number }>
}

export interface SnakeAnalysis {
  totalPicks: number
  totalRounds: number
  earliestPick: { name: string; round: number }
  latestPick: { name: string; round: number }
  positionByRound: Array<{ round: number; position: string; name: string }>
}

// --- Analysis ---

const letterGrade = (score: number) =>
  score >= 93 ? 'A+' : score >= 90 ? 'A' : score >= 87 ? 'A-'
  : score >= 83 ? 'B+' : score >= 80 ? 'B' : score >= 77 ? 'B-'
  : score >= 73 ? 'C+' : score >= 70 ? 'C' : score >= 67 ? 'C-'
  : score >= 60 ? 'D+' : score >= 55 ? 'D' : 'F'

export function analyzeDraft(
  picks: DraftPick[],
  managerName: string,
  strategy: Strategy | null,
  rosterSlots: RosterSlots,
  format: DraftFormat,
  budget?: number,
  pivotHistory?: Array<{ from: string; to: string; atPick: number; reason: string }>,
): DraftReview {
  const myPicks = picks.filter(p => p.manager === managerName)

  if (myPicks.length === 0) {
    return {
      overallGrade: '-',
      overallScore: 0,
      summary: 'No picks recorded for this manager.',
      positionGrades: [],
      targetResults: [],
      budgetAnalysis: null,
      snakeAnalysis: null,
      strengths: [],
      weaknesses: [],
      pivotImpact: null,
    }
  }

  // Group by position
  const byPos: Record<string, DraftPick[]> = {}
  for (const p of myPicks) {
    const pos = p.position?.toUpperCase() || 'UNKNOWN'
    if (!byPos[pos]) byPos[pos] = []
    byPos[pos].push(p)
  }

  // Position grades
  const positionGrades: PositionGrade[] = []
  let totalPositionScore = 0
  let posCount = 0

  for (const [pos, posPicks] of Object.entries(byPos)) {
    if (pos === 'UNKNOWN') continue

    const slotKey = pos.toLowerCase() === 'dst' ? 'dst' : pos.toLowerCase()
    const required = rosterSlots[slotKey] || 0
    let score = 75

    // Filled required slots
    if (posPicks.length >= required && required > 0) {
      score += 10
    } else if (required > 0 && posPicks.length < required) {
      score -= 15
    }

    // Depth bonus
    if (posPicks.length > required) {
      score += 3
    }

    // Strategy alignment
    const notes: string[] = []
    if (strategy) {
      const weight = (strategy.position_weights as Record<string, number>)[pos] || 5
      if (weight >= 7 && posPicks.length >= required) {
        score += 5
        notes.push('Priority position addressed')
      } else if (weight >= 7 && posPicks.length < required) {
        score -= 10
        notes.push('Priority position under-filled')
      }
    }

    if (posPicks.length >= required && required > 0) {
      notes.push(`${posPicks.length}/${required} slots filled`)
    } else if (required > 0) {
      notes.push(`Only ${posPicks.length}/${required} slots filled`)
    }

    score = Math.max(0, Math.min(100, score))
    positionGrades.push({
      position: pos,
      picks: posPicks.map(p => ({
        name: p.player_name,
        price: p.price,
        round: p.round,
        pickNumber: p.pick_number,
      })),
      grade: letterGrade(score),
      score,
      notes,
    })

    totalPositionScore += score
    posCount++
  }

  // Target analysis
  const targetResults: TargetResult[] = []
  if (strategy) {
    const pickedNames = new Set(myPicks.map(p => p.player_name.toLowerCase()))

    for (const target of strategy.player_targets) {
      const name = target.player_name.toLowerCase()
      if (pickedNames.has(name)) {
        targetResults.push({
          playerName: target.player_name,
          status: 'hit',
          detail: `Target acquired (weight: ${target.weight}/10)`,
        })
      } else {
        targetResults.push({
          playerName: target.player_name,
          status: 'missed',
          detail: target.note || 'Not drafted',
        })
      }
    }

    for (const avoid of strategy.player_avoids) {
      const name = avoid.player_name.toLowerCase()
      if (pickedNames.has(name)) {
        targetResults.push({
          playerName: avoid.player_name,
          status: 'avoided_fail',
          detail: `Drafted despite avoid list (${avoid.severity})`,
        })
      } else {
        targetResults.push({
          playerName: avoid.player_name,
          status: 'avoided_success',
          detail: 'Successfully avoided',
        })
      }
    }
  }

  // Budget analysis (auction)
  let budgetAnalysis: BudgetAnalysis | null = null
  if (format === 'auction' && budget) {
    const priced = myPicks.filter(p => p.price != null)
    const totalSpent = priced.reduce((s, p) => s + (p.price || 0), 0)
    const avgPrice = priced.length > 0 ? totalSpent / priced.length : 0

    const sorted = [...priced].sort((a, b) => (b.price || 0) - (a.price || 0))
    const highest = sorted[0] ? { name: sorted[0].player_name, price: sorted[0].price! } : { name: '-', price: 0 }
    const lowest = sorted[sorted.length - 1] ? { name: sorted[sorted.length - 1].player_name, price: sorted[sorted.length - 1].price! } : { name: '-', price: 0 }

    // Budget allocation vs plan
    const allocationVsPlan: BudgetAnalysis['allocationVsPlan'] = []
    if (strategy?.budget_allocation) {
      const alloc = strategy.budget_allocation as Record<string, number>
      const spentByPos: Record<string, number> = {}
      for (const p of priced) {
        const pos = p.position?.toUpperCase() || 'OTHER'
        spentByPos[pos] = (spentByPos[pos] || 0) + (p.price || 0)
      }
      for (const [pos, plannedPct] of Object.entries(alloc)) {
        const actualPct = totalSpent > 0 ? ((spentByPos[pos.toUpperCase()] || 0) / totalSpent) * 100 : 0
        allocationVsPlan.push({ position: pos.toUpperCase(), planned: plannedPct, actual: Math.round(actualPct) })
      }
    }

    budgetAnalysis = {
      totalSpent,
      totalBudget: budget,
      remaining: budget - totalSpent,
      avgPrice: Math.round(avgPrice * 10) / 10,
      highestPick: highest,
      lowestPick: lowest,
      allocationVsPlan,
    }
  }

  // Snake analysis
  let snakeAnalysis: SnakeAnalysis | null = null
  if (format === 'snake') {
    const withRounds = myPicks.filter(p => p.round != null)
    const sorted = [...withRounds].sort((a, b) => (a.round || 0) - (b.round || 0))
    const totalRounds = sorted.length > 0 ? sorted[sorted.length - 1].round! : 0

    snakeAnalysis = {
      totalPicks: myPicks.length,
      totalRounds,
      earliestPick: sorted[0] ? { name: sorted[0].player_name, round: sorted[0].round! } : { name: '-', round: 0 },
      latestPick: sorted[sorted.length - 1] ? { name: sorted[sorted.length - 1].player_name, round: sorted[sorted.length - 1].round! } : { name: '-', round: 0 },
      positionByRound: sorted.map(p => ({
        round: p.round!,
        position: p.position?.toUpperCase() || '?',
        name: p.player_name,
      })),
    }
  }

  // Overall scoring
  let overallScore = posCount > 0 ? totalPositionScore / posCount : 70

  // Target hit bonus/penalty
  const targetsHit = targetResults.filter(t => t.status === 'hit').length
  const targetsMissed = targetResults.filter(t => t.status === 'missed').length
  const avoidsFailed = targetResults.filter(t => t.status === 'avoided_fail').length

  overallScore += targetsHit * 3
  overallScore -= targetsMissed * 2
  overallScore -= avoidsFailed * 5

  // Roster completeness
  const totalSlots = Object.values(rosterSlots).reduce((s, v) => s + v, 0)
  const completeness = myPicks.length / totalSlots
  if (completeness >= 1) overallScore += 5
  else if (completeness < 0.8) overallScore -= 10

  overallScore = Math.max(0, Math.min(100, Math.round(overallScore)))

  // Strengths / weaknesses
  const strengths: string[] = []
  const weaknesses: string[] = []

  const topGrades = positionGrades.filter(g => g.score >= 85)
  if (topGrades.length > 0) {
    strengths.push(`Strong ${topGrades.map(g => g.position).join(', ')} corps`)
  }
  if (targetsHit > 0) {
    strengths.push(`Landed ${targetsHit} strategy target${targetsHit > 1 ? 's' : ''}`)
  }
  if (completeness >= 1) {
    strengths.push('Full roster filled')
  }
  if (budgetAnalysis && budgetAnalysis.remaining >= 0 && budgetAnalysis.remaining <= budget! * 0.05) {
    strengths.push('Efficient budget usage')
  }

  const weakGrades = positionGrades.filter(g => g.score < 65)
  if (weakGrades.length > 0) {
    weaknesses.push(`Weak at ${weakGrades.map(g => g.position).join(', ')}`)
  }
  if (targetsMissed > 2) {
    weaknesses.push(`Missed ${targetsMissed} strategy targets`)
  }
  if (avoidsFailed > 0) {
    weaknesses.push(`Drafted ${avoidsFailed} player${avoidsFailed > 1 ? 's' : ''} from avoid list`)
  }
  if (budgetAnalysis && budgetAnalysis.remaining > budget! * 0.15) {
    weaknesses.push(`Left $${budgetAnalysis.remaining} unspent`)
  }

  // Pivot impact
  let pivotImpact: string | null = null
  if (pivotHistory && pivotHistory.length > 0) {
    pivotImpact = `Made ${pivotHistory.length} strategy pivot${pivotHistory.length > 1 ? 's' : ''} during the draft. ` +
      `Last pivot: ${pivotHistory[pivotHistory.length - 1].from} → ${pivotHistory[pivotHistory.length - 1].to} ` +
      `at pick ${pivotHistory[pivotHistory.length - 1].atPick}.`
  }

  const summary = overallScore >= 85 ? 'Excellent draft — executed strategy well'
    : overallScore >= 75 ? 'Solid draft with minor deviations from plan'
    : overallScore >= 65 ? 'Decent draft but significant strategy drift'
    : 'Draft deviated substantially from strategy'

  return {
    overallGrade: letterGrade(overallScore),
    overallScore,
    summary,
    positionGrades,
    targetResults,
    budgetAnalysis,
    snakeAnalysis,
    strengths,
    weaknesses,
    pivotImpact,
  }
}
