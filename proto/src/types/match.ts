import type { Draft, RallyData, Side } from './rally'
import type { VideoScript } from './video'

export type Points = { me: number; them: number }

export type DemoMode = 'filled' | 'empty'

export type Score = Points

/** Typed on Details. Strings so a half-typed score survives. */
export type EnteredScore = { me: string; them: string }

/** One end of a set on a video. `t` is seconds in that video. */
export type MarkPoint = { videoId: string; t: number }

/**
 * Where the set sits on video. `complete` means the whole set is there,
 * from the first serve. Null means the set is not on video.
 */
export type SetMark = {
  from: MarkPoint
  to: MarkPoint
  complete: boolean
}

export type SetData = {
  setId: number
  /** Entered on Details. */
  entered: EnteredScore
  /** The user pressed Finish set. */
  finished: boolean
  firstServer: Side
  /** Saved rallies, in order. The tagged score is counted from them. */
  rallies: RallyData[]
  /** The rally being tagged, kept without asking. */
  draft: Draft | null
  /** The set's hard bounds on video. Null when it is not on video. */
  mark: SetMark | null
}

/**
 * One source video. A match's videos play in list order; no set mapping.
 * demo = the scripted stand-in. file = a local file through a blob URL,
 * in memory only, never uploaded or stored.
 */
export type VideoAsset = {
  id: string
  fileName: string
  sizeMb: number
  /** Rallies only, joined, lower quality. Cannot be undone. */
  archived: boolean
  kind: 'demo' | 'file'
  durationS: number
  script?: VideoScript
  src?: string
}

/** Sets won by each side. Both set means the result is entered. */
export type MatchResult = { me: number | null; them: number | null }

export type MatchRecord = {
  id: string
  opponent: string
  event: string
  date: string
  result: MatchResult
  videos: VideoAsset[]
  sets: SetData[]
}

/**
 * new = no video and nothing tagged
 * ready = video added, nothing tagged
 * partial = tagging started, match not finished
 * complete = Tagged: with a result, every set it lists is saved or counted
 *   from Details. With no result a match is not complete.
 */
export type MatchPhase = 'new' | 'ready' | 'partial' | 'complete'

export type SetState = 'finished' | 'progress' | 'none'

/** A local file picked by the user. Held in memory only; never uploaded. */
export type LocalVideo = { fileName: string; sizeMb: number; durationS: number; src: string }

/** Archive job labels, in order. A running job's step is an index into this list. */
export const ARCHIVE_STEPS = ['Making archive', 'Checking archive', 'Removing original'] as const
