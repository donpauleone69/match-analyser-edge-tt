import { describe, it, expect } from 'vitest'
import {
  attachRallyIdToPass1Shots,
  mapPass1FocusRallyToDb,
} from './mapPass1FocusToDb'
import type { Pass1FocusShotTags } from './mapPass1FocusToDb'

function tags(
  partial: Partial<Pass1FocusShotTags> & { contactTime: number }
): Pass1FocusShotTags {
  return {
    wing: null,
    stroke: null,
    standing: null,
    isHigh: false,
    isSafe: false,
    isPivot: false,
    reviewKind: null,
    ...partial,
  }
}

describe('mapPass1FocusRallyToDb', () => {
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

  it('keeps only allow-listed tags across a full rally', () => {
    const { rally, shots } = mapPass1FocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 6,
        fos: 4,
        end: 6,
        ending: 'winner',
        missReason: null,
        shots: {
          // serve: nothing allowed even if tagged
          1: tags({ wing: 'FH', stroke: 'Push', isHigh: true, isSafe: true, standing: 'level', contactTime: 1 }),
          // shot 2: nothing allowed
          2: tags({ wing: 'BH', stroke: 'Push', isHigh: true, contactTime: 2 }),
          // ball before attack: High only
          3: tags({ wing: 'BH', stroke: 'Push', isHigh: true, isSafe: true, contactTime: 3 }),
          // first attack: wing, stroke, safe — no high
          4: tags({ wing: 'FH', stroke: 'Loop', isHigh: true, isSafe: true, standing: 'ahead', contactTime: 4 }),
          // reply: wing, stroke, initiative
          5: tags({ wing: 'BH', stroke: 'Block', standing: 'behind', isHigh: true, isSafe: true, contactTime: 5 }),
          // end: wing, stroke only
          6: tags({ wing: 'FH', stroke: 'Smash', standing: 'ahead', isHigh: true, isSafe: true, contactTime: 6 }),
        },
      },
    })

    expect(rally.first_attack_index).toBe(4)
    expect(rally.point_ending).toBe('winner')
    expect(rally.winner_id).toBe('p2') // shot 6 → receiver (even)
    expect(rally.player2_score_after).toBe(1)
    expect(rally.point_miss_reason).toBeNull()

    expect(shots).toHaveLength(6)

    // serve
    expect(shots[0].shot_wing).toBeNull()
    expect(shots[0].shot_stroke).toBeNull()
    expect(shots[0].shot_initiative).toBeNull()
    expect(shots[0].shot_is_high).toBe(false)
    expect(shots[0].shot_is_safe).toBe(false)

    // shot 2
    expect(shots[1].shot_wing).toBeNull()
    expect(shots[1].shot_is_high).toBe(false)

    // ball before attack
    expect(shots[2].shot_is_high).toBe(true)
    expect(shots[2].shot_is_safe).toBe(false)
    expect(shots[2].shot_wing).toBeNull()
    expect(shots[2].shot_stroke).toBeNull()

    // first attack
    expect(shots[3].shot_wing).toBe('FH')
    expect(shots[3].shot_stroke).toBe('loop')
    expect(shots[3].shot_is_safe).toBe(true)
    expect(shots[3].shot_is_high).toBe(false)
    expect(shots[3].shot_initiative).toBeNull()
    expect(shots[3].shot_is_pivot).toBe(false)
    // previous placement from FOS wing FH + pivot off → FH on shot 3
    expect(shots[2].shot_placement).toBe('FH')

    // reply
    expect(shots[4].shot_wing).toBe('BH')
    expect(shots[4].shot_stroke).toBe('block')
    expect(shots[4].shot_initiative).toBe('behind')
    expect(shots[4].shot_is_high).toBe(false)
    expect(shots[4].shot_is_safe).toBe(false)
    expect(shots[3].shot_placement).toBe('BH')

    // end
    expect(shots[5].shot_wing).toBe('FH')
    expect(shots[5].shot_stroke).toBe('smash')
    expect(shots[4].shot_placement).toBe('FH')
    expect(shots[5].shot_initiative).toBeNull()
    expect(shots[5].shot_is_high).toBe(false)
    expect(shots[5].shot_is_safe).toBe(false)
  })

  it('ignores UI spin/placement/depth/contact/quality/weak/heavy; infers prior placement from wing', () => {
    const { shots } = mapPass1FocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 3,
        fos: 3,
        end: 3,
        ending: 'winner',
        missReason: null,
        shots: {
          1: tags({
            spin: 'Under',
            depth: 'Short',
            placement: 'BH',
            isWeak: true,
            isHeavy: true,
            contactTime: 1,
          }),
          2: tags({
            isHigh: true,
            depth: 'Long',
            placement: 'middle',
            contactTime: 2,
          }),
          3: tags({
            wing: 'FH',
            stroke: 'Loop',
            quality: 'Good',
            tableContact: 'Over',
            isWeak: true,
            isHeavy: true,
            isSafe: true,
            contactTime: 3,
          }),
        },
      },
    })

    for (const s of shots) {
      expect(s.shot_spin).toBeNull()
      expect(s.shot_depth).toBeNull()
      expect(s.shot_contact).toBeNull()
      expect(s.shot_quality).toBeNull()
      expect(s.shot_is_weak).toBe(false)
      expect(s.shot_is_heavy).toBe(false)
    }
    // UI placement on shot 2 is ignored; FOS wing FH + pivot off → prior FH
    expect(shots[0].shot_placement).toBeNull()
    expect(shots[1].shot_placement).toBe('FH')
    expect(shots[2].shot_placement).toBeNull()
    expect(shots[1].shot_is_high).toBe(true)
    expect(shots[2].shot_is_safe).toBe(true)
  })

  it('keeps initiative when the reply is also the end shot', () => {
    const { shots } = mapPass1FocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 3,
        fos: 2,
        end: 3,
        ending: 'error_net',
        missReason: null,
        shots: {
          1: tags({ isHigh: true, contactTime: 1 }),
          2: tags({ wing: 'FH', stroke: 'Flick', isSafe: true, contactTime: 2 }),
          3: tags({ wing: 'BH', stroke: 'Push', standing: 'level', contactTime: 3 }),
        },
      },
    })

    expect(shots[0].shot_is_high).toBe(true) // serve is ball-before when FOS=2
    expect(shots[1].shot_is_safe).toBe(true)
    expect(shots[2].shot_initiative).toBe('level')
    expect(shots[2].shot_wing).toBe('BH')
    expect(shots[2].shot_stroke).toBe('push')
  })

  it('keeps initiative on a reply that is before the end', () => {
    const { shots } = mapPass1FocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 4,
        fos: 2,
        end: 4,
        ending: 'lucky',
        missReason: null,
        shots: {
          1: tags({ contactTime: 1 }),
          2: tags({ wing: 'FH', stroke: 'Flick', contactTime: 2 }),
          3: tags({ wing: 'BH', stroke: 'Chop', standing: 'Level', contactTime: 3 }),
          4: tags({ wing: 'FH', stroke: 'Drive', standing: 'ahead', contactTime: 4 }),
        },
      },
    })

    expect(shots[2].shot_initiative).toBe('level')
    expect(shots[2].shot_stroke).toBe('chop')
    expect(shots[3].shot_initiative).toBeNull()
  })

  it('keeps wing + stroke on a before-attack end shot (push rally)', () => {
    const { rally, shots } = mapPass1FocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 4,
        fos: null,
        end: 4,
        ending: 'error_net',
        missReason: 'technical',
        shots: {
          1: tags({ contactTime: 1 }),
          2: tags({ wing: 'FH', stroke: 'Push', isHigh: true, contactTime: 2 }),
          3: tags({ wing: 'BH', stroke: 'Push', contactTime: 3 }),
          4: tags({ wing: 'FH', stroke: 'Push', contactTime: 4 }),
        },
      },
    })

    expect(rally.first_attack_index).toBeNull()
    expect(shots[1].shot_wing).toBeNull()
    expect(shots[1].shot_is_high).toBe(false) // no FOS → no High
    expect(shots[2].shot_wing).toBeNull()
    expect(shots[3].shot_wing).toBe('FH')
    expect(shots[3].shot_stroke).toBe('push')
  })

  it('does not store wing/stroke when the serve is the end shot', () => {
    const { rally, shots } = mapPass1FocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 1,
        fos: null,
        end: 1,
        ending: 'error_long',
        missReason: null,
        shots: { 1: tags({ wing: 'FH', stroke: 'Push', contactTime: 1 }) },
      },
    })

    expect(shots).toHaveLength(1)
    expect(shots[0].shot_wing).toBeNull()
    expect(shots[0].shot_stroke).toBeNull()
    expect(rally.winner_id).toBe('p2') // serve fault → receiver wins
  })

  it('nulls first_attack_index when FOS is past the end', () => {
    const { rally, shots } = mapPass1FocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 2,
        fos: 4,
        end: 2,
        ending: 'error_long',
        missReason: null,
        shots: {
          1: tags({ isHigh: true, contactTime: 10 }),
          2: tags({ wing: 'FH', stroke: 'Drive', isSafe: true, contactTime: 11 }),
        },
      },
    })

    expect(rally.first_attack_index).toBeNull()
    expect(rally.point_ending).toBe('error_long')
    expect(rally.winner_id).toBe('p1')
    // Treated as no attack → shot 2 is an end shot only
    expect(shots[0].shot_is_high).toBe(false)
    expect(shots[1].shot_is_safe).toBe(false)
    expect(shots[1].shot_wing).toBe('FH')
  })

  it('only saves shots 1..end', () => {
    const { shots } = mapPass1FocusRallyToDb({
      ...base,
      timeline: {
        shotCount: 5,
        fos: null,
        end: 2,
        ending: 'lucky',
        missReason: null,
        shots: {
          1: tags({ contactTime: 1 }),
          2: tags({ wing: 'BH', stroke: 'Push', contactTime: 2 }),
          3: tags({ wing: 'FH', stroke: 'Drive', contactTime: 3 }),
        },
      },
    })

    expect(shots.map((s) => s.shot_index)).toEqual([1, 2])
    expect(shots[1].shot_wing).toBe('BH')
  })

  describe('point_miss_reason', () => {
    function run(
      ending: 'winner' | 'lucky' | 'error_net' | 'error_long' | 'error_wide',
      missReason: 'technical' | 'timing' | 'misread' | 'forced' | null
    ) {
      return mapPass1FocusRallyToDb({
        ...base,
        timeline: {
          shotCount: 2,
          fos: null,
          end: 2,
          ending,
          missReason,
          shots: {
            1: tags({ contactTime: 1 }),
            2: tags({ contactTime: 2 }),
          },
        },
      }).rally
    }

    it('stores the reason for each error ending', () => {
      expect(run('error_net', 'technical').point_miss_reason).toBe('technical')
      expect(run('error_long', 'timing').point_miss_reason).toBe('timing')
      expect(run('error_wide', 'timing').point_miss_reason).toBe('timing')
      expect(run('error_net', 'misread').point_miss_reason).toBe('misread')
      expect(run('error_long', 'forced').point_miss_reason).toBe('forced')
    })

    it('nulls the reason for winner / lucky', () => {
      expect(run('winner', 'technical').point_miss_reason).toBeNull()
      expect(run('lucky', 'timing').point_miss_reason).toBeNull()
    })

    it('stays null when no reason chosen on an error', () => {
      expect(run('error_wide', null).point_miss_reason).toBeNull()
    })
  })

  describe('shot_review_kind', () => {
    it('stores technical review and keeps wing/stroke even off allow-list', () => {
      const { shots } = mapPass1FocusRallyToDb({
        ...base,
        timeline: {
          shotCount: 3,
          fos: 3,
          end: 3,
          ending: 'winner',
          missReason: null,
          shots: {
            1: tags({ contactTime: 1 }),
            // before attack — wing not allowed unless technical review
            2: tags({
              wing: 'BH',
              stroke: 'Push',
              reviewKind: 'technical',
              contactTime: 2,
            }),
            3: tags({ wing: 'FH', stroke: 'Loop', isSafe: true, contactTime: 3 }),
          },
        },
      })
      expect(shots[1].shot_review_kind).toBe('technical')
      expect(shots[1].shot_wing).toBe('BH')
      expect(shots[1].shot_stroke).toBe('push')
      expect(shots[0].shot_placement).toBe('BH')
    })

    it('stores tactical without forcing wing', () => {
      const { shots } = mapPass1FocusRallyToDb({
        ...base,
        timeline: {
          shotCount: 2,
          fos: null,
          end: 2,
          ending: 'lucky',
          missReason: null,
          shots: {
            1: tags({ reviewKind: 'tactical', wing: 'FH', contactTime: 1 }),
            2: tags({ contactTime: 2 }),
          },
        },
      })
      expect(shots[0].shot_review_kind).toBe('tactical')
      expect(shots[0].shot_wing).toBeNull()
    })
  })

  describe('pivot + previous placement', () => {
    it('stores pivot and writes opposite placement on the previous shot', () => {
      const { shots } = mapPass1FocusRallyToDb({
        ...base,
        timeline: {
          shotCount: 3,
          fos: 2,
          end: 3,
          ending: 'winner',
          missReason: null,
          shots: {
            1: tags({ contactTime: 1 }),
            2: tags({ wing: 'FH', stroke: 'Loop', isPivot: true, isSafe: true, contactTime: 2 }),
            3: tags({ wing: 'BH', stroke: 'Block', isPivot: false, standing: 'level', contactTime: 3 }),
          },
        },
      })

      expect(shots[1].shot_wing).toBe('FH')
      expect(shots[1].shot_is_pivot).toBe(true)
      expect(shots[0].shot_placement).toBe('BH')

      expect(shots[2].shot_wing).toBe('BH')
      expect(shots[2].shot_is_pivot).toBe(false)
      expect(shots[1].shot_placement).toBe('BH')
    })

    it('does not invent placement when wing is missing', () => {
      const { shots } = mapPass1FocusRallyToDb({
        ...base,
        timeline: {
          shotCount: 2,
          fos: null,
          end: 2,
          ending: 'lucky',
          missReason: null,
          shots: {
            1: tags({ contactTime: 1 }),
            2: tags({ contactTime: 2 }),
          },
        },
      })
      expect(shots[0].shot_placement).toBeNull()
      expect(shots[1].shot_is_pivot).toBe(false)
    })
  })

  describe('error_wide', () => {
    it('hands the point to the opponent of the last hitter', () => {
      const { rally } = mapPass1FocusRallyToDb({
        ...base,
        timeline: {
          shotCount: 3,
          fos: null,
          end: 3,
          ending: 'error_wide',
          missReason: null,
          shots: {
            1: tags({ contactTime: 1 }),
            2: tags({ contactTime: 2 }),
            3: tags({ wing: 'FH', stroke: 'Loop', contactTime: 3 }),
          },
        },
      })
      expect(rally.point_ending).toBe('error_wide')
      expect(rally.winner_id).toBe('p2') // p1 hit shot 3 and missed
      expect(rally.player2_score_after).toBe(1)
    })
  })

  it('throws without end or ending', () => {
    expect(() =>
      mapPass1FocusRallyToDb({
        ...base,
        timeline: {
          shotCount: 2,
          fos: null,
          end: null,
          ending: null,
          missReason: null,
          shots: {},
        },
      })
    ).toThrow()
  })

  it('throws when a saved shot has no contactTime', () => {
    expect(() =>
      mapPass1FocusRallyToDb({
        ...base,
        timeline: {
          shotCount: 2,
          fos: null,
          end: 2,
          ending: 'winner',
          missReason: null,
          shots: {
            1: tags({ contactTime: 1 }),
            2: { ...tags({ contactTime: 2 }), contactTime: null },
          },
        },
      })
    ).toThrow()
  })
})

describe('attachRallyIdToPass1Shots', () => {
  it('stamps rally_id on every shot', () => {
    const { shots } = mapPass1FocusRallyToDb({
      setId: 's',
      rallyIndex: 1,
      videoId: null,
      serverId: 'p1',
      player1Id: 'p1',
      player2Id: 'p2',
      player1ScoreBefore: 0,
      player2ScoreBefore: 0,
      timeline: {
        shotCount: 2,
        fos: null,
        end: 2,
        ending: 'winner',
        missReason: null,
        shots: { 1: tags({ contactTime: 1 }), 2: tags({ contactTime: 2 }) },
      },
    })
    const out = attachRallyIdToPass1Shots(shots, 's-r1')
    expect(out.every((s) => s.rally_id === 's-r1')).toBe(true)
  })
})
