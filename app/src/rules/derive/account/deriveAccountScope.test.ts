import { describe, expect, it } from 'vitest'
import type { DBMatch } from '@/data/entities/matches/match.types'
import type { DBShot } from '@/data/entities/shots/shot.types'
import { deriveAccountScope } from './deriveAccountScope'

const match = (id: string, player1_id: string): DBMatch =>
  ({
    id,
    player1_id,
  }) as DBMatch

describe('deriveAccountScope', () => {
  const matches = [match('a-1', 'player-a'), match('b-1', 'player-b'), match('a-2', 'player-a')]

  it('defaults a player account to its linked player and recorded hero matches', () => {
    const scope = deriveAccountScope(
      { role: 'player', linkedPlayerId: 'player-a', selectedFocalPlayerId: 'player-b' },
      matches
    )

    expect(scope.status).toBe('ready')
    expect(scope.focalPlayerId).toBe('player-a')
    expect(scope.matchIds).toEqual(['a-1', 'a-2'])
  })

  it('lets a coach switch focal player without rewriting matches or shots', () => {
    const shots = [
      { id: 'shot-a', player_id: 'player-a' },
      { id: 'shot-opponent', player_id: 'player-b' },
    ] as DBShot[]
    const matchesBefore = structuredClone(matches)
    const shotsBefore = structuredClone(shots)

    const asA = deriveAccountScope(
      { role: 'coach', linkedPlayerId: null, selectedFocalPlayerId: 'player-a' },
      matches
    )
    const asB = deriveAccountScope(
      { role: 'coach', linkedPlayerId: null, selectedFocalPlayerId: 'player-b' },
      matches
    )

    expect(asA.matchIds).toEqual(['a-1', 'a-2'])
    expect(asB.matchIds).toEqual(['b-1'])
    expect(matches).toEqual(matchesBefore)
    expect(shots).toEqual(shotsBefore)
  })

  it('requires explicit setup instead of inferring a person', () => {
    expect(deriveAccountScope(null, matches).status).toBe('setup-required')
    expect(
      deriveAccountScope(
        { role: 'player', linkedPlayerId: null, selectedFocalPlayerId: null },
        matches
      ).status
    ).toBe('setup-required')
    expect(
      deriveAccountScope(
        { role: 'coach', linkedPlayerId: null, selectedFocalPlayerId: null },
        matches
      ).status
    ).toBe('setup-required')
  })
})
