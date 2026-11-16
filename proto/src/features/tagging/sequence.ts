/**
 * Shot by shot walk. A screen layer on top of the rally: it chooses which
 * shot is open, and it never changes what Save stores. The current mode's
 * stage order and `shotKeys.applyShotKey` stay as they are. Stroke and wing
 * are asked here before the result, which those two refuse.
 *
 * One shot rallies open on End. Every other rally opens on the serve.
 * Defensive is the lit choice before the first attack. Offensive makes that
 * shot the first attack and keeps the walk there until stroke, wing and
 * initiative are in. Next skips a row Save does not need.
 */

import {
  ENDINGS,
  WINGS,
  canSave,
  endShot,
  faDecided,
  flipSwitch,
  isError,
  markFa,
  noAttackOffered,
  roleOf,
  setEnding,
  shotWindow,
  showsStroke,
  strokeCells,
  strokeSide,
  switchOf,
  toggleNoAttack,
  toggleShotField,
  type Draft,
  type Ending,
  type StrokeSide,
} from './rally'

export type SeqStop = { kind: 'shot'; shot: number } | { kind: 'end' }
export type SeqPlace = SeqStop | { kind: 'ready' }

export type SeqRow = 'depth' | 'pair' | 'stroke' | 'wing' | 'initiative'

const RESULT_KEYS = ['q', 'w', 'e', 'r', 't', 'y'] as const
const STROKE_KEYS = ['s', 'd', 'f', 'g', 'h'] as const
const WING_KEYS = ['z', 'x'] as const

/** Where the walk opens once tapping has closed. */
export function openAt(d: Draft): SeqStop {
  if (endShot(d) <= 1) return { kind: 'end' }
  return { kind: 'shot', shot: 1 }
}

/**
 * A shot the walk stops on, given the answers so far.
 * The serve and the last shot always stop (a one shot rally has no serve stop:
 * it opens on End). Before a first attack, every shot stops. After it, the
 * attack and the two replies stop. Later shots do not. No attack skips the
 * middle and stops on the last shot.
 */
export function shouldStop(d: Draft, shot: number): boolean {
  const n = endShot(d)
  if (!Number.isInteger(shot) || shot < 1 || shot > n) return false
  if (n <= 1) return false
  if (shot === 1 || shot === n) return true
  if (d.noAttack) return false
  if (d.fa === null) return true
  return shot <= d.fa + 2
}

/** The side the pair shows. Before the first attack this is Defensive, even when the current mode would light Offensive. */
export function pairSide(d: Draft, shot: number, held?: StrokeSide | null): StrokeSide {
  if (d.fa !== null && shot === d.fa) return 'offensive'
  if (d.fa !== null && shot < d.fa) return 'defensive'
  if (d.noAttack || d.fa === null) return 'defensive'
  const own = strokeSide(d.shots[shot - 1]?.stroke)
  if (own) return own
  if (held) return held
  return switchOf(d, shot).side
}

/** Both halves take a press: the press is the first attack answer, or a flip after it. */
export function pairLive(d: Draft, shot: number): boolean {
  if (shot <= 1 || shot > endShot(d)) return false
  return true
}

/**
 * Rows under the heading. A shot before the attack is the pair alone.
 * Offensive (the first attack) and a reply add stroke, wing and initiative.
 * The last shot always adds stroke and wing, because Save needs them.
 */
export function rowsFor(d: Draft, shot: number): SeqRow[] {
  const n = endShot(d)
  if (shot === 1) return ['depth']
  if (shot < 1 || shot > n) return []
  const last = shot === n
  const before =
    !last &&
    ((d.fa === null && !d.noAttack) || (d.fa !== null && shot < d.fa) || (d.noAttack && shot < n))
  if (before) return ['pair']
  const role = roleOf(d, shot)
  const initiative = role === 'firstAttack' || role === 'reply'
  const rows: SeqRow[] = ['pair', 'stroke', 'wing']
  if (initiative) rows.push('initiative')
  return rows
}

/** True when every section has an answer. Marks do not count. The pair alone never completes by itself: the press moves the walk. */
export function shotComplete(d: Draft, shot: number): boolean {
  const rows = rowsFor(d, shot)
  if (rows.length === 0 || (rows.length === 1 && rows[0] === 'pair')) return false
  const tags = d.shots[shot - 1]
  if (rows.includes('depth') && !tags?.depth) return false
  if (rows.includes('stroke') && !tags?.stroke) return false
  if (rows.includes('wing') && !tags?.wing) return false
  if (rows.includes('initiative') && !tags?.initiative) return false
  return true
}

/**
 * Next is dark while this stop is missing something Save needs:
 * stroke and wing on the first attack or the last shot, and the result on End.
 */
export function nextAllowed(d: Draft, place: SeqStop): boolean {
  if (place.kind === 'end') return Boolean(d.ending) && canSave(d)
  const tags = d.shots[place.shot - 1]
  const needs = place.shot === endShot(d) || d.fa === place.shot
  if (needs && (!tags?.stroke || !tags?.wing)) return false
  return true
}

/** The next stop, or Ready when a Winner or Lucky (or a miss reason) has finished End. */
export function nextStop(d: Draft, from: SeqStop): SeqPlace {
  if (from.kind === 'end') {
    if (!d.ending || !canSave(d)) return from
    if (!isError(d.ending)) return { kind: 'ready' }
    const reason = d.shots[endShot(d) - 1]?.missReason
    return reason ? { kind: 'ready' } : from
  }
  const n = endShot(d)
  for (let shot = from.shot + 1; shot <= n; shot++) {
    if (shouldStop(d, shot)) return { kind: 'shot', shot }
  }
  return { kind: 'end' }
}

/**
 * After a shot that was already passed is answered again: the first shot that
 * is missing something Save needs, else the furthest point, else Ready when
 * End was already answered.
 */
export function afterRevisit(d: Draft, furthest: SeqPlace, endAnswered: boolean): SeqPlace {
  const gap = firstSaveGap(d)
  if (gap) return gap
  if (endAnswered && canSave(d)) return { kind: 'ready' }
  return furthest
}

/** The first shot Save still needs, or End when the result is missing. */
export function firstSaveGap(d: Draft): SeqStop | null {
  const n = endShot(d)
  if (!faDecided(d)) {
    for (let shot = 2; shot <= n; shot++) {
      if (shouldStop(d, shot)) return { kind: 'shot', shot }
    }
  }
  if (d.fa !== null) {
    const tags = d.shots[d.fa - 1]
    if (!tags?.stroke || !tags?.wing) return { kind: 'shot', shot: d.fa }
  }
  if (n > 1) {
    const tags = d.shots[n - 1]
    if (!tags?.stroke || !tags?.wing) return { kind: 'shot', shot: n }
  }
  if (!d.ending) return { kind: 'end' }
  return null
}

export type SidePress = {
  draft: Draft
  /** Leave this shot now. Defensive before the attack, and Next on that shot. */
  advance: boolean
  /** The first attack was marked Defensive: ask the shots after it again. */
  cleared: boolean
  /** A flip the draft does not store (Block, or an empty reply). */
  hold: StrokeSide | null
}

/**
 * Offensive or Defensive.
 * Offensive on a shot that can be the first attack calls `markFa` and stays.
 * Defensive before the attack is not stored, and the walk moves on.
 * Defensive on the last shot, or on a rally with no attack yet at the last
 * shot, calls `toggleNoAttack`. Defensive on the first attack clears it.
 * A reply uses `flipSwitch`.
 */
export function pressSide(d: Draft, shot: number, side: StrokeSide, held?: StrokeSide | null): SidePress {
  const n = endShot(d)
  const stay = (draft: Draft, hold: StrokeSide | null = null): SidePress => ({
    draft,
    advance: false,
    cleared: false,
    hold,
  })
  if (shot <= 1 || shot > n) return stay(d)

  const before =
    (d.fa === null && !d.noAttack) ||
    (d.fa !== null && shot < d.fa) ||
    (d.noAttack && shot < n)

  if (before || (d.fa === null && !d.noAttack && shot === n)) {
    if (side === 'offensive') {
      const next = markFa(d, shot)
      return stay(next)
    }
    if (shot === n) return stay(d.noAttack ? d : noAttackOffered(d) ? toggleNoAttack(d) : d)
    return { draft: d, advance: true, cleared: false, hold: null }
  }

  if (d.noAttack && shot < n && side === 'offensive') return stay(markFa(d, shot))
  if (d.noAttack && shot < n && side === 'defensive') {
    return { draft: d, advance: true, cleared: false, hold: null }
  }

  if (d.fa === shot) {
    if (side === 'offensive') return stay(d)
    if (shot === n) {
      const cleared = markFa(d, shot)
      const next = cleared.noAttack ? cleared : toggleNoAttack(cleared)
      return { draft: next, advance: false, cleared: true, hold: null }
    }
    return { draft: markFa(d, shot), advance: false, cleared: true, hold: null }
  }

  // No attack already, and this is the last shot: Offensive makes it the first attack.
  // A Push, Lob, Chop or Block on show would refuse the pick, so the stroke is
  // cleared first. That is the same rally as picking the shot once its stroke
  // is an attacking one.
  if (d.noAttack && shot === n) {
    if (side === 'defensive') return stay(d)
    const marked = markFa(d, shot)
    if (marked !== d) return stay(marked)
    const shots = d.shots.map((s, i) => {
      if (i !== shot - 1 || !s?.stroke) return s
      const open = { ...s }
      delete open.stroke
      return open
    })
    return stay(markFa({ ...d, shots }, shot))
  }

  const shown = pairSide(d, shot, held)
  if (shown === side) return stay(d)
  if (showsStroke(d, shot) && !switchOf(d, shot).fixed) {
    const flipped = flipSwitch(d, shot)
    if (flipped === d) return stay(d, side)
    return stay(flipped, side)
  }
  return stay(d, side)
}

/** Key 0: Defensive through to the last shot. No attack, and the walk jumps there. */
export function defensiveToEnd(d: Draft): Draft {
  if (d.noAttack || !noAttackOffered(d)) return d
  return toggleNoAttack(d)
}

/** True on a shot that is still being asked Offensive or Defensive. */
export function beforeAttack(d: Draft, shot: number): boolean {
  if (shot <= 1 || shot > endShot(d)) return false
  if (d.noAttack) return false
  if (d.fa === null) return true
  return shot < d.fa
}

export type SeqKey =
  | { kind: 'draft'; draft: Draft; hold?: StrokeSide | null }
  | { kind: 'next' }
  | { kind: 'side'; side: StrokeSide }
  | { kind: 'noAttack' }
  | { kind: 'open'; shot: number }

/**
 * Keys for the walk only. Stroke and wing work before the result is in.
 * N is Next, and on a shot before the attack it means Defensive.
 * A flips the pair. 0 is Defensive to the end. 1 to 9 ask to open that shot
 * (the screen allows it only when the shot was already passed).
 */
export function applySeqKey(d: Draft, place: SeqStop, key: string, held?: StrokeSide | null): SeqKey | null {
  const k = key.toLowerCase()
  if (k === 'n') return { kind: 'next' }
  if (/^[1-9]$/.test(k)) return { kind: 'open', shot: Number(k) }
  if (k === '0') {
    if (place.kind === 'shot' && beforeAttack(d, place.shot)) return { kind: 'noAttack' }
    return null
  }
  if (place.kind === 'end') {
    const index = RESULT_KEYS.indexOf(k as (typeof RESULT_KEYS)[number])
    if (index < 0) return null
    return { kind: 'draft', draft: setEnding(d, ENDINGS[index]) }
  }
  const shot = place.shot
  if (k === 'a') {
    if (shot === 1) return null
    const shown = pairSide(d, shot, held)
    return { kind: 'side', side: shown === 'offensive' ? 'defensive' : 'offensive' }
  }
  const rows = rowsFor(d, shot)
  const wing = WING_KEYS.indexOf(k as (typeof WING_KEYS)[number])
  if (wing >= 0) {
    if (!rows.includes('wing')) return null
    return { kind: 'draft', draft: toggleShotField(d, shot, 'wing', WINGS[wing]) }
  }
  if (!rows.includes('stroke')) return null
  const index = STROKE_KEYS.indexOf(k as (typeof STROKE_KEYS)[number])
  if (index < 0) return null
  const cell = strokeCells(pairSide(d, shot, held), d.fa === shot)[index]
  if (!cell) return null
  const next = toggleShotField(d, shot, 'stroke', cell)
  return next === d ? null : { kind: 'draft', draft: next }
}

/**
 * Blocks of three: 1 to 3, 4 to 6, 7 to 9. The last block is the last three
 * shots when the rally does not land on a block end, so 7 shots are
 * 1 to 3, 4 to 6 and 5 to 7. A shot that sits in two blocks uses the earlier one.
 */
export function blockOf(n: number, shot: number): { from: number; to: number } {
  if (n <= 0) return { from: 1, to: 1 }
  const clamped = Math.min(Math.max(shot, 1), n)
  if (n <= 3) return { from: 1, to: n }
  const groups: { from: number; to: number }[] = []
  for (let start = 1; start + 2 <= n; start += 3) groups.push({ from: start, to: start + 2 })
  if (groups[groups.length - 1].to < n) groups.push({ from: n - 2, to: n })
  return groups.find((g) => clamped >= g.from && clamped <= g.to) ?? groups[groups.length - 1]
}

/**
 * The loop for the block that holds `shot`. The first shot's usual lead to
 * the last shot's usual tail. End uses the last shot's block.
 */
export function blockWindow(d: Draft, shot: number): { a: number; b: number } {
  const n = endShot(d)
  const block = blockOf(n, shot)
  const lead = shotWindow(d, block.from).a
  const tail = shotWindow(d, block.to).b
  return { a: lead, b: Math.max(tail, lead) }
}

/** Result names, for the check and the screen. */
export const SEQ_ENDINGS: readonly Ending[] = ENDINGS
