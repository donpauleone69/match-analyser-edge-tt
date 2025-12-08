/**
 * Derive match sets_won counts (100% deterministic)
 * 
 * Logic:
 * - Count how many sets each player won
 * 
 * Database Fields Populated:
 * - matches.player1_sets_final
 * - matches.player2_sets_final
 */

import type { SetWithWinner } from './deriveMatch_winner_id'

type PlayerId = string

export interface DerivedMatchSetsWon {
  player1_sets_final: number
  player2_sets_final: number
}

/**
 * Derive sets won counts for a match.
 * 
 * @param sets - Array of sets with winner_id
 * @param player1Id - Player 1's ID
 * @param player2Id - Player 2's ID
 * @returns Count of sets won by each player
 */
export function deriveMatch_sets_won(
  sets: SetWithWinner[],
  player1Id: PlayerId,
  player2Id: PlayerId
): DerivedMatchSetsWon {
  const player1_sets_final = sets.filter(s => s.winner_id === player1Id).length
  const player2_sets_final = sets.filter(s => s.winner_id === player2Id).length
  
  return {
    player1_sets_final,
    player2_sets_final
  }
}

