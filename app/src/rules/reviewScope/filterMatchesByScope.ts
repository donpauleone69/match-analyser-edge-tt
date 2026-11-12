/**
 * Which matches belong in a review scope.
 * Pure — no React, no IO. Training posts are never matches and never appear here.
 */

export type ReviewScopeKind = 'match' | 'tournament' | 'opponent' | 'all'

export interface ReviewScope {
  kind: ReviewScopeKind
  /** Required for match / tournament / opponent */
  id: string | null
}

export interface ScopedMatch {
  id: string
  player1_id: string
  player2_id: string | null
  tournament_id: string | null
}

export function filterMatchesByScope(
  matches: readonly ScopedMatch[],
  scope: ReviewScope,
  focalPlayerId: string,
): ScopedMatch[] {
  const mine = matches.filter((m) => m.player1_id === focalPlayerId)

  switch (scope.kind) {
    case 'all':
      return mine
    case 'match':
      return scope.id ? mine.filter((m) => m.id === scope.id) : []
    case 'tournament':
      if (!scope.id) return []
      return mine.filter((m) => m.tournament_id === scope.id)
    case 'opponent':
      if (!scope.id) return []
      return mine.filter((m) => m.player2_id === scope.id)
    default:
      return []
  }
}

export function matchIdsInScope(
  matches: readonly ScopedMatch[],
  scope: ReviewScope,
  focalPlayerId: string,
): string[] {
  return filterMatchesByScope(matches, scope, focalPlayerId).map((m) => m.id)
}
