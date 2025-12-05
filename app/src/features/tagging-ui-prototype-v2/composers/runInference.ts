/**
 * Inference Service - Apply inference rules to shots after tagging
 */

import type { DBShot, DBRally } from '@/data'
import { inferShotType } from '@/rules/inferShotType'
import { inferSpin } from '@/rules/inferSpin'
import { inferPlayerPosition } from '@/rules/inferPlayerPosition'
import { inferDistanceFromTable } from '@/rules/inferDistanceFromTable'
import { inferPressureLevel, inferIntentQuality } from '@/rules/inferPressure'
import { shotDb } from '@/data'

const { update: updateShot } = shotDb

/**
 * Run inference on all shots in a rally
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
    
    // Infer shot type
    const { shotType, confidence: shotConfidence } = inferShotType(shot, previousShots)
    
    // Infer spin
    const { spin, confidence: spinConfidence } = inferSpin(shot, previousShots)
    
    // Infer player position
    const playerPosition = inferPlayerPosition(shot)
    
    // Infer distance from table
    const distanceFromTable = inferDistanceFromTable(shot, previousShots)
    
    // Infer pressure level
    const pressureLevel = inferPressureLevel(shot, rally, sortedShots)
    
    // Infer intent quality
    const intentQuality = inferIntentQuality(shot)
    
    // Check for third ball attack (shot 3, aggressive)
    const isThirdBallAttack = shot.shot_index === 3 && shot.intent === 'aggressive'
    
    // Check for receive attack (shot 2, aggressive)
    const isReceiveAttack = shot.shot_index === 2 && shot.intent === 'aggressive'
    
    // Update shot with inferred data
    await updateShot(shot.id, {
      inferred_shot_type: shotType,
      inferred_shot_confidence: shotConfidence,
      inferred_spin: spin,
      inferred_spin_confidence: spinConfidence,
      inferred_player_position: playerPosition,
      inferred_distance_from_table: distanceFromTable,
      inferred_pressure_level: pressureLevel,
      inferred_intent_quality: intentQuality,
      inferred_is_third_ball_attack: isThirdBallAttack,
      inferred_is_receive_attack: isReceiveAttack,
    })
  }
}

/**
 * Run inference for all rallies in a set
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


