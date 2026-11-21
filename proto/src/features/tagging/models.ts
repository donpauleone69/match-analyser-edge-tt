import type { Points } from '@/types/match'
import type { Draft, Side } from '@/types/rally'

export type FlowName = 'bestfa'

/** The Start card's answers. Kept on screen only, and carried across a set number change. */
export type StartPick = { videoId: string; score: Points; server: Side | null }

export type Toast = { text: string; undo?: () => void; extra?: { label: string; run: () => void } }

/** A rally being added between two saved ones: the stretch of video it may use. */
export type Gap = { index: number; a: number; b: number }

export type EditPick = { kind: 'rally'; id: string } | { kind: 'gap'; index: number }

export type ShotEdit = { rallyId: string | null; stop: number | 'end'; back: 'question' | 'saved' | 'set' }

export type BestSavedRow = { rallyId: string; draft: Draft }

/**
 * An archive keeps only the tagged rallies. While one runs, and once it is
 * made, sets cannot be reopened or tagged further. Saved rallies still play.
 */
export type TagLock = 'archiving' | 'archived' | null

/** One control in the Input Area. Empty cells are space, so a missing region draws nothing. */
export type AreaRegion = {
  key: string
  label: string
  column: 1 | 2
  row: number
  /** Portrait: both columns. Landscape: the same control in each wing. */
  span?: boolean
  /** The row stays at control height. The other rows share what is left. */
  short?: boolean
  bg: string
  fg: string
  pressed?: boolean
  /** Shown, and a press does nothing. */
  dim?: boolean
  outline?: boolean
  onClick: () => void
  data?: Record<string, string | undefined>
}

export type RallyState = 'before' | 'gap' | 'insert' | 'tapping' | 'answering' | 'saved' | 'editing' | 'review'

/** One rally on the seek bar, first contact to last. `on` is the rally being reviewed. */
export type SeekSpan = { a: number; b: number; on?: boolean; likely?: boolean }
