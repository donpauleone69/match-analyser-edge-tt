/**
 * Match-Level Performance Statistics
 * High accuracy (100%) - direct from captured data
 */

import type { DBRally, DBShot, DBSet } from '@/data'

export interface MatchPerformanceStats {
  // Serve/Receive
  pointsWonOnServe: number
  pointsLostOnServe: number
  serveEfficiency: number // %
  
  pointsWonOnReceive: number
  pointsLostOnReceive: number
  receiveEfficiency: number // %
  
  serveErrors: number
  serveErrorRate: number // %
  receiveErrors: number
  receiveErrorRate: number // %
  
  // Point streaks
  longestWinStreak: number
  longestLoseStreak: number
  currentStreak: number
  
  // Clutch performance
  clutchPointsPlayed: number // 9-9+, deuce, game points
  clutchPointsWon: number
  clutchWinRate: number // %
  
  // Rally length
  longRalliesPlayed: number // > 5 shots
  longRalliesWon: number
  longRallyWinRate: number // %
  
  shortRalliesPlayed: number // <= 5 shots
  shortRalliesWon: number
  shortRallyWinRate: number // %
}

/**
 * Calculate match performance stats for a player.
 */
export function calculateMatchPerformanceStats(
  playerId: string,
  rallies: DBRally[],
  allShots: DBShot[],
  _sets: DBSet[]
): MatchPerformanceStats {
  const scoringRallies = rallies.filter(r => r.is_scoring)
  
  // Serve/Receive stats
  const serveRallies = scoringRallies.filter(r => r.server_id === playerId)
  const receiveRallies = scoringRallies.filter(r => r.receiver_id === playerId)
  
  const pointsWonOnServe = serveRallies.filter(r => r.winner_id === playerId).length
  const pointsLostOnServe = serveRallies.length - pointsWonOnServe
  const serveEfficiency = serveRallies.length > 0 
    ? (pointsWonOnServe / serveRallies.length) * 100 
    : 0
  
  const pointsWonOnReceive = receiveRallies.filter(r => r.winner_id === playerId).length
  const pointsLostOnReceive = receiveRallies.length - pointsWonOnReceive
  const receiveEfficiency = receiveRallies.length > 0
    ? (pointsWonOnReceive / receiveRallies.length) * 100
    : 0
  
  // Errors
  const serveErrors = scoringRallies.filter(r => 
    r.server_id === playerId && r.point_end_type === 'serviceFault'
  ).length
  const serveErrorRate = serveRallies.length > 0
    ? (serveErrors / serveRallies.length) * 100
    : 0
  
  const receiveErrors = scoringRallies.filter(r =>
    r.receiver_id === playerId && r.point_end_type === 'receiveError'
  ).length
  const receiveErrorRate = receiveRallies.length > 0
    ? (receiveErrors / receiveRallies.length) * 100
    : 0
  
  // Point streaks
  let longestWinStreak = 0
  let longestLoseStreak = 0
  let currentStreak = 0
  let currentStreakCount = 0
  
  for (const rally of scoringRallies) {
    const won = rally.winner_id === playerId
    
    if (won) {
      if (currentStreak >= 0) {
        currentStreakCount++
      } else {
        currentStreakCount = 1
      }
      currentStreak = currentStreakCount
      longestWinStreak = Math.max(longestWinStreak, currentStreakCount)
    } else {
      if (currentStreak <= 0) {
        currentStreakCount++
      } else {
        currentStreakCount = 1
      }
      currentStreak = -currentStreakCount
      longestLoseStreak = Math.max(longestLoseStreak, currentStreakCount)
    }
  }
  
  // Clutch performance (9-9+, deuce, game points)
  const clutchRallies = scoringRallies.filter(r => {
    const p1Score = r.player1_score_after
    const p2Score = r.player2_score_after
    
    // Reconstruct score before rally
    const prevP1 = r.winner_id === r.server_id || r.winner_id === r.receiver_id
      ? (r.winner_id === r.server_id ? p1Score - 1 : p1Score)
      : p1Score
    const prevP2 = r.winner_id === r.server_id || r.winner_id === r.receiver_id
      ? (r.winner_id === r.receiver_id ? p2Score - 1 : p2Score)
      : p2Score
    
    // Clutch = either score >= 9, or deuce (both >= 10)
    return (prevP1 >= 9 || prevP2 >= 9) || (prevP1 >= 10 && prevP2 >= 10)
  })
  
  const clutchPointsPlayed = clutchRallies.length
  const clutchPointsWon = clutchRallies.filter(r => r.winner_id === playerId).length
  const clutchWinRate = clutchPointsPlayed > 0
    ? (clutchPointsWon / clutchPointsPlayed) * 100
    : 0
  
  // Rally length stats
  const longRallies = scoringRallies.filter(r => {
    const rallyShots = allShots.filter(s => s.rally_id === r.id)
    return rallyShots.length > 5
  })
  
  const shortRallies = scoringRallies.filter(r => {
    const rallyShots = allShots.filter(s => s.rally_id === r.id)
    return rallyShots.length <= 5
  })
  
  const longRalliesPlayed = longRallies.length
  const longRalliesWon = longRallies.filter(r => r.winner_id === playerId).length
  const longRallyWinRate = longRalliesPlayed > 0
    ? (longRalliesWon / longRalliesPlayed) * 100
    : 0
  
  const shortRalliesPlayed = shortRallies.length
  const shortRalliesWon = shortRallies.filter(r => r.winner_id === playerId).length
  const shortRallyWinRate = shortRalliesPlayed > 0
    ? (shortRalliesWon / shortRalliesPlayed) * 100
    : 0
  
  return {
    pointsWonOnServe,
    pointsLostOnServe,
    serveEfficiency,
    pointsWonOnReceive,
    pointsLostOnReceive,
    receiveEfficiency,
    serveErrors,
    serveErrorRate,
    receiveErrors,
    receiveErrorRate,
    longestWinStreak,
    longestLoseStreak,
    currentStreak,
    clutchPointsPlayed,
    clutchPointsWon,
    clutchWinRate,
    longRalliesPlayed,
    longRalliesWon,
    longRallyWinRate,
    shortRalliesPlayed,
    shortRalliesWon,
    shortRallyWinRate,
  }
}

/**
 * Calculate momentum shifts between sets.
 * Returns array of set-by-set momentum indicators.
 */
export function calculateMomentumShifts(
  playerId: string,
  sets: DBSet[]
): Array<{
  setNumber: number
  won: boolean
  scoreDifference: number
  momentumShift: 'gained' | 'lost' | 'maintained' | 'neutral'
}> {
  const result: Array<{
    setNumber: number
    won: boolean
    scoreDifference: number
    momentumShift: 'gained' | 'lost' | 'maintained' | 'neutral'
  }> = []
  
  let previousWon: boolean | null = null
  
  for (const set of sets) {
    const won = set.winner_id === playerId
    const scoreDifference = Math.abs(set.player1_score_final - set.player2_score_final)
    
    let momentumShift: 'gained' | 'lost' | 'maintained' | 'neutral' = 'neutral'
    
    if (previousWon !== null) {
      if (won && !previousWon) {
        momentumShift = 'gained'
      } else if (!won && previousWon) {
        momentumShift = 'lost'
      } else if (won && previousWon) {
        momentumShift = 'maintained'
      }
    }
    
    result.push({
      setNumber: set.set_number,
      won,
      scoreDifference,
      momentumShift,
    })
    
    previousWon = won
  }
  
  return result
}

