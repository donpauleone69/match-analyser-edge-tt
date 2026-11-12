/**
 * Match Review — view model types
 */

import type { MatchRound } from '@/data'
import type { SetTaggingStatus } from '@/rules/derive/set/deriveSetTaggingStatus'

export type CellTone = 'good' | 'bad' | 'amber' | 'none'

/** Rallies behind a number — opens the Evidence drawer */
export interface EvidenceRef {
  title: string
  /** Optional one-line explanation of what the list contains */
  subtitle?: string
  rallyIds: string[]
}

export interface MetricCellModel {
  text: string
  tone: CellTone
  evidence: EvidenceRef | null
}

/** One comparison row: Hero | label | Villain */
export interface CompareRowModel {
  key: string
  label: string
  hero: MetricCellModel
  villain: MetricCellModel
}

export interface SetScoreChipModel {
  setNumber: number
  hero: number
  villain: number
  /** null while the set is level / unfinished */
  heroWon: boolean | null
}

/** A comparison card (A1, A2, ...) */
export interface CompareCardModel {
  id: string
  title: string
  /** One-line story, shown in italics under the title */
  story: string
  rows: CompareRowModel[]
  /** Set scorelines shown under the title (A1 only) */
  scoreline?: SetScoreChipModel[]
  emptyMessage?: string
}

export interface CompareSectionModel {
  id: string
  title: string
  question: string
  cards: CompareCardModel[]
}

/** A locked (not yet built) section shell */
export interface LockedSectionModel {
  id: string
  title: string
  question: string
  note: string
}

export interface TakeawayModel {
  key: string
  tone: 'good' | 'bad' | 'info'
  text: string
  evidence: EvidenceRef | null
}

/** One rally in the Evidence drawer, highlights and the rally browser */
export interface RallyRowModel {
  id: string
  setId: string
  setNumber: number
  rallyIndex: number
  /** hero–villain before the rally */
  scoreBefore: string
  /** hero–villain after the rally */
  scoreAfter: string
  serverName: string
  winnerName: string
  heroWon: boolean
  heroServed: boolean
  shotCount: number
  fos: number | null
  endingLabel: string
  isError: boolean
  missReasonLabel: string | null
  isHighlight: boolean
  reviewCount: number
  /** Short summary, e.g. "5 shots · FOS 3 · Villain In-Net (Timing)" */
  summary: string
  /** Video loop window (seconds), null when no contact times */
  loop: { start: number; end: number } | null
}

export interface ReviewItemModel {
  shotId: string
  rallyId: string
  label: string
  /** Contact time to start the clip from */
  seekTime: number
}

export interface ReviewPatternModel {
  key: string
  title: string
  kindLabel: 'Technical' | 'Tactical'
  count: number
  items: ReviewItemModel[]
}

export interface ReviewSideModel {
  name: string
  total: number
  technical: ReviewPatternModel[]
  tactical: ReviewPatternModel[]
}

export interface WorkOnModel {
  /** Repeated patterns, e.g. "3× BH Push · technical" (hero first) */
  focus: { key: string; text: string; side: 'hero' | 'villain' }[]
  total: number
  hero: ReviewSideModel
  villain: ReviewSideModel
  /** F4 — why points were missed */
  missReasons: CompareCardModel
  /** Every hero error, for "see all errors" */
  heroErrors: EvidenceRef
}

export interface HighlightsModel {
  flagged: string[]
  longest: string[]
}

export interface SetPanelModel {
  setId: string
  setNumber: number
  status: SetTaggingStatus
  statusLabel: string
  rallyCount: number
  /** hero–villain, or null when nothing scored */
  scoreLabel: string | null
  heroWon: boolean | null
}

/** Editable match context shown under Details (player-centric). */
export interface MatchContextModel {
  matchDate: string
  matchDateSource: 'manual' | 'video' | null
  matchDateSourceLabel: string
  /** Suggested YYYY-MM-DD from stored video lastModified when different / applicable */
  suggestedVideoDate: string | null
  player1Id: string
  player2Id: string | null
  tournamentId: string | null
  tournamentName: string | null
  round: MatchRound | null
  roundLabel: string | null
}

export interface MatchReviewViewModel {
  heroName: string
  villainName: string
  dateLabel: string
  /** e.g. "Lost 4–11" / "Won 3–1" / "In progress" */
  resultLabel: string
  resultTone: 'good' | 'bad' | 'info'
  hasPointData: boolean
  totalPoints: number
  takeaways: TakeawayModel[]
  sections: CompareSectionModel[]
  locked: LockedSectionModel[]
  workOn: WorkOnModel
  highlights: HighlightsModel
  sets: SetPanelModel[]
  rallies: RallyRowModel[]
  context: MatchContextModel
}
