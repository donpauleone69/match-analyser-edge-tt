/**
 * Whether a match record is enough to open review.
 * Tournament and opponent links stay optional.
 */

export interface MatchReviewOpenability {
  player1_id: string
  tournament_id: string | null
  player2_id: string | null
}

export function canOpenMatchReview(match: MatchReviewOpenability): boolean {
  return Boolean(match.player1_id)
}

export function isTrainingLibraryPath(pathname: string): boolean {
  return pathname === '/training' || pathname.startsWith('/training/')
}

export function isMatchLibraryPath(pathname: string): boolean {
  return pathname === '/matches' || pathname.startsWith('/matches/')
}
