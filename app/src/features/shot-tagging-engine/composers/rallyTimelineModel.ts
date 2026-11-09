/**
 * Rally Timeline — pure state helpers (UI feel-test, in-memory)
 *
 * Behaviour contract: RALLY_TIMELINE_SPEC.md (handoff).
 * Shot rows 1–7 + optional 8+/Later. Phases driven by FOS marker.
 */

export type TimelineMode = 'Rally' | 'Shot' | 'Placement' | 'Mental'

export type ShotNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type FosMarker = ShotNumber | 'later' | null
export type EndMarker = ShotNumber | 'later' | null

/** Spec backing values for point ending */
export type PointEnding = 'winner' | 'error_net' | 'error_missed'

export type ServeSpin = 'Back' | 'Top'
export type Wing = 'BH' | 'FH'
export type BallLength = 'Short' | 'Half' | 'Long'
export type AttackStroke = 'Flick' | 'Loop' | 'Drive'
export type RallyStroke = 'Block' | 'Loop' | 'Drive'
export type ShotStrength = 'Weak' | 'Strong'
export type Placement = 'BH' | 'Middle' | 'FH'
export type Mental = 'Positive' | 'Negative'

export type RallyPhase = 'opening' | 'fos' | 'rally'

export interface ShotTags {
  spin: ServeSpin | null
  wing: Wing | null
  stroke: AttackStroke | RallyStroke | null
  length: BallLength | null
  strength: ShotStrength | null
  placement: Placement | null
  mental: Mental | null
}

export type ShotMap = Record<ShotNumber, ShotTags>

export interface RallyTimelineState {
  fos: FosMarker
  end: EndMarker
  ending: PointEnding | null
  /** Player display name when End=8+ (parity unknown) */
  laterWinner: string | null
  fosTimeSeconds: number | null
  shots: ShotMap
}

export const TIMELINE_MODES: TimelineMode[] = ['Rally', 'Shot', 'Placement', 'Mental']

export const PHASE_META: Record<
  RallyPhase,
  { name: string; stripe: string }
> = {
  opening: { name: 'OPENING', stripe: '#8399A9' },
  fos: { name: 'FIRST ATTACK', stripe: '#329985' },
  rally: { name: 'OPEN RALLY', stripe: '#9379AD' },
}

export const ENDING_OPTIONS: { value: PointEnding; label: string }[] = [
  { value: 'winner', label: 'Winner' },
  { value: 'error_net', label: 'Net' },
  { value: 'error_missed', label: 'Missed' },
]

function emptyShot(): ShotTags {
  return {
    spin: null,
    wing: null,
    stroke: null,
    length: null,
    strength: null,
    placement: null,
    mental: null,
  }
}

export function emptyShotMap(): ShotMap {
  return {
    1: emptyShot(),
    2: emptyShot(),
    3: emptyShot(),
    4: emptyShot(),
    5: emptyShot(),
    6: emptyShot(),
    7: emptyShot(),
  }
}

export function emptyRallyTimelineState(): RallyTimelineState {
  return {
    fos: null,
    end: null,
    ending: null,
    laterWinner: null,
    fosTimeSeconds: null,
    shots: emptyShotMap(),
  }
}

export function phaseAt(n: ShotNumber, fos: FosMarker): RallyPhase {
  if (n === 1) return 'opening'
  if (typeof fos !== 'number') return 'opening'
  if (n < fos) return 'opening'
  if (n === fos) return 'fos'
  return 'rally'
}

export function visibleShotNumbers(end: EndMarker): ShotNumber[] {
  const all: ShotNumber[] = [1, 2, 3, 4, 5, 6, 7]
  if (typeof end !== 'number') return all
  return all.filter((n) => n <= end)
}

export function showLaterRow(end: EndMarker): boolean {
  return end === null || end === 'later'
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
 * Exact End 1–7: winner from terminal hitter + winner vs error.
 * End later: use laterWinner (caller supplies).
 */
export function inferWinnerName(
  end: EndMarker,
  ending: PointEnding | null,
  players: [string, string],
  server: string,
  laterWinner: string | null
): string | null {
  if (end === 'later') return laterWinner
  if (typeof end !== 'number' || !ending) return null
  const hitter = playerForShot(end, players, server)
  if (ending === 'winner') return hitter
  // Error on terminal shot → other player wins
  return playerForShot(end + 1, players, server)
}

export function getShotSummary(n: ShotNumber, shot: ShotTags): string {
  const fields = [
    n === 1 ? 'Serve' : null,
    shot.spin,
    shot.wing,
    shot.stroke,
    shot.length,
    shot.strength,
    shot.placement,
    shot.mental,
  ]
  return fields.filter(Boolean).join(' · ') || '—'
}

export function describeFos(state: RallyTimelineState): string {
  if (typeof state.fos === 'number') return `FOS shot ${state.fos}`
  if (state.fos === 'later') return 'FOS after shot 7'
  if (state.end === null) return 'FOS unmarked'
  if (state.end === 'later') return 'No FOS tagged in first 7'
  return 'No FOS'
}

export function describeEnd(end: EndMarker): string {
  if (end === null) return 'Choose the last shot'
  if (end === 'later') return '8+ shots'
  return `${end} shot${end === 1 ? '' : 's'}`
}

export function describeEndingLabel(ending: PointEnding | null): string {
  if (!ending) return 'Select ending type'
  if (ending === 'winner') return 'Winner'
  if (ending === 'error_net') return 'Error — Net'
  return 'Error — Missed'
}

export type ShotChoiceKey = keyof ShotTags

/** Toggle mutually exclusive optional choice (tap again clears). */
export function toggleShotChoice(
  state: RallyTimelineState,
  n: ShotNumber,
  key: ShotChoiceKey,
  value: string
): RallyTimelineState {
  const shot = state.shots[n]
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

export function markFos(
  state: RallyTimelineState,
  at: Exclude<FosMarker, null>,
  videoTimeSeconds: number | null
): RallyTimelineState {
  if (state.end === 1) return state
  if (at === 'later' && typeof state.end === 'number') return state
  if (typeof at === 'number' && typeof state.end === 'number' && at > state.end) {
    return state
  }
  const next: FosMarker = state.fos === at ? null : at
  return {
    ...state,
    fos: next,
    fosTimeSeconds: next !== null ? videoTimeSeconds : null,
  }
}

export function markEnd(
  state: RallyTimelineState,
  at: Exclude<EndMarker, null>
): RallyTimelineState {
  const next: EndMarker = state.end === at ? null : at
  const invalidFos =
    next === 1 ||
    (typeof next === 'number' &&
      (state.fos === 'later' ||
        (typeof state.fos === 'number' && state.fos > next)))

  return {
    ...state,
    end: next,
    ending: null,
    laterWinner: null,
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

export function toggleLaterWinner(
  state: RallyTimelineState,
  name: string
): RallyTimelineState {
  return {
    ...state,
    laterWinner: state.laterWinner === name ? null : name,
  }
}

/** Ready to save a tagged rally into the session list. */
export function canSaveRallyTimeline(
  state: RallyTimelineState,
  winnerName: string | null
): boolean {
  if (state.end === null) return false
  if (!state.ending) return false
  if (state.end === 'later' && !state.laterWinner) return false
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
