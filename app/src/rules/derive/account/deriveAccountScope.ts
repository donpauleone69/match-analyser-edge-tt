import type { DBMatch } from '@/data/entities/matches/match.types'

export type AccountRole = 'player' | 'coach'

export interface AccountProfile {
  role: AccountRole | null
  linkedPlayerId: string | null
  selectedFocalPlayerId: string | null
}

export interface AccountScope {
  status: 'setup-required' | 'ready'
  focalPlayerId: string | null
  matches: DBMatch[]
  matchIds: string[]
}

/**
 * Resolves the person whose library and first-person review the account uses.
 * Match and shot records are read-only inputs: changing focal scope only filters.
 */
export function deriveAccountScope(profile: AccountProfile | null, matches: readonly DBMatch[]): AccountScope {
  const focalPlayerId =
    profile?.role === 'player'
      ? profile.linkedPlayerId
      : profile?.role === 'coach'
        ? profile.selectedFocalPlayerId
        : null

  if (!focalPlayerId) {
    return { status: 'setup-required', focalPlayerId: null, matches: [], matchIds: [] }
  }

  const scopedMatches = matches.filter((match) => match.player1_id === focalPlayerId)
  return {
    status: 'ready',
    focalPlayerId,
    matches: scopedMatches,
    matchIds: scopedMatches.map((match) => match.id),
  }
}

export function accountCanAccessMatch(scope: AccountScope, matchId: string): boolean {
  return scope.status === 'ready' && scope.matchIds.includes(matchId)
}
