/**
 * Simple tagging — thin model on top of Pass 1 timeline.
 *
 * Offensive row is multi-select; first selected (lowest index) = FOS.
 * Miss-reason required on error endings. End shot (end > 1) needs wing + stroke.
 * Review binary → technical. Phase 2.1: Offensive · End · Review (★ on Save row).
 * Pure — no React / IO.
 */

import {
  canSaveRallyTimeline,
  isErrorEnding,
  isFosDecided,
  markEnd,
  setFos,
  type PointMissReason,
  type RallyTimelineState,
} from './pass1FocusModel'

export type SimpleMatrixRow = 'offensive' | 'end' | 'review'

/**
 * Pass 1 sticky “First attack” on a shot — Simple multi-select aware.
 * Re-tap when already FOS → undecided. Otherwise make `at` the FOS
 * (first in offensive list); keep other offensive marks after it.
 */
export function markFosSimple(
  state: RallyTimelineState,
  offensiveShots: number[],
  at: number
): { timeline: RallyTimelineState; offensiveShots: number[] } {
  if (state.end === 1 || at < 2 || at > state.shotCount) {
    return { timeline: state, offensiveShots }
  }
  if (typeof state.end === 'number' && at > state.end) {
    return { timeline: state, offensiveShots }
  }
  if (state.fos === at) {
    return {
      timeline: applyOffensiveToTimeline(state, []),
      offensiveShots: [],
    }
  }
  // Keep later offensive marks; drop any before `at` so first selected = FOS.
  const rest = normalizeOffensiveShots(offensiveShots).filter((n) => n > at)
  const next = normalizeOffensiveShots([at, ...rest])
  return {
    timeline: applyOffensiveToTimeline(state, next),
    offensiveShots: next,
  }
}

/** Sorted unique offensive shot indices (≥ 2). First = FOS. */
export function normalizeOffensiveShots(shots: number[]): number[] {
  return [...new Set(shots.filter((n) => Number.isFinite(n) && n >= 2))].sort(
    (a, b) => a - b
  )
}

/** Derive FOS from the offensive multi-select (first selected). */
export function fosFromOffensiveShots(
  offensiveShots: number[]
): number | null {
  const sorted = normalizeOffensiveShots(offensiveShots)
  return sorted.length > 0 ? sorted[0] : null
}

/**
 * Apply offensive multi-select → timeline FOS.
 * Empty list → undecided (unless noFirstAttack already set).
 */
export function applyOffensiveToTimeline(
  state: RallyTimelineState,
  offensiveShots: number[],
  opts?: { keepNoAttack?: boolean }
): RallyTimelineState {
  if (state.end === 1) {
    return {
      ...state,
      fos: null,
      noFirstAttack: false,
      fosTimeSeconds: null,
    }
  }
  const sorted = normalizeOffensiveShots(offensiveShots).filter((n) => {
    if (n > state.shotCount) return false
    if (typeof state.end === 'number' && n > state.end) return false
    return true
  })
  if (sorted.length === 0) {
    if (opts?.keepNoAttack && state.noFirstAttack) {
      return { ...state, fos: null, fosTimeSeconds: null }
    }
    return {
      ...state,
      fos: null,
      noFirstAttack: false,
      fosTimeSeconds: null,
    }
  }
  const fos = sorted[0]
  const contact = state.shots[fos]?.contactTime ?? null
  return {
    ...state,
    fos,
    noFirstAttack: false,
    fosTimeSeconds: contact,
  }
}

/** Toggle one Offensive cell. First selected = FOS. */
export function toggleOffensiveShot(
  state: RallyTimelineState,
  offensiveShots: number[],
  at: number
): { timeline: RallyTimelineState; offensiveShots: number[] } {
  if (state.end === 1) {
    return { timeline: state, offensiveShots: [] }
  }
  if (at < 2 || at > state.shotCount) {
    return { timeline: state, offensiveShots }
  }
  if (typeof state.end === 'number' && at > state.end) {
    return { timeline: state, offensiveShots }
  }

  const set = new Set(normalizeOffensiveShots(offensiveShots))
  if (set.has(at)) set.delete(at)
  else set.add(at)
  const next = normalizeOffensiveShots([...set])
  return {
    timeline: applyOffensiveToTimeline(state, next),
    offensiveShots: next,
  }
}

/** Explicit No attack (toggle). Clears offensive multi-select. */
export function toggleNoAttackSimple(
  state: RallyTimelineState,
  offensiveShots: number[]
): { timeline: RallyTimelineState; offensiveShots: number[] } {
  if (state.end === 1) {
    return { timeline: state, offensiveShots: [] }
  }
  const nextTimeline = setFos(state, null)
  return {
    timeline: nextTimeline,
    offensiveShots: nextTimeline.noFirstAttack ? [] : offensiveShots,
  }
}

/** Mark / unmark End; prune offensive shots past the new end. */
export function markEndSimple(
  state: RallyTimelineState,
  offensiveShots: number[],
  at: number
): { timeline: RallyTimelineState; offensiveShots: number[] } {
  const timeline = markEnd(state, at)
  const nextOff =
    typeof timeline.end === 'number'
      ? normalizeOffensiveShots(offensiveShots).filter((n) => n <= timeline.end!)
      : normalizeOffensiveShots(offensiveShots)
  return {
    timeline: applyOffensiveToTimeline(timeline, nextOff, {
      keepNoAttack: true,
    }),
    offensiveShots: timeline.noFirstAttack ? [] : nextOff,
  }
}

/** Rebuild offensive list from a resumed timeline (FOS only → single select). */
export function offensiveShotsFromTimeline(
  state: RallyTimelineState
): number[] {
  if (typeof state.fos === 'number' && state.fos >= 2) return [state.fos]
  return []
}

/**
 * End shot fully tagged for Simple: ending (+ miss-reason on errors) and,
 * when End > 1, Pass 1 wing + stroke on that contact.
 */
export function isEndShotFullyTagged(state: RallyTimelineState): boolean {
  if (typeof state.end !== 'number') return false
  if (!state.ending) return false
  if (isErrorEnding(state.ending) && !state.missReason) return false
  if (state.end === 1) return true
  const shot = state.shots[state.end]
  if (!shot?.wing || !shot?.stroke) return false
  return true
}

/**
 * Simple save gate: Pass 1 completeness + miss-reason on errors + end wing/shot.
 */
export function canSaveSimpleTagging(
  state: RallyTimelineState,
  winnerName: string | null
): boolean {
  if (!canSaveRallyTimeline(state, winnerName)) return false
  if (!isEndShotFullyTagged(state)) return false
  return true
}

export function simpleSaveHint(state: RallyTimelineState): string | null {
  if (state.end === null) return 'Mark End on a contact'
  if (!isFosDecided(state)) return 'Mark Offensive (first = FOS) or No attack'
  if (!state.ending) return 'Choose ending under End'
  if (isErrorEnding(state.ending) && !state.missReason) {
    return 'Pick miss reason for the error'
  }
  if (typeof state.end === 'number' && state.end > 1) {
    const shot = state.shots[state.end]
    if (!shot?.wing) return 'Pick wing on End shot'
    if (!shot?.stroke) return 'Pick shot type on End'
  }
  return null
}

export function isMissReasonRequired(
  ending: RallyTimelineState['ending']
): boolean {
  return isErrorEnding(ending)
}

export type { PointMissReason }
