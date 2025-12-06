/**
 * Derive set winner_id (100% deterministic)
 * 
 * Logic:
 * - Player with higher final score wins the set
 * - If scores are equal, no winner (shouldn't happen in complete sets)
 * 
 * Database Field Populated:
 * - sets.winner_id
 */

import type { PlayerId } from '../../types'

export interface SetScoresInput {
  player1_final_score: number
  player2_final_score: number
}

/**
 * Derive set winner from final scores.
 * 
 * @param scores - Final scores for the set
 * @param player1Id - Player 1's ID
 * @param player2Id - Player 2's ID
 * @returns The player_id who won the set, or null if tied
 */
export function deriveSet_winner_id(
  scores: SetScoresInput,
  player1Id: PlayerId,
  player2Id: PlayerId
): PlayerId | null {
  if (scores.player1_final_score > scores.player2_final_score) {
    return player1Id
  } else if (scores.player2_final_score > scores.player1_final_score) {
    return player2Id
  }
  
  // Tie (shouldn't happen in complete sets)
  return null
}

