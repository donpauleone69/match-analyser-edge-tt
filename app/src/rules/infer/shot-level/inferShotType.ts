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
} from '@/data'

export function inferShotType(
  shot: DBShot,
  previousShots: DBShot[]
): { shotType: string | null; confidence: number | null } {
  // Serves are always shot 1
  if (shot.shot_index === 1) {
    return { shotType: 'serve', confidence: 0.95 }
  }
  
  // If shot result indicates an error, confidence is high
  const isError = shot.shot_result === 'in_net' || shot.shot_result === 'missed_long' || shot.shot_result === 'missed_wide'
  
  if (isError) {
    // Error shots - infer based on intent
    if (shot.intent === 'aggressive') {
      return shot.shot_wing === 'FH' 
        ? { shotType: 'FH_loop', confidence: 0.6 }
        : { shotType: 'BH_loop', confidence: 0.6 }
    }
    if (shot.intent === 'defensive') {
      return shot.shot_wing === 'FH'
        ? { shotType: 'FH_push', confidence: 0.4 }
        : { shotType: 'BH_push', confidence: 0.4 }
    }
    // Neutral errors - could be many things
    return { shotType: null, confidence: 0.3 }
  }
  
  // Non-error shots - infer from wing + intent + context
  if (!shot.shot_wing || !shot.intent) {
    return { shotType: null, confidence: 0.3 }
  }
  
  // Aggressive shots
  if (shot.intent === 'aggressive') {
    if (shot.shot_wing === 'FH') {
      // Could be loop or smash
      if (shot.shot_quality === 'high') {
        return { shotType: 'FH_loop', confidence: 0.85 }
      }
      return { shotType: 'FH_loop', confidence: 0.6 }
    }
    if (shot.shot_wing === 'BH') {
      return { shotType: 'BH_loop', confidence: 0.85 }
    }
  }
  
  // Defensive shots
  if (shot.intent === 'defensive') {
    const prevShot = previousShots[previousShots.length - 1]
    const prevWasAggressive = prevShot?.intent === 'aggressive'
    
    if (shot.shot_wing === 'FH') {
      // If previous was aggressive, likely a block or chop
      if (prevWasAggressive) {
        return { shotType: 'FH_block', confidence: 0.6 }
      }
      return { shotType: 'FH_push', confidence: 0.6 }
    }
    if (shot.shot_wing === 'BH') {
      if (prevWasAggressive) {
        return { shotType: 'BH_block', confidence: 0.6 }
      }
      return { shotType: 'BH_push', confidence: 0.6 }
    }
  }
  
  // Neutral shots
  if (shot.intent === 'neutral') {
    if (shot.shot_wing === 'FH') {
      // Check if receive (shot 2)
      if (shot.shot_index === 2) {
        return { shotType: 'FH_flick', confidence: 0.6 }
      }
      return { shotType: 'FH_drive', confidence: 0.6 }
    }
    if (shot.shot_wing === 'BH') {
      if (shot.shot_index === 2) {
        return { shotType: 'BH_flick', confidence: 0.6 }
      }
      return { shotType: 'BH_drive', confidence: 0.6 }
    }
  }
  
  return { shotType: null, confidence: 0.3 }
}

