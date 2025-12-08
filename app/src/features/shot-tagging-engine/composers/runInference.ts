/**
 * Inference Service
 * 
 * Applies probabilistic inferences (Level 1+) to shots after tagging is complete.
 * Note: Deterministic derivations (shot_origin, shot_destination, etc.) are handled 
 * during tagging in the composers.
 */

import type { DBShot, DBRally } from '@/data'
import { shotDb } from '@/data'

// Level 1: Inferences (probabilistic)
import { inferShotType } from '@/rules/infer/shot-level/inferShotType'
import { inferSpin } from '@/rules/infer/shot-level/inferSpin'
import { inferPlayerPosition } from '@/rules/infer/shot-level/inferPlayerPosition'
import { inferDistanceFromTable } from '@/rules/infer/shot-level/inferDistanceFromTable'
import { inferPressureLevel, inferIntentQuality } from '@/rules/infer/shot-level/inferPressure'

const { update: updateShot } = shotDb

/**
 * Run inferences on all shots in a rally
 */
export async function runInferenceForRally(
  rally: DBRally,
  shots: DBShot[]
): Promise<void> {
  // Sort shots by shot_index
  const sortedShots = [...shots].sort((a, b) => a.shot_index - b.shot_index)
  
  // Process each shot
  for (let i = 0; i < sortedShots.length; i++) {
    const shot = sortedShots[i]
    const previousShots = sortedShots.slice(0, i)
    
    // =========================================================================
    // LEVEL 1: INFERENCES (probabilistic)
    // =========================================================================
    
    // Infer shot type
    const { shotType } = inferShotType(shot, previousShots)
    
    // Infer spin
    const { spin } = inferSpin(shot, previousShots)
    
    // Infer player position
    const playerPosition = inferPlayerPosition(shot)
    
    // Infer distance from table
    const distanceFromTable = inferDistanceFromTable(shot, previousShots)
    
    // Infer pressure level
    const pressureLevel = inferPressureLevel(shot, rally, sortedShots)
    
    // Infer intent quality
    const intentQuality = inferIntentQuality(shot)
    
    // =========================================================================
    // SPECIAL FLAGS (simple checks)
    // =========================================================================
    
    // Check for third ball attack (shot 3, aggressive)
    const isThirdBallAttack = shot.shot_index === 3 && shot.intent === 'aggressive'
    
    // Check for receive attack (shot 2, aggressive)
    const isReceiveAttack = shot.shot_index === 2 && shot.intent === 'aggressive'
    
    // =========================================================================
    // UPDATE SHOT WITH INFERRED DATA
    // =========================================================================
    
    await updateShot(shot.id, {
      shot_type: shotType,
      shot_spin: spin,
      player_position: playerPosition,
      player_distance: distanceFromTable,
      pressure_level: pressureLevel,
      intent_quality: intentQuality,
      is_third_ball_attack: isThirdBallAttack,
      is_receive_attack: isReceiveAttack,
    })
  }
}

/**
 * Run derivations and inferences for all rallies in a set
 */
export async function runInferenceForSet(
  rallies: DBRally[],
  allShots: DBShot[]
): Promise<void> {
  for (const rally of rallies) {
    const rallyShots = allShots.filter(s => s.rally_id === rally.id)
    await runInferenceForRally(rally, rallyShots)
  }
}
