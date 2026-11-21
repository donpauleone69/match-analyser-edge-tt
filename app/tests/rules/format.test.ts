import { expect, it } from 'vitest'
import {
  formatBytes,
  formatChipDate,
  formatClock,
  formatExportWhen,
  formatMatchDate,
  formatScore,
  isoDaysBefore,
  todayDate,
} from '../lib/app'

const TODAY = new Date(2026, 10, 21)

it('scores, clocks and today stay on the same text', () => {
  expect(formatScore({ me: 3, them: 1 })).toBe('3 - 1')
  expect(formatClock(65)).toBe('01:05')
  expect(todayDate(TODAY)).toBe('2026-11-21')
  expect(todayDate(TODAY)).toBe(isoDaysBefore(TODAY, 0))
})

it('storage and export time stay short', () => {
  expect(formatBytes(500)).toBe('500 B')
  expect(formatBytes(12_000)).toBe('12 KB')
  expect(formatBytes(1_765_376)).toBe('2 MB')
  expect(formatBytes(10_739_183_616)).toBe('11 GB')
  expect(formatBytes(9_700_000_000)).toBe('9.7 GB')
  expect(formatExportWhen(Date.UTC(2026, 10, 21, 15, 4), TODAY)).toBe('21 Nov, 15:04')
  expect(formatExportWhen(Date.UTC(2025, 9, 4, 9, 5), TODAY)).toBe('4 Oct 2025, 09:05')
})

it('match dates drop a bad month and chip dates keep an unparseable string', () => {
  expect(formatMatchDate('2026-11-11', TODAY)).toBe('11 Nov')
  expect(formatMatchDate('2025-10-04', TODAY)).toBe('4 Oct 2025')
  expect(formatMatchDate('', TODAY)).toBe('')
  expect(formatMatchDate('2026-13-01', TODAY)).toBe('')
  expect(formatChipDate('', TODAY)).toBe('')
  expect(formatChipDate('nope', TODAY)).toBe('nope')
  expect(formatChipDate('2026-11-11', TODAY)).toBe('11 Nov')
  expect(formatChipDate('2026-13-01', TODAY)).toBe('1 undefined')
})
