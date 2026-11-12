import { describe, expect, it } from 'vitest'
import {
  isoDateFromEpochMs,
  matchDateSourceLabel,
  shouldApplyVideoMatchDate,
} from './matchDateFromVideo'

describe('isoDateFromEpochMs', () => {
  it('formats local YYYY-MM-DD from File.lastModified-style ms', () => {
    // 2024-06-15 12:00 local — construct via local components
    const ms = new Date(2024, 5, 15, 12, 0, 0).getTime()
    expect(isoDateFromEpochMs(ms)).toBe('2024-06-15')
  })

  it('returns null for invalid or empty ms', () => {
    expect(isoDateFromEpochMs(0)).toBeNull()
    expect(isoDateFromEpochMs(-1)).toBeNull()
    expect(isoDateFromEpochMs(Number.NaN)).toBeNull()
  })

  it('rejects absurd years', () => {
    expect(isoDateFromEpochMs(new Date(1980, 0, 1).getTime())).toBeNull()
    expect(isoDateFromEpochMs(new Date(2099, 0, 1).getTime(), new Date(2026, 0, 1))).toBeNull()
  })
})

describe('shouldApplyVideoMatchDate', () => {
  it('applies when unset or already from video', () => {
    expect(shouldApplyVideoMatchDate(null)).toBe(true)
    expect(shouldApplyVideoMatchDate(undefined)).toBe(true)
    expect(shouldApplyVideoMatchDate('video')).toBe(true)
  })

  it('never overwrites a manual date', () => {
    expect(shouldApplyVideoMatchDate('manual')).toBe(false)
  })
})

describe('matchDateSourceLabel', () => {
  it('labels sources honestly', () => {
    expect(matchDateSourceLabel('video')).toMatch(/last modified/i)
    expect(matchDateSourceLabel('manual')).toMatch(/manual/i)
    expect(matchDateSourceLabel(null)).toMatch(/not set/i)
  })
})
