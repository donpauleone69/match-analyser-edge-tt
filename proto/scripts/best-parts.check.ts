/**
 * Best v0.12 parts. Opening, Attack, Rally, End.
 * Every shot sits in one part, in order. Run: npm run check:best-parts
 */
import { emptyDraft, type Draft, type ShotTags } from '../src/features/tagging/rally'
import {
  PART_LABEL,
  bestLoop,
  bestOpener,
  bestParts,
  bestRally,
  keepBestMarks,
  middleEvent,
  middleLine,
  nextStep,
  reviewLine,
  stepOpen,
  stepsFor,
  type BestPart,
} from '../src/features/tagging/bestFlow'

const fails: string[] = []
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) console.log(`pass ${name}`)
  else {
    fails.push(`${name} ${detail}`.trim())
    console.log(`FAIL ${name} ${detail}`.trim())
  }
}

const ORDER: BestPart[] = ['opening', 'attack', 'rally', 'end']
type Mark = 'attack' | 'control' | 'blank'

function shotsOf(n: number, marks: Record<number, Mark> = {}): ShotTags[] {
  const shots: ShotTags[] = Array.from({ length: n }, () => ({}))
  for (const [shot, mark] of Object.entries(marks)) {
    if (mark === 'blank') continue
    shots[Number(shot) - 1] = { wing: 'FH', stroke: mark === 'attack' ? 'Attack' : 'Control' }
  }
  return shots
}

function covers(n: number, marks: Record<number, Mark>) {
  const parts = bestParts(n, shotsOf(n, marks))
  let cursor = 1
  const names = parts.map((part) => part.part)
  for (const part of parts) {
    if (part.from !== cursor || part.to < part.from) return `${names.join(',')} broken at ${part.part} ${part.from}-${part.to}`
    cursor = part.to + 1
  }
  if (n > 0 && cursor !== n + 1) return `${names.join(',')} ends at ${cursor - 1}`
  const rank = names.map((name) => ORDER.indexOf(name))
  if (rank.some((r, i) => r < 0 || (i > 0 && r <= rank[i - 1]))) return `order ${names.join(',')}`
  if (names.some((name) => !(name in PART_LABEL))) return `label ${names.join(',')}`
  return ''
}

const mixes = (k: number): Mark[][] => {
  if (k === 0) return [[]]
  const rest = mixes(k - 1)
  const out: Mark[][] = []
  for (const mark of ['attack', 'control', 'blank'] as const) {
    for (const tail of rest) out.push([mark, ...tail])
  }
  return out
}

let cases = 0
for (let n = 1; n <= 13; n++) {
  const asked = [...new Set([2, 3, n].filter((shot) => shot >= 2 && shot <= n && (shot <= 3 || n >= 4)))]
  for (const mix of mixes(asked.length)) {
    const marks: Record<number, Mark> = {}
    asked.forEach((shot, i) => {
      marks[shot] = mix[i]
    })
    cases++
    const problem = covers(n, marks)
    if (problem) fails.push(`n=${n} ${JSON.stringify(marks)} ${problem}`)
  }
}
ok(`cover 1 to n, ${cases} mixes`, fails.length === 0, fails[0] ?? '')

function show(n: number, marks: Record<number, Mark>) {
  return bestParts(n, shotsOf(n, marks))
    .map((part) => `${PART_LABEL[part.part]} ${part.from}${part.to === part.from ? '' : `-${part.to}`}`)
    .join(', ')
}

const named: [string, number, Record<number, Mark>, string][] = [
  ['ace', 1, {}, 'Opening 1'],
  ['receive error', 2, { 2: 'control' }, 'Opening 1, End 2'],
  ['receive attack', 2, { 2: 'attack' }, 'Opening 1, Attack 2'],
  ['third ball', 3, { 2: 'control', 3: 'attack' }, 'Opening 1-2, Attack 3'],
  ['three control', 3, { 2: 'control', 3: 'control' }, 'Opening 1, End 2-3'],
  ['four receive attack', 4, { 2: 'attack', 3: 'control', 4: 'control' }, 'Opening 1, Attack 2-4'],
  ['four late attack', 4, { 2: 'control', 3: 'control', 4: 'attack' }, 'Opening 1-3, Attack 4'],
  ['four control', 4, { 2: 'control', 3: 'control', 4: 'control' }, 'Opening 1, End 2-4'],
  ['five unknown', 5, { 2: 'control', 3: 'control', 5: 'control' }, 'Opening 1-2, End 3-5'],
  ['six receive attack', 6, { 2: 'attack' }, 'Opening 1, Attack 2-6'],
  ['six unknown', 6, { 2: 'control', 3: 'control' }, 'Opening 1-3, End 4-6'],
  ['seven receive attack', 7, { 2: 'attack' }, 'Opening 1, Attack 2-4, End 5-7'],
  ['seven third', 7, { 2: 'control', 3: 'attack' }, 'Opening 1-2, Attack 3-7'],
  ['eight before answers', 8, {}, 'Opening 1-3, Rally 4-5, End 6-8'],
  ['eight receive attack', 8, { 2: 'attack' }, 'Opening 1, Attack 2-4, Rally 5, End 6-8'],
  ['eight third', 8, { 2: 'control', 3: 'attack' }, 'Opening 1-2, Attack 3-5, End 6-8'],
  ['nine unknown', 9, { 2: 'control', 3: 'control' }, 'Opening 1-3, Rally 4-6, End 7-9'],
  ['ten third', 10, { 2: 'control', 3: 'attack' }, 'Opening 1-2, Attack 3-5, Rally 6-7, End 8-10'],
  ['ten last attack', 10, { 2: 'control', 3: 'control', 10: 'attack' }, 'Opening 1-3, Rally 4-7, End 8-10'],
]
for (const [name, n, marks, expected] of named) {
  ok(name, show(n, marks) === expected, show(n, marks))
}

ok('unknown has no attack part', bestOpener(8, shotsOf(8)) === 'unknown')
ok('serve point opener', bestOpener(1, shotsOf(1)) === 'none')

function draft(n: number, marks: Record<number, Mark>, extra: Partial<Draft> = {}): Draft {
  return {
    ...emptyDraft('v', 'me'),
    contacts: Array.from({ length: n }, (_, i) => i + 1),
    shots: shotsOf(n, marks),
    closed: true,
    ...extra,
  }
}

const eight = draft(8, {})
ok('middle step before answers', stepsFor(eight).includes('middle'))
const after = draft(8, { 2: 'control', 3: 'attack' })
ok('middle step gone after third attack', !stepsFor(after).includes('middle'))
ok('third then finish', nextStep(after, 'third') === 'finish')
const withRally = draft(8, { 2: 'attack' })
ok('third then middle', nextStep(withRally, 'third') === 'middle')
ok('finish open from middle', stepOpen({ ...withRally, best: { flow: 'best', step: 'middle' } }, 'finish', 'middle'))
ok('finish shut on serve', !stepOpen(withRally, 'finish', 'serve'))

const marked = draft(8, {}, {
  best: { flow: 'best', step: 'finish', review: ['end', 'rally'], middle: 'them' },
})
const kept = keepBestMarks(draft(8, { 2: 'control', 3: 'attack' }, { best: marked.best }))
ok('end mark follows', kept.best?.review?.join(',') === 'end')
ok('middle answer dropped', kept.best?.middle === undefined)

const gone = keepBestMarks(
  draft(7, { 2: 'attack' }, { best: { flow: 'best', step: 'middle', middle: 'me', review: ['rally', 'end'] } }),
)
ok('step leaves middle', gone.best?.step === 'finish' && gone.best.middle === undefined && gone.best.review?.join(',') === 'end')

const saved = bestRally(
  draft(10, { 2: 'control', 3: 'attack' }, {
    ending: 'Net',
    best: { flow: 'best', step: 'finish', end: 'Net', middle: 'them', review: ['end', 'rally'] },
  }),
  'r',
  'me',
  false,
)
ok('saved middle', saved.idea?.middle === 'them')
ok('saved review order', saved.idea?.review?.join(',') === 'rally,end')
const names = { me: 'You', them: 'Kim' }
ok('list middle', middleLine(saved, names) === 'Middle Kim')
ok('list review', reviewLine(saved) === 'Review Rally, End')

const loop = bestLoop(withRally, 'middle')
const from = withRally.contacts[4]
const to = withRally.contacts[5]
ok('middle loop is the rally shot', loop.a < from && loop.b <= to && loop.b > from, `${loop.a}..${loop.b} shot ${from}..${to}`)

ok('kept', middleEvent(draft(8, { 2: 'attack' }, { best: { flow: 'best', middle: 'them' } })) === 'kept')
ok('turned', middleEvent(draft(8, { 2: 'attack' }, { best: { flow: 'best', middle: 'me' } })) === 'turned')
ok('reset', middleEvent(draft(8, { 2: 'attack' }, { best: { flow: 'best', middle: 'none' } })) === 'reset')
ok(
  'opened',
  middleEvent(draft(9, { 2: 'control', 3: 'control' }, { best: { flow: 'best', middle: 'me' } })) === 'opened',
)
ok(
  'control',
  middleEvent(draft(9, { 2: 'control', 3: 'control' }, { best: { flow: 'best', middle: 'none' } })) === 'control',
)
ok(
  'bestfa name counts',
  middleEvent(
    draft(10, { 2: 'control', 3: 'control', 10: 'attack' }, { best: { flow: 'bestfa', first: 'Kim', middle: 'them' } }),
    names,
  ) === 'kept',
)

if (fails.length) {
  console.log(`${fails.length} failed`)
  process.exit(1)
}
console.log('all passed')
