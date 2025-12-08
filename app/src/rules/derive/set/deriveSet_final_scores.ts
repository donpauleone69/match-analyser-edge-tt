/**
 * Derive set final_score values (100% deterministic)
 * 
 * Logic:
 * - Final scores come from the last rally's score_after values
 * - If no rallies, scores are 0-0
 * 
 * Database Fields Populated:
 * - sets.player1_score_final
 * - sets.player2_score_final
 */

export interface RallyWithScores {
  player1_score_after: number
  player2_score_after: number
}

export interface DerivedSetFinalScores {
  player1_score_final: number
  player2_score_final: number
}

/**
 * Derive set final scores from rallies.
 * 
 * @param rallies - Array of rallies with score_after values
 * @returns Final scores for the set
 */
export function deriveSet_final_scores(
  rallies: RallyWithScores[]
): DerivedSetFinalScores {
  if (rallies.length === 0) {
    return {
      player1_score_final: 0,
      player2_score_final: 0
    }
  }
  
  // Last rally has the final scores
  const lastRally = rallies[rallies.length - 1]
  
  return {
    player1_score_final: lastRally.player1_score_after,
    player2_score_final: lastRally.player2_score_after
  }
}

