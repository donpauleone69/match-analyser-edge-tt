import { describe, it, expect } from 'vitest'
import type { DBRally, DBShot, PointEnding, PointMissReason } from '@/data'
import {
  calculateAttackStory,
  deriveAttackTiming,
  deriveWinPhase,
} from './calculateAttackStory'

const HERO = 'hero'

function rally(
  id: string,
  opts: {
    server: string | null
    winner: string | null
    ending: PointEnding
    fos: number | null
    miss?: PointMissReason | null
  }
): DBRally {
  return {
    id,
    server_id: opts.server,
    winner_id: opts.winner,
    is_scoring: true,
    point_ending: opts.ending,
    first_attack_index: opts.fos,
    point_miss_reason: opts.miss ?? null,
  } as unknown as DBRally
}

/** Shots 1..n alternating from the server. */
function shotsFor(
  rallyId: string,
  n: number,
  server: string | null,
  tags: Record<number, Partial<DBShot>> = {}
): DBShot[] {
  const receiver = server === HERO ? null : HERO
  return Array.from({ length: n }, (_, i) => ({
    id: `${rallyId}-sh${i + 1}`,
    rally_id: rallyId,
    shot_index: i + 1,
    player_id: i % 2 === 0 ? server : receiver,
    shot_wing: null,
    shot_stroke: null,
    ...tags[i + 1],
  })) as unknown as DBShot[]
}

describe('deriveAttackTiming', () => {
  it('labels return, third ball and later from the attacker view', () => {
    expect(deriveAttackTiming(2, false)).toBe('return')
    expect(deriveAttackTiming(3, true)).toBe('third_ball')
    expect(deriveAttackTiming(4, false)).toBe('later')
    expect(deriveAttackTiming(5, true)).toBe('later')
  })
})

describe('deriveWinPhase', () => {
  it('splits by distance from the first attack', () => {
    expect(deriveWinPhase(null, 4)).toBe('no_attack')
    expect(deriveWinPhase(3, 3)).toBe('on_attack')
    expect(deriveWinPhase(3, 4)).toBe('within_3')
    expect(deriveWinPhase(3, 6)).toBe('within_3')
    expect(deriveWinPhase(3, 7)).toBe('continuation')
  })
})

describe('calculateAttackStory', () => {
  const rallies = [
    // hero serves, hero attacks 3rd ball FH loop, wins on it
    rally('r1', { server: HERO, winner: HERO, ending: 'winner', fos: 3 }),
    // villain serves, hero attacks the return BH flick, misses (timing)
    rally('r2', { server: null, winner: null, ending: 'error_net', fos: 2, miss: 'timing' }),
    // villain serves, villain attacks 3rd ball, rally goes on, hero misses at 7 (untagged reason)
    rally('r3', { server: null, winner: null, ending: 'error_long', fos: 3 }),
    // hero serves, nobody attacks, villain pushes long on 4 → hero wins
    rally('r4', { server: HERO, winner: HERO, ending: 'error_long', fos: null, miss: 'technical' }),
  ]
  const shots = [
    ...shotsFor('r1', 3, HERO, { 3: { shot_wing: 'FH', shot_stroke: 'loop' } }),
    ...shotsFor('r2', 2, null, { 2: { shot_wing: 'BH', shot_stroke: 'flick' } }),
    ...shotsFor('r3', 8, null),
    ...shotsFor('r4', 4, HERO),
  ]
  const result = calculateAttackStory({ rallies, shots, heroId: HERO })

  it('counts who attacked first and their win rate', () => {
    expect(result.attackedFirst.hero.rallyIds).toEqual(['r1', 'r2'])
    expect(result.attackedFirst.villain.rallyIds).toEqual(['r3'])
    expect(result.wonWhenAttackedFirst.hero.count).toBe(1)
    expect(result.wonWhenAttackedFirst.hero.share).toBeCloseTo(0.5)
    expect(result.wonWhenAttackedFirst.villain.share).toBe(1)
    expect(result.noAttack.rallyIds).toEqual(['r4'])
  })

  it('splits points won by phase (adds up to points won)', () => {
    expect(result.winPhase.on_attack.hero.rallyIds).toEqual(['r1'])
    expect(result.winPhase.no_attack.hero.rallyIds).toEqual(['r4'])
    expect(result.winPhase.on_attack.villain.rallyIds).toEqual(['r2'])
    expect(result.winPhase.continuation.villain.rallyIds).toEqual(['r3'])
    const heroTotal =
      result.winPhase.no_attack.hero.count +
      result.winPhase.on_attack.hero.count +
      result.winPhase.within_3.hero.count +
      result.winPhase.continuation.hero.count
    expect(heroTotal).toBe(2)
  })

  it('splits first attacks by timing', () => {
    expect(result.attackTiming.third_ball.hero.used.rallyIds).toEqual(['r1'])
    expect(result.attackTiming.third_ball.hero.won.share).toBe(1)
    expect(result.attackTiming.return.hero.used.rallyIds).toEqual(['r2'])
    expect(result.attackTiming.return.hero.won.count).toBe(0)
    expect(result.attackTiming.third_ball.villain.used.count).toBe(1)
  })

  it('lists attacking strokes with win rates', () => {
    expect(result.weapons.hero.map((w) => w.key).sort()).toEqual(['BH|flick', 'FH|loop'])
    const loop = result.weapons.hero.find((w) => w.key === 'FH|loop')!
    expect(loop.used.count).toBe(1)
    expect(loop.won.share).toBe(1)
    expect(result.weapons.villain[0].key).toBe('?|?')
  })

  it('groups errors by miss reason for the player who missed', () => {
    expect(result.missReasons.hero.timing.rallyIds).toEqual(['r2'])
    // r3: shot 8 is hit by the receiver (hero) — villain served
    expect(result.missReasons.hero.untagged.rallyIds).toEqual(['r3'])
    expect(result.missReasons.hero.timing.share).toBeCloseTo(0.5)
    expect(result.missReasons.villain.technical.rallyIds).toEqual(['r4'])
  })
})
