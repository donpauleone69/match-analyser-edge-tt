/** Pure changes tagging makes to a match. Applied through the store's mutateMatch. */

import {
  matchSetsWon,
  setScoresDiffer,
  taggedScore,
  type MatchRecord,
  type SetData,
} from '@/data/demoStore'
import { otherSide, swapPlayers, type Draft, type MarkKind, type RallyData } from './rally'
import { firstContactG, insertIndex, lastContactG, segmentsOf, type Segment } from './timeline'

function inSet(m: MatchRecord, setId: number, fn: (s: SetData) => SetData): MatchRecord {
  return { ...m, sets: m.sets.map((s) => (s.setId === setId ? fn(s) : s)) }
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

export const finishMatch = (m: MatchRecord): MatchRecord => ({ ...m, tagDone: true })
export const reopenMatch = (m: MatchRecord): MatchRecord => ({ ...m, tagDone: false })

export const applyTaggedScore = (m: MatchRecord, setId: number) =>
  inSet(m, setId, (s) => ({ ...s, entered: scoreText(s) }))

export const applyTaggedScores = (m: MatchRecord): MatchRecord => ({
  ...m,
  sets: m.sets.map((s) => (setScoresDiffer(s) ? { ...s, entered: scoreText(s) } : s)),
})

export const applyTaggedResult = (m: MatchRecord): MatchRecord => ({
  ...m,
  result: matchSetsWon(m),
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
 * The stretch of video a rally added at `index` may use: from the last contact
 * of the rally before it to the first contact of the rally it goes in front of.
 * Null when either neighbour's video is gone, or there is no room between them.
 */
export function gapWindow(m: MatchRecord, setId: number, index: number): { a: number; b: number } | null {
  const s = m.sets.find((x) => x.setId === setId)
  if (!s) return null
  const segs = segmentsOf(m.videos)
  const prev = s.rallies[index - 1]
  const next = s.rallies[index]
  if (!next) return null
  const a = prev ? lastContactG(segs, prev) : earlierSetsEnd(m, setId)
  const b = firstContactG(segs, next)
  return a === null || b === null || b - a < MIN_GAP_S ? null : { a, b }
}

/** The first set after `setId` that can still be tagged. */
export function nextSetToTag(m: MatchRecord, setId: number): SetData | null {
  return m.sets.find((s) => s.setId > setId && !s.skipped && !s.finished) ?? null
}

/** The set the user is part way through, for one-press resume. */
export function setInProgress(m: MatchRecord): SetData | null {
  return m.sets.find((s) => !s.skipped && !s.finished && (s.rallies.length > 0 || s.draft)) ?? null
}
