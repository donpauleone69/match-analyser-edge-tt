/**
 * Rally Focus — copy of the Rally Timeline feel-test.
 *
 * Same contact tap and first-attack stamp. Row pills follow the coaching
 * phases: the ball before the attack, the attack, the reply, then the ending.
 */

export type TimelineMode = 'Rally' | 'Shot' | 'Placement' | 'Mental'

/** Spec backing values for point ending */
export type PointEnding = 'winner' | 'lucky' | 'error_net' | 'error_long'

export type ServeSpin = 'Under' | 'Top' | 'Side'
export type Wing = 'BH' | 'FH'
export type BallLength = 'Short' | 'Half' | 'Long'
export type AttackStroke = 'Flick' | 'Loop' | 'Drive' | 'Smash' | 'Lob'
export type RallyStroke = 'Block' | 'Loop' | 'Drive' | 'Smash' | 'Lob'
export type ShotStrength = 'Weak' | 'Strong' | 'High' | 'Heavy'
export type Placement = 'BH' | 'Middle' | 'FH'
export type Mental = 'Positive' | 'Negative'
/** Where the player who was attacked stands after their reply. */
export type Standing = 'behind' | 'level' | 'ahead'
/** Where the first attack met the ball, relative to the table. */
export type TableContact = 'Over' | 'Behind'

export type RallyPhase = 'opening' | 'ball' | 'fos' | 'reply' | 'next' | 'after'

export interface ShotTags {
  spin: ServeSpin | null
  wing: Wing | null
  stroke: AttackStroke | RallyStroke | null
  length: BallLength | null
  strength: ShotStrength | null
  placement: Placement | null
  mental: Mental | null
  /** The ball that was attacked (or could have been) sat up. */
  attackable: boolean
  /** Reply only, while the point is still going. */
  standing: Standing | null
  /** First attack only. Contact over the table, or behind it. */
  tableContact: TableContact | null
  /** Video time of the contact tap (seconds), if captured */
  contactTime: number | null
}

export type ShotMap = Record<number, ShotTags>

export interface RallyTimelineState {
  shotCount: number
  fos: number | null
  end: number | null
  ending: PointEnding | null
  fosTimeSeconds: number | null
  shots: ShotMap
}

export const TIMELINE_MODES: TimelineMode[] = ['Rally', 'Shot', 'Placement', 'Mental']

export const PHASE_META: Record<
  RallyPhase,
  { name: string; stripe: string }
> = {
  opening: { name: 'OPENING', stripe: '#8399A9' },
  ball: { name: 'THE BALL', stripe: '#ae823e' },
  fos: { name: 'FIRST ATTACK', stripe: '#329985' },
  reply: { name: 'REPLY', stripe: '#477eae' },
  next: { name: 'NEXT', stripe: '#6c879e' },
  after: { name: 'AFTER', stripe: '#9379AD' },
}

export const ENDING_OPTIONS: { value: PointEnding; label: string }[] = [
  { value: 'winner', label: 'Winner' },
  { value: 'lucky', label: 'Lucky' },
  { value: 'error_net', label: 'In-Net' },
  { value: 'error_long', label: 'Long' },
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
export const CONTACT_OVERLAY_SERVER = '#f0c674'
export const CONTACT_OVERLAY_RECEIVER = '#7eb8e8'

function emptyShot(contactTime: number | null = null): ShotTags {
  return {
    spin: null,
    wing: null,
    stroke: null,
    length: null,
    strength: null,
    placement: null,
    mental: null,
    attackable: false,
    standing: null,
    tableContact: null,
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
    end: null,
    ending: null,
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
    end: shotCount > 0 ? shotCount : null,
    ending: null,
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
  if (state.fos === null && typeof state.end === 'number' && state.end > 1) {
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

export function getShotSummary(n: number, shot: ShotTags): string {
  const fields = [
    n === 1 ? 'Serve' : null,
    shot.spin,
    shot.wing,
    shot.stroke,
    shot.length,
    shot.strength,
    shot.tableContact,
    shot.attackable ? 'Weak' : null,
    shot.standing === 'behind' ? 'Behind' : shot.standing === 'level' ? 'Level' : shot.standing === 'ahead' ? 'Ahead' : null,
    shot.placement,
    shot.mental,
    formatContactTime(shot.contactTime),
  ]
  return fields.filter(Boolean).join(' · ') || '—'
}

export function describeFos(state: RallyTimelineState): string {
  if (typeof state.fos === 'number') return `FOS shot ${state.fos}`
  if (state.end === null) return 'FOS unmarked'
  return 'No FOS'
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
  return 'Error — Long'
}

/** Attribute keys that toggle via pills (not contactTime or the attackable flag). */
export type ShotChoiceKey = Exclude<keyof ShotTags, 'contactTime' | 'attackable'>

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

export function toggleAttackable(
  state: RallyTimelineState,
  n: number
): RallyTimelineState {
  const shot = state.shots[n]
  if (!shot) return state
  return {
    ...state,
    shots: {
      ...state.shots,
      [n]: { ...shot, attackable: !shot.attackable },
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
  const next = state.fos === at ? null : at
  return {
    ...state,
    fos: next,
    fosTimeSeconds: next !== null ? videoTimeSeconds : null,
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
  return {
    ...state,
    fos: next,
    fosTimeSeconds: state.shots[next]?.contactTime ?? null,
  }
}

export function markEnd(state: RallyTimelineState, at: number): RallyTimelineState {
  if (at < 1 || at > state.shotCount) return state
  const next = state.end === at ? null : at
  const invalidFos =
    next === 1 ||
    (typeof next === 'number' && typeof state.fos === 'number' && state.fos > next)

  return {
    ...state,
    end: next,
    ending: null,
    fos: invalidFos ? null : state.fos,
    fosTimeSeconds: invalidFos ? null : state.fosTimeSeconds,
  }
}

export function toggleEnding(
  state: RallyTimelineState,
  value: PointEnding
): RallyTimelineState {
  return {
    ...state,
    ending: state.ending === value ? null : value,
  }
}

/** Ready to save a tagged rally into the session list. */
export function canSaveRallyTimeline(
  state: RallyTimelineState,
  winnerName: string | null
): boolean {
  if (state.end === null) return false
  if (!state.ending) return false
  return Boolean(winnerName)
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
  ]
  return parts.filter(Boolean).join(' · ')
}
