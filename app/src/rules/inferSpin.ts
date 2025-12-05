/**
 * Infer spin from shot type and serve data
 */

import type { DBShot } from '@/data'
type InferredConfidence = 'high' | 'medium' | 'low'

export function inferSpin(
  shot: DBShot,
  previousShots: DBShot[]
): { spin: string | null; confidence: InferredConfidence } {
  // Serves: use recorded serve spin (shot 1)
  if (shot.shot_index === 1 && shot.serve_spin_family) {
    return { spin: shot.serve_spin_family, confidence: 'high' }
  }
  
  // For rally shots, infer from intent and previous shot
  if (!shot.intent) {
    return { spin: null, confidence: 'low' }
  }
  
  const prevShot = previousShots[previousShots.length - 1]
  
  // Aggressive shots usually have topspin
  if (shot.intent === 'aggressive') {
    return { spin: 'top', confidence: 'high' }
  }
  
  // Defensive shots depend on previous shot
  if (shot.intent === 'defensive') {
    // If previous was aggressive (topspin), defensive response is often push (underspin)
    if (prevShot?.intent === 'aggressive') {
      return { spin: 'under', confidence: 'medium' }
    }
    // If previous was defensive, likely continuing with underspin
    return { spin: 'under', confidence: 'medium' }
  }
  
  // Neutral shots - could be no spin or light spin
  if (shot.intent === 'neutral') {
    // Receive shots (shot 2) against underspin serve → often underspin or no spin
    if (shot.shot_index === 2 && prevShot?.serve_spin_family === 'under') {
      return { spin: 'under', confidence: 'medium' }
    }
    // Otherwise neutral = no spin or light top
    return { spin: 'no_spin', confidence: 'low' }
  }
  
  return { spin: null, confidence: 'low' }
}

