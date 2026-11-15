/**
 * Continuity check (pure). Real matches have mistakes, and so does tagging.
 * Nothing here changes a rally: the set is walked in video order and marked
 * where it does not add up. The user decides what to do at each mark.
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
  /** Marks the user has not chosen to leave, in video order. */
  marks: RallyMark[]
  score: ScoreMark | null
  /** Who is expected to serve the next rally at the live end. */
  next: Side
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
  return { marks, score: scoreMark(walk.score, entered, finished), next: walk.next }
}
