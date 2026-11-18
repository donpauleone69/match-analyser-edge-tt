import { asked, asksRally, blankDraft, hit, isWin, nobodyHidden, other, partsOf, scoreOf, serverFor, setOver, type Code, type Draft, type EndKind, type Side } from './rally.ts'

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LENGTHS = [1, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 9, 10, 12]
const pick = <T>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)]

function rally(r: () => number, set: number, no: number, server: Side, score: [number, number]): Draft {
  const n = pick(r, LENGTHS)
  let t = 1.2
  const contacts = Array.from({ length: n }, (_, i) => {
    const c = { id: i + 1, t: +t.toFixed(2) }
    t += 0.75 + r() * 0.25
    return c
  })
  const d = blankDraft({ set, no, one: no === 1, server, contacts, score })
  const tags: Record<number, Code> = {}
  for (let k = 2; k <= n; k++) {
    if (!asked(k, n)) continue
    const hand = r() < 0.55 ? 'FH' : 'BH'
    const attack = r() < (k === 2 ? 0.18 : k === 3 ? 0.4 : k === n ? 0.6 : 0.3)
    tags[k] = `${hand}${attack ? 'A' : 'C'}` as Code
  }
  const end: EndKind = pick(r, ['Winner', 'Winner', 'Winner', 'Net', 'Net', 'Long', 'Long', 'Wide'])
  let x: Draft = { ...d, tags, depth: { 1: r() < 0.7 ? 'Short' : 'Long' }, end }
  x = { ...x, point: isWin(end) ? hit(x, n) : other(hit(x, n)) }
  if (asksRally(x) && r() < 0.7) x = { ...x, first: nobodyHidden(x) ? pick(r, ['me', 'them'] as const) : pick(r, ['me', 'them', 'none'] as const) }
  const parts = partsOf(x).map((p) => p.part)
  if (r() < 0.16) x = { ...x, review: [pick(r, parts)] }
  if (r() < 0.08) x = { ...x, star: true }
  return { ...x, q: null, saved: true }
}

function makeSet(seed: number, set: number, first: Side, stopAt?: number): Draft[] {
  const r = rng(seed)
  const out: Draft[] = []
  while (out.length < 40) {
    const score = scoreOf(out)
    if (setOver(score) || (stopAt !== undefined && out.length >= stopAt)) break
    out.push(rally(r, set, out.length + 1, serverFor(first, score[0] + score[1]), score))
  }
  return out
}

/** True contact times for a live rally on the stand-in video. */
export function liveTruth(seed: number): number[] {
  const r = rng(seed * 97 + 13)
  const n = pick(r, LENGTHS)
  let t = 2.2
  return Array.from({ length: n }, () => {
    const c = +t.toFixed(2)
    t += 0.8 + r() * 0.3
    return c
  })
}

export type MatchSet = { no: number; first: Side | null; rallies: Draft[] }

export function seedMatch(): MatchSet[] {
  return [
    { no: 1, first: 'me', rallies: makeSet(7, 1, 'me') },
    { no: 2, first: 'them', rallies: makeSet(31, 2, 'them', 12) },
  ]
}