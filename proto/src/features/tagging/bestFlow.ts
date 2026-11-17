/**
 * Best (`?flow=best`) and Best + FA (`?flow=bestfa`).
 * Contacts, idle close, that rally's steps, then play on.
 * The other flows do not use this file.
 */

import {
  rallyEnd,
  rallyStart,
  hitterOf,
  winnerOf,
  type BestPart,
  type Draft,
  type Ending,
  type RallyData,
  type ShotTags,
  type Side,
  type Wing,
} from './rally'

export type { BestPart }

export const BEST_SHOTS = [
  { wing: 'FH', stroke: 'Attack', label: 'FH attack' },
  { wing: 'BH', stroke: 'Attack', label: 'BH attack' },
  { wing: 'FH', stroke: 'Control', label: 'FH control' },
  { wing: 'BH', stroke: 'Control', label: 'BH control' },
] as const
export const BEST_SERVE = ['Short', 'Long'] as const
/** Winners first, then errors. BH and FH mean the last hitter won on that wing. */
export const BEST_ENDS = ['BH', 'FH', 'Net', 'Long', 'Wide'] as const
export type BestEnd = (typeof BEST_ENDS)[number]
const BEST_WIN_ENDS = new Set<BestEnd>(['BH', 'FH'])

export function isBestEnd(value: string): value is BestEnd {
  return (BEST_ENDS as readonly string[]).includes(value)
}

/** BH and FH store as Winner so the last hitter takes the point. Errors store as themselves. */
export function endingForBest(end: BestEnd): Ending {
  if (end === 'BH' || end === 'FH') return 'Winner'
  return end
}

/** The end button that is on. Nothing is on until one is pressed, including a plain Winner from an older rally. */
export function bestEndOf(d: { ending: Ending | null; best?: { end?: string } }): BestEnd | null {
  if (!d.ending) return null
  const saved = d.best?.end
  if (!saved || !isBestEnd(saved)) return null
  if (BEST_WIN_ENDS.has(saved)) return d.ending === 'Winner' ? saved : null
  return d.ending === saved ? saved : null
}
export const BEST_STEPS = ['serve', 'receive', 'third', 'middle', 'finish'] as const

export type BestStep = (typeof BEST_STEPS)[number]
export type BestFlowName = 'best' | 'bestfa'
export type MiddleAnswer = 'me' | 'them' | 'none'

export const STEP_LABEL: Record<BestStep, string> = {
  serve: 'Serve',
  receive: 'Receive',
  third: 'Third',
  middle: 'Middle',
  finish: 'Finish',
}

/** Four parts. Opening replaces Serve, Start and Pre-attack. Rally is the old Middle. */
export const PART_LABEL: Record<BestPart, string> = {
  opening: 'Opening',
  attack: 'Attack',
  rally: 'Rally',
  end: 'End',
}

export const BEST_END_LEN = 3
export const BEST_ATTACK_LEN = 3

export type BestPartSpan = { part: BestPart; from: number; to: number }

/** Shots Best asks: 2, 3, and the last shot once the rally has 4 or more. */
export function bestAsked(n: number, shot: number): boolean {
  if (shot < 2 || shot > n) return false
  if (shot === 2 || shot === 3) return true
  return n >= 4 && shot === n
}

/**
 * First attack shot, or why there isn't one.
 * An unasked shot, or an asked shot with no stroke, stops the walk as unknown.
 */
export function bestOpener(n: number, shots: ShotTags[]): number | 'none' | 'unknown' {
  for (let shot = 2; shot <= n; shot++) {
    if (!bestAsked(n, shot) || !shots[shot - 1]?.stroke) return 'unknown'
    if (shots[shot - 1]?.stroke === 'Attack') return shot
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
 * Best and Best + FA use this same split. They differ only in who attacked first.
 */
export function bestParts(n: number, shots: ShotTags[]): BestPartSpan[] {
  if (n <= 0) return []
  // A serve point is all Opening.
  if (n === 1) return [{ part: 'opening', from: 1, to: 1 }]
  const o = bestOpener(n, shots)
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
  // First attack unknown: Opening, Rally, End. Opening stops at 3 shots.
  const openTo = Math.min(Math.max(1, Math.min(3, n - BEST_END_LEN)), endFrom - 1)
  addPart(parts, 'opening', 1, openTo)
  addPart(parts, 'rally', openTo + 1, endFrom - 1)
  addPart(parts, 'end', endFrom, n)
  return parts
}

export function stepsFor(d: Pick<Draft, 'contacts' | 'shots'>): BestStep[] {
  const n = d.contacts.length
  const steps: BestStep[] = []
  if (n !== 1) steps.push('serve')
  if (n >= 2) steps.push('receive')
  if (n >= 3) steps.push('third')
  if (bestParts(n, d.shots).some((part) => part.part === 'rally')) steps.push('middle')
  steps.push('finish')
  return steps
}

/** The last stroke is asked on Finish only once receive and third are not already it. */
export function finishShowsStroke(n: number): boolean {
  return n >= 4
}

export function stepAnswered(
  d: Pick<Draft, 'contacts' | 'shots' | 'ending' | 'best'>,
  step: BestStep,
): boolean {
  const n = d.contacts.length
  if (step === 'serve') return Boolean(d.shots[0]?.depth)
  if (step === 'receive') return Boolean(d.shots[1]?.wing && d.shots[1]?.stroke)
  if (step === 'third') return Boolean(d.shots[2]?.wing && d.shots[2]?.stroke)
  if (step === 'middle') return Boolean(d.best?.middle)
  if (!d.ending) return false
  if (!finishShowsStroke(n)) return true
  const last = d.shots[n - 1]
  return Boolean(last?.wing && last?.stroke)
}

/** Middle is optional. It never blocks Finish. */
export function stepPassable(
  d: Pick<Draft, 'contacts' | 'shots' | 'ending' | 'best'>,
  step: BestStep,
): boolean {
  if (step === 'middle') return true
  return stepAnswered(d, step)
}

/**
 * A later required step stays shut until it is reached.
 * Middle does not count, so Finish is open from Middle with no answer.
 */
export function stepOpen(
  d: Pick<Draft, 'contacts' | 'shots' | 'ending' | 'best'>,
  step: BestStep,
  current: BestStep,
  openSteps = false,
): boolean {
  const steps = stepsFor(d)
  const i = steps.indexOf(step)
  const at = steps.indexOf(current)
  if (i < 0) return false
  if (openSteps || i <= at) return true
  if (stepPassable(d, step)) {
    for (let j = 0; j < i; j++) {
      if (!stepPassable(d, steps[j])) return false
    }
    return true
  }
  if (!stepPassable(d, current)) return false
  return steps.slice(at + 1, i).every((name) => stepPassable(d, name))
}

export function restoreStep(d: Draft): BestStep {
  const steps = stepsFor(d)
  const wanted = d.best?.step
  if (wanted && steps.includes(wanted)) return wanted
  return steps.find((step) => !stepPassable(d, step)) ?? 'finish'
}

export function nextStep(d: Pick<Draft, 'contacts' | 'shots'>, step: BestStep): BestStep {
  const steps = stepsFor(d)
  const i = steps.indexOf(step)
  if (i < 0) return steps[0] ?? 'finish'
  return steps[Math.min(steps.length - 1, i + 1)]
}

export function keepStep(d: Pick<Draft, 'contacts' | 'shots'>, step: BestStep | undefined): BestStep {
  const steps = stepsFor(d)
  if (step && steps.includes(step)) return step
  return steps[steps.length - 1] ?? 'finish'
}

/** First attack button, as a shot number. Null when none was tagged. */
export function firstAttackShot(shots: ShotTags[]): number | null {
  for (let i = 0; i < shots.length; i++) {
    if (shots[i]?.stroke === 'Attack') return i + 1
  }
  return null
}

/**
 * Best + FA only. The only attack is the last shot of a rally of 5 or more,
 * so an earlier one may be untagged. Never required.
 */
export function asksWhoFirst(flow: BestFlowName, n: number, fa: number | null): boolean {
  return flow === 'bestfa' && n >= 5 && fa === n
}

/** A contact that moves into the serve slot is the serve. It does not keep the stroke of the shot it used to be. */
function withoutServeStroke(shot: ShotTags | undefined): ShotTags | undefined {
  if (!shot || (!shot.wing && !shot.stroke)) return shot
  const { wing: _wing, stroke: _stroke, ...rest } = shot
  return rest
}

/** Drop one contact. Tags stay with the shots that remain. The end answer goes with the last shot. */
export function removeBestContact(d: Draft, shot: number): Draft {
  const i = shot - 1
  if (i < 0 || i >= d.contacts.length || d.contacts.length < 2) return d
  const last = i === d.contacts.length - 1
  const best = d.best && last ? omitBestEnd(d.best) : d.best
  const shots = d.shots.filter((_, j) => j !== i)
  if (i === 0 && shots[0]) shots[0] = withoutServeStroke(shots[0]) ?? {}
  return {
    ...d,
    contacts: d.contacts.filter((_, j) => j !== i),
    shots,
    ending: last ? null : d.ending,
    end: last ? null : d.end,
    start: i === 0 ? null : d.start,
    fa: d.fa == null ? d.fa : d.fa - 1 === i ? null : d.fa - 1 > i ? d.fa - 1 : d.fa,
    ...(best ? { best } : {}),
  }
}

function omitBestEnd(best: NonNullable<Draft['best']>): NonNullable<Draft['best']> {
  const { end: _end, ...rest } = best
  return rest
}

export function impliedWinner(d: Pick<Draft, 'server' | 'contacts' | 'ending'>): Side | null {
  return winnerOf(d)
}

/** Who hits each shot, from the server and the shot number. Later shots move when a contact is removed. */
export function bestHitters(d: Pick<Draft, 'server' | 'contacts'>): Side[] {
  return d.contacts.map((_, i) => hitterOf(d.server, i + 1))
}

/**
 * What a closed rally should show after one contact is removed.
 * `toss`: an end contact (one of the last two, not the serve) left, and a serve step remains.
 * `serve`: the serve length was on contact 1, and the serve step remains.
 * `serve-note`: the same length left, but only one contact remains.
 * A middle contact, a serve with no length, and a rally still being tapped say nothing.
 */
export type ContactFollowUp = 'toss' | 'serve' | 'serve-note'

export function contactFollowUp(
  closed: boolean,
  n: number,
  shot: number,
  hadServeDepth: boolean,
): ContactFollowUp | null {
  if (!closed || n < 2) return null
  const left = n - 1
  const endContact = shot > 1 && shot >= n - 1
  if (endContact && left >= 2) return 'toss'
  if (shot === 1 && hadServeDepth) return left >= 2 ? 'serve' : 'serve-note'
  return null
}

/** Keep the mismatch only while the lit name still disagrees with the tapped one. */
export function missIfStill(d: Pick<Draft, 'server' | 'contacts' | 'ending'>, miss: Side | null): Side | null {
  if (!miss) return null
  const lit = winnerOf(d)
  return lit && lit === miss ? null : miss
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

/** The shot a step is tagging. Finish tags the last shot. */
function taggedShot(what: BestStep, n: number): number {
  if (what === 'serve') return 1
  if (what === 'receive') return 2
  if (what === 'third') return 3
  return Math.max(1, n)
}

/**
 * Loop the shot being tagged, at `rate` (0.75 unless a caller says otherwise).
 * It starts `lead` of playback before that contact and ends `end` of playback
 * before the next contact, or `min` of playback after the start, whichever is later.
 * The last shot uses the rally end in place of the next contact.
 * The Rally label still loops the whole rally. Add starts at the serve.
 * Times are seconds in the rally's video.
 */
export function bestLoop(
  d: Draft,
  what: BestStep | 'rally' | 'add',
  timing: BestTiming = DEFAULT_BEST_TIMING,
  rate = BEST_SHOT_RATE,
): BestWindow {
  const start = rallyStart(d)
  const end = rallyEnd(d)
  if (what === 'rally') return { a: start, b: end }
  // Add starts at the serve. A tap in the lead before it is not a contact.
  if (what === 'add') return { a: d.contacts[0] ?? start, b: end }
  // The middle question loops the Rally part and stops where End begins.
  if (what === 'middle') {
    const part = bestParts(d.contacts.length, d.shots).find((span) => span.part === 'rally')
    if (!part) return { a: start, b: end }
    return shotLoop(d.contacts[part.from - 1] ?? start, d.contacts[part.to] ?? end, timing, rate)
  }
  const n = d.contacts.length
  const shot = taggedShot(what, n)
  const c = d.contacts[shot - 1] ?? start
  const next = shot < n ? (d.contacts[shot] ?? end) : end
  return shotLoop(c, next, timing, rate)
}

export function setDepth(d: Draft, depth: string): Draft {
  const shots = d.shots.slice()
  shots[0] = { ...shots[0], depth }
  return { ...d, shots }
}

export function setWingStroke(d: Draft, shot: number, wing: Wing, stroke: string): Draft {
  const shots = d.shots.slice()
  const i = shot - 1
  shots[i] = { ...shots[i], wing, stroke }
  return { ...d, shots }
}

export function bestFlowOf(s: { draft: Draft | null; rallies: RallyData[] }): BestFlowName | null {
  const fromDraft = s.draft?.best?.flow
  if (fromDraft === 'best' || fromDraft === 'bestfa') return fromDraft
  const flow = s.rallies[s.rallies.length - 1]?.idea?.flow
  if (flow === 'best' || flow === 'bestfa') return flow
  return null
}

/** Where to pick this set up. Null on every other flow. */
export function bestPlace(s: { draft: Draft | null; rallies: RallyData[]; finished?: boolean }): string | null {
  if (s.finished || !bestFlowOf(s)) return null
  const n = s.rallies.length + 1
  if (s.draft && s.draft.contacts.length > 0 && s.draft.closed) return `Rally ${n}, details`
  return `Rally ${n}, live`
}

export function bestRally(d: Draft, id: string, winner: Side, kept: boolean): RallyData {
  const flow: BestFlowName = d.best?.flow === 'bestfa' ? 'bestfa' : 'best'
  const found = flow === 'bestfa' ? firstAttackShot(d.shots) : null
  const ask = asksWhoFirst(flow, d.contacts.length, found)
  const fa = ask ? null : found
  const who = ask ? d.best?.first : undefined
  const endLabel = bestEndOf(d) ?? (d.ending && d.ending !== 'Winner' ? d.ending : null)
  const order = bestParts(d.contacts.length, d.shots).map((span) => span.part)
  const review = order.filter((part) => d.best?.review?.includes(part))
  return {
    id,
    videoId: d.videoId,
    server: d.server,
    contacts: [...d.contacts],
    start: rallyStart(d),
    end: rallyEnd(d),
    ending: d.ending,
    fa,
    shots: d.shots.map((shot) => ({ ...shot })),
    winner,
    highlight: d.highlight,
    serveChecked: true,
    idea: {
      flow,
      ...(d.shots[0]?.depth ? { serve: d.shots[0].depth } : {}),
      ...(endLabel ? { result: endLabel } : {}),
      ...(who ? { first: who } : {}),
      ...(d.best?.middle ? { middle: d.best.middle } : {}),
      ...(review.length ? { review } : {}),
      ...(kept ? { check: 'Check the point' } : {}),
    },
  }
}

/** The side that opened, when the shot is known, or when Best + FA named a player. */
export function openerSide(
  d: Pick<Draft, 'server' | 'contacts' | 'shots' | 'best'>,
  names?: Record<Side, string>,
): Side | null {
  const o = bestOpener(d.contacts.length, d.shots)
  if (typeof o === 'number') return hitterOf(d.server, o)
  if (d.best?.flow !== 'bestfa') return null
  const named = d.best.first
  if (!named || named === 'Nobody') return null
  if (named === 'me' || named === 'them') return named
  if (!names) return null
  if (named === names.me) return 'me'
  if (named === names.them) return 'them'
  return null
}

export type MiddleEvent = 'kept' | 'turned' | 'reset' | 'opened' | 'control'

/** What the middle answer means, once a Rally part exists. */
export function middleEvent(
  d: Pick<Draft, 'server' | 'contacts' | 'shots' | 'best'>,
  names?: Record<Side, string>,
): MiddleEvent | null {
  const mid = d.best?.middle
  if (!mid) return null
  if (!bestParts(d.contacts.length, d.shots).some((span) => span.part === 'rally')) return null
  const opener = openerSide(d, names)
  if (mid === 'none') return opener ? 'reset' : 'control'
  if (!opener) return 'opened'
  return mid === opener ? 'kept' : 'turned'
}

/**
 * Clip for one part. Shot 1 starts at the rally start. The last part ends at the rally end.
 * Anything else starts the lead before its first contact and ends the end offset before the next part.
 */
export function partWindow(
  d: Draft,
  part: BestPart,
  timing: BestTiming = DEFAULT_BEST_TIMING,
): BestWindow {
  const parts = bestParts(d.contacts.length, d.shots)
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

/** Drop a middle answer with no Rally part, and review marks whose part is gone. */
export function keepBestMarks(d: Draft): Draft {
  if (!d.best) return d
  const alive = new Set(bestParts(d.contacts.length, d.shots).map((span) => span.part))
  let best: NonNullable<Draft['best']> = d.best
  let changed = false
  if (best.middle && !alive.has('rally')) {
    const { middle: _middle, ...rest } = best
    best = rest
    changed = true
  }
  if (best.review) {
    const review = best.review.filter((part) => alive.has(part))
    if (review.length !== best.review.length) {
      const { review: _review, ...rest } = best
      best = review.length ? { ...rest, review } : rest
      changed = true
    }
  }
  if (best.step === 'middle' && !alive.has('rally')) {
    best = { ...best, step: 'finish' }
    changed = true
  }
  return changed ? { ...d, best } : d
}

/** Rally list. "Middle Kim" or "Middle Nobody". */
export function middleLine(r: { idea?: { middle?: MiddleAnswer } }, names: Record<Side, string>): string {
  const mid = r.idea?.middle
  if (!mid) return ''
  if (mid === 'none') return 'Middle Nobody'
  return `Middle ${names[mid]}`
}

/** Rally list. "Review Rally, End", in row order. */
export function reviewLine(r: { contacts: number[]; shots: ShotTags[]; idea?: { review?: BestPart[] } }): string {
  const review = r.idea?.review
  if (!review?.length) return ''
  const shown = bestParts(r.contacts.length, r.shots)
    .map((span) => span.part)
    .filter((part) => review.includes(part))
  if (!shown.length) return ''
  return `Review ${shown.map((part) => PART_LABEL[part]).join(', ')}`
}

/** Rally list text. A shot number when it is known. Who, or a question mark, when only the last shot was an attack. */
export function faLine(r: {
  fa: number | null
  contacts: number[]
  shots: ShotTags[]
  idea?: { flow?: string; first?: string }
}): string {
  if (r.fa !== null) return `FA ${r.fa}`
  if (r.idea?.flow !== 'bestfa') return ''
  const found = firstAttackShot(r.shots)
  if (!asksWhoFirst('bestfa', r.contacts.length, found)) return ''
  return r.idea.first ? `FA ${r.idea.first}` : 'FA ?'
}
