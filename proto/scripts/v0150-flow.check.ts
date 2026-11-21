/**
 * v0.15.0 in-order rally trace. No browser.
 * Serve, each shot, then End. The winner comes from the server, the count and End.
 * One contact asks End: Winner is an ace, an error a serve fault. Run: npm run check:v0150
 */
import { calculateTaggedScore } from '../src/rules/match'
import type { MatchRecord, Points, SetData } from '../src/types/match'
import {
  BEST_ENDS,
  bestAdvance,
  bestAt,
  bestDeleteLast,
  bestQuestionKey,
  bestRally,
  bestSetEnd,
  bestSetPoint,
  bestSetServer,
  bestSwitchServer,
  bestTaps,
  padFocus,
  questionOrder,
  removeBestContact,
  routeAfter,
  setDepth,
  setWingStroke,
  type BestEnd,
} from '../src/rules/bestFa'
import { saveRally } from '../src/rules/matchOps'
import { addContact, emptyDraft, otherSide, winnerOf } from '../src/rules/rally'
import { addPoint, serverAt, ZERO } from '../src/rules/score'
import type { Draft, Side, Wing } from '../src/types/rally'

const fails: string[] = []
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`PASS  ${name}`)
  else {
    fails.push(`${name} ${detail}`.trim())
    console.log(`FAIL  ${name} ${detail}`.trim())
  }
}
const eq = (name: string, got: unknown, want: unknown) =>
  ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`)

function blankMatch(): MatchRecord {
  const set: SetData = {
    setId: 1,
    entered: { me: '', them: '' },
    skipped: false,
    finished: false,
    firstServer: 'me',
    rallies: [],
    draft: null,
    mark: null,
  }
  return {
    id: 'm-trace',
    opponent: 'Kim',
    event: '',
    date: '',
    result: { me: null, them: null },
    videos: [{ id: 'v', fileName: 'trace.mp4', sizeMb: 1, archived: false, kind: 'demo', durationS: 600 }],
    sets: [set],
    tagDone: false,
  }
}

function openRally(server: Side, n: number): Draft {
  let d = emptyDraft('v', server)
  for (let i = 0; i < n; i++) d = addContact(d, 10 + i * 0.4)
  return { ...d, closed: true, best: { flow: 'bestfa', step: 'serve' } }
}

function question(d: Draft): string {
  const at = bestAt(d, false)
  if (at.step === 'end') return padFocus(d, false, null)
  if (at.step === 'shots') return `shot ${at.page}`
  return at.step
}

function answer(d: Draft, q: string, end: BestEnd): Draft {
  if (q === 'end') return bestSetEnd(d, end)
  if (q === 'point') return d
  if (q === 'serve') return setDepth(d, 'Short')
  const at = bestAt(d, false)
  const shot = at.page ?? d.contacts.length
  const wing: Wing = shot % 2 === 0 ? 'FH' : 'BH'
  return setWingStroke(d, shot, wing, shot === 3 ? 'Attack' : 'Control')
}

function walk(n: number, end: BestEnd, server: Side = 'me'): { questions: string[]; draft: Draft } {
  let d = openRally(server, n)
  const questions: string[] = []
  for (let i = 0; i < 40; i++) {
    const at = routeAfter(d, false)
    if (!at) break
    d = { ...d, best: { ...d.best!, step: at.step, endPage: at.page } }
    const q = question(d)
    if (q === 'point') throw new Error('Point to was asked')
    questions.push(q)
    const next = answer(d, q, end)
    const moved = bestAdvance(next, false)
    d = moved.draft
    if (moved.save) break
  }
  return { questions, draft: d }
}

eq('order 1', questionOrder(1), ['end'])
eq('order 2', questionOrder(2), ['serve', 'shot 2', 'end'])
eq('order 4', questionOrder(4), ['serve', 'shot 2', 'shot 3', 'shot 4', 'end'])
eq('taps 1', bestTaps(1), 2)
eq('taps 3', bestTaps(3), 7)
eq('wide stays on buttons', BEST_ENDS.includes('Wide'), true)

const fault = walk(1, 'Net')
eq('fault asks End only', fault.questions, ['end'])
eq('fault winner', fault.draft.best?.point, 'them')
const faultRally = bestRally(fault.draft, 'r1', fault.draft.best!.point!, false)
eq('fault label', faultRally.idea?.result, 'Serve fault')
eq('fault receiver', faultRally.winner, otherSide(fault.draft.server))
const ace = walk(1, 'Winner')
eq('ace asks End only', ace.questions, ['end'])
eq('ace to the server', ace.draft.best?.point, ace.draft.server)
eq('ace label', bestRally(ace.draft, 'r1', ace.draft.best!.point!, false).idea?.result, 'Ace')

const two = walk(2, 'Winner')
eq('2 questions', two.questions, ['serve', 'shot 2', 'end'])
eq('2 winner', winnerOf(two.draft), 'them')
eq('2 point stored', two.draft.best?.point, 'them')
eq('2 no point question', two.questions.includes('point'), false)

const three = walk(3, 'Long')
eq('3 questions', three.questions, ['serve', 'shot 2', 'shot 3', 'end'])
eq('3 winner is the receiver', winnerOf(three.draft), 'them')

const four = walk(4, 'Net')
eq('4 questions', four.questions, questionOrder(4))
eq('4 shot 3 saved Attack', four.draft.shots[2]?.stroke, 'Attack')

let dropped = openRally('me', 4)
dropped = setDepth(dropped, 'Short')
dropped = setWingStroke(dropped, 2, 'BH', 'Control')
dropped = setWingStroke(dropped, 3, 'FH', 'Attack')
dropped = { ...dropped, best: { flow: 'bestfa', step: 'shots', endPage: 4 } }
const afterNot = bestAdvance(removeBestContact(dropped, 4), false)
eq('not a shot goes to End', afterNot.draft.best?.step, 'end')
eq('not a shot keeps 3', afterNot.draft.contacts.length, 3)
eq('not a shot does not save yet', afterNot.save, false)

let ended = walk(4, 'Winner').draft
const back = bestAdvance(bestDeleteLast(ended), false)
eq('delete last asks End', back.draft.best?.step, 'end')
eq('delete last cleared End', back.draft.ending, null)
eq('delete last count', back.draft.contacts.length, 3)
eq('delete last keeps shot 3', back.draft.shots[2]?.stroke, 'Attack')

let down = openRally('me', 2)
down = setDepth(down, 'Long')
down = setWingStroke(down, 2, 'FH', 'Control')
down = bestSetEnd(down, 'Winner')
const toOne = bestAdvance(bestDeleteLast(down), false)
eq('down to one does not save', toOne.save, false)
eq('down to one asks End', toOne.draft.best?.step, 'end')
eq('down to one cleared End', toOne.draft.ending, null)

const before = bestQuestionKey(openRally('me', 3), false)
const served = setDepth(openRally('me', 3), 'Short')
const afterServe = bestAdvance(served, false).draft
eq('guard key changes on serve', before !== bestQuestionKey(afterServe, false), true)
eq('same question same key', bestQuestionKey(afterServe, false), bestQuestionKey(afterServe, false))

function walkOne(n: number, end: BestEnd, point: Side, switchFirst: boolean): { questions: string[]; draft: Draft; saved: boolean } {
  let d = openRally('me', n)
  if (switchFirst) d = bestSwitchServer(d, true)
  const questions: string[] = []
  for (let i = 0; i < 40; i++) {
    const at = routeAfter(d, true)
    if (!at) return { questions, draft: d, saved: true }
    d = { ...d, best: { ...d.best!, step: at.step, endPage: at.page } }
    const q = at.step === 'end' ? padFocus(d, true, null) : at.step === 'shots' ? `shot ${at.page}` : at.step
    questions.push(q)
    const next =
      q === 'server'
        ? bestSetServer(d, 'them')
        : q === 'point'
          ? bestSetPoint(d, point, true)
          : q === 'end'
            ? bestSetEnd(d, end, true)
            : answer(d, q, end)
    const moved = bestAdvance(next, true)
    d = moved.draft
    if (moved.save) return { questions, draft: d, saved: true }
  }
  return { questions, draft: d, saved: false }
}
const r1 = walkOne(3, 'Winner', 'them', false)
eq('rally one asks who served first', r1.questions, ['server', ...questionOrder(3)])
eq('rally one does not ask Point to', r1.questions.includes('point'), false)
eq('rally one winner follows the server', winnerOf(r1.draft), 'them')
eq('rally one server is the answer', r1.draft.server, 'them')
const r1s = walkOne(3, 'Winner', 'them', true)
eq('rally one after the switch has no Point to', r1s.questions, questionOrder(3))
eq('rally one after the switch derives', r1s.draft.best?.point, 'them')
const r1a = walkOne(1, 'Winner', 'them', false)
eq('rally one ace asks who served, then End', r1a.questions, ['server', 'end'])
eq('rally one ace sets the server', r1a.draft.server, 'them')

const reopened = walk(4, 'Winner').draft
const switched = bestAdvance(bestSwitchServer({ ...reopened, best: { ...reopened.best!, step: 'serve' } }), false)
eq('switch on a reopened rally re-derives the point', switched.draft.best?.point, otherSide(reopened.best!.point!))

let match = blankMatch()
let score: Points = ZERO
const runSave = (n: number, end: BestEnd) => {
  const server = serverAt(match.sets[0].firstServer, calculateTaggedScore(match.sets[0]) ?? ZERO)
  const w = walk(n, end, server)
  const winner = w.draft.best?.point
  if (!winner) throw new Error('no winner')
  const rally = bestRally(w.draft, `r-${n}-${end}`, winner, false)
  match = saveRally(match, 1, rally)
  score = addPoint(score, winner)
  return { questions: w.questions, winner, result: rally.idea?.result }
}
const a = runSave(1, 'Net')
eq('rally one fault questions', a.questions, ['end'])
eq('rally one fault score side', a.winner, 'them')
const b = runSave(3, 'Winner')
eq('second rally in order', b.questions, questionOrder(3))
eq('second rally winner', b.winner, winnerOf(walk(3, 'Winner', serverAt('me', { me: 0, them: 1 })).draft))
ok('score moved', score.me + score.them === 2, JSON.stringify(score))

if (fails.length) {
  console.log(`\n${fails.length} failed`)
  process.exit(1)
}
console.log('\nall passed')
