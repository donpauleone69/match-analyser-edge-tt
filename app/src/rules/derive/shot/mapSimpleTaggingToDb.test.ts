import { describe, expect, it } from 'vitest'
import { mapSimpleTaggingRallyToDb } from './mapSimpleTaggingToDb'

describe('mapSimpleTaggingRallyToDb', () => {
  it('strips optional Pass 1 tags while keeping review + contacts', () => {
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
            isPivot: false,
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

    for (const shot of shots) {
      expect(shot.shot_wing).toBeNull()
      expect(shot.shot_stroke).toBeNull()
      expect(shot.shot_initiative).toBeNull()
      expect(shot.shot_is_high).toBe(false)
      expect(shot.shot_is_safe).toBe(false)
      expect(shot.shot_is_pivot).toBe(false)
    }
    expect(shots[1].shot_review_kind).toBe('technical')
  })
})
