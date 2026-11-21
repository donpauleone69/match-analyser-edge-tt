import type { ReactNode } from 'react'
import type { BestAt } from '@/rules/bestFa'
import type { EditGapStop } from '@/rules/matchOps'
import type { Points, VideoAsset } from '@/types/match'
import type { BestPart, Draft, RallyData, Side } from '@/types/rally'
import type { Scene, VideoScript } from '@/types/video'
import type { Player } from './hooks/usePlayer'

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

export type SceneAt = (script: VideoScript, t: number) => Scene

export type PictureSeekProps = {
  /** Global times the bar covers. A set's mark, start to end. */
  span: { a: number; b: number }
  time: number
  /** This set's rallies, first contact to last. */
  spans: SeekSpan[]
  /** A gap or the open rally, drawn as a warning band. */
  band: { a: number; b: number } | null
  onSeek: (g: number) => void
  /** Edit Set: a tap picks the rally or gap under the finger. */
  onPick?: (g: number) => void
}

export type VideoSectionProps = {
  player: Player
  videos: VideoAsset[]
  names: Record<Side, string>
  bug: { sets: Record<Side, number>; points: Record<Side, number>; server: Side | null; setId: number }
  /** A few words over the picture, such as why a step back stopped short. */
  hint: string | null
  /** A toast on the picture. While it is up, it takes the hint's place. */
  toast?: Toast | null
  /** Seeks go through the screen so it can say why one stopped short. */
  onSeek: (g: number) => void
  /** Tapping: a jump forward would lose the rally being tapped. */
  noForward?: boolean
  onRate: (rate: number) => void
  /** Last control in the playback row, after Mute. */
  settings?: ReactNode
  /** Top left of the picture, such as Back. The score sits to its right. */
  leading?: ReactNode
  /** The picture's seek bar. There is no other one. */
  seek: ReactNode
  className?: string
  sceneAt: SceneAt
}

export type RallyZoneView = {
  state: RallyState
  draft: Draft | null
  at: BestAt | null
  rallyOne: boolean
  saved: boolean
  focus: number | 'end' | null
  flash: number
  rallyNo: number
  /** The head names a rally with nothing tapped yet, while the row still shows the last saved one. */
  headDashed?: boolean
  names: Record<Side, string>
  /** Null before the first serve is picked. The head is then grey and numbered. */
  server: Side | null
  /** Score before this point, already formatted, such as "6 - 4". */
  score: string
  /** "Gap 7 s", "Gap, overlap", or "Insert". Empty on a rally. */
  word: string | null
  tight: boolean
  pressed: boolean
  /** The part the review pad is on. Ringed while review mode is on. */
  reviewFocus?: BestPart | null
  /** Set over's hold: the star is shown, dim, and ignored. */
  starDim?: boolean
  /** A part chip jumps there. Review stays on. */
  onReviewPart?: (part: BestPart) => void
  onEdit?: () => void
  onStar?: () => void
  onDiscard?: () => void
  onCancel?: () => void
  /** The insert head switches the server. */
  onServer?: () => void
}

export type SetZoneView = {
  rallies: RallyData[]
  picked: string | null
  gaps: EditGapStop[] | null
  pickedGap: number | null
  /** Null hides the next pill: Edit Set, a finished set, and Set over. */
  open: { n: number; server: Side | null } | null
  insert: { index: number; n: number; server: Side } | null
  serveBreaks: number[]
  onGap: (index: number) => void
  /** While review is on, a rally pill jumps there and the star stays on. */
  onRally?: (id: string) => void
  editing: boolean
  /** No saved rally yet. A press still runs, so the hint can say so. */
  dim: boolean
  onEdit: () => void
}

export type InputAreaView = { regions: AreaRegion[]; attrs?: Record<string, string | undefined> }
