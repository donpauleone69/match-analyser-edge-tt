import { describe, expect, it } from 'vitest'
import {
  deriveMatchSetsBeforeSet,
  type SetSummaryForMatchSets,
} from './deriveMatchSetsBeforeSet'

const makeSet = (
  overrides: Partial<SetSummaryForMatchSets> & { set_number: number }
): SetSummaryForMatchSets => ({
  winner_id: null,
  is_tagged: false,
  tagging_phase: 'not_started',
  player1_score_final: 0,
  player2_score_final: 0,
  player1_sets_before: 0,
  player2_sets_before: 0,
  ...overrides,
})

describe('deriveMatchSetsBeforeSet', () => {
  it('returns 0-0 for set 1', () => {
    const sets = [makeSet({ set_number: 1 })]
    expect(deriveMatchSetsBeforeSet(sets, 1, 'hero-1')).toEqual({
      player1: 0,
      player2: 0,
    })
  })

  it('counts prior set winners including unnamed Villain (winner_id null)', () => {
    const sets = [
      makeSet({
        set_number: 1,
        winner_id: 'hero-1',
        is_tagged: true,
        tagging_phase: 'phase2_complete',
        player1_score_final: 11,
        player2_score_final: 7,
      }),
      makeSet({
        set_number: 2,
        winner_id: null,
        is_tagged: true,
        tagging_phase: 'phase2_complete',
        player1_score_final: 8,
        player2_score_final: 11,
      }),
      makeSet({ set_number: 3 }),
    ]
    expect(deriveMatchSetsBeforeSet(sets, 3, 'hero-1')).toEqual({
      player1: 1,
      player2: 1,
    })
  })

  it('ignores undecided prior sets and falls back to sets_before when needed', () => {
    const sets = [
      makeSet({ set_number: 1 }),
      makeSet({
        set_number: 2,
        player1_sets_before: 1,
        player2_sets_before: 0,
      }),
    ]
    expect(deriveMatchSetsBeforeSet(sets, 2, 'hero-1')).toEqual({
      player1: 1,
      player2: 0,
    })
  })
})
