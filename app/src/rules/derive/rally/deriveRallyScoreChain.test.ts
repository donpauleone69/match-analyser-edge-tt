import { describe, it, expect } from 'vitest'
import { deriveRallyScoreChain, type ScoreChainRally } from './deriveRallyScoreChain'

const P1 = 'p1'

function rally(
  index: number,
  winner: string | null,
  before: [number, number],
  after: [number, number],
  scoring = true
): ScoreChainRally {
  return {
    id: `r${index}`,
    rally_index: index,
    is_scoring: scoring,
    winner_id: winner,
    player1_score_before: before[0],
    player2_score_before: before[1],
    player1_score_after: after[0],
    player2_score_after: after[1],
  }
}

describe('deriveRallyScoreChain', () => {
  it('reports no changes when stored scores already chain', () => {
    const result = deriveRallyScoreChain({
      player1Id: P1,
      rallies: [rally(1, P1, [0, 0], [1, 0]), rally(2, null, [1, 0], [1, 1])],
    })
    expect(result.entries.every((e) => !e.changed)).toBe(true)
    expect(result.final).toEqual({ player1: 1, player2: 1 })
  })

  it('shifts every later rally when an earlier winner flips', () => {
    // r1 was edited: winner is now player 2 (null), stored scores still say p1 won
    const result = deriveRallyScoreChain({
      player1Id: P1,
      rallies: [
        rally(2, P1, [1, 0], [2, 0]),
        rally(1, null, [0, 0], [1, 0]),
        rally(3, null, [2, 0], [2, 1]),
      ],
    })
    expect(result.entries.map((e) => [e.id, e.player1_score_after, e.player2_score_after])).toEqual([
      ['r1', 0, 1],
      ['r2', 1, 1],
      ['r3', 1, 2],
    ])
    expect(result.entries.map((e) => e.changed)).toEqual([true, true, true])
    expect(result.final).toEqual({ player1: 1, player2: 2 })
  })

  it('starts from a given score and skips non-scoring rallies', () => {
    const result = deriveRallyScoreChain({
      player1Id: P1,
      start: { player1: 3, player2: 4 },
      rallies: [rally(1, P1, [3, 4], [3, 4], false), rally(2, P1, [3, 4], [4, 4])],
    })
    expect(result.final).toEqual({ player1: 4, player2: 4 })
    expect(result.entries.map((e) => e.changed)).toEqual([false, false])
  })
})
