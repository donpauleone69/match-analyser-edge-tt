import { describe, it, expect } from 'vitest'
import { calculateReviewShots } from './calculateReviewShots'
import type { DBRally, DBShot } from '@/data'

function rally(partial: Partial<DBRally> & Pick<DBRally, 'id' | 'set_id' | 'rally_index'>): DBRally {
  return {
    video_id: null,
    has_video_data: true,
    timestamp_start: 0,
    timestamp_end: 1,
    end_of_point_time: 1,
    server_id: 'p1',
    receiver_id: 'p2',
    is_scoring: true,
    winner_id: 'p1',
    player1_score_before: 0,
    player2_score_before: 0,
    player1_score_after: 1,
    player2_score_after: 0,
    first_attack_index: null,
    point_ending: 'winner',
    point_miss_reason: null,
    is_highlight: false,
    framework_confirmed: true,
    detail_complete: true,
    server_corrected: false,
    score_corrected: false,
    correction_notes: null,
    is_stub_rally: false,
    ...partial,
  }
}

function shot(
  partial: Partial<DBShot> &
    Pick<DBShot, 'id' | 'rally_id' | 'shot_index' | 'shot_review_kind'>
): DBShot {
  return {
    video_id: null,
    player_id: 'p1',
    timestamp_start: 1,
    shot_spin: null,
    shot_wing: null,
    shot_stroke: null,
    shot_placement: null,
    shot_depth: null,
    shot_contact: null,
    shot_initiative: null,
    shot_quality: null,
    shot_is_weak: false,
    shot_is_high: false,
    shot_is_heavy: false,
    shot_is_safe: false,
    shot_is_pivot: false,
    ...partial,
  }
}

describe('calculateReviewShots', () => {
  it('returns only flagged shots in rally order', () => {
    const rallies = [
      rally({ id: 's1-r1', set_id: 's1', rally_index: 1 }),
      rally({ id: 's1-r2', set_id: 's1', rally_index: 2 }),
    ]
    const shots = [
      shot({ id: 'a', rally_id: 's1-r2', shot_index: 2, shot_review_kind: 'tactical' }),
      shot({ id: 'b', rally_id: 's1-r1', shot_index: 3, shot_review_kind: null }),
      shot({
        id: 'c',
        rally_id: 's1-r1',
        shot_index: 1,
        shot_review_kind: 'technical',
        shot_wing: 'FH',
        shot_stroke: 'loop',
      }),
    ]

    const lines = calculateReviewShots({ rallies, shots })
    expect(lines.map((l) => l.shotId)).toEqual(['c', 'a'])
    expect(lines[0]).toMatchObject({
      rallyIndex: 1,
      shotIndex: 1,
      reviewKind: 'technical',
      wing: 'FH',
      stroke: 'loop',
    })
    expect(lines[1].reviewKind).toBe('tactical')
  })
})
