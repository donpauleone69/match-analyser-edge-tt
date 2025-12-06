/**
 * Derive rally score_after values (100% deterministic)
 * 
 * Logic:
 * - If rally is scoring: increment winner's score by 1
 * - If rally is let: scores stay the same as before
 * - Scores accumulate across rallies in a set
 * 
 * Database Fields Populated:
 * - rallies.player1_score_after
 * - rallies.player2_score_after
 */

import type { PlayerId } from '../../types'

export interface RallyScoreInput {
  is_scoring: boolean
  winner_id: PlayerId | null
}

export interface PreviousScores {
  player1_score_after: number
  player2_score_after: number
}

export interface DerivedRallyScores {
  player1_score_after: number
  player2_score_after: number
}

/**
 * Derive score_after values for a rally.
 * 
 * @param rally - Rally with is_scoring and winner_id
 * @param previousScores - Scores from previous rally (or 0-0 for first rally)
 * @param player1Id - Player 1's ID
 * @param player2Id - Player 2's ID
 * @returns Updated scores after this rally
 */
export function deriveRally_scores(
  rally: RallyScoreInput,
  previousScores: PreviousScores,
  player1Id: PlayerId,
  player2Id: PlayerId
): DerivedRallyScores {
  // Let rally: scores don't change
  if (!rally.is_scoring) {
    return {
      player1_score_after: previousScores.player1_score_after,
      player2_score_after: previousScores.player2_score_after
    }
  }
  
  // Scoring rally: increment winner's score
  if (rally.winner_id === player1Id) {
    return {
      player1_score_after: previousScores.player1_score_after + 1,
      player2_score_after: previousScores.player2_score_after
    }
  } else if (rally.winner_id === player2Id) {
    return {
      player1_score_after: previousScores.player1_score_after,
      player2_score_after: previousScores.player2_score_after + 1
    }
  }
  
  // No winner: scores stay the same (shouldn't happen for complete rallies)
  return {
    player1_score_after: previousScores.player1_score_after,
    player2_score_after: previousScores.player2_score_after
  }
}

/**
 * Calculate scores for multiple rallies in sequence.
 * Useful for deriving entire set scores from rally list.
 * 
 * @param rallies - Array of rallies with is_scoring and winner_id
 * @param player1Id - Player 1's ID
 * @param player2Id - Player 2's ID
 * @returns Array of rallies with scores populated
 */
export function deriveScoresForRallies<T extends RallyScoreInput>(
  rallies: T[],
  player1Id: PlayerId,
  player2Id: PlayerId
): Array<T & DerivedRallyScores> {
  let currentScores: PreviousScores = {
    player1_score_after: 0,
    player2_score_after: 0
  }
  
  return rallies.map(rally => {
    const scores = deriveRally_scores(rally, currentScores, player1Id, player2Id)
    currentScores = scores
    
    return {
      ...rally,
      ...scores
    }
  })
}

