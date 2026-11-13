/**
 * Home — view model types
 */

export type HomeMatchStatus = 'not_started' | 'in_progress' | 'tagged'

export interface HomeMatchModel {
  matchId: string
  /** "Paul Overton vs Ricardo Santos" */
  title: string
  dateLabel: string
  /** Sets won hero–opponent, e.g. "2–1"; null before any set has a winner */
  setsLabel: string | null
  heroWon: boolean | null
  ralliesTagged: number
  status: HomeMatchStatus
  statusLabel: string
}

export interface ContinueTaggingModel {
  matchId: string
  title: string
  setNumber: number
  ralliesTagged: number
  /** Current set score hero–opponent */
  scoreLabel: string
  actionLabel: string
  /** Why this match is outstanding */
  kind: 'in_progress' | 'not_started'
  detailLabel: string
}

export interface HomeModel {
  continueItems: ContinueTaggingModel[]
  /** Matches that still need tagging work */
  outstandingCount: number
  recent: HomeMatchModel[]
  totals: { matches: number; tagged: number; rallies: number }
}
