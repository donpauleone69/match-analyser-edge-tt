import { describe, it, expect } from 'vitest'
import type { DBRally, DBShot, PointEnding } from '@/data'
import { calculateServeReceiveStory } from '@/rules/analytics/calculateServeReceiveStory'
import { buildServeReceiveSections } from './buildServeReceiveCards'

const HERO = 'hero'

function rally(
  id: string,
  server: string | null,
  winner: string | null,
  ending: PointEnding,
  fos: number | null
): DBRally {
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

describe('buildServeReceiveSections', () => {
  const rallies = [
    rally('r1', HERO, null, 'error_net', null),
    rally('r2', HERO, HERO, 'error_long', null),
    rally('r3', HERO, HERO, 'winner', 3),
    rally('r4', null, HERO, 'error_net', 2),
    rally('r5', null, null, 'winner', null),
  ]
  const shots = [
    ...shotsFor('r1', 1, HERO),
    ...shotsFor('r2', 2, HERO),
    ...shotsFor('r3', 3, HERO),
    ...shotsFor('r4', 5, null),
    ...shotsFor('r5', 4, null),
  ]
  const story = calculateServeReceiveStory({ rallies, shots, heroId: HERO })
  const sections = buildServeReceiveSections(story, { heroName: 'You', villainName: 'Opp' })

  it('returns curated Serve Data and Receive Data pages', () => {
    expect(sections.map((s) => s.id)).toEqual(['B', 'C'])
    expect(sections[0].title).toBe('Serve Data')
    expect(sections[1].title).toBe('Receive Data')
  })

  it('keeps at most two compare cards per page', () => {
    expect(sections[0].cards).toHaveLength(2)
    expect(sections[1].cards).toHaveLength(2)
  })

  it('exposes headlines and playlist focuses for the stats→playlist flow', () => {
    expect(sections[0].headlines?.length).toBeGreaterThan(0)
    expect(sections[0].playlistFocuses?.some((f) => f.id === 'all')).toBe(true)
    expect(sections[0].playlistFocuses?.find((f) => f.id === 'all')?.count).toBe(3)
    expect(sections[1].playlistFocuses?.find((f) => f.id === 'all')?.count).toBe(2)
  })
})
