import { expect, it } from 'vitest'
import {
  firstContactG,
  formatClock,
  insertIndex,
  lastContactG,
  segmentAt,
  segmentsOf,
  toGlobal,
  totalDuration,
} from '../lib/app'

const segs = segmentsOf([
  { id: 'a', durationS: 10 },
  { id: 'b', durationS: 5 },
])

it('segmentsOf lays videos end to end', () => {
  expect(segs.map((s) => s.offset)).toEqual([0, 10])
  expect(totalDuration(segs)).toBe(15)
  expect(totalDuration([])).toBe(0)
})

it('toGlobal is null when the video is gone', () => {
  expect(toGlobal(segs, 'a', 3)).toBe(3)
  expect(toGlobal(segs, 'b', 1)).toBe(11)
  expect(toGlobal(segs, 'c', 1)).toBeNull()
})

it('segmentAt picks the video that contains the clock time', () => {
  expect(segmentAt(segs, 0)?.id).toBe('a')
  expect(segmentAt(segs, 10)?.id).toBe('b')
  expect(segmentAt([], 0)).toBeNull()
})

it('formatClock reads minutes and tenths', () => {
  expect(formatClock(65)).toBe('01:05')
  expect(formatClock(7.3, true)).toBe('00:07.3')
})

it('contacts land on the match clock', () => {
  const rally = { videoId: 'b', contacts: [1, 4], start: 0, end: 4 }
  expect(firstContactG(segs, rally)).toBe(11)
  expect(lastContactG(segs, rally)).toBe(14)
})

it('insertIndex keeps video order', () => {
  const early = { videoId: 'a', contacts: [2], start: 0, end: 2 }
  const late = { videoId: 'b', contacts: [1], start: 0, end: 1 }
  expect(insertIndex(segs, [late], 2)).toBe(0)
  expect(insertIndex(segs, [early], 12)).toBe(1)
})
