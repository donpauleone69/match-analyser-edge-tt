import { describe, expect, it } from 'vitest'
import { timelineFromContacts } from './pass1FocusModel'
import {
  applyOffensiveToTimeline,
  canSaveSimpleTagging,
  fosFromOffensiveShots,
  markEndSimple,
  markFosSimple,
  simpleSaveHint,
  toggleNoAttackSimple,
  toggleOffensiveShot,
} from './simpleTaggingModel'

describe('simpleTaggingModel', () => {
  it('sets FOS to the first selected offensive shot', () => {
    const base = timelineFromContacts([1, 2, 3, 4, 5])
    const mid = toggleOffensiveShot(base, [], 4)
    expect(mid.offensiveShots).toEqual([4])
    expect(mid.timeline.fos).toBe(4)

    const multi = toggleOffensiveShot(mid.timeline, mid.offensiveShots, 2)
    expect(multi.offensiveShots).toEqual([2, 4])
    expect(fosFromOffensiveShots(multi.offensiveShots)).toBe(2)
    expect(multi.timeline.fos).toBe(2)
  })

  it('clears FOS when last offensive is removed', () => {
    const base = timelineFromContacts([1, 2, 3])
    const on = toggleOffensiveShot(base, [], 2)
    const off = toggleOffensiveShot(on.timeline, on.offensiveShots, 2)
    expect(off.offensiveShots).toEqual([])
    expect(off.timeline.fos).toBeNull()
    expect(off.timeline.noFirstAttack).toBe(false)
  })

  it('supports No attack toggle', () => {
    const base = timelineFromContacts([1, 2, 3])
    const withOff = toggleOffensiveShot(base, [], 2)
    const none = toggleNoAttackSimple(withOff.timeline, withOff.offensiveShots)
    expect(none.offensiveShots).toEqual([])
    expect(none.timeline.noFirstAttack).toBe(true)
    expect(none.timeline.fos).toBeNull()
  })

  it('requires miss reason on error endings and End wing/shot', () => {
    // timelineFromContacts pre-marks End at N — do not re-tap (would clear).
    let state = applyOffensiveToTimeline(timelineFromContacts([1, 2, 3, 4, 5]), [3])
    state = { ...state, ending: 'error_net', missReason: null }
    expect(canSaveSimpleTagging(state, 'Hero')).toBe(false)
    expect(simpleSaveHint(state)).toMatch(/miss reason/i)

    state = { ...state, missReason: 'forced' }
    expect(canSaveSimpleTagging(state, 'Hero')).toBe(false)
    expect(simpleSaveHint(state)).toMatch(/wing/i)

    state = {
      ...state,
      shots: {
        ...state.shots,
        5: { ...state.shots[5], wing: 'FH', stroke: 'Block' },
      },
    }
    expect(canSaveSimpleTagging(state, 'Hero')).toBe(true)
    expect(simpleSaveHint(state)).toBeNull()
  })

  it('allows winner save without miss reason once End wing/shot set', () => {
    let state = applyOffensiveToTimeline(timelineFromContacts([1, 2, 3]), [2])
    state = {
      ...state,
      ending: 'winner',
      missReason: null,
      shots: {
        ...state.shots,
        3: { ...state.shots[3], wing: 'BH', stroke: 'Push' },
      },
    }
    expect(canSaveSimpleTagging(state, 'Hero')).toBe(true)
  })

  it('serve-only End does not require wing/shot', () => {
    let state = timelineFromContacts([1])
    state = { ...state, ending: 'winner', missReason: null }
    expect(canSaveSimpleTagging(state, 'Hero')).toBe(true)
  })

  it('markEndSimple can move End and prune offensive past it', () => {
    const base = applyOffensiveToTimeline(timelineFromContacts([1, 2, 3, 4, 5]), [2, 4])
    // Clear pre-marked end first, then mark at 3.
    const cleared = markEndSimple(base, [2, 4], 5)
    expect(cleared.timeline.end).toBeNull()
    const moved = markEndSimple(cleared.timeline, cleared.offensiveShots, 3)
    expect(moved.timeline.end).toBe(3)
    expect(moved.offensiveShots).toEqual([2])
    expect(moved.timeline.fos).toBe(2)
  })

  it('markFosSimple sets FOS and clears earlier offensive marks', () => {
    const base = applyOffensiveToTimeline(timelineFromContacts([1, 2, 3, 4, 5]), [2, 4])
    const moved = markFosSimple(base, [2, 4], 3)
    expect(moved.offensiveShots).toEqual([3, 4])
    expect(moved.timeline.fos).toBe(3)

    const cleared = markFosSimple(moved.timeline, moved.offensiveShots, 3)
    expect(cleared.offensiveShots).toEqual([])
    expect(cleared.timeline.fos).toBeNull()
    expect(cleared.timeline.noFirstAttack).toBe(false)
  })
})
