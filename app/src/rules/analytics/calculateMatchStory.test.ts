import { describe, it, expect } from 'vitest'
import type { DBMatch, DBSet, DBRally, DBShot } from '@/data'
import type { PointEnding } from '@/data'
import { calculateMatchStory } from './calculateMatchStory'

const HERO = 'hero-1'
const VILLAIN = 'villain-1'

const match = {
  id: 'm1',
  player1_id: HERO,
  player2_id: VILLAIN,
  winner_id: HERO,
  player1_sets_final: 3,
  player2_sets_final: 1,
} as unknown as DBMatch

function set(setNumber: number, p1: number, p2: number): DBSet {
  return {
    id: `m1-s${setNumber}`,
    match_id: 'm1',
    set_number: setNumber,
    player1_score_final: p1,
    player2_score_final: p2,
  } as unknown as DBSet
}

function rally(
  id: string,
  opts: {
    server: string | null
    winner: string | null
    ending: PointEnding
    scoring?: boolean
  }
): DBRally {
  return {
    id,
    set_id: 'm1-s1',
    server_id: opts.server,
    receiver_id: null,
    is_scoring: opts.scoring ?? true,
    winner_id: opts.winner,
    point_ending: opts.ending,
  } as unknown as DBRally
}

function shot(rallyId: string, index: number, playerId: string | null): DBShot {
  return {
    id: `${rallyId}-sh${index}`,
    rally_id: rallyId,
    shot_index: index,
    player_id: playerId,
  } as unknown as DBShot
}

describe('calculateMatchStory', () => {
  const rallies: DBRally[] = [
    // hero serves, hero winner on shot 3
    rally('r1', { server: HERO, winner: HERO, ending: 'winner' }),
    // hero serves, villain nets on shot 2 -> hero wins on villain error
    rally('r2', { server: HERO, winner: HERO, ending: 'error_net' }),
    // villain serves, hero goes wide on shot 2 -> villain wins on hero error
    rally('r3', { server: null, winner: null, ending: 'error_wide' }),
    // villain serves, villain winner (winner_id null = villain)
    rally('r4', { server: null, winner: null, ending: 'winner' }),
    // hero serves, hero long on serve -> villain wins
    rally('r5', { server: HERO, winner: null, ending: 'error_long' }),
    // lucky: hero wins, neither error nor winner
    rally('r6', { server: VILLAIN, winner: HERO, ending: 'lucky' }),
    // not scoring: ignored
    rally('r7', { server: HERO, winner: HERO, ending: 'winner', scoring: false }),
  ]

  const shots: DBShot[] = [
    shot('r1', 1, HERO),
    shot('r1', 2, null),
    shot('r1', 3, HERO),
    shot('r2', 1, HERO),
    shot('r2', 2, null),
    shot('r3', 1, null),
    shot('r3', 2, HERO),
    shot('r4', 1, null),
    shot('r4', 2, HERO),
    shot('r4', 3, null),
    shot('r5', 1, HERO),
    shot('r6', 1, VILLAIN),
    shot('r6', 2, HERO),
    shot('r7', 1, HERO),
  ]

  const result = calculateMatchStory({
    match,
    sets: [set(2, 9, 11), set(1, 11, 7), set(3, 0, 0)],
    rallies,
    shots,
    heroId: HERO,
    villainId: VILLAIN,
  })

  it('counts only scoring rallies', () => {
    expect(result.totalPoints).toBe(6)
    expect(result.hasPointData).toBe(true)
  })

  it('counts points won, treating null winner_id as villain', () => {
    expect(result.pointsWon.hero.count).toBe(3) // r1, r2, r6
    expect(result.pointsWon.villain.count).toBe(3) // r3, r4, r5
    expect(result.pointsWon.hero.share).toBeCloseTo(0.5)
  })

  it('counts points won on serve against points served', () => {
    // hero served r1, r2, r5 -> won r1, r2
    expect(result.pointsWonOnServe.hero.count).toBe(2)
    expect(result.pointsWonOnServe.hero.denominator).toBe(3)
    expect(result.pointsWonOnServe.hero.share).toBeCloseTo(2 / 3)
    // villain served r3, r4, r6 (null + id) -> won r3, r4
    expect(result.pointsWonOnServe.villain.count).toBe(2)
    expect(result.pointsWonOnServe.villain.denominator).toBe(3)
  })

  it('counts errors by last hitter (net, long, wide) and not lucky', () => {
    // hero missed: r3 (wide), r5 (long)
    expect(result.errors.hero.count).toBe(2)
    // villain missed: r2 (net)
    expect(result.errors.villain.count).toBe(1)
    expect(result.errors.hero.share).toBeCloseTo(2 / 6)
  })

  it('counts winners by last hitter and not lucky', () => {
    expect(result.winners.hero.count).toBe(1) // r1
    expect(result.winners.villain.count).toBe(1) // r4
    expect(result.winners.hero.share).toBeCloseTo(1 / 6)
  })

  it('counts points from opponent error as share of own points won', () => {
    // hero won 3, 1 of them from villain error (r2)
    expect(result.pointsFromOpponentError.hero.count).toBe(1)
    expect(result.pointsFromOpponentError.hero.share).toBeCloseTo(1 / 3)
    // villain won 3, 2 of them from hero errors (r3, r5)
    expect(result.pointsFromOpponentError.villain.count).toBe(2)
    expect(result.pointsFromOpponentError.villain.share).toBeCloseTo(2 / 3)
  })

  it('reports match and set scores hero-oriented, skipping unscored sets', () => {
    expect(result.matchScore).toEqual({ hero: 3, villain: 1 })
    expect(result.matchWinner).toBe('hero')
    expect(result.setScores).toEqual([
      { setNumber: 1, hero: 11, villain: 7 },
      { setNumber: 2, hero: 9, villain: 11 },
    ])
  })

  it('flips scores when the hero is player 2', () => {
    const flipped = calculateMatchStory({
      match,
      sets: [set(1, 11, 7)],
      rallies: [],
      shots: [],
      heroId: VILLAIN,
      villainId: HERO,
    })
    expect(flipped.matchScore).toEqual({ hero: 1, villain: 3 })
    expect(flipped.matchWinner).toBe('villain')
    expect(flipped.setScores).toEqual([{ setNumber: 1, hero: 7, villain: 11 }])
  })

  it('falls back to ending + winner when a rally has no shots', () => {
    const noShots = calculateMatchStory({
      match,
      sets: [],
      rallies: [
        rally('a', { server: HERO, winner: null, ending: 'error_net' }), // hero missed
        rally('b', { server: HERO, winner: HERO, ending: 'winner' }), // hero winner
      ],
      shots: [],
      heroId: HERO,
      villainId: VILLAIN,
    })
    expect(noShots.errors.hero.count).toBe(1)
    expect(noShots.winners.hero.count).toBe(1)
  })

  it('returns zeros and no point data without scoring rallies', () => {
    const empty = calculateMatchStory({
      match: { ...match, winner_id: null, player1_sets_final: 0, player2_sets_final: 0 },
      sets: [],
      rallies: [],
      shots: [],
      heroId: HERO,
      villainId: null,
    })
    expect(empty.hasPointData).toBe(false)
    expect(empty.matchScore).toBeNull()
    expect(empty.pointsWon.hero.share).toBe(0)
    expect(empty.pointsWonOnServe.villain.denominator).toBe(0)
  })
})
