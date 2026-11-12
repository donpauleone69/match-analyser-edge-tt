/**
 * Infer the previous shot's side placement from the current shot's wing + Pivot.
 *
 * Pivot off → previous ball landed on the same side as the wing used now.
 * Pivot on  → previous ball landed on the opposite side (crossed wing).
 *
 * Pure — no React, no IO.
 */

import type { ShotPlacement, ShotWing } from '@/data'

/** Opposite FH ↔ BH. Middle is never produced by this path. */
export function oppositeWing(wing: ShotWing): ShotWing {
  return wing === 'FH' ? 'BH' : 'FH'
}

/**
 * Previous shot's `shot_placement` implied by current wing + pivot.
 * Returns FH or BH only (never middle).
 */
export function derivePreviousPlacementFromWingPivot(
  wing: ShotWing,
  isPivot: boolean
): Exclude<ShotPlacement, 'middle'> {
  return isPivot ? oppositeWing(wing) : wing
}

/**
 * Resume helper: was this wing played as a pivot given the previous placement?
 * Returns false when previous placement is missing or middle (cannot tell).
 */
export function derivePivotFromPreviousPlacement(
  wing: ShotWing,
  previousPlacement: ShotPlacement | null | undefined
): boolean {
  if (previousPlacement !== 'FH' && previousPlacement !== 'BH') return false
  return previousPlacement !== wing
}
