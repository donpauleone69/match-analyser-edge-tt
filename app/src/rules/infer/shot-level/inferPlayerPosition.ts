/**
 * Infer player position based on shot origin and wing
 * 
 * Position inference:
 * - FH from left = left position (wide FH)
 * - BH from right = right position (wide BH)
 * - Middle positions = middle
 * - FH from right or BH from left = middle (pivot/adjustment)
 */

import type { DBShot, PlayerPosition } from '@/data'

export function inferPlayerPosition(
  shot: DBShot
): PlayerPosition | null {
  if (!shot.shot_origin || !shot.shot_wing) return null
  
  const origin = shot.shot_origin
  const wing = shot.shot_wing
  
  // Forehand positions (assuming right-handed player)
  if (wing === 'FH') {
    if (origin === 'left') return 'left' // Wide FH position
    if (origin === 'mid') return 'middle'
    if (origin === 'right') return 'middle' // FH from BH side (pivot)
  }
  
  // Backhand positions
  if (wing === 'BH') {
    if (origin === 'right') return 'right' // Wide BH position
    if (origin === 'mid') return 'middle'
    if (origin === 'left') return 'middle' // BH from FH side (pivot)
  }
  
  return 'middle'
}

