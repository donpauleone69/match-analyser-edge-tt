import { describe, it, expect } from 'vitest'
import { deriveRally_winner_id } from './deriveRally_winner_id'

describe('deriveRally_winner_id', () => {
  const p1 = 'player-a'
  const p2 = 'player-b'

  it('gives winner endings to the last-shot player', () => {
    expect(
      deriveRally_winner_id({ player_id: p1, point_ending: 'winner' }, p2)
    ).toBe(p1)
  })

  it('gives lucky endings to the last-shot player', () => {
    expect(
      deriveRally_winner_id({ player_id: p2, point_ending: 'lucky' }, p1)
    ).toBe(p2)
  })

  it('gives error endings to the opponent', () => {
    expect(
      deriveRally_winner_id({ player_id: p1, point_ending: 'error_net' }, p2)
    ).toBe(p2)
    expect(
      deriveRally_winner_id({ player_id: p2, point_ending: 'error_long' }, p1)
    ).toBe(p1)
  })
})
