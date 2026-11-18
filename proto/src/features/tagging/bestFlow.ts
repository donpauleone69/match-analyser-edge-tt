/**
 * Best + FA (`?flow=bestfa`, the default).
 * Contacts, idle close, then the questions on the Rally Row: the last shot
 * with End and Point to, then Serve, Receive, Third, shot 4 on 7 shots or
 * more, then every later shot in rally order. Every shot is asked. The last
 * answer saves.
 * Pure: no React, no store. The other flows do not use this file.
 */

import {
  rallyEnd,
  rallyStart,
  hitterOf,
  otherSide,
  serverForWinner,
  winnerOf,
  type BestFirst,
  type BestMark,
  type BestPart,
  type BestStep,
  type Draft,
  type Ending,
  type RallyData,
  type ShotTags,
  type Side,
  type Wing,
} from './rally'

export type { BestFirst, BestPart, BestStep }

export const BEST_SERVE = ['Short', 'Long'] as const
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

export const BEST_STEPS: readonly BestStep[] = ['end', 'serve', 'receive', 'third', 'fourth', 'shots']

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
 * Shots asked after the named early ones, one page each, in rally order.
 * Shot 4 is its own step from 7 shots. The last shot is asked first, on End.
 */
export function endShots(n: number): number[] {
  const out: number[] = []
  const from = n >= BEST_FOURTH_FROM ? 5 : 4
  for (let k = from; k <= n - 1; k++) out.push(k)
  return out
}

export function stepsFor(d: Pick<Draft, 'contacts'>): BestStep[] {
  const n = d.contacts.length
  return BEST_STEPS.filter((s) => {
    if (s === 'serve') return n >= 2
    if (s === 'receive') return n >= 3
    if (s === 'third') return n >= 4
    if (s === 'fourth') return n >= BEST_FOURTH_FROM
    if (s === 'shots') return endShots(n).length > 0
    return true
  })
}

/** The shot a step tags. End tags the last shot, `shots` the page open. */
export function stepShot(n: number, step: BestStep, page?: number): number {
  if (step === 'serve') return 1
  if (step === 'receive') return 2
  if (step === 'third') return 3
  if (step === 'fourth') return 4
  if (step === 'shots') return page ?? endShots(n)[0] ?? n
  return n
}

/** Attack after an asked attack is a Counter. It saves as Attack and is read from the shot before. */
export function counterAt(d: Pick<Draft, 'contacts' | 'shots'>, shot: number): boolean {
  const n = d.contacts.length
  return shot >= 3 && bestAsked(n, shot - 1) && isAttack(d.shots[shot - 2])
}

export type StrokeRole = 'Attack' | 'Counter' | 'Control'

export function strokeRole(d: Pick<Draft, 'contacts' | 'shots'>, shot: number): StrokeRole | null {
  const s = d.shots[shot - 1]
  if (!s?.stroke) return null
  if (s.stroke !== 'Attack') return 'Control'
  return counterAt(d, shot) ? 'Counter' : 'Attack'
}

/** The stroke grid: top row Attack, or Counter after an attack. Bottom row Control. BH left, FH right. */
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

export function strokeLabel(d: Pick<Draft, 'contacts' | 'shots'>, shot: number, wing: Wing, stroke: string): string {
  if (stroke !== 'Attack') return `${wing} Control`
  return `${wing} ${counterAt(d, shot) ? 'Counter' : 'Attack'}`
}

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

/** The winner End, the server and the contact count give. None on rally one, where the server is not known. */
export function bestHint(d: Pick<Draft, 'server' | 'contacts' | 'ending'>, rallyOne: boolean): Side | null {
  if (rallyOne) return null
  return winnerOf(d)
}

export function bestMismatch(d: Pick<Draft, 'server' | 'contacts' | 'ending' | 'best'>, rallyOne: boolean): boolean {
  const point = d.best?.point
  if (rallyOne || !point || !d.ending || d.best?.kept) return false
  const hint = bestHint(d, rallyOne)
  return hint !== null && hint !== point
}

const possessive = (side: Side, names: Record<Side, string>) => (side === 'me' ? 'yours' : `${names[side]}'s`)

/** One plain line: "Point to Kim, but shot 10, the winner, is yours." */
export function mismatchLine(d: Pick<Draft, 'server' | 'contacts' | 'ending' | 'best'>, names: Record<Side, string>): string {
  const point = d.best?.point
  const n = d.contacts.length
  if (!point || !d.ending || n === 0) return ''
  const end = bestEndOf(d) ?? d.ending
  const what = end === 'Winner' ? 'the winner' : `the ${end.toLowerCase()} error`
  return `Point to ${names[point]}, but shot ${n}, ${what}, is ${possessive(hitterOf(d.server, n), names)}.`
}

type Q = Pick<Draft, 'server' | 'contacts' | 'shots' | 'ending' | 'best'>

export function pointDone(d: Q, rallyOne: boolean): boolean {
  return Boolean(d.ending && d.best?.point) && !bestMismatch(d, rallyOne)
}

/** End is done once the point agrees and, on 2 shots or more, the last stroke is in. */
export function endDone(d: Q, rallyOne: boolean): boolean {
  const n = d.contacts.length
  return pointDone(d, rallyOne) && (n < 2 || Boolean(d.shots[n - 1]?.stroke))
}

export function nextEndShot(d: Pick<Draft, 'contacts' | 'shots'>): number | null {
  return endShots(d.contacts.length).find((k) => !d.shots[k - 1]?.stroke) ?? null
}

export function stepDone(d: Q, step: BestStep, rallyOne: boolean): boolean {
  if (step === 'end') return endDone(d, rallyOne)
  if (step === 'serve') return Boolean(d.shots[0]?.depth)
  if (step === 'shots') return nextEndShot(d) === null
  return Boolean(d.shots[stepShot(d.contacts.length, step) - 1]?.stroke)
}

export type BestAt = { step: BestStep; page?: number }

/** The first question not done, in order. Null when every one is: the rally saves. */
export function routeAfter(d: Q, rallyOne: boolean): BestAt | null {
  if (bestMismatch(d, rallyOne)) return { step: 'end' }
  const step = stepsFor(d).find((s) => !stepDone(d, s, rallyOne))
  if (!step) return null
  return step === 'shots' ? { step, page: nextEndShot(d) ?? endShots(d.contacts.length)[0] } : { step }
}

/** Where the open rally stands. A step the rally no longer has falls back to the route. */
export function bestAt(d: Q, rallyOne: boolean): BestAt {
  if (bestMismatch(d, rallyOne)) return { step: 'end' }
  const step = d.best?.step
  const n = d.contacts.length
  if (step && stepsFor(d).includes(step)) {
    if (step !== 'shots') return { step }
    const ks = endShots(n)
    const page = d.best?.endPage
    return { step, page: page !== undefined && ks.includes(page) ? page : (nextEndShot(d) ?? ks[0]) }
  }
  return routeAfter(d, rallyOne) ?? { step: 'end' }
}

/** The question a cell opens. Null for a shot that is never asked and not covered by Who attacked first? */
export function cellTarget(d: Pick<Draft, 'contacts' | 'shots'>, shot: number): BestAt | null {
  const n = d.contacts.length
  if (shot < 1 || shot > n) return null
  if (shot === n) return { step: 'end' }
  if (shot === 1) return { step: 'serve' }
  if (shot === 2) return { step: 'receive' }
  if (shot === 3) return { step: 'third' }
  if (shot === 4 && n >= BEST_FOURTH_FROM) return { step: 'fourth' }
  const ks = endShots(n)
  if (ks.includes(shot)) return { step: 'shots', page: shot }
  if (asksWhoFirst(d)) return { step: 'shots', page: ks[0] }
  return null
}

const isWhoCell = (d: Pick<Draft, 'contacts' | 'shots'>, shot: number) =>
  asksWhoFirst(d) && unaskedShots(d.contacts.length).includes(shot)

/** now: asked now. done: answered. todo: still to ask. off: not asked, or Who attacked first? skipped. */
export type CellMark = 'now' | 'done' | 'todo' | 'off'

/** `at` is the open question, or null on the saved row. */
export function cellMark(d: Q, shot: number, rallyOne: boolean, at: BestAt | null): CellMark {
  const t = cellTarget(d, shot)
  if (!t) return 'off'
  if (at && t.step === at.step && (t.step !== 'shots' || t.page === at.page)) return 'now'
  if (isWhoCell(d, shot)) {
    if (d.best?.first) return 'done'
    const ks = endShots(d.contacts.length)
    return !at || d.shots[ks[0] - 1]?.stroke ? 'off' : 'todo'
  }
  const n = d.contacts.length
  const done =
    shot === n ? endDone(d, rallyOne) : shot === 1 ? Boolean(d.shots[0]?.depth) : Boolean(d.shots[shot - 1]?.stroke)
  if (done) return 'done'
  return at ? 'todo' : 'off'
}

/** Only the last cell opens until the point agrees, and while it disagrees. */
export function canOpenCell(d: Q, shot: number, rallyOne: boolean): boolean {
  const t = cellTarget(d, shot)
  if (!t) return false
  return t.step === 'end' || pointDone(d, rallyOne)
}

/** Taps per rally: one per contact and one per required answer. Who attacked first? is not counted. */
export function bestTaps(n: number): number {
  if (n <= 0) return 0
  const steps = stepsFor({ contacts: Array.from({ length: n }, (_, i) => i) })
  let answers = 2
  if (n >= 2) answers += 1
  for (const s of steps) {
    if (s === 'serve' || s === 'receive' || s === 'third' || s === 'fourth') answers += 1
  }
  return n + answers + endShots(n).length
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

/** After an answer: the first question not done opens, or the rally saves when there is none. */
export function bestAdvance(d: Draft, rallyOne: boolean): { draft: Draft; save: boolean } {
  const at = routeAfter(d, rallyOne)
  return at ? { draft: withStep(d, at), save: false } : { draft: d, save: true }
}

/** A contact that moves into the serve slot is the serve. It does not keep the stroke of the shot it used to be. */
function withoutServeStroke(shot: ShotTags | undefined): ShotTags {
  if (!shot) return {}
  const { wing: _wing, stroke: _stroke, ...rest } = shot
  return rest
}

/**
 * Drop one contact. Tags stay with the contacts that remain. End and Point to stay:
 * they describe the real last shot and the point, not a contact. Keep as is goes.
 */
export function removeBestContact(d: Draft, shot: number): Draft {
  const i = shot - 1
  if (i < 0 || i >= d.contacts.length || d.contacts.length < 2) return d
  const shots = d.shots.filter((_, j) => j !== i)
  if (i === 0) shots[0] = withoutServeStroke(shots[0])
  const next: Draft = {
    ...d,
    contacts: d.contacts.filter((_, j) => j !== i),
    shots,
    start: i === 0 ? null : d.start,
    end: i === d.contacts.length - 1 ? null : d.end,
    fa: null,
    best: carryBest(d, { kept: undefined }),
  }
  return keepBestMarks(next)
}

/** Delete last. Before the serve is answered, Serve can offer Delete first instead. */
export function bestDeleteLast(d: Draft): Draft {
  const n = d.contacts.length
  if (n < 2) return d
  const cut = d.shots[0]?.depth ? undefined : d.contacts[n - 1]
  const next = removeBestContact(d, n)
  return { ...next, best: carryBest(next, { cut }) }
}

export function bestDeleteFirst(d: Draft): Draft {
  const next = removeBestContact(d, 1)
  return { ...next, best: carryBest(next, { cut: undefined }) }
}

/** Shot 1 was the toss after all: the contact Delete last took comes back with the last stroke, and shot 1 goes. */
export function bestTossInstead(d: Draft): Draft {
  const cut = d.best?.cut
  const n = d.contacts.length
  if (cut === undefined || n < 1) return d
  const last = d.shots[n - 1] ?? {}
  const { wing, stroke, ...lastRest } = last
  const shots = [...d.shots.slice(0, n - 1), lastRest, wing && stroke ? { wing, stroke } : {}]
  const back: Draft = { ...d, contacts: [...d.contacts, cut], shots, end: null }
  const next = removeBestContact(back, 1)
  return { ...next, best: carryBest(next, { cut: undefined }) }
}

/** Switch server: every hitter flips. Keep as is goes, so the check runs again. */
export function bestSwitchServer(d: Draft): Draft {
  return keepBestMarks({ ...d, server: otherSide(d.server), serveChecked: true, best: carryBest(d, { kept: undefined }) })
}

/** Point to. On rally one it also sets the server, since nothing else knows it yet. */
export function bestSetPoint(d: Draft, side: Side, rallyOne: boolean): Draft {
  const server = rallyOne && d.ending ? serverForWinner(d, side) : d.server
  return { ...d, server, best: carryBest(d, { point: side }) }
}

export function bestSetEnd(d: Draft, end: BestEnd): Draft {
  return { ...d, ending: end, best: carryBest(d, { end }) }
}

export function setDepth(d: Draft, depth: string): Draft {
  const shots = d.shots.slice()
  shots[0] = { ...shots[0], depth }
  return { ...d, shots, best: carryBest(d, { cut: undefined }) }
}

export function setWingStroke(d: Draft, shot: number, wing: Wing, stroke: string): Draft {
  const shots = d.shots.slice()
  const i = shot - 1
  shots[i] = { ...shots[i], wing, stroke }
  return keepBestMarks({ ...d, shots })
}

/** Tap the chosen answer again to clear it. */
export function bestSetFirst(d: Draft, first: BestFirst): Draft {
  return keepBestMarks({ ...d, best: carryBest(d, { first: d.best?.first === first ? undefined : first }) })
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
  min: number
}

export const DEFAULT_BEST_TIMING: BestTiming = {
  reaction: 300,
  lead: 200,
  end: 200,
  min: 1000,
}

const TIMING_KEY = 'edge-tt.best-timing'

function timingNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 10000) return fallback
  return Math.round(n)
}

export function loadBestTiming(): BestTiming {
  try {
    const raw = localStorage.getItem(TIMING_KEY)
    if (!raw) return DEFAULT_BEST_TIMING
    const parsed = JSON.parse(raw) as Partial<BestTiming>
    return {
      reaction: timingNumber(parsed.reaction, DEFAULT_BEST_TIMING.reaction),
      lead: timingNumber(parsed.lead, DEFAULT_BEST_TIMING.lead),
      end: timingNumber(parsed.end, DEFAULT_BEST_TIMING.end),
      min: timingNumber(parsed.min, DEFAULT_BEST_TIMING.min),
    }
  } catch {
    return DEFAULT_BEST_TIMING
  }
}

export function saveBestTiming(timing: BestTiming) {
  try {
    localStorage.setItem(TIMING_KEY, JSON.stringify(timing))
  } catch {
    // A private browser can refuse the write. The values still apply for this visit.
  }
}

/** Answer layout. Buttons is the v0.13.1 cells. Pad is the corner pad. Same questions either way. */
export type AnswerLayout = 'buttons' | 'pad'

const LAYOUT_KEY = 'edge-tt.answer-layout'

export function loadAnswerLayout(): AnswerLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    if (raw === 'buttons' || raw === 'pad') return raw
  } catch {
    // A private browser can refuse the read. The pad is the layout for this version.
  }
  return 'pad'
}

export function saveAnswerLayout(layout: AnswerLayout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout)
  } catch {
    // The choice still applies for this visit.
  }
}

/** Shot loops play at this rate. Lead, end and minimum are playback time, so the video window is those times times this rate. */
export const BEST_SHOT_RATE = 0.75

/**
 * One shot. `lead`, `end` and `min` are milliseconds of playback, so they scale with `rate`
 * (at 0.75x, 200 ms of playback is 150 ms of video). The reaction buffer is not applied here.
 */
export function shotLoop(contact: number, next: number, timing: BestTiming, rate = BEST_SHOT_RATE): BestWindow {
  const lead = (timing.lead / 1000) * rate
  const tail = (timing.end / 1000) * rate
  const min = (timing.min / 1000) * rate
  const a = contact - lead
  const b = Math.max(next - tail, a + min)
  return { a, b }
}

/** What a loop plays: a question, the whole rally, or Add missed from the serve. */
export type BestLoopWhat = BestAt | 'rally' | 'add'

/**
 * Loop the shot being asked, at `rate` (0.75 unless a caller says otherwise).
 * It starts `lead` of playback before that contact and ends `end` of playback
 * before the next contact, or `min` after the start, whichever is later. The
 * last shot runs to the rally end. While the point does not add up, End loops
 * the last two contacts. The page with Who attacked first? loops from the
 * first unasked shot to its own shot. Times are seconds in the rally's video.
 */
export function bestLoop(
  d: Draft,
  what: BestLoopWhat,
  timing: BestTiming = DEFAULT_BEST_TIMING,
  rate = BEST_SHOT_RATE,
  mismatch = false,
): BestWindow {
  const start = rallyStart(d)
  const end = rallyEnd(d)
  if (what === 'rally') return { a: start, b: end }
  if (what === 'add') return { a: d.contacts[0] ?? start, b: end }
  const n = d.contacts.length
  const shot = stepShot(n, what.step, what.page)
  const contactAt = (k: number) => d.contacts[k - 1] ?? start
  const after = (k: number) => (k < n ? (d.contacts[k] ?? end) : end)
  if (what.step === 'end' && mismatch && n >= 2) return shotLoop(contactAt(n - 1), end, timing, rate)
  if (what.step === 'shots' && rallyPage(d, what.page)) {
    const from = unaskedShots(n)[0] ?? shot
    return shotLoop(contactAt(from), after(shot), timing, rate)
  }
  return shotLoop(contactAt(shot), after(shot), timing, rate)
}

/**
 * Video window for one part. Shot 1 starts at the rally start. The last part ends at the rally end.
 * Anything else starts the lead before its first contact and ends the end offset before the next part.
 */
export function partWindow(d: Draft, part: BestPart, timing: BestTiming = DEFAULT_BEST_TIMING): BestWindow {
  const parts = partsOf(d)
  const i = parts.findIndex((span) => span.part === part)
  const start = rallyStart(d)
  const end = rallyEnd(d)
  if (i < 0) return { a: start, b: end }
  const cur = parts[i]
  const next = parts[i + 1]
  const lead = timing.lead / 1000
  const tail = timing.end / 1000
  const a = cur.from <= 1 ? start : (d.contacts[cur.from - 1] ?? start) - lead
  const b = next ? (d.contacts[next.from - 1] ?? end) - tail : end
  return { a, b: Math.max(a, b) }
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

/** The saved rally. Strokes are kept on asked shots only. The first attack is a shot when it is known. */
export function bestRally(d: Draft, id: string, winner: Side, kept: boolean): RallyData {
  const n = d.contacts.length
  const first = d.best?.first
  const opener = bestOpener(n, d.shots, first)
  const endLabel = bestEndOf(d)
  const order = partsOf(d).map((span) => span.part)
  const review = order.filter((part) => d.best?.review?.includes(part))
  const shots = d.shots.map((shot, i) => {
    if (bestAsked(n, i + 1) || (!shot.wing && !shot.stroke)) return { ...shot }
    const { wing: _wing, stroke: _stroke, ...rest } = shot
    return rest
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
    highlight: d.highlight,
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

/** Rally list. "Review Rally, End", in row order. */
export function reviewLine(r: { contacts: number[]; shots: ShotTags[]; idea?: { review?: BestPart[]; first?: BestFirst } }): string {
  const review = r.idea?.review
  if (!review?.length) return ''
  const shown = bestParts(r.contacts.length, r.shots, r.idea?.first)
    .map((span) => span.part)
    .filter((part) => review.includes(part))
  if (!shown.length) return ''
  return `Review ${shown.map((part) => PART_LABEL[part]).join(', ')}`
}

/** Rally list. "FA 8", or the Who attacked first? answer when the shot is not known. */
export function faLine(
  r: { fa: number | null; idea?: { flow?: string; first?: BestFirst } },
  names: Record<Side, string>,
): string {
  if (r.fa !== null) return `FA ${r.fa}`
  if (r.idea?.flow !== 'bestfa' || !r.idea.first) return ''
  return `FA ${r.idea.first === 'none' ? 'Nobody' : names[r.idea.first]}`
}
