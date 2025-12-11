/**
 * Calculate Serve Performance Metrics
 * 
 * Pure calculation function - NO React, NO IO, NO side effects.
 * Computes serve win rate, fault rate, 3rd ball stats from rally and shot data.
 */

import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'

export interface ServePerformanceMetrics {
  // Primary metric
  serveWinRate: number // 0-1 (e.g., 0.52 = 52%)
  serveWins: number
  totalServeRallies: number
  
  // Secondary metrics
  serviceFaultRate: number // 0-1
  serviceFaults: number
  
  thirdBallWinRate: number // 0-1
  thirdBallWins: number
  thirdBallOpportunities: number
  
  thirdBallErrorRate: number // 0-1
  thirdBallErrors: number
}

export interface ServePerformanceInput {
  rallies: DBRally[]
  shots: DBShot[]
  playerId: string
}

/**
 * Calculate serve performance metrics for a player
 */
export function calculateServePerformance(input: ServePerformanceInput): ServePerformanceMetrics {
  const { rallies, shots, playerId } = input
  
  // Filter to scoring rallies where player is server
  const serveRallies = rallies.filter(r => 
    r.is_scoring && r.server_id === playerId
  )
  
  if (serveRallies.length === 0) {
    return {
      serveWinRate: 0,
      serveWins: 0,
      totalServeRallies: 0,
      serviceFaultRate: 0,
      serviceFaults: 0,
      thirdBallWinRate: 0,
      thirdBallWins: 0,
      thirdBallOpportunities: 0,
      thirdBallErrorRate: 0,
      thirdBallErrors: 0,
    }
  }
  
  // 1. Serve Win Rate: rallies won when serving
  const serveWins = serveRallies.filter(r => r.winner_id === playerId).length
  const serveWinRate = serveWins / serveRallies.length
  
  // 2. Service Fault Rate: points lost to service fault
  const serviceFaults = serveRallies.filter(r => r.point_end_type === 'serviceFault').length
  const serviceFaultRate = serviceFaults / serveRallies.length
  
  // 3. Third Ball Win Rate & Error Rate
  // Group shots by rally for easier processing
  const shotsByRally = new Map<string, DBShot[]>()
  for (const shot of shots) {
    if (!shotsByRally.has(shot.rally_id)) {
      shotsByRally.set(shot.rally_id, [])
    }
    shotsByRally.get(shot.rally_id)!.push(shot)
  }
  
  let thirdBallOpportunities = 0
  let thirdBallWins = 0
  let thirdBallErrors = 0
  
  for (const rally of serveRallies) {
    const rallyShots = shotsByRally.get(rally.id) || []
    
    // Sort shots by index
    rallyShots.sort((a, b) => a.shot_index - b.shot_index)
    
    // Find shot 3 (third ball)
    const shot3 = rallyShots.find(s => s.shot_index === 3 && s.player_id === playerId)
    
    if (!shot3) continue // No 3rd ball opportunity (rally ended before shot 3)
    
    thirdBallOpportunities++
    
    // Check if 3rd ball is an unforced error
    if (shot3.is_rally_end && shot3.rally_end_role === 'unforced_error') {
      thirdBallErrors++
      continue
    }
    
    // Check if 3rd ball wins the rally
    // Win conditions:
    // 1. Shot 3 is rally end with winner
    // 2. Shot 4 exists and is a forced error by opponent
    if (shot3.is_rally_end && shot3.rally_end_role === 'winner') {
      thirdBallWins++
    } else {
      const shot4 = rallyShots.find(s => s.shot_index === 4)
      if (shot4 && shot4.is_rally_end && shot4.rally_end_role === 'forced_error') {
        // Opponent made forced error on shot 4 (immediately after 3rd ball)
        thirdBallWins++
      }
    }
  }
  
  const thirdBallWinRate = thirdBallOpportunities > 0 
    ? thirdBallWins / thirdBallOpportunities 
    : 0
  
  const thirdBallErrorRate = thirdBallOpportunities > 0
    ? thirdBallErrors / thirdBallOpportunities
    : 0
  
  return {
    serveWinRate,
    serveWins,
    totalServeRallies: serveRallies.length,
    serviceFaultRate,
    serviceFaults,
    thirdBallWinRate,
    thirdBallWins,
    thirdBallOpportunities,
    thirdBallErrorRate,
    thirdBallErrors,
  }
}

/**
 * Determine insight status based on serve win rate
 */
export function getServePerformanceStatus(winRate: number): 'good' | 'average' | 'poor' {
  if (winRate >= 0.55) return 'good'
  if (winRate >= 0.48) return 'average'
  return 'poor'
}

/**
 * Generate insight text based on metrics
 */
export function generateServeInsight(metrics: ServePerformanceMetrics): string {
  const winPct = Math.round(metrics.serveWinRate * 100)
  const faultPct = Math.round(metrics.serviceFaultRate * 100)
  const thirdBallWinPct = Math.round(metrics.thirdBallWinRate * 100)
  const thirdBallErrorPct = Math.round(metrics.thirdBallErrorRate * 100)
  
  const status = getServePerformanceStatus(metrics.serveWinRate)
  
  if (status === 'good') {
    return `Your serve is a strong weapon, winning ${winPct}% of points with low fault rate (${faultPct}%).`
  }
  
  if (status === 'average') {
    return `Your serve is solid at ${winPct}% win rate. There is room to improve 3rd ball conversion (${thirdBallWinPct}%).`
  }
  
  // Poor status
  return `You win only ${winPct}% of points on serve. Service faults (${faultPct}%) and 3rd ball errors (${thirdBallErrorPct}%) are costing you.`
}

/**
 * Generate coaching recommendation based on metrics
 */
export function generateServeRecommendation(metrics: ServePerformanceMetrics): string {
  const faultRate = metrics.serviceFaultRate
  const thirdBallWinRate = metrics.thirdBallWinRate
  const thirdBallErrorRate = metrics.thirdBallErrorRate
  const status = getServePerformanceStatus(metrics.serveWinRate)
  
  // High fault rate is priority issue
  if (faultRate > 0.10) {
    return 'Focus on reducing service faults with more consistent placement and spin.'
  }
  
  // Low 3rd ball win rate + high error rate
  if (thirdBallWinRate < 0.40 && thirdBallErrorRate > 0.20) {
    return 'Work on a safer, more consistent 3rd ball attack instead of over-hitting.'
  }
  
  // Good serve performance
  if (status === 'good') {
    return 'Keep building patterns around your strong serve and 3rd ball attack.'
  }
  
  // Default advice
  return 'Focus on serve placement to create easier 3rd ball opportunities.'
}

