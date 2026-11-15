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
/** Cell order on the Offensive side. Block is first so it stays in one place. */
export const OFFENSIVE_STROKES = ['Block', 'Flick', 'Loop', 'Drive', 'Smash'] as const
/** Cell order on the Defensive side. The fifth cell is left empty. */
export const DEFENSIVE_STROKES_ROW = ['Block', 'Lob', 'Push', 'Chop'] as const
/** Offensive and Defensive lists joined. Replies and end shots draw from this. */
export const ALL_STROKES = ['Block', 'Flick', 'Loop', 'Drive', 'Smash', 'Lob', 'Push', 'Chop'] as const
export const REPLY_STROKES = ALL_STROKES
export const END_STROKES = ALL_STROKES
/** Block has no side. The other three are the Defensive side only. */
const PURE_DEFENSIVE = new Set<string>(['Lob', 'Push', 'Chop'])
const DEFENSIVE_STROKES = new Set<string>(['Push', 'Block', 'Chop', 'Lob'])
/** A shot tagged with one of these cannot be the first attack. */
const NO_FIRST_ATTACK = DEFENSIVE_STROKES

export type StrokeSide = 'offensive' | 'defensive'

export const isAttackStroke = (stroke: string): boolean =>
  (ATTACK_STROKES as readonly string[]).includes(stroke)

/** The side a stroke belongs to. Block has none. */
export function strokeSide(stroke: string | undefined): StrokeSide | null {
  if (!stroke || stroke === 'Block') return null
  if (isAttackStroke(stroke)) return 'offensive'
  if (PURE_DEFENSIVE.has(stroke)) return 'defensive'
  return null
}

export const MISS_REASONS = ['Forced', 'Position', 'Technical', 'Misread'] as const

/** Speed while contacts are tapped, and the reaction time taken off each tap. */
export const CAPTURE_SPEED = 0.75
export const NORMAL_SPEED = 1
export const TAP_LATENCY_S = 0.3
export const CONTACT_IDLE_MS = 2000
export const RALLY_PAD_S = 1
/** A rally starts this long before the serve contact, which has no toss or routine in it. */
export const RALLY_LEAD_S = 2
/** A serve added in front of a late first tap sits this long before it. */
export const ADD_SERVE_GAP_S = 0.9
export const NUDGE_STEP_S = 0.1
export const MARK_LOOP_HALF_S = 0.5
/**
 * A shot being asked about loops from the contact before to the contact after.
 * The lead is never under 1.2s or over 2s, the tail never under 1s or over 2s,
 * and the window never leaves the rally. The serve starts at the rally start.
 * The end shot runs to the rally end.
 */
export const SHOT_LOOP_BEFORE_MIN_S = 1.2
export const SHOT_LOOP_BEFORE_MAX_S = 2
export const SHOT_LOOP_AFTER_MIN_S = 1
export const SHOT_LOOP_AFTER_MAX_S = 2
/** Hold on the last frame of a shot loop before it repeats. */
export const SHOT_LOOP_HOLD_S = 0.3
/** The shot-number badge stays this long after that shot's contact. */
export const SHOT_BADGE_S = 0.4
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
  /**
   * The server was chosen or confirmed: Switch, or either press in Review serves.
   * Absent means the app's proposal was kept.
   */
  serveChecked?: boolean
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

/**
 * Undo the last tap of a closed rally: the tap before becomes the end shot.
 * The result went with the shot that is gone, so it is asked again.
 */
export function undoClosedContact(d: Draft): Draft {
  const n = d.contacts.length - 1
  return {
    ...d,
    contacts: d.contacts.slice(0, -1),
    shots: d.shots.slice(0, -1),
    ending: null,
    fa: d.fa !== null && d.fa > n ? null : d.fa,
    noAttack: n >= 2 ? d.noAttack : false,
    end: null,
  }
}

/**
 * The first tap was late: put the serve in front of it. Every shot moves up
 * one, so the hitters and the winner come right without a re-tap.
 */
export function addServe(d: Draft, floor: number): Draft {
  if (d.contacts.length === 0) return d
  const first = d.contacts[0]
  const at = Math.round(Math.max(floor, Math.max(0, first - ADD_SERVE_GAP_S)) * 100) / 100
  const next: Draft = {
    ...d,
    contacts: [Math.min(at, first), ...d.contacts],
    shots: [{}, ...d.shots],
    fa: d.fa !== null ? d.fa + 1 : null,
    noAttack: false,
    start: null,
  }
  // No attack chosen on three shots or more still holds. A shorter rally is asked again.
  return applyAutoSkip(d.noAttack && d.contacts.length >= 3 ? { ...next, noAttack: true } : next)
}

/** Add contact loops from this long before the first tap. A serve earlier than that is out of reach. */
export const ADD_CONTACT_LEAD_S = 4
/** Re-tap starts this long before the serve, so the thumb has time to get back to the pad. */
export const RETAP_LEAD_S = 2.5
/** Two contacts are never closer than this. */
const CONTACT_GAP_S = 0.05

const round2 = (v: number) => Math.round(v * 100) / 100

/**
 * Where a missed contact lands for a press at `videoTime`: reaction time off,
 * inside the video, never on top of a tap already there, and never behind
 * `fence` (the last contact of the rally saved before this one).
 */
export function addedContactTime(d: Draft, videoTime: number, fence: number | null, maxTime: number): number {
  const low = fence === null ? 0 : fence + CONTACT_GAP_S
  let t = round2(Math.max(low, Math.min(maxTime, videoTime - TAP_LATENCY_S)))
  const i = d.contacts.findIndex((c) => Math.abs(c - t) < CONTACT_GAP_S - 1e-6)
  if (i < 0) return t
  // Too close to a tap: it goes 0.05 from it, on the side it fell.
  const c = d.contacts[i]
  if (t >= c) {
    const next = d.contacts[i + 1]
    t = next !== undefined && next - c < 2 * CONTACT_GAP_S ? (c + next) / 2 : c + CONTACT_GAP_S
  } else {
    const prev = Math.max(low, d.contacts[i - 1] ?? low)
    t = c - prev < 2 * CONTACT_GAP_S ? (c + prev) / 2 : c - CONTACT_GAP_S
  }
  return round2(t)
}

/**
 * Add contact: a missed contact goes in at `t`, in time order. In front of
 * shot 1 it is the serve. The shots after it move up one and keep their tags,
 * and the first attack moves with its shot. The hitters after it swap, so the
 * winner may change. After the old end shot it is the new end shot and the
 * result is asked again.
 */
export function insertContact(d: Draft, t: number): { draft: Draft; shot: number } {
  const n = d.contacts.length
  const i = d.contacts.filter((c) => c < t).length
  const next: Draft = {
    ...d,
    contacts: [...d.contacts.slice(0, i), t, ...d.contacts.slice(i)],
    shots: [...d.shots.slice(0, i), {}, ...d.shots.slice(i)],
    fa: d.fa !== null && d.fa - 1 >= i ? d.fa + 1 : d.fa,
    // No attack chosen on three shots or more still holds. A shorter rally is asked again.
    noAttack: d.noAttack && n >= 3,
    start: i === 0 ? null : d.start,
    ending: i === n ? null : d.ending,
    end: i === n ? null : d.end,
  }
  return { draft: applyAutoSkip(next), shot: i + 1 }
}

/** What Add contact loops: 4 seconds before the first tap (not behind the fence) to the rally end. */
export function addContactWindow(d: Draft, fence: number | null): { a: number; b: number } {
  const first = d.contacts[0] ?? 0
  return { a: Math.max(0, fence ?? 0, first - ADD_CONTACT_LEAD_S), b: rallyEnd(d) }
}

/** Where Re-tap puts the video: 2.5 seconds before the serve, never behind the fence. */
export function retapStart(d: Pick<Draft, 'contacts'>, fence: number | null): number {
  return Math.max(0, fence ?? 0, (d.contacts[0] ?? 0) - RETAP_LEAD_S)
}

/** "Shot 3 added", and the new winner when the added contact changed it. */
export function addedContactText(before: Draft, after: Draft, shot: number, names: Record<Side, string>): string {
  const was = winnerOf(before)
  const now = winnerOf(after)
  const base = `Shot ${shot} added`
  if (!now || now === was) return base
  return `${base} · ${names[now]} ${now === 'me' ? 'win' : 'wins'} now`
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
 * An attacking stroke on the end shot also clears No attack, on any length,
 * so Delete last cannot leave No attack beside Flick, Loop, Drive or Smash.
 * On two shots the first attack is then decided again from that stroke.
 */
export function applyAutoSkip(d: Draft): Draft {
  const stroke = d.shots[endShot(d) - 1]?.stroke ?? ''
  if (d.noAttack && isAttackStroke(stroke)) d = { ...d, noAttack: false }
  if (endShot(d) !== 2 || !endAttrsComplete(d) || faDecided(d)) return d
  return DEFENSIVE_STROKES.has(stroke) ? { ...d, noAttack: true, fa: null } : { ...d, fa: 2 }
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

/** Mark, move or clear the first attack. Shot 1 can never be it.
 * Block, Lob, Push and Chop cannot be picked as the first attack.
 */
export function markFa(d: Draft, shot: number): Draft {
  if (shot < 2 || shot > endShot(d)) return d
  if (d.fa === shot) return { ...d, fa: null }
  const stroke = d.shots[shot - 1]?.stroke ?? ''
  if (NO_FIRST_ATTACK.has(stroke)) return d
  return { ...d, fa: shot, noAttack: false }
}

/** No attack is not offered once the end shot is Flick, Loop, Drive or Smash. */
export function noAttackOffered(d: Draft): boolean {
  const stroke = d.shots[endShot(d) - 1]?.stroke ?? ''
  return !isAttackStroke(stroke)
}

export function toggleNoAttack(d: Draft): Draft {
  if (d.noAttack) return { ...d, noAttack: false }
  if (!noAttackOffered(d)) return d
  return { ...d, noAttack: true, fa: null }
}

/** The end shot of a two shot rally: its stroke is the first attack answer, so the switch can still flip. */
function twoShotEnd(d: Draft, shot: number): boolean {
  return endShot(d) === 2 && shot === 2
}

export type SwitchState = { side: StrokeSide; fixed: boolean }

/**
 * Which side the stroke switch shows, and whether it can flip.
 * Shots before the first attack are Defensive and fixed. The first attack is
 * Offensive and fixed, except on two shots, where the stroke decides and a
 * flip clears that answer. No attack is Defensive and fixed, with the same
 * two shot exception. Block does not change the side: the shot after it
 * follows the shot before it.
 */
export function switchOf(d: Draft, shot: number): SwitchState {
  if (d.fa !== null) {
    if (shot < d.fa) return { side: 'defensive', fixed: true }
    if (shot === d.fa) return { side: 'offensive', fixed: !twoShotEnd(d, shot) }
    const own = strokeSide(d.shots[shot - 1]?.stroke)
    if (own) return { side: own, fixed: false }
    return { side: switchOf(d, shot - 1).side, fixed: false }
  }
  if (d.noAttack) return { side: 'defensive', fixed: !twoShotEnd(d, shot) }
  const own = strokeSide(d.shots[shot - 1]?.stroke)
  if (own) return { side: own, fixed: false }
  const offensive = d.ending === 'Winner' || d.contacts.length >= 3
  return { side: offensive ? 'offensive' : 'defensive', fixed: false }
}

/** Five cells after the switch. Null keeps an empty place so nothing moves. */
export function strokeCells(side: StrokeSide, firstAttack: boolean): readonly (string | null)[] {
  if (firstAttack) return [null, 'Flick', 'Loop', 'Drive', 'Smash']
  if (side === 'defensive') return ['Block', 'Lob', 'Push', 'Chop', null]
  return ['Block', 'Flick', 'Loop', 'Drive', 'Smash']
}

/** The stroke row is asked on the end shot, the first attack, and shots after it. Not on the serve, and not before the first attack. */
export function showsStroke(d: Draft, shot: number): boolean {
  if (shot <= 1 || shot > endShot(d)) return false
  if (shot === endShot(d)) return true
  return roleOf(d, shot) !== 'before'
}

/**
 * Flip the switch. Clears the stroke, unless it is Block, which stays.
 * On a two shot rally the first attack answer is cleared too, and the new
 * stroke decides it again. Block's flip is not stored: the draft is unchanged.
 */
export function flipSwitch(d: Draft, shot: number): Draft {
  if (!showsStroke(d, shot) || switchOf(d, shot).fixed) return d
  if (d.shots[shot - 1]?.stroke === 'Block') return d
  const shots = d.shots.map((s, i) => (i === shot - 1 ? { ...s, stroke: undefined } : s))
  const cleared: Draft = { ...d, shots }
  if (twoShotEnd(d, shot)) return { ...cleared, fa: null, noAttack: false }
  return cleared
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
  /** The stroke row, with the switch. Shots before the first attack do not have it. */
  stroke: boolean
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
  return {
    result: isEnd,
    wing: !serve,
    pivot: !serve && (fa || role === 'before' || isEnd),
    stroke: showsStroke(d, shot),
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
  return d.start ?? Math.max(0, (d.contacts[0] ?? 0) - RALLY_LEAD_S)
}

export function rallyEnd(d: Pick<Draft, 'end' | 'contacts'>): number {
  return d.end ?? (d.contacts[d.contacts.length - 1] ?? 0) + RALLY_PAD_S
}

/**
 * The loop for one shot. Neighbours set the ends, then the floor, the cap,
 * and the rally. The serve starts at the rally start. The end shot runs to
 * the rally end. Times are seconds in the rally's video.
 */
export function shotWindow(d: Draft, shot: number): { a: number; b: number } {
  const n = d.contacts.length
  const c = d.contacts[shot - 1] ?? 0
  const start = rallyStart(d)
  const end = rallyEnd(d)
  let a = start
  if (shot > 1) {
    const before = d.contacts[shot - 2]
    a = Math.min(before, c - SHOT_LOOP_BEFORE_MIN_S)
    a = Math.max(a, c - SHOT_LOOP_BEFORE_MAX_S)
    a = Math.max(a, start)
  }
  let b = end
  if (shot < n) {
    const after = d.contacts[shot]
    b = Math.max(after, c + SHOT_LOOP_AFTER_MIN_S)
    b = Math.min(b, c + SHOT_LOOP_AFTER_MAX_S)
    b = Math.min(b, end)
  }
  if (a > c) a = c
  if (b < c) b = c
  if (b < a) b = a
  return { a, b }
}

/**
 * The shot a loop is about. Null means the whole rally: the pick step, and
 * Ready when no shot is open. While a shot is asked about, from the result
 * until its wing and stroke are in, that shot is the one.
 */
export function loopShotOf(d: Draft, st: Stage, sel: Mark | null): number | null {
  if (!d.closed || d.contacts.length === 0 || st === 'pickFa') return null
  if (st === 'ready' && sel?.kind !== 'shot') return null
  if (st === 'result' || st === 'endShot') return d.contacts.length
  if (st === 'faShot') return d.fa
  if (sel?.kind === 'shot') return sel.shot
  return null
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

export type MarkKind = 'serve' | 'gap'

/**
 * A saved rally. Times are seconds within `videoId`. It keeps the server and
 * winner it was tagged with: nothing done to another rally ever changes them.
 * The score is counted from the winners, not stored.
 */
export type RallyData = {
  id: string
  videoId: string
  server: Side
  contacts: number[]
  start: number
  end: number
  /** Null only on a point added without video. */
  ending: Ending | null
  fa: number | null
  shots: ShotTags[]
  winner: Side
  highlight: boolean
  /** A point added without video: no contacts, `start` is its place in the video. */
  point?: true
  /** Continuity marks the user chose to leave as they are. */
  left?: MarkKind[]
  /** The server was chosen or confirmed. See `isKnownGood` in continuity.ts. */
  serveChecked?: boolean
}

/** A point with no video, placed at `at` so it keeps its place in video order. */
export function pointRally(id: string, videoId: string, at: number, server: Side, winner: Side): RallyData {
  return {
    id,
    videoId,
    server,
    contacts: [],
    start: at,
    end: at,
    ending: null,
    fa: null,
    shots: [],
    winner,
    highlight: false,
    point: true,
  }
}

/** The other player served: the hitters follow the server, and so does the winner. */
export function swapPlayers(r: RallyData): RallyData {
  return { ...r, server: otherSide(r.server), winner: otherSide(r.winner) }
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
    ...(d.serveChecked ? { serveChecked: true as const } : {}),
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
    ...(r.serveChecked ? { serveChecked: true as const } : {}),
  }
}

/** "You serve", "Sam serves". */
export const servesText = (names: Record<Side, string>, side: Side): string =>
  side === 'me' ? `${names.me} serve` : `${names.them} serves`
