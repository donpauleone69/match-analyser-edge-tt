/**
 * Continuity check (pure). Real matches have mistakes, and so does tagging.
 * Nothing here changes a rally: the set is walked in video order and marked
 * where it does not add up. The user decides what to do at each mark.
 *
 * Serve order review (the rule for Review serves) is at the bottom of this file.
 */

import { otherSide, type MarkKind, type RallyData, type Side } from './rally'
import { ZERO, addPoint, isSetWon, type Points } from './score'
import { firstContactG, lastContactG, type Segment } from './timeline'

/** A gap this long between two rallies of one video could hold a rally. */
export const LONG_GAP_S = 9

type Served = Pick<RallyData, 'server' | 'winner'>

export type ServeStep = {
  /** Who should serve this rally, going by what was tagged before it. */
  expected: Side
  /** First or second serve of the server's turn. */
  turn: 1 | 2
  /** The score before this rally. */
  before: Points
}

const deuce = (p: Points) => p.me >= 10 && p.them >= 10

/**
 * The serve order, following what was tagged rather than the score. The set
 * opens with its first server. After that: the same server again if that was
 * the first serve of their turn, otherwise the other player; one each from
 * 10 - 10. A rally served by someone else starts a new turn for them.
 */
export function walkServes(rallies: Served[], firstServer: Side): { steps: ServeStep[]; next: Side; score: Points } {
  const steps: ServeStep[] = []
  let expected = firstServer
  let score = ZERO
  let prev: { server: Side; turn: 1 | 2 } | null = null
  for (const r of rallies) {
    const turn: 1 | 2 =
      prev && r.server === expected && r.server === prev.server && prev.turn === 1 && !deuce(score) ? 2 : 1
    steps.push({ expected, turn, before: score })
    score = addPoint(score, r.winner)
    prev = { server: r.server, turn }
    expected = deuce(score) || turn === 2 ? otherSide(r.server) : r.server
  }
  return { steps, next: expected, score }
}

/** Who is expected to serve a rally put in at `index`, or the next one when `index` is the length. */
export function expectedServer(rallies: Served[], firstServer: Side, index = rallies.length): Side {
  return walkServes(rallies.slice(0, index), firstServer).next
}

export type RallyMark =
  | { kind: 'serve'; rallyId: string; index: number; served: Side; expected: Side }
  | { kind: 'gap'; rallyId: string; index: number; seconds: number }

/**
 * Serve order: a rally is marked when its server is not the one expected.
 * After it the walk follows the new server, so one break gives one mark,
 * not a mark on every rally that follows.
 */
export function serveMarks(rallies: RallyData[], firstServer: Side): RallyMark[] {
  const { steps } = walkServes(rallies, firstServer)
  return rallies.flatMap<RallyMark>((r, index) =>
    r.server === steps[index].expected
      ? []
      : [{ kind: 'serve', rallyId: r.id, index, served: r.server, expected: steps[index].expected }]
  )
}

/** Seconds of video between the last contact of one rally and the first of the next, same video only. */
export function gapBefore(segs: Segment[], rallies: RallyData[], index: number): number | null {
  const prev = rallies[index - 1]
  const r = rallies[index]
  if (!prev || !r || prev.videoId !== r.videoId) return null
  const a = lastContactG(segs, prev)
  const b = firstContactG(segs, r)
  return a === null || b === null ? null : b - a
}

/** Long gaps: marked on the rally after the gap. A point with no video is not a gap's edge. */
export function gapMarks(segs: Segment[], rallies: RallyData[], longGap = LONG_GAP_S): RallyMark[] {
  return rallies.flatMap<RallyMark>((r, index) => {
    const prev = rallies[index - 1]
    if (!prev || r.point || prev.point) return []
    const seconds = gapBefore(segs, rallies, index)
    return seconds !== null && seconds >= longGap ? [{ kind: 'gap', rallyId: r.id, index, seconds }] : []
  })
}

export type ScoreMark = {
  /** `past`: more points tagged for a side than the entered score has. `differs`: the set is over on another score. */
  kind: 'past' | 'differs'
  tagged: Points
  entered: Points
}

/** The tagged score against the set score entered in Details. Null while they can still agree. */
export function scoreMark(tagged: Points, entered: Points | null, over: boolean): ScoreMark | null {
  if (!entered) return null
  if (tagged.me === entered.me && tagged.them === entered.them) return null
  if (tagged.me > entered.me || tagged.them > entered.them) return { kind: 'past', tagged, entered }
  return over || isSetWon(tagged) ? { kind: 'differs', tagged, entered } : null
}

export type Continuity = {
  /** Marks the user has not chosen to leave, in video order. Gap hints are in here too. */
  marks: RallyMark[]
  /** One band per serve break. This is what the Rallies button counts. */
  bands: ServeBand[]
  score: ScoreMark | null
  /** Who is expected to serve the next rally at the live end. */
  next: Side
  /** Serve bands only. A long gap is a hint and is not counted. */
  checkCount: number
}

const wasLeft = (r: RallyData, kind: MarkKind) => Boolean(r.left?.includes(kind))

export function checkSet(
  rallies: RallyData[],
  firstServer: Side,
  segs: Segment[],
  entered: Points | null,
  finished: boolean
): Continuity {
  const walk = walkServes(rallies, firstServer)
  const marks = [...serveMarks(rallies, firstServer), ...gapMarks(segs, rallies)]
    .filter((m) => !wasLeft(rallies[m.index], m.kind))
    .sort((a, b) => a.index - b.index || (a.kind === 'serve' ? -1 : 1))
  const bands = serveBands(rallies, firstServer)
  return { marks, bands, score: scoreMark(walk.score, entered, finished), next: walk.next, checkCount: bands.length }
}

/**
 * Serve order review.
 *
 * The walk (`walkServes`) is unchanged: it follows the server each rally was
 * tagged with. A break is a rally whose server is not the one due. Leaving a
 * serve mark takes that rally out of the breaks. Add, delete and restore do
 * not come through here, and nothing in this file writes another rally.
 *
 * Known good, before a review starts:
 *   - the start of the set (there is no rally before rally 1)
 *   - a rally whose server was checked (Switch, or either press in Review serves)
 *   - a rally whose serve mark was left
 *
 * The stretch of a break runs from the rally after the last known good one
 * before it, up to and including the break. The list shows that stretch as
 * one band. No single rally is named as the cause.
 *
 * Review serves shows the break first, then steps back one rally at a time.
 * After every press, in this order, it stops when:
 *   1. no break is left
 *   2. the last two rallies shown both fit the order
 *   3. the next rally back was known good before this review, or the rally
 *      just shown is rally 1
 * A known good rally is not shown. The break is shown even if it was already
 * known good. Presses during this review do not count as known good for rule 3.
 *
 * Same as tagged: the checked flag only. The other player: that rally's server
 * and winner swap, and it is checked. No other rally is written.
 *
 * If a break is left, it sits just after the only serve of a turn. The missing
 * rally is in the gap before that serve or the gap after it.
 */

/** How much of the serve Review serves plays: 1s before the contact, 0.5s after. */
export const SERVE_REVIEW_BEFORE_S = 1
export const SERVE_REVIEW_AFTER_S = 0.5
/** Check gaps and the two gaps at the end of a review play at this rate. */
export const GAP_REVIEW_RATE = 2

export type ServeRally = Pick<RallyData, 'id' | 'server' | 'winner'> & {
  serveChecked?: boolean
  left?: MarkKind[]
}

/** The server was chosen or confirmed, or the serve mark was left. */
export function isKnownGood(r: { serveChecked?: boolean; left?: MarkKind[] }): boolean {
  return r.serveChecked === true || Boolean(r.left?.includes('serve'))
}

const serveLeft = (r: { left?: MarkKind[] }) => Boolean(r.left?.includes('serve'))

/** Breaks in video order. A left serve mark is not a break. */
export function breakIndexes(rallies: Array<Served & { left?: MarkKind[] }>, firstServer: Side): number[] {
  const { steps } = walkServes(rallies, firstServer)
  return rallies.flatMap((r, index) =>
    serveLeft(r) || r.server === steps[index].expected ? [] : [index]
  )
}

export type ServeBand = {
  /** First rally of the stretch, inclusive. */
  from: number
  /** The break, inclusive. */
  to: number
  breakId: string
}

/** One band per break. `checkCount` is this list's length, never the gap hints. */
export function serveBands(rallies: Array<ServeRally>, firstServer: Side): ServeBand[] {
  return breakIndexes(rallies, firstServer).map((to) => {
    let from = 0
    for (let i = to - 1; i >= 0; i--) {
      if (isKnownGood(rallies[i])) {
        from = i + 1
        break
      }
    }
    return { from, to, breakId: rallies[to].id }
  })
}

export function bandLine(band: ServeBand): string {
  const start = band.from + 1
  const end = band.to + 1
  return start === end
    ? `Serve order changed at rally ${start}`
    : `Serve order out between rally ${start} and rally ${end}`
}

export type StopReason = 'no-break' | 'two-fit' | 'known-good' | 'set-start'
export type ReviewPress = 'same' | 'other'

export type ReviewState<T extends ServeRally = ServeRally> = {
  rallies: T[]
  firstServer: Side
  /** Rallies shown, in the order shown. */
  shown: number[]
  /** Known good when the review opened. Presses in this review are not added. */
  knownBefore: number[]
  /** Rally on screen. Null once the questions have stopped. */
  cursor: number | null
  stopped: StopReason | null
  /**
   * When a break remains: the gap before the lone serve, then the gap after it.
   * Play these longer first (`longerFirst`).
   */
  gaps: number[]
}

const copyRally = <T extends ServeRally>(r: T): T => ({ ...r, left: r.left ? [...r.left] : r.left })

export function openReview<T extends ServeRally>(
  rallies: T[],
  firstServer: Side,
  breakIndex: number
): ReviewState<T> {
  return {
    rallies: rallies.map(copyRally),
    firstServer,
    shown: [],
    knownBefore: rallies.flatMap((r, index) => (isKnownGood(r) ? [index] : [])),
    cursor: breakIndex,
    stopped: null,
    gaps: [],
  }
}

/**
 * The two gaps around the lone serve the break sits after.
 * Index is the gap in front of that rally. Before rally 1 the index is 0.
 */
export function gapPair(rallies: Served[], firstServer: Side, breakIndex: number): number[] {
  const { steps } = walkServes(rallies, firstServer)
  const prev = breakIndex - 1
  if (prev >= 0 && steps[prev].turn === 1) return [prev, breakIndex]
  return [breakIndex]
}

/** Longer gap first. A gap with no measured length sorts last. Equal lengths keep video order. */
export function longerFirst(gaps: number[], seconds: (index: number) => number | null): number[] {
  return [...gaps].sort((a, b) => (seconds(b) ?? -1) - (seconds(a) ?? -1) || a - b)
}

/** One press in Review serves. Same writes the checked flag. Other also swaps that rally. */
export function pressReview<T extends ServeRally>(state: ReviewState<T>, press: ReviewPress): ReviewState<T> {
  if (state.cursor === null || state.stopped) return state
  const cursor = state.cursor
  const rallies = state.rallies.map(copyRally)
  const current = rallies[cursor]
  rallies[cursor] = {
    ...current,
    server: press === 'other' ? otherSide(current.server) : current.server,
    winner: press === 'other' ? otherSide(current.winner) : current.winner,
    serveChecked: true,
  }
  const shown = [...state.shown, cursor]
  const breaks = breakIndexes(rallies, state.firstServer)
  let stopped: StopReason | null = null
  if (breaks.length === 0) stopped = 'no-break'
  else if (shown.length >= 2 && shown.slice(-2).every((index) => !breaks.includes(index))) stopped = 'two-fit'
  else if (cursor === 0) stopped = 'set-start'
  else if (state.knownBefore.includes(cursor - 1)) stopped = 'known-good'

  return {
    ...state,
    rallies,
    shown,
    cursor: stopped ? null : cursor - 1,
    stopped,
    gaps: stopped && breaks.length > 0 ? gapPair(rallies, state.firstServer, breaks[0]) : [],
  }
}
