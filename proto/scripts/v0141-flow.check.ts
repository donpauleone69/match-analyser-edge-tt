/**
 * v0.14.1 rally trace. No browser. Each case is contact taps, then every
 * question, then the same save the screen uses. Score and the rally list
 * come from taggedScore and saveRally. Run: npm run check:v0141
 */
import type { MatchRecord, SetData } from '../src/data/demoStore'
import { taggedScore } from '../src/data/demoStore'
import {
  bestAdvance,
  bestAt,
  bestHint,
  bestMismatch,
  bestRally,
  bestSetEnd,
  bestSetPoint,
  carryBest,
  cellTarget,
  padFocus,
  setDepth,
  setWingStroke,
  stepShot,
  strokeLabel,
  withStep,
  type BestEnd,
} from '../src/features/tagging/bestFlow'
import { flipFirstServer, restoreSet, saveRally } from '../src/features/tagging/matchOps'
import { addContact, emptyDraft, otherSide, serverForWinner, type Draft, type Side, type Wing } from '../src/features/tagging/rally'
import { addPoint, serverAt, ZERO, type Points } from '../src/features/tagging/score'

type Layout = 'pad' | 'buttons'
type Row = { layout: Layout; name: string; pass: boolean; detail: string }

const rows: Row[] = []
const note = (layout: Layout, name: string, pass: boolean, detail: string) => {
  rows.push({ layout, name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${layout.padEnd(8)}  ${name.padEnd(16)}  ${detail}`)
}

function blankMatch(): MatchRecord {
  const set: SetData = {
    setId: 1,
    entered: { me: '', them: '' },
    skipped: false,
    finished: false,
    firstServer: 'me',
    rallies: [],
    draft: null,
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

function openRally(server: Side, n: number, t0: number): Draft {
  let d = emptyDraft('v', server)
  for (let i = 0; i < n; i++) d = addContact(d, t0 + i * 0.4)
  if (d.contacts.length !== n) throw new Error(`contacts ${d.contacts.length} wanted ${n}`)
  return { ...d, closed: true, best: carryBest(d, { step: 'end' }) }
}

/** The one question a tap answers. Pad and buttons share this order. */
function question(d: Draft, rallyOne: boolean): string {
  const at = bestAt(d, rallyOne)
  if (at.step === 'end') return padFocus(d, rallyOne, null)
  if (at.step === 'shots') return `shot ${at.page}`
  return at.step
}

function strokeFor(q: string): { wing: Wing; stroke: 'Attack' | 'Control' } {
  if (q === 'receive') return { wing: 'FH', stroke: 'Attack' }
  if (q === 'third') return { wing: 'BH', stroke: 'Attack' }
  return { wing: 'BH', stroke: 'Control' }
}

function answerOf(d: Draft, q: string, end: BestEnd, rallyOne: boolean): Draft {
  const at = bestAt(d, rallyOne)
  if (q === 'end') return bestSetEnd(d, end)
  if (q === 'point') return bestSetPoint(d, bestHint(d, rallyOne) ?? 'me', rallyOne)
  const pick = strokeFor(q)
  if (q === 'stroke') return setWingStroke(d, d.contacts.length, pick.wing, pick.stroke)
  if (q === 'serve') return setDepth(d, 'Short')
  const shot = at.step === 'shots' ? (at.page ?? 0) : stepShot(d.contacts.length, at.step, at.page)
  return setWingStroke(d, shot, pick.wing, pick.stroke)
}

function commit(match: MatchRecord, draft: Draft, rallyOne: boolean, id: string): MatchRecord {
  const winner = draft.best?.point
  if (!winner || !draft.ending || !draft.best) throw new Error(`${id} saved without a point`)
  let d = draft
  if (rallyOne) d = { ...d, server: serverForWinner(d, winner), serveChecked: true }
  const rally = bestRally(d, id, winner, Boolean(d.best.kept))
  const set = match.sets[0]
  const base = rallyOne && d.server !== set.firstServer ? flipFirstServer(match, 1) : match
  return saveRally(base, 1, rally)
}

function scoreText(p: Points | null): string {
  return p ? `${p.me}-${p.them}` : 'none'
}

const expectedQ: Record<string, string[]> = {
  ace: ['end', 'point'],
  'serve fault': ['end', 'point'],
  '2 contacts': ['end', 'point', 'point', 'stroke', 'serve'],
  '3 contacts': ['end', 'point', 'stroke', 'serve', 'receive'],
  '4 contacts': ['end', 'point', 'stroke', 'serve', 'receive', 'third'],
  '10 contacts': ['end', 'point', 'stroke', 'serve', 'receive', 'third', 'fourth', 'shot 5', 'shot 6', 'shot 7', 'shot 8', 'shot 9'],
}

function traceLayout(layout: Layout) {
  let match = blankMatch()
  let score = ZERO
  let t0 = 10
  const savedDrafts: Draft[] = []

  const run = (name: string, n: number, end: BestEnd, mismatch: boolean) => {
    const set = match.sets[0]
    const rallyOne = set.rallies.length === 0
    const server = serverAt(set.firstServer, taggedScore(set) ?? ZERO)
    let d = openRally(server, n, t0)
    t0 += n + 2
    const questions: string[] = []
    let sawCounter = name !== '4 contacts' && name !== '10 contacts'
    try {
      for (let i = 0; i < 30; i++) {
        const q = question(d, rallyOne)
        const at = bestAt(d, rallyOne)
        if (layout === 'pad' && at.step === 'end' && q !== padFocus(d, rallyOne, null)) {
          throw new Error('pad showed more than one End question')
        }
        if (layout === 'buttons' && q === 'stroke' && at.step !== 'end') {
          throw new Error('buttons asked the last stroke off the End step')
        }
        questions.push(q)
        if (q === 'third') {
          const label = strokeLabel(d, 3, 'BH', 'Attack')
          if (label !== 'BH Counter') throw new Error(`third read "${label}"`)
          sawCounter = true
        }
        let next: Draft
        if (mismatch && q === 'point' && !d.best?.point) {
          const hint = bestHint(d, rallyOne)
          if (!hint) throw new Error('no hint to disagree with')
          next = bestSetPoint(d, otherSide(hint), rallyOne)
          const stuck = bestAdvance(next, rallyOne)
          if (stuck.save || !bestMismatch(stuck.draft, rallyOne) || padFocus(stuck.draft, rallyOne, null) !== 'point') {
            throw new Error('a disagreeing point opened the next question')
          }
          d = stuck.draft
          continue
        }
        next = answerOf(d, q, end, rallyOne)
        const adv = bestAdvance(next, rallyOne)
        if (adv.save) {
          d = adv.draft
          break
        }
        d = adv.draft
      }
      const want = expectedQ[name]
      if (questions.join(',') !== want.join(',')) throw new Error(`questions ${questions.join(' ')}`)
      if (!sawCounter) throw new Error('Counter label did not show')
      if (n >= 2 && d.shots[0]?.depth !== 'Short') throw new Error('serve length missing')
      if (n >= 4 && d.shots[2]?.stroke !== 'Attack') throw new Error('Counter saved as something other than Attack')
      for (let shot = 2; shot <= n; shot++) {
        if (!d.shots[shot - 1]?.stroke) throw new Error(`shot ${shot} has no stroke`)
      }
      const before = structuredClone(match)
      const winner = d.best?.point
      if (!winner) throw new Error('no winner')
      match = commit(match, d, rallyOne, `${layout}-${name}`)
      savedDrafts.push(d)
      score = addPoint(score, winner)
      const got = taggedScore(match.sets[0])
      const list = match.sets[0].rallies
      const rally = list[list.length - 1]
      if (!got || got.me !== score.me || got.them !== score.them) throw new Error(`score ${scoreText(got)} wanted ${scoreText(score)}`)
      if (list.length !== savedDrafts.length) throw new Error(`list ${list.length}`)
      if (!rally || rally.contacts.length !== n || rally.winner !== winner || rally.ending !== end || rally.idea?.result !== end) {
        throw new Error('list row does not match the saved rally')
      }
      if (match.sets[0].draft !== null) throw new Error('draft left open')
      if (list.length > 1 && list[list.length - 2].id !== before.sets[0].rallies[before.sets[0].rallies.length - 1]?.id) {
        throw new Error('earlier rallies moved')
      }
      note(layout, name, true, `score ${scoreText(got)} · list ${list.length} · ${end} · ${n} shots`)
      return before
    } catch (err) {
      note(layout, name, false, err instanceof Error ? err.message : String(err))
      return null
    }
  }

  run('ace', 1, 'Winner', false)
  run('serve fault', 1, 'Net', false)
  run('2 contacts', 2, 'Winner', true)
  run('3 contacts', 3, 'Winner', false)
  const beforeFour = run('4 contacts', 4, 'Winner', false)

  if (beforeFour && rows.at(-1)?.pass) {
    try {
      const set = match.sets[0]
      const scoreBefore = taggedScore(set)
      const listBefore = set.rallies.length
      const four = set.rallies[set.rallies.length - 1]
      const draft = savedDrafts[savedDrafts.length - 1]
      const target = cellTarget(draft, 2)
      if (!target || target.step !== 'receive') throw new Error('shot 2 did not reopen Receive')
      const reopened = withStep({ ...draft, closed: true }, target)
      match = restoreSet(match, { ...beforeFour.sets[0], draft: reopened })
      const dropped = taggedScore(match.sets[0])
      if (match.sets[0].rallies.length !== listBefore - 1) throw new Error('reopen left the rally in the list')
      if (scoreText(dropped) === scoreText(scoreBefore)) throw new Error('reopen left the score unchanged')
      let d = setWingStroke(match.sets[0].draft!, 2, 'BH', 'Control')
      const adv = bestAdvance(d, false)
      if (!adv.save) throw new Error('correction did not save')
      d = adv.draft
      match = commit(match, d, false, `${layout}-4-corrected`)
      const after = taggedScore(match.sets[0])
      const list = match.sets[0].rallies
      const fixed = list[list.length - 1]
      if (scoreText(after) !== scoreText(scoreBefore)) throw new Error(`score ${scoreText(after)} wanted ${scoreText(scoreBefore)}`)
      if (list.length !== listBefore) throw new Error(`list ${list.length}`)
      if (fixed.contacts.length !== 4 || fixed.winner !== four.winner) throw new Error('corrected rally changed the point')
      if (fixed.shots[1]?.wing !== 'BH' || fixed.shots[1]?.stroke !== 'Control') throw new Error('stroke did not change')
      if (list.slice(0, -1).map((r) => r.id).join() !== set.rallies.slice(0, -1).map((r) => r.id).join()) {
        throw new Error('other rallies changed')
      }
      score = after ?? score
      savedDrafts[savedDrafts.length - 1] = d
      note(layout, 'correction', true, `score ${scoreText(after)} · list ${list.length} · shot 2 BH Control`)
    } catch (err) {
      note(layout, 'correction', false, err instanceof Error ? err.message : String(err))
    }
  } else {
    note(layout, 'correction', false, '4 contacts did not save')
  }

  run('10 contacts', 10, 'Winner', false)
}

const opened = openRally('them', 2, 1)
const ended = bestSetEnd(opened, 'Winner')
const pointed = bestSetPoint(ended, 'me', false)
const oneQuestion =
  padFocus(opened, false, null) === 'end' &&
  !ended.best?.point &&
  padFocus(ended, false, null) === 'point' &&
  padFocus(pointed, false, null) === 'stroke' &&
  padFocus(pointed, false, 'end') === 'end' &&
  padFocus(pointed, false, 'point') === 'point'
note('pad', 'one question', oneQuestion, oneQuestion ? 'end, then point, then stroke' : 'phases overlapped')

traceLayout('pad')
traceLayout('buttons')

const failed = rows.filter((r) => !r.pass)
console.log(`${rows.length - failed.length}/${rows.length} passed`)
if (failed.length) process.exit(1)
