/**
 * First-Attack Effectiveness (formerly 3rd Ball)
 *
 * Conversion when the player's first_attack_index shot is theirs.
 * Success = clean winner that ends on the attack shot.
 * Lucky is tracked separately and is not a clean success.
 */

import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'
import { isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'

export interface ThirdBallEffectivenessMetrics {
  thirdBallSuccessRate: number
  thirdBallSuccesses: number
  thirdBallOpportunities: number

  thirdBallWinnerRate: number
  thirdBallWinners: number

  thirdBallLuckyRate: number
  thirdBallLuckies: number

  thirdBallUnforcedErrorRate: number
  thirdBallUnforcedErrors: number
}

export interface ThirdBallEffectivenessInput {
  rallies: DBRally[]
  shots: DBShot[]
  playerId: string
}

function lastShotIndex(shots: DBShot[], rallyId: string): number {
  const rallyShots = shots.filter((s) => s.rally_id === rallyId)
  if (rallyShots.length === 0) return 0
  return Math.max(...rallyShots.map((s) => s.shot_index))
}

export function calculateThirdBallEffectiveness(
  input: ThirdBallEffectivenessInput
): ThirdBallEffectivenessMetrics {
  const { rallies, shots, playerId } = input

  const serveRallies = rallies.filter((r) => r.is_scoring && r.server_id === playerId)

  if (serveRallies.length === 0) {
    return {
      thirdBallSuccessRate: 0,
      thirdBallSuccesses: 0,
      thirdBallOpportunities: 0,
      thirdBallWinnerRate: 0,
      thirdBallWinners: 0,
      thirdBallLuckyRate: 0,
      thirdBallLuckies: 0,
      thirdBallUnforcedErrorRate: 0,
      thirdBallUnforcedErrors: 0,
    }
  }

  let thirdBallOpportunities = 0
  let thirdBallSuccesses = 0
  let thirdBallWinners = 0
  let thirdBallLuckies = 0
  let thirdBallUnforcedErrors = 0

  for (const rally of serveRallies) {
    if (rally.first_attack_index === null) continue

    const attackShot = shots.find(
      (s) => s.rally_id === rally.id && s.shot_index === rally.first_attack_index
    )
    if (!attackShot || attackShot.player_id !== playerId) continue

    thirdBallOpportunities++
    const endIndex = lastShotIndex(shots, rally.id)
    const attackEndedPoint = rally.first_attack_index === endIndex

    if (attackEndedPoint && isErrorEnding(rally.point_ending)) {
      thirdBallUnforcedErrors++
      continue
    }

    if (attackEndedPoint && rally.point_ending === 'winner') {
      thirdBallWinners++
      thirdBallSuccesses++
      continue
    }

    if (attackEndedPoint && rally.point_ending === 'lucky') {
      thirdBallLuckies++
      continue
    }
  }

  const denom = thirdBallOpportunities

  return {
    thirdBallSuccessRate: denom > 0 ? thirdBallSuccesses / denom : 0,
    thirdBallSuccesses,
    thirdBallOpportunities,
    thirdBallWinnerRate: denom > 0 ? thirdBallWinners / denom : 0,
    thirdBallWinners,
    thirdBallLuckyRate: denom > 0 ? thirdBallLuckies / denom : 0,
    thirdBallLuckies,
    thirdBallUnforcedErrorRate: denom > 0 ? thirdBallUnforcedErrors / denom : 0,
    thirdBallUnforcedErrors,
  }
}

export function getThirdBallEffectivenessStatus(
  successRate: number
): 'good' | 'average' | 'poor' {
  if (successRate >= 0.4) return 'good'
  if (successRate >= 0.3) return 'average'
  return 'poor'
}

export function generateThirdBallInsight(metrics: ThirdBallEffectivenessMetrics): string {
  const successPct = Math.round(metrics.thirdBallSuccessRate * 100)
  const winnerPct = Math.round(metrics.thirdBallWinnerRate * 100)
  const luckyPct = Math.round(metrics.thirdBallLuckyRate * 100)
  const uePct = Math.round(metrics.thirdBallUnforcedErrorRate * 100)

  const status = getThirdBallEffectivenessStatus(metrics.thirdBallSuccessRate)

  if (status === 'good') {
    return `Your first attack is dangerous: you convert ${successPct}% cleanly (${winnerPct}% winners; ${luckyPct}% lucky).`
  }

  if (status === 'average') {
    return `Your first attack converts ${successPct}% of chances. Reducing errors (${uePct}%) would quickly improve results.`
  }

  return `You convert only ${successPct}% of first-attack opportunities. Too many attacks end in errors (${uePct}%).`
}

export function generateThirdBallRecommendation(
  metrics: ThirdBallEffectivenessMetrics
): string {
  if (metrics.thirdBallUnforcedErrorRate > 0.25) {
    return 'Work on safer first-attack spin and placement instead of maximum power.'
  }

  if (metrics.thirdBallSuccessRate < 0.35 && metrics.thirdBallUnforcedErrorRate < 0.2) {
    return 'Focus on creating clearer opportunities (better serve + receive patterns).'
  }

  if (metrics.thirdBallSuccessRate >= 0.4) {
    return 'Your first attack is a key strength—build more of your game plan around serving and attacking.'
  }

  return 'Balance aggression with consistency on the first attack. Aim for 40%+ clean success.'
}
