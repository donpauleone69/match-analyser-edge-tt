/**
 * R1 to R8 for Review serves. Run with proto/scripts/serve-review-r1-r8.mjs.
 * The rule under test is continuity.ts. This file only feeds it cases.
 */
import {
  LONG_GAP_S,
  bandLine,
  breakIndexes,
  checkSet,
  expectedServer,
  gapMarks,
  longerFirst,
  openReview,
  pressReview,
  serveBands,
  type ReviewPress,
  type ServeRally,
  type StopReason,
} from './continuity'
import type { MarkKind, RallyData, Side } from './rally'
import { countPoints } from './score'
import type { Segment } from './timeline'

const Y: Side = 'me'
const S: Side = 'them'

export type CaseResult = { id: string; ok: boolean; detail: string }

type Step = { rally: number; press: ReviewPress; breakAfter: number | null }

const label = (side: Side) => (side === Y ? 'Y' : 'S')
const serverWord = (rows: ServeRally[]) => rows.map((r) => label(r.server)).join(' ')

function rally(n: number, server: Side, extra: Partial<ServeRally> = {}): ServeRally {
  return { id: `r${n}`, server, winner: Y, ...extra }
}

function tagged(servers: Side[], checked: number[] = []): ServeRally[] {
  return servers.map((server, i) => rally(i + 1, server, checked.includes(i + 1) ? { serveChecked: true } : {}))
}

function play(start: ServeRally[], steps: Step[], first: Side = Y): string[] {
  let state = openReview(start, first, steps[0].rally - 1)
  const fails: string[] = []
  for (const step of steps) {
    if (state.cursor !== step.rally - 1) {
      fails.push(`on screen r${state.cursor === null ? '?' : state.cursor + 1}, wanted r${step.rally}`)
      return fails
    }
    const before = state.rallies.map((r) => ({ ...r }))
    state = pressReview(state, step.press)
    const index = step.rally - 1
    for (let i = 0; i < state.rallies.length; i++) {
      const was = before[i]
      const now = state.rallies[i]
      const sameRally = was.server === now.server && was.winner === now.winner && was.serveChecked === now.serveChecked
      if (i !== index) {
        if (!sameRally) fails.push(`press on r${step.rally} wrote r${i + 1}`)
        continue
      }
      if (!now.serveChecked) fails.push(`r${step.rally} was not checked`)
      if (step.press === 'same' && (was.server !== now.server || was.winner !== now.winner)) {
        fails.push(`same as tagged wrote r${step.rally}`)
      }
      if (step.press === 'other' && (now.server === was.server || now.winner === was.winner)) {
        fails.push(`other player did not swap r${step.rally}`)
      }
    }
    const found = breakIndexes(state.rallies, first)
    const got = found.length === 0 ? null : found[0] + 1
    if (got !== step.breakAfter) fails.push(`after r${step.rally} break is ${got ?? 'none'}, wanted ${step.breakAfter ?? 'none'}`)
  }
  if (state.stopped === null) fails.push('review did not stop')
  else if (state.cursor !== null) fails.push('stopped with a rally still on screen')
  const shown = new Set(state.shown)
  if (shown.size !== steps.length) fails.push(`showed ${shown.size}, pressed ${steps.length}`)
  return fails
}

function finish(
  start: ServeRally[],
  steps: Step[],
  expect: {
    stop: StopReason
    gaps: number[] | 'r22'
    stretch?: [number, number]
    servers: string
    changed: number[]
    addBefore?: number
    addServer?: Side
    addServers?: string
    leaveBreak?: number
  }
): string[] {
  const fails = play(start, steps)
  let state = openReview(start, Y, steps[0].rally - 1)
  for (const step of steps) state = pressReview(state, step.press)
  if (state.stopped !== expect.stop) fails.push(`stopped ${state.stopped}, wanted ${expect.stop}`)
  const gaps = state.gaps.map((index) => index + 1).sort((a, b) => a - b)
  if (expect.gaps === 'r22') {
    if (!gaps.includes(22)) fails.push(`gaps ${gaps.join(',')} miss the gap before r22`)
    if (gaps.some((g) => g !== 21 && g !== 22)) fails.push(`gaps ${gaps.join(',')} are not before r21 or r22`)
  } else if (gaps.join(',') !== [...expect.gaps].sort((a, b) => a - b).join(',')) {
    fails.push(`gaps before ${gaps.join(',') || 'none'}, wanted ${expect.gaps.join(',') || 'none'}`)
  }
  if (serverWord(state.rallies) !== expect.servers) {
    fails.push(`servers ${serverWord(state.rallies)}, wanted ${expect.servers}`)
  }
  const changed = state.rallies.flatMap((r, i) => (r.server !== start[i].server ? [i + 1] : []))
  if (changed.join(',') !== expect.changed.join(',')) {
    fails.push(`changed r${changed.join(',') || 'none'}, wanted r${expect.changed.join(',') || 'none'}`)
  }
  const scoreMoved = countPoints(start.map((r) => r.winner))
  const scoreNow = countPoints(state.rallies.map((r) => r.winner))
  const flips = expect.changed.length
  const meDelta = Math.abs(scoreNow.me - scoreMoved.me)
  if (meDelta !== flips || Math.abs(scoreNow.them - scoreMoved.them) !== flips) {
    fails.push('score moved by more than the swapped winners')
  }
  if (expect.stretch) {
    const bands = serveBands(start, Y)
    const [from, to] = expect.stretch
    const band = bands[0]
    if (bands.length !== 1 || !band || band.from !== from - 1 || band.to !== to - 1) {
      fails.push(`stretch ${bands.map((b) => `${b.from + 1}-${b.to + 1}`).join(',') || 'none'}, wanted ${from}-${to}`)
    }
  }
  if (expect.addBefore !== undefined && expect.addServer && expect.addServers) {
    const index = expect.addBefore - 1
    const proposed = expectedServer(state.rallies, Y, index)
    if (proposed !== expect.addServer) fails.push(`proposed ${label(proposed)} before r${expect.addBefore}`)
    const put = (winner: Side) => {
      const added: ServeRally = { id: 'added', server: proposed, winner }
      return [...state.rallies.slice(0, index), added, ...state.rallies.slice(index)]
    }
    const rally = put(S)
    const point = put(Y)
    if (serverWord(rally) !== expect.addServers) fails.push(`after add ${serverWord(rally)}`)
    if (breakIndexes(rally, Y).length !== 0) fails.push('add rally left a break')
    if (serverWord(point) !== expect.addServers) fails.push('add point servers differ')
    if (breakIndexes(point, Y).length !== 0) fails.push('add point left a break')
  }
  if (expect.leaveBreak) {
    const id = `r${expect.leaveBreak}`
    const left = state.rallies.map((r) =>
      r.id === id ? { ...r, left: ['serve'] as MarkKind[] } : r
    )
    if (serveBands(left, Y).length !== 0) fails.push('Leave it left the band up')
  }
  for (const index of state.shown) {
    if (!state.rallies[index].serveChecked) fails.push(`shown r${index + 1} is not checked`)
  }
  return fails
}

function caseR(
  id: string,
  servers: Side[],
  steps: Step[],
  expect: Parameters<typeof finish>[2],
  checked: number[] = []
): CaseResult {
  const start = tagged(servers, checked)
  const opening = breakIndexes(start, Y).map((i) => i + 1)
  const fails = finish(start, steps, expect)
  const wantBreak = steps[0].rally
  if (opening.join(',') !== String(wantBreak)) fails.unshift(`break going in r${opening.join(',') || 'none'}`)
  return { id, ok: fails.length === 0, detail: fails.join('; ') }
}

const same = (rally: number, breakAfter: number | null): Step => ({ rally, press: 'same', breakAfter })
const other = (rally: number, breakAfter: number | null): Step => ({ rally, press: 'other', breakAfter })

function hintRow(): CaseResult {
  const fails: string[] = []
  if (LONG_GAP_S !== 9) fails.push(`LONG_GAP_S is ${LONG_GAP_S}`)
  const seg: Segment[] = [{ id: 'v', index: 0, offset: 0, duration: 80 }]
  const made = (id: string, server: Side, start: number, end: number): RallyData => ({
    id,
    videoId: 'v',
    server,
    winner: Y,
    contacts: [start, end],
    start: Math.max(0, start - 2),
    end,
    ending: 'Winner',
    fa: null,
    shots: [{}, {}],
    highlight: false,
  })
  const marked = gapMarks(seg, [made('a', Y, 1, 2), made('b', Y, 16, 17), made('c', S, 22, 23)])
  const seconds = marked.map((m) => (m.kind === 'gap' ? m.seconds : 0))
  if (marked.length !== 1 || marked[0].kind !== 'gap' || Math.round(seconds[0]) !== 14) {
    fails.push(`gapMarks ${marked.length} marks`)
  }
  const nine = gapMarks(seg, [made('a', Y, 1, 2), made('b', S, 11, 12)])
  const under = gapMarks(seg, [made('a', Y, 1, 2), made('b', S, 10.9, 12)])
  if (nine.length !== 1 || under.length !== 0) fails.push('9s marks, under 9s does not')
  const cont = checkSet(
    [made('a', Y, 1, 2), made('b', Y, 16, 17), made('c', S, 22, 23)],
    Y,
    seg,
    null,
    false
  )
  if (cont.checkCount !== 0) fails.push(`hint counted as ${cont.checkCount}`)
  if (!cont.marks.some((m) => m.kind === 'gap')) fails.push('hint missing from marks')
  if (bandLine({ from: 6, to: 6, breakId: 'x', breaks: [6] }) !== 'Serve order changed at rally 7') {
    fails.push('one-rally line')
  }
  if (longerFirst([0, 1], (i) => (i === 0 ? 4 : 12)).join(',') !== '1,0') fails.push('longer first')
  return { id: 'hints', ok: fails.length === 0, detail: fails.join('; ') }
}

/** Every case the plan named, plus the gap hint staying out of the count. */
export function runServeReviewCases(): CaseResult[] {
  return [
    caseR('R1', [Y, Y, S, S, Y, S], [same(6, 6), same(5, 6), same(4, 6)], {
      stop: 'two-fit',
      gaps: [5, 6],
      stretch: [1, 6],
      servers: 'Y Y S S Y S',
      changed: [],
      addBefore: 6,
      addServer: Y,
      addServers: 'Y Y S S Y Y S',
    }),
    caseR('R2', [Y, Y, S, Y], [same(4, 4), same(3, 4), same(2, 4)], {
      stop: 'two-fit',
      gaps: [3, 4],
      stretch: [1, 4],
      servers: 'Y Y S Y',
      changed: [],
      addBefore: 3,
      addServer: S,
      addServers: 'Y Y S S Y',
    }),
    caseR('R3', [Y, Y, S, S, Y, S], [same(6, 6), same(5, 6), other(4, 4), same(3, 4), same(2, 4)], {
      stop: 'two-fit',
      gaps: [3, 4],
      stretch: [1, 6],
      servers: 'Y Y S Y Y S',
      changed: [4],
      addBefore: 3,
      addServer: S,
      addServers: 'Y Y S S Y Y S',
    }),
    caseR('R4', [Y, Y, S, Y], [same(4, 4), same(3, 4), other(2, 2), same(1, 2)], {
      stop: 'set-start',
      gaps: [1, 2],
      stretch: [1, 4],
      servers: 'Y S S Y',
      changed: [2],
      addBefore: 2,
      addServer: Y,
      addServers: 'Y Y S S Y',
    }),
    caseR('R5', [Y, Y, S, Y], [other(4, null)], {
      stop: 'no-break',
      gaps: [],
      servers: 'Y Y S S',
      changed: [4],
    }),
    caseR('R6', [Y, Y, S, Y, Y], [same(4, 4), same(3, 4), same(2, 4)], {
      stop: 'two-fit',
      gaps: [3, 4],
      servers: 'Y Y S Y Y',
      changed: [],
      leaveBreak: 4,
    }),
    (() => {
      const winners: Side[] = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? Y : S))
      const prefix: ServeRally[] = []
      for (let i = 0; i < 20; i++) prefix.push({ id: `r${i + 1}`, server: expectedServer(prefix, Y), winner: winners[i] })
      const start = [...prefix, rally(21, Y), rally(22, Y)]
      const score = countPoints(prefix.map((r) => r.winner))
      const fails = finish(start, [same(22, 22), same(21, 22), same(20, 22)], {
        stop: 'two-fit',
        gaps: 'r22',
        servers: `${serverWord(prefix)} Y Y`,
        changed: [],
      })
      if (score.me !== 10 || score.them !== 10) fails.unshift(`score before r21 is ${score.me}-${score.them}`)
      if (expectedServer(prefix, Y) !== Y) fails.unshift('r21 was not due Y')
      return { id: 'R7', ok: fails.length === 0, detail: fails.join('; ') }
    })(),
    // The plan's sentence wins over the first reading of R8: the known good
    // rally (r4) is shown, then the review stops. It is not skipped.
    caseR('R8', [Y, Y, S, S, Y, S], [same(6, 6), same(5, 6), same(4, 6)], {
      stop: 'known-good',
      gaps: [5, 6],
      stretch: [5, 6],
      servers: 'Y Y S S Y S',
      changed: [],
      addBefore: 6,
      addServer: Y,
      addServers: 'Y Y S S Y Y S',
    }, [4]),
    hintRow(),
  ]
}
