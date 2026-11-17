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
  type Draft,
  type Ending,
  type RallyData,
  type ShotTags,
  type Side,
  type Wing,
} from './rally'

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
export const BEST_STEPS = ['serve', 'receive', 'third', 'finish'] as const

export type BestStep = (typeof BEST_STEPS)[number]
export type BestFlowName = 'best' | 'bestfa'

export const STEP_LABEL: Record<BestStep, string> = {
  serve: 'Serve',
  receive: 'Receive',
  third: 'Third',
  finish: 'Finish',
}

export function stepsFor(n: number): BestStep[] {
  const steps: BestStep[] = []
  if (n !== 1) steps.push('serve')
  if (n >= 2) steps.push('receive')
  if (n >= 3) steps.push('third')
  steps.push('finish')
  return steps
}

/** The last stroke is asked on Finish only once receive and third are not already it. */
export function finishShowsStroke(n: number): boolean {
  return n >= 4
}

export function stepAnswered(d: Pick<Draft, 'contacts' | 'shots' | 'ending'>, step: BestStep): boolean {
  const n = d.contacts.length
  if (step === 'serve') return Boolean(d.shots[0]?.depth)
  if (step === 'receive') return Boolean(d.shots[1]?.wing && d.shots[1]?.stroke)
  if (step === 'third') return Boolean(d.shots[2]?.wing && d.shots[2]?.stroke)
  if (!d.ending) return false
  if (!finishShowsStroke(n)) return true
  const last = d.shots[n - 1]
  return Boolean(last?.wing && last?.stroke)
}

export function restoreStep(d: Draft): BestStep {
  const steps = stepsFor(d.contacts.length)
  const wanted = d.best?.step
  if (wanted && steps.includes(wanted)) return wanted
  return steps.find((step) => !stepAnswered(d, step)) ?? 'finish'
}

export function nextStep(n: number, step: BestStep): BestStep {
  const steps = stepsFor(n)
  const i = steps.indexOf(step)
  if (i < 0) return steps[0]
  return steps[Math.min(steps.length - 1, i + 1)]
}

export function keepStep(n: number, step: BestStep | undefined): BestStep {
  const steps = stepsFor(n)
  if (step && steps.includes(step)) return step
  return steps[steps.length - 1]
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

/** Drop one contact. Tags stay with the shots that remain. The end answer goes with the last shot. */
export function removeBestContact(d: Draft, shot: number): Draft {
  const i = shot - 1
  if (i < 0 || i >= d.contacts.length || d.contacts.length < 2) return d
  const last = i === d.contacts.length - 1
  const best = d.best && last ? omitBestEnd(d.best) : d.best
  return {
    ...d,
    contacts: d.contacts.filter((_, j) => j !== i),
    shots: d.shots.filter((_, j) => j !== i),
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
      ...(kept ? { check: 'Check the point' } : {}),
    },
  }
}

export function chipText(shot: ShotTags | undefined, index: number): string {
  if (index === 0 && shot?.depth) return shot.depth === 'Long' ? 'Ln' : 'Sh'
  if (shot?.stroke === 'Attack') return shot.wing === 'BH' ? 'B+' : 'F+'
  if (shot?.stroke === 'Control') return shot.wing === 'BH' ? 'Bc' : 'Fc'
  return ''
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
