import { describe, expect, it } from 'vitest'
import {
  BETWEEN_SET_GAP_PRE_CONTACT_LEAD_S,
  betweenSetGapSeekS,
  deriveVideoJumpMarkers,
  shouldShowBetweenSetGapJump,
} from './deriveVideoJumpMarkers'

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
    expect(m.chips.some((c) => c.label === 'First serve')).toBe(true)
    expect(m.chips.some((c) => c.label === 'Set end')).toBe(true)
  })

  it('computes gap between sets', () => {
    const m = deriveVideoJumpMarkers([
      { setNumber: 1, rallyIndex: 1, loop: { start: 10, end: 20 } },
      { setNumber: 2, rallyIndex: 1, loop: { start: 80, end: 90 } },
    ])
    expect(m.sets[0]?.gapToNextSetS).toBe(60)
    expect(m.chips.some((c) => c.label.includes('Set 1 · end'))).toBe(true)
    expect(m.chips.some((c) => c.label.includes('Gap → set 2'))).toBe(true)
  })

  it('hides Gap chip when between-set gap is under threshold', () => {
    const m = deriveVideoJumpMarkers([
      { setNumber: 1, rallyIndex: 1, loop: { start: 10, end: 20 } },
      { setNumber: 2, rallyIndex: 1, loop: { start: 28, end: 35 } },
    ])
    expect(m.sets[0]?.gapToNextSetS).toBe(8)
    expect(m.chips.some((c) => c.label.includes('Gap'))).toBe(false)
  })

  it('ignores untimed rallies', () => {
    const m = deriveVideoJumpMarkers([
      { setNumber: 1, rallyIndex: 1, loop: null },
      { setNumber: 1, rallyIndex: 2, loop: { start: 40, end: 50 } },
    ])
    expect(m.sets[0]?.firstServeS).toBe(40)
  })
})

describe('shouldShowBetweenSetGapJump', () => {
  it('hides when first serve is within 15s of previous set end', () => {
    expect(shouldShowBetweenSetGapJump(100, 108)).toBe(false)
    expect(shouldShowBetweenSetGapJump(100, 115)).toBe(true)
  })

  it('shows when gap unknown or previous end missing', () => {
    expect(shouldShowBetweenSetGapJump(100, null)).toBe(true)
    expect(shouldShowBetweenSetGapJump(null, 120)).toBe(false)
  })
})

describe('betweenSetGapSeekS', () => {
  it('estimates into dead air when no first-serve contact yet', () => {
    expect(betweenSetGapSeekS(100, null)).toBe(100 + BETWEEN_SET_GAP_PRE_CONTACT_LEAD_S)
    expect(betweenSetGapSeekS(100, undefined, 105)).toBe(104.95)
  })

  it('seeks to previous set end when known gap is ≥ threshold', () => {
    expect(betweenSetGapSeekS(100, 120)).toBe(100)
    expect(betweenSetGapSeekS(100, 108)).toBe(null)
  })

  it('returns null without previous set end', () => {
    expect(betweenSetGapSeekS(null, null)).toBe(null)
  })
})
