/**
 * Complete scoring rallies only — exclude lets, stubs, and unfinished points
 * from stats / story / playlists that should not be skewed (product goal 9).
 * Pure — no React, no IO.
 */

import type { DBRally } from '@/data'

export type CompleteScoringRallyFields = Pick<
  DBRally,
  'is_scoring' | 'is_stub_rally' | 'framework_confirmed' | 'point_ending'
>

/**
 * A rally that awards a finished point and is safe for analysis.
 * - Lets (`is_scoring: false`) excluded
 * - Stub / pre-populated rows excluded
 * - Unconfirmed framework (abandoned mid-tag) excluded
 * - Missing point ending excluded
 */
export function isCompleteScoringRally(rally: CompleteScoringRallyFields): boolean {
  if (!rally.is_scoring) return false
  // Explicit incomplete only — legacy rows may omit these flags.
  if (rally.is_stub_rally === true) return false
  if (rally.framework_confirmed === false) return false
  // Only reject an explicit null ending (omit/undefined = legacy complete rows).
  if (rally.point_ending === null) return false
  return true
}

export function filterCompleteScoringRallies<T extends CompleteScoringRallyFields>(
  rallies: readonly T[]
): T[] {
  return rallies.filter(isCompleteScoringRally)
}
