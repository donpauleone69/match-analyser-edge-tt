import { expect, it } from 'vitest'
import {
  breakIndexes,
  deleteRally,
  leaveIds,
  leaveMark,
  openReview,
  pressReview,
  serveBands,
  type MatchRecord,
  type RallyData,
  type ReviewPress,
  type ServeRally,
  type Side,
} from '../lib/app'

const Y: Side = 'me'
const S: Side = 'them'
const L = (s: Side) => (s === Y ? 'Y' : 'S')
const word = (rs: ServeRally[]) => rs.map((r) => L(r.server)).join(' ')
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

function mkR(n: number, server: Side, t: number, extra: Partial<RallyData> = {}): RallyData {
  return {
    id: `r${n}`,
    videoId: 'v',
    server,
    winner: n % 2 ? Y : S,
    contacts: [t, t + 1],
    start: Math.max(0, t - 2),
    end: t + 1,
    ending: 'Winner',
    fa: null,
    shots: [{}, {}],
    ...extra,
  } as RallyData
}

function baseMatch(): MatchRecord {
  const servers: Side[] = [Y, Y, S, S, Y, Y, S, S]
  const rs = servers.map((s, i) => mkR(i + 1, s, 5 + i * 6, i === 2 ? { serveChecked: true } : {}))
  return {
    id: 'm',
    opponent: '',
    event: '',
    date: '',
    result: { me: null, them: null },
    videos: [{ id: 'v', fileName: 'v.mp4', sizeMb: 1, kind: 'demo', durationS: 200 }],
    sets: [
      {
        setId: 1,
        entered: { me: '', them: '' },
        skipped: false,
        finished: false,
        firstServer: Y,
        rallies: rs,
        draft: null,
        mark: null,
      },
    ],
    tagDone: false,
  }
}

function others(mm: MatchRecord, skip: string) {
  return JSON.stringify(mm.sets[0].rallies.filter((r) => r.id !== skip))
}

it('delete leaves every other rally byte for byte', () => {
  const m = baseMatch()
  const d = deleteRally(m, 1, 'r4')
  expect(others(d, 'r4')).toBe(others(m, 'r4'))
  expect(word(d.sets[0].rallies as ServeRally[])).toBe('Y Y S Y Y S S')
})

it('Leave it clears the band and writes one rally', () => {
  const m = baseMatch()
  const d = deleteRally(m, 1, 'r4')
  const breakAt = br(d.sets[0].rallies as ServeRally[])[0]
  const lv = leaveMark(d, 1, d.sets[0].rallies[breakAt - 1].id, 'serve')
  expect(serveBands(lv.sets[0].rallies as ServeRally[], Y).length).toBe(0)
})

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