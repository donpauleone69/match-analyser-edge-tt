/**
 * Movement & Position Inference (Level 3)
 * 
 * Deep inference of player movement patterns:
 * - Pivots to forehand
 * - Out of position situations
 * - Forced wide movements
 * - Recovery quality
 */

import type { DBShot } from '@/data'

export interface PivotAnalysis {
  pivoted: boolean
  toWing: 'FH' | 'BH' | null
  fromPosition: string
  toPosition: string
  successful: boolean
}

/**
 * Infer if player pivoted to forehand.
 * 
 * Classic pivot pattern:
 * - Previous shot: BH from normal/mid position
 * - Current shot: FH from left (wide FH) position
 * - Often crosscourt shot (destination = right)
 */
export function inferPivotMovement(
  currentShot: DBShot,
  previousShot: DBShot | null,
  prevPreviousShot: DBShot | null
): PivotAnalysis {
  const noPivot: PivotAnalysis = {
    pivoted: false,
    toWing: null,
    fromPosition: 'unknown',
    toPosition: 'unknown',
    successful: false,
  }
  
  if (!currentShot.wing || !previousShot) return noPivot
  
  // Pivot to forehand: BH → FH with position change
  if (
    previousShot.wing === 'BH' && 
    currentShot.wing === 'FH' &&
    currentShot.shot_origin === 'left' // Wide FH position
  ) {
    const successful = currentShot.shot_result === 'good' || 
                       currentShot.rally_end_role === 'winner'
    
    return {
      pivoted: true,
      toWing: 'FH',
      fromPosition: previousShot.shot_origin || 'unknown',
      toPosition: currentShot.shot_origin || 'left',
      successful,
    }
  }
  
  // Pivot to backhand (less common): FH → BH with position change
  if (
    previousShot.wing === 'FH' &&
    currentShot.wing === 'BH' &&
    currentShot.shot_origin === 'right' // Wide BH position
  ) {
    const successful = currentShot.shot_result === 'good' ||
                       currentShot.rally_end_role === 'winner'
    
    return {
      pivoted: true,
      toWing: 'BH',
      fromPosition: previousShot.shot_origin || 'unknown',
      toPosition: currentShot.shot_origin || 'right',
      successful,
    }
  }
  
  return noPivot
}

export interface OutOfPositionAnalysis {
  outOfPosition: boolean
  severity: 'slight' | 'significant' | 'extreme'
  causedBy: 'opponent_placement' | 'own_error' | 'unknown'
  recoveredSuccessfully: boolean
}

/**
 * Infer if player is out of position.
 * 
 * Out of position indicators:
 * - Shot from wide position (left/right origin)
 * - Defensive intent after being at table
 * - Opponent targeted open court (crosscourt after crosscourt)
 */
export function inferOutOfPosition(
  currentShot: DBShot,
  previousShot: DBShot | null,
  opponentPreviousShot: DBShot | null
): OutOfPositionAnalysis {
  const notOut: OutOfPositionAnalysis = {
    outOfPosition: false,
    severity: 'slight',
    causedBy: 'unknown',
    recoveredSuccessfully: true,
  }
  
  if (!currentShot.shot_origin) return notOut
  
  // Shooting from wide left or right = potentially out of position
  const isWide = currentShot.shot_origin === 'left' || currentShot.shot_origin === 'right'
  
  if (!isWide) return notOut
  
  // Determine severity
  let severity: 'slight' | 'significant' | 'extreme' = 'slight'
  
  if (currentShot.intent === 'defensive') {
    severity = 'significant'
  }
  
  if (currentShot.shot_result === 'in_net' || currentShot.shot_result === 'missed_long') {
    severity = 'extreme'
  }
  
  // Determine cause
  let causedBy: 'opponent_placement' | 'own_error' | 'unknown' = 'unknown'
  
  if (opponentPreviousShot) {
    // Check if opponent placed ball wide (crosscourt or wide angle)
    if (
      (opponentPreviousShot.shot_target === 'left' && currentShot.shot_origin === 'left') ||
      (opponentPreviousShot.shot_target === 'right' && currentShot.shot_origin === 'right')
    ) {
      causedBy = 'opponent_placement'
    }
  }
  
  if (previousShot && previousShot.player_id === currentShot.player_id) {
    // Check if player's own shot left them out of position
    if (previousShot.shot_target !== currentShot.shot_origin) {
      causedBy = 'own_error'
    }
  }
  
  const recoveredSuccessfully = currentShot.shot_result === 'good' || 
                                 currentShot.rally_end_role === 'winner'
  
  return {
    outOfPosition: true,
    severity,
    causedBy,
    recoveredSuccessfully,
  }
}

/**
 * Infer if player was forced wide by opponent.
 */
export function inferForcedWide(
  currentShot: DBShot,
  opponentPreviousShot: DBShot | null
): boolean {
  if (!currentShot.shot_origin || !opponentPreviousShot?.shot_target) {
    return false
  }
  
  // Player is wide if shooting from left/right
  const isWide = currentShot.shot_origin === 'left' || currentShot.shot_origin === 'right'
  
  if (!isWide) return false
  
  // Forced wide if opponent's shot landed in same zone
  return (
    (opponentPreviousShot.shot_target === 'left' && currentShot.shot_origin === 'left') ||
    (opponentPreviousShot.shot_target === 'right' && currentShot.shot_origin === 'right')
  )
}

export interface RecoveryAnalysis {
  quality: 'excellent' | 'good' | 'late' | 'failed'
  timeBetweenShots: number | null
  positionRecovered: boolean
}

/**
 * Infer recovery quality after being out of position.
 * 
 * Uses time between shots and position change.
 * Fast recovery (< 0.8s) + good position = excellent
 * Slow recovery (> 1.2s) + still wide = late
 */
export function inferRecoveryQuality(
  currentShot: DBShot,
  previousShot: DBShot | null,
  prevPreviousShot: DBShot | null
): RecoveryAnalysis {
  if (!previousShot) {
    return {
      quality: 'good',
      timeBetweenShots: null,
      positionRecovered: true,
    }
  }
  
  // Calculate time between player's consecutive shots
  let timeBetweenShots: number | null = null
  
  if (
    prevPreviousShot &&
    prevPreviousShot.player_id === currentShot.player_id &&
    prevPreviousShot.time &&
    currentShot.time
  ) {
    timeBetweenShots = currentShot.time - prevPreviousShot.time
  }
  
  // Check if position recovered
  const wasWide = previousShot.shot_origin === 'left' || previousShot.shot_origin === 'right'
  const isNowNormal = currentShot.shot_origin === 'mid'
  const positionRecovered = !wasWide || isNowNormal
  
  // Determine quality
  let quality: 'excellent' | 'good' | 'late' | 'failed' = 'good'
  
  if (currentShot.rally_end_role === 'unforced_error' || currentShot.rally_end_role === 'forced_error') {
    quality = 'failed'
  } else if (timeBetweenShots && timeBetweenShots < 0.8 && positionRecovered) {
    quality = 'excellent'
  } else if (timeBetweenShots && timeBetweenShots > 1.2 && !positionRecovered) {
    quality = 'late'
  } else if (positionRecovered && currentShot.shot_result === 'good') {
    quality = 'excellent'
  } else if (!positionRecovered || currentShot.intent === 'defensive') {
    quality = 'late'
  }
  
  return {
    quality,
    timeBetweenShots,
    positionRecovered,
  }
}

