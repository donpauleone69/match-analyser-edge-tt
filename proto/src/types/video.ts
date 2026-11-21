import type { Ending, ShotTags, Side, Wing } from './rally'

/** A point of the picture, each axis 0..1. The table is x 0.15 to 0.85, y 0.24 to 0.76. */
export type Spot = { x: number; y: number }

/** What one shot really was and where it went. The stand-in draws it, the answer key reads it. */
export type ShotPlay = {
  wing: Wing
  /** 'Serve' on shot 1, then one of the tagging strokes. */
  stroke: string
  /** Flick, Loop, Drive or Smash. The first one in a rally is its first attack. */
  attack: boolean
  /** Where the ball is hit. */
  at: Spot
  /** Where the ball lands: the far half, or the floor when long or wide. Null when it stops at the net. */
  bounce: Spot | null
}

export type ScriptRally = {
  contacts: number[]
  server: Side
  winner: Side
  ending: Ending
  fa: number | null
  /** The tags a tagger is asked for: the end shot and the first attack. */
  shots: ShotTags[]
  /** Every shot as played. */
  play: ShotPlay[]
  /** 1-based set this point belongs to in the scripted match. */
  setNo: number
}

export type VideoScript = {
  duration: number
  rallies: ScriptRally[]
  breaks: { a: number; b: number }[]
}
