/**
 * Desktop keys for a shot's required tags, by keyboard row (pure):
 * top row is the result, home row the wing, bottom row the stroke.
 * Z flips the switch. X is Block, then C V B N are the other strokes
 * in the cells that follow. M and comma do nothing.
 */

import {
  ENDINGS,
  WINGS,
  fieldsFor,
  flipSwitch,
  patchShot,
  setEnding,
  showsStroke,
  stageOf,
  strokeCells,
  switchOf,
  toggleShotField,
  type Draft,
  type StrokeSide,
} from './rally'

export const RESULT_KEYS = ['q', 'w', 'e', 'r', 't', 'y'] as const
export const WING_KEYS = ['a', 's'] as const
export const PIVOT_KEY = 'd'
export const SWITCH_KEY = 'z'
/** One key per stroke cell, left to right, after the switch. */
export const STROKE_KEYS = ['x', 'c', 'v', 'b', 'n'] as const
export const NO_ATTACK_KEY = '0'

/**
 * The open shot's switch side is not stored on the draft when the stroke is
 * Block, so the panel publishes it for the keys.
 */
let published: { shot: number; side: StrokeSide } | null = null
let onHold: ((shot: number, side: StrokeSide) => void) | null = null

export function bindStrokeSide(
  shot: number,
  side: StrokeSide,
  hold: (side: StrokeSide) => void
): () => void {
  published = { shot, side }
  onHold = (s, next) => {
    if (s === shot) hold(next)
  }
  return () => {
    if (published?.shot === shot) published = null
    onHold = null
  }
}

/** The draft after `key` is pressed on `shot`'s panel, or null if the key does nothing there. */
export function applyShotKey(d: Draft, shot: number, key: string, shown?: StrokeSide): Draft | null {
  const k = key.toLowerCase()
  const fields = fieldsFor(d, shot)
  const result = RESULT_KEYS.indexOf(k as (typeof RESULT_KEYS)[number])
  if (result >= 0) return fields.result ? setEnding(d, ENDINGS[result]) : null

  // The wing and stroke row waits until the result is in.
  if (stageOf(d) === 'result') return null
  const wing = WING_KEYS.indexOf(k as (typeof WING_KEYS)[number])
  if (wing >= 0) return fields.wing ? toggleShotField(d, shot, 'wing', WINGS[wing]) : null
  if (k === PIVOT_KEY) {
    return fields.pivot ? patchShot(d, shot, { pivot: !d.shots[shot - 1]?.pivot }) : null
  }

  if (!showsStroke(d, shot)) return null
  const side = shown ?? (published?.shot === shot ? published.side : switchOf(d, shot).side)
  if (k === SWITCH_KEY) {
    if (switchOf(d, shot).fixed) return null
    const next: StrokeSide = side === 'offensive' ? 'defensive' : 'offensive'
    onHold?.(shot, next)
    const flipped = flipSwitch(d, shot)
    return flipped === d ? null : flipped
  }
  const index = STROKE_KEYS.indexOf(k as (typeof STROKE_KEYS)[number])
  if (index < 0) return null
  const cell = strokeCells(side, d.fa === shot)[index]
  if (!cell) return null
  return toggleShotField(d, shot, 'stroke', cell)
}
