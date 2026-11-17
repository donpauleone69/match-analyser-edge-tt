/**
 * Best (`?flow=best`) and Best + FA (`?flow=bestfa`).
 * Contacts, idle close, that rally's steps, then play on.
 * The other flows do not use this file.
 */

import {
  SHOT_LOOP_HOLD_S,
  rallyEnd,
  rallyStart,
  shotWindow,
  winnerOf,
  type Draft,
  type RallyData,
  type ShotTags,
  type Side,
  type Wing,
} from './rally'
import { END_FIRST_PAUSE_S } from './sequence'

export const BEST_STROKES = ['Touch', 'Push', 'Flick', 'Loop'] as const
export const BEST_SERVE = ['Short', 'Long'] as const
export const BEST_ENDS = ['Winner', 'Net', 'Long', 'Wide'] as const
export const BEST_STEPS = ['serve', 'receive', 'third', 'finish'] as const

export type BestStep = (typeof BEST_STEPS)[number]
export type BestFlowName = 'best' | 'bestfa'

const ATTACK = new Set<string>(['Flick', 'Loop'])

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

/** First Flick or Loop, as a shot number. Null when none was tagged. */
export function firstAttackShot(shots: ShotTags[]): number | null {
  for (let i = 0; i < shots.length; i++) {
    const stroke = shots[i]?.stroke
    if (stroke && ATTACK.has(stroke)) return i + 1
  }
  return null
}

/** Best + FA only. A rally of 5 or more with no Flick or Loop. Never required. */
export function asksWhoFirst(flow: BestFlowName, n: number, fa: number | null): boolean {
  return flow === 'bestfa' && n >= 5 && fa === null
}

export function impliedWinner(d: Pick<Draft, 'server' | 'contacts' | 'ending'>): Side | null {
  return winnerOf(d)
}

export type BestWindow = { a: number; b: number; hold?: number }

/** One step's loop. Times are seconds in the rally's video. */
export function bestLoop(d: Draft, what: BestStep | 'rally'): BestWindow {
  const n = d.contacts.length
  const start = rallyStart(d)
  const end = rallyEnd(d)
  if (what === 'rally') return { a: start, b: end }
  if (what === 'serve') {
    const recv = d.contacts[1] ?? d.contacts[0] ?? start
    const b = Math.min(end, recv + 0.35)
    return { a: start, b: Math.max(b, start + 0.3) }
  }
  if (what === 'receive' && n >= 2) return { ...shotWindow(d, 2), hold: SHOT_LOOP_HOLD_S }
  if (what === 'third' && n >= 3) return { ...shotWindow(d, 3), hold: SHOT_LOOP_HOLD_S }
  const last = shotWindow(d, Math.max(1, n))
  return { a: last.a, b: end, hold: END_FIRST_PAUSE_S }
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
  const fa = flow === 'bestfa' ? firstAttackShot(d.shots) : null
  const who = asksWhoFirst(flow, d.contacts.length, fa) ? d.best?.first : undefined
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
      ...(d.ending ? { result: d.ending } : {}),
      ...(who ? { first: who } : {}),
      ...(kept ? { check: 'Check the point' } : {}),
    },
  }
}

export function chipText(shot: ShotTags | undefined, index: number): string {
  if (index === 0 && shot?.depth) return shot.depth === 'Long' ? 'L' : 'S'
  if (!shot?.stroke) return ''
  if (shot.stroke === 'Touch') return 'T'
  if (shot.stroke === 'Push') return 'P'
  if (shot.stroke === 'Flick') return 'F'
  if (shot.stroke === 'Loop') return 'L'
  return ''
}
