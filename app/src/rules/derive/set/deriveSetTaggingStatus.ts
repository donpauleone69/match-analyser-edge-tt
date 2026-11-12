/**
 * Player-facing tagging status for a set.
 * Pure — no React, no IO.
 *
 * The stored tagging_phase still carries legacy Phase 1 / Phase 2 names
 * (Pass 1 Focus writes 'phase2_in_progress' while rallies are being saved
 * and 'phase2_complete' when the session is ended). Collapse them into:
 *
 * - 'tagged':      the session was ended (or is_tagged)
 * - 'in_progress': rallies exist, or tagging was started
 * - 'not_started': nothing tagged yet
 */

import type { DBSet } from '@/data'

export type SetTaggingStatus = 'not_started' | 'in_progress' | 'tagged'

export function deriveSetTaggingStatus(
  set: Pick<DBSet, 'is_tagged' | 'tagging_phase' | 'tagging_started_at'>,
  rallyCount: number
): SetTaggingStatus {
  if (set.is_tagged || set.tagging_phase === 'phase2_complete') {
    return rallyCount > 0 || set.is_tagged ? 'tagged' : 'not_started'
  }
  if (rallyCount > 0) return 'in_progress'
  if (set.tagging_phase === 'phase1_in_progress' || set.tagging_phase === 'phase2_in_progress') {
    return 'in_progress'
  }
  return 'not_started'
}
