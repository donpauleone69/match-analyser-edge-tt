/**
 * Scripted stand-in for match video. A deterministic list of rallies with
 * contact times, so there is something true to tap against. No file, no sound.
 */

import {
  ATTACK_STROKES,
  END_STROKES,
  REPLY_STROKES,
  RALLY_PAD_S,
  hitterOf,
  otherSide,
  type Ending,
  type RallyData,
  type ShotTags,
  type Side,
} from './rally'
import { addPoint, serverAt, ZERO, type Points } from './score'

export type ScriptRally = {
  contacts: number[]
  server: Side
  winner: Side
  ending: Ending
  fa: number | null
  shots: ShotTags[]
  /** 1-based set this point belongs to in the scripted match. */
  setNo: number
}

export type VideoScript = {
  duration: number
  rallies: ScriptRally[]
  breaks: { a: number; b: number }[]
}

export type ScriptSet = { firstServer: Side; winners: Side[] }

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)]

/** Point winners for a set that ends exactly `me` to `them` (no deuce). */
export function setWinners(seed: number, me: number, them: number): Side[] {
  const r = rng(seed)
  const winner: Side = me > them ? 'me' : 'them'
  const body: Side[] = [
    ...Array<Side>(Math.max(me, them) - 1).fill(winner),
    ...Array<Side>(Math.min(me, them)).fill(otherSide(winner)),
  ]
  for (let i = body.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[body[i], body[j]] = [body[j], body[i]]
  }
  return [...body, winner]
}

const LENGTHS = [1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 7]
const round = (v: number) => Math.round(v * 100) / 100

function scriptRally(r: () => number, t: number, server: Side, winner: Side, setNo: number) {
  const n = pick(r, LENGTHS)
  const contacts: number[] = []
  let c = t
  for (let i = 0; i < n; i++) {
    contacts.push(round(c))
    c += 0.8 + r() * 0.3
  }
  const hitter = hitterOf(server, n)
  const ending: Ending =
    hitter === winner
      ? r() < 0.15
        ? 'Lucky'
        : 'Winner'
      : pick(r, ['In-Net', 'Long', 'Wide'] as const)

  const shots: ShotTags[] = contacts.map(() => ({}))
  let fa: number | null = null
  if (n === 2) {
    const stroke = pick(r, END_STROKES)
    shots[1] = { wing: pick(r, ['BH', 'FH'] as const), stroke }
    fa = ['Push', 'Block', 'Chop', 'Lob'].includes(stroke) ? null : 2
  } else if (n > 2) {
    fa = r() < 0.25 ? null : 2 + Math.floor(r() * (n - 1))
    shots[n - 1] = {
      wing: pick(r, ['BH', 'FH'] as const),
      stroke: fa === n ? pick(r, ATTACK_STROKES) : pick(r, REPLY_STROKES),
    }
    if (fa !== null && fa !== n) {
      shots[fa - 1] = { wing: pick(r, ['BH', 'FH'] as const), stroke: pick(r, ATTACK_STROKES) }
    }
  }
  return { contacts, server, winner, ending, fa, shots, setNo } satisfies ScriptRally
}

/**
 * Builds the videos for a scripted match. `cuts` are point indices (counted
 * across all sets) where a new video starts.
 */
export function buildScripts(seed: number, sets: ScriptSet[], cuts: number[] = []): VideoScript[] {
  const r = rng(seed)
  const videos: VideoScript[] = []
  let current: VideoScript = { duration: 0, rallies: [], breaks: [] }
  let t = 0
  let pointIndex = 0

  sets.forEach((set, setIndex) => {
    let score: Points = ZERO
    set.winners.forEach((winner, i) => {
      if (cuts.includes(pointIndex) && current.rallies.length > 0) {
        current.duration = round(t + 2)
        videos.push(current)
        current = { duration: 0, rallies: [], breaks: [] }
        t = 0
      }
      if (i === 0 && current.rallies.length > 0) {
        current.breaks.push({ a: round(t + 1.5), b: round(t + 7.5) })
        t += 8
      }
      t += 3.5 + r() * 2
      const rally = scriptRally(r, t, serverAt(set.firstServer, score), winner, setIndex + 1)
      current.rallies.push(rally)
      t = rally.contacts[rally.contacts.length - 1] + 1.3
      score = addPoint(score, winner)
      pointIndex += 1
    })
  })
  current.duration = round(t + 4)
  videos.push(current)
  return videos
}

/** A generic two-set script for a demo video added by hand. */
export function genericScript(seed: number): VideoScript {
  return buildScripts(seed, [
    { firstServer: 'me', winners: setWinners(seed + 1, 11, 6 + (seed % 4)) },
    { firstServer: 'them', winners: setWinners(seed + 2, 7 + (seed % 3), 11) },
  ])[0]
}

/** Saved rallies made from scripted ones, for seeded matches. */
export function ralliesFromScript(
  videoId: string,
  script: VideoScript,
  from: number,
  count: number
): RallyData[] {
  return script.rallies.slice(from, from + count).map((s, i) => ({
    id: `${videoId}-r${from + i}`,
    videoId,
    server: s.server,
    contacts: s.contacts,
    start: Math.max(0, round(s.contacts[0] - RALLY_PAD_S)),
    end: round(s.contacts[s.contacts.length - 1] + RALLY_PAD_S),
    ending: s.ending,
    fa: s.fa,
    shots: s.shots,
    winner: s.winner,
    highlight: false,
  }))
}

export type Scene = {
  /** Ball position in 0..1 of the picture. Null only after the last point. */
  ball: { x: number; y: number; opacity: number; scale: number } | null
  /** Side whose bat is at the ball right now. */
  hit: Side | null
  label: string | null
  setNo: number | null
}

const END_X: Record<Side, number> = { me: 0.15, them: 0.85 }
const TOSS_S = 1
const TAIL_S = 1.1
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

/** What the stand-in picture shows at time `t` of a scripted video. */
export function sceneAt(script: VideoScript, t: number): Scene {
  const inBreak = script.breaks.some((b) => t >= b.a && t <= b.b)
  let setNo: number | null = null
  for (let k = 0; k < script.rallies.length; k++) {
    const rally = script.rallies[k]
    const c = rally.contacts
    const first = c[0]
    const last = c[c.length - 1]
    if (t < first - TOSS_S) {
      // The pause between points: the ball waits, dimmed, at the next server's bat.
      return {
        ball: { x: END_X[rally.server], y: 0.5, opacity: 0.45, scale: 0.8 },
        hit: null,
        label: inBreak ? 'Break between sets' : 'Between points',
        setNo: setNo ?? rally.setNo,
      }
    }
    setNo = rally.setNo
    if (t > last + TAIL_S) continue

    if (t < first) {
      // The toss: up and back down, landing on the bat at the serve contact.
      const p = (t - (first - TOSS_S)) / TOSS_S
      return {
        ball: { x: END_X[rally.server], y: 0.5 - 0.3 * Math.sin(p * Math.PI), opacity: 1, scale: 1 },
        hit: null,
        label: 'Serve coming',
        setNo,
      }
    }

    let i = c.length - 1
    while (i > 0 && c[i] > t) i--
    const hitter = hitterOf(rally.server, i + 1)
    const from = END_X[hitter]
    const to = END_X[otherSide(hitter)]
    const dir = (i + k) % 2 === 0 ? 1 : -1
    const hit = t - c[i] < 0.2 ? hitter : null

    if (i < c.length - 1) {
      const p = (t - c[i]) / (c[i + 1] - c[i])
      return {
        ball: { x: lerp(from, to, p), y: 0.5 + dir * 0.13 * Math.sin(p * Math.PI), opacity: 1, scale: 1 },
        hit,
        label: null,
        setNo,
      }
    }

    const p = Math.min(1, (t - last) / TAIL_S)
    const fade = 1 - Math.max(0, p - 0.5) * 1.6
    let x = lerp(from, to + (to - from) * 0.3, p)
    let y = 0.5 + dir * 0.08 * p
    if (rally.ending === 'In-Net') {
      x = lerp(from, 0.5, Math.min(1, p / 0.45))
      y = 0.5 + dir * 0.04
    } else if (rally.ending === 'Long') {
      x = lerp(from, to + (to - from) * 0.45, p)
    } else if (rally.ending === 'Wide') {
      x = lerp(from, to, p)
      y = 0.5 + dir * 0.48 * p
    }
    return { ball: { x, y, opacity: Math.max(0.15, fade), scale: 1 }, hit, label: p > 0.6 ? 'Point over' : null, setNo }
  }
  return { ball: null, hit: null, label: inBreak ? 'Break between sets' : null, setNo }
}
