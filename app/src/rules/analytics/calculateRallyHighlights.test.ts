import { describe, it, expect } from 'vitest'
import type { DBRally, DBSet, DBShot } from '@/data'
import { calculateRallyHighlights } from './calculateRallyHighlights'

const sets = [
  { id: 's1', set_number: 1 },
  { id: 's2', set_number: 2 },
] as unknown as DBSet[]

function rally(id: string, setId: string, index: number, highlight = false): DBRally {
  return {
    id,
    set_id: setId,
    rally_index: index,
    is_scoring: true,
    is_highlight: highlight,
  } as unknown as DBRally
}

function shots(rallyId: string, count: number): DBShot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${rallyId}-${i + 1}`,
    rally_id: rallyId,
    shot_index: i + 1,
  })) as unknown as DBShot[]
}

describe('calculateRallyHighlights', () => {
  const rallies = [
    rally('a', 's2', 1, true),
    rally('b', 's1', 2),
    rally('c', 's1', 1, true),
    rally('d', 's1', 3),
    rally('e', 's2', 2),
  ]
  const allShots = [
    ...shots('a', 9),
    ...shots('b', 7),
    ...shots('c', 2),
    ...shots('d', 4),
    ...shots('e', 7),
  ]
  const result = calculateRallyHighlights({ sets, rallies, shots: allShots })

  it('lists starred rallies in match order', () => {
    expect(result.flagged.map((r) => r.rallyId)).toEqual(['c', 'a'])
  })

  it('auto-picks the longest unstarred rallies above the minimum', () => {
    expect(result.longest.map((r) => [r.rallyId, r.shotCount])).toEqual([
      ['b', 7],
      ['e', 7],
    ])
  })
})
