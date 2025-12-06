/**
 * Edge TT Match Analyser — Score Derivation
 * 
 * @deprecated This file is being phased out in favor of more granular derivation functions.
 * 
 * New code should use:
 * - `/rules/derive/set/deriveSet_winner_id.ts` for set winner
 * - `/rules/derive/set/deriveSet_final_scores.ts` for set scores
 * - `/rules/derive/match/deriveMatch_winner_id.ts` for match winner
 * - `/rules/derive/match/deriveMatch_sets_won.ts` for sets won counts
 * 
 * This file remains for backward compatibility with existing code.
 * 
 * Pure functions to derive match/set scores from rally data (bottom-up).
 * Used to validate against top-down entered scores.
 * 
 * No React, no IO — deterministic derivations only.
 */

import type { PlayerId } from './types'

// =============================================================================
// DERIVE SET SCORES FROM RALLIES
// =============================================================================

export interface RallyData {
  isScoring: boolean
  winnerId: PlayerId | null
  player1ScoreAfter: number
  player2ScoreAfter: number
}

export interface DerivedSetScore {
  player1FinalScore: number
  player2FinalScore: number
  winnerId: PlayerId | null
  rallyCount: number
  scoringRallyCount: number
}

/**
 * Derive final set score from rally data
 */
export function deriveSetScoreFromRallies(rallies: RallyData[]): DerivedSetScore {
  if (rallies.length === 0) {
    return {
      player1FinalScore: 0,
      player2FinalScore: 0,
      winnerId: null,
      rallyCount: 0,
      scoringRallyCount: 0
    }
  }
  
  // Get final scores from last rally
  const lastRally = rallies[rallies.length - 1]
  const player1FinalScore = lastRally.player1ScoreAfter
  const player2FinalScore = lastRally.player2ScoreAfter
  
  // Derive winner
  const winnerId: PlayerId | null = 
    player1FinalScore > player2FinalScore ? 'player1' :
    player2FinalScore > player1FinalScore ? 'player2' :
    null
  
  // Count scoring rallies
  const scoringRallyCount = rallies.filter(r => r.isScoring).length
  
  return {
    player1FinalScore,
    player2FinalScore,
    winnerId,
    rallyCount: rallies.length,
    scoringRallyCount
  }
}

// =============================================================================
// DERIVE MATCH SCORE FROM SETS
// =============================================================================

export interface SetData {
  setNumber: number
  player1FinalScore: number
  player2FinalScore: number
  winnerId: PlayerId | null
}

export interface DerivedMatchScore {
  player1SetsWon: number
  player2SetsWon: number
  winnerId: PlayerId | null
  setScoreSummary: string  // "3-2", "3-1", etc.
  completedSets: number
  isMatchComplete: boolean
  bestOfRequired: number | null  // Minimum bestOf based on sets played
}

/**
 * Derive match score from set data
 */
export function deriveMatchScoreFromSets(sets: SetData[], bestOf?: number): DerivedMatchScore {
  if (sets.length === 0) {
    return {
      player1SetsWon: 0,
      player2SetsWon: 0,
      winnerId: null,
      setScoreSummary: '0-0',
      completedSets: 0,
      isMatchComplete: false,
      bestOfRequired: null
    }
  }
  
  // Count sets won by each player
  let player1SetsWon = 0
  let player2SetsWon = 0
  
  sets.forEach(set => {
    if (set.winnerId === 'player1') {
      player1SetsWon++
    } else if (set.winnerId === 'player2') {
      player2SetsWon++
    }
  })
  
  // Determine match winner
  const setsToWin = bestOf ? Math.ceil(bestOf / 2) : null
  let winnerId: PlayerId | null = null
  let isMatchComplete = false
  
  if (setsToWin) {
    if (player1SetsWon >= setsToWin) {
      winnerId = 'player1'
      isMatchComplete = true
    } else if (player2SetsWon >= setsToWin) {
      winnerId = 'player2'
      isMatchComplete = true
    }
  } else {
    // No bestOf specified, determine from actual sets played
    const maxSetsWon = Math.max(player1SetsWon, player2SetsWon)
    const totalSets = player1SetsWon + player2SetsWon
    
    // Match is complete if one player has won majority
    if (maxSetsWon > totalSets / 2) {
      winnerId = player1SetsWon > player2SetsWon ? 'player1' : 'player2'
      isMatchComplete = true
    }
  }
  
  // Calculate minimum bestOf required
  const totalSets = player1SetsWon + player2SetsWon
  const bestOfRequired = totalSets > 0 ? (totalSets % 2 === 0 ? totalSets + 1 : totalSets) : null
  
  return {
    player1SetsWon,
    player2SetsWon,
    winnerId,
    setScoreSummary: `${player1SetsWon}-${player2SetsWon}`,
    completedSets: totalSets,
    isMatchComplete,
    bestOfRequired
  }
}

// =============================================================================
// DERIVE SET WINNER FROM POINT SCORES
// =============================================================================

export interface PointScores {
  player1Score: number
  player2Score: number
  targetScore?: number  // Default 11
}

export interface DerivedSetWinner {
  winnerId: PlayerId | null
  isSetComplete: boolean
  lead: number
  targetReached: boolean
  hasRequiredLead: boolean
}

/**
 * Derive set winner from point scores
 */
export function deriveSetWinner(scores: PointScores): DerivedSetWinner {
  const { player1Score, player2Score, targetScore = 11 } = scores
  
  const maxScore = Math.max(player1Score, player2Score)
  const minScore = Math.min(player1Score, player2Score)
  const lead = maxScore - minScore
  
  const targetReached = maxScore >= targetScore
  const hasRequiredLead = lead >= 2
  
  const isSetComplete = targetReached && hasRequiredLead
  
  const winnerId: PlayerId | null = isSetComplete
    ? (player1Score > player2Score ? 'player1' : 'player2')
    : null
  
  return {
    winnerId,
    isSetComplete,
    lead,
    targetReached,
    hasRequiredLead
  }
}

// =============================================================================
// DERIVE RALLY WINNER FROM SHOT DATA
// =============================================================================

export interface ShotData {
  playerId: PlayerId
  shotIndex: number
  shotQuality: 'good' | 'average' | 'weak' | 'inNet' | 'missedLong' | 'missedWide'
}

export interface DerivedRallyWinner {
  winnerId: PlayerId
  pointEndType: 'winnerShot' | 'serviceFault' | 'receiveError' | 'error'
  lastShotPlayerId: PlayerId
  lastShotIndex: number
}

/**
 * Derive rally winner from shot data (last shot determines outcome)
 */
export function deriveRallyWinnerFromShots(shots: ShotData[]): DerivedRallyWinner | null {
  if (shots.length === 0) {
    return null
  }
  
  const lastShot = shots[shots.length - 1]
  const isError = ['inNet', 'missedLong', 'missedWide'].includes(lastShot.shotQuality)
  
  // If error shot, other player wins
  const winnerId: PlayerId = isError 
    ? (lastShot.playerId === 'player1' ? 'player2' : 'player1')
    : lastShot.playerId  // In-play shot, this player wins (opponent couldn't return)
  
  // Determine point end type
  let pointEndType: DerivedRallyWinner['pointEndType']
  if (!isError) {
    pointEndType = 'winnerShot'
  } else if (lastShot.shotIndex === 1) {
    pointEndType = 'serviceFault'
  } else if (lastShot.shotIndex === 2) {
    pointEndType = 'receiveError'
  } else {
    pointEndType = 'error'
  }
  
  return {
    winnerId,
    pointEndType,
    lastShotPlayerId: lastShot.playerId,
    lastShotIndex: lastShot.shotIndex
  }
}

// =============================================================================
// COMPLETE DERIVATION
// =============================================================================

export interface CompleteMatchDerivation {
  sets: Array<DerivedSetScore & { setNumber: number }>
  match: DerivedMatchScore
}

/**
 * Derive complete match scores from rally data across all sets
 */
export function deriveCompleteMatchScores(
  setRallies: Array<{ setNumber: number; rallies: RallyData[] }>,
  bestOf?: number
): CompleteMatchDerivation {
  // Derive scores for each set
  const sets = setRallies.map(({ setNumber, rallies }) => ({
    setNumber,
    ...deriveSetScoreFromRallies(rallies)
  }))
  
  // Build set data for match derivation
  const setData: SetData[] = sets.map(s => ({
    setNumber: s.setNumber,
    player1FinalScore: s.player1FinalScore,
    player2FinalScore: s.player2FinalScore,
    winnerId: s.winnerId
  }))
  
  // Derive match score
  const match = deriveMatchScoreFromSets(setData, bestOf)
  
  return {
    sets,
    match
  }
}

