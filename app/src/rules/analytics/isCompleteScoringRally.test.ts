import { describe, expect, it } from 'vitest'
import {
  filterBrowseableTaggedRallies,
  filterCompleteScoringRallies,
  isBrowseableTaggedRally,
  isCompleteScoringRally,
  isIncompleteTaggedRally,
} from './isCompleteScoringRally'

const complete = {
  is_scoring: true,
  is_stub_rally: false,
  framework_confirmed: true,
  point_ending: 'winner' as const,
}

describe('isCompleteScoringRally', () => {
  it('accepts a finished scoring rally', () => {
    expect(isCompleteScoringRally(complete)).toBe(true)
  })

  it('rejects lets, stubs, unconfirmed, and missing ending', () => {
    expect(isCompleteScoringRally({ ...complete, is_scoring: false })).toBe(false)
    expect(isCompleteScoringRally({ ...complete, is_stub_rally: true })).toBe(false)
    expect(isCompleteScoringRally({ ...complete, framework_confirmed: false })).toBe(false)
    expect(
      isCompleteScoringRally({
        ...complete,
        point_ending: null as unknown as typeof complete.point_ending,
      })
    ).toBe(false)
    expect(
      isCompleteScoringRally({
        is_scoring: true,
        is_stub_rally: false,
        framework_confirmed: true,
        point_ending: undefined as unknown as typeof complete.point_ending,
      })
    ).toBe(true)
  })

  it('treats omitted stub/framework flags as complete (legacy rows)', () => {
    expect(
      isCompleteScoringRally({
        is_scoring: true,
        is_stub_rally: undefined as unknown as boolean,
        framework_confirmed: undefined as unknown as boolean,
        point_ending: 'winner',
      })
    ).toBe(true)
  })

  it('filters a list', () => {
    const rows = [
      complete,
      { ...complete, is_stub_rally: true },
      { ...complete, is_scoring: false },
    ]
    expect(filterCompleteScoringRallies(rows)).toEqual([complete])
  })

  it('flags incomplete tagged points for browse badges', () => {
    const incomplete = { ...complete, framework_confirmed: false }
    expect(isIncompleteTaggedRally(incomplete)).toBe(true)
    expect(isBrowseableTaggedRally(incomplete)).toBe(true)
    expect(isIncompleteTaggedRally(complete)).toBe(false)
    expect(isBrowseableTaggedRally({ ...complete, is_stub_rally: true })).toBe(false)
    expect(
      filterBrowseableTaggedRallies([complete, incomplete, { ...complete, is_scoring: false }])
    ).toEqual([complete, incomplete])
  })
})