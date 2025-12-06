/**
 * Tactical Pattern Inference (Level 2-3)
 * 
 * Identifies tactical patterns like:
 * - Serve → receive → 3rd ball sequences
 * - Attack zone preferences
 * - Shot combinations
 */

import type { DBShot } from '@/data'

export interface TacticalPattern {
  patternType: string
  description: string
  frequency: number
  successRate: number
  confidence: 'low' | 'medium' | 'high'
}

/**
 * Infer 3-ball pattern (serve → receive → 3rd ball).
 * Returns pattern identifier and success indicator.
 */
export function infer3BallPattern(
  serve: DBShot,
  receive: DBShot,
  thirdBall: DBShot
): {
  pattern: string
  successful: boolean
} {
  if (serve.shot_index !== 1 || receive.shot_index !== 2 || thirdBall.shot_index !== 3) {
    return { pattern: 'invalid', successful: false }
  }
  
  // Build pattern string
  const serveSpinPart = serve.serve_spin_family || 'unknown'
  const serveLengthPart = serve.serve_length || 'unknown'
  const receiveWingPart = receive.wing || 'unknown'
  const receiveIntentPart = receive.intent || 'neutral'
  const thirdBallIntentPart = thirdBall.intent || 'neutral'
  const thirdBallDestPart = thirdBall.shot_destination || 'unknown'
  
  const pattern = `${serveSpinPart}_${serveLengthPart} → ${receiveWingPart}_${receiveIntentPart} → ${thirdBallIntentPart}_to_${thirdBallDestPart}`
  
  // Pattern successful if 3rd ball was good quality or won point
  const successful = thirdBall.shot_result === 'good' || thirdBall.rally_end_role === 'winner'
  
  return { pattern, successful }
}

/**
 * Infer opening attack quality (3rd ball).
 * Combines 3rd ball shot with opponent's 4th ball response.
 */
export function inferOpeningQuality(
  thirdBall: DBShot,
  fourthBall: DBShot | null
): 'excellent' | 'good' | 'poor' | 'neutral' {
  if (thirdBall.shot_index !== 3) return 'neutral'
  
  // If 3rd ball ended rally
  if (thirdBall.is_rally_end) {
    if (thirdBall.rally_end_role === 'winner') return 'excellent'
    if (thirdBall.rally_end_role === 'unforced_error') return 'poor'
    return 'neutral'
  }
  
  // If no 4th ball data, judge by 3rd ball quality alone
  if (!fourthBall) {
    if (thirdBall.shot_result === 'good') return 'good'
    if (thirdBall.shot_result === 'average') return 'neutral'
    return 'poor'
  }
  
  // Judge by opponent's response
  if (fourthBall.shot_result === 'in_net' || fourthBall.shot_result === 'missed_long') {
    // Opponent error = excellent opening
    return 'excellent'
  }
  
  if (fourthBall.intent === 'defensive') {
    // Opponent forced defensive = good opening
    return 'good'
  }
  
  if (fourthBall.intent === 'aggressive' && fourthBall.shot_result === 'good') {
    // Opponent counter-attacked successfully = poor opening
    return 'poor'
  }
  
  return 'neutral'
}

/**
 * Find preferred attack zones for a player.
 * Returns distribution of shot destinations for aggressive shots.
 */
export function findPreferredAttackZones(
  playerId: string,
  shots: DBShot[]
): {
  left: number
  mid: number
  right: number
  mostPreferred: 'left' | 'mid' | 'right' | 'none'
} {
  const aggressiveShots = shots.filter(
    s => s.player_id === playerId && s.intent === 'aggressive' && s.shot_destination
  )
  
  if (aggressiveShots.length === 0) {
    return { left: 0, mid: 0, right: 0, mostPreferred: 'none' }
  }
  
  const left = aggressiveShots.filter(s => s.shot_destination === 'left').length
  const mid = aggressiveShots.filter(s => s.shot_destination === 'mid').length
  const right = aggressiveShots.filter(s => s.shot_destination === 'right').length
  
  const total = aggressiveShots.length
  const leftPct = (left / total) * 100
  const midPct = (mid / total) * 100
  const rightPct = (right / total) * 100
  
  let mostPreferred: 'left' | 'mid' | 'right' | 'none' = 'none'
  if (leftPct > midPct && leftPct > rightPct) mostPreferred = 'left'
  else if (rightPct > midPct && rightPct > leftPct) mostPreferred = 'right'
  else if (midPct > leftPct && midPct > rightPct) mostPreferred = 'mid'
  
  return {
    left: leftPct,
    mid: midPct,
    right: rightPct,
    mostPreferred,
  }
}

/**
 * Detect weakness exploitation.
 * Identifies if opponent is targeting a zone where player has high error rate.
 */
export function detectWeaknessExploitation(
  playerId: string,
  opponentId: string,
  allShots: DBShot[]
): {
  targetZone: 'left' | 'mid' | 'right' | 'none'
  targetCount: number
  playerErrorRate: number
  isExploiting: boolean
} {
  // Get opponent's shots
  const opponentShots = allShots.filter(s => s.player_id === opponentId && s.shot_destination)
  
  // Get player's response shots (shot after opponent's shot)
  const playerResponses: Array<{ zone: string; isError: boolean }> = []
  
  for (let i = 0; i < allShots.length - 1; i++) {
    const shot = allShots[i]
    const nextShot = allShots[i + 1]
    
    if (shot.player_id === opponentId && nextShot.player_id === playerId) {
      const zone = shot.shot_destination
      const isError = nextShot.rally_end_role === 'unforced_error' || 
                      nextShot.rally_end_role === 'forced_error' ||
                      nextShot.shot_result === 'in_net' ||
                      nextShot.shot_result === 'missed_long'
      
      if (zone) {
        playerResponses.push({ zone, isError })
      }
    }
  }
  
  // Calculate error rate by zone
  const zoneStats: Record<string, { count: number; errors: number }> = {
    left: { count: 0, errors: 0 },
    mid: { count: 0, errors: 0 },
    right: { count: 0, errors: 0 },
  }
  
  for (const response of playerResponses) {
    if (response.zone in zoneStats) {
      zoneStats[response.zone].count++
      if (response.isError) {
        zoneStats[response.zone].errors++
      }
    }
  }
  
  // Find zone with highest error rate
  let maxErrorRate = 0
  let targetZone: 'left' | 'mid' | 'right' | 'none' = 'none'
  
  for (const [zone, stats] of Object.entries(zoneStats)) {
    if (stats.count >= 3) { // Need at least 3 samples
      const errorRate = stats.count > 0 ? (stats.errors / stats.count) * 100 : 0
      if (errorRate > maxErrorRate) {
        maxErrorRate = errorRate
        targetZone = zone as 'left' | 'mid' | 'right'
      }
    }
  }
  
  const targetCount = targetZone !== 'none' ? zoneStats[targetZone].count : 0
  const isExploiting = maxErrorRate > 40 && targetCount >= 5 // Error rate > 40% and targeted 5+ times
  
  return {
    targetZone,
    targetCount,
    playerErrorRate: maxErrorRate,
    isExploiting,
  }
}

