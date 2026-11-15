/**
 * Rally model, ported from the real app's Pass 1 tagger (pure, no React).
 * One rally = tapped contacts, then: result of the end shot, its wing and
 * stroke, the first attack (or none), and that shot's wing and stroke.
 */

export type Side = 'me' | 'them'

export const otherSide = (s: Side): Side => (s === 'me' ? 'them' : 'me')

export const ENDINGS = ['Winner', 'Lucky', 'In-Net', 'Long', 'Wide', 'Air'] as const
export type Ending = (typeof ENDINGS)[number]

export const WINGS = ['BH', 'FH'] as const
export type Wing = (typeof WINGS)[number]

export const ATTACK_STROKES = ['Flick', 'Loop', 'Drive', 'Smash'] as const
export const REPLY_STROKES = ['Block', 'Push', 'Chop', 'Loop', 'Drive', 'Smash', 'Lob'] as const
export const END_STROKES = [
  'Flick',
  'Loop',
  'Drive',
  'Smash',
  'Lob',
  'Block',
  'Push',
  'Chop',
] as const
const DEFENSIVE_STROKES = new Set(['Push', 'Block', 'Chop', 'Lob'])

export const MISS_REASONS = [
  'Technical',
  'Timing',
  'Footwork',
  'Positioning',
  'Misread',
  'Forced',
] as const

/** Speed while contacts are tapped, and the reaction time taken off each tap. */
export const CAPTURE_SPEED = 0.75
export const NORMAL_SPEED = 1
export const TAP_LATENCY_S = 0.3
export const CONTACT_IDLE_MS = 2000
export const RALLY_PAD_S = 1
export const NUDGE_STEP_S = 0.1
export const MARK_LOOP_HALF_S = 0.5
export const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export type ShotTags = {
  wing?: Wing
  pivot?: boolean
  stroke?: string
  spin?: string
  depth?: string
  contact?: string
  intent?: string
  initiative?: string
  high?: boolean
  heavy?: boolean
  review?: boolean
  missReason?: string
}

/** A rally being tagged or edited. Times are seconds within `videoId`. */
export type Draft = {
  videoId: string
  server: Side
  contacts: number[]
  /** False while contacts are still being tapped. */
  closed: boolean
  /** Rally marks. Null means the default: 1s either side of the contacts. */
  start: number | null
  end: number | null
  ending: Ending | null
  /** Shot number of the first attack. */
  fa: number | null
  noAttack: boolean
  shots: ShotTags[]
  highlight: boolean
}

export type Stage = 'contacts' | 'result' | 'endShot' | 'pickFa' | 'faShot' | 'ready'

export function emptyDraft(videoId: string, server: Side): Draft {
  return {
    videoId,
    server,
    contacts: [],
    closed: false,
    start: null,
    end: null,
    ending: null,
    fa: null,
    noAttack: false,
    shots: [],
    highlight: false,
  }
}

/** Tap time with reaction time removed, never before `floor`. */
export function captureContactTime(videoTime: number, floor: number): number {
  return Math.max(floor, videoTime - TAP_LATENCY_S)
}

export function addContact(d: Draft, t: number): Draft {
  return { ...d, contacts: [...d.contacts, t], shots: [...d.shots, {}] }
}

export function undoContact(d: Draft): Draft {
  return { ...d, contacts: d.contacts.slice(0, -1), shots: d.shots.slice(0, -1) }
}

export const endShot = (d: Draft): number => d.contacts.length

/** The server hits shot 1, then the players alternate. */
export function hitterOf(server: Side, shot: number): Side {
  return shot % 2 === 1 ? server : otherSide(server)
}

export const isError = (e: Ending | null): boolean =>
  e === 'In-Net' || e === 'Long' || e === 'Wide' || e === 'Air'

/** Winner or Lucky: the end shot's hitter. Any error: the other player. */
export function winnerOf(d: Pick<Draft, 'server' | 'contacts' | 'ending'>): Side | null {
  if (!d.ending || d.contacts.length === 0) return null
  const hitter = hitterOf(d.server, d.contacts.length)
  return isError(d.ending) ? otherSide(hitter) : hitter
}

function hasWingStroke(s: ShotTags | undefined): boolean {
  return Boolean(s?.wing && s.stroke)
}

/** A serve-only rally needs just the result. */
export function endAttrsComplete(d: Draft): boolean {
  if (!d.ending) return false
  const n = endShot(d)
  return n === 1 || hasWingStroke(d.shots[n - 1])
}

export function faDecided(d: Draft): boolean {
  return endShot(d) === 1 || d.fa !== null || d.noAttack
}

export function faAttrsComplete(d: Draft): boolean {
  if (d.fa === null) return true
  return hasWingStroke(d.shots[d.fa - 1])
}

export function stageOf(d: Draft): Stage {
  if (!d.closed) return 'contacts'
  if (!d.ending) return 'result'
  if (!endAttrsComplete(d)) return 'endShot'
  if (!faDecided(d)) return 'pickFa'
  if (!faAttrsComplete(d)) return 'faShot'
  return 'ready'
}

export const canSave = (d: Draft): boolean => stageOf(d) === 'ready'

/**
 * End on shot 2: once its wing and stroke are in, a defensive stroke means
 * No attack and an attacking stroke makes shot 2 the first attack. Not asked.
 */
export function applyAutoSkip(d: Draft): Draft {
  if (endShot(d) !== 2 || !endAttrsComplete(d) || faDecided(d)) return d
  const stroke = d.shots[1]?.stroke ?? ''
  return DEFENSIVE_STROKES.has(stroke) ? { ...d, noAttack: true } : { ...d, fa: 2 }
}

/** A result is changed by picking another. Pressing the lit one again does nothing. */
export function setEnding(d: Draft, ending: Ending): Draft {
  if (d.ending === ending) return d
  return applyAutoSkip({ ...d, ending })
}

export function patchShot(d: Draft, shot: number, patch: Partial<ShotTags>): Draft {
  const shots = d.shots.map((s, i) => (i === shot - 1 ? { ...s, ...patch } : s))
  return applyAutoSkip({ ...d, shots })
}

/** Toggle a single-choice field: pressing the chosen value clears it. */
export function toggleShotField<K extends keyof ShotTags>(
  d: Draft,
  shot: number,
  key: K,
  value: ShotTags[K]
): Draft {
  const current = d.shots[shot - 1]?.[key]
  return patchShot(d, shot, { [key]: current === value ? undefined : value } as Partial<ShotTags>)
}

/** Mark, move or clear the first attack. Shot 1 can never be it. */
export function markFa(d: Draft, shot: number): Draft {
  if (shot < 2 || shot > endShot(d)) return d
  if (d.fa === shot) return { ...d, fa: null }
  return { ...d, fa: shot, noAttack: false }
}

export function toggleNoAttack(d: Draft): Draft {
  return d.noAttack ? { ...d, noAttack: false } : { ...d, noAttack: true, fa: null }
}

export type ShotRole = 'serve' | 'before' | 'firstAttack' | 'reply' | 'later'

/** Role by position against the first attack. */
export function roleOf(d: Draft, shot: number): ShotRole {
  if (shot === 1) return 'serve'
  if (d.fa === null) return 'before'
  if (shot < d.fa) return 'before'
  if (shot === d.fa) return 'firstAttack'
  if (shot <= d.fa + 2) return 'reply'
  return 'later'
}

export const ROLE_LABEL: Record<ShotRole, string> = {
  serve: 'Serve',
  before: 'Receive',
  firstAttack: 'First attack',
  reply: 'Reply',
  later: 'Ball',
}

export type ShotFields = {
  result: boolean
  wing: boolean
  pivot: boolean
  strokes: readonly string[] | null
  spin: boolean
  depth: boolean
  ball: boolean
  contact: boolean
  intent: boolean
  initiative: boolean
  missReason: boolean
}

/** Which rows a shot's panel shows. Anything else is not asked for that role. */
export function fieldsFor(d: Draft, shot: number): ShotFields {
  const role = roleOf(d, shot)
  const isEnd = shot === endShot(d)
  const serve = role === 'serve'
  const fa = role === 'firstAttack'
  const strokes = serve
    ? null
    : isEnd
      ? END_STROKES
      : fa
        ? ATTACK_STROKES
        : role === 'before'
          ? null
          : REPLY_STROKES
  return {
    result: isEnd,
    wing: !serve,
    pivot: !serve && (fa || role === 'before' || isEnd),
    strokes,
    spin: serve,
    depth: serve || role === 'before',
    ball: serve || role === 'before',
    contact: fa,
    intent: fa,
    initiative: role === 'reply',
    missReason: isEnd && isError(d.ending) && Boolean(d.shots[shot - 1]?.review),
  }
}

export function rallyStart(d: Pick<Draft, 'start' | 'contacts'>): number {
  return d.start ?? Math.max(0, (d.contacts[0] ?? 0) - RALLY_PAD_S)
}

export function rallyEnd(d: Pick<Draft, 'end' | 'contacts'>): number {
  return d.end ?? (d.contacts[d.contacts.length - 1] ?? 0) + RALLY_PAD_S
}

/** A selected shot loops from its contact to the next one. */
export function shotWindow(d: Draft, shot: number): { a: number; b: number } {
  const a = Math.max(rallyStart(d), d.contacts[shot - 1] - 0.2)
  const b = shot < d.contacts.length ? d.contacts[shot] : rallyEnd(d)
  return { a, b: Math.max(b, a + 0.3) }
}

export type Mark = { kind: 'start' } | { kind: 'end' } | { kind: 'shot'; shot: number }

export function markTime(d: Draft, mark: Mark): number {
  if (mark.kind === 'start') return rallyStart(d)
  if (mark.kind === 'end') return rallyEnd(d)
  return d.contacts[mark.shot - 1]
}

const GAP = 0.05

/** Move a mark by `delta`. Marks never cross their neighbours. */
export function nudgeMark(d: Draft, mark: Mark, delta: number, maxTime: number): Draft {
  const n = d.contacts.length
  const round = (v: number) => Math.round(v * 100) / 100
  if (mark.kind === 'start') {
    const next = Math.min(d.contacts[0], Math.max(0, rallyStart(d) + delta))
    return { ...d, start: round(next) }
  }
  if (mark.kind === 'end') {
    const next = Math.max(d.contacts[n - 1], Math.min(maxTime, rallyEnd(d) + delta))
    return { ...d, end: round(next) }
  }
  const i = mark.shot - 1
  const lo = i === 0 ? rallyStart(d) : d.contacts[i - 1] + GAP
  const hi = i === n - 1 ? rallyEnd(d) : d.contacts[i + 1] - GAP
  const next = Math.max(lo, Math.min(hi, d.contacts[i] + delta))
  const contacts = d.contacts.map((c, k) => (k === i ? round(next) : c))
  return { ...d, contacts }
}

/** One line, saying only the next thing to do. */
export function statusText(d: Draft): string {
  const n = endShot(d)
  switch (stageOf(d)) {
    case 'contacts':
      return 'Tap each contact'
    case 'result':
      return `Result of shot ${n}`
    case 'endShot':
      return `Wing and stroke of shot ${n}`
    case 'pickFa':
      return 'Pick the first attack'
    case 'faShot':
      return `Wing and stroke of shot ${d.fa}`
    default:
      return 'Ready to save'
  }
}

/** Short summary of one shot, for collapsed rows and the rally list. */
export function shotSummary(s: ShotTags): string {
  return [
    s.wing ? (s.pivot ? `${s.wing} pivot` : s.wing) : '',
    s.stroke,
    s.spin,
    s.depth,
    s.contact,
    s.intent,
    s.initiative,
    s.high ? 'High' : '',
    s.heavy ? 'Heavy' : '',
    s.review ? 'Review' : '',
    s.missReason,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** A saved rally. Times are seconds within `videoId`; the score is counted, not stored. */
export type RallyData = {
  id: string
  videoId: string
  server: Side
  contacts: number[]
  start: number
  end: number
  ending: Ending
  fa: number | null
  shots: ShotTags[]
  winner: Side
  highlight: boolean
}

export function rallyFromDraft(d: Draft, id: string): RallyData | null {
  const winner = winnerOf(d)
  if (!canSave(d) || !d.ending || !winner) return null
  return {
    id,
    videoId: d.videoId,
    server: d.server,
    contacts: d.contacts,
    start: rallyStart(d),
    end: rallyEnd(d),
    ending: d.ending,
    fa: d.fa,
    shots: d.shots,
    winner,
    highlight: d.highlight,
  }
}

export function draftFromRally(r: RallyData): Draft {
  return {
    videoId: r.videoId,
    server: r.server,
    contacts: r.contacts,
    closed: true,
    start: r.start,
    end: r.end,
    ending: r.ending,
    fa: r.fa,
    noAttack: r.fa === null && r.contacts.length > 1,
    shots: r.shots,
    highlight: r.highlight,
  }
}

/** "You serve", "Sam serves". */
export const servesText = (names: Record<Side, string>, side: Side): string =>
  side === 'me' ? `${names.me} serve` : `${names.them} serves`
