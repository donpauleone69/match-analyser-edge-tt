import { describe, expect, it } from 'vitest'
import { deriveVideoJumpMarkers } from './deriveVideoJumpMarkers'

describe('deriveVideoJumpMarkers', () => {
  it('suggests trim from first serve to last action with lead/tail', () => {
    const m = deriveVideoJumpMarkers([
      { setNumber: 1, rallyIndex: 1, loop: { start: 90, end: 95 } },
      { setNumber: 1, rallyIndex: 2, loop: { start: 100, end: 110 } },
    ])
    expect(m.sets[0]?.firstServeS).toBe(90)
    expect(m.sets[0]?.lastActionS).toBe(110)
    expect(m.sets[0]?.suggestedTrimStartS).toBe(88)
    expect(m.sets[0]?.suggestedTrimEndS).toBe(113)
    expect(m.chips.some((c) => c.label.includes('first serve'))).toBe(true)
  })

  it('computes gap between sets', () => {
    const m = deriveVideoJumpMarkers([
      { setNumber: 1, rallyIndex: 1, loop: { start: 10, end: 20 } },
      { setNumber: 2, rallyIndex: 1, loop: { start: 80, end: 90 } },
    ])
    expect(m.sets[0]?.gapToNextSetS).toBe(60)
    expect(m.chips.some((c) => c.label.includes('Set 1 · end'))).toBe(true)
  })

  it('ignores untimed rallies', () => {
    const m = deriveVideoJumpMarkers([
      { setNumber: 1, rallyIndex: 1, loop: null },
      { setNumber: 1, rallyIndex: 2, loop: { start: 40, end: 50 } },
    ])
    expect(m.sets[0]?.firstServeS).toBe(40)
  })
})
