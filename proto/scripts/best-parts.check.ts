/**
 * Best + FA v0.13 parts. Opening, Attack, Rally, End.
 * Every shot sits in one part, in order. Run: npm run check:best-parts
 */
import { type ShotTags } from '../src/features/tagging/rally'
import { PART_LABEL, bestAsked, bestOpener, bestParts, type BestFirst, type BestPart } from '../src/features/tagging/bestFlow'

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

function covers(n: number, marks: Record<number, Mark>, first?: BestFirst) {
  const parts = bestParts(n, shotsOf(n, marks), first)
  let cursor = 1
  const names = parts.map((part) => part.part)
  for (const part of parts) {
    if (part.from !== cursor || part.to < part.from) return `${names.join(',')} broken at ${part.part} ${part.from}-${part.to}`
    cursor = part.to + 1
  }
  if (n > 0 && cursor !== n + 1) return `${names.join(',')} ends at ${cursor - 1}`
  const rank = names.map((name) => ORDER.indexOf(name))
  if (rank.some((r, i) => r < 0 || (i > 0 && r <= rank[i - 1]))) return `order ${names.join(',')}`
  return ''
}

const mixes = (k: number): Mark[][] => {
  if (k === 0) return [[]]
  const rest = mixes(k - 1)
  return (['attack', 'control', 'blank'] as const).flatMap((mark) => rest.map((tail) => [mark, ...tail]))
}

let cases = 0
const coverFails: string[] = []
for (let n = 1; n <= 13; n++) {
  const asked = Array.from({ length: n }, (_, i) => i + 1).filter((k) => bestAsked(n, k))
  for (const mix of mixes(asked.length)) {
    const marks: Record<number, Mark> = {}
    asked.forEach((shot, i) => (marks[shot] = mix[i]))
    for (const first of [undefined, 'me', 'none'] as const) {
      cases++
      const problem = covers(n, marks, first)
      if (problem) coverFails.push(`n=${n} ${JSON.stringify(marks)} ${first ?? ''} ${problem}`)
    }
  }
}
ok(`cover 1 to n, ${cases} mixes`, coverFails.length === 0, coverFails[0] ?? '')

function show(n: number, marks: Record<number, Mark>, first?: BestFirst) {
  return bestParts(n, shotsOf(n, marks), first)
    .map((part) => `${PART_LABEL[part.part]} ${part.from}${part.to === part.from ? '' : `-${part.to}`}`)
    .join(', ')
}

const named: [string, number, Record<number, Mark>, string, BestFirst?][] = [
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
  ['seven shot 4 attack', 7, { 2: 'control', 3: 'control', 4: 'attack' }, 'Opening 1-3, Attack 4-7'],
  ['eight before answers', 8, {}, 'Opening 1-4, Rally 5, End 6-8'],
  ['eight receive attack', 8, { 2: 'attack' }, 'Opening 1, Attack 2-4, Rally 5, End 6-8'],
  ['eight third', 8, { 2: 'control', 3: 'attack' }, 'Opening 1-2, Attack 3-5, End 6-8'],
  ['nine unknown', 9, { 2: 'control', 3: 'control', 4: 'control' }, 'Opening 1-4, Rally 5-6, End 7-9'],
  ['nine nobody', 9, { 2: 'control', 3: 'control', 4: 'control', 7: 'control', 8: 'attack' }, 'Opening 1-7, Attack 8-9', 'none'],
  ['ten third', 10, { 2: 'control', 3: 'attack' }, 'Opening 1-2, Attack 3-5, Rally 6-7, End 8-10'],
  ['ten last attack', 10, { 2: 'control', 3: 'control', 10: 'attack' }, 'Opening 1-4, Rally 5-7, End 8-10'],
  ['ten who first', 10, { 2: 'control', 3: 'control', 4: 'control' }, 'Opening 1-4, Rally 5-7, End 8-10', 'me'],
]
for (const [name, n, marks, expected, first] of named) {
  ok(name, show(n, marks, first) === expected, show(n, marks, first))
}

ok('unknown has no attack part', bestOpener(8, shotsOf(8)) === 'unknown')
ok('serve point opener', bestOpener(1, shotsOf(1)) === 'none')
ok('nobody passes the unasked shots', bestOpener(10, shotsOf(10, { 2: 'control', 3: 'control', 4: 'control', 8: 'attack' }), 'none') === 8)

if (fails.length) {
  console.log(`${fails.length} failed`)
  process.exit(1)
}
console.log('all passed')
