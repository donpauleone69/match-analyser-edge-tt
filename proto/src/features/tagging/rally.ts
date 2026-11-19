/**
 * Rally model, ported from the real app's Pass 1 tagger (pure, no React).
 * One rally = tapped contacts, then: the first attack (or none), the result
 * of the end shot, its wing and stroke, and the first attack's wing and stroke.
 */

export type Side = 'me' | 'them'

export const otherSide = (s: Side): Side => (s === 'me' ? 'them' : 'me')

export const ENDINGS = ['Winner', 'Lucky', 'Net', 'Long', 'Wide', 'Air'] as const
/** `Off` is kept so rallies saved with it still load. No flow offers it any more. */
export type Ending = (typeof ENDINGS)[number] | 'Off'

export const WINGS = ['BH', 'FH'] as const
export type Wing = (typeof WINGS)[number]

export const ATTACK_STROKES = ['Flick', 'Loop', 'Drive', 'Smash'] as const
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
export const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

/** Rally Row groups. Opening, Attack, Rally, End. The same ids are the review marks. */
export type BestPart = 'opening' | 'attack' | 'rally' | 'end'

/**
 * Questions in the order they are asked. Serve, then each later shot (`shots`),
 * then End. `receive`, `third` and `fourth` still load from an older draft.
 */
export type BestStep = 'end' | 'serve' | 'receive' | 'third' | 'fourth' | 'shots'

/** Who attacked first. Covers the shots never asked. */
export type BestFirst = 'me' | 'them' | 'none'

/** In-progress Best + FA. The other flows never set this. */
export type BestMark = {
  flow: 'bestfa'
  /** The question open now. */
  step?: BestStep
  /** The shot open while `step` is `shots`. */
  endPage?: number
  /** End button. Winner means the last hitter won. Net, Long and Wide are errors. */
  end?: 'Winner' | 'Net' | 'Long' | 'Wide'
  /** Point to. Kept through every contact edit. */
  point?: Side
  /** Keep as is: saved with "Check the point". */
  kept?: true
  first?: BestFirst
  /** Parts marked for review, in row order. */
  review?: BestPart[]
  /** The contact Delete last removed, while Serve can still offer Delete first instead. Draft only. */
  cut?: number
}

export type ShotTags = {
  wing?: Wing
  /** Not asked any more. Kept so rallies saved with it still load. Never set, never saved. */
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
  /** Best + FA only. Absent on the other flows. */
  best?: BestMark
}

/** In the order they are asked. The pick comes first from three shots up. */
export type Stage = 'contacts' | 'pickFa' | 'result' | 'endShot' | 'faShot' | 'ready'

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

/** Tap time with reaction time removed, never before `floor`. `latency` defaults to the shared 300 ms. */
export function captureContactTime(videoTime: number, floor: number, latency = TAP_LATENCY_S): number {
  return Math.max(floor, videoTime - latency)
}

/**
 * A live tap on the pad this soon after the contact before it is the same
 * press landing twice, not another contact. In video seconds, as contacts are.
 */
// 150 ms on the clock at the 0.75x tapping speed (0.1125s of video), rounded down so a real shot is never dropped.
export const MIN_TAP_GAP_S = 0.11

/** True when a live tap at `t` is too soon after the last contact to count. The first tap always counts. */
export function tapIgnored(d: Draft, t: number): boolean {
  const last = d.contacts[d.contacts.length - 1]
  return last !== undefined && t - last < MIN_TAP_GAP_S - 1e-6
}

/** A live tap on the pad. One inside `MIN_TAP_GAP_S` of the last contact is ignored: the same draft comes back. */
export function addContact(d: Draft, t: number): Draft {
  if (tapIgnored(d, t)) return d
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
export function addedContactTime(
  d: Draft,
  videoTime: number,
  fence: number | null,
  maxTime: number,
  latency = TAP_LATENCY_S
): number {
  const low = fence === null ? 0 : fence + CONTACT_GAP_S
  let t = round2(Math.max(low, Math.min(maxTime, videoTime - latency)))
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
  e === 'Net' || e === 'Long' || e === 'Wide' || e === 'Air' || e === 'Off'

/** Winner or Lucky: the end shot's hitter. Any error: the other player. */
export function winnerOf(d: Pick<Draft, 'server' | 'contacts' | 'ending'>): Side | null {
  if (!d.ending || d.contacts.length === 0) return null
  const hitter = hitterOf(d.server, d.contacts.length)
  return isError(d.ending) ? otherSide(hitter) : hitter
}

/**
 * The server that makes `winner` win this rally. Winner or Lucky: the last
 * shot's hitter won. An error: the other player won. The number of shots then
 * says who served. With no result yet the server is left as it is.
 */
export function serverForWinner(d: Pick<Draft, 'server' | 'contacts' | 'ending'>, winner: Side): Side {
  const n = d.contacts.length
  if (!d.ending || n === 0) return d.server
  const hitter = isError(d.ending) ? otherSide(winner) : winner
  return n % 2 === 1 ? hitter : otherSide(hitter)
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

/**
 * Contacts, then the end of the point (who won, the result, then the last
 * shot's stroke and wing), then the first attack pick, then that shot's
 * stroke and wing. One shot has no pick. Two shots have no pick either:
 * shot 2's stroke decides it (`applyAutoSkip`).
 */
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

/**
 * The first attack is never Block, Lob, Push or Chop. On a two shot rally the
 * stroke is the first attack answer, so there it is decided again, not refused.
 */
export function faStrokeRefused(d: Draft, shot: number, stroke: string | undefined): boolean {
  return shot === d.fa && !twoShotEnd(d, shot) && NO_FIRST_ATTACK.has(stroke ?? '')
}

/**
 * Change one shot's tags. A stroke the first attack cannot have leaves the
 * draft as it is (the same object comes back).
 */
export function patchShot(d: Draft, shot: number, patch: Partial<ShotTags>): Draft {
  if (faStrokeRefused(d, shot, patch.stroke)) return d
  // Pivot is not asked: nothing sets it.
  if ('pivot' in patch) {
    patch = { ...patch }
    delete patch.pivot
    if (Object.keys(patch).length === 0) return d
  }
  // Two shots: a defensive stroke takes the first attack off shot 2, and the stroke decides again.
  if (twoShotEnd(d, shot) && d.fa === shot && NO_FIRST_ATTACK.has(patch.stroke ?? '')) d = { ...d, fa: null }
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

/** Why a shot cannot be picked as the first attack. */
export type FaRefusal =
  | { kind: 'serve' }
  | { kind: 'noShot' }
  | { kind: 'stroke'; shot: number; stroke: string }

/**
 * Null when `shot` can be picked as the first attack (or is the first attack,
 * where a press clears it). Otherwise the reason: it is the serve, it is not a
 * shot of this rally, or it shows Block, Lob, Push or Chop. A stroke kept on a
 * shot with no stroke row is not a reason: nobody can see it.
 */
export function faRefusal(d: Draft, shot: number): FaRefusal | null {
  if (shot === 1) return { kind: 'serve' }
  if (!Number.isInteger(shot) || shot < 1 || shot > endShot(d)) return { kind: 'noShot' }
  if (d.fa === shot) return null
  const stroke = d.shots[shot - 1]?.stroke ?? ''
  return NO_FIRST_ATTACK.has(stroke) && showsStroke(d, shot) ? { kind: 'stroke', shot, stroke } : null
}

/** One short line for a refusal, for the screen to show. */
export function faRefusalText(r: FaRefusal): string {
  if (r.kind === 'serve') return 'The serve cannot be the first attack'
  if (r.kind === 'noShot') return 'No shot to pick yet'
  return `Shot ${r.shot} is tagged ${r.stroke}, so it cannot be the first attack`
}

/**
 * Mark, move or clear the first attack. Shot 1 can never be it, nor can a
 * shot that shows Block, Lob, Push or Chop: `faRefusal` says why. A refused
 * press gives the same draft back. Strokes already answered are kept wherever
 * the first attack goes, so moving it back brings them back. Save leaves out
 * the ones that have no row (`rallyFromDraft`).
 *
 * The one stroke that goes: Block, Lob, Push or Chop kept on the picked shot
 * while it had no stroke row. The pick is taken and that shot's stroke row
 * opens empty. No other shot is touched.
 */
export function markFa(d: Draft, shot: number): Draft {
  if (faRefusal(d, shot)) return d
  if (d.fa === shot) return { ...d, fa: null }
  const next = { ...d, fa: shot, noAttack: false }
  if (!NO_FIRST_ATTACK.has(d.shots[shot - 1]?.stroke ?? '')) return next
  const shots = d.shots.map((s, i) => {
    if (i !== shot - 1) return s
    const open = { ...s }
    delete open.stroke
    return open
  })
  return { ...next, shots }
}

/** Change first attack: back to the pick step. Every answer stays. Nothing to reopen on a serve and return. */
export function reopenFaPick(d: Draft): Draft {
  if (d.contacts.length < 3) return d
  return { ...d, fa: null, noAttack: false }
}

/** How far past the playhead a contact still counts as reached, in seconds. */
export const SHOT_REACHED_SLACK_S = 0.05

/**
 * The shot whose contact the playhead has reached, or null before shot 2:
 * never the serve. `localTime` is seconds in this rally's video. `lag` is
 * video time taken off first, the allowance a press gets (`TAP_LATENCY_S`).
 */
export function shotAtTime(d: Draft, localTime: number, lag = 0): number | null {
  const at = localTime - lag
  const reached = d.contacts.filter((c) => c <= at + SHOT_REACHED_SLACK_S).length
  return reached >= 2 ? reached : null
}

/**
 * No attack is offered on every rally past the serve. The pick comes after
 * the end shot's stroke, so an attacking stroke on that shot is cleared.
 */
export function noAttackOffered(d: Draft): boolean {
  return endShot(d) >= 2
}

/**
 * No attack takes the first attack off. A Flick, Loop, Drive or Smash kept on
 * the end shot (Edit, or Change first attack) goes with it, so that stroke is
 * asked again on the Defensive side. Strokes on other shots stay in the draft:
 * Save leaves out the ones with no row.
 */
export function toggleNoAttack(d: Draft): Draft {
  if (d.noAttack) return { ...d, noAttack: false }
  if (!noAttackOffered(d)) return d
  const n = endShot(d)
  if (!isAttackStroke(d.shots[n - 1]?.stroke ?? '')) return { ...d, noAttack: true, fa: null }
  const shots = d.shots.map((s, i) => {
    if (i !== n - 1) return s
    const open = { ...s }
    delete open.stroke
    return open
  })
  return { ...d, noAttack: true, fa: null, shots }
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

/**
 * The stroke row is asked on the end shot whatever its role, on the first
 * attack, and on the two replies after it. Not on the serve, not before the
 * first attack, and not on later shots.
 */
export function showsStroke(d: Draft, shot: number): boolean {
  if (shot <= 1 || shot > endShot(d)) return false
  if (shot === endShot(d)) return true
  const role = roleOf(d, shot)
  return role === 'firstAttack' || role === 'reply'
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
  /** The stroke row, with the switch: `showsStroke`. */
  stroke: boolean
  /** Always false: Spin is not asked. Here only until the screen drops its row. */
  spin: boolean
  depth: boolean
  ball: boolean
  /** Always false: Contact is not asked. Here only until the screen drops its row. */
  contact: boolean
  intent: boolean
  initiative: boolean
  missReason: boolean
}

/**
 * Which rows a shot's panel shows. Anything else is not asked for that role.
 *
 * Serve: Depth, and the High and Heavy marks. Receive: the marks only.
 * First attack: Stroke, Wing, Intent. Reply: Stroke, Wing, Initiative.
 * Later shots: nothing. The last shot has Wing and Stroke whatever its role,
 * since Save needs them, and Miss reason on any error.
 */
export function fieldsFor(d: Draft, shot: number): ShotFields {
  const role = roleOf(d, shot)
  const isEnd = shot === endShot(d)
  const serve = role === 'serve'
  const fa = role === 'firstAttack'
  const stroke = showsStroke(d, shot)
  return {
    result: isEnd,
    // Wing goes with the stroke row: the first attack, the replies and the last shot.
    wing: stroke,
    stroke,
    spin: false,
    depth: serve,
    ball: serve || role === 'before',
    contact: false,
    intent: fa,
    initiative: role === 'reply',
    missReason: isEnd && isError(d.ending),
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
      return `Stroke and wing of shot ${n}`
    case 'pickFa':
      return 'Pick the first attack'
    case 'faShot':
      return `Stroke and wing of shot ${d.fa}`
    default:
      return 'Ready to save'
  }
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
  /**
   * Rally Spine or Best + FA. Absent on Shot by shot.
   * The score still comes from `winner`, not from these answers.
   */
  idea?: IdeaTag
}

/** Answers from Rally Spine or Best + FA. Shot by shot never sets this. */
export type IdeaTag = {
  flow: 'spine' | 'bestfa'
  /** Spine result token, or the Best + FA end button. */
  result?: string
  serve?: string
  /** Shot number to the button that was pressed. */
  shots?: Record<number, string>
  /** Who attacked first, from the optional Best + FA question. */
  first?: BestFirst
  /** Parts marked for review. Same ids as the Rally Row. */
  review?: BestPart[]
  /** Finish wing, Rally Spine only. */
  wing?: string
  /** Finish stroke, Rally Spine only. Empty when the earlier sweep already named it. */
  finish?: string
  /** Set when the last ball disagrees with the point winner. */
  check?: string
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

/**
 * The shots as Save keeps them. A stroke is kept only where the stroke row
 * shows: the last shot, the first attack and the two replies after it. A stroke
 * answered on a shot that has since lost its row (the first attack moved, No
 * attack, a contact added after the end shot) stays in the draft, so the
 * answer comes back with the row, and is left out here. Pivot, on a rally
 * saved when it was still asked, is left out too.
 */
export function savedShots(d: Draft): ShotTags[] {
  const hidden = (s: ShotTags | undefined, i: number) => Boolean(s?.stroke) && !showsStroke(d, i + 1)
  const drops = (s: ShotTags | undefined, i: number) => hidden(s, i) || (s !== undefined && 'pivot' in s)
  if (!d.shots.some(drops)) return d.shots
  return d.shots.map((s, i) => {
    if (!drops(s, i)) return s
    const kept = { ...s }
    if (hidden(s, i)) delete kept.stroke
    delete kept.pivot
    return kept
  })
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
    shots: savedShots(d),
    winner,
    highlight: d.highlight,
    ...(d.serveChecked ? { serveChecked: true as const } : {}),
  }
}

/** "You serve", "Sam serves". */
export const servesText = (names: Record<Side, string>, side: Side): string =>
  side === 'me' ? `${names.me} serve` : `${names.them} serves`
