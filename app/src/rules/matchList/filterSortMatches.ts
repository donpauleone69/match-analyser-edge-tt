/**
 * Filter + sort the match catalog for find/nav.
 * Pure — no React, no IO.
 *
 * Date tagged = latest set tagging_completed_at || tagging_started_at
 * (falls back to match.created_at only for sort, not as a tagged date filter hit
 * unless includeCreatedAsTagged is set — MVP leaves that false).
 */

export type MatchListSort = 'match_date' | 'tagged_at' | 'created_at'

export interface MatchListFilters {
  opponentId: string | null
  tournamentId: string | null
  /** Inclusive YYYY-MM-DD */
  matchDateFrom: string | null
  matchDateTo: string | null
  /** Inclusive YYYY-MM-DD (calendar day of tagged timestamp) */
  taggedDateFrom: string | null
  taggedDateTo: string | null
  sort: MatchListSort
}

export interface MatchListFilterRow {
  id: string
  player2_id: string | null
  tournament_id: string | null
  match_date: string
  created_at: string
  /** ISO timestamp or null when never tagged */
  tagged_at: string | null
}

export const EMPTY_MATCH_LIST_FILTERS: MatchListFilters = {
  opponentId: null,
  tournamentId: null,
  matchDateFrom: null,
  matchDateTo: null,
  taggedDateFrom: null,
  taggedDateTo: null,
  sort: 'match_date',
}

/** YYYY-MM-DD from an ISO timestamp or date string. */
export function toCalendarDate(isoOrDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate
  const d = new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** Latest tagging activity across sets. */
export function deriveMatchTaggedAt(
  sets: ReadonlyArray<{ tagging_started_at: string | null; tagging_completed_at: string | null }>
): string | null {
  let best: string | null = null
  for (const s of sets) {
    for (const t of [s.tagging_completed_at, s.tagging_started_at]) {
      if (t && (!best || t > best)) best = t
    }
  }
  return best
}

function inDateRange(day: string, from: string | null, to: string | null): boolean {
  if (!day) return false
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

export function filterSortMatches<T extends MatchListFilterRow>(
  rows: readonly T[],
  filters: MatchListFilters
): T[] {
  const filtered = rows.filter((row) => {
    if (filters.opponentId && row.player2_id !== filters.opponentId) return false
    if (filters.tournamentId && row.tournament_id !== filters.tournamentId) return false

    if (filters.matchDateFrom || filters.matchDateTo) {
      const day = toCalendarDate(row.match_date)
      if (!inDateRange(day, filters.matchDateFrom, filters.matchDateTo)) return false
    }

    if (filters.taggedDateFrom || filters.taggedDateTo) {
      if (!row.tagged_at) return false
      const day = toCalendarDate(row.tagged_at)
      if (!inDateRange(day, filters.taggedDateFrom, filters.taggedDateTo)) return false
    }

    return true
  })

  const sorted = [...filtered]
  sorted.sort((a, b) => {
    switch (filters.sort) {
      case 'tagged_at': {
        const at = a.tagged_at ?? ''
        const bt = b.tagged_at ?? ''
        return bt.localeCompare(at) || b.match_date.localeCompare(a.match_date)
      }
      case 'created_at':
        return (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.match_date.localeCompare(a.match_date)
      case 'match_date':
      default:
        return (
          b.match_date.localeCompare(a.match_date) ||
          (b.created_at ?? '').localeCompare(a.created_at ?? '')
        )
    }
  })

  return sorted
}

export function matchListFiltersActive(filters: MatchListFilters): boolean {
  return Boolean(
    filters.opponentId ||
      filters.tournamentId ||
      filters.matchDateFrom ||
      filters.matchDateTo ||
      filters.taggedDateFrom ||
      filters.taggedDateTo ||
      filters.sort !== 'match_date'
  )
}
