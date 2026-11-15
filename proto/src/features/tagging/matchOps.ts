/** Pure changes tagging makes to a match. Applied through the store's mutateMatch. */

import {
  matchSetsWon,
  setScoresDiffer,
  taggedScore,
  type MatchRecord,
  type SetData,
} from '@/data/demoStore'
import { otherSide, type Draft, type RallyData } from './rally'
import { segmentsOf, toGlobal } from './timeline'

function inSet(m: MatchRecord, setId: number, fn: (s: SetData) => SetData): MatchRecord {
  return { ...m, sets: m.sets.map((s) => (s.setId === setId ? fn(s) : s)) }
}

export const setDraft = (m: MatchRecord, setId: number, draft: Draft | null) =>
  inSet(m, setId, (s) => ({ ...s, draft }))

export const saveRally = (m: MatchRecord, setId: number, rally: RallyData) =>
  inSet(m, setId, (s) => ({ ...s, rallies: [...s.rallies, rally], draft: null }))

export const replaceRally = (m: MatchRecord, setId: number, rally: RallyData) =>
  inSet(m, setId, (s) => ({
    ...s,
    rallies: s.rallies.map((r) => (r.id === rally.id ? rally : r)),
  }))

export const deleteRally = (m: MatchRecord, setId: number, rallyId: string) =>
  inSet(m, setId, (s) => ({ ...s, rallies: s.rallies.filter((r) => r.id !== rallyId) }))

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
  inSet(m, setId, (s) => ({ ...s, finished: true, draft: null }))

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
      const g = toGlobal(segs, r.videoId, r.contacts[r.contacts.length - 1])
      if (g !== null && g > latest) latest = g
    }
  }
  return latest
}

/** The first set after `setId` that can still be tagged. */
export function nextSetToTag(m: MatchRecord, setId: number): SetData | null {
  return m.sets.find((s) => s.setId > setId && !s.skipped && !s.finished) ?? null
}

/** The set the user is part way through, for one-press resume. */
export function setInProgress(m: MatchRecord): SetData | null {
  return m.sets.find((s) => !s.skipped && !s.finished && (s.rallies.length > 0 || s.draft)) ?? null
}
