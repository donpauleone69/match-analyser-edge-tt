/**
 * Best + FA v0.13 questions. Order, cell targets and marks, routing, the save
 * point, stroke roles, Who attacked first?, the Nobody rule, the mismatch line
 * and the fixes, for 1 to 13 shots. Run: npm run check:best-steps
 */
import { emptyDraft, type Draft, type ShotTags, type Side } from '../src/features/tagging/rally'
import {
  asksWhoFirst,
  bestAdvance,
  bestAsked,
  bestAt,
  bestDeleteFirst,
  bestDeleteLast,
  bestLoop,
  bestMismatch,
  bestParts,
  bestRally,
  bestSetEnd,
  bestSetFirst,
  bestSetPoint,
  bestSwitchServer,
  bestTaps,
  bestTossInstead,
  canOpenCell,
  cellMark,
  cellTarget,
  endShots,
  faLine,
  mismatchLine,
  nobodyHidden,
  partsOf,
  PART_LABEL,
  rallyPage,
  removeBestContact,
  reviewLine,
  setDepth,
  setWingStroke,
  stepsFor,
  strokeLabel,
  strokeRole,
  toggleReview,
  unaskedShots,
  type BestAt,
  type BestEnd,
} from '../src/features/tagging/bestFlow'

const fails: string[] = []
let passes = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) passes++
  else {
    fails.push(`${name} ${detail}`.trim())
    console.log(`FAIL ${name} ${detail}`.trim())
  }
}
const eq = (name: string, got: unknown, want: unknown) => ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`)

const names: Record<Side, string> = { me: 'You', them: 'Kim' }
type Mark = 'A' | 'C' | '-'

function closed(n: number, server: Side = 'me'): Draft {
  return {
    ...emptyDraft('v', server),
    contacts: Array.from({ length: n }, (_, i) => 10 + i),
    shots: Array.from({ length: n }, () => ({})),
    closed: true,
    best: { flow: 'bestfa', step: 'end' },
  }
}

function tagged(n: number, marks: Record<number, Mark>, server: Side = 'me'): Draft {
  const d = closed(n, server)
  const shots: ShotTags[] = d.shots.map(() => ({}))
  for (const [k, m] of Object.entries(marks)) {
    if (m === '-') continue
    shots[Number(k) - 1] = { wing: 'FH', stroke: m === 'A' ? 'Attack' : 'Control' }
  }
  return { ...d, shots }
}

const show = (d: Pick<Draft, 'contacts' | 'shots' | 'best'>) =>
  partsOf(d)
    .map((p) => `${PART_LABEL[p.part]} ${p.from}${p.to === p.from ? '' : `-${p.to}`}`)
    .join(', ')

/** A walk as the screen runs it: each answer, then the route. Returns the order of questions and whether it saved. */
type Step = { do: (d: Draft) => Draft }
function walk(start: Draft, rallyOne: boolean, answers: ((d: Draft, at: BestAt) => Draft)[]) {
  let d = start
  const seen: string[] = []
  let saved = false
  for (const answer of answers) {
    if (saved) {
      seen.push('extra answer after save')
      break
    }
    const at = bestAt(d, rallyOne)
    seen.push(at.step === 'shots' ? `shot ${at.page}` : at.step)
    d = answer(d, at)
    const r = bestAdvance(d, rallyOne)
    d = r.draft
    saved = r.save
  }
  return { d, seen, saved }
}
const shotOf = (d: Draft, at: BestAt) => {
  const n = d.contacts.length
  return at.step === 'end' ? n : at.step === 'receive' ? 2 : at.step === 'third' ? 3 : at.step === 'fourth' ? 4 : (at.page ?? n)
}
const stroke = (stroke: 'Attack' | 'Control', wing: 'FH' | 'BH' = 'FH') => (d: Draft, at: BestAt) =>
  setWingStroke(d, shotOf(d, at), wing, stroke)
const end = (e: BestEnd, point: Side, rallyOne = false) => (d: Draft) => bestSetPoint(bestSetEnd(d, e), point, rallyOne)
const serve = (depth: 'Short' | 'Long') => (d: Draft) => setDepth(d, depth)

/* ---------- Asked shots, steps, End shots, taps ---------- */

eq('asked 10', Array.from({ length: 10 }, (_, i) => i + 1).filter((k) => bestAsked(10, k)), [2, 3, 4, 8, 9, 10])
eq('asked 7', Array.from({ length: 7 }, (_, i) => i + 1).filter((k) => bestAsked(7, k)), [2, 3, 4, 5, 6, 7])
eq('asked 6', Array.from({ length: 6 }, (_, i) => i + 1).filter((k) => bestAsked(6, k)), [2, 3, 4, 5, 6])
eq('end shots 5', endShots(5), [4])
eq('end shots 6', endShots(6), [4, 5])
eq('end shots 7', endShots(7), [5, 6])
eq('end shots 10', endShots(10), [8, 9])
eq('end shots 4', endShots(4), [])
eq('steps 1', stepsFor(closed(1)), ['end'])
eq('steps 2', stepsFor(closed(2)), ['end', 'serve'])
eq('steps 4', stepsFor(closed(4)), ['end', 'serve', 'receive', 'third'])
eq('steps 6', stepsFor(closed(6)), ['end', 'serve', 'receive', 'third', 'shots'])
eq('steps 7', stepsFor(closed(7)), ['end', 'serve', 'receive', 'third', 'fourth', 'shots'])
// Who attacked first? covers shots 5 to n-3, so only 8+ shots with no attack on 2 to 4.
eq('who first 7 all control', asksWhoFirst(tagged(7, { 2: 'C', 3: 'C', 4: 'C' })), false)
eq('who first 7 blank', asksWhoFirst(closed(7)), false)
eq('who first 8 all control', asksWhoFirst(tagged(8, { 2: 'C', 3: 'C', 4: 'C' })), true)
eq('who first 8 shot 4 attack', asksWhoFirst(tagged(8, { 2: 'C', 3: 'C', 4: 'A' })), false)
eq('unasked 7', unaskedShots(7), [])
eq('unasked 10', unaskedShots(10), [5, 6, 7])
eq('cell targets 7, no Rally page', [5, 6].map((k) => cellTarget(closed(7), k)), [{ step: 'shots', page: 5 }, { step: 'shots', page: 6 }])
const taps: [number, number][] = [[1, 3], [2, 6], [3, 8], [4, 10], [5, 12], [6, 14], [7, 16], [10, 19]]
for (const [n, t] of taps) eq(`taps ${n}`, bestTaps(n), t)

/* ---------- Every mix, 1 to 13 shots ---------- */

const mixes = (k: number): Mark[][] => {
  if (k === 0) return [[]]
  const rest = mixes(k - 1)
  return (['A', 'C', '-'] as Mark[]).flatMap((m) => rest.map((t) => [m, ...t]))
}
let cases = 0
for (let n = 1; n <= 13; n++) {
  const asked = Array.from({ length: n }, (_, i) => i + 1).filter((k) => bestAsked(n, k))
  for (const mix of mixes(asked.length)) {
    const marks: Record<number, Mark> = {}
    asked.forEach((k, i) => (marks[k] = mix[i]))
    for (const first of [undefined, 'me', 'none'] as const) {
      cases++
      const d0 = tagged(n, marks)
      const d: Draft = { ...d0, best: { ...d0.best!, ...(first ? { first } : {}) } }
      const tag = `n=${n} ${mix.join('')} ${first ?? ''}`
      // Parts cover 1 to n in order.
      let cursor = 1
      for (const p of partsOf(d)) {
        if (p.from !== cursor) ok(`cover ${tag}`, false, show(d))
        cursor = p.to + 1
      }
      if (cursor !== n + 1) ok(`cover end ${tag}`, false, show(d))
      // Every cell target is a step the rally has, or none for an unasked shot with no Who attacked first?.
      for (let k = 1; k <= n; k++) {
        const t = cellTarget(d, k)
        if (t && !stepsFor(d).includes(t.step)) ok(`target ${tag} cell ${k}`, false, JSON.stringify(t))
        if (!t && (bestAsked(n, k) || k === 1 || k === n)) ok(`asked cell has a target ${tag} ${k}`, false)
        if (!t && asksWhoFirst(d)) ok(`who cells have a target ${tag} ${k}`, false)
      }
      // Counter only after an asked attack, never on shot 2.
      for (let k = 2; k <= n; k++) {
        const role = strokeRole(d, k)
        const before = d.shots[k - 2]?.stroke === 'Attack' && k >= 3 && bestAsked(n, k - 1)
        if (role === 'Counter' && !before) ok(`counter ${tag} ${k}`, false)
        if (role === 'Attack' && before) ok(`attack not counter ${tag} ${k}`, false)
      }
      // A Counter is never the first attack.
      const fa = bestRally(d, 'r', 'me', false).fa
      if (fa !== null && strokeRole(d, fa) === 'Counter') ok(`fa counter ${tag}`, false)
      // Who attacked first? only with unasked shots and no attack on 2, 3, 4.
      const want = n >= 8 && ![2, 3, 4].some((k) => d.shots[k - 1]?.stroke === 'Attack')
      if (asksWhoFirst(d) !== want) ok(`who first ${tag}`, false)
      // Nobody hidden exactly when an End shot is an attack.
      const hidden = [n - 2, n - 1, n].some((k) => k >= 2 && d.shots[k - 1]?.stroke === 'Attack')
      if (nobodyHidden(d) !== hidden) ok(`nobody hidden ${tag}`, false)
    }
  }
}
ok(`all mixes, ${cases} cases`, true)
console.log(`mixes: ${cases}`)

/* ---------- Every rally length walks to a save in order ---------- */

for (let n = 1; n <= 13; n++) {
  const d = closed(n, 'me')
  const answers: ((d: Draft, at: BestAt) => Draft)[] = [end('Winner', n % 2 === 1 ? 'me' : 'them')]
  if (n >= 2) answers.push(stroke('Control'))
  if (n >= 2) answers.push(serve('Short'))
  if (n >= 3) answers.push(stroke('Control'))
  if (n >= 4) answers.push(stroke('Control'))
  if (n >= 7) answers.push(stroke('Control'))
  for (const _ of endShots(n)) answers.push(stroke('Control'))
  const w = walk(d, false, answers)
  const want = ['end']
  if (n >= 2) want.push('end', 'serve')
  if (n >= 3) want.push('receive')
  if (n >= 4) want.push('third')
  if (n >= 7) want.push('fourth')
  for (const k of endShots(n)) want.push(`shot ${k}`)
  eq(`order n=${n}`, w.seen, want)
  ok(`saves on the last answer n=${n}`, w.saved)
  // The first answer is End and Point to, two taps.
  eq(`answers n=${n} match taps`, n + answers.length + 1, bestTaps(n))
}

/* ---------- R cases (pure parts) ---------- */

// R1 Ace.
{
  const w = walk(closed(1), false, [(d) => bestSetEnd(d, 'Winner'), (d) => bestSetPoint(d, 'me', false)])
  eq('R1 order', w.seen, ['end', 'end'])
  ok('R1 Point to saves', w.saved)
  eq('R1 parts', show(w.d), 'Opening 1')
}
// R2 Service fault Net: the hint lights the receiver.
{
  const d = bestSetEnd(closed(1, 'me'), 'Net')
  eq('R2 hint', d.ending && bestMismatch(bestSetPoint(d, 'them', false), false), false)
  ok('R2 mismatch on server', bestMismatch(bestSetPoint(d, 'me', false), false))
}
// R3 2 shots, receive error.
{
  const w = walk(closed(2), false, [end('Net', 'me'), stroke('Control'), serve('Short')])
  eq('R3 order', w.seen, ['end', 'end', 'serve'])
  ok('R3 Serve saves', w.saved)
}
// R4 3 shots third ball winner.
{
  const w = walk(closed(3), false, [end('Winner', 'me'), stroke('Attack'), serve('Short'), stroke('Control')])
  eq('R4 order', w.seen, ['end', 'end', 'serve', 'receive'])
  ok('R4 saves', w.saved)
  eq('R4 FA', bestRally(w.d, 'r', 'me', false).fa, 3)
}
// R5 4 shots late attack into the net.
{
  const w = walk(closed(4), false, [end('Net', 'me'), stroke('Attack'), serve('Long'), stroke('Control'), stroke('Control')])
  eq('R5 order', w.seen, ['end', 'end', 'serve', 'receive', 'third'])
  ok('R5 saves', w.saved)
  ok('R5 no Rally question', !asksWhoFirst(w.d))
  eq('R5 parts', show(w.d), 'Opening 1-3, Attack 4')
}
// R6 5 shots.
{
  const w = walk(closed(5), false, [end('Winner', 'me'), stroke('Attack'), serve('Short'), stroke('Control'), stroke('Control'), stroke('Control')])
  eq('R6 order', w.seen, ['end', 'end', 'serve', 'receive', 'third', 'shot 4'])
  ok('R6 saves on shot 4', w.saved)
}
// R7 6 shots, shot 2 attack, Third reads Counter.
{
  let d = closed(6)
  d = setWingStroke(d, 2, 'BH', 'Attack')
  eq('R7 third reads Counter', strokeLabel(d, 3, 'FH', 'Attack'), 'FH Counter')
  const w = walk(closed(6), false, [end('Winner', 'them'), stroke('Control'), serve('Short'), stroke('Attack'), stroke('Control'), stroke('Control'), stroke('Control')])
  eq('R7 order', w.seen, ['end', 'end', 'serve', 'receive', 'third', 'shot 4', 'shot 5'])
  eq('R7 parts', show(w.d), 'Opening 1, Attack 2-6')
}
// R8 8 shots, shot 2 attack: shot 4 is asked after Third.
{
  const answers = [end('Winner', 'them'), stroke('Control'), serve('Short'), stroke('Attack'), stroke('Control'), stroke('Control'), stroke('Control'), stroke('Control')]
  const w = walk(closed(8), false, answers)
  eq('R8 order', w.seen, ['end', 'end', 'serve', 'receive', 'third', 'fourth', 'shot 6', 'shot 7'])
  ok('R8 no Rally question', !asksWhoFirst(w.d))
  eq('R8 parts', show(w.d), 'Opening 1, Attack 2-4, Rally 5, End 6-8')
}
// R9 10 shots, 2 and 3 control.
{
  let d = closed(10)
  d = walk(d, false, [end('Winner', 'them')]).d
  eq('R9 after End', bestAt(d, false), { step: 'end' })
  eq('R9 last stroke reads Attack', strokeLabel(d, 10, 'FH', 'Attack'), 'FH Attack')
  const w = walk(closed(10), false, [
    end('Winner', 'them'),
    stroke('Attack'),
    serve('Short'),
    stroke('Control'),
    stroke('Control'),
    stroke('Control'),
    stroke('Attack'),
    stroke('Attack', 'BH'),
  ])
  eq('R9 order', w.seen, ['end', 'end', 'serve', 'receive', 'third', 'fourth', 'shot 8', 'shot 9'])
  ok('R9 saves on shot 9', w.saved)
  ok('R9 shot 8 page has the question', rallyPage(walk(closed(10), false, []).d, 8) === true)
  eq('R9 9 reads Counter after 8 attack', strokeRole(w.d, 9), 'Counter')
  eq('R9 10 relabels to Counter', strokeRole(w.d, 10), 'Counter')
  ok('R9 Nobody hidden', nobodyHidden(w.d))
  const loop = bestLoop(walk(closed(10), false, []).d, { step: 'shots', page: 8 })
  ok('R9 shot 8 page loops from shot 5', loop.a < 14 && loop.a > 13.5 && loop.b > 17 && loop.b <= 18, `${loop.a}..${loop.b}`)
}
// R10 Counter relabel.
{
  let d = closed(6)
  d = setWingStroke(d, 2, 'BH', 'Attack')
  d = setWingStroke(d, 3, 'FH', 'Attack')
  eq('R10 shot 3 Counter', strokeRole(d, 3), 'Counter')
  d = setWingStroke(d, 2, 'BH', 'Control')
  eq('R10 shot 3 Attack', strokeRole(d, 3), 'Attack')
  eq('R10 shot 3 is FA', bestRally(d, 'r', 'me', false).fa, 3)
  eq('R10 parts', show(d), 'Opening 1-2, Attack 3-6')
}
// R11 Cell marks on 10 shots after End.
{
  let d = closed(10)
  d = walk(d, false, [end('Winner', 'them'), stroke('Attack')]).d
  const at = bestAt(d, false)
  const marks = Array.from({ length: 10 }, (_, i) => cellMark(d, i + 1, false, at))
  eq('R11 marks', marks, ['now', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'done'])
  const before = bestSetEnd(closed(10), 'Winner')
  ok('R11 cell 4 shut before the check', !canOpenCell(before, 4, false))
  ok('R11 cell 10 opens', canOpenCell(before, 10, false))
  const mis = bestSetPoint(before, 'me', false)
  ok('R11 cell 2 shut while it disagrees', !canOpenCell(mis, 2, false))
}
// R12 Rally skip and Nobody.
{
  const w = walk(closed(10), false, [end('Winner', 'them'), stroke('Attack'), serve('Short'), stroke('Control'), stroke('Control'), stroke('Control'), stroke('Control')])
  eq('R12 skip goes to 9', bestAt(w.d, false), { step: 'shots', page: 9 })
  eq('R12 rally cells faint', [5, 6, 7].map((k) => cellMark(w.d, k, false, bestAt(w.d, false))), ['off', 'off', 'off'])
  const nine = walk(closed(9), false, [
    end('Long', 'them'),
    stroke('Control', 'BH'),
    serve('Short'),
    stroke('Control', 'BH'),
    stroke('Control'),
    stroke('Control'),
    (d) => bestSetFirst(d, 'none'),
    stroke('Control'),
    stroke('Attack'),
  ])
  eq('R12 nine order', nine.seen, ['end', 'end', 'serve', 'receive', 'third', 'fourth', 'shot 7', 'shot 7', 'shot 8'])
  ok('R12 nine saves', nine.saved)
  eq('R12 FA 8', bestRally(nine.d, 'r', 'them', false).fa, 8)
  eq('R12 parts', show(nine.d), 'Opening 1-7, Attack 8-9')
  eq('R12 Who first clears on a second tap', bestSetFirst(bestSetFirst(closed(9), 'me'), 'me').best?.first, undefined)
}
// R15 Extra end tap: 6 contacts, Winner, Point to You.
{
  let d = bestSetPoint(bestSetEnd(closed(6), 'Winner'), 'me', false)
  eq('R15 line', mismatchLine(d, names), "Point to You, but shot 6, the winner, is Kim's.")
  ok('R15 mismatch', bestMismatch(d, false))
  d = bestDeleteLast(d)
  ok('R15 agrees after Delete last', !bestMismatch(d, false))
  eq('R15 End and Point kept', [d.ending, d.best?.point, d.contacts.length], ['Winner', 'me', 5])
  eq('R15 cut set', d.best?.cut, 15)
}
// R16 Toss tapped (Kim serves): Delete first, and Delete first instead.
{
  let d = bestSetPoint(bestSetEnd(closed(6, 'them'), 'Winner'), 'them', false)
  eq('R16 line', mismatchLine(d, names), 'Point to Kim, but shot 6, the winner, is yours.')
  const first = bestDeleteFirst(d)
  ok('R16 Delete first agrees', !bestMismatch(first, false) && first.contacts[0] === 11 && first.contacts.length === 5)
  d = bestDeleteLast(d)
  d = setWingStroke(d, 5, 'FH', 'Attack')
  const back = bestTossInstead(d)
  eq('R16 toss instead contacts', back.contacts, [11, 12, 13, 14, 15])
  eq('R16 last stroke moved', [back.shots[4]?.stroke, back.shots[3]?.stroke], ['Attack', undefined])
  ok('R16 agrees', !bestMismatch(back, false))
  eq('R16 serve clears the offer', setDepth(d, 'Long').best?.cut, undefined)
}
// R17 Double tap in the middle: delete the double, tags stay.
{
  let d = bestSetPoint(bestSetEnd(closed(10, 'them'), 'Winner'), 'them', false)
  ok('R17 mismatch', bestMismatch(d, false))
  d = setWingStroke(d, 3, 'BH', 'Control')
  d = removeBestContact(d, 7)
  ok('R17 agrees', !bestMismatch(d, false))
  eq('R17 tags stay', d.shots[2]?.stroke, 'Control')
  eq('R17 end shots redraw', endShots(d.contacts.length), [7, 8])
}
// R19 Keep as is.
{
  const d = bestSetPoint(bestSetEnd(closed(5), 'Winner'), 'them', false)
  const kept = { ...d, best: { ...d.best!, kept: true as const } }
  ok('R19 kept agrees', !bestMismatch(kept, false))
  eq('R19 saved check', bestRally(kept, 'r', 'them', true).idea?.check, 'Check the point')
  ok('R19 a delete drops Keep', removeBestContact(kept, 2).best?.kept === undefined)
}
// R20 Switch server: every hitter flips.
{
  let d = bestSetPoint(bestSetEnd(closed(5, 'me'), 'Winner'), 'them', false)
  ok('R20 mismatch', bestMismatch(d, false))
  d = bestSwitchServer(d)
  ok('R20 agrees', !bestMismatch(d, false) && d.server === 'them')
}
// R21 1 shot mismatch.
{
  const d = bestSetPoint(bestSetEnd(closed(1, 'me'), 'Winner'), 'them', false)
  ok('R21 mismatch', bestMismatch(d, false))
  eq('R21 line', mismatchLine(d, names), 'Point to Kim, but shot 1, the winner, is yours.')
}
// R22 Rally one: no hint, Point to sets the server.
{
  let d = bestSetEnd(closed(3, 'me'), 'Winner')
  d = bestSetPoint(d, 'them', true)
  ok('R22 no mismatch', !bestMismatch(d, true))
  eq('R22 server set', d.server, 'them')
}
// R23 Server switch after End is done reopens End.
{
  const w = walk(closed(5), false, [end('Winner', 'me'), stroke('Attack')])
  const d = bestSwitchServer(w.d)
  eq('R23 End reopens', bestAt(d, false), { step: 'end' })
}
// R24 Error line.
{
  const d = bestSetPoint(bestSetEnd(closed(9, 'them'), 'Long'), 'them', false)
  eq('R24 line', mismatchLine(d, names), "Point to Kim, but shot 9, the long error, is Kim's.")
}

/* ---------- Saved data and list lines ---------- */

{
  let d = closed(10)
  d = walk(d, false, [end('Winner', 'them'), stroke('Attack'), serve('Short'), stroke('Control'), stroke('Control'), stroke('Control'), (x) => bestSetFirst(x, 'me'), stroke('Attack'), stroke('Attack')]).d
  d = toggleReview(d, 'end')
  d = toggleReview(d, 'rally')
  const r = bestRally(d, 'r', 'them', false)
  eq('saved first', r.idea?.first, 'me')
  eq('saved review order', r.idea?.review, ['rally', 'end'])
  eq('list FA', faLine(r, names), 'FA You')
  eq('list review', reviewLine(r), 'Review Rally, End')
  eq('parts', show(d), 'Opening 1-4, Rally 5-7, End 8-10')
  const strayed = setWingStroke(d, 6, 'FH', 'Attack')
  eq('unasked stroke not saved', bestRally(strayed, 'r', 'them', false).shots[5]?.stroke, undefined)
}
{
  const d = setWingStroke(closed(8), 2, 'FH', 'Attack')
  const r = bestRally(d, 'r', 'me', false)
  eq('list FA shot', faLine(r, names), 'FA 2')
}

/* ---------- Parts with shot 4 ---------- */

const named: [string, number, Record<number, Mark>, string][] = [
  ['ace', 1, {}, 'Opening 1'],
  ['receive error', 2, { 2: 'C' }, 'Opening 1, End 2'],
  ['third ball', 3, { 2: 'C', 3: 'A' }, 'Opening 1-2, Attack 3'],
  ['four late attack', 4, { 2: 'C', 3: 'C', 4: 'A' }, 'Opening 1-3, Attack 4'],
  ['six unknown', 6, { 2: 'C', 3: 'C' }, 'Opening 1-3, End 4-6'],
  ['seven all control', 7, { 2: 'C', 3: 'C', 4: 'C', 5: 'C', 6: 'C', 7: 'C' }, 'Opening 1-4, End 5-7'],
  ['seven shot 4 attack', 7, { 2: 'C', 3: 'C', 4: 'A' }, 'Opening 1-3, Attack 4-7'],
  ['eight before answers', 8, {}, 'Opening 1-4, Rally 5, End 6-8'],
  ['eight receive attack', 8, { 2: 'A' }, 'Opening 1, Attack 2-4, Rally 5, End 6-8'],
  ['nine unknown', 9, { 2: 'C', 3: 'C', 4: 'C' }, 'Opening 1-4, Rally 5-6, End 7-9'],
  ['ten shot 4 attack', 10, { 2: 'C', 3: 'C', 4: 'A' }, 'Opening 1-3, Attack 4-6, Rally 7, End 8-10'],
  ['ten third', 10, { 2: 'C', 3: 'A' }, 'Opening 1-2, Attack 3-5, Rally 6-7, End 8-10'],
]
for (const [name, n, marks, want] of named) eq(`parts ${name}`, show(tagged(n, marks)), want)
eq('Nobody parts nine', bestParts(9, tagged(9, { 2: 'C', 3: 'C', 4: 'C', 7: 'C', 8: 'A', 9: 'C' }).shots, 'none').map((p) => p.part), ['opening', 'attack'])

if (fails.length) {
  console.log(`${fails.length} failed, ${passes} passed`)
  process.exit(1)
}
console.log(`all passed (${passes} checks)`)
