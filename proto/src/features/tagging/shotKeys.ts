/**
 * Desktop keys for a shot's required tags, by keyboard row (pure):
 * top row is the result, home row the wing, bottom row the stroke.
 * Each key sits under its chip, in order, and is printed on the chip.
 */

import {
  ENDINGS,
  WINGS,
  fieldsFor,
  patchShot,
  setEnding,
  stageOf,
  toggleShotField,
  type Draft,
} from './rally'

export const RESULT_KEYS = ['q', 'w', 'e', 'r', 't', 'y'] as const
export const WING_KEYS = ['a', 's'] as const
export const PIVOT_KEY = 'd'
export const STROKE_KEYS = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ','] as const
export const NO_ATTACK_KEY = '0'

/** The draft after `key` is pressed on `shot`'s panel, or null if the key does nothing there. */
export function applyShotKey(d: Draft, shot: number, key: string): Draft | null {
  const k = key.toLowerCase()
  const fields = fieldsFor(d, shot)
  const result = RESULT_KEYS.indexOf(k as (typeof RESULT_KEYS)[number])
  if (result >= 0) return fields.result ? setEnding(d, ENDINGS[result]) : null

  // The wing and stroke row waits, dimmed, until the result is in.
  if (!fields.wing || stageOf(d) === 'result') return null
  const wing = WING_KEYS.indexOf(k as (typeof WING_KEYS)[number])
  if (wing >= 0) return toggleShotField(d, shot, 'wing', WINGS[wing])
  if (k === PIVOT_KEY) {
    return fields.pivot ? patchShot(d, shot, { pivot: !d.shots[shot - 1]?.pivot }) : null
  }
  const stroke = STROKE_KEYS.indexOf(k as (typeof STROKE_KEYS)[number])
  if (stroke >= 0 && fields.strokes && stroke < fields.strokes.length) {
    return toggleShotField(d, shot, 'stroke', fields.strokes[stroke])
  }
  return null
}
