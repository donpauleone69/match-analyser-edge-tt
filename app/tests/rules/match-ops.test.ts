import { expect, it } from 'vitest'
import {
  breakIndexes,
  deleteRally,
  leaveMark,
  serveBands,
  type MatchRecord,
  type RallyData,
  type ServeRally,
  type Side,
} from '../lib/app'

const Y: Side = 'me'
const S: Side = 'them'
const L = (s: Side) => (s === Y ? 'Y' : 'S')
const word = (rs: ServeRally[]) => rs.map((r) => L(r.server)).join(' ')
const br = (rs: ServeRally[], f: Side = Y) => breakIndexes(rs, f).map((i) => i + 1)

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
        finished: false,
        firstServer: Y,
        rallies: rs,
        draft: null,
        mark: null,
      },
    ],
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
