/**
 * Infer player position based on shot origin and wing
 * 
 * Position inference:
 * - FH from left = wide FH position
 * - BH from right = wide BH position
 * - FH from right or BH from left = pivot/adjustment
 */

import type { DBShot } from '@/data'

export function inferPlayerPosition(
  shot: DBShot
): 'wide_fh' | 'normal' | 'wide_bh' | 'very_wide_fh' | 'very_wide_bh' | null {
  if (!shot.shot_origin || !shot.wing) return null
  
  const origin = shot.shot_origin
  const wing = shot.wing
  
  // Forehand positions (assuming right-handed player)
  if (wing === 'FH') {
    if (origin === 'left') return 'wide_fh'
    if (origin === 'mid') return 'normal'
    if (origin === 'right') return 'normal' // FH from BH side
  }
  
  // Backhand positions
  if (wing === 'BH') {
    if (origin === 'right') return 'wide_bh'
    if (origin === 'mid') return 'normal'
    if (origin === 'left') return 'normal' // BH from FH side
  }
  
  return 'normal'
}

