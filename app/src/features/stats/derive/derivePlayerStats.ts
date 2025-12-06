/**
 * Derive Player Statistics View Model
 */

import type { DBSet, DBRally, DBShot } from '@/data'
import {
  calculateMatchPerformanceStats,
  calculateTacticalStats,
  calculateErrorStats,
  calculateServeStats,
  calculateReceiveStats,
} from '@/rules/stats'
import type { PlayerStatsViewModel } from '../models'

export function useDerivePlayerStats(
  playerId: string,
  playerName: string,
  sets: DBSet[],
  rallies: DBRally[],
  shots: DBShot[]
): PlayerStatsViewModel {
  // Calculate match summary
  const setsWon = sets.filter(s => s.winner_id === playerId).length
  const setsLost = sets.length - setsWon
  const setWinRate = sets.length > 0 ? (setsWon / sets.length) * 100 : 0
  
  const scoringRallies = rallies.filter(r => r.is_scoring)
  const pointsWon = scoringRallies.filter(r => r.winner_id === playerId).length
  const pointsLost = scoringRallies.length - pointsWon
  const pointWinRate = scoringRallies.length > 0 ? (pointsWon / scoringRallies.length) * 100 : 0
  
  // Calculate stats using rules
  const performance = calculateMatchPerformanceStats(playerId, rallies, shots, sets)
  const serve = calculateServeStats(playerId, rallies, shots)
  const receive = calculateReceiveStats(playerId, rallies, shots)
  const tactical = calculateTacticalStats(playerId, rallies, shots)
  const errors = calculateErrorStats(playerId, rallies, shots)
  
  // Get unique matches
  const uniqueMatchIds = new Set(sets.map(s => s.match_id))
  const matchesPlayed = uniqueMatchIds.size
  
  // Count matches won (majority of sets)
  let matchesWon = 0
  for (const matchId of uniqueMatchIds) {
    const matchSets = sets.filter(s => s.match_id === matchId)
    const matchSetsWon = matchSets.filter(s => s.winner_id === playerId).length
    if (matchSetsWon > matchSets.length / 2) {
      matchesWon++
    }
  }
  
  const matchWinRate = matchesPlayed > 0 ? (matchesWon / matchesPlayed) * 100 : 0
  
  return {
    playerId,
    playerName,
    matchesPlayed,
    matchesWon,
    matchWinRate,
    setsWon,
    setsLost,
    setWinRate,
    pointsWon,
    pointsLost,
    pointWinRate,
    performance,
    serve,
    receive,
    tactical,
    errors,
  }
}

