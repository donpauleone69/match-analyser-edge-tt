/**
 * Check if current score meets set end conditions
 * 
 * @param p1Score - Player 1 current score
 * @param p2Score - Player 2 current score
 * @returns Set end status and winner
 * 
 * @example
 * deriveSetEndConditions(11, 8) // { isSetEnd: true, winner: 'player1' }
 * deriveSetEndConditions(10, 10) // { isSetEnd: false }
 * deriveSetEndConditions(12, 10) // { isSetEnd: true, winner: 'player1' }
 */
export function deriveSetEndConditions(
  p1Score: number,
  p2Score: number
): { isSetEnd: boolean; winner?: 'player1' | 'player2' } {
  const scoreDiff = Math.abs(p1Score - p2Score)
  const maxScore = Math.max(p1Score, p2Score)
  
  // Set ends when:
  // 1. Someone reaches 11+ AND has 2+ point lead
  if (maxScore >= 11 && scoreDiff >= 2) {
    return {
      isSetEnd: true,
      winner: p1Score > p2Score ? 'player1' : 'player2'
    }
  }
  
  // Otherwise, set continues
  return { isSetEnd: false }
}


