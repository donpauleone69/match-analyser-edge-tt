/**
 * Scripted stand-in for match video. A deterministic list of rallies with
 * contact times, so there is something true to tap against. No file, no sound.
 */

import {
  ATTACK_STROKES,
  DEFENSIVE_STROKES_ROW,
  END_STROKES,
  REPLY_STROKES,
  RALLY_LEAD_S,
  RALLY_PAD_S,
  hitterOf,
  isAttackStroke,
  otherSide,
  type Ending,
  type RallyData,
  type ShotTags,
  type Side,
  type Wing,
} from './rally'
import { addPoint, serverAt, ZERO, type Points } from './score'

/** A point of the picture, each axis 0..1. The table is x 0.15 to 0.85, y 0.24 to 0.76. */
export type Spot = { x: number; y: number }

/** What one shot really was and where it went. The stand-in draws it, the answer key reads it. */
export type ShotPlay = {
  wing: Wing
  /** 'Serve' on shot 1, then one of the tagging strokes. */
  stroke: string
  /** Flick, Loop, Drive or Smash. The first one in a rally is its first attack. */
  attack: boolean
  /** Where the ball is hit. */
  at: Spot
  /** Where the ball lands: the far half, or the floor when long or wide. Null when it stops at the net. */
  bounce: Spot | null
}

export type ScriptRally = {
  contacts: number[]
  server: Side
  winner: Side
  ending: Ending
  fa: number | null
  /** The tags a tagger is asked for: the end shot and the first attack. */
  shots: ShotTags[]
  /** Every shot as played. */
  play: ShotPlay[]
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

/**
 * Point winners for a set that ends exactly `me` to `them`. Nobody reaches a
 * winning score early: past 10 all the points trade until the last two.
 */
export function setWinners(seed: number, me: number, them: number): Side[] {
  const r = rng(seed)
  const winner: Side = me > them ? 'me' : 'them'
  const loser = otherSide(winner)
  const high = Math.max(me, them)
  const low = Math.min(me, them)
  const deuce = low >= 10
  const body: Side[] = deuce
    ? [...Array<Side>(10).fill(winner), ...Array<Side>(10).fill(loser)]
    : [...Array<Side>(high - 1).fill(winner), ...Array<Side>(low).fill(loser)]
  for (let i = body.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[body[i], body[j]] = [body[j], body[i]]
  }
  if (!deuce) return [...body, winner]
  const pairs: Side[] = []
  for (let i = 10; i < low; i++) {
    const first = r() < 0.5 ? winner : loser
    pairs.push(first, otherSide(first))
  }
  return [...body, ...pairs, winner, winner]
}

const LENGTHS = [1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 7]
const round = (v: number) => Math.round(v * 100) / 100
const round3 = (v: number) => Math.round(v * 1000) / 1000
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

const NET_X = 0.5
const END_X: Record<Side, number> = { me: 0.15, them: 0.85 }
/** Away from the net, for a player at that end. */
const outward = (side: Side) => (side === 'me' ? -1 : 1)
/** Both players are right handed: the forehand is on the right as each one faces the net. */
const wingSign = (side: Side, wing: Wing) => (side === 'me' ? 1 : -1) * (wing === 'FH' ? 1 : -1)
const isAttack = isAttackStroke

/** How far behind the end line a stroke is played. Negative is over the table. */
const CONTACT_DEPTH: Record<string, number> = {
  Serve: 0.015,
  Push: -0.07,
  Flick: -0.07,
  Block: 0,
  Drive: 0.02,
  Smash: 0.02,
  Loop: 0.05,
  Chop: 0.085,
  Lob: 0.09,
}

/** Once a rally has opened up: what tends to answer each stroke. */
const ANSWERS: Record<string, readonly string[]> = {
  Flick: ['Block', 'Block', 'Loop', 'Chop'],
  Loop: ['Block', 'Block', 'Loop', 'Chop', 'Lob'],
  Drive: ['Block', 'Block', 'Drive', 'Lob'],
  Smash: ['Lob', 'Block'],
  Block: ['Loop', 'Loop', 'Drive', 'Smash'],
  Lob: ['Smash', 'Smash', 'Loop'],
  Chop: ['Loop', 'Push', 'Drive'],
  Push: ['Loop', 'Push', 'Drive'],
}

/**
 * Fills in every shot of a rally: wing, stroke, where it is hit and where it
 * lands. Draws from its own random stream, so contact times never move.
 */
function playOf(d: () => number, rally: Omit<ScriptRally, 'play'>): ShotPlay[] {
  const n = rally.contacts.length
  const strokes: string[] = []
  const wings: Wing[] = []
  for (let shot = 1; shot <= n; shot++) {
    const asked = rally.shots[shot - 1]
    // Before the first attack, and on a rally with no attack, only a defensive stroke.
    const beforeFa = rally.fa === null || shot < rally.fa
    const free = pick(d, beforeFa ? DEFENSIVE_STROKES_ROW : (ANSWERS[strokes[shot - 2]] ?? ANSWERS.Push))
    strokes.push(shot === 1 ? 'Serve' : (asked.stroke ?? free))
    const fh = d() < (shot === 1 ? 0.75 : 0.5)
    wings.push(asked.wing ?? (fh ? 'FH' : 'BH'))
  }

  const at: Spot[] = strokes.map((stroke, i) => {
    const side = hitterOf(rally.server, i + 1)
    return {
      x: round3(END_X[side] + outward(side) * (CONTACT_DEPTH[stroke] ?? 0)),
      y: round3(0.5 + wingSign(side, wings[i]) * (0.11 + d() * 0.08)),
    }
  })

  return strokes.map((stroke, i) => {
    const hitter = hitterOf(rally.server, i + 1)
    const far = otherSide(hitter)
    const out = outward(far)
    const from = at[i]
    const u = d()
    const v = d()
    let bounce: Spot | null
    if (i < n - 1) {
      // Lands short of where the next player meets it, on the straight line there.
      const to = at[i + 1]
      const reach = Math.min(Math.abs(to.x - NET_X) - 0.05, 0.33)
      const x = NET_X + out * reach * (isAttack(stroke) ? 0.7 + u * 0.3 : 0.4 + u * 0.6)
      bounce = { x, y: lerp(from.y, to.y, (x - from.x) / (to.x - from.x)) }
    } else if (rally.ending === 'Net') {
      bounce = null
    } else if (rally.ending === 'Long') {
      bounce = { x: END_X[far] + out * (0.05 + u * 0.03), y: 0.5 + (v - 0.5) * 0.3 }
    } else if (rally.ending === 'Wide') {
      // Off the side that the score and the video buttons leave clear.
      bounce = { x: NET_X + out * (0.14 + u * 0.14), y: far === 'them' ? 0.17 : 0.83 }
    } else if (rally.ending === 'Lucky') {
      bounce = { x: NET_X + out * 0.07, y: lerp(from.y, 0.5, 0.7) }
    } else {
      // A winner lands away from the other player's bat.
      const batY = n > 1 ? at[n - 2].y : 0.5 + (v - 0.5) * 0.02
      bounce = { x: NET_X + out * (0.2 + u * 0.11), y: 0.5 + (batY >= 0.5 ? -1 : 1) * (0.13 + v * 0.07) }
    }
    return {
      wing: wings[i],
      stroke,
      attack: isAttack(stroke),
      at: from,
      bounce: bounce ? { x: round3(bounce.x), y: round3(bounce.y) } : null,
    }
  })
}

function scriptRally(
  r: () => number,
  d: () => number,
  t: number,
  server: Side,
  winner: Side,
  setNo: number
): ScriptRally {
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
      : pick(r, ['Net', 'Long', 'Wide'] as const)

  const shots: ShotTags[] = contacts.map(() => ({}))
  let fa: number | null = null
  if (n === 2) {
    const stroke = pick(r, END_STROKES)
    shots[1] = { wing: pick(r, ['BH', 'FH'] as const), stroke }
    fa = isAttackStroke(stroke) ? 2 : null
  } else if (n > 2) {
    fa = r() < 0.25 ? null : 2 + Math.floor(r() * (n - 1))
    shots[n - 1] = {
      wing: pick(r, ['BH', 'FH'] as const),
      stroke: fa === n ? pick(r, ATTACK_STROKES) : pick(r, REPLY_STROKES),
    }
    if (fa !== null && fa !== n) {
      shots[fa - 1] = { wing: pick(r, ['BH', 'FH'] as const), stroke: pick(r, ATTACK_STROKES) }
    }
    // No attack means no attacking stroke anywhere, the end shot included.
    if (fa === null && isAttack(shots[n - 1].stroke ?? '')) shots[n - 1] = { ...shots[n - 1], stroke: 'Push' }
  }
  const rally = { contacts, server, winner, ending, fa, shots, setNo }
  return { ...rally, play: playOf(d, rally) }
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
      const detail = rng((seed * 9973 + pointIndex * 131 + 17) >>> 0)
      const rally = scriptRally(r, detail, t, serverAt(set.firstServer, score), winner, setIndex + 1)
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

/** One listed set of a match, as far as the demo video needs to know it. */
export type SetPlan = {
  firstServer: Side
  /** The entered score, when it is one a set can end on. */
  score: Points | null
  /** Not filmed sets count towards the result but are not in the video. */
  filmed: boolean
}

const canEndOn = (p: Points | null): p is Points =>
  p !== null && Math.max(p.me, p.them) >= 11 && Math.abs(p.me - p.them) >= 2

/**
 * The demo video for a match: a whole decided match, so the end of the video
 * is the end of the match. With a result entered the sets follow it, and any
 * entered set score that a set can end on is played out exactly. With no
 * result it is three sets ending 2 - 1.
 */
export function matchScript(seed: number, result: Points | null = null, plan: SetPlan[] = []): VideoScript {
  const decided = result !== null && result.me !== result.them && result.me + result.them > 0
  const target: Points = decided ? result : { me: 2, them: 1 }
  const champion: Side = target.me > target.them ? 'me' : 'them'
  const count = target.me + target.them

  const fixed: (Side | null)[] = Array.from({ length: count }, (_, i) => {
    const score = plan[i]?.score ?? null
    return canEndOn(score) ? (score.me > score.them ? 'me' : 'them') : null
  })
  const left: Points = { ...target }
  for (const side of fixed) if (side) left[side] -= 1
  // The last set goes to the match winner, the rest are dealt from what is left.
  const winners: Side[] = fixed.map((side) => side ?? champion)
  for (let i = count - 1; i >= 0; i--) {
    if (fixed[i]) continue
    const side: Side =
      i === count - 1 && left[champion] > 0
        ? champion
        : left[otherSide(champion)] > 0
          ? otherSide(champion)
          : champion
    winners[i] = side
    left[side] -= 1
  }

  const sets: ScriptSet[] = []
  winners.forEach((side, i) => {
    if (plan[i] && !plan[i].filmed) return
    const entered = plan[i]?.score ?? null
    const lost = 5 + ((seed + i * 3) % 5)
    const score: Points = canEndOn(entered)
      ? entered
      : side === 'me'
        ? { me: 11, them: lost }
        : { me: lost, them: 11 }
    sets.push({
      firstServer: plan[i]?.firstServer ?? (i % 2 === 0 ? 'me' : 'them'),
      winners: setWinners(seed + i + 1, score.me, score.them),
    })
  })
  return buildScripts(seed, sets)[0]
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
    start: Math.max(0, round(s.contacts[0] - RALLY_LEAD_S)),
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
  ball: { x: number; y: number; opacity: number; scale: number; attack: boolean } | null
  /** Side whose bat is at the ball right now. */
  hit: Side | null
  /** Where each bat is. It goes to the ball, so it shows forehand or backhand. */
  bats: Record<Side, Spot>
  /** Where the ball has just landed. `age` is seconds since. */
  marks: { x: number; y: number; age: number; floor: boolean }[]
  /** Seconds since the ball hit the net, while it still shakes. */
  net: number | null
  label: string | null
  setNo: number | null
}

const TOSS_S = 1
const TAIL_S = 1.1
const MARK_S = 0.9
const NET_S = 0.4
const BAT_BEHIND = 0.03
const clamp01 = (p: number) => Math.min(1, Math.max(0, p))
const ease = (p: number) => p * p * (3 - 2 * p)

const restSpot = (side: Side): Spot => ({ x: END_X[side] + outward(side) * 0.05, y: 0.5 })
const batFor = (side: Side, at: Spot): Spot => ({ x: at.x + outward(side) * BAT_BEHIND, y: at.y })

/** How high a stroke rises on its way to the bounce. */
const ARC: Record<string, number> = {
  Serve: 0.2,
  Push: 0.15,
  Chop: 0.2,
  Block: 0.2,
  Flick: 0.15,
  Drive: 0.1,
  Smash: 0.05,
  Loop: 0.5,
  Lob: 1.6,
}

/** A point on the ball's way: time, place, height (0 is on the table) and the rise before it. */
type Way = Spot & { t: number; h: number; arc: number }
type Leg = {
  ways: Way[]
  marks: { t: number; x: number; y: number; floor: boolean }[]
  netAt: number | null
}

/** The flight of one shot: from its contact to the next contact, or to where the point ends. */
function legOf(rally: ScriptRally, i: number): Leg {
  const c = rally.contacts
  const shot = rally.play[i]
  const from = shot.at
  const t0 = c[i]
  const arc = ARC[shot.stroke] ?? 0.2
  const start: Way = { ...from, t: t0, h: 0.5, arc: 0 }
  const marks: Leg['marks'] = []
  const land = (t: number, spot: Spot, floor = false) => {
    marks.push({ t, x: spot.x, y: spot.y, floor })
  }

  if (i < c.length - 1) {
    const to = rally.play[i + 1].at
    const span = c[i + 1] - t0
    const timeAt = (x: number) => t0 + ((x - from.x) / (to.x - from.x)) * span
    const ways: Way[] = [start]
    if (i === 0) {
      // A serve lands on the server's own half first.
      const x = lerp(from.x, NET_X, 0.55)
      const own = { x, y: lerp(from.y, to.y, (x - from.x) / (to.x - from.x)) }
      ways.push({ ...own, t: timeAt(x), h: 0, arc: 0.1 })
      land(timeAt(x), own)
    }
    const b = shot.bounce ?? to
    ways.push({ ...b, t: timeAt(b.x), h: 0, arc })
    land(timeAt(b.x), b)
    ways.push({ ...to, t: c[i + 1], h: 0.5, arc: 0.1 })
    return { ways, marks, netAt: null }
  }

  const far = otherSide(hitterOf(rally.server, i + 1))
  const out = outward(far)
  const at = (p: number) => t0 + p * TAIL_S
  if (rally.ending === 'Net') {
    const net = { x: NET_X - out * 0.012, y: lerp(from.y, 0.5, 0.6) }
    const drop = { x: net.x - out * 0.035, y: net.y }
    return {
      ways: [start, { ...net, t: at(0.4), h: 0.15, arc: 0.1 }, { ...drop, t: at(0.6), h: 0, arc: 0 }, { ...drop, t: at(1), h: 0, arc: 0 }],
      marks,
      netAt: at(0.4),
    }
  }
  const b = shot.bounce ?? { x: END_X[far], y: 0.5 }
  if (rally.ending === 'Lucky') {
    // Clips the net, drops short and dies before the other player gets there.
    const net = { x: NET_X, y: lerp(from.y, b.y, 0.85) }
    const second = { x: b.x + out * 0.08, y: b.y }
    const rest = { x: second.x + out * 0.05, y: b.y }
    land(at(0.6), b)
    land(at(0.8), second)
    return {
      ways: [
        start,
        { ...net, t: at(0.4), h: 0.3, arc },
        { ...b, t: at(0.6), h: 0, arc: 0.25 },
        { ...second, t: at(0.8), h: 0, arc: 0.15 },
        { ...rest, t: at(1), h: 0, arc: 0.05 },
      ],
      marks,
      netAt: at(0.4),
    }
  }
  // Winner, Long and Wide run on in a straight line through where they land.
  const slope = (b.y - from.y) / (b.x - from.x)
  const floor = rally.ending !== 'Winner'
  const endX = floor ? b.x + out * 0.08 : END_X[far] + out * 0.3
  const end = { x: endX, y: from.y + slope * (endX - from.x) }
  const landAt = at(floor ? 0.62 : (b.x - from.x) / (endX - from.x))
  land(landAt, b, floor)
  return {
    ways: [start, { ...b, t: landAt, h: 0, arc }, { ...end, t: at(1), h: floor ? 0 : 0.4, arc: floor ? 0.05 : 0.15 }],
    marks,
    netAt: null,
  }
}

function flightAt(leg: Leg, t: number): Spot & { h: number } {
  const w = leg.ways
  let k = 1
  while (k < w.length - 1 && w[k].t < t) k++
  const a = w[k - 1]
  const b = w[k]
  const p = b.t > a.t ? clamp01((t - a.t) / (b.t - a.t)) : 1
  return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), h: lerp(a.h, b.h, p) + b.arc * Math.sin(p * Math.PI) }
}

/** A bat waits, goes to meet its next ball, and holds for a moment after each hit. */
function batAt(rally: ScriptRally, side: Side, t: number): Spot {
  const c = rally.contacts
  let prev = -1
  let next = -1
  for (let i = 0; i < c.length; i++) {
    if (hitterOf(rally.server, i + 1) !== side) continue
    if (c[i] <= t) prev = i
    else if (next < 0) next = i
  }
  const spot = (i: number) => batFor(side, rally.play[i].at)
  if (prev < 0) {
    if (next < 0) return restSpot(side)
    if (next === 0) return spot(0)
    const rest = restSpot(side)
    const to = spot(next)
    const p = ease(clamp01((t - (c[next] - 0.6)) / 0.6))
    return { x: lerp(rest.x, to.x, p), y: lerp(rest.y, to.y, p) }
  }
  const held = spot(prev)
  if (next >= 0) {
    const to = spot(next)
    const p = ease(clamp01((t - c[prev] - 0.15) / (c[next] - c[prev] - 0.15)))
    return { x: lerp(held.x, to.x, p), y: lerp(held.y, to.y, p) }
  }
  return held
}

/** What the stand-in picture shows at time `t` of a scripted video. */
export function sceneAt(script: VideoScript, t: number): Scene {
  const inBreak = script.breaks.some((b) => t >= b.a && t <= b.b)
  const idle = { me: restSpot('me'), them: restSpot('them') }
  let setNo: number | null = null
  for (let k = 0; k < script.rallies.length; k++) {
    const rally = script.rallies[k]
    const c = rally.contacts
    const first = c[0]
    const last = c[c.length - 1]
    const serveAt = rally.play[0].at
    const serving = { ...idle, [rally.server]: batFor(rally.server, serveAt) } as Record<Side, Spot>
    if (t < first - TOSS_S) {
      // The pause between points: the ball waits, dimmed, at the next server's bat.
      // Where the last ball landed stays for a moment.
      const before = k > 0 ? script.rallies[k - 1] : null
      const left = before ? legOf(before, before.contacts.length - 1).marks : []
      return {
        ball: { ...serveAt, opacity: 0.45, scale: 0.8, attack: false },
        hit: null,
        bats: serving,
        marks: left
          .filter((m) => t >= m.t && t - m.t < MARK_S)
          .map((m) => ({ x: m.x, y: m.y, age: t - m.t, floor: m.floor })),
        net: null,
        label: inBreak ? 'Break between sets' : 'Between points',
        setNo: setNo ?? rally.setNo,
      }
    }
    setNo = rally.setNo
    if (t > last + TAIL_S) continue

    if (t < first) {
      // The toss: up and back down, landing on the bat at the serve contact.
      const p = (t - (first - TOSS_S)) / TOSS_S
      const up = Math.sin(p * Math.PI)
      return {
        ball: { x: serveAt.x, y: serveAt.y - 0.06 * up, opacity: 1, scale: 0.95 + 0.7 * up, attack: false },
        hit: null,
        bats: { me: batAt(rally, 'me', t), them: batAt(rally, 'them', t) },
        marks: [],
        net: null,
        label: 'Serve coming',
        setNo,
      }
    }

    let i = c.length - 1
    while (i > 0 && c[i] > t) i--
    const hitter = hitterOf(rally.server, i + 1)
    const leg = legOf(rally, i)
    const fly = flightAt(leg, t)
    const ending = i === c.length - 1
    const p = ending ? Math.min(1, (t - last) / TAIL_S) : 0
    const stopped = rally.ending === 'Net' || rally.ending === 'Lucky'
    const fade = stopped ? 1 : 1 - Math.max(0, p - 0.8) * 4

    const landed = [...(i > 0 ? legOf(rally, i - 1).marks : []), ...leg.marks]
    const marks = landed
      .filter((m) => t >= m.t && t - m.t < MARK_S)
      .map((m) => ({ x: m.x, y: m.y, age: t - m.t, floor: m.floor }))

    const bats = { me: batAt(rally, 'me', t), them: batAt(rally, 'them', t) }
    if (ending && rally.ending === 'Winner') {
      // The other player goes for it and does not get there.
      const far = otherSide(hitter)
      const end = leg.ways[leg.ways.length - 1]
      bats[far] = { x: bats[far].x, y: lerp(bats[far].y, end.y, 0.45 * ease(clamp01((p - 0.15) / 0.5))) }
    }

    const flashed = t - c[i] < 0.2
    const shot = rally.play[i]
    return {
      ball: { x: fly.x, y: fly.y, opacity: Math.max(0.15, fade), scale: 0.7 + 0.5 * fly.h, attack: shot.attack },
      hit: flashed ? hitter : null,
      bats,
      marks,
      net: leg.netAt !== null && t >= leg.netAt && t - leg.netAt < NET_S ? t - leg.netAt : null,
      label: ending && p > 0.6 ? 'Point over' : null,
      setNo,
    }
  }
  return { ball: null, hit: null, bats: idle, marks: [], net: null, label: inBreak ? 'Break between sets' : null, setNo }
}
