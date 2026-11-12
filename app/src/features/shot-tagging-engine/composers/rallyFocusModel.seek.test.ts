import { describe, it, expect } from 'vitest'
import { clampSeekTime, seekFloorFromCompleted } from './rallyFocusModel'

describe('seekFloorFromCompleted', () => {
  it('returns 0 when nothing is completed', () => {
    expect(seekFloorFromCompleted([])).toBe(0)
  })

  it('returns the last completed rally end', () => {
    expect(
      seekFloorFromCompleted([
        { endTimestamp: 12 },
        { endTimestamp: 40.5 },
      ])
    ).toBe(40.5)
  })
})

describe('clampSeekTime', () => {
  it('does not go below the floor', () => {
    expect(clampSeekTime(5, 10, 100)).toBe(10)
  })

  it('does not go past duration when provided', () => {
    expect(clampSeekTime(200, 10, 100)).toBe(100)
  })

  it('passes through values inside the window', () => {
    expect(clampSeekTime(55, 10, 100)).toBe(55)
  })
})
