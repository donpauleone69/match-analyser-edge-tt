/**
 * Match Review — view model types
 */

import type { DBMatch, DBSet } from '@/data'

/** One comparison row: Hero | label | Villain */
export interface StatCompareRowModel {
  key: string
  label: string
  heroValue: string
  villainValue: string
}

/** A comparison card (A1, A2, ...) */
export interface StatCompareCardModel {
  id: 'A1' | 'A2'
  title: string
  /** One-line story shown in italics under the title */
  story: string
  rows: StatCompareRowModel[]
}

/** One shot flagged for later review */
export interface ReviewShotRowModel {
  key: string
  label: string
  detail: string
  kindLabel: string
}

export interface MatchStoryViewModel {
  heroName: string
  villainName: string
  cards: StatCompareCardModel[]
  reviewShots: ReviewShotRowModel[]
}

/** A locked (not yet available) section shell */
export interface LockedSectionModel {
  id: 'B' | 'C' | 'D' | 'E' | 'F'
  title: string
  question: string
}

export interface MatchReviewViewModel {
  match: DBMatch
  sets: DBSet[]
  story: MatchStoryViewModel
}
