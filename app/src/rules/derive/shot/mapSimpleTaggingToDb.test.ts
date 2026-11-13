import { describe, expect, it } from 'vitest'
import { mapSimpleTaggingRallyToDb } from './mapSimpleTaggingToDb'

describe('mapSimpleTaggingRallyToDb', () => {
  it('strips optional tags on non-end shots; keeps End wing/stroke/pivot', () => {
    const { rally, shots } = mapSimpleTaggingRallyToDb({
      timeline: {
        shotCount: 3,
        fos: 2,
        end: 3,
        ending: 'winner',
        missReason: null,
        shots: {
          1: {
            wing: 'FH',
            stroke: 'Loop',
            standing: 'ahead',
            isHigh: true,
            isSafe: true,
            isPivot: true,
            reviewKind: null,
            contactTime: 1,
          },
          2: {
            wing: 'BH',
            stroke: 'Drive',
            standing: null,
            isHigh: false,
            isSafe: true,
            isPivot: false,
            reviewKind: 'technical',
            contactTime: 2,
          },
          3: {
            wing: 'FH',
            stroke: 'Block',
            standing: null,
            isHigh: false,
            isSafe: false,
            isPivot: true,
            reviewKind: null,
            contactTime: 3,
          },
        },
      },
      setId: 'set-1',
      rallyIndex: 1,
      videoId: null,
      serverId: 'p1',
      player1Id: 'p1',
      player2Id: 'p2',
      player1ScoreBefore: 0,
      player2ScoreBefore: 0,
      isHighlight: true,
    })

    expect(rally.first_attack_index).toBe(2)
    expect(rally.point_ending).toBe('winner')
    expect(rally.is_highlight).toBe(true)
    expect(rally.framework_confirmed).toBe(true)

    expect(shots[0].shot_wing).toBeNull()
    expect(shots[0].shot_stroke).toBeNull()
    expect(shots[1].shot_wing).toBeNull()
    expect(shots[1].shot_stroke).toBeNull()
    expect(shots[1].shot_review_kind).toBe('technical')

    expect(shots[2].shot_wing).toBe('FH')
    expect(shots[2].shot_stroke).toBe('block')
    expect(shots[2].shot_is_pivot).toBe(true)
    expect(shots[2].shot_initiative).toBeNull()
    expect(shots[2].shot_is_high).toBe(false)
    expect(shots[2].shot_is_safe).toBe(false)
  })

  it('strips End tags when End is serve-only (end = 1)', () => {
    const { shots } = mapSimpleTaggingRallyToDb({
      timeline: {
        shotCount: 1,
        fos: null,
        end: 1,
        ending: 'winner',
        missReason: null,
        shots: {
          1: {
            wing: 'FH',
            stroke: 'Push',
            standing: null,
            isHigh: false,
            isSafe: false,
            isPivot: false,
            reviewKind: null,
            contactTime: 1,
          },
        },
      },
      setId: 'set-1',
      rallyIndex: 1,
      videoId: null,
      serverId: 'p1',
      player1Id: 'p1',
      player2Id: 'p2',
      player1ScoreBefore: 0,
      player2ScoreBefore: 0,
      isHighlight: false,
    })
    expect(shots[0].shot_wing).toBeNull()
    expect(shots[0].shot_stroke).toBeNull()
  })
})
