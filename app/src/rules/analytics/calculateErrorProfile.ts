/**
 * Error profile (Rally Focus)
 *
 * Shares of error endings by the phase of the last shot.
 * Forced-error rate is removed — Rally Focus does not tag forced vs unforced.
 */

import type { DBRally, DBShot } from '@/data'
import { isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'
import { deriveShotPhase } from '@/rules/derive/shot/deriveShotPhase'
import { derivePointEndClass } from '@/rules/derive/rally/derivePointEndClass'
import { filterCompleteScoringRallies } from './isCompleteScoringRally'

export interface ErrorProfileMetrics {
  unforcedErrorRate: number
  serveUEshare: number
  receiveUEshare: number
  attackUEshare: number
  rallyUEshare: number
  opponentUErate: number
  totalUnforcedErrors: number
  totalRalliesPlayed: number
  serveUEcount: number
  receiveUEcount: number
  attackUEcount: number
  rallyUEcount: number
}

export interface ErrorProfileResult {
  metrics: ErrorProfileMetrics
  status: 'good' | 'average' | 'poor'
  insight: string
  recommendation: string
  footerText: string
}

function lastShotIndex(shots: DBShot[], rallyId: string): number {
  const rallyShots = shots.filter((s) => s.rally_id === rallyId)
  if (rallyShots.length === 0) return 0
  return Math.max(...rallyShots.map((s) => s.shot_index))
}

export function calculateErrorProfile(
  rallies: DBRally[],
  shots: DBShot[],
  playerId: string,
  opponentId?: string
): ErrorProfileResult {
  const complete = filterCompleteScoringRallies(rallies)
  const totalRallies = complete.length

  if (totalRallies === 0) {
    return {
      metrics: {
        unforcedErrorRate: 0,
        serveUEshare: 0,
        receiveUEshare: 0,
        attackUEshare: 0,
        rallyUEshare: 0,
        opponentUErate: 0,
        totalUnforcedErrors: 0,
        totalRalliesPlayed: 0,
        serveUEcount: 0,
        receiveUEcount: 0,
        attackUEcount: 0,
        rallyUEcount: 0,
      },
      status: 'average',
      insight: 'Not enough data to analyze error profile.',
      recommendation: '',
      footerText: 'No data',
    }
  }

  let serveUEs = 0
  let receiveUEs = 0
  let attackUEs = 0
  let rallyUEs = 0
  let opponentUEs = 0

  for (const rally of complete) {
    if (!isErrorEnding(rally.point_ending)) continue

    const endIndex = lastShotIndex(shots, rally.id)
    const endShot = shots.find((s) => s.rally_id === rally.id && s.shot_index === endIndex)
    if (!endShot) continue

    const endClass = derivePointEndClass(endIndex, rally.point_ending)
    const phase = deriveShotPhase(endIndex, rally.first_attack_index)

    if (endShot.player_id === playerId) {
      if (endClass === 'service_fault') serveUEs++
      else if (endClass === 'receive_error') receiveUEs++
      else if (phase === 'first_offensive' || phase === 'fos_plus_1' || phase === 'fos_plus_2') {
        attackUEs++
      } else {
        rallyUEs++
      }
    } else if (!opponentId || endShot.player_id === opponentId) {
      opponentUEs++
    }
  }

  const totalUEs = serveUEs + receiveUEs + attackUEs + rallyUEs
  const unforcedErrorRate = totalUEs / totalRallies
  const opponentUErate = opponentUEs / totalRallies

  const serveUEshare = totalUEs > 0 ? serveUEs / totalUEs : 0
  const receiveUEshare = totalUEs > 0 ? receiveUEs / totalUEs : 0
  const attackUEshare = totalUEs > 0 ? attackUEs / totalUEs : 0
  const rallyUEshare = totalUEs > 0 ? rallyUEs / totalUEs : 0

  const status: 'good' | 'average' | 'poor' =
    unforcedErrorRate < 0.1 ? 'good' : unforcedErrorRate <= 0.15 ? 'average' : 'poor'

  const insight = generateErrorInsight({
    unforcedErrorRate,
    serveUEshare,
    receiveUEshare,
    attackUEshare,
    rallyUEshare,
    opponentUErate,
  })

  const recommendation = generateErrorRecommendation({
    unforcedErrorRate,
    serveUEshare,
    receiveUEshare,
    attackUEshare,
    rallyUEshare,
  })

  const footerText = `Based on ${totalRallies} point${totalRallies !== 1 ? 's' : ''}`

  return {
    metrics: {
      unforcedErrorRate,
      serveUEshare,
      receiveUEshare,
      attackUEshare,
      rallyUEshare,
      opponentUErate,
      totalUnforcedErrors: totalUEs,
      totalRalliesPlayed: totalRallies,
      serveUEcount: serveUEs,
      receiveUEcount: receiveUEs,
      attackUEcount: attackUEs,
      rallyUEcount: rallyUEs,
    },
    status,
    insight,
    recommendation,
    footerText,
  }
}

function generateErrorInsight(metrics: Partial<ErrorProfileMetrics>): string {
  const {
    unforcedErrorRate = 0,
    serveUEshare = 0,
    receiveUEshare = 0,
    attackUEshare = 0,
    rallyUEshare = 0,
    opponentUErate = 0,
  } = metrics

  const uePct = Math.round(unforcedErrorRate * 100)
  const oppUEpct = Math.round(opponentUErate * 100)

  let dominantPhase = 'continuation'
  let maxShare = rallyUEshare
  if (serveUEshare > maxShare) {
    dominantPhase = 'serve'
    maxShare = serveUEshare
  }
  if (receiveUEshare > maxShare) {
    dominantPhase = 'receive'
    maxShare = receiveUEshare
  }
  if (attackUEshare > maxShare) {
    dominantPhase = 'first attack'
    maxShare = attackUEshare
  }

  const dominantPct = Math.round(maxShare * 100)

  if (unforcedErrorRate < 0.1) {
    return `Your error rate is excellent at ${uePct}%. You're winning points cleanly without giving away cheap errors.`
  }

  if (unforcedErrorRate <= 0.15) {
    if (dominantPct > 40) {
      return `Errors decide ${uePct}% of your points, with ${dominantPct}% happening on the ${dominantPhase}.`
    }
    return `Errors cost you ${uePct}% of points. Your opponent gives away ${oppUEpct}% via their mistakes.`
  }

  if (dominantPct > 40) {
    return `Errors are a major issue at ${uePct}% of points, with most (${dominantPct}%) coming on the ${dominantPhase}.`
  }

  return `Errors decide ${uePct}% of your points across all phases. This is costing you matches.`
}

function generateErrorRecommendation(metrics: Partial<ErrorProfileMetrics>): string {
  const {
    unforcedErrorRate = 0,
    serveUEshare = 0,
    receiveUEshare = 0,
    attackUEshare = 0,
    rallyUEshare = 0,
  } = metrics

  if (unforcedErrorRate > 0.15) {
    if (serveUEshare > 0.3) {
      return 'Focus on serve consistency to cut cheap points lost on faults. Prioritize placement over power.'
    }
    if (receiveUEshare > 0.3) {
      return 'Simplify receive choices and prioritize safe returns over risk.'
    }
    if (attackUEshare > 0.3) {
      return 'Temper first-attack risk. Aim for high-percentage openings before going for winners.'
    }
    if (rallyUEshare > 0.4) {
      return 'Train controlled rally patterns to reduce errors in continuation exchanges.'
    }
  }

  if (unforcedErrorRate < 0.1) {
    return 'Your error rate is excellent. Keep this consistency while looking for more attacking opportunities.'
  }

  return 'Focus on reducing errors in your weakest phase while maintaining consistency in others.'
}
