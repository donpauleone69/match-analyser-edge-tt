/**
 * Infer distance from table based on intent and rally context
 */

export interface DBShot {
  shot_index: number
  intent?: 'defensive' | 'neutral' | 'aggressive' | null
}

export function inferDistanceFromTable(
  shot: DBShot,
  previousShots: DBShot[]
): 'close' | 'mid' | 'far' | null {
  if (!shot.intent) return null
  
  // Serves and receives are at the table (shots 1 and 2)
  if (shot.shot_index <= 2) return 'close'
  
  const prevShot = previousShots[previousShots.length - 1]
  
  // Aggressive shots are typically mid-distance or at-table
  if (shot.intent === 'aggressive') {
    // If previous shot was also aggressive (rally exchange), likely mid-distance
    if (prevShot?.intent === 'aggressive') {
      return 'mid'
    }
    // First aggressive shot in rally, likely at table
    return 'close'
  }
  
  // Defensive shots - if previous was aggressive, player likely pushed back
  if (shot.intent === 'defensive') {
    if (prevShot?.intent === 'aggressive') {
      return 'far'
    }
    return 'close'
  }
  
  // Neutral shots typically at table
  return 'close'
}

