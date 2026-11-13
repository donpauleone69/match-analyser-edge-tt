/**
 * Match-level duplicate detection (product goal 10).
 * Pure — no React, no IO.
 */

import { toCalendarDate } from '@/rules/matchList/filterSortMatches'

/** Calendar identity for “same match” soft matching. */
export interface MatchIdentityKey {
  player1Id: string
  player2Id: string | null
  tournamentId: string | null
  matchDate: string // YYYY-MM-DD
}

export interface MatchDuplicateCandidate {
  id: string
  player1_id: string
  player2_id: string | null
  tournament_id: string | null
  match_date: string
  created_at?: string
  step1_complete?: boolean
  step2_complete?: boolean
  tagging_mode?: string | null
}

export function matchIdentityEquals(a: MatchIdentityKey, b: MatchIdentityKey): boolean {
  return (
    a.player1Id === b.player1Id &&
    a.player2Id === b.player2Id &&
    a.tournamentId === b.tournamentId &&
    toCalendarDate(a.matchDate) === toCalendarDate(b.matchDate)
  )
}

export interface FindDuplicateMatchesOptions {
  excludeMatchId?: string
  /** Default true: skip warn when opponent is missing (thin create). */
  requireOpponent?: boolean
  /** Default false: null tournament still matches null tournament. */
  requireTournament?: boolean
}

/**
 * Soft duplicates: same focal player + opponent + tournament + calendar date.
 * Nulls compare equal. Empty when opponent required but missing.
 */
export function findDuplicateMatches(
  candidates: readonly MatchDuplicateCandidate[],
  query: MatchIdentityKey,
  options: FindDuplicateMatchesOptions = {}
): MatchDuplicateCandidate[] {
  const requireOpponent = options.requireOpponent !== false
  const requireTournament = options.requireTournament === true

  if (requireOpponent && !query.player2Id) return []
  if (requireTournament && !query.tournamentId) return []

  const queryDate = toCalendarDate(query.matchDate)
  if (!queryDate) return []

  return candidates.filter((m) => {
    if (options.excludeMatchId && m.id === options.excludeMatchId) return false
    if (m.player1_id !== query.player1Id) return false
    return matchIdentityEquals(
      {
        player1Id: m.player1_id,
        player2Id: m.player2_id,
        tournamentId: m.tournament_id,
        matchDate: m.match_date,
      },
      { ...query, matchDate: queryDate }
    )
  })
}
