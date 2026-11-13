import { describe, expect, it } from 'vitest'
import type { DBMatch, DBSet } from '@/data'
import { buildHome } from './buildHome'

function match(partial: Partial<DBMatch> & Pick<DBMatch, 'id'>): DBMatch {
  return {
    tournament_id: null,
    round: null,
    player1_id: 'hero',
    player2_id: 'opp',
    first_server_id: 'hero',
    winner_id: null,
    player1_sets_final: 0,
    player2_sets_final: 0,
    best_of: 5,
    match_date: '2026-11-10',
    tagging_mode: 'essential',
    match_detail_level: 'shots',
    has_video: true,
    video_count: 1,
    total_coverage: 'full',
    step1_complete: false,
    step2_complete: false,
    created_at: '2026-11-10T12:00:00.000Z',
    ...partial,
  }
}

function set(partial: Partial<DBSet> & Pick<DBSet, 'id' | 'match_id' | 'set_number'>): DBSet {
  return {
    player1_score_final: 0,
    player2_score_final: 0,
    winner_id: null,
    player1_sets_before: 0,
    player1_sets_after: 0,
    player2_sets_before: 0,
    player2_sets_after: 0,
    set_first_server_id: 'hero',
    has_video: true,
    video_segments: [],
    video_contexts: null,
    end_of_set_timestamp: null,
    is_tagged: false,
    tagging_started_at: null,
    tagging_completed_at: null,
    tagging_phase: 'not_started',
    phase1_last_rally: null,
    phase1_total_rallies: null,
    phase2_last_shot_index: null,
    phase2_total_shots: null,
    setup_starting_score_p1: null,
    setup_starting_score_p2: null,
    setup_first_server_id: null,
    ...partial,
  } as DBSet
}

describe('buildHome outstanding', () => {
  it('surfaces in-progress before not-started and counts outstanding', () => {
    const home = buildHome(
      [
        {
          match: match({ id: 'm-new', match_date: '2026-11-12', created_at: '2026-11-12T10:00:00.000Z' }),
          sets: [set({ id: 'm-new-s1', match_id: 'm-new', set_number: 1 })],
          rallyCounts: new Map(),
        },
        {
          match: match({ id: 'm-open', match_date: '2026-11-01', created_at: '2026-11-01T10:00:00.000Z' }),
          sets: [
            set({
              id: 'm-open-s1',
              match_id: 'm-open',
              set_number: 1,
              tagging_phase: 'phase2_in_progress',
              player1_score_final: 5,
              player2_score_final: 3,
            }),
          ],
          rallyCounts: new Map([['m-open-s1', 4]]),
        },
      ],
      (id) => (id === 'hero' ? 'Paul' : id === 'opp' ? 'Alex' : 'Them')
    )

    expect(home.outstandingCount).toBe(2)
    expect(home.continueItems[0].matchId).toBe('m-open')
    expect(home.continueItems[0].actionLabel).toBe('Continue tagging')
    expect(home.continueItems[1].matchId).toBe('m-new')
    expect(home.continueItems[1].actionLabel).toBe('Start tagging')
  })

  it('omits fully tagged matches from outstanding', () => {
    const home = buildHome(
      [
        {
          match: match({ id: 'm-done', step1_complete: true, step2_complete: true }),
          sets: [
            set({
              id: 'm-done-s1',
              match_id: 'm-done',
              set_number: 1,
              is_tagged: true,
              tagging_phase: 'phase2_complete',
            }),
          ],
          rallyCounts: new Map([['m-done-s1', 8]]),
        },
      ],
      () => 'X'
    )
    expect(home.outstandingCount).toBe(0)
    expect(home.continueItems).toEqual([])
    expect(home.recent[0].status).toBe('tagged')
  })
})
