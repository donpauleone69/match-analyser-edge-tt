/**
 * Match date from video — honest browser File.lastModified only.
 * No EXIF / creation-time invention when the browser can't provide it.
 */

import type { MatchDateSource } from '@/data/entities/matches/match.types'

export type { MatchDateSource }

/** YYYY-MM-DD in local timezone from a millisecond epoch (e.g. File.lastModified). */
export function isoDateFromEpochMs(ms: number, now: Date = new Date()): string | null {
  if (!Number.isFinite(ms) || ms <= 0) return null
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  // Guard absurd clocks (corrupt metadata)
  const year = d.getFullYear()
  const nowYear = now.getFullYear()
  if (year < 1990 || year > nowYear + 1) return null

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Manual dates must not be overwritten by a later video attach. */
export function shouldApplyVideoMatchDate(
  source: MatchDateSource | null | undefined
): boolean {
  return source !== 'manual'
}

export function matchDateSourceLabel(
  source: MatchDateSource | null | undefined
): string {
  if (source === 'video') return 'From video file (last modified)'
  if (source === 'manual') return 'Set manually'
  return 'Not set from video yet'
}
