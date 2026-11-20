import type { MatchRecord, SetData, SetMark, VideoAsset } from '@/data/demoStore'
import {
  firstContactG,
  lastContactG,
  segmentAt,
  segmentsOf,
  toGlobal,
  totalDuration,
  type Segment,
} from '@/features/tagging/timeline'

/** Old rallies grow a mark this far past the first and last contact. New marks have none. */
export const MARK_PAD_S = 5

export type MarkState = 'off' | 'part' | 'ready' | 'tagging' | 'saved'

/**
 * Saved wins, then any rallies still open. Part filmed is a mark that is not
 * complete and has nothing tagged, so it cannot be tagged.
 */
export function markState(s: SetData): MarkState {
  if (!s.mark) return 'off'
  if (s.finished) return 'saved'
  if (s.rallies.length > 0) return 'tagging'
  if (!s.mark.complete) return 'part'
  return 'ready'
}

/** A clock time as a video id and seconds in that video, clamped to the list. */
export function pointAt(segs: Segment[], g: number): { videoId: string; t: number } | null {
  if (segs.length === 0) return null
  const total = totalDuration(segs)
  const clamped = Math.min(total, Math.max(0, g))
  const seg = segmentAt(segs, Math.min(clamped, Math.max(0, total - 1e-6)))
  if (!seg) return null
  const t = clamped >= total ? seg.duration : Math.min(seg.duration, Math.max(0, clamped - seg.offset))
  return { videoId: seg.id, t }
}

/**
 * A set that already has rallies gets a mark from the first contact to the
 * last, 5 s each side. Complete only when the set was saved.
 */
export function migrateSetMark(videos: VideoAsset[], s: SetData): SetData {
  if (s.mark || s.rallies.length === 0 || videos.length === 0) return s
  const segs = segmentsOf(videos)
  const startG = firstContactG(segs, s.rallies[0])
  const endG = lastContactG(segs, s.rallies[s.rallies.length - 1])
  if (startG === null || endG === null) return s
  const from = pointAt(segs, startG - MARK_PAD_S)
  const to = pointAt(segs, endG + MARK_PAD_S)
  if (!from || !to) return s
  return { ...s, mark: { from, to, complete: s.finished } }
}

export type VideoSpan = { setId: number; a: number; b: number; part: boolean }

/** The part of each mark that sits on this video, in time order. */
export function spansOnVideo(videos: VideoAsset[], sets: SetData[], videoId: string): VideoSpan[] {
  const segs = segmentsOf(videos)
  const seg = segs.find((s) => s.id === videoId)
  if (!seg) return []
  const out: VideoSpan[] = []
  for (const s of sets) {
    if (!s.mark) continue
    const g0 = toGlobal(segs, s.mark.from.videoId, s.mark.from.t)
    const g1 = toGlobal(segs, s.mark.to.videoId, s.mark.to.t)
    if (g0 === null || g1 === null) continue
    const lo = Math.min(g0, g1)
    const hi = Math.max(g0, g1)
    const a = Math.max(seg.offset, lo)
    const b = Math.min(seg.offset + seg.duration, hi)
    if (b - a < 0.05) continue
    out.push({
      setId: s.setId,
      a: a - seg.offset,
      b: b - seg.offset,
      part: markState(s) === 'part',
    })
  }
  return out.sort((x, y) => x.a - y.a || x.setId - y.setId)
}

/** Blank stretches on a video, where another set could be marked. */
export function gapsOf(duration: number, spans: VideoSpan[]): { a: number; b: number }[] {
  const gaps: { a: number; b: number }[] = []
  let cursor = 0
  for (const s of spans) {
    if (s.a > cursor + 0.05) gaps.push({ a: cursor, b: s.a })
    cursor = Math.max(cursor, s.b)
  }
  if (duration > cursor + 0.05) gaps.push({ a: cursor, b: duration })
  return gaps
}

export function setsRemain(m: MatchRecord): boolean {
  return m.sets.some((s) => markState(s) !== 'saved')
}

/** A set is drawn on the video its mark starts on. */
export function setsStartingOn(sets: SetData[], videoId: string): SetData[] {
  return sets.filter((s) => s.mark?.from.videoId === videoId)
}

export function markCrosses(s: SetData): boolean {
  return Boolean(s.mark && s.mark.from.videoId !== s.mark.to.videoId)
}

/**
 * Listed by the result or by a Details score, and not marked.
 * A spare set with nothing entered stays off this list.
 */
function listedCount(m: MatchRecord): number | null {
  const { me, them } = m.result
  if (me === null || them === null) return null
  const total = me + them
  return total > 0 ? total : null
}

export function notOnVideo(m: MatchRecord, s: SetData): boolean {
  if (s.mark) return false
  if (s.entered.me !== '' || s.entered.them !== '') return true
  const n = listedCount(m)
  return n !== null && s.setId <= n
}

export type TagLead =
  | { kind: 'continue' | 'tag'; setId: number; label: string }
  | { kind: 'mark'; label: string }

/** One lead: the set under way, else the first ready set, else marking. */
export function tagLead(m: MatchRecord): TagLead | null {
  const tagging = m.sets.find((s) => markState(s) === 'tagging')
  if (tagging) return { kind: 'continue', setId: tagging.setId, label: `Continue set ${tagging.setId}` }
  const ready = m.sets.find((s) => markState(s) === 'ready')
  if (ready) return { kind: 'tag', setId: ready.setId, label: `Tag set ${ready.setId}` }
  const gap = m.videos.some((v) => gapsOf(v.durationS, spansOnVideo(m.videos, m.sets, v.id)).length > 0)
  if (setsRemain(m) && gap) return { kind: 'mark', label: 'Mark sets' }
  return null
}

export function lineAction(s: SetData): 'Mark' | 'Tag' | 'Continue' | 'Open' | null {
  const state = markState(s)
  if (state === 'saved') return 'Open'
  if (state === 'tagging') return 'Continue'
  if (state === 'ready') return 'Tag'
  if (state === 'part') return 'Mark'
  return null
}

/** The mark on the match clock. Null when a video it names is gone. */
export function markBounds(videos: VideoAsset[], mark: SetMark): { start: number; end: number } | null {
  const segs = segmentsOf(videos)
  const a = toGlobal(segs, mark.from.videoId, mark.from.t)
  const b = toGlobal(segs, mark.to.videoId, mark.to.t)
  if (a === null || b === null) return null
  return { start: Math.min(a, b), end: Math.max(a, b) }
}

/** True when the range shares time with another set's mark. Touching at an edge is fine. */
export function markOverlaps(
  videos: VideoAsset[],
  sets: SetData[],
  start: number,
  end: number,
  except?: number
): boolean {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  return sets.some((s) => {
    if (!s.mark || s.setId === except) return false
    const b = markBounds(videos, s.mark)
    if (!b) return false
    return lo < b.end - 0.05 && hi > b.start + 0.05
  })
}

const MAX_MARKED_SETS = 7

/** Set numbers free at `at` on the match clock: in the match, not marked, and in order. */
export function allowedMarkNumbers(m: MatchRecord, at: number, except?: number): number[] {
  const cap = listedCount(m) ?? MAX_MARKED_SETS
  const marked = m.sets.filter((s) => s.mark && s.setId !== except)
  const out: number[] = []
  for (let n = 1; n <= cap; n++) {
    if (marked.some((s) => s.setId === n)) continue
    const inOrder = marked.every((t) => {
      const b = t.mark ? markBounds(m.videos, t.mark) : null
      if (!b) return true
      return b.start <= at ? n > t.setId : n < t.setId
    })
    if (inOrder) out.push(n)
  }
  return out
}

/** The first rally that would fall outside a new mark, if any. */
export function rallyOutside(
  videos: VideoAsset[],
  rallies: SetData['rallies'],
  mark: SetMark
): { n: number; side: 'before' | 'after' } | null {
  const b = markBounds(videos, mark)
  if (!b) return null
  const segs = segmentsOf(videos)
  for (let i = 0; i < rallies.length; i++) {
    const a = firstContactG(segs, rallies[i])
    const z = lastContactG(segs, rallies[i])
    if (a === null || z === null) continue
    if (a < b.start - 0.05) return { n: i + 1, side: 'before' }
    if (z > b.end + 0.05) return { n: i + 1, side: 'after' }
  }
  return null
}

/** The first video that still has unmarked time. */
export function firstGapVideo(m: MatchRecord): VideoAsset | null {
  return m.videos.find((v) => gapsOf(v.durationS, spansOnVideo(m.videos, m.sets, v.id)).length > 0) ?? null
}
