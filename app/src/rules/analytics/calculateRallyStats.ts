/**
 * Rally statistics (Rally Focus)
 *
 * Rally-phase = last shot is in the continuation phase.
 * Long rally = 6+ shots.
 */

import type { DBRally, DBShot } from '@/data'
import { deriveShotPhase } from '@/rules/derive/shot/deriveShotPhase'
import { isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'

export interface RallyStatsMetrics {
  rallyWinRate: number
  longRallyWinRate: number
  rallyUnforcedErrorRate: number
  avgRallyLength: number
  avgRallyPhaseLength: number
  totalRallyPhaseRallies: number
  totalLongRallies: number
  totalRallies: number
}

export interface RallyStatsResult {
  metrics: RallyStatsMetrics
  status: 'good' | 'average' | 'poor'
  insight: string
  recommendation: string
  footerText: string
}

export function calculateRallyStats(
  rallies: DBRally[],
  shots: DBShot[],
  playerId: string
): RallyStatsResult {
  const rallyMaxShots = new Map<string, number>()
  shots.forEach((shot) => {
    const current = rallyMaxShots.get(shot.rally_id) || 0
    if (shot.shot_index > current) {
      rallyMaxShots.set(shot.rally_id, shot.shot_index)
    }
  })

  const rallyPhaseRallies = rallies.filter((r) => {
    const maxShots = rallyMaxShots.get(r.id) || 0
    return deriveShotPhase(maxShots, r.first_attack_index) === 'continuation'
  })

  const longRallies = rallies.filter((r) => (rallyMaxShots.get(r.id) || 0) >= 6)

  const rallyWins = rallyPhaseRallies.filter((r) => r.winner_id === playerId).length
  const rallyWinRate =
    rallyPhaseRallies.length > 0 ? rallyWins / rallyPhaseRallies.length : 0

  const longRallyWins = longRallies.filter((r) => r.winner_id === playerId).length
  const longRallyWinRate =
    longRallies.length > 0 ? longRallyWins / longRallies.length : 0

  const rallyUEs = rallyPhaseRallies.filter((r) => {
    if (!isErrorEnding(r.point_ending)) return false
    const endIndex = rallyMaxShots.get(r.id) || 0
    const endShot = shots.find((s) => s.rally_id === r.id && s.shot_index === endIndex)
    return endShot?.player_id === playerId
  }).length

  const rallyUnforcedErrorRate =
    rallyPhaseRallies.length > 0 ? rallyUEs / rallyPhaseRallies.length : 0

  const totalShots = Array.from(rallyMaxShots.values()).reduce((sum, max) => sum + max, 0)
  const avgRallyLength = rallies.length > 0 ? totalShots / rallies.length : 0

  const rallyPhaseShotsSum = rallyPhaseRallies.reduce(
    (sum, r) => sum + (rallyMaxShots.get(r.id) || 0),
    0
  )
  const avgRallyPhaseLength =
    rallyPhaseRallies.length > 0 ? rallyPhaseShotsSum / rallyPhaseRallies.length : 0

  const status: 'good' | 'average' | 'poor' =
    rallyWinRate >= 0.55 ? 'good' : rallyWinRate >= 0.48 ? 'average' : 'poor'

  const insight = generateRallyInsight({
    rallyWinRate,
    longRallyWinRate,
    rallyUnforcedErrorRate,
    totalLongRallies: longRallies.length,
  })

  const recommendation = generateRallyRecommendation({
    rallyWinRate,
    longRallyWinRate,
    rallyUnforcedErrorRate,
  })

  const matchCount = new Set(
    rallies
      .map((r) => r.set_id.split('-s')[0])
      .filter(Boolean)
  ).size

  const footerText = `Based on ${matchCount || rallies.length} set${
    (matchCount || rallies.length) !== 1 ? 's' : ''
  } (${rallyPhaseRallies.length} continuation points)`

  return {
    metrics: {
      rallyWinRate,
      longRallyWinRate,
      rallyUnforcedErrorRate,
      avgRallyLength,
      avgRallyPhaseLength,
      totalRallyPhaseRallies: rallyPhaseRallies.length,
      totalLongRallies: longRallies.length,
      totalRallies: rallies.length,
    },
    status,
    insight,
    recommendation,
    footerText,
  }
}

function generateRallyInsight(metrics: Partial<RallyStatsMetrics>): string {
  const {
    rallyWinRate = 0,
    longRallyWinRate = 0,
    rallyUnforcedErrorRate = 0,
    totalLongRallies = 0,
  } = metrics

  const rallyWinPct = Math.round(rallyWinRate * 100)
  const longRallyWinPct = Math.round(longRallyWinRate * 100)
  const ueRate = Math.round(rallyUnforcedErrorRate * 100)

  if (rallyWinRate >= 0.55) {
    if ((totalLongRallies || 0) > 5) {
      return `You dominate continuation exchanges, winning ${rallyWinPct}% of those points. Long rallies (6+ shots) are won ${longRallyWinPct}% of the time.`
    }
    return `You win ${rallyWinPct}% of continuation points once the point develops. Your rally game is a clear strength.`
  }

  if (rallyWinRate >= 0.48) {
    if (rallyUnforcedErrorRate > 0.15) {
      return `You win ${rallyWinPct}% of continuation points. Unforced errors (${ueRate}%) are costing you more rally wins.`
    }
    return `You win ${rallyWinPct}% of continuation points. Solid rally play with room to improve consistency.`
  }

  if (rallyUnforcedErrorRate > 0.15) {
    return `You win only ${rallyWinPct}% of continuation points. High unforced error rate (${ueRate}%) is the main issue.`
  }

  return `You win ${rallyWinPct}% of continuation points. Rallies are your weakest phase of play.`
}

function generateRallyRecommendation(metrics: Partial<RallyStatsMetrics>): string {
  const {
    rallyWinRate = 0,
    longRallyWinRate = 0,
    rallyUnforcedErrorRate = 0,
  } = metrics

  if (rallyUnforcedErrorRate > 0.15) {
    return 'Focus on rally consistency and footwork to cut unforced errors. Prioritize controlled placement over power.'
  }

  if (longRallyWinRate < 0.45 && rallyWinRate < 0.5) {
    return 'Train longer rally drills to improve stamina and stability in extended exchanges.'
  }

  if (rallyWinRate >= 0.55) {
    return 'Your rally game is strong. Keep building patterns that get you into continuation exchanges.'
  }

  return 'Work on rally consistency while adding more variety to create opportunities.'
}
