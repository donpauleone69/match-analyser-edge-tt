import { describe, it, expect } from 'vitest'
import { mapRallyFocusRallyToDb } from './mapRallyFocusToDb'
import type { RallyFocusShotTags } from './mapRallyFocusToDb'

function tags(partial: Partial<RallyFocusShotTags> & { contactTime: number }): RallyFocusShotTags {
  return {
    spin: null,
    wing: null,
    stroke: null,
    depth: null,
    placement: null,
    standing: null,
    tableContact: null,
    quality: null,
    isWeak: false,
    isHigh: false,
    isHeavy: false,
    ...partial,
  }
}

describe('mapRallyFocusRallyToDb', () => {
  const base = {
    setId: 'match-s1',
    rallyIndex: 1,
    videoId: 'vid-1',
    serverId: 'p1',
    player1Id: 'p1',
    player2Id: 'p2',
    player1ScoreBefore: 0,
    player2ScoreBefore: 0,
  }

  it('maps serve attributes together and strips quality/contact from serve', () => {
    const { rally, shots } = mapRallyFocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 3,
        fos: 3,
        end: 3,
        ending: 'winner',
        shots: {
          1: tags({
            spin: 'Under',
            depth: 'Short',
            placement: 'BH',
            isWeak: true,
            isHigh: true,
            isHeavy: true,
            quality: 'Good',
            tableContact: 'Over',
            wing: 'FH',
            contactTime: 1.0,
          }),
          2: tags({
            wing: 'BH',
            depth: 'Long',
            placement: 'middle',
            isHigh: true,
            standing: 'Behind',
            contactTime: 2.0,
          }),
          3: tags({
            wing: 'FH',
            stroke: 'Loop',
            quality: 'Good',
            tableContact: 'Over',
            isWeak: true,
            isHigh: true,
            isHeavy: true,
            contactTime: 3.0,
          }),
        },
      },
    })

    expect(rally.first_attack_index).toBe(3)
    expect(rally.point_ending).toBe('winner')
    expect(rally.winner_id).toBe('p1')
    expect(rally.player1_score_after).toBe(1)

    expect(shots).toHaveLength(3)

    // Serve: attributes kept; quality/contact/wing stripped
    expect(shots[0].shot_spin).toBe('under')
    expect(shots[0].shot_is_weak).toBe(true)
    expect(shots[0].shot_is_high).toBe(true)
    expect(shots[0].shot_is_heavy).toBe(true)
    expect(shots[0].shot_quality).toBeNull()
    expect(shots[0].shot_contact).toBeNull()
    expect(shots[0].shot_wing).toBeNull()

    // Pre-offensive: wing + attributes; no initiative (not later role)
    expect(shots[1].shot_wing).toBe('BH')
    expect(shots[1].shot_is_high).toBe(true)
    expect(shots[1].shot_initiative).toBeNull()
    expect(shots[1].shot_quality).toBeNull()

    // Attack: quality + contact; attributes forced false
    expect(shots[2].shot_stroke).toBe('loop')
    expect(shots[2].shot_quality).toBe('good')
    expect(shots[2].shot_contact).toBe('over_table')
    expect(shots[2].shot_is_weak).toBe(false)
    expect(shots[2].shot_is_high).toBe(false)
    expect(shots[2].shot_is_heavy).toBe(false)
  })

  it('stores initiative on reply and strips quality/weak', () => {
    const { shots } = mapRallyFocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 4,
        fos: 2,
        end: 4,
        ending: 'lucky',
        shots: {
          1: tags({ spin: 'Side', depth: 'Short', placement: 'middle', contactTime: 1 }),
          2: tags({
            wing: 'FH',
            stroke: 'Flick',
            quality: 'Normal',
            tableContact: 'Off',
            contactTime: 2,
          }),
          3: tags({
            wing: 'BH',
            stroke: 'Block',
            standing: 'Level',
            isWeak: true,
            quality: 'Good',
            contactTime: 3,
          }),
          4: tags({
            wing: 'FH',
            stroke: 'Drive',
            standing: 'Ahead',
            contactTime: 4,
          }),
        },
      },
    })

    expect(shots[2].shot_initiative).toBe('level')
    expect(shots[2].shot_is_weak).toBe(false)
    expect(shots[2].shot_quality).toBeNull()

    // Shot 4 is the end → initiative suppressed
    expect(shots[3].shot_initiative).toBeNull()
    expect(shots[3].shot_stroke).toBe('drive')
  })

  it('nulls first_attack_index when FOS is past the end', () => {
    const { rally, shots } = mapRallyFocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 2,
        fos: 4,
        end: 2,
        ending: 'error_long',
        shots: {
          1: tags({
            spin: 'Top',
            depth: 'Long',
            placement: 'FH',
            contactTime: 10,
          }),
          2: tags({
            wing: 'FH',
            depth: 'Half',
            placement: 'BH',
            isHeavy: true,
            contactTime: 11,
          }),
        },
      },
    })

    expect(rally.first_attack_index).toBeNull()
    expect(rally.point_ending).toBe('error_long')
    expect(rally.winner_id).toBe('p1')
    // Both shots treated as serve / pre-offensive when FOS invalidated
    expect(shots[1].shot_is_heavy).toBe(true)
    expect(shots[1].shot_quality).toBeNull()
  })

  it('only saves shots 1..end', () => {
    const { shots } = mapRallyFocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 5,
        fos: null,
        end: 2,
        ending: 'lucky',
        shots: {
          1: tags({
            spin: 'Side',
            depth: 'Short',
            placement: 'middle',
            contactTime: 1,
          }),
          2: tags({
            wing: 'BH',
            depth: 'Long',
            placement: 'FH',
            standing: 'Level',
            contactTime: 2,
          }),
          3: tags({
            wing: 'FH',
            stroke: 'Drive',
            contactTime: 3,
          }),
        },
      },
    })

    expect(shots.map((s) => s.shot_index)).toEqual([1, 2])
    // No attack → shot 2 is pre-offensive, initiative stripped
    expect(shots[1].shot_initiative).toBeNull()
    expect(shots[1].shot_wing).toBe('BH')
  })
})
