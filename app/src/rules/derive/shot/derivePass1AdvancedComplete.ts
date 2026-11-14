/**
 * Pass 1 Advanced data completeness (MA-74).
 *
 * Basic = compulsory Pass 1 gates (framework_confirmed on save).
 * Advanced = every nullable choice field on the phase allow-list is filled
 * for shots 1..end. Boolean toggles (High/Heavy/Safe/Aggressive/Pivot)
 * never gate Advanced. MA-77: placement / quality / Weak no longer gate.
 *
 * Pure — no React, no IO.
 */

import { derivePass1ShotTagAllowList } from './derivePass1ShotTagRole'

/** Minimal shot shape for Advanced completeness (UI or mapper tags). */
export interface Pass1AdvancedShotTags {
  wing?: string | null
  stroke?: string | null
  standing?: string | null
  spin?: string | null
  placement?: string | null
  depth?: string | null
  tableContact?: string | null
  quality?: string | null
}

export interface Pass1AdvancedCompleteInput {
  end: number
  fos: number | null
  shots: Record<number, Pass1AdvancedShotTags | undefined>
}

function filled(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.length > 0
}

/**
 * True when every allow-listed Advanced choice field is set on shots 1..end.
 * Incomplete by default after a Basic-only save.
 */
export function derivePass1AdvancedDataComplete(
  input: Pass1AdvancedCompleteInput
): boolean {
  const { end, fos, shots } = input
  if (!Number.isFinite(end) || end < 1) return false

  for (let i = 1; i <= end; i++) {
    const allow = derivePass1ShotTagAllowList(i, fos, end)
    const shot = shots[i] ?? {}

    // RF-class optionals
    if (allow.shot_spin && !filled(shot.spin)) return false
    if (allow.shot_placement && !filled(shot.placement)) return false
    if (allow.shot_depth && !filled(shot.depth)) return false
    if (allow.shot_contact && !filled(shot.tableContact)) return false
    if (allow.shot_quality && !filled(shot.quality)) return false

    // Wing/stroke/initiative when the RF merge exposed them for this phase.
    // Compulsory FA/End/reply wing+stroke are also required here — already
    // filled when Basic save is allowed, so this mainly gates pre-offensive
    // wing and later continuation wing/stroke/initiative.
    if (allow.shot_wing && !filled(shot.wing)) return false
    if (allow.shot_stroke && !filled(shot.stroke)) return false
    if (allow.shot_initiative && !filled(shot.standing)) return false
  }

  return true
}
