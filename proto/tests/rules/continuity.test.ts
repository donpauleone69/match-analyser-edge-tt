import { expect, it } from 'vitest'
import {
  breakIndexes,
  leaveIds,
  openReview,
  pressReview,
  serveBands,
  type ReviewPress,
  type ServeRally,
  type Side,
} from '../lib/app'

const Y: Side = 'me'
const S: Side = 'them'
const br = (rs: ServeRally[], f: Side = Y) => breakIndexes(rs, f).map((i) => i + 1)

const tag = (servers: string, checked: number[] = []): ServeRally[] =>
  servers.split(' ').map((c, i) => ({
    id: `r${i + 1}`,
    server: c === 'Y' ? Y : S,
    winner: Y,
    ...(checked.includes(i + 1) ? { serveChecked: true } : {}),
  }))

function review(rs: ServeRally[], from: number, truth: Record<string, Side>, f: Side = Y) {
  let st = openReview(rs, f, from - 1)
  while (st.cursor !== null && !st.stopped) {
    const r = st.rallies[st.cursor]
    const p: ReviewPress = truth[r.id] === r.server ? 'same' : 'other'
    st = pressReview(st, p)
  }
  return st
}

const truthOf = (rs: ServeRally[], t: string) => Object.fromEntries(rs.map((r, i) => [r.id, t.split(' ')[i] === 'Y' ? Y : S]))

const rsC7 = tag('Y Y S Y Y Y S S', [4])
const tC7 = truthOf(rsC7, 'Y Y S S Y Y S S')
for (const b of serveBands(rsC7, Y)) {
  it(`band ${b.from + 1}-${b.to + 1}: review ends with no break`, () => {
    const x = review(rsC7, b.to + 1, tC7)
    expect(br(x.rallies).length).toBe(0)
  })
}
const nf = tag('Y Y S Y Y Y S S')
it('unflagged: review from the last band fixes it', () => {
  const x = review(nf, 7, tC7)
  expect(br(x.rallies).length).toBe(0)
})

const rsC8 = tag('Y Y S Y Y S S Y Y')
it('exactly one break', () => {
  expect(br(rsC8).length).toBe(1)
})

const joined = tag('Y Y S Y Y Y S S', [4])
const jb = serveBands(joined, Y)
it('one switched rally is one band', () => {
  expect(jb.length).toBe(1)
})
it('Leave it on that band clears it and writes only its breaks', () => {
  const ids = leaveIds(joined, Y, jb[0].breakId)
  const marked = joined.map((r) => (ids.includes(r.id) ? { ...r, left: ['serve' as const] } : r))
  expect(serveBands(marked, Y).length).toBe(0)
  expect(ids.length).toBe(breakIndexes(joined, Y).length)
  expect(ids.length).toBeGreaterThan(1)
})