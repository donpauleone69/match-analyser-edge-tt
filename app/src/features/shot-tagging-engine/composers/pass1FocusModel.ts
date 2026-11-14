/**
 * Pass 1 Focus tagger model.
 *
 * Contact taps + first-attack stamp + end/ending, then per-shot tags:
 * compulsory FA/End wing·stroke, plus optional-stage phase fields
 * (spin/depth/Ball High·Heavy, FA contact + Safe/Aggressive, later
 * wing/stroke/initiative) via `derivePass1ShotTagAllowList` (MA-77).
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
/** First attack strokes (Lob is defensive — not an opening attack). */
export type AttackStroke = 'Flick' | 'Loop' | 'Drive' | 'Smash'
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

/** Rally Focus optional — serve spin (UI labels). */
export type Spin = 'Under' | 'Top' | 'Side'
/** Rally Focus optional — serve / pre-offensive depth. */
export type Depth = 'Short' | 'Half' | 'Long'
/** Rally Focus optional — serve / pre-offensive placement. */
export type Placement = 'BH' | 'middle' | 'FH'
/** Rally Focus optional — first-attack table contact. */
export type TableContact = 'Over' | 'Off'
/** Rally Focus optional — first-attack quality. */
export type Quality = 'Good' | 'Normal' | 'Poor'

export type RallyPhase = 'opening' | 'ball' | 'fos' | 'reply' | 'next' | 'after'

export interface ShotTags {
  wing: Wing | null
  stroke: AttackStroke | ReplyStroke | EndStroke | null
  /** Higher than intended — ball before attack and/or RF serve/pre attrs. */
  isHigh: boolean
  /** Safe first attack — first attack only (exclusive with Aggressive). */
  isSafe: boolean
  /** Aggressive first attack — exclusive with Safe (MA-77; UI session + future persist). */
  isAggressive: boolean
  /** Crossed wing (FH from BH side / BH from FH side). */
  isPivot: boolean
  /** Flag for later review; technical also requires wing + stroke. */
  reviewKind: ShotReviewKind | null
  /** Reply / fos+1·+2 while continuing. */
  standing: Standing | null
  /** Video time of the contact tap (seconds), if captured */
  contactTime: number | null
  /** Phase optionals (MA-74/77) */
  spin: Spin | null
  depth: Depth | null
  placement: Placement | null
  tableContact: TableContact | null
  quality: Quality | null
  isWeak: boolean
  isHeavy: boolean
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
/** Attack / FA menu — Lob is defensive (MA-77). */
export const ATTACK_STROKE_OPTIONS: AttackStroke[] = [
  'Flick',
  'Loop',
  'Drive',
  'Smash',
]
/** Phone-first attack set (same curated attack strokes). */
export const ATTACK_STROKE_OPTIONS_COMPACT: AttackStroke[] = [
  'Flick',
  'Loop',
  'Drive',
  'Smash',
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
/** Phone reply set — drop Smash/Lob to reduce wrap density. */
export const REPLY_STROKE_OPTIONS_COMPACT: ReplyStroke[] = [
  'Block',
  'Push',
  'Chop',
  'Loop',
  'Drive',
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
/** Phone end-shot set — essentials + Lob (defensive). */
export const END_STROKE_OPTIONS_COMPACT: EndStroke[] = [
  'Flick',
  'Loop',
  'Drive',
  'Smash',
  'Block',
  'Push',
  'Lob',
]

/** End strokes that cannot be a first attack (MA-73/77 — Lob defensive). */
export const DEFENSIVE_END_STROKES: ReadonlySet<string> = new Set([
  'Push',
  'Block',
  'Chop',
  'Lob',
])

export function isDefensiveEndStroke(
  stroke: string | null | undefined
): boolean {
  return stroke != null && DEFENSIVE_END_STROKES.has(stroke)
}

export function isAttackEndStroke(stroke: string | null | undefined): boolean {
  return (
    stroke != null &&
    (ATTACK_STROKE_OPTIONS as readonly string[]).includes(stroke)
  )
}

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
    isAggressive: false,
    isPivot: false,
    reviewKind: null,
    standing: null,
    contactTime,
    spin: null,
    depth: null,
    placement: null,
    tableContact: null,
    quality: null,
    isWeak: false,
    isHeavy: false,
  }
}

export const SPIN_OPTIONS: Spin[] = ['Under', 'Top', 'Side']
export const DEPTH_OPTIONS: Depth[] = ['Short', 'Half', 'Long']
export const PLACEMENT_OPTIONS: Placement[] = ['BH', 'middle', 'FH']
export const TABLE_CONTACT_OPTIONS: { value: TableContact; label: string }[] = [
  { value: 'Over', label: 'Over table' },
  { value: 'Off', label: 'Off table' },
]
export const QUALITY_OPTIONS: Quality[] = ['Good', 'Normal', 'Poor']

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

/**
 * MA-71: loop from shot `n` through the end of the rally window
 * (not an isolated single-shot loop).
 */
export function shotToRallyEndLoopWindow(
  state: RallyTimelineState,
  n: number,
  rallyLoop: { startTime: number; endTime: number }
): { startTime: number; endTime: number } | null {
  const startWin = shotLoopWindow(state, n, rallyLoop)
  if (!startWin) return null
  const { endTime } = rallyLoop
  if (endTime <= startWin.startTime) return null
  return { startTime: startWin.startTime, endTime }
}

/**
 * End-reasoning loop: previous contact + end contact (through end of that window).
 * Serve-only End=1 → just the end/serve shot.
 */
export function endReasoningLoopWindow(
  state: RallyTimelineState,
  rallyLoop: { startTime: number; endTime: number }
): { startTime: number; endTime: number } | null {
  if (typeof state.end !== 'number') return null
  const end = state.end
  const startShot = end > 1 ? end - 1 : end
  const startWin = shotLoopWindow(state, startShot, rallyLoop)
  const endWin = shotLoopWindow(state, end, rallyLoop)
  if (!startWin || !endWin) return null
  if (endWin.endTime <= startWin.startTime) return null
  return { startTime: startWin.startTime, endTime: endWin.endTime }
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

export type PlayerSide = 'player1' | 'player2'

/** Input for colour-coded scrub marks (winner fill + server stripe). */
export interface RallyScrubMarkInput {
  rallyIndex: number
  serveTimestamp: number
  endTimestamp: number
  winnerId: PlayerSide
  serverId: PlayerSide
  winnerName?: string
  serverName?: string
  player1ScoreAfter?: number
  player2ScoreAfter?: number
}

export interface RallyScrubMark {
  id: string
  startTime: number
  endTime: number
  fillColor: string
  stripeColor: string
  title: string
  focused: boolean
  kind: 'rally' | 'draft'
  seekTime: number
}

const PLAYER_FILL: Record<PlayerSide, string> = {
  player1: 'var(--color-player-1)',
  player2: 'var(--color-player-2)',
}

const PLAYER_SOFT: Record<PlayerSide, string> = {
  player1: 'var(--color-player-1-bg)',
  player2: 'var(--color-player-2-bg)',
}

/**
 * Colour-coded rally marks for the shared video scrub.
 * Winner = fill; server = top stripe. Draft contact taps = short ticks.
 * Open (unsaved) rally = soft range with server stripe so form phase
 * stays continuous with the scrub after contacts finalize.
 */
export function deriveRallyScrubMarks(input: {
  completed: ReadonlyArray<RallyScrubMarkInput>
  focusedRallyIndex?: number | 'next'
  draftContactTimes?: ReadonlyArray<number>
  /** Unsaved open point (form phase) — soft range on scrub. */
  openDraft?: {
    serveTimestamp: number
    endTimestamp: number
    serverId: PlayerSide
  } | null
}): RallyScrubMark[] {
  const {
    completed,
    focusedRallyIndex = 'next',
    draftContactTimes = [],
    openDraft = null,
  } = input
  const marks: RallyScrubMark[] = []

  for (const rally of completed) {
    const start = Math.min(rally.serveTimestamp, rally.endTimestamp)
    const end = Math.max(rally.serveTimestamp, rally.endTimestamp)
    const score =
      typeof rally.player1ScoreAfter === 'number' &&
      typeof rally.player2ScoreAfter === 'number'
        ? ` · ${rally.player1ScoreAfter}–${rally.player2ScoreAfter}`
        : ''
    const winner = rally.winnerName ?? rally.winnerId
    const server = rally.serverName ?? rally.serverId
    marks.push({
      id: `rally-${rally.rallyIndex}`,
      startTime: start,
      endTime: end,
      fillColor: PLAYER_FILL[rally.winnerId],
      stripeColor: PLAYER_FILL[rally.serverId],
      title: `Point ${rally.rallyIndex}: ${winner} won${score} · ${server} served`,
      focused: focusedRallyIndex === rally.rallyIndex,
      kind: 'rally',
      seekTime: start,
    })
  }

  if (
    openDraft &&
    Number.isFinite(openDraft.serveTimestamp) &&
    Number.isFinite(openDraft.endTimestamp)
  ) {
    const start = Math.min(openDraft.serveTimestamp, openDraft.endTimestamp)
    const end = Math.max(openDraft.serveTimestamp, openDraft.endTimestamp)
    marks.push({
      id: 'open-draft-rally',
      startTime: start,
      endTime: end,
      fillColor: PLAYER_SOFT[openDraft.serverId],
      stripeColor: PLAYER_FILL[openDraft.serverId],
      title: 'Open point (unsaved)',
      focused: focusedRallyIndex === 'next',
      kind: 'draft',
      seekTime: start,
    })
  }

  draftContactTimes.forEach((t, i) => {
    if (typeof t !== 'number' || !Number.isFinite(t)) return
    marks.push({
      id: `draft-contact-${i}`,
      startTime: t,
      endTime: t,
      fillColor: 'rgba(255,255,255,0.85)',
      stripeColor: 'rgba(255,255,255,0.85)',
      title: i === 0 ? 'Serve contact (draft)' : `Contact ${i + 1} (draft)`,
      focused: false,
      kind: 'draft',
      seekTime: t,
    })
  })

  return marks
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
    shot.spin,
    shot.wing,
    shot.isPivot ? 'Pivot' : null,
    shot.stroke,
    shot.placement,
    shot.depth,
    shot.tableContact === 'Over'
      ? 'Over'
      : shot.tableContact === 'Off'
        ? 'Off'
        : null,
    shot.quality,
    shot.isWeak ? 'Weak' : null,
    shot.isHigh ? 'High' : null,
    shot.isHeavy ? 'Heavy' : null,
    shot.isSafe ? 'Safe' : null,
    shot.isAggressive ? 'Aggressive' : null,
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
export type ShotChoiceKey =
  | 'wing'
  | 'stroke'
  | 'standing'
  | 'spin'
  | 'depth'
  | 'placement'
  | 'tableContact'
  | 'quality'

export type ShotAttributeKey =
  | 'isHigh'
  | 'isSafe'
  | 'isAggressive'
  | 'isPivot'
  | 'isWeak'
  | 'isHeavy'

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

/**
 * Toggle an attribute switch (High / Pivot / Weak / Heavy).
 * Safe ↔ Aggressive are an exclusive pair (MA-77): selecting one clears the other;
 * re-tapping the active one clears both.
 */
export function toggleShotAttribute(
  state: RallyTimelineState,
  n: number,
  key: ShotAttributeKey
): RallyTimelineState {
  const shot = state.shots[n]
  if (!shot) return state
  if (key === 'isSafe') {
    const next = !shot.isSafe
    return {
      ...state,
      shots: {
        ...state.shots,
        [n]: { ...shot, isSafe: next, isAggressive: next ? false : shot.isAggressive },
      },
    }
  }
  if (key === 'isAggressive') {
    const next = !shot.isAggressive
    return {
      ...state,
      shots: {
        ...state.shots,
        [n]: { ...shot, isAggressive: next, isSafe: next ? false : shot.isSafe },
      },
    }
  }
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

/**
 * Clear FA / No-attack decision back to undecided (optional undo → select_fa).
 * Distinct from setFos(null), which toggles No attack.
 */
export function clearFosDecision(state: RallyTimelineState): RallyTimelineState {
  return { ...state, fos: null, noFirstAttack: false, fosTimeSeconds: null }
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
  // Align save with fa_details stage: FA wing+stroke required when FA marked.
  if (
    typeof state.fos === 'number' &&
    !state.noFirstAttack &&
    state.end !== 1 &&
    !isFaAttrsComplete(state)
  ) {
    return false
  }
  return Boolean(winnerName)
}

/**
 * MA-71 staged Pass 1 flow (explicit info-box sequence).
 *
 * contacts → end Result → end Wing/Stroke → select FA / No attack →
 * FA details → optional/save.
 * `Pass1FormPhase` kept as a coarse alias for older call sites.
 */
export type Pass1Stage =
  | 'contacts'
  | 'end_details'
  | 'end_shot'
  | 'select_fa'
  | 'fa_details'
  | 'optional'

/** @deprecated Prefer Pass1Stage — coarse end | fos | detail mapping. */
export type Pass1FormPhase = 'end' | 'fos' | 'detail'

/** Wing + stroke filled on the marked first-attack shot. */
export function isFaAttrsComplete(state: RallyTimelineState): boolean {
  if (typeof state.fos !== 'number') return false
  const shot = state.shots[state.fos]
  return Boolean(shot?.wing && shot?.stroke)
}

/**
 * End shot Result + Wing + Stroke (Paul MA-71).
 * Serve-only (`end === 1`): Result alone — Pass 1 allow-list has no wing/stroke on serve.
 */
export function isEndAttrsComplete(state: RallyTimelineState): boolean {
  if (typeof state.end !== 'number' || !state.ending) return false
  if (state.end === 1) return true
  const shot = state.shots[state.end]
  return Boolean(shot?.wing && shot?.stroke)
}

/**
 * MA-73: when End is shot 2 and End Wing/Stroke are complete, auto-decide FA
 * if still undecided:
 * - defensive end stroke (Push/Block/Chop) → No Attack
 * - attack end stroke → FA = 2 (End attrs already satisfy FA wing+stroke)
 *
 * Only applies while FOS is undecided — undo in optional stays sticky until
 * the user changes End attrs again.
 */
export function applyImpossibleFaAutoSkip(
  state: RallyTimelineState
): RallyTimelineState {
  if (state.end !== 2) return state
  if (!isEndAttrsComplete(state)) return state
  if (isFosDecided(state)) return state
  const stroke = state.shots[2]?.stroke ?? null
  if (isDefensiveEndStroke(stroke)) {
    return { ...state, fos: null, noFirstAttack: true, fosTimeSeconds: null }
  }
  if (isAttackEndStroke(stroke)) {
    const contact = state.shots[2]?.contactTime ?? null
    return {
      ...state,
      fos: 2,
      noFirstAttack: false,
      fosTimeSeconds: contact,
    }
  }
  return state
}

/** True while End stages lock selection to the End shot. */
export function isPass1EndLockedStage(stage: Pass1Stage): boolean {
  return stage === 'end_details' || stage === 'end_shot'
}

/**
 * Derive the current Pass 1 stage from timeline state.
 * Pass `hasContacts` false (or omit while still tapping) for the contacts stage.
 */
export function derivePass1Stage(
  state: RallyTimelineState,
  opts?: { hasContacts?: boolean; inForm?: boolean }
): Pass1Stage {
  const inForm = opts?.inForm ?? state.shotCount > 0
  const hasContacts = opts?.hasContacts ?? state.shotCount > 0
  if (!inForm || !hasContacts || state.shotCount <= 0) return 'contacts'
  if (state.end === null || !state.ending) return 'end_details'
  if (!isEndAttrsComplete(state)) return 'end_shot'
  if (!isFosDecided(state)) return 'select_fa'
  // No attack / serve-only → skip FA detail entry.
  if (state.noFirstAttack || state.end === 1) return 'optional'
  if (typeof state.fos === 'number' && !isFaAttrsComplete(state)) return 'fa_details'
  return 'optional'
}

/**
 * Info-box copy for the current stage (dialog below Rally rail).
 * Tone: amber (`pending`) while incomplete; green (`ready`) when can save.
 */
export function pass1StageInfo(
  stage: Pass1Stage,
  opts?: { canSave?: boolean }
): {
  text: string
  tone: 'pending' | 'ready'
} {
  const canSave = Boolean(opts?.canSave)
  switch (stage) {
    case 'contacts':
      return { text: 'Tap contacts · next End / FA', tone: 'pending' }
    case 'end_details':
      return { text: 'Result · winner / error / air on the end shot', tone: 'pending' }
    case 'end_shot':
      return { text: 'End · Wing and Stroke on the locked shot', tone: 'pending' }
    case 'select_fa':
      return {
        text: 'First attack · tap a shot, or No Attack',
        tone: 'pending',
      }
    case 'fa_details':
      return {
        text: 'FA · Wing and Stroke · tap FA caption to undo',
        tone: 'pending',
      }
    case 'optional':
      return {
        text: canSave
          ? 'Ready — tap Save · optional details anytime'
          : 'Optional · tap a shot on the rail for details',
        tone: canSave ? 'ready' : 'pending',
      }
  }
}

/** Coarse phase for loops / legacy: end → fos → detail. */
export function derivePass1FormPhase(state: RallyTimelineState): Pass1FormPhase {
  const stage = derivePass1Stage(state, { inForm: true, hasContacts: true })
  if (
    stage === 'end_details' ||
    stage === 'end_shot' ||
    stage === 'contacts'
  ) {
    return 'end'
  }
  if (stage === 'select_fa') return 'fos'
  return 'detail'
}

/** Short hint for the chrome status when save is blocked. */
export function pass1SaveHint(state: RallyTimelineState): string | null {
  if (state.end === null) return 'Mark End point on the last shot'
  if (!state.ending) return 'Choose Winner / error on the end shot row'
  if (!isEndAttrsComplete(state)) return 'Enter Wing and Stroke on the end shot'
  if (!isFosDecided(state)) return 'Select first attack on the rail, or No attack'
  if (
    typeof state.fos === 'number' &&
    !state.noFirstAttack &&
    state.end !== 1 &&
    !isFaAttrsComplete(state)
  ) {
    return 'Enter First attack Wing and Stroke'
  }
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
    isAggressive: shot.isAggressive,
    isPivot: shot.isPivot,
    reviewKind: shot.reviewKind,
    contactTime: shot.contactTime,
    spin: shot.spin,
    depth: shot.depth,
    placement: shot.placement,
    tableContact: shot.tableContact,
    quality: shot.quality,
    isWeak: shot.isWeak,
    isHeavy: shot.isHeavy,
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
