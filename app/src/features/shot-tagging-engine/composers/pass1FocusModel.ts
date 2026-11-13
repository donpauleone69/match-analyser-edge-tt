/**
 * Pass 1 Focus tagger model.
 *
 * Contact taps + first-attack stamp + end/ending, then a small set of
 * per-shot tags on the shots that matter: the ball before the attack
 * (High), the first attack (wing, Pivot, stroke, Safe), the reply (wing,
 * Pivot, stroke, standing) and the end shot (wing, Pivot, stroke).
 *
 * Which tags a shot may carry is decided by the pure rules allow-list
 * (`derivePass1ShotTagAllowList`) — the same one the save mapper uses.
 */

import type { PointMissReason, ShotReviewKind } from '@/data'
import { derivePass1ShotTagAllowList } from '@/rules/derive/shot/derivePass1ShotTagRole'

export type { PointMissReason, ShotReviewKind }

export type TimelineMode = 'Rally' | 'Shot' | 'Placement' | 'Mental'

/** Spec backing values for point ending */
export type PointEnding =
  | 'winner'
  | 'lucky'
  | 'error_net'
  | 'error_long'
  | 'error_wide'
  | 'error_air'

export type Wing = 'BH' | 'FH'
/** First attack strokes. */
export type AttackStroke = 'Flick' | 'Loop' | 'Drive' | 'Smash' | 'Lob'
/** Reply strokes (also available on the end shot). */
export type ReplyStroke =
  | 'Block'
  | 'Push'
  | 'Chop'
  | 'Loop'
  | 'Drive'
  | 'Smash'
  | 'Lob'
/** End-shot strokes: everything. */
export type EndStroke =
  | 'Flick'
  | 'Loop'
  | 'Drive'
  | 'Smash'
  | 'Lob'
  | 'Block'
  | 'Push'
  | 'Chop'
/** Where the player who was attacked stands after their reply. */
export type Standing = 'behind' | 'level' | 'ahead'

export type RallyPhase = 'opening' | 'ball' | 'fos' | 'reply' | 'next' | 'after'

export interface ShotTags {
  wing: Wing | null
  stroke: AttackStroke | ReplyStroke | EndStroke | null
  /** Higher than intended — ball before the attack only. */
  isHigh: boolean
  /** Safe first attack — first attack only. */
  isSafe: boolean
  /** Crossed wing (FH from BH side / BH from FH side). */
  isPivot: boolean
  /** Flag for later review; technical also requires wing + stroke. */
  reviewKind: ShotReviewKind | null
  /** Reply only, while the point is still going. */
  standing: Standing | null
  /** Video time of the contact tap (seconds), if captured */
  contactTime: number | null
}

export type ShotMap = Record<number, ShotTags>

export interface RallyTimelineState {
  shotCount: number
  fos: number | null
  /**
   * Explicit “no first attack” (distinct from undecided `fos === null`).
   * Required for save when the point has 2+ shots.
   */
  noFirstAttack: boolean
  end: number | null
  ending: PointEnding | null
  /** Only meaningful when ending is an error. */
  missReason: PointMissReason | null
  fosTimeSeconds: number | null
  shots: ShotMap
}

export const TIMELINE_MODES: TimelineMode[] = ['Rally', 'Shot', 'Placement', 'Mental']

export const PHASE_META: Record<
  RallyPhase,
  { name: string; stripe: string }
> = {
  opening: { name: 'OPENING', stripe: 'var(--color-shot-receive)' },
  ball: { name: 'THE BALL', stripe: 'var(--color-shot-serve)' },
  fos: { name: 'FIRST ATTACK', stripe: 'var(--color-shot-first-attack)' },
  reply: { name: 'REPLY', stripe: 'var(--color-shot-receive)' },
  next: { name: 'NEXT', stripe: 'var(--color-player-1)' },
  after: { name: 'AFTER', stripe: 'var(--color-player-2)' },
}

export const ENDING_OPTIONS: { value: PointEnding; label: string }[] = [
  { value: 'winner', label: 'Winner' },
  { value: 'lucky', label: 'Lucky' },
  { value: 'error_net', label: 'In-Net' },
  { value: 'error_long', label: 'Long' },
  { value: 'error_wide', label: 'Wide' },
  { value: 'error_air', label: 'Air' },
]

export const MISS_REASON_OPTIONS: { value: PointMissReason; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'timing', label: 'Timing' },
  { value: 'footwork', label: 'Footwork' },
  { value: 'positioning', label: 'Positioning' },
  { value: 'misread', label: 'Misread' },
  { value: 'forced', label: 'Forced' },
]

export const REVIEW_KIND_OPTIONS: { value: ShotReviewKind; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'tactical', label: 'Tactical' },
]

export const WING_OPTIONS: Wing[] = ['FH', 'BH']
export const ATTACK_STROKE_OPTIONS: AttackStroke[] = [
  'Flick',
  'Loop',
  'Drive',
  'Smash',
  'Lob',
]
export const REPLY_STROKE_OPTIONS: ReplyStroke[] = [
  'Block',
  'Push',
  'Chop',
  'Loop',
  'Drive',
  'Smash',
  'Lob',
]
export const END_STROKE_OPTIONS: EndStroke[] = [
  'Flick',
  'Loop',
  'Drive',
  'Smash',
  'Lob',
  'Block',
  'Push',
  'Chop',
]

/** Default capture speed after the serve is tagged */
export const CAPTURE_PLAYBACK_SPEED = 0.75
export const NORMAL_PLAYBACK_SPEED = 1

/** Playback rates for feel-test speed nudge controls */
export const PLAYBACK_SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

/** Idle gap after last contact before the point is considered finished */
export const CONTACT_IDLE_MS = 2000

/** Loop pad before first / after last contact (seconds) */
export const LOOP_PAD_SECONDS = 1

/** Server (odd) vs receiver (even) overlay colours */
export const CONTACT_OVERLAY_SERVER = 'var(--color-player-1)'
export const CONTACT_OVERLAY_RECEIVER = 'var(--color-player-2)'

export function isErrorEnding(ending: PointEnding | null): boolean {
  return (
    ending === 'error_net' ||
    ending === 'error_long' ||
    ending === 'error_wide' ||
    ending === 'error_air'
  )
}

function emptyShot(contactTime: number | null = null): ShotTags {
  return {
    wing: null,
    stroke: null,
    isHigh: false,
    isSafe: false,
    isPivot: false,
    reviewKind: null,
    standing: null,
    contactTime,
  }
}

export function emptyShotMap(count = 0): ShotMap {
  const shots: ShotMap = {}
  for (let i = 1; i <= count; i++) {
    shots[i] = emptyShot()
  }
  return shots
}

export function emptyRallyTimelineState(): RallyTimelineState {
  return {
    shotCount: 0,
    fos: null,
    noFirstAttack: false,
    end: null,
    ending: null,
    missReason: null,
    fosTimeSeconds: null,
    shots: {},
  }
}

/** Build timeline from contact tap times (seconds). End pre-marked at N. */
export function timelineFromContacts(times: number[]): RallyTimelineState {
  const shotCount = times.length
  const shots: ShotMap = {}
  for (let i = 0; i < shotCount; i++) {
    shots[i + 1] = emptyShot(times[i])
  }
  return {
    shotCount,
    fos: null,
    noFirstAttack: false,
    end: shotCount > 0 ? shotCount : null,
    ending: null,
    missReason: null,
    fosTimeSeconds: null,
    shots,
  }
}

/**
 * The ball that was attacked, or — when nobody attacked — the last ball
 * they could have taken (the contact before the point ended).
 */
export function ballBeforeAttack(state: RallyTimelineState): number | null {
  if (typeof state.fos === 'number' && state.fos > 1) return state.fos - 1
  if (
    state.noFirstAttack &&
    state.fos === null &&
    typeof state.end === 'number' &&
    state.end > 1
  ) {
    return state.end - 1
  }
  return null
}

export function phaseAt(n: number, state: RallyTimelineState): RallyPhase {
  const ball = ballBeforeAttack(state)
  if (typeof state.fos === 'number') {
    if (n === state.fos) return 'fos'
    if (n === state.fos + 1) return 'reply'
    if (n === state.fos + 2) return 'next'
    if (n > state.fos + 2) return 'after'
  }
  if (n === ball) return 'ball'
  return 'opening'
}

/** Visible rows: up to end when set, otherwise all tapped shots. */
export function visibleShotNumbers(shotCount: number, end: number | null): number[] {
  if (shotCount <= 0) return []
  const last = typeof end === 'number' ? Math.min(end, shotCount) : shotCount
  return Array.from({ length: last }, (_, i) => i + 1)
}

/** Shot-rail width: at least 10, and always two spare slots past the last contact. */
export function railSlotCount(shotCount: number): number {
  return Math.max(10, Math.max(0, shotCount) + 2)
}

export type RailSlotKind = 'in_play' | 'after_end' | 'unused'

/** How a rail slot relates to contacts and End (for grey / tap rules). */
export function railSlotKind(
  n: number,
  shotCount: number,
  end: number | null
): RailSlotKind {
  if (n < 1 || n > shotCount) return 'unused'
  if (typeof end === 'number' && n > end) return 'after_end'
  return 'in_play'
}

/** Contact times 1..shotCount from a timeline (skips missing). */
export function contactTimesFromTimeline(state: RallyTimelineState): number[] {
  const times: number[] = []
  for (let i = 1; i <= state.shotCount; i++) {
    const t = state.shots[i]?.contactTime
    if (typeof t === 'number') times.push(t)
  }
  return times
}

/**
 * Shot number “in play” at video time t.
 * Before the first contact (loop pad), returns 1; after the last, returns N.
 */
export function shotNumberAtTime(times: number[], t: number): number | null {
  if (times.length === 0) return null
  let shot = 1
  for (let i = 0; i < times.length; i++) {
    if (t >= times[i]) shot = i + 1
    else break
  }
  return shot
}

export function contactOverlayColor(shotNumber: number): string {
  return shotNumber % 2 === 1 ? CONTACT_OVERLAY_SERVER : CONTACT_OVERLAY_RECEIVER
}

/** Constrained loop window: 1s before serve, 1s after last contact. */
export function loopWindowFromContacts(
  serveTimestamp: number,
  endTimestamp: number,
  durationSeconds?: number | null
): { startTime: number; endTime: number } {
  const startTime = Math.max(0, serveTimestamp - LOOP_PAD_SECONDS)
  let endTime = endTimestamp + LOOP_PAD_SECONDS
  if (typeof durationSeconds === 'number' && durationSeconds > 0) {
    endTime = Math.min(durationSeconds, endTime)
  }
  if (endTime <= startTime) {
    endTime = startTime + 0.1
  }
  return { startTime, endTime }
}

/**
 * Human click → perceived contact latency (seconds).
 * Subtracted once when recording a tap so stored times are true contacts;
 * playback / shot loops use those stored times as-is (no second lead-in).
 * Distinct from {@link LOOP_PAD_SECONDS} (whole-rally loop padding).
 */
export const CONTACT_LATENCY_BUFFER_SECONDS = 0.3

/**
 * Estimate true contact time from a tap on the video clock.
 * `floorSeconds` is 0, the prior contact, or the last completed rally end —
 * never store a contact before that floor.
 */
export function captureContactTime(
  videoTimeSeconds: number,
  floorSeconds = 0
): number {
  return Math.max(floorSeconds, videoTimeSeconds - CONTACT_LATENCY_BUFFER_SECONDS)
}

/** Where to resume the rally loop when a shot is selected (never before the loop start). */
export function shotPlaybackStart(contactTime: number, loopStartTime: number): number {
  return Math.max(loopStartTime, contactTime)
}

/** Shortest selected-shot loop, so near-identical contact taps still play. */
export const MIN_SHOT_LOOP_SECONDS = 0.1

/**
 * Loop window for a selected shot, inside the whole-rally loop:
 * [contact(n), contact(n+1)]; the last contact runs to the rally loop end.
 * Null when shot `n` has no contact time (caller keeps the rally loop).
 * Click-latency compensation is already in stored contact times at capture.
 */
export function shotLoopWindow(
  state: RallyTimelineState,
  n: number,
  rallyLoop: { startTime: number; endTime: number }
): { startTime: number; endTime: number } | null {
  const contact = state.shots[n]?.contactTime
  if (typeof contact !== 'number') return null
  const { startTime: loopStart, endTime: loopEnd } = rallyLoop
  const startTime = Math.min(loopEnd, shotPlaybackStart(contact, loopStart))
  const next = state.shots[n + 1]?.contactTime
  let endTime =
    typeof next === 'number' ? Math.min(loopEnd, next) : loopEnd
  if (endTime - startTime < MIN_SHOT_LOOP_SECONDS) {
    endTime = Math.min(loopEnd, startTime + MIN_SHOT_LOOP_SECONDS)
  }
  if (endTime <= startTime) return null
  return { startTime, endTime }
}

/** ± seek step on the Pass 1 Focus video overlay (and keyboard J/L). */
export const SEEK_STEP_SECONDS = 10

/**
 * Earliest legal seek while tagging sequentially:
 * end of the last completed rally (not into its interior).
 */
export function seekFloorFromCompleted(
  completed: ReadonlyArray<{ endTimestamp: number }>
): number {
  if (completed.length === 0) return 0
  return completed[completed.length - 1].endTimestamp
}

/** Clamp a seek target to [minSeek, duration] (duration optional). */
export function clampSeekTime(
  t: number,
  minSeek: number,
  durationSeconds?: number | null
): number {
  let next = Math.max(minSeek, t)
  if (typeof durationSeconds === 'number' && durationSeconds > 0) {
    next = Math.min(durationSeconds, next)
  }
  return next
}

/** Padding before the earliest activity / after the latest on the strip. */
export const RALLY_TIMELINE_PAD_SECONDS = 8
/** Minimum zoomed window (seconds) so short rallies paint as ranges. */
export const RALLY_TIMELINE_MIN_WINDOW_SECONDS = 90

export interface RallyTimelineViewWindow {
  viewStart: number
  viewEnd: number
}

/**
 * Zoom window for the under-video rally strip.
 * Fits tagged activity (+ pad) so short rallies on a long match video paint as
 * colored ranges instead of timestamp ticks. Never exceeds [0, duration].
 */
export function rallyTimelineViewWindow(input: {
  duration: number
  liveTime: number
  completed: ReadonlyArray<{ endTimestamp: number; serveTimestamp?: number }>
  contactTimes?: ReadonlyArray<number>
}): RallyTimelineViewWindow {
  const { duration, liveTime, completed, contactTimes = [] } = input
  if (!(duration > 0)) return { viewStart: 0, viewEnd: 1 }

  const times: number[] = []
  if (Number.isFinite(liveTime) && liveTime > 0) times.push(liveTime)
  for (const r of completed) {
    if (typeof r.serveTimestamp === 'number') times.push(r.serveTimestamp)
    if (typeof r.endTimestamp === 'number') times.push(r.endTimestamp)
  }
  for (const t of contactTimes) {
    if (typeof t === 'number' && Number.isFinite(t)) times.push(t)
  }

  if (times.length === 0) {
    return {
      viewStart: 0,
      viewEnd: Math.min(duration, RALLY_TIMELINE_MIN_WINDOW_SECONDS),
    }
  }

  const earliest = Math.min(...times)
  const latest = Math.max(...times)
  let viewStart = Math.max(0, earliest - RALLY_TIMELINE_PAD_SECONDS)
  let viewEnd = Math.min(duration, latest + RALLY_TIMELINE_PAD_SECONDS)

  const span = viewEnd - viewStart
  if (span < RALLY_TIMELINE_MIN_WINDOW_SECONDS) {
    const need = RALLY_TIMELINE_MIN_WINDOW_SECONDS - span
    viewEnd = Math.min(duration, viewEnd + need)
    if (viewEnd - viewStart < RALLY_TIMELINE_MIN_WINDOW_SECONDS) {
      viewStart = Math.max(0, viewEnd - RALLY_TIMELINE_MIN_WINDOW_SECONDS)
    }
  }

  if (viewEnd <= viewStart) viewEnd = Math.min(duration, viewStart + 1)
  return { viewStart, viewEnd }
}

/** @deprecated Prefer rallyTimelineViewWindow — kept for call-site clarity. */
export function rallyTimelineViewEnd(
  input: Parameters<typeof rallyTimelineViewWindow>[0]
): number {
  return rallyTimelineViewWindow(input).viewEnd
}

/** Players alternate from the known server. Shot 1 = server. */
export function playerForShot(
  n: number,
  players: [string, string],
  server: string
): string {
  const serverIdx = Math.max(0, players.indexOf(server))
  return players[(serverIdx + n - 1) % 2]
}

/**
 * Exact End: winner from terminal hitter + winner/lucky vs error.
 */
export function inferWinnerName(
  end: number | null,
  ending: PointEnding | null,
  players: [string, string],
  server: string
): string | null {
  if (typeof end !== 'number' || !ending) return null
  const hitter = playerForShot(end, players, server)
  if (ending === 'winner' || ending === 'lucky') return hitter
  return playerForShot(end + 1, players, server)
}

function formatContactTime(t: number | null): string | null {
  if (t === null || !Number.isFinite(t)) return null
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

/**
 * Compact header details for a shot (role badge already shows Serve / Receive / …).
 * Phase-tagged fields first, then contact time.
 */
export function getShotSummary(_n: number, shot: ShotTags): string {
  const fields = [
    shot.wing,
    shot.isPivot ? 'Pivot' : null,
    shot.stroke,
    shot.isHigh ? 'High' : null,
    shot.isSafe ? 'Safe' : null,
    shot.standing === 'behind'
      ? 'Behind'
      : shot.standing === 'level'
        ? 'Level'
        : shot.standing === 'ahead'
          ? 'Ahead'
          : null,
    shot.reviewKind === 'technical'
      ? 'Tech review'
      : shot.reviewKind === 'tactical'
        ? 'Tact review'
        : null,
    formatContactTime(shot.contactTime),
  ]
  return fields.filter(Boolean).join(' · ') || '—'
}

export function describeFos(state: RallyTimelineState): string {
  if (typeof state.fos === 'number') return `FOS shot ${state.fos}`
  if (state.noFirstAttack) return 'No attack'
  if (state.end === null) return 'First attack?'
  return 'First attack?'
}

export function describeEnd(end: number | null): string {
  if (end === null) return 'Choose the last shot'
  return `${end} shot${end === 1 ? '' : 's'}`
}

export function describeEndingLabel(ending: PointEnding | null): string {
  if (!ending) return 'Select ending type'
  if (ending === 'winner') return 'Winner'
  if (ending === 'lucky') return 'Lucky'
  if (ending === 'error_net') return 'Error — In-Net'
  if (ending === 'error_long') return 'Error — Long'
  if (ending === 'error_wide') return 'Error — Wide'
  if (ending === 'error_air') return 'Error — Air'
  return 'Error'
}

export function describeMissReason(reason: PointMissReason | null): string | null {
  if (!reason) return null
  return MISS_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? null
}

/** Choice keys that toggle via mutually exclusive pills. */
export type ShotChoiceKey = 'wing' | 'stroke' | 'standing'

export type ShotAttributeKey = 'isHigh' | 'isSafe' | 'isPivot'

/** Toggle mutually exclusive optional choice (tap again clears). */
export function toggleShotChoice(
  state: RallyTimelineState,
  n: number,
  key: ShotChoiceKey,
  value: string
): RallyTimelineState {
  const shot = state.shots[n]
  if (!shot) return state
  const current = shot[key]
  return {
    ...state,
    shots: {
      ...state.shots,
      [n]: {
        ...shot,
        [key]: current === value ? null : value,
      },
    },
  }
}

/** Toggle an independent attribute switch (High / Safe / Pivot). */
export function toggleShotAttribute(
  state: RallyTimelineState,
  n: number,
  key: ShotAttributeKey
): RallyTimelineState {
  const shot = state.shots[n]
  if (!shot) return state
  return {
    ...state,
    shots: {
      ...state.shots,
      [n]: { ...shot, [key]: !shot[key] },
    },
  }
}

export function markFos(
  state: RallyTimelineState,
  at: number,
  videoTimeSeconds: number | null
): RallyTimelineState {
  if (state.end === 1) return state
  if (at < 2 || at > state.shotCount) return state
  if (typeof state.end === 'number' && at > state.end) return state
  // Re-tap same shot clears to undecided (not “no attack”).
  if (state.fos === at) {
    return { ...state, fos: null, noFirstAttack: false, fosTimeSeconds: null }
  }
  return {
    ...state,
    fos: at,
    noFirstAttack: false,
    fosTimeSeconds: videoTimeSeconds,
  }
}

/** Set first attack to a shot, or null with noFirstAttack when marking none. */
export function setFos(
  state: RallyTimelineState,
  at: number | null,
  videoTimeSeconds: number | null = null
): RallyTimelineState {
  if (at === null) {
    // Toggle: second tap on No attack returns to undecided.
    if (state.noFirstAttack) {
      return { ...state, fos: null, noFirstAttack: false, fosTimeSeconds: null }
    }
    return { ...state, fos: null, noFirstAttack: true, fosTimeSeconds: null }
  }
  if (state.end === 1) return state
  if (at < 2 || at > state.shotCount) return state
  if (typeof state.end === 'number' && at > state.end) return state
  return {
    ...state,
    fos: at,
    noFirstAttack: false,
    fosTimeSeconds: videoTimeSeconds,
  }
}

/** Last shot that can carry the first attack (end row, otherwise the last contact). */
export function fosUpperBound(state: RallyTimelineState): number {
  if (typeof state.end === 'number') return Math.min(state.end, state.shotCount)
  return state.shotCount
}

/**
 * Move an existing first-attack stamp by one shot.
 * Stores that shot's contact time. No-op when unmarked or out of range.
 */
export function nudgeFos(
  state: RallyTimelineState,
  delta: -1 | 1
): RallyTimelineState {
  if (typeof state.fos !== 'number') return state
  const next = state.fos + delta
  if (next < 2 || next > fosUpperBound(state)) return state
  const contact = state.shots[next]?.contactTime ?? null
  return {
    ...state,
    fos: next,
    noFirstAttack: false,
    fosTimeSeconds: contact,
  }
}

/**
 * Mark (or un-mark) the last shot.
 *
 * Marking truncates shotCount and shots after the end index. The reply keeps
 * its standing when it is still before the end; standing is cleared on any
 * shot the allow-list no longer gives initiative to (e.g. a reply that has
 * become the end shot). Un-marking (tap the same end again) keeps all shots.
 */
export function markEnd(state: RallyTimelineState, at: number): RallyTimelineState {
  if (at < 1 || at > state.shotCount) return state

  if (state.end === at) {
    return { ...state, end: null, ending: null, missReason: null }
  }

  const invalidFos =
    at === 1 || (typeof state.fos === 'number' && state.fos > at)
  const fos = invalidFos ? null : state.fos
  const noFirstAttack = invalidFos ? false : state.noFirstAttack

  // Keep all contacts — End is a marker, not a truncate — so End can move forward later.
  const shots: ShotMap = { ...state.shots }
  for (let i = 1; i <= at; i++) {
    const shot = shots[i]
    if (!shot) continue
    const allow = derivePass1ShotTagAllowList(i, fos, at)
    if (shot.standing !== null && !allow.shot_initiative) {
      shots[i] = { ...shot, standing: null }
    }
  }

  return {
    ...state,
    shots,
    end: at,
    ending: null,
    missReason: null,
    fos,
    noFirstAttack,
    fosTimeSeconds: invalidFos ? null : state.fosTimeSeconds,
  }
}

export function toggleEnding(
  state: RallyTimelineState,
  value: PointEnding
): RallyTimelineState {
  const ending = state.ending === value ? null : value
  return {
    ...state,
    ending,
    // Miss reason only applies to error endings.
    missReason: isErrorEnding(ending) ? state.missReason : null,
  }
}

/** Toggle the miss reason (tap again clears). No-op unless ending is an error. */
export function toggleMissReason(
  state: RallyTimelineState,
  value: PointMissReason
): RallyTimelineState {
  if (!isErrorEnding(state.ending)) return state
  return {
    ...state,
    missReason: state.missReason === value ? null : value,
  }
}

/** Toggle review kind on a shot (tap again clears). */
export function toggleShotReviewKind(
  state: RallyTimelineState,
  n: number,
  value: ShotReviewKind
): RallyTimelineState {
  const shot = state.shots[n]
  if (!shot) return state
  return {
    ...state,
    shots: {
      ...state.shots,
      [n]: {
        ...shot,
        reviewKind: shot.reviewKind === value ? null : value,
      },
    },
  }
}

/**
 * Single Review flag (“tag to view”). On → technical by default so Work on
 * still groups; off → clears kind. Refine Technical/Tactical when the shot is selected.
 */
export function toggleShotReviewFlag(
  state: RallyTimelineState,
  n: number
): RallyTimelineState {
  const shot = state.shots[n]
  if (!shot) return state
  const on = shot.reviewKind !== null
  return {
    ...state,
    shots: {
      ...state.shots,
      [n]: {
        ...shot,
        reviewKind: on ? null : 'technical',
      },
    },
  }
}

/** First attack decided: marked on a shot, explicit no-attack, or serve-only point. */
export function isFosDecided(state: RallyTimelineState): boolean {
  if (state.end === 1) return true
  if (typeof state.fos === 'number') return true
  return state.noFirstAttack
}

/** Ready to save a tagged rally into the session list. */
export function canSaveRallyTimeline(
  state: RallyTimelineState,
  winnerName: string | null
): boolean {
  if (state.end === null) return false
  if (!state.ending) return false
  if (!isFosDecided(state)) return false
  return Boolean(winnerName)
}

/** Short hint for the sticky tool row when save is blocked. */
export function pass1SaveHint(state: RallyTimelineState): string | null {
  if (state.end === null) return 'Mark End point on the last shot'
  if (!isFosDecided(state)) return 'Mark First attack on a shot, or No attack'
  if (!state.ending) return 'Choose Winner / error on the end shot row'
  return null
}

export function summarizeRallyLine(
  state: RallyTimelineState,
  winnerName: string | null
): string {
  const parts = [
    describeEnd(state.end),
    describeFos(state),
    winnerName ? `${winnerName} wins` : null,
    state.ending ? describeEndingLabel(state.ending) : null,
    isErrorEnding(state.ending) ? describeMissReason(state.missReason) : null,
  ]
  return parts.filter(Boolean).join(' · ')
}

/** Map UI timeline shot tags into the DB mapper input shape. */
export function toPass1FocusMapperShot(shot: ShotTags) {
  return {
    wing: shot.wing,
    stroke: shot.stroke,
    standing: shot.standing,
    isHigh: shot.isHigh,
    isSafe: shot.isSafe,
    isPivot: shot.isPivot,
    reviewKind: shot.reviewKind,
    contactTime: shot.contactTime,
  }
}

/** Drop legacy miss reasons (e.g. tactical) that are no longer in the union. */
export function normalizeMissReason(
  value: string | null | undefined
): PointMissReason | null {
  if (!value) return null
  return MISS_REASON_OPTIONS.some((o) => o.value === value)
    ? (value as PointMissReason)
    : null
}
