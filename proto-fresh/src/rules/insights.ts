import { faSide, hit, isAtt, isWin, nOf, other, roleOf, tagAt, depthOf, type Draft, type Side, type Part } from './rally.ts'

export type Share = { won: number; of: number }
const share = (xs: Draft[], by: (d: Draft) => boolean): Share => ({ won: xs.filter(by).length, of: xs.length })
const youWon = (d: Draft) => d.point === 'me'

export type Insights = {
  total: number
  first: { you: Share; kim: Share; nobody: Share; unknown: number }
  third: Record<Side, Share>
  receive: Record<Side, Share>
  counters: Record<Side, { shots: number; winners: number }>
  serve: { yours: Share; kims: Share }
  length: { label: string; s: Share }[]
  depth: { short: Share; long: Share }
  ends: Record<Side, { winFH: number; winBH: number; winServe: number; errFH: number; errBH: number; errServe: number }>
  lost: { label: string; count: number }[]
  lastType: { role: 'Attack' | 'Counter' | 'Control'; winners: number; errors: number }[]
  review: { set: number; no: number; part: Part | 'Star' }[]
}

const lastHand = (d: Draft): 'FH' | 'BH' | 'Serve' => {
  const n = nOf(d)
  if (n === 1) return 'Serve'
  const c = tagAt(d, n)
  return c ? (c.slice(0, 2) as 'FH' | 'BH') : 'FH'
}

export function insightsOf(all: Draft[]): Insights {
  const ds = all.filter((d) => d.point !== null && d.end !== null)
  const fa = (w: string) => ds.filter((d) => faSide(d) === w)
  const third = (s: Side) => ds.filter((d) => nOf(d) >= 3 && d.server === s && isAtt(tagAt(d, 3)))
  const recv = (s: Side) => ds.filter((d) => nOf(d) >= 2 && other(d.server) === s && isAtt(tagAt(d, 2)))
  const ctr = (s: Side) => {
    let shots = 0
    let winners = 0
    ds.forEach((d) => {
      for (let k = 3; k <= nOf(d); k++) {
        const c = tagAt(d, k)
        if (c && roleOf(d, k, c) === 'Counter' && hit(d, k) === s) {
          shots++
          if (k === nOf(d) && isWin(d.end)) winners++
        }
      }
    })
    return { shots, winners }
  }
  const ends = (s: Side) => {
    const mine = ds.filter((d) => hit(d, nOf(d)) === s)
    const w = mine.filter((d) => isWin(d.end))
    const e = mine.filter((d) => !isWin(d.end))
    const c = (xs: Draft[], h: string) => xs.filter((d) => lastHand(d) === h).length
    return { winFH: c(w, 'FH'), winBH: c(w, 'BH'), winServe: c(w, 'Serve'), errFH: c(e, 'FH'), errBH: c(e, 'BH'), errServe: c(e, 'Serve') }
  }
  const lostMap: Record<string, number> = {}
  ds.filter((d) => !youWon(d)).forEach((d) => {
    const h = lastHand(d)
    const label = hit(d, nOf(d)) === 'them' ? `Kim ${h === 'Serve' ? 'serve' : h} winner` : `Your ${h === 'Serve' ? 'serve' : h} ${d.end?.toLowerCase()} error`
    lostMap[label] = (lostMap[label] ?? 0) + 1
  })
  const lost = Object.entries(lostMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
  const lastType = (['Attack', 'Counter', 'Control'] as const).map((role) => {
    const xs = ds.filter((d) => {
      const n = nOf(d)
      const c = tagAt(d, n)
      return n >= 2 && c !== undefined && roleOf(d, n, c) === role
    })
    return { role, winners: xs.filter((d) => isWin(d.end)).length, errors: xs.filter((d) => !isWin(d.end)).length }
  })
  const len = (a: number, b: number) => ds.filter((d) => nOf(d) >= a && nOf(d) <= b)
  const review: Insights['review'] = []
  all.forEach((d) => {
    d.review.forEach((p) => review.push({ set: d.set, no: d.no, part: p }))
    if (d.star) review.push({ set: d.set, no: d.no, part: 'Star' })
  })
  return {
    total: ds.length,
    first: { you: share(fa('me'), youWon), kim: share(fa('them'), youWon), nobody: share(fa('none'), youWon), unknown: ds.filter((d) => faSide(d) === null).length },
    third: { me: share(third('me'), (d) => d.point === 'me'), them: share(third('them'), (d) => d.point === 'them') },
    receive: { me: share(recv('me'), (d) => d.point === 'me'), them: share(recv('them'), (d) => d.point === 'them') },
    counters: { me: ctr('me'), them: ctr('them') },
    serve: { yours: share(ds.filter((d) => d.server === 'me'), youWon), kims: share(ds.filter((d) => d.server === 'them'), youWon) },
    length: [
      { label: '1 to 3', s: share(len(1, 3), youWon) },
      { label: '4 to 6', s: share(len(4, 6), youWon) },
      { label: '7 plus', s: share(len(7, 99), youWon) },
    ],
    depth: {
      short: share(ds.filter((d) => depthOf(d) === 'Short'), (d) => d.point === d.server),
      long: share(ds.filter((d) => depthOf(d) === 'Long'), (d) => d.point === d.server),
    },
    ends: { me: ends('me'), them: ends('them') },
    lost,
    lastType,
    review,
  }
}

export const pct = (s: Share) => (s.of ? Math.round((100 * s.won) / s.of) : 0)
