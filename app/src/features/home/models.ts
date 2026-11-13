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
  kind: 'in_progress' | 'not_started' | 'fix_incomplete'
  detailLabel: string
}

/** Soft outstanding: tagged (or started) but missing optional context (goal 2). */
export interface ContextPolishModel {
  matchId: string
  title: string
  dateLabel: string
  /** What's missing — opponent always when null; tournament only when opponent already set */
  missing: 'opponent' | 'tournament'
  detailLabel: string
  actionLabel: string
}

export interface HomeModel {
  continueItems: ContinueTaggingModel[]
  /** Matches that still need tagging work */
  outstandingCount: number
  /** Soft: add optional opponent/tournament so Clips/Review can filter */
  contextItems: ContextPolishModel[]
  recent: HomeMatchModel[]
  totals: { matches: number; tagged: number; rallies: number }
}
