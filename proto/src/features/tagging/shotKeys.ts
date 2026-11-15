/**
 * Desktop keys for a shot's required tags, by keyboard row:
 * top row is the result, home row the wing, bottom row the stroke.
 * Z flips the switch. X is Block, then C V B N are the other strokes
 * in the cells that follow. M and comma do nothing.
 *
 * `applyShotKey` and the helpers above it are pure. The block at the foot of
 * the file is a bridge for the screen and is the only state here.
 */

import {
  ENDINGS,
  WINGS,
  fieldsFor,
  flipSwitch,
  setEnding,
  showsStroke,
  stageOf,
  strokeCells,
  strokeSide,
  switchOf,
  toggleShotField,
  type Draft,
  type StrokeSide,
} from './rally'

export const RESULT_KEYS = ['q', 'w', 'e', 'r', 't', 'y'] as const
export const WING_KEYS = ['a', 's'] as const
export const SWITCH_KEY = 'z'
/** One key per stroke cell, left to right, after the switch. */
export const STROKE_KEYS = ['x', 'c', 'v', 'b', 'n'] as const
export const NO_ATTACK_KEY = '0'

/**
 * The side the stroke cells are drawn on. A stroke with a side says it. A
 * fixed switch is the rule's side whatever was held. Otherwise the side the
 * panel holds (a flip on an empty shot or on Block is not stored on the
 * draft), and with none held, the rule's side.
 */
export function shownStrokeSide(d: Draft, shot: number, held?: StrokeSide | null): StrokeSide {
  const own = strokeSide(d.shots[shot - 1]?.stroke)
  if (own) return own
  const rule = switchOf(d, shot)
  return rule.fixed ? rule.side : (held ?? rule.side)
}

/** The side the switch shows after `key`: set only when the key is Z and the switch can flip. */
export function sideAfterShotKey(d: Draft, shot: number, key: string, held?: StrokeSide | null): StrokeSide | null {
  if (key.toLowerCase() !== SWITCH_KEY || stageOf(d) === 'result') return null
  if (!showsStroke(d, shot) || switchOf(d, shot).fixed) return null
  return shownStrokeSide(d, shot, held) === 'offensive' ? 'defensive' : 'offensive'
}

/**
 * The draft after `key` is pressed on `shot`'s panel, or null if the key does
 * nothing there. Pure: the answer depends only on what is passed in. `held`
 * is the side the open panel shows when that is not on the draft.
 */
export function applyShotKey(d: Draft, shot: number, key: string, held?: StrokeSide | null): Draft | null {
  const k = key.toLowerCase()
  const fields = fieldsFor(d, shot)
  const result = RESULT_KEYS.indexOf(k as (typeof RESULT_KEYS)[number])
  if (result >= 0) return fields.result ? setEnding(d, ENDINGS[result]) : null

  // The wing and stroke row waits until the result is in.
  if (stageOf(d) === 'result') return null
  const wing = WING_KEYS.indexOf(k as (typeof WING_KEYS)[number])
  if (wing >= 0) return fields.wing ? toggleShotField(d, shot, 'wing', WINGS[wing]) : null

  if (!showsStroke(d, shot)) return null
  if (k === SWITCH_KEY) {
    if (switchOf(d, shot).fixed) return null
    const flipped = flipSwitch(d, shot)
    return flipped === d ? null : flipped
  }
  const index = STROKE_KEYS.indexOf(k as (typeof STROKE_KEYS)[number])
  if (index < 0) return null
  const cell = strokeCells(shownStrokeSide(d, shot, held), d.fa === shot)[index]
  if (!cell) return null
  const next = toggleShotField(d, shot, 'stroke', cell)
  return next === d ? null : next
}

/*
 * Screen bridge. Not a rule, and nothing above reads it.
 *
 * The open panel holds the switch side for an empty shot and for Block, and
 * the key handler sits in another component. Until that side is passed as a
 * prop, the panel publishes it here and the key handler uses `applyPanelKey`.
 * This block belongs in a screen file and can move there as it stands.
 */
let panel: { shot: number; side: StrokeSide; hold: (side: StrokeSide) => void } | null = null

/** The open panel says which side it shows, and how to be told to hold another. Returns the undo. */
export function bindStrokeSide(shot: number, side: StrokeSide, hold: (side: StrokeSide) => void): () => void {
  const mine = { shot, side, hold }
  panel = mine
  return () => {
    if (panel === mine) panel = null
  }
}

/** A key on the open panel: `applyShotKey` with the side that panel shows, and the panel told of a flip. */
export function applyPanelKey(d: Draft, shot: number, key: string): Draft | null {
  const open = panel?.shot === shot ? panel : null
  const flipped = sideAfterShotKey(d, shot, key, open?.side)
  if (flipped) open?.hold(flipped)
  return applyShotKey(d, shot, key, open?.side)
}
