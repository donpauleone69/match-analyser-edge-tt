/**
 * Calculate 3rd Ball Effectiveness Metrics
 * 
 * Pure calculation function - NO React, NO IO, NO side effects.
 * Computes 3rd ball success rate, winners, forced errors, and unforced errors from rally and shot data.
 */

import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'

export interface ThirdBallEffectivenessMetrics {
  // Primary metric
  thirdBallSuccessRate: number // 0-1 (e.g., 0.35 = 35%)
  thirdBallSuccesses: number
  thirdBallOpportunities: number
  
  // Secondary metrics (breakdown of success)
  thirdBallWinnerRate: number // 0-1
  thirdBallWinners: number
  
  thirdBallForcedErrorRate: number // 0-1
  thirdBallForcedErrors: number
  
  thirdBallUnforcedErrorRate: number // 0-1
  thirdBallUnforcedErrors: number
}

export interface ThirdBallEffectivenessInput {
  rallies: DBRally[]
  shots: DBShot[]
  playerId: string
}

/**
 * Calculate 3rd ball effectiveness metrics for a player
 */
export function calculateThirdBallEffectiveness(input: ThirdBallEffectivenessInput): ThirdBallEffectivenessMetrics {
  const { rallies, shots, playerId } = input
  
  // Filter to scoring rallies where player is server
  const serveRallies = rallies.filter(r => 
    r.is_scoring && r.server_id === playerId
  )
  
  if (serveRallies.length === 0) {
    return {
      thirdBallSuccessRate: 0,
      thirdBallSuccesses: 0,
      thirdBallOpportunities: 0,
      thirdBallWinnerRate: 0,
      thirdBallWinners: 0,
      thirdBallForcedErrorRate: 0,
      thirdBallForcedErrors: 0,
      thirdBallUnforcedErrorRate: 0,
      thirdBallUnforcedErrors: 0,
    }
  }
  
  // Group shots by rally
  const shotsByRally = new Map<string, DBShot[]>()
  for (const shot of shots) {
    if (!shotsByRally.has(shot.rally_id)) {
      shotsByRally.set(shot.rally_id, [])
    }
    shotsByRally.get(shot.rally_id)!.push(shot)
  }
  
  let thirdBallOpportunities = 0
  let thirdBallSuccesses = 0
  let thirdBallWinners = 0
  let thirdBallForcedErrors = 0
  let thirdBallUnforcedErrors = 0
  
  for (const rally of serveRallies) {
    const rallyShots = shotsByRally.get(rally.id) || []
    rallyShots.sort((a, b) => a.shot_index - b.shot_index)
    
    // Check if 3rd ball exists and is by this player
    const shot3 = rallyShots.find(s => s.shot_index === 3 && s.player_id === playerId)
    
    if (!shot3) continue // No 3rd ball opportunity (rally ended before shot 3)
    
    thirdBallOpportunities++
    
    // 1. Check for 3rd ball unforced error
    if (shot3.is_rally_end && shot3.rally_end_role === 'unforced_error') {
      thirdBallUnforcedErrors++
      continue // Rally ended with UE, not a success
    }
    
    // 2. Check for 3rd ball winner (clean winner on shot 3)
    if (shot3.is_rally_end && shot3.rally_end_role === 'winner') {
      thirdBallWinners++
      thirdBallSuccesses++
      continue
    }
    
    // 3. Check for 3rd ball forced error (shot 4 by opponent is forced error)
    const shot4 = rallyShots.find(s => s.shot_index === 4)
    if (shot4 && shot4.player_id !== playerId && shot4.is_rally_end && shot4.rally_end_role === 'forced_error') {
      thirdBallForcedErrors++
      thirdBallSuccesses++
      continue
    }
    
    // Otherwise, 3rd ball did not lead to immediate success
  }
  
  // Calculate rates
  const thirdBallSuccessRate = thirdBallOpportunities > 0 
    ? thirdBallSuccesses / thirdBallOpportunities 
    : 0
  
  const thirdBallWinnerRate = thirdBallOpportunities > 0
    ? thirdBallWinners / thirdBallOpportunities
    : 0
  
  const thirdBallForcedErrorRate = thirdBallOpportunities > 0
    ? thirdBallForcedErrors / thirdBallOpportunities
    : 0
  
  const thirdBallUnforcedErrorRate = thirdBallOpportunities > 0
    ? thirdBallUnforcedErrors / thirdBallOpportunities
    : 0
  
  return {
    thirdBallSuccessRate,
    thirdBallSuccesses,
    thirdBallOpportunities,
    thirdBallWinnerRate,
    thirdBallWinners,
    thirdBallForcedErrorRate,
    thirdBallForcedErrors,
    thirdBallUnforcedErrorRate,
    thirdBallUnforcedErrors,
  }
}

/**
 * Determine insight status based on 3rd ball success rate
 */
export function getThirdBallEffectivenessStatus(successRate: number): 'good' | 'average' | 'poor' {
  if (successRate >= 0.40) return 'good'
  if (successRate >= 0.30) return 'average'
  return 'poor'
}

/**
 * Generate insight text based on metrics
 */
export function generateThirdBallInsight(metrics: ThirdBallEffectivenessMetrics): string {
  const successPct = Math.round(metrics.thirdBallSuccessRate * 100)
  const winnerPct = Math.round(metrics.thirdBallWinnerRate * 100)
  const forcedPct = Math.round(metrics.thirdBallForcedErrorRate * 100)
  const uePct = Math.round(metrics.thirdBallUnforcedErrorRate * 100)
  
  const status = getThirdBallEffectivenessStatus(metrics.thirdBallSuccessRate)
  
  if (status === 'good') {
    return `Your 3rd ball is dangerous: you convert ${successPct}% of chances, with ${winnerPct}% winners and ${forcedPct}% forced errors.`
  }
  
  if (status === 'average') {
    return `Your 3rd ball converts ${successPct}% of chances. Reducing unforced errors (${uePct}%) would quickly improve results.`
  }
  
  // Poor status
  return `You convert only ${successPct}% of 3rd ball opportunities. Too many attacks end in unforced errors (${uePct}%).`
}

/**
 * Generate coaching recommendation based on metrics
 */
export function generateThirdBallRecommendation(metrics: ThirdBallEffectivenessMetrics): string {
  const successRate = metrics.thirdBallSuccessRate
  const ueRate = metrics.thirdBallUnforcedErrorRate
  
  // High unforced error rate is priority
  if (ueRate > 0.25) {
    return 'Work on safer 3rd ball spin and placement instead of maximum power.'
  }
  
  // Low success but UE not huge - need better setup
  if (successRate < 0.35 && ueRate < 0.20) {
    return 'Focus on creating clearer opportunities (better serve + receive patterns).'
  }
  
  // Good success rate
  if (successRate >= 0.40) {
    return 'Your 3rd ball is a key strength—build more of your game plan around serving and attacking third ball.'
  }
  
  // Default advice
  return 'Balance aggression with consistency on 3rd ball attacks. Aim for 40%+ success rate.'
}

