/**
 * Best + FA (`?flow=bestfa`, the default).
 * Contacts, idle close, then one question per screen in contact order:
 * On rally 1, who served comes first. Then Serve, each later shot, then End.
 * The winner follows from the server, the contact count and End. Point to is
 * asked only when that winner is missing, and never on rally 1.
 * One contact asks End only: Winner is an ace, an error is a serve fault.
 * The last answer saves.
 * Pure: no React, no store. The other flows do not use this file.
 */

import type {
  BestFirst,
  BestMark,
  BestPart,
  BestStep,
  Draft,
  Ending,
  RallyData,
  ShotTags,
  Side,
  Wing,
} from '@/types/rally'
import { hitterOf, otherSide, rallyEnd, rallyStart, serverForWinner, winnerOf } from './rally'

export const BEST_ENDS = ['Winner', 'Net', 'Long', 'Wide'] as const
export type BestEnd = (typeof BEST_ENDS)[number]

export function isBestEnd(value: string): value is BestEnd {
  return (BEST_ENDS as readonly string[]).includes(value)
}

/** The end button that is on. An older BH or FH winner reads as Winner. */
export function bestEndOf(d: { ending: Ending | null; best?: { end?: string } }): BestEnd | null {
  if (!d.ending) return null
  const saved = d.best?.end
  if (saved === 'BH' || saved === 'FH') return d.ending === 'Winner' ? 'Winner' : null
  if (saved && isBestEnd(saved)) return d.ending === saved ? saved : null
  return isBestEnd(d.ending) ? d.ending : null
}

/** Four parts. Rally is the part between Attack and End. */
export const PART_LABEL: Record<BestPart, string> = {
  opening: 'Opening',
  attack: 'Attack',
  rally: 'Rally',
  end: 'End',
}

export const BEST_END_LEN = 3
export const BEST_ATTACK_LEN = 3
/** Shot 4 is asked from this many shots. Below it, shot 4 is already an End shot or the last. */
export const BEST_FOURTH_FROM = 7

export type BestPartSpan = { part: BestPart; from: number; to: number }

/** Every shot from 2 to the last has a stroke question. A long rally does not skip. */
export function bestAsked(n: number, shot: number): boolean {
  return shot >= 2 && shot <= n
}

/** Shots with no stroke question. Empty, because every shot is asked. */
export function unaskedShots(n: number): number[] {
  const out: number[] = []
  for (let k = 2; k <= n; k++) if (!bestAsked(n, k)) out.push(k)
  return out
}

const isAttack = (s: ShotTags | undefined) => s?.stroke === 'Attack'

/**
 * First attack shot, or why there isn't one. Walks from shot 2. An unasked
 * or unanswered shot stops the walk as unknown, unless Who attacked first?
 * is Nobody, which passes the unasked shots.
 */
export function bestOpener(n: number, shots: ShotTags[], first?: BestFirst): number | 'none' | 'unknown' {
  for (let shot = 2; shot <= n; shot++) {
    if (!bestAsked(n, shot)) {
      if (first === 'none') continue
      return 'unknown'
    }
    const s = shots[shot - 1]
    if (!s?.stroke) return 'unknown'
    if (isAttack(s)) return shot
  }
  return 'none'
}

function addPart(parts: BestPartSpan[], part: BestPart, from: number, to: number) {
  if (to < from || from < 1) return
  parts.push({ part, from, to })
}

/**
 * The Rally Row groups, in order. Empty parts are left out.
 * Every shot from 1 to n sits in exactly one part.
 */
export function bestParts(n: number, shots: ShotTags[], first?: BestFirst): BestPartSpan[] {
  if (n <= 0) return []
  if (n === 1) return [{ part: 'opening', from: 1, to: 1 }]
  const o = bestOpener(n, shots, first)
  const parts: BestPartSpan[] = []
  if (typeof o === 'number') {
    addPart(parts, 'opening', 1, o - 1)
    // Attack grows to the end until there is room for a full Attack and a full End.
    if (n < o + BEST_ATTACK_LEN + BEST_END_LEN - 1) {
      addPart(parts, 'attack', o, n)
      return parts
    }
    const attackTo = o + BEST_ATTACK_LEN - 1
    const endFrom = n - BEST_END_LEN + 1
    addPart(parts, 'attack', o, attackTo)
    addPart(parts, 'rally', attackTo + 1, endFrom - 1)
    addPart(parts, 'end', endFrom, n)
    return parts
  }
  // End is the last 3, and it never takes the serve.
  const endFrom = Math.max(2, n - BEST_END_LEN + 1)
  if (o === 'none') {
    addPart(parts, 'opening', 1, endFrom - 1)
    addPart(parts, 'end', endFrom, n)
    return parts
  }
  // Not known: Opening runs to the last asked shot before the unasked ones, so Rally is the unasked shots.
  const openMax = n >= BEST_FOURTH_FROM ? 4 : 3
  const openTo = Math.min(Math.max(1, Math.min(openMax, n - BEST_END_LEN)), endFrom - 1)
  addPart(parts, 'opening', 1, openTo)
  addPart(parts, 'rally', openTo + 1, endFrom - 1)
  addPart(parts, 'end', endFrom, n)
  return parts
}

export function partsOf(d: Pick<Draft, 'contacts' | 'shots' | 'best'>): BestPartSpan[] {
  return bestParts(d.contacts.length, d.shots, d.best?.first)
}

/**
 * Shots after Serve, one page each, including the last. End is not a shot page.
 * Kept so older checks still import it. The walk uses `nextStroke`.
 */
export function endShots(n: number): number[] {
  const out: number[] = []
  for (let k = 2; k <= n; k++) out.push(k)
  return out
}

/** The shot a step tags. End tags the last shot. `shots` is the page open. */
export function stepShot(n: number, step: BestStep, page?: number): number {
  if (step === 'server' || step === 'serve') return 1
  if (step === 'receive') return 2
  if (step === 'third') return 3
  if (step === 'fourth') return 4
  if (step === 'shots') return page !== undefined && page >= 1 && page <= n ? page : n
  return n
}

/** One contact: End (ace or serve fault). Two or more: Serve, shot 2 through the last, End. */
export function questionOrder(n: number): string[] {
  if (n <= 0) return []
  if (n === 1) return ['end']
  const order = ['serve']
  for (let k = 2; k <= n; k++) order.push(`shot ${k}`)
  order.push('end')
  return order
}

/** The stroke grid: top row Attack, bottom row Control. BH left, FH right. */
export const STROKE_GRID: readonly (readonly { wing: Wing; stroke: 'Attack' | 'Control' }[])[] = [
  [
    { wing: 'BH', stroke: 'Attack' },
    { wing: 'FH', stroke: 'Attack' },
  ],
  [
    { wing: 'BH', stroke: 'Control' },
    { wing: 'FH', stroke: 'Control' },
  ],
]

/**
 * Who attacked first? covered shots that were not asked. Every shot is asked
 * now, so this stays false and the question is not shown.
 */
export function asksWhoFirst(d: Pick<Draft, 'contacts' | 'shots'>): boolean {
  const n = d.contacts.length
  if (unaskedShots(n).length === 0) return false
  return !isAttack(d.shots[1]) && !isAttack(d.shots[2]) && !isAttack(d.shots[3])
}

/** The page that carries Who attacked first? */
export function rallyPage(d: Pick<Draft, 'contacts' | 'shots'>, page: number | undefined): boolean {
  return asksWhoFirst(d) && page !== undefined && page === endShots(d.contacts.length)[0]
}

type Q = Pick<Draft, 'server' | 'contacts' | 'shots' | 'ending' | 'best' | 'serveChecked'>

/** Rally one of a set: the server is the set's default until the server switch confirms it. */
export function serverKnown(d: Pick<Draft, 'serveChecked'>, rallyOne: boolean): boolean {
  return !rallyOne || Boolean(d.serveChecked)
}

/**
 * The point once End or the contacts change. A known server gives the winner.
 * With the server not known, Point to stands and the server follows from it.
 */
export function settlePoint(d: Draft, rallyOne: boolean): Draft {
  if (!d.ending) return d
  if (!serverKnown(d, rallyOne)) {
    const point = d.best?.point
    return point ? { ...d, server: serverForWinner(d, point) } : d
  }
  const winner = winnerOf(d)
  if (!winner || d.best?.point === winner) return d
  return { ...d, best: carryBest(d, { point: winner }) }
}

/** The winner is known: from the server, or from Point to while the server is not known. */
export function pointDone(d: Q, rallyOne: boolean): boolean {
  if (!d.ending) return false
  if (!serverKnown(d, rallyOne)) return Boolean(d.best?.point)
  return Boolean(winnerOf(d))
}

/** End is done once the result is in and the winner follows from it. */
export function endDone(d: Q, rallyOne: boolean): boolean {
  return pointDone(d, rallyOne)
}

/** Revisit End or Point to. Absent means the one still to answer. */
export type PadBack = 'end' | 'point' | null

/**
 * The result question. End, then Point to only when the winner does not
 * follow from the server, the contact count and End: rally one, until the
 * server switch is used. A point that disagrees stays on Point to.
 */
export function padFocus(d: Q, rallyOne: boolean, back: PadBack = null): 'end' | 'point' {
  if (rallyOne) return 'end'
  if (back === 'end' || back === 'point') return back
  if (!d.ending) return 'end'
  if (!pointDone(d, rallyOne)) return 'point'
  return 'end'
}

/** The first stroke from shot 2 still open, including the last shot. */
export function nextStroke(d: Pick<Draft, 'contacts' | 'shots'>): number | null {
  const n = d.contacts.length
  for (let k = 2; k <= n; k++) {
    const shot = d.shots[k - 1]
    if (!shot?.wing || !shot.stroke) return k
  }
  return null
}

export type BestAt = { step: BestStep; page?: number }

/** The first question not done, in contact order. Null when every one is: the rally saves. */
export function routeAfter(d: Q, rallyOne: boolean): BestAt | null {
  const n = d.contacts.length
  if (n === 0) return null
  if (rallyOne && !serverKnown(d, true)) return { step: 'server' }
  if (n >= 2) {
    if (!d.shots[0]?.depth) return { step: 'serve' }
    const stroke = nextStroke(d)
    if (stroke) return { step: 'shots', page: stroke }
  }
  if (!endDone(d, rallyOne)) return { step: 'end' }
  return null
}

/** Where the open rally stands. A step the rally no longer has falls back to the route. */
export function bestAt(d: Q, rallyOne: boolean): BestAt {
  const n = d.contacts.length
  if (rallyOne && n > 0 && !serverKnown(d, true)) return { step: 'server' }
  if (n <= 1) return { step: 'end' }
  const step = d.best?.step
  if (step === 'serve' || step === 'end') return { step }
  if (step === 'shots' || step === 'receive' || step === 'third' || step === 'fourth') {
    const page = step === 'receive' ? 2 : step === 'third' ? 3 : step === 'fourth' ? 4 : d.best?.endPage
    if (page !== undefined && page >= 2 && page <= n) return { step: 'shots', page }
  }
  return routeAfter(d, rallyOne) ?? { step: 'serve' }
}

/** What the question area shows: the step, the page, the end phase, and how many contacts. */
export function bestQuestionKey(d: Q, rallyOne: boolean, back: PadBack = null): string {
  if (d.contacts.length === 0) return ''
  const at = bestAt(d, rallyOne)
  const phase = at.step === 'end' ? padFocus(d, rallyOne, back) : ''
  return [at.step, at.page ?? '', phase, d.contacts.length].join(':')
}

/** The question a cell opens. The last cell opens End once that stroke and End are in. One contact opens End. */
export function cellTarget(d: Pick<Draft, 'contacts' | 'shots' | 'ending'>, shot: number): BestAt | null {
  const n = d.contacts.length
  if (shot < 1 || shot > n) return null
  if (n === 1) return { step: 'end' }
  if (shot === 1) return { step: 'serve' }
  const last = d.shots[n - 1]
  if (shot === n && last?.wing && last.stroke && d.ending) return { step: 'end' }
  return { step: 'shots', page: shot }
}

/** now: asked now. done: answered. todo: still to ask. off: not on this rally. */
export type CellMark = 'now' | 'done' | 'todo' | 'off'

/** `at` is the open question, or null on the saved row. */
export function cellMark(d: Q, shot: number, rallyOne: boolean, at: BestAt | null): CellMark {
  const n = d.contacts.length
  if (shot < 1 || shot > n) return 'off'
  if (at?.step === 'end' && shot === n) return 'now'
  if (at?.step === 'serve' && shot === 1) return 'now'
  if (at?.step === 'shots' && at.page === shot) return 'now'
  const done =
    n === 1
      ? endDone(d, rallyOne)
      : shot === 1
        ? Boolean(d.shots[0]?.depth)
        : shot === n && d.ending
          ? endDone(d, rallyOne)
          : Boolean(d.shots[shot - 1]?.wing && d.shots[shot - 1]?.stroke)
  if (done) return 'done'
  return at ? 'todo' : 'off'
}

/** A cell opens when it is the question on screen, or its answer is already in. */
export function canOpenCell(d: Q, shot: number, rallyOne: boolean): boolean {
  if (!cellTarget(d, shot)) return false
  const at = bestAt(d, rallyOne)
  const n = d.contacts.length
  if (at.step === 'end' && shot === n) return true
  if (at.step === 'serve' && shot === 1) return true
  if (at.step === 'shots' && at.page === shot) return true
  if (n === 1) return Boolean(d.ending)
  if (shot === 1) return Boolean(d.shots[0]?.depth)
  return Boolean(d.shots[shot - 1]?.wing && d.shots[shot - 1]?.stroke)
}

/** Taps per rally: one per contact, plus Serve, each later stroke and End. One contact is the contact and End. */
export function bestTaps(n: number): number {
  if (n <= 0) return 0
  if (n === 1) return 2
  return 2 * n + 1
}

/** One `best` object built from a patch. A field set to undefined goes. */
export function carryBest(d: Pick<Draft, 'best'>, patch: Partial<BestMark>): BestMark {
  const merged: BestMark = { ...(d.best ?? { flow: 'bestfa' }), ...patch, flow: 'bestfa' }
  for (const key of Object.keys(merged) as (keyof BestMark)[]) {
    if (merged[key] === undefined) delete merged[key]
  }
  if (merged.review && merged.review.length === 0) delete merged.review
  return merged
}

/** Drops Who attacked first? when it is no longer asked, and review marks of parts that went. */
export function keepBestMarks(d: Draft): Draft {
  if (!d.best) return d
  const alive = new Set(partsOf(d).map((span) => span.part))
  const first = d.best.first && asksWhoFirst(d) ? d.best.first : undefined
  const review = d.best.review?.filter((part) => alive.has(part))
  if (first === d.best.first && (review?.length ?? 0) === (d.best.review?.length ?? 0)) return d
  return { ...d, best: carryBest(d, { first, review }) }
}

export function withStep(d: Draft, at: BestAt): Draft {
  return { ...d, best: carryBest(d, { step: at.step, endPage: at.step === 'shots' ? at.page : undefined }) }
}

/** After an answer: the next question opens, or the rally saves when none remain. */
export function bestAdvance(d: Draft, rallyOne: boolean): { draft: Draft; save: boolean } {
  const at = routeAfter(d, rallyOne)
  if (!at) {
    const winner = winnerOf(d)
    const draft = winner && d.best?.point !== winner ? { ...d, best: carryBest(d, { point: winner }) } : d
    return { draft, save: true }
  }
  return { draft: withStep(d, at), save: false }
}

/** A contact that moves into the serve slot is the serve. It does not keep the stroke of the shot it used to be. */
function withoutServeStroke(shot: ShotTags | undefined): ShotTags {
  if (!shot) return {}
  const { wing: _wing, stroke: _stroke, ...rest } = shot
  return rest
}

/**
 * Drop one contact. Tags stay with the contacts that remain. Removing the
 * last contact clears End, because End belonged to that shot. When End stays,
 * the winner is worked out again from the new count.
 */
export function removeBestContact(d: Draft, shot: number, rallyOne = false): Draft {
  const i = shot - 1
  if (i < 0 || i >= d.contacts.length || d.contacts.length < 2) return d
  const shots = d.shots.filter((_, j) => j !== i)
  if (i === 0) shots[0] = withoutServeStroke(shots[0])
  const removedLast = shot === d.contacts.length
  const next: Draft = {
    ...d,
    contacts: d.contacts.filter((_, j) => j !== i),
    shots,
    start: i === 0 ? null : d.start,
    end: removedLast ? null : d.end,
    ending: removedLast ? null : d.ending,
    fa: null,
    best: carryBest(d, removedLast ? { kept: undefined, end: undefined, point: undefined } : { kept: undefined }),
  }
  const kept = keepBestMarks(next)
  if (removedLast) return kept
  return settlePoint(kept, rallyOne)
}

/** Delete last. Before the serve is answered, Serve can offer Delete first instead. */
export function bestDeleteLast(d: Draft): Draft {
  const n = d.contacts.length
  if (n < 2) return d
  const cut = d.shots[0]?.depth ? undefined : d.contacts[n - 1]
  const next = removeBestContact(d, n)
  return { ...next, best: carryBest(next, { cut }) }
}

export function bestDeleteFirst(d: Draft, rallyOne = false): Draft {
  const next = removeBestContact(d, 1, rallyOne)
  return { ...next, best: carryBest(next, { cut: undefined }) }
}

/** Switch server: every hitter flips, and so does a worked out winner. Keep as is goes, so the check runs again. */
export function bestSwitchServer(d: Draft, rallyOne = false): Draft {
  const next = keepBestMarks({ ...d, server: otherSide(d.server), serveChecked: true, best: carryBest(d, { kept: undefined }) })
  return settlePoint(next, rallyOne)
}

/** Rally 1: the answer to who served. The later questions then know the winner. */
export function bestSetServer(d: Draft, side: Side): Draft {
  return { ...d, server: side, serveChecked: true, best: carryBest(d, { kept: undefined }) }
}

/** Point to. Rally 1 does not ask it: who served already names the server. */
export function bestSetPoint(d: Draft, side: Side, rallyOne: boolean): Draft {
  const server = rallyOne && d.ending ? serverForWinner(d, side) : d.server
  return { ...d, server, best: carryBest(d, { point: side }) }
}

export function bestSetEnd(d: Draft, end: BestEnd, rallyOne = false): Draft {
  return settlePoint({ ...d, ending: end, best: carryBest(d, { end }) }, rallyOne)
}

/** One serve tap: length in `depth`, landing corner in `wing`. Right-handers: BH left, FH right. */
export function setDepth(d: Draft, depth: string, wing?: Wing): Draft {
  const shots = d.shots.slice()
  shots[0] = wing ? { ...shots[0], depth, wing } : { ...shots[0], depth }
  return { ...d, shots, best: carryBest(d, { cut: undefined }) }
}

export function setWingStroke(d: Draft, shot: number, wing: Wing, stroke: string): Draft {
  const shots = d.shots.slice()
  const i = shot - 1
  shots[i] = { ...shots[i], wing, stroke }
  return keepBestMarks({ ...d, shots })
}

export function toggleReview(d: Draft, part: BestPart): Draft {
  const have = new Set(d.best?.review ?? [])
  if (have.has(part)) have.delete(part)
  else have.add(part)
  const review = partsOf(d)
    .map((span) => span.part)
    .filter((p) => have.has(p))
  return { ...d, best: carryBest(d, { review }) }
}

/** The part review opens on: the first marked part, or Opening when none is marked. */
export function reviewFocusOf(d: Draft): BestPart | null {
  const parts = partsOf(d)
  if (parts.length === 0) return null
  const marked = d.best?.review ?? []
  return parts.find((span) => marked.includes(span.part))?.part ?? parts[0].part
}

/** Back and Forward wrap through the parts, as Edit Rally wraps through its stops. */
export function stepPart(parts: BestPart[], focus: BestPart, by: -1 | 1): BestPart {
  if (parts.length === 0) return focus
  const at = parts.indexOf(focus)
  const i = at < 0 ? 0 : at
  return parts[(i + by + parts.length) % parts.length]
}

/** Who hits each shot, from the server and the shot number. Later shots move when a contact is removed. */
export function bestHitters(d: Pick<Draft, 'server' | 'contacts'>): Side[] {
  return d.contacts.map((_, i) => hitterOf(d.server, i + 1))
}

export type BestWindow = { a: number; b: number }

/** Milliseconds. Paul tunes these on the video while prototyping. */
export type BestTiming = {
  reaction: number
  lead: number
  end: number
}

export const DEFAULT_BEST_TIMING: BestTiming = {
  reaction: 0,
  lead: 500,
  end: 300,
}

/** Shot loops play at this rate. Lead and end are playback time, so the video window is those times times this rate. */
export const BEST_SHOT_RATE = 0.75

/**
 * One shot. `lead` and `end` are milliseconds of playback, so they scale with `rate`
 * (at 0.75x, 200 ms of playback is 150 ms of video). The reaction buffer is not applied here.
 */
export function shotLoop(contact: number, next: number, timing: BestTiming, rate = BEST_SHOT_RATE): BestWindow {
  const lead = (timing.lead / 1000) * rate
  const tail = (timing.end / 1000) * rate
  const a = contact - lead
  const b = Math.max(next - tail, a)
  return { a, b }
}

/** What a loop plays: a question, or the whole rally. */
export type BestLoopWhat = BestAt | 'rally'

/** Edit Rally stops: shot 1 through the last shot, then End. */
export type EditStop = number | 'end'

export function editStopList(n: number): EditStop[] {
  const stops: EditStop[] = []
  for (let shot = 1; shot <= n; shot++) stops.push(shot)
  stops.push('end')
  return stops
}

/** Back and Forward wrap. Forward on End is shot 1. Back on shot 1 is End. */
export function stepEditStop(n: number, stop: EditStop, by: -1 | 1): EditStop {
  const stops = editStopList(Math.max(1, n))
  const at = stops.findIndex((item) => item === stop)
  const i = at < 0 ? 0 : at
  return stops[(i + by + stops.length) % stops.length]
}

/**
 * The video window for an Edit Rally stop. Shot 1 starts a second before the
 * serve. Later shots use the shot loop. End loops the last shot.
 */
export function editStopWindow(
  d: Draft,
  stop: EditStop,
  timing: BestTiming = DEFAULT_BEST_TIMING,
  serveBefore = 1,
  serveAfter = 0.5,
): BestWindow {
  if (stop === 1) {
    const contact = d.contacts[0] ?? rallyStart(d)
    const next = d.contacts[1] ?? rallyEnd(d)
    return { a: contact - serveBefore, b: Math.max(contact + serveAfter, Math.min(next, contact + serveAfter)) }
  }
  if (stop === 'end') return bestLoop(d, { step: 'end' }, timing)
  return bestLoop(d, { step: 'shots', page: stop }, timing)
}

/**
 * The video window for one part, at 1x. It starts at the lead before the
 * part's first contact. A part that starts on shot 1 starts a second before
 * the serve, as Edit Rally's shot 1 does. The last shot of the rally, including
 * End, runs to the rally end.
 */
export function partWindow(
  d: Draft,
  span: BestPartSpan,
  timing: BestTiming = DEFAULT_BEST_TIMING,
  serveBefore = 1,
): BestWindow {
  const n = d.contacts.length
  const start = rallyStart(d)
  const end = rallyEnd(d)
  const contactAt = (k: number) => d.contacts[k - 1] ?? start
  const after = (k: number) => (k < n ? (d.contacts[k] ?? end) : end)
  const a = span.from <= 1 ? contactAt(1) - serveBefore : shotLoop(contactAt(span.from), after(span.from), timing, 1).a
  const b = span.to >= n ? end : shotLoop(contactAt(span.to), after(span.to), timing, 1).b
  return { a, b: Math.max(b, a) }
}

/**
 * Loop the shot being asked, at `rate` (0.75 unless a caller says otherwise).
 * It starts `lead` of playback before that contact and ends `end` of playback
 * before the next contact, or at the start, whichever is later. The
 * last shot runs to the rally end. The page with Who attacked first? loops from the
 * first unasked shot to its own shot. Times are seconds in the rally's video.
 */
export function bestLoop(
  d: Draft,
  what: BestLoopWhat,
  timing: BestTiming = DEFAULT_BEST_TIMING,
  rate = BEST_SHOT_RATE,
): BestWindow {
  const start = rallyStart(d)
  const end = rallyEnd(d)
  if (what === 'rally' || what.step === 'server') return { a: start, b: end }
  const n = d.contacts.length
  const shot = stepShot(n, what.step, what.page)
  const contactAt = (k: number) => d.contacts[k - 1] ?? start
  const after = (k: number) => (k < n ? (d.contacts[k] ?? end) : end)
  if (what.step === 'shots' && rallyPage(d, what.page)) {
    const from = unaskedShots(n)[0] ?? shot
    return shotLoop(contactAt(from), after(shot), timing, rate)
  }
  return shotLoop(contactAt(shot), after(shot), timing, rate)
}

export function bestFlowOf(s: { draft: Draft | null; rallies: RallyData[] }): 'bestfa' | null {
  if (s.draft?.best?.flow === 'bestfa') return 'bestfa'
  if (s.rallies[s.rallies.length - 1]?.idea?.flow === 'bestfa') return 'bestfa'
  return null
}

/** Where to pick this set up. Null on every other flow. */
export function bestPlace(s: { draft: Draft | null; rallies: RallyData[]; finished?: boolean }): string | null {
  if (s.finished || !bestFlowOf(s)) return null
  const n = s.rallies.length + 1
  if (s.draft && s.draft.contacts.length > 0 && s.draft.closed) return `Rally ${n}, details`
  return `Rally ${n}, live`
}

/** The saved rally. Strokes are kept on asked shots only. The serve keeps its landing wing. */
export function bestRally(d: Draft, id: string, winner: Side, kept: boolean): RallyData {
  const n = d.contacts.length
  const first = d.best?.first
  const opener = bestOpener(n, d.shots, first)
  const end = bestEndOf(d)
  const endLabel = n === 1 && end ? (end === 'Winner' ? 'Ace' : 'Serve fault') : end
  const order = partsOf(d).map((span) => span.part)
  const review = order.filter((part) => d.best?.review?.includes(part))
  const shots = d.shots.map((shot, i) => {
    if (bestAsked(n, i + 1) || (!shot.wing && !shot.stroke)) return { ...shot }
    const { wing, stroke: _stroke, ...rest } = shot
    return i === 0 && wing ? { ...rest, wing } : rest
  })
  return {
    id,
    videoId: d.videoId,
    server: d.server,
    contacts: [...d.contacts],
    start: rallyStart(d),
    end: rallyEnd(d),
    ending: d.ending,
    fa: typeof opener === 'number' ? opener : null,
    shots,
    winner,
    serveChecked: true,
    idea: {
      flow: 'bestfa',
      ...(d.shots[0]?.depth ? { serve: d.shots[0].depth } : {}),
      ...(endLabel ? { result: endLabel } : {}),
      ...(first ? { first } : {}),
      ...(review.length ? { review } : {}),
      ...(kept ? { check: 'Check the point' } : {}),
    },
  }
}

/** A saved rally back as a closed draft, every answer in, so a cell can reopen one question. */
export function draftFromRally(r: RallyData): Draft {
  const end = bestEndOf(r)
  return {
    videoId: r.videoId,
    server: r.server,
    contacts: [...r.contacts],
    closed: true,
    start: r.start,
    end: r.end,
    ending: r.ending,
    fa: r.fa,
    noAttack: false,
    shots: r.shots.map((s) => ({ ...s })),
    serveChecked: true,
    best: carryBest(
      {},
      {
        end: end ?? undefined,
        point: r.winner,
        kept: r.idea?.check ? true : undefined,
        first: r.idea?.first,
        review: r.idea?.review,
      }
    ),
  }
}

