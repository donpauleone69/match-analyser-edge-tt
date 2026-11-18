import {
  deleteContact,
  isMis,
  mismatchText,
  nOf,
  partsOf,
  questionsOf,
  setPoint,
  settle,
  tossInstead,
  addContact,
  asksRally,
  openerOf,
  type Code,
  type Draft,
  type Question,
} from '../src/rules/rally.ts'
import { SCENARIOS, draftOf } from '../src/rules/scenarios.ts'

let fails = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const a = JSON.stringify(got)
  const b = JSON.stringify(want)
  if (a !== b) {
    fails++
    console.log(`FAIL ${name}\n  got  ${a}\n  want ${b}`)
  }
}

const sc = (key: string) => draftOf(SCENARIOS.find((s) => s.key === key)!, 2)
const tag = (d: Draft, k: number, c: Code) => settle({ ...d, tags: { ...d.tags, [d.contacts[k - 1].id]: c } }, true)
const end = (d: Draft, e: Draft['end']) => settle({ ...d, end: e }, true)
const serve = (d: Draft, v: 'Short' | 'Long') => settle({ ...d, depth: { ...d.depth, [d.contacts[0].id]: v }, cut: null }, true)
const parts = (d: Draft) => partsOf(d).map((p) => `${p.part} ${p.from}-${p.to}`)

// Question order for 1 to 13 shots
const orders: Record<number, Question[]> = {}
for (let n = 1; n <= 13; n++) {
  const d = draftOf({ ...SCENARIOS[0], taps: Array.from({ length: n }, (_, i) => i) }, 2)
  orders[n] = questionsOf(d)
}
eq('order 1', orders[1], ['end'])
eq('order 2', orders[2], ['end', 'serve'])
eq('order 4', orders[4], ['end', 'serve', 2, 3])
eq('order 6', orders[6], ['end', 'serve', 2, 3, 4, 5])
eq('order 7', orders[7], ['end', 'serve', 2, 3, 4, 5, 6])
eq('order 8', orders[8], ['end', 'serve', 2, 3, 4, 6, 7])
eq('order 10', orders[10], ['end', 'serve', 2, 3, 4, 8, 9])

// 10 shots, Paul's test
let d = sc('ten')
d = end(d, 'Winner')
d = setPoint(d, 'them')
eq('ten after point', d.q, 'end')
d = tag(d, 10, 'FHA')
eq('ten to serve', d.q, 'serve')
d = serve(d, 'Short')
d = tag(d, 2, 'BHC')
d = tag(d, 3, 'FHC')
eq('ten to shot 4', d.q, 4)
d = tag(d, 4, 'BHC')
eq('ten rally page', [d.q, asksRally(d)], [8, true])
d = settle({ ...d, first: 'me' }, false)
eq('ten rally answer stays', d.q, 8)
d = tag(d, 8, 'FHA')
eq('ten shot 9', d.q, 9)
d = tag(d, 9, 'BHA')
eq('ten saved', d.saved, true)
eq('ten parts', parts(d), ['Opening 1-4', 'Rally 5-7', 'End 8-10'])

// 7 shots: shot 4 asked, no Rally question
d = sc('seven')
d = setPoint(end(d, 'Winner'), 'me')
d = tag(d, 7, 'FHA')
d = serve(d, 'Short')
d = tag(tag(tag(d, 2, 'BHC'), 3, 'FHC'), 4, 'BHC')
eq('seven to 5', [d.q, asksRally(d)], [5, false])
d = tag(tag(d, 5, 'FHA'), 6, 'BHA')
eq('seven saved', d.saved, true)
eq('seven parts', parts(d), ['Opening 1-4', 'Attack 5-7'])

// Extra end tap
d = sc('endtap')
d = setPoint(end(d, 'Winner'), 'me')
eq('endtap mis', [isMis(d), mismatchText(d)], [true, 'Point to You, but shot 6, the winner, is Kim’s.'.replace('’', "'")])
d = settle(deleteContact(d, nOf(d)), true)
eq('endtap fixed', [isMis(d), nOf(d), d.q, d.cut !== null], [false, 5, 'end', true])
d = tag(d, 5, 'FHA')
eq('endtap serve', d.q, 'serve')

// Toss after Delete last by habit
d = sc('toss')
d = setPoint(end(d, 'Winner'), 'them')
d = settle(deleteContact(d, nOf(d)), true)
d = tag(d, 5, 'FHA')
eq('toss serve offer', [d.q, d.cut !== null], ['serve', true])
d = tossInstead(d)
eq('toss restored', [nOf(d), isMis(d), d.contacts[0].id, d.tags[d.contacts[4].id]], [5, false, 2, 'FHA'])

// Missed contact
d = sc('missed')
d = setPoint(end(d, 'Winner'), 'them')
eq('missed mis', isMis(d), true)
d = addContact({ ...d, add: true }, 2.9, 99)
eq('missed fixed', [nOf(d), isMis(d), d.q], [4, false, 'end'])

// Nobody: first attack on an End shot
d = sc('nobody')
d = setPoint(end(d, 'Long'), 'me')
d = tag(d, 10, 'BHC')
d = serve(d, 'Short')
d = tag(tag(tag(d, 2, 'BHC'), 3, 'FHC'), 4, 'BHC')
d = settle({ ...d, first: 'none' }, false)
d = tag(d, 8, 'FHC')
d = tag(d, 9, 'FHA')
eq('nobody saved', [d.saved, openerOf(d)], [true, 9])
eq('nobody parts', parts(d), ['Opening 1-8', 'Attack 9-10'])

// Rally one sets the server
d = sc('one')
d = setPoint(end(d, 'Winner'), 'them')
eq('one server', [d.server, isMis(d)], ['them', false])

// Ace saves on Point to
d = sc('ace')
d = setPoint(end(d, 'Winner'), 'me')
eq('ace saved', d.saved, true)

if (fails) throw new Error(`${fails} logic checks failed`)
console.log('logic checks pass')
