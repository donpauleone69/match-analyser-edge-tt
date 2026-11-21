/** Pure changes tagging makes to a match. Applied through the store's mutateMatch. */

import {
  emptySet,
  resultSetCount,
  setScoresDiffer,
  taggedScore,
  type MatchRecord,
  type SetData,
  type SetMark,
} from '@/data/demoStore'
import { otherSide, pointRally, swapPlayers, type Draft, type MarkKind, type RallyData } from './rally'
import { addPoint, firstServerAt, isSetWon, scoreAtSetEnd, serverAt, setEndIndex, ZERO, type Points } from './score'
import { LONG_GAP_S, serveBands } from './continuity'
import { endedEarly, markBounds } from './setMark'
import { firstContactG, insertIndex, lastContactG, segmentsOf, toGlobal, type Segment } from './timeline'

/** A set number that is not listed yet (a skipped set 1, say) is added when it is first written. */
function inSet(m: MatchRecord, setId: number, fn: (s: SetData) => SetData): MatchRecord {
  const sets = m.sets.some((s) => s.setId === setId)
    ? m.sets
    : [...m.sets, emptySet(setId)].sort((a, b) => a.setId - b.setId)
  return { ...m, sets: sets.map((s) => (s.setId === setId ? fn(s) : s)) }
}

export const setDraft = (m: MatchRecord, setId: number, draft: Draft | null) =>
  inSet(m, setId, (s) => ({ ...s, draft }))

/**
 * Deleted rallies stay with their set, crossed out in the list, until the set
 * is finished. Kept beside the set's own fields so the score never counts them.
 */
type WithDeleted = SetData & { deleted?: RallyData[] }
export const deletedOf = (s: SetData): RallyData[] => (s as WithDeleted).deleted ?? []
const withDeleted = (s: SetData, deleted: RallyData[]): SetData => ({ ...s, deleted }) as WithDeleted

/** Puts a rally where it belongs in video order. No other rally is touched. */
function placed(segs: Segment[], rallies: RallyData[], rally: RallyData): RallyData[] {
  const g = firstContactG(segs, rally)
  const at = g === null ? rallies.length : insertIndex(segs, rallies, g)
  return [...rallies.slice(0, at), rally, ...rallies.slice(at)]
}

/** Save keeps the list in video order, so a rally tagged in a gap lands in the gap. */
export const saveRally = (m: MatchRecord, setId: number, rally: RallyData) =>
  inSet(m, setId, (s) => ({ ...s, rallies: placed(segmentsOf(m.videos), s.rallies, rally), draft: null }))

/** A point with no video goes in at `index`, between its neighbours. */
export const insertRallyAt = (m: MatchRecord, setId: number, rally: RallyData, index: number) =>
  inSet(m, setId, (s) => ({
    ...s,
    rallies: [...s.rallies.slice(0, index), rally, ...s.rallies.slice(index)],
  }))

export const replaceRally = (m: MatchRecord, setId: number, rally: RallyData) =>
  inSet(m, setId, (s) => ({
    ...s,
    rallies: s.rallies.map((r) => (r.id === rally.id ? rally : r)),
  }))

/** Delete takes the rally out of the score and keeps it for Restore. */
export const deleteRally = (m: MatchRecord, setId: number, rallyId: string) =>
  inSet(m, setId, (s) => {
    const index = s.rallies.findIndex((r) => r.id === rallyId)
    if (index < 0) return s
    return withDeleted(
      { ...s, rallies: s.rallies.filter((r) => r.id !== rallyId) },
      placed(segmentsOf(m.videos), deletedOf(s), s.rallies[index])
    )
  })

/** Restore puts a deleted rally back in its place in video order. */
export const restoreRally = (m: MatchRecord, setId: number, rallyId: string) =>
  inSet(m, setId, (s) => {
    const rally = deletedOf(s).find((r) => r.id === rallyId)
    if (!rally) return s
    return withDeleted(
      { ...s, rallies: placed(segmentsOf(m.videos), s.rallies, rally) },
      deletedOf(s).filter((r) => r.id !== rallyId)
    )
  })

/**
 * A press in Review serves. `swap` is the other player: server and winner flip.
 * Either press only checks this rally. No other rally is written.
 */
export const confirmServe = (m: MatchRecord, setId: number, rallyId: string, swap: boolean) =>
  inSet(m, setId, (s) => ({
    ...s,
    rallies: s.rallies.map((r) => {
      if (r.id !== rallyId) return r
      const next = swap ? swapPlayers(r) : r
      return { ...next, serveChecked: true }
    }),
  }))

/** Leave a continuity mark as it is. */
export const leaveMark = (m: MatchRecord, setId: number, rallyId: string, kind: MarkKind) =>
  inSet(m, setId, (s) => ({
    ...s,
    rallies: s.rallies.map((r) =>
      r.id === rallyId && !r.left?.includes(kind) ? { ...r, left: [...(r.left ?? []), kind] } : r
    ),
  }))

/** Puts a set back exactly as it was (undo). */
export const restoreSet = (m: MatchRecord, set: SetData) => inSet(m, set.setId, () => set)

export const flipFirstServer = (m: MatchRecord, setId: number) =>
  inSet(m, setId, (s) => ({ ...s, firstServer: otherSide(s.firstServer) }))

function scoreText(s: SetData) {
  const t = taggedScore(s)
  return t ? { me: String(t.me), them: String(t.them) } : s.entered
}

/**
 * Finishing never touches the entered score: that is only what the user typed
 * in Details, or took over with Use tagged score.
 */
export const finishSet = (m: MatchRecord, setId: number) =>
  inSet(m, setId, (s) => withDeleted({ ...s, finished: true, draft: null }, []))

export const reopenSet = (m: MatchRecord, setId: number): MatchRecord => ({
  ...inSet(m, setId, (s) => ({ ...s, finished: false })),
  tagDone: false,
})

export const applyTaggedScore = (m: MatchRecord, setId: number) =>
  inSet(m, setId, (s) => ({ ...s, entered: scoreText(s) }))

export const applyTaggedScores = (m: MatchRecord): MatchRecord => ({
  ...m,
  sets: m.sets.map((s) => (setScoresDiffer(s) ? { ...s, entered: scoreText(s) } : s)),
})

/**
 * Where the video is fenced and where a set resumes: the last contact of the
 * latest saved rally in this set or any earlier one. 0 when there is none.
 */
export function lastSavedGlobal(m: MatchRecord, setId: number): number {
  const segs = segmentsOf(m.videos)
  let latest = 0
  for (const s of m.sets) {
    if (s.setId > setId) continue
    for (const r of s.rallies) {
      const g = lastContactG(segs, r)
      if (g !== null && g > latest) latest = g
    }
  }
  return latest
}

/** Where sets before this one stop: nothing of this set is tagged before it. */
export function earlierSetsEnd(m: MatchRecord, setId: number): number {
  return setId > 1 ? lastSavedGlobal(m, setId - 1) : 0
}

/** Less video than this between two saved rallies cannot hold another rally. */
export const MIN_GAP_S = 1

/**
 * The stretch of video between two rallies: from the last contact of the one
 * before to the first contact of the one it sits in front of. The first gap
 * starts at the later of the mark start and the set before's end. Null only
 * when a neighbour's video is gone. A short stretch is still a stop. When the
 * times cross, the stop is a point on the next rally's first contact.
 */
export type GapWindow = { a: number; b: number; overlap: boolean }
export type EditRallyStop = { kind: 'rally'; id: string; n: number; index: number }
export type EditGapStop = {
  kind: 'gap'
  index: number
  n: number
  a: number
  b: number
  likely: boolean
  /** The two rallies' contact times cross. There is no stretch to play. */
  overlap: boolean
}

/** A rally can be inserted only when the stretch is at least a second and the times do not cross. */
export function gapFitsRally(w: GapWindow | null): boolean {
  return w !== null && !w.overlap && w.b - w.a >= MIN_GAP_S
}

/** Rallies and gaps Edit Set can stand on. Score-only points are not stops. */
export function editStops(m: MatchRecord, setId: number): { rallies: EditRallyStop[]; gaps: EditGapStop[] } {
  const s = m.sets.find((x) => x.setId === setId)
  if (!s) return { rallies: [], gaps: [] }
  const have = new Set(m.videos.map((v) => v.id))
  const rallies: EditRallyStop[] = []
  s.rallies.forEach((r, index) => {
    if (r.point || !have.has(r.videoId)) return
    rallies.push({ kind: 'rally', id: r.id, n: index + 1, index })
  })
  const breaks = new Set(serveBands(s.rallies, s.firstServer).map((b) => b.breaks[0]))
  const gaps: EditGapStop[] = []
  for (const stop of rallies) {
    const w = gapWindow(m, setId, stop.index)
    if (!w) continue
    gaps.push({
      kind: 'gap',
      index: stop.index,
      n: stop.n,
      a: w.a,
      b: w.b,
      overlap: w.overlap,
      likely: breaks.has(stop.index) || (!w.overlap && w.b - w.a >= LONG_GAP_S),
    })
  }
  return { rallies, gaps }
}

export function gapWindow(m: MatchRecord, setId: number, index: number): GapWindow | null {
  const s = m.sets.find((x) => x.setId === setId)
  if (!s) return null
  const segs = segmentsOf(m.videos)
  const next = s.rallies[index]
  if (!next) return null
  const prev = [...s.rallies.slice(0, index)].reverse().find((r) => !r.point)
  const mark = s.mark ? markBounds(m.videos, s.mark) : null
  const a = prev
    ? lastContactG(segs, prev)
    : Math.max(mark?.start ?? 0, earlierSetsEnd(m, setId))
  const b = firstContactG(segs, next)
  if (a === null || b === null) return null
  if (b > a) return { a, b, overlap: false }
  return { a: b, b, overlap: true }
}

/** The first set after `setId` that can still be tagged. */
export function nextSetToTag(m: MatchRecord, setId: number): SetData | null {
  return m.sets.find((s) => s.setId > setId && !s.skipped && !s.finished) ?? null
}

/** The set the user is part way through, for one-press resume. */
export function setInProgress(m: MatchRecord): SetData | null {
  return m.sets.find((s) => !s.skipped && !s.finished && (s.rallies.length > 0 || s.draft)) ?? null
}

/** Best of 7 is the most a match can have. */
export const MAX_SETS = 7

export function maxSetNumber(m: MatchRecord): number {
  return resultSetCount(m) ?? MAX_SETS
}

/** The set's floor: the last contact of its last saved rally. `fallback` before it has one. */
export function setFloorG(m: MatchRecord, s: SetData, fallback: number): number {
  const segs = segmentsOf(m.videos)
  let latest: number | null = null
  for (const r of s.rallies) {
    const g = lastContactG(segs, r)
    if (g !== null && (latest === null || g > latest)) latest = g
  }
  return latest ?? fallback
}

/** Where a new set starts on a video: after the last tagged rally on it, or at its beginning. */
export function videoStartPoint(m: MatchRecord, videoId: string): number {
  const segs = segmentsOf(m.videos)
  let at = toGlobal(segs, videoId, 0) ?? 0
  for (const s of m.sets) {
    for (const r of s.rallies) {
      if (r.videoId !== videoId) continue
      const g = lastContactG(segs, r)
      if (g !== null && g > at) at = g
    }
  }
  return at
}

/** Same video, pick up where tagging left off: the video of the latest saved rally. */
export function latestVideoId(m: MatchRecord): string | null {
  const segs = segmentsOf(m.videos)
  let best: { g: number; id: string } | null = null
  for (const s of m.sets) {
    for (const r of s.rallies) {
      const g = lastContactG(segs, r)
      if (g !== null && (!best || g > best.g)) best = { g, id: r.videoId }
    }
  }
  return best?.id ?? m.videos[0]?.id ?? null
}

/**
 * Set numbers a set starting at `at` may take: in the match, not tagged, not
 * marked not filmed, and in order along the videos with the tagged sets.
 */
export function allowedSetNumbers(m: MatchRecord, at: number, except?: number): number[] {
  const segs = segmentsOf(m.videos)
  const tagged = m.sets.filter((s) => s.setId !== except && s.rallies.length > 0)
  const out: number[] = []
  for (let n = 1; n <= maxSetNumber(m); n++) {
    const s = m.sets.find((x) => x.setId === n)
    if (s?.skipped || tagged.some((t) => t.setId === n)) continue
    const inOrder = tagged.every((t) => {
      const pos = firstContactG(segs, t.rallies[0])
      if (pos === null) return true
      return pos < at ? n > t.setId : n < t.setId
    })
    if (inOrder) out.push(n)
  }
  return out
}

/**
 * The first rally saves the set's start: who served first, worked back from
 * the server at the starting score, and the points before it as points with
 * no video, placed just before the rally.
 */
export function startSet(m: MatchRecord, setId: number, rally: RallyData, start: Points): MatchRecord {
  const firstServer = firstServerAt(rally.server, start)
  const at = Math.max(0, (rally.contacts[0] ?? rally.start) - 0.01)
  const winners = [
    ...Array.from({ length: start.me }, () => 'me' as const),
    ...Array.from({ length: start.them }, () => 'them' as const),
  ]
  let running = ZERO
  const points = winners.map((winner, i) => {
    const p = pointRally(`${rally.id}-p${i}`, rally.videoId, Math.round(at * 100) / 100, serverAt(firstServer, running), winner)
    running = addPoint(running, winner)
    return p
  })
  return inSet(m, setId, (s) => ({ ...s, firstServer, rallies: [...points, rally], draft: null }))
}

/** The set ends on its last rally: a winning score reached there and not before. */
export function endsOnLast(s: SetData): boolean {
  const i = setEndIndex(s.rallies.map((r) => r.winner))
  return i >= 0 && i === s.rallies.length - 1
}

/**
 * After an edit: a finished set that is neither won on its last rally nor
 * ended early is open again. A level score and an overrun both reopen.
 */
export function settleFinished(m: MatchRecord, setId: number): MatchRecord {
  const s = m.sets.find((x) => x.setId === setId)
  if (!s || !s.finished || endsOnLast(s) || endedEarly(s)) return m
  return { ...inSet(m, setId, (x) => ({ ...x, finished: false })), tagDone: false }
}

/** Rallies after the one that ended the set leave it. */
export const dropAfter = (m: MatchRecord, setId: number, index: number) =>
  inSet(m, setId, (s) => ({ ...s, rallies: s.rallies.slice(0, index + 1) }))

/** Delete set: its tagging goes. The entered score stays with the set number. */
export const clearSet = (m: MatchRecord, setId: number): MatchRecord => ({
  ...inSet(m, setId, (s) => withDeleted({ ...emptySet(setId), entered: s.entered }, [])),
  tagDone: false,
})

/**
 * The set's place on video. The label is the set number. A legacy not-filmed flag goes.
 * Moving the end later on a saved set that was not won opens it again.
 * Moving the start, or only the complete flag, leaves it saved. A won set stays saved.
 */
export function saveMark(m: MatchRecord, setId: number, mark: SetMark): MatchRecord {
  const before = m.sets.find((s) => s.setId === setId)
  const next = inSet(m, setId, (s) => {
    const segs = segmentsOf(m.videos)
    const was = s.mark ? toGlobal(segs, s.mark.to.videoId, s.mark.to.t) : null
    const now = toGlobal(segs, mark.to.videoId, mark.to.t)
    const later = was !== null && now !== null && now > was + 0.05
    const atEnd = scoreAtSetEnd(s.rallies.map((r) => r.winner))
    const won = atEnd !== null && isSetWon(atEnd)
    const reopen = s.finished && later && !won
    return { ...s, mark, skipped: false, ...(reopen ? { finished: false } : {}) }
  })
  if (before?.finished && next.sets.some((s) => s.setId === setId && !s.finished)) return { ...next, tagDone: false }
  return next
}

/**
 * Rallies go. A set that was being tagged comes back Ready: its mark was in
 * use, so it counts as complete. A mark that was never tagged is left as it is.
 */
export function deleteTags(m: MatchRecord, setId: number): MatchRecord {
  return {
    ...inSet(m, setId, (s) => ({
      ...s,
      rallies: [],
      draft: null,
      finished: false,
      mark: s.mark && s.rallies.length > 0 ? { ...s.mark, complete: true } : s.mark,
    })),
    tagDone: false,
  }
}

/** The mark goes. Only while the set has no rallies. */
export function unmarkSet(m: MatchRecord, setId: number): MatchRecord {
  const s = m.sets.find((x) => x.setId === setId)
  if (!s || s.rallies.length > 0) return m
  return inSet(m, setId, (x) => ({ ...x, mark: null }))
}

/** Change set number: the tagging moves. Each number keeps its entered score. */
export function moveSet(m: MatchRecord, from: number, to: number): MatchRecord {
  const src = m.sets.find((s) => s.setId === from)
  if (!src || from === to) return m
  const moved = inSet(m, to, (s) =>
    withDeleted(
      {
        ...s,
        skipped: false,
        firstServer: src.firstServer,
        finished: src.finished,
        rallies: src.rallies,
        draft: null,
        mark: src.mark,
      },
      deletedOf(src)
    )
  )
  return clearSet(moved, from)
}
