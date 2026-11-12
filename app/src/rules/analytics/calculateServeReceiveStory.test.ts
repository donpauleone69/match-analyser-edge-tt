import { describe, it, expect } from 'vitest'
import type { DBRally, DBShot, PointEnding } from '@/data'
import {
  calculateServeReceiveStory,
  deriveServeOutcome,
  sumOutcomes,
  SERVE_NEUTRAL,
  SERVE_PUNISHED,
  SERVE_WORKED,
} from './calculateServeReceiveStory'

const HERO = 'hero'

function rally(id: string, server: string | null, winner: string | null, ending: PointEnding, fos: number | null): DBRally {
  return {
    id,
    server_id: server,
    winner_id: winner,
    is_scoring: true,
    point_ending: ending,
    first_attack_index: fos,
  } as unknown as DBRally
}

function shotsFor(rallyId: string, n: number, server: string | null): DBShot[] {
  const receiver = server === HERO ? null : HERO
  return Array.from({ length: n }, (_, i) => ({
    id: `${rallyId}-sh${i + 1}`,
    rally_id: rallyId,
    shot_index: i + 1,
    player_id: i % 2 === 0 ? server : receiver,
  })) as unknown as DBShot[]
}

describe('deriveServeOutcome', () => {
  it('classifies serve-only points', () => {
    expect(deriveServeOutcome(1, null, 'error_net', true)).toBe('fault')
    expect(deriveServeOutcome(1, null, 'winner', true)).toBe('ace')
    expect(deriveServeOutcome(1, null, 'lucky', true)).toBe('lucky')
  })

  it('splits return misses by whether the return was an attack', () => {
    expect(deriveServeOutcome(2, null, 'error_long', true)).toBe('passive_return_missed')
    expect(deriveServeOutcome(2, 2, 'error_net', false)).toBe('return_attack_missed')
    expect(deriveServeOutcome(2, 2, 'winner', false)).toBe('return_attack_winner')
    expect(deriveServeOutcome(5, 2, 'winner', false)).toBe('return_attack_rally_on')
  })

  it('reads later first attacks from who made them', () => {
    expect(deriveServeOutcome(4, 3, 'winner', true)).toBe('server_attacked_first')
    expect(deriveServeOutcome(6, 4, 'error_net', false)).toBe('receiver_attacked_later')
    expect(deriveServeOutcome(5, null, 'error_net', true)).toBe('no_attack')
    expect(deriveServeOutcome(2, null, 'lucky', true)).toBe('lucky')
  })
})

describe('calculateServeReceiveStory', () => {
  const rallies = [
    rally('r1', HERO, null, 'error_net', null), // hero faults
    rally('r2', HERO, HERO, 'error_long', null), // villain misses passive return
    rally('r3', HERO, HERO, 'winner', 3), // hero third-ball attack wins
    rally('r4', null, HERO, 'error_net', 2), // hero attacks return, wins later (rally on)
    rally('r5', null, null, 'winner', null), // villain serve, no attack, villain wins
  ]
  const shots = [
    ...shotsFor('r1', 1, HERO),
    ...shotsFor('r2', 2, HERO),
    ...shotsFor('r3', 3, HERO),
    ...shotsFor('r4', 5, null),
    ...shotsFor('r5', 4, null),
  ]
  const story = calculateServeReceiveStory({ rallies, shots, heroId: HERO })

  it('groups serve points by server and sums to 100%', () => {
    const hero = story.serve.hero
    expect(story.servePoints.hero).toHaveLength(3)
    expect(hero.fault.points.count).toBe(1)
    expect(hero.fault.misses.net).toBe(1)
    expect(hero.passive_return_missed.points.count).toBe(1)
    expect(hero.server_attacked_first.won.count).toBe(1)
    const total = [SERVE_WORKED, SERVE_PUNISHED, SERVE_NEUTRAL]
      .map((g) => sumOutcomes(hero, g, story.servePoints.hero).points.count)
      .reduce((a, b) => a + b, 0)
    expect(total).toBe(3)
  })

  it('mirrors the same points from the receiver side, won = receiver won', () => {
    const heroRecv = story.receive.hero
    expect(story.receivePoints.hero).toEqual(['r4', 'r5'])
    expect(heroRecv.return_attack_rally_on.points.count).toBe(1)
    expect(heroRecv.return_attack_rally_on.won.count).toBe(1)
    expect(heroRecv.no_attack.won.count).toBe(0)
    expect(story.receive.villain.fault.points.count).toBe(1)
  })

  it('skips points with no tapped contacts', () => {
    const empty = calculateServeReceiveStory({ rallies: [rally('x', HERO, HERO, 'winner', null)], shots: [], heroId: HERO })
    expect(empty.hasPointData).toBe(false)
  })
})
