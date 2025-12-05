/**
 * Infer shot type from recorded data
 * 
 * Shot type inference based on:
 * - Serve data (spin family + length)
 * - Rally shot data (wing + intent + previous shots)
 * - Error type
 */

import type { 
  DBShot,
  InferredConfidence,
} from '@/data'

export function inferShotType(
  shot: DBShot,
  previousShots: DBShot[]
): { shotType: string | null; confidence: InferredConfidence } {
  // Serves are always shot 1
  if (shot.shot_index === 1) {
    return { shotType: 'serve', confidence: 'high' }
  }
  
  // If shot result indicates an error, confidence is high
  const isError = shot.shot_result === 'in_net' || shot.shot_result === 'missed_long' || shot.shot_result === 'missed_wide'
  
  if (isError) {
    // Error shots - infer based on intent
    if (shot.intent === 'aggressive') {
      return shot.wing === 'FH' 
        ? { shotType: 'FH_loop', confidence: 'medium' }
        : { shotType: 'BH_loop', confidence: 'medium' }
    }
    if (shot.intent === 'defensive') {
      return shot.wing === 'FH'
        ? { shotType: 'FH_push', confidence: 'low' }
        : { shotType: 'BH_push', confidence: 'low' }
    }
    // Neutral errors - could be many things
    return { shotType: null, confidence: 'low' }
  }
  
  // Non-error shots - infer from wing + intent + context
  if (!shot.wing || !shot.intent) {
    return { shotType: null, confidence: 'low' }
  }
  
  // Aggressive shots
  if (shot.intent === 'aggressive') {
    if (shot.wing === 'FH') {
      // Could be loop or smash
      if (shot.shot_result === 'good') {
        return { shotType: 'FH_loop', confidence: 'high' }
      }
      return { shotType: 'FH_loop', confidence: 'medium' }
    }
    if (shot.wing === 'BH') {
      return { shotType: 'BH_loop', confidence: 'high' }
    }
  }
  
  // Defensive shots
  if (shot.intent === 'defensive') {
    const prevShot = previousShots[previousShots.length - 1]
    const prevWasAggressive = prevShot?.intent === 'aggressive'
    
    if (shot.wing === 'FH') {
      // If previous was aggressive, likely a block or chop
      if (prevWasAggressive) {
        return { shotType: 'FH_block', confidence: 'medium' }
      }
      return { shotType: 'FH_push', confidence: 'medium' }
    }
    if (shot.wing === 'BH') {
      if (prevWasAggressive) {
        return { shotType: 'BH_block', confidence: 'medium' }
      }
      return { shotType: 'BH_push', confidence: 'medium' }
    }
  }
  
  // Neutral shots
  if (shot.intent === 'neutral') {
    if (shot.wing === 'FH') {
      // Check if receive (shot 2)
      if (shot.shot_index === 2) {
        return { shotType: 'FH_flick', confidence: 'medium' }
      }
      return { shotType: 'FH_drive', confidence: 'medium' }
    }
    if (shot.wing === 'BH') {
      if (shot.shot_index === 2) {
        return { shotType: 'BH_flick', confidence: 'medium' }
      }
      return { shotType: 'BH_drive', confidence: 'medium' }
    }
  }
  
  return { shotType: null, confidence: 'low' }
}

