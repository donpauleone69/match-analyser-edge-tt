import { expect, it } from 'vitest'
import { emptyDraft, loopShotOf, shotWindow } from '../lib/app'

function draft(contacts: number[]) {
  return { ...emptyDraft('v', 'me'), contacts, closed: true, shots: contacts.map(() => ({})) }
}

function near(got: { a: number; b: number }, want: { a: number; b: number }) {
  expect(Math.abs(got.a - want.a) < 0.001 && Math.abs(got.b - want.b) < 0.001, `got ${got.a}..${got.b}, want ${want.a}..${want.b}`).toBe(true)
}

const sample = draft([10, 10.9, 11.8, 12.7])
it('shot 1 serve', () => {
  near(shotWindow(sample, 1), { a: 8, b: 11 })
})
it('shot 2', () => {
  near(shotWindow(sample, 2), { a: 9.7, b: 11.9 })
})
it('shot 3', () => {
  near(shotWindow(sample, 3), { a: 10.6, b: 12.8 })
})
it('shot 4 end', () => {
  near(shotWindow(sample, 4), { a: 11.5, b: 13.7 })
})

const mid = draft([10, 11.5, 13])
it('shot 2 at the neighbour', () => {
  near(shotWindow(mid, 2), { a: 10, b: 13 })
})

const wide = draft([0, 3, 6])
it('shot 2 capped', () => {
  near(shotWindow(wide, 2), { a: 1, b: 5 })
})
it('serve at rally start', () => {
  near(shotWindow(wide, 1), { a: 0, b: 2 })
})
it('end at rally end', () => {
  near(shotWindow(wide, 3), { a: 4, b: 7 })
})

const asked = draft([1, 2, 3, 4])
const end = { kind: 'shot' as const, shot: 4 }
it('result asks the end shot', () => {
  expect(loopShotOf(asked, 'result', end)).toBe(4)
})
it('first attack asks that shot', () => {
  expect(loopShotOf({ ...asked, fa: 3 }, 'faShot', { kind: 'shot', shot: 3 })).toBe(3)
})
it('pick and ready loop the rally', () => {
  expect(loopShotOf(asked, 'pickFa', null)).toBeNull()
  expect(loopShotOf(asked, 'ready', null)).toBeNull()
})