import type { Ending, ShotTags, Side, Wing } from './rally'

/** A point of the picture, each axis 0..1. The table is x 0.15 to 0.85, y 0.24 to 0.76. */
export type Spot = { x: number; y: number }

/** What one shot really was and where it went. The stand-in draws it, the answer key reads it. */
export type ShotPlay = {
  wing: Wing
  /** 'Serve' on shot 1, then the picture stroke the stand-in drew. Saved tags use Attack or Control. */
  stroke: string
  /** An attacking picture stroke. The first one in a rally is its first attack. */
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

export type Scene = {
  /** Ball position in 0..1 of the picture. Null only after the last point. */
  ball: { x: number; y: number; opacity: number; scale: number; attack: boolean } | null
  /** Side whose bat is at the ball right now. */
  hit: Side | null
  /** Where each bat is. It goes to the ball, so it shows forehand or backhand. */
  bats: Record<Side, Spot>
  /** Where the ball has just landed. `age` is seconds since. */
  marks: { x: number; y: number; age: number; floor: boolean }[]
  /** Seconds since the ball hit the net, while it still shakes. */
  net: number | null
  label: string | null
  setNo: number | null
}
