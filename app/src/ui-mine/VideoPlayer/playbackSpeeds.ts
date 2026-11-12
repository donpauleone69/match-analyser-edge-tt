/**
 * Shared match-video playback speed ladder.
 * Used by tagging, rally review, and clips so rates stay consistent.
 */

export const MATCH_PLAYBACK_SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export type MatchPlaybackSpeed = (typeof MATCH_PLAYBACK_SPEED_STEPS)[number]

export const DEFAULT_PLAYBACK_SPEED: MatchPlaybackSpeed = 1

export const SEEK_STEP_SECONDS = 10

export function formatPlaybackSpeed(speed: number): string {
  return `${speed}×`
}

/** Snap to nearest ladder step, then move ±1. */
export function nudgePlaybackSpeed(current: number, direction: -1 | 1): number {
  const steps = MATCH_PLAYBACK_SPEED_STEPS
  let idx = steps.findIndex((s) => s === current)
  if (idx < 0) {
    idx = steps.reduce(
      (best, step, i) =>
        Math.abs(step - current) < Math.abs(steps[best] - current) ? i : best,
      0
    )
  }
  const next = Math.max(0, Math.min(steps.length - 1, idx + direction))
  return steps[next]
}

export function canNudgePlaybackSpeed(current: number, direction: -1 | 1): boolean {
  const steps = MATCH_PLAYBACK_SPEED_STEPS
  if (direction < 0) return current > steps[0]
  return current < steps[steps.length - 1]
}
