/**
 * Calculate Serve Performance Metrics (Rally Focus)
 *
 * Serve win rate, service-fault rate (end on shot 1 with error),
 * and first-attack conversion when the server is the attacker.
 */

import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'
import { derivePointEndClass, isErrorEnding } from '@/rules/derive/rally/derivePointEndClass'

export interface ServePerformanceMetrics {
  serveWinRate: number
  serveWins: number
  totalServeRallies: number

  serviceFaultRate: number
  serviceFaults: number

  firstAttackWinRate: number
  firstAttackWins: number
  firstAttackOpportunities: number

  firstAttackErrorRate: number
  firstAttackErrors: number
}

export interface ServePerformanceInput {
  rallies: DBRally[]
  shots: DBShot[]
  playerId: string
}

function lastShotIndex(shots: DBShot[], rallyId: string): number {
  const rallyShots = shots.filter((s) => s.rally_id === rallyId)
  if (rallyShots.length === 0) return 0
  return Math.max(...rallyShots.map((s) => s.shot_index))
}

export function calculateServePerformance(input: ServePerformanceInput): ServePerformanceMetrics {
  const { rallies, shots, playerId } = input

  const serveRallies = rallies.filter((r) => r.is_scoring && r.server_id === playerId)

  if (serveRallies.length === 0) {
    return {
      serveWinRate: 0,
      serveWins: 0,
      totalServeRallies: 0,
      serviceFaultRate: 0,
      serviceFaults: 0,
      firstAttackWinRate: 0,
      firstAttackWins: 0,
      firstAttackOpportunities: 0,
      firstAttackErrorRate: 0,
      firstAttackErrors: 0,
    }
  }

  const serveWins = serveRallies.filter((r) => r.winner_id === playerId).length
  const serveWinRate = serveWins / serveRallies.length

  const serviceFaults = serveRallies.filter((r) => {
    const endIndex = lastShotIndex(shots, r.id)
    return derivePointEndClass(endIndex, r.point_ending) === 'service_fault'
  }).length
  const serviceFaultRate = serviceFaults / serveRallies.length

  let firstAttackOpportunities = 0
  let firstAttackWins = 0
  let firstAttackErrors = 0

  for (const rally of serveRallies) {
    if (rally.first_attack_index === null) continue
    const attackShot = shots.find(
      (s) => s.rally_id === rally.id && s.shot_index === rally.first_attack_index
    )
    if (!attackShot || attackShot.player_id !== playerId) continue

    firstAttackOpportunities++

    if (rally.first_attack_index === lastShotIndex(shots, rally.id) && isErrorEnding(rally.point_ending)) {
      firstAttackErrors++
      continue
    }

    if (rally.point_ending === 'winner' && rally.winner_id === playerId) {
      // Clean winner counted when the attack itself ended the point, or later win after attack
      if (rally.first_attack_index === lastShotIndex(shots, rally.id)) {
        firstAttackWins++
      }
    }
  }

  const firstAttackWinRate =
    firstAttackOpportunities > 0 ? firstAttackWins / firstAttackOpportunities : 0
  const firstAttackErrorRate =
    firstAttackOpportunities > 0 ? firstAttackErrors / firstAttackOpportunities : 0

  return {
    serveWinRate,
    serveWins,
    totalServeRallies: serveRallies.length,
    serviceFaultRate,
    serviceFaults,
    firstAttackWinRate,
    firstAttackWins,
    firstAttackOpportunities,
    firstAttackErrorRate,
    firstAttackErrors,
  }
}

export function getServePerformanceStatus(winRate: number): 'good' | 'average' | 'poor' {
  if (winRate >= 0.55) return 'good'
  if (winRate >= 0.48) return 'average'
  return 'poor'
}

export function generateServeInsight(metrics: ServePerformanceMetrics): string {
  const winPct = Math.round(metrics.serveWinRate * 100)
  const faultPct = Math.round(metrics.serviceFaultRate * 100)
  const attackWinPct = Math.round(metrics.firstAttackWinRate * 100)
  const attackErrorPct = Math.round(metrics.firstAttackErrorRate * 100)

  const status = getServePerformanceStatus(metrics.serveWinRate)

  if (status === 'good') {
    return `Your serve is a strong weapon, winning ${winPct}% of points with low fault rate (${faultPct}%).`
  }

  if (status === 'average') {
    return `Your serve is solid at ${winPct}% win rate. There is room to improve first-attack conversion (${attackWinPct}%).`
  }

  return `You win only ${winPct}% of points on serve. Service faults (${faultPct}%) and first-attack errors (${attackErrorPct}%) are costing you.`
}

export function generateServeRecommendation(metrics: ServePerformanceMetrics): string {
  if (metrics.serviceFaultRate > 0.1) {
    return 'Focus on reducing service faults with more consistent placement and spin.'
  }

  if (metrics.firstAttackWinRate < 0.4 && metrics.firstAttackErrorRate > 0.2) {
    return 'Work on a safer, more consistent first attack instead of over-hitting.'
  }

  if (getServePerformanceStatus(metrics.serveWinRate) === 'good') {
    return 'Keep building patterns around your strong serve and first attack.'
  }

  return 'Focus on serve placement to create easier first-attack opportunities.'
}
