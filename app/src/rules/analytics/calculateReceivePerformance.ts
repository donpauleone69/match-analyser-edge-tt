/**
 * Calculate Receive Performance Metrics (Rally Focus)
 */

import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'
import { derivePointEndClass, isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'
import { deriveShotPhase } from '@/rules/derive/shot/deriveShotPhase'

export interface ReceivePerformanceMetrics {
  receiveWinRate: number
  receiveWins: number
  totalReceiveRallies: number

  receiveUnforcedErrorRate: number
  receiveUnforcedErrors: number

  earlyErrorRate: number
  earlyErrors: number

  neutralisationRate: number
  neutralisedRallies: number
}

export interface ReceivePerformanceInput {
  rallies: DBRally[]
  shots: DBShot[]
  playerId: string
}

function lastShotIndex(shots: DBShot[], rallyId: string): number {
  const rallyShots = shots.filter((s) => s.rally_id === rallyId)
  if (rallyShots.length === 0) return 0
  return Math.max(...rallyShots.map((s) => s.shot_index))
}

export function calculateReceivePerformance(
  input: ReceivePerformanceInput
): ReceivePerformanceMetrics {
  const { rallies, shots, playerId } = input

  const receiveRallies = rallies.filter((r) => r.is_scoring && r.receiver_id === playerId)

  if (receiveRallies.length === 0) {
    return {
      receiveWinRate: 0,
      receiveWins: 0,
      totalReceiveRallies: 0,
      receiveUnforcedErrorRate: 0,
      receiveUnforcedErrors: 0,
      earlyErrorRate: 0,
      earlyErrors: 0,
      neutralisationRate: 0,
      neutralisedRallies: 0,
    }
  }

  const receiveWins = receiveRallies.filter((r) => r.winner_id === playerId).length
  const receiveWinRate = receiveWins / receiveRallies.length

  let receiveUnforcedErrors = 0
  let earlyErrors = 0
  let neutralisedRallies = 0

  for (const rally of receiveRallies) {
    const endIndex = lastShotIndex(shots, rally.id)
    const endClass = derivePointEndClass(endIndex, rally.point_ending)

    if (endClass === 'receive_error') {
      receiveUnforcedErrors++
      continue
    }

    // Player's own early error on their shot before continuation
    const endShot = shots.find((s) => s.rally_id === rally.id && s.shot_index === endIndex)
    if (
      endShot &&
      endShot.player_id === playerId &&
      isErrorEnding(rally.point_ending)
    ) {
      const phase = deriveShotPhase(endIndex, rally.first_attack_index)
      if (phase === 'pre_offensive' || phase === 'first_offensive' || phase === 'fos_plus_1') {
        earlyErrors++
        continue
      }
    }

    if (deriveShotPhase(endIndex, rally.first_attack_index) === 'continuation' || endIndex >= 5) {
      neutralisedRallies++
    }
  }

  return {
    receiveWinRate,
    receiveWins,
    totalReceiveRallies: receiveRallies.length,
    receiveUnforcedErrorRate: receiveUnforcedErrors / receiveRallies.length,
    receiveUnforcedErrors,
    earlyErrorRate: earlyErrors / receiveRallies.length,
    earlyErrors,
    neutralisationRate: neutralisedRallies / receiveRallies.length,
    neutralisedRallies,
  }
}

export function getReceivePerformanceStatus(winRate: number): 'good' | 'average' | 'poor' {
  if (winRate >= 0.5) return 'good'
  if (winRate >= 0.45) return 'average'
  return 'poor'
}

export function generateReceiveInsight(metrics: ReceivePerformanceMetrics): string {
  const winPct = Math.round(metrics.receiveWinRate * 100)
  const errorPct = Math.round(metrics.receiveUnforcedErrorRate * 100)
  const earlyPct = Math.round(metrics.earlyErrorRate * 100)
  const neutralPct = Math.round(metrics.neutralisationRate * 100)

  const status = getReceivePerformanceStatus(metrics.receiveWinRate)

  if (status === 'good') {
    return `You win ${winPct}% of receive points and neutralise ${neutralPct}% of serves. Your receive is a clear strength.`
  }

  if (status === 'average') {
    const dominantIssue =
      errorPct > earlyPct ? `receive errors (${errorPct}%)` : `early errors (${earlyPct}%)`
    return `You win ${winPct}% of receive points. Most losses come from ${dominantIssue}.`
  }

  return `You win only ${winPct}% of receive points. Receive errors (${errorPct}%) and early errors (${earlyPct}%) are major issues.`
}

export function generateReceiveRecommendation(metrics: ReceivePerformanceMetrics): string {
  if (metrics.receiveUnforcedErrorRate > 0.1) {
    return 'Focus on safe, consistent receive options (short touch, deep push) to cut receive errors.'
  }

  if (metrics.earlyErrorRate > metrics.receiveUnforcedErrorRate && metrics.earlyErrorRate > 0.15) {
    return 'Work on reading spin and improving the first reply to reduce early errors on receive.'
  }

  if (metrics.neutralisationRate < 0.35) {
    return 'Aim to neutralise more serves into rallies rather than giving away early points.'
  }

  return 'Continue developing receive patterns that neutralise opponent serves and create attacking opportunities.'
}
