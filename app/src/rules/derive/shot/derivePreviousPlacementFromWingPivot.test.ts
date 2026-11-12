import { describe, it, expect } from 'vitest'
import {
  derivePivotFromPreviousPlacement,
  derivePreviousPlacementFromWingPivot,
  oppositeWing,
} from './derivePreviousPlacementFromWingPivot'

describe('derivePreviousPlacementFromWingPivot', () => {
  it('maps same-side when pivot is off', () => {
    expect(derivePreviousPlacementFromWingPivot('FH', false)).toBe('FH')
    expect(derivePreviousPlacementFromWingPivot('BH', false)).toBe('BH')
  })

  it('maps opposite side when pivot is on', () => {
    expect(derivePreviousPlacementFromWingPivot('FH', true)).toBe('BH')
    expect(derivePreviousPlacementFromWingPivot('BH', true)).toBe('FH')
  })
})

describe('oppositeWing', () => {
  it('flips FH ↔ BH', () => {
    expect(oppositeWing('FH')).toBe('BH')
    expect(oppositeWing('BH')).toBe('FH')
  })
})

describe('derivePivotFromPreviousPlacement', () => {
  it('is true when previous placement differs from wing', () => {
    expect(derivePivotFromPreviousPlacement('FH', 'BH')).toBe(true)
    expect(derivePivotFromPreviousPlacement('BH', 'FH')).toBe(true)
  })

  it('is false when previous matches wing or is unknown', () => {
    expect(derivePivotFromPreviousPlacement('FH', 'FH')).toBe(false)
    expect(derivePivotFromPreviousPlacement('BH', 'BH')).toBe(false)
    expect(derivePivotFromPreviousPlacement('FH', 'middle')).toBe(false)
    expect(derivePivotFromPreviousPlacement('FH', null)).toBe(false)
    expect(derivePivotFromPreviousPlacement('FH', undefined)).toBe(false)
  })
})
