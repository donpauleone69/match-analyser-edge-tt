import { describe, expect, it } from 'vitest'
import { findDuplicateMatches, matchIdentityEquals } from './findDuplicateMatches'

const base = {
  id: 'a',
  player1_id: 'p1',
  player2_id: 'p2',
  tournament_id: 't1' as string | null,
  match_date: '2026-11-13',
}

describe('matchIdentityEquals', () => {
  it('treats null tournaments as equal', () => {
    expect(
      matchIdentityEquals(
        { player1Id: 'p1', player2Id: 'p2', tournamentId: null, matchDate: '2026-11-13' },
        { player1Id: 'p1', player2Id: 'p2', tournamentId: null, matchDate: '2026-11-13' }
      )
    ).toBe(true)
  })
})

describe('findDuplicateMatches', () => {
  it('skips when opponent missing (default requireOpponent)', () => {
    const hits = findDuplicateMatches([base], {
      player1Id: 'p1',
      player2Id: null,
      tournamentId: 't1',
      matchDate: '2026-11-13',
    })
    expect(hits).toEqual([])
  })

  it('matches same opponent + tournament + date', () => {
    const hits = findDuplicateMatches([base, { ...base, id: 'b', player2_id: 'other' }], {
      player1Id: 'p1',
      player2Id: 'p2',
      tournamentId: 't1',
      matchDate: '2026-11-13',
    })
    expect(hits.map((h) => h.id)).toEqual(['a'])
  })

  it('matches null tournament to null tournament', () => {
    const row = { ...base, tournament_id: null }
    const hits = findDuplicateMatches([row], {
      player1Id: 'p1',
      player2Id: 'p2',
      tournamentId: null,
      matchDate: '2026-11-13',
    })
    expect(hits).toHaveLength(1)
  })

  it('honours excludeMatchId', () => {
    const hits = findDuplicateMatches([base], {
      player1Id: 'p1',
      player2Id: 'p2',
      tournamentId: 't1',
      matchDate: '2026-11-13',
    }, { excludeMatchId: 'a' })
    expect(hits).toEqual([])
  })

  it('normalizes ISO match_date', () => {
    const row = { ...base, match_date: '2026-11-13T12:00:00.000Z' }
    const hits = findDuplicateMatches([row], {
      player1Id: 'p1',
      player2Id: 'p2',
      tournamentId: 't1',
      matchDate: '2026-11-13',
    })
    expect(hits).toHaveLength(1)
  })
})
