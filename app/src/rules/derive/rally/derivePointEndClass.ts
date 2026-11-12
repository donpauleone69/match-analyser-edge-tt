/**
 * Derive a coarse point-end class from Rally Focus ending + last shot index.
 *
 * Replaces point_end_type / rally_end_role for analytics that only need:
 * service fault, receive error, winner, lucky, or a generic error.
 */

import type { PointEnding } from '@/data'

export type PointEndClass =
  | 'service_fault'
  | 'receive_error'
  | 'winner'
  | 'lucky'
  | 'error_net'
  | 'error_long'
  | 'error_wide'

export function isErrorEnding(ending: PointEnding): boolean {
  return (
    ending === 'error_net' ||
    ending === 'error_long' ||
    ending === 'error_wide'
  )
}

/**
 * @param lastShotIndex - Index of the last counting shot (rally end)
 * @param pointEnding - Tagged ending from Rally Focus
 */
export function derivePointEndClass(
  lastShotIndex: number,
  pointEnding: PointEnding
): PointEndClass {
  if (isErrorEnding(pointEnding)) {
    if (lastShotIndex === 1) return 'service_fault'
    if (lastShotIndex === 2) return 'receive_error'
    return pointEnding
  }
  return pointEnding
}
