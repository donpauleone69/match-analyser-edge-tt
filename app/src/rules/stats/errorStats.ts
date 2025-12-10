/**
 * Error Statistics
 * High accuracy (95-100%) - direct from captured data
 */

import type { DBRally, DBShot } from '@/data'
import { inferShotType } from '../infer/shot-level/inferShotType'

export interface ErrorStats {
  // Total errors
  totalErrors: number
  unforcedErrors: number
  forcedErrors: number
  
  // By phase
  serveErrors: number
  receiveErrors: number
  rallyErrors: number
  
  // By shot type
  errorsByShotType: Record<string, {
    attempts: number
    errors: number
    winners: number
    errorRate: number
    winnerRate: number
    neutralRate: number
  }>
  
  // Error types
  netErrors: number
  longErrors: number
  netErrorRate: number
  longErrorRate: number
}

/**
 * Calculate error statistics for a player.
 */
export function calculateErrorStats(
  playerId: string,
  rallies: DBRally[],
  allShots: DBShot[]
): ErrorStats {
  const scoringRallies = rallies.filter(r => r.is_scoring && r.winner_id !== playerId)
  const playerShots = allShots.filter(s => s.player_id === playerId)
  
  // Total errors (rallies where player lost due to error)
  const unforcedErrorRallies = scoringRallies.filter(r => r.point_end_type === 'unforcedError')
  const forcedErrorRallies = scoringRallies.filter(r => r.point_end_type === 'forcedError')
  const serveErrorRallies = scoringRallies.filter(r => 
    r.point_end_type === 'serviceFault' && r.server_id === playerId
  )
  const receiveErrorRallies = scoringRallies.filter(r =>
    r.point_end_type === 'receiveError' && r.receiver_id === playerId
  )
  
  const totalErrors = unforcedErrorRallies.length + forcedErrorRallies.length + 
                      serveErrorRallies.length + receiveErrorRallies.length
  const unforcedErrors = unforcedErrorRallies.length
  const forcedErrors = forcedErrorRallies.length
  const serveErrors = serveErrorRallies.length
  const receiveErrors = receiveErrorRallies.length
  const rallyErrors = unforcedErrorRallies.length + forcedErrorRallies.length
  
  // Error types (net vs long)
  const errorShots = playerShots.filter(s =>
    s.rally_end_role === 'unforced_error' ||
    s.rally_end_role === 'forced_error' ||
    s.shot_result !== 'in_play'
  )
  
  const netErrors = errorShots.filter(s => s.shot_result === 'in_net').length
  const longErrors = errorShots.filter(s => s.shot_result === 'missed_long').length
  const netErrorRate = errorShots.length > 0 ? (netErrors / errorShots.length) * 100 : 0
  const longErrorRate = errorShots.length > 0 ? (longErrors / errorShots.length) * 100 : 0
  
  // Errors by shot type (inferred)
  const errorsByShotType: Record<string, {
    attempts: number
    errors: number
    winners: number
    errorRate: number
    winnerRate: number
    neutralRate: number
  }> = {}
  
  // Group shots by rally to get context for inference
  const shotsByRally = new Map<string, DBShot[]>()
  for (const shot of playerShots) {
    if (!shotsByRally.has(shot.rally_id)) {
      shotsByRally.set(shot.rally_id, [])
    }
    shotsByRally.get(shot.rally_id)!.push(shot)
  }
  
  for (const shot of playerShots) {
    const previousShots = shotsByRally.get(shot.rally_id)?.filter(s => s.shot_index < shot.shot_index) || []
    const { shotType } = inferShotType(shot, previousShots)
    
    if (!shotType) continue
    
    if (!errorsByShotType[shotType]) {
      errorsByShotType[shotType] = {
        attempts: 0,
        errors: 0,
        winners: 0,
        errorRate: 0,
        winnerRate: 0,
        neutralRate: 0,
      }
    }
    
    const stats = errorsByShotType[shotType]
    stats.attempts++
    
    if (
      shot.rally_end_role === 'unforced_error' ||
      shot.rally_end_role === 'forced_error' ||
      shot.shot_result !== 'in_play'
    ) {
      stats.errors++
    }
    
    if (shot.rally_end_role === 'winner') {
      stats.winners++
    }
  }
  
  // Calculate rates
  for (const shotType in errorsByShotType) {
    const stats = errorsByShotType[shotType]
    if (stats.attempts > 0) {
      stats.errorRate = (stats.errors / stats.attempts) * 100
      stats.winnerRate = (stats.winners / stats.attempts) * 100
      stats.neutralRate = ((stats.attempts - stats.errors - stats.winners) / stats.attempts) * 100
    }
  }
  
  return {
    totalErrors,
    unforcedErrors,
    forcedErrors,
    serveErrors,
    receiveErrors,
    rallyErrors,
    errorsByShotType,
    netErrors,
    longErrors,
    netErrorRate,
    longErrorRate,
  }
}

