import { describe, expect, it } from 'vitest'
import { filterMatchesByScope, matchIdsInScope } from './filterMatchesByScope'

const FOCAL = 'hero-a'
const OTHER = 'hero-b'

const matches = [
  { id: 'm1', player1_id: FOCAL, player2_id: 'opp-1', tournament_id: 't-alpha' },
  { id: 'm2', player1_id: FOCAL, player2_id: 'opp-1', tournament_id: 't-alpha' },
  { id: 'm3', player1_id: FOCAL, player2_id: 'opp-2', tournament_id: 't-alpha' },
  { id: 'm4', player1_id: FOCAL, player2_id: 'opp-1', tournament_id: 't-beta' },
  { id: 'm5', player1_id: FOCAL, player2_id: 'opp-3', tournament_id: null },
  { id: 'm6', player1_id: OTHER, player2_id: 'opp-1', tournament_id: 't-alpha' },
]

describe('filterMatchesByScope', () => {
  it('tournament scope includes that tournament’s matches and excludes another tournament', () => {
    const ids = matchIdsInScope(matches, { kind: 'tournament', id: 't-alpha' }, FOCAL)
    expect(ids.sort()).toEqual(['m1', 'm2', 'm3'])
    expect(ids).not.toContain('m4')
    expect(ids).not.toContain('m6')
  })

  it('opponent scope includes only matches against that player', () => {
    const ids = matchIdsInScope(matches, { kind: 'opponent', id: 'opp-1' }, FOCAL)
    expect(ids.sort()).toEqual(['m1', 'm2', 'm4'])
  })

  it('all of mine includes no-tournament matches and excludes other focal players', () => {
    const ids = matchIdsInScope(matches, { kind: 'all', id: null }, FOCAL)
    expect(ids.sort()).toEqual(['m1', 'm2', 'm3', 'm4', 'm5'])
  })

  it('match with no tournament appears in all and opponent, not in a tournament scope', () => {
    expect(matchIdsInScope(matches, { kind: 'all', id: null }, FOCAL)).toContain('m5')
    expect(matchIdsInScope(matches, { kind: 'opponent', id: 'opp-3' }, FOCAL)).toEqual(['m5'])
    expect(matchIdsInScope(matches, { kind: 'tournament', id: 't-alpha' }, FOCAL)).not.toContain('m5')
  })

  it('single match scope returns only that match for the focal player', () => {
    expect(filterMatchesByScope(matches, { kind: 'match', id: 'm1' }, FOCAL).map((m) => m.id)).toEqual(['m1'])
    expect(filterMatchesByScope(matches, { kind: 'match', id: 'm6' }, FOCAL)).toEqual([])
  })
})
