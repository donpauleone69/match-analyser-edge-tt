/**
 * Infer pressure level based on rally context and shot quality
 */

import type { DBShot, DBRally, PressureLevel, IntentQuality } from '@/data'

export function inferPressureLevel(
  shot: DBShot,
  _rally: DBRally,
  allRallyShots: DBShot[]
): PressureLevel | null {
  // Rally length indicates pressure - longer rallies = higher pressure
  const rallyLength = allRallyShots.length
  
  // If this is a rally-ending shot, pressure was high
  if (shot.is_rally_end) {
    return rallyLength > 10 ? 'high' : 'high'
  }
  
  // Aggressive exchanges = higher pressure
  const recentShots = allRallyShots.slice(-3) // Last 3 shots
  const aggressiveCount = recentShots.filter(s => s.intent === 'aggressive').length
  
  if (aggressiveCount >= 2) {
    return 'high'
  }
  
  // Long rallies build pressure
  if (rallyLength > 15) return 'high'
  if (rallyLength > 8) return 'medium'
  if (rallyLength > 4) return 'low'
  
  return 'low'
}

export function inferIntentQuality(
  shot: DBShot
): IntentQuality | null {
  // For MVP, intent quality maps from shot result
  if (!shot.shot_result) return null
  
  if (shot.shot_result === 'good') return 'high'
  if (shot.shot_result === 'average') return 'medium'
  
  // Errors indicate low quality
  if (shot.shot_result === 'in_net' || shot.shot_result === 'missed_long') {
    return 'low'
  }
  
  return 'medium'
}

