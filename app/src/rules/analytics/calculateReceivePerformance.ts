/**
 * Calculate Receive Performance Metrics
 * 
 * Pure calculation function - NO React, NO IO, NO side effects.
 * Computes receive win rate, errors, forced errors conceded, and neutralisation from rally and shot data.
 */

import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'

export interface ReceivePerformanceMetrics {
  // Primary metric
  receiveWinRate: number // 0-1 (e.g., 0.48 = 48%)
  receiveWins: number
  totalReceiveRallies: number
  
  // Secondary metrics
  receiveUnforcedErrorRate: number // 0-1
  receiveUnforcedErrors: number
  
  forcedErrorsConcededRate: number // 0-1
  forcedErrorsConceded: number
  
  neutralisationRate: number // 0-1
  neutralisedRallies: number
}

export interface ReceivePerformanceInput {
  rallies: DBRally[]
  shots: DBShot[]
  playerId: string
}

/**
 * Calculate receive performance metrics for a player
 */
export function calculateReceivePerformance(input: ReceivePerformanceInput): ReceivePerformanceMetrics {
  const { rallies, shots, playerId } = input
  
  // Filter to scoring rallies where player is receiver
  const receiveRallies = rallies.filter(r => 
    r.is_scoring && r.receiver_id === playerId
  )
  
  if (receiveRallies.length === 0) {
    return {
      receiveWinRate: 0,
      receiveWins: 0,
      totalReceiveRallies: 0,
      receiveUnforcedErrorRate: 0,
      receiveUnforcedErrors: 0,
      forcedErrorsConcededRate: 0,
      forcedErrorsConceded: 0,
      neutralisationRate: 0,
      neutralisedRallies: 0,
    }
  }
  
  // 1. Receive Win Rate: rallies won when receiving
  const receiveWins = receiveRallies.filter(r => r.winner_id === playerId).length
  const receiveWinRate = receiveWins / receiveRallies.length
  
  // Group shots by rally for easier processing
  const shotsByRally = new Map<string, DBShot[]>()
  for (const shot of shots) {
    if (!shotsByRally.has(shot.rally_id)) {
      shotsByRally.set(shot.rally_id, [])
    }
    shotsByRally.get(shot.rally_id)!.push(shot)
  }
  
  let receiveUnforcedErrors = 0
  let forcedErrorsConceded = 0
  let neutralisedRallies = 0
  
  for (const rally of receiveRallies) {
    const rallyShots = shotsByRally.get(rally.id) || []
    rallyShots.sort((a, b) => a.shot_index - b.shot_index)
    
    // 2. Receive Unforced Error %: point lost immediately on shot 2
    // Use point_end_type as primary indicator (less derived)
    if (rally.point_end_type === 'receiveError') {
      receiveUnforcedErrors++
      continue // This rally ended on receive error, skip other checks
    }
    
    // 3. Forced Errors Conceded: opponent forces player into error
    // This includes:
    // - Shot 2 (receive) forced error by opponent's serve
    // - Shot 4 forced error by opponent's 3rd ball
    // Detect: any shot by playerId with is_rally_end = true AND rally_end_role = 'forced_error'
    const playerForcedError = rallyShots.find(s => 
      s.player_id === playerId && 
      s.is_rally_end && 
      s.rally_end_role === 'forced_error'
    )
    
    if (playerForcedError) {
      forcedErrorsConceded++
      continue // Rally ended with forced error, skip neutralisation check
    }
    
    // 4. Neutralisation %: rally survives past opening exchange (shot 4 goes in play)
    // This means rally reaches shot 5+ (shot 4 was in play, rally continues)
    const maxShotIndex = rallyShots.length > 0 
      ? Math.max(...rallyShots.map(s => s.shot_index))
      : 0
    
    if (maxShotIndex >= 5) {
      neutralisedRallies++
    }
  }
  
  const receiveUnforcedErrorRate = receiveUnforcedErrors / receiveRallies.length
  const forcedErrorsConcededRate = forcedErrorsConceded / receiveRallies.length
  const neutralisationRate = neutralisedRallies / receiveRallies.length
  
  return {
    receiveWinRate,
    receiveWins,
    totalReceiveRallies: receiveRallies.length,
    receiveUnforcedErrorRate,
    receiveUnforcedErrors,
    forcedErrorsConcededRate,
    forcedErrorsConceded,
    neutralisationRate,
    neutralisedRallies,
  }
}

/**
 * Determine insight status based on receive win rate
 */
export function getReceivePerformanceStatus(winRate: number): 'good' | 'average' | 'poor' {
  if (winRate >= 0.50) return 'good'
  if (winRate >= 0.45) return 'average'
  return 'poor'
}

/**
 * Generate insight text based on metrics
 */
export function generateReceiveInsight(metrics: ReceivePerformanceMetrics): string {
  const winPct = Math.round(metrics.receiveWinRate * 100)
  const errorPct = Math.round(metrics.receiveUnforcedErrorRate * 100)
  const forcedPct = Math.round(metrics.forcedErrorsConcededRate * 100)
  const neutralPct = Math.round(metrics.neutralisationRate * 100)
  
  const status = getReceivePerformanceStatus(metrics.receiveWinRate)
  
  if (status === 'good') {
    return `You win ${winPct}% of receive points and neutralise ${neutralPct}% of serves. Your receive is a clear strength.`
  }
  
  if (status === 'average') {
    // Identify dominant issue
    const dominantIssue = errorPct > forcedPct 
      ? `receive errors (${errorPct}%)`
      : `forced errors conceded (${forcedPct}%)`
    
    return `You win ${winPct}% of receive points. Most losses come from ${dominantIssue}.`
  }
  
  // Poor status
  return `You win only ${winPct}% of receive points. Receive errors (${errorPct}%) and forced errors conceded (${forcedPct}%) are major issues.`
}

/**
 * Generate coaching recommendation based on metrics
 */
export function generateReceiveRecommendation(metrics: ReceivePerformanceMetrics): string {
  const errorRate = metrics.receiveUnforcedErrorRate
  const forcedRate = metrics.forcedErrorsConcededRate
  const neutralRate = metrics.neutralisationRate
  
  // High receive error rate is priority
  if (errorRate > 0.10) {
    return 'Focus on safe, consistent receive options (short touch, deep push) to cut receive errors.'
  }
  
  // High forced error rate
  if (forcedRate > errorRate && forcedRate > 0.15) {
    return 'Work on reading spin and improving first block to reduce forced errors on receive.'
  }
  
  // Low neutralisation rate
  if (neutralRate < 0.35) {
    return 'Aim to neutralise more serves into rallies rather than giving away early points.'
  }
  
  // Default advice for good performance
  return 'Continue developing receive patterns that neutralise opponent serves and create attacking opportunities.'
}

