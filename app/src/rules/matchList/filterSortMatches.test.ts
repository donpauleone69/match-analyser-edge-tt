import { describe, expect, it } from 'vitest'
import {
  deriveMatchTaggedAt,
  EMPTY_MATCH_LIST_FILTERS,
  filterSortMatches,
  matchListFiltersActive,
  toCalendarDate,
} from './filterSortMatches'

const rows = [
  {
    id: 'm1',
    player2_id: 'opp-1',
    tournament_id: 't-a',
    match_date: '2026-11-10',
    created_at: '2026-11-11T10:00:00.000Z',
    tagged_at: '2026-11-12T15:00:00.000Z',
  },
  {
    id: 'm2',
    player2_id: 'opp-2',
    tournament_id: 't-a',
    match_date: '2026-11-08',
    created_at: '2026-11-09T10:00:00.000Z',
    tagged_at: null,
  },
  {
    id: 'm3',
    player2_id: 'opp-1',
    tournament_id: 't-b',
    match_date: '2026-11-01',
    created_at: '2026-11-02T10:00:00.000Z',
    tagged_at: '2026-11-03T09:00:00.000Z',
  },
]

describe('filterSortMatches', () => {
  it('filters by opponent', () => {
    const ids = filterSortMatches(rows, { ...EMPTY_MATCH_LIST_FILTERS, opponentId: 'opp-1' }).map((r) => r.id)
    expect(ids).toEqual(['m1', 'm3'])
  })

  it('filters by tournament', () => {
    const ids = filterSortMatches(rows, { ...EMPTY_MATCH_LIST_FILTERS, tournamentId: 't-a' }).map((r) => r.id)
    expect(ids).toEqual(['m1', 'm2'])
  })

  it('filters by match date range', () => {
    const ids = filterSortMatches(rows, {
      ...EMPTY_MATCH_LIST_FILTERS,
      matchDateFrom: '2026-11-08',
      matchDateTo: '2026-11-10',
    }).map((r) => r.id)
    expect(ids).toEqual(['m1', 'm2'])
  })

  it('filters by date tagged and excludes untagged', () => {
    const ids = filterSortMatches(rows, {
      ...EMPTY_MATCH_LIST_FILTERS,
      taggedDateFrom: '2026-11-12',
      taggedDateTo: '2026-11-12',
    }).map((r) => r.id)
    expect(ids).toEqual(['m1'])
  })

  it('sorts by date tagged descending', () => {
    const ids = filterSortMatches(rows, { ...EMPTY_MATCH_LIST_FILTERS, sort: 'tagged_at' }).map((r) => r.id)
    expect(ids).toEqual(['m1', 'm3', 'm2'])
  })
})

describe('deriveMatchTaggedAt', () => {
  it('picks the latest started or completed timestamp', () => {
    expect(
      deriveMatchTaggedAt([
        { tagging_started_at: '2026-11-01T10:00:00.000Z', tagging_completed_at: null },
        { tagging_started_at: '2026-11-02T10:00:00.000Z', tagging_completed_at: '2026-11-03T10:00:00.000Z' },
      ])
    ).toBe('2026-11-03T10:00:00.000Z')
  })

  it('returns null when never tagged', () => {
    expect(deriveMatchTaggedAt([{ tagging_started_at: null, tagging_completed_at: null }])).toBeNull()
  })
})

describe('helpers', () => {
  it('toCalendarDate handles ISO timestamps', () => {
    expect(toCalendarDate('2026-11-12T15:00:00.000Z')).toBe('2026-11-12')
  })

  it('matchListFiltersActive ignores default sort-only empty', () => {
    expect(matchListFiltersActive(EMPTY_MATCH_LIST_FILTERS)).toBe(false)
    expect(matchListFiltersActive({ ...EMPTY_MATCH_LIST_FILTERS, opponentId: 'x' })).toBe(true)
    expect(matchListFiltersActive({ ...EMPTY_MATCH_LIST_FILTERS, sort: 'tagged_at' })).toBe(true)
  })
})
