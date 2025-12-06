/**
 * Derive match winner_id (100% deterministic)
 * 
 * Logic:
 * - Player who won the most sets wins the match
 * - Best of 3/5/7 formats supported
 * 
 * Database Field Populated:
 * - matches.winner_id
 */

import type { PlayerId } from '../../types'

export interface SetWithWinner {
  winner_id: PlayerId | null
}

/**
 * Derive match winner from set winners.
 * 
 * @param sets - Array of sets with winner_id
 * @param player1Id - Player 1's ID
 * @param player2Id - Player 2's ID
 * @returns The player_id who won the match, or null if incomplete
 */
export function deriveMatch_winner_id(
  sets: SetWithWinner[],
  player1Id: PlayerId,
  player2Id: PlayerId
): PlayerId | null {
  if (sets.length === 0) return null
  
  const player1SetsWon = sets.filter(s => s.winner_id === player1Id).length
  const player2SetsWon = sets.filter(s => s.winner_id === player2Id).length
  
  if (player1SetsWon > player2SetsWon) {
    return player1Id
  } else if (player2SetsWon > player1SetsWon) {
    return player2Id
  }
  
  // Tie or incomplete match
  return null
}

