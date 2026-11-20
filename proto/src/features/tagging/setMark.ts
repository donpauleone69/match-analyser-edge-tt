import type { MatchRecord, SetData, SetMark, VideoAsset } from '@/data/demoStore'
import { isSetWon, scoreAtSetEnd } from '@/features/tagging/score'
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

export type MarkState = 'off' | 'ready' | 'tagging' | 'saved'

/**
 * Saved wins, then any rallies still open. A mark that is not complete is
 * ready, so an old part-filmed set can be tagged. Nothing on Tag sets complete.
 */
export function markState(s: SetData): MarkState {
  if (!s.mark) return 'off'
  if (s.finished) return 'saved'
  if (s.rallies.length > 0) return 'tagging'
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
 * A set that already has rallies gets a mark from just before the first
 * contact. A saved set ends just after the last. One still being tagged runs
 * to the end of its video, and the tagger asks to re-mark there.
 * Complete only when the set was saved.
 */
export function migrateSetMark(videos: VideoAsset[], s: SetData): SetData {
  if (s.mark || s.rallies.length === 0 || videos.length === 0) return s
  const segs = segmentsOf(videos)
  const startG = firstContactG(segs, s.rallies[0])
  const endG = lastContactG(segs, s.rallies[s.rallies.length - 1])
  if (startG === null || endG === null) return s
  const endSeg = segmentAt(segs, endG)
  const from = pointAt(segs, startG - MARK_PAD_S)
  // Stay on the last contact's video. The next video's 0 is the same clock
  // time, and would look like the set runs across.
  const to =
    !s.finished && endSeg
      ? { videoId: endSeg.id, t: endSeg.duration }
      : pointAt(segs, endG + MARK_PAD_S)
  if (!from || !to) return s
  return { ...s, mark: { from, to, complete: s.finished } }
}

export type VideoSpan = { setId: number; a: number; b: number }

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
    })
  }
  return out.sort((x, y) => x.a - y.a || x.setId - y.setId)
}

/**
 * Blank stretches long enough for another set. A few seconds is the slack
 * around a migrated mark, not a place to mark.
 */
const GAP_MIN_S = 8

export function gapsOf(duration: number, spans: VideoSpan[]): { a: number; b: number }[] {
  const gaps: { a: number; b: number }[] = []
  let cursor = 0
  for (const s of spans) {
    if (s.a > cursor + GAP_MIN_S) gaps.push({ a: cursor, b: s.a })
    cursor = Math.max(cursor, s.b)
  }
  if (duration > cursor + GAP_MIN_S) gaps.push({ a: cursor, b: duration })
  return gaps
}

/** A set is drawn on the video its mark starts on. */
export function setsStartingOn(sets: SetData[], videoId: string): SetData[] {
  return sets.filter((s) => s.mark?.from.videoId === videoId)
}

export type VideoStatusLine = 'Archived' | 'Tagging' | 'Ready to tag' | 'No sets yet' | 'Done'

/**
 * One line under a video's name. The first that fits, in this order.
 * Free time on a video does not stop it being Done.
 */
export function videoStatus(m: MatchRecord, videoId: string): VideoStatusLine {
  const video = m.videos.find((v) => v.id === videoId)
  if (video?.archived) return 'Archived'
  const onIt = new Set(spansOnVideo(m.videos, m.sets, videoId).map((span) => span.setId))
  const sets = m.sets.filter((s) => onIt.has(s.setId))
  if (sets.length === 0) return 'No sets yet'
  if (sets.some((s) => markState(s) === 'tagging')) return 'Tagging'
  if (sets.some((s) => markState(s) === 'ready')) return 'Ready to tag'
  return 'Done'
}

export function markCrosses(s: SetData): boolean {
  return Boolean(s.mark && s.mark.from.videoId !== s.mark.to.videoId)
}

/**
 * Finished, with rallies, and the tagged score is not a win. Derived.
 * A Details score is what makes it count. Continue reopens it.
 */
export function setIncomplete(s: SetData): boolean {
  if (!s.finished || s.rallies.length === 0) return false
  const atEnd = scoreAtSetEnd(s.rallies.map((r) => r.winner))
  return atEnd === null || !isSetWon(atEnd)
}

/** The one button on a set row. */
export function lineAction(s: SetData): 'Tag' | 'Continue' | 'Open' | null {
  if (setIncomplete(s)) return 'Continue'
  const state = markState(s)
  if (state === 'saved') return 'Open'
  if (state === 'tagging') return 'Continue'
  if (state === 'ready') return 'Tag'
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

/** How many sets the entered result lists. Null when no result is entered. */
function listedCount(m: MatchRecord): number | null {
  const { me, them } = m.result
  if (me === null || them === null) return null
  const total = me + them
  return total > 0 ? total : null
}

const MAX_MARKED_SETS = 7

/** Set numbers free at `at`: no mark, no tags, and still in time order. `except` is the set being renumbered. */
export function allowedMarkNumbers(m: MatchRecord, at: number, except?: number): number[] {
  const cap = listedCount(m) ?? MAX_MARKED_SETS
  const marked = m.sets.filter((s) => s.mark && s.setId !== except)
  const out: number[] = []
  for (let n = 1; n <= cap; n++) {
    const taken = m.sets.find((s) => s.setId === n && s.setId !== except)
    if (taken && (taken.mark || taken.rallies.length > 0 || taken.finished || taken.draft)) continue
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

/** A new set is at least this long, and a wing cannot come closer than this to the other. */
export const MIN_SET_S = 60

/** Add set runs this long, or to the next set, or the video end, whichever is first. */
const ADD_SET_S = 600

export type WingEdge = 'start' | 'end'

export type WingLimit = {
  lo: number
  hi: number
  below: string | null
  above: string | null
}

type WingBound = { at: number; hint: string }

/** A later bound wins when it is as tight, so a rally hint beats a video hint at the same time. */
function raise(current: WingBound, next: WingBound): WingBound {
  return next.at >= current.at - 0.001 ? next : current
}

function lower(current: WingBound, next: WingBound): WingBound {
  return next.at <= current.at + 0.001 ? next : current
}

function rallyEdges(m: MatchRecord, s: SetData): { first: number; last: number; firstN: number; lastN: number } | null {
  if (s.rallies.length === 0) return null
  const segs = segmentsOf(m.videos)
  let first = Infinity
  let last = -Infinity
  let firstN = 1
  let lastN = 1
  s.rallies.forEach((r, i) => {
    const a = firstContactG(segs, r)
    const z = lastContactG(segs, r)
    if (a !== null && a < first) {
      first = a
      firstN = i + 1
    }
    if (z !== null && z > last) {
      last = z
      lastN = i + 1
    }
  })
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null
  return { first, last, firstN, lastN }
}

/**
 * How far the start or end wing may move, in global seconds.
 * Stops at the video edge, the neighbour, a tagged set's first or last rally, and 60s from the other wing.
 */
export function wingLimits(m: MatchRecord, setId: number, edge: WingEdge): WingLimit | null {
  const s = m.sets.find((x) => x.setId === setId)
  if (!s?.mark) return null
  const bounds = markBounds(m.videos, s.mark)
  if (!bounds) return null
  const segs = segmentsOf(m.videos)
  const fromSeg = segs.find((seg) => seg.id === s.mark?.from.videoId)
  const toSeg = segs.find((seg) => seg.id === s.mark?.to.videoId)
  if (!fromSeg || !toSeg) return null

  const placed = m.sets
    .flatMap((other) => {
      if (!other.mark || other.setId === setId) return []
      const b = markBounds(m.videos, other.mark)
      return b ? [{ id: other.setId, start: b.start, end: b.end }] : []
    })
    .sort((a, b) => a.start - b.start)
  const before = [...placed].reverse().find((p) => p.end <= bounds.start + 0.05)
  const after = placed.find((p) => p.start >= bounds.end - 0.05)
  const rallies = rallyEdges(m, s)

  if (edge === 'start') {
    let lo: WingBound = { at: fromSeg.offset, hint: 'Stops at the video start' }
    if (before) lo = raise(lo, { at: before.end, hint: `Stops at set ${before.id}` })
    let hi: WingBound = { at: bounds.end - MIN_SET_S, hint: 'Stops at 1 minute' }
    hi = lower(hi, { at: fromSeg.offset + fromSeg.duration, hint: 'Stops at the video end' })
    if (rallies) hi = lower(hi, { at: rallies.first, hint: `Stops at rally ${rallies.firstN}` })
    if (hi.at < lo.at) return { lo: bounds.start, hi: bounds.start, below: lo.hint, above: hi.hint }
    return { lo: lo.at, hi: hi.at, below: lo.hint, above: hi.hint }
  }

  let lo: WingBound = { at: bounds.start + MIN_SET_S, hint: 'Stops at 1 minute' }
  lo = raise(lo, { at: toSeg.offset, hint: 'Stops at the video start' })
  if (rallies) lo = raise(lo, { at: rallies.last, hint: `Stops at rally ${rallies.lastN}` })
  let hi: WingBound = { at: toSeg.offset + toSeg.duration, hint: 'Stops at the video end' }
  if (after) hi = lower(hi, { at: after.start, hint: `Stops at set ${after.id}` })
  if (hi.at < lo.at) return { lo: bounds.end, hi: bounds.end, below: lo.hint, above: hi.hint }
  return { lo: lo.at, hi: hi.at, below: lo.hint, above: hi.hint }
}

/** Pulls a dragged time back inside the limit and says why, when it had to. */
export function clampWing(limit: WingLimit, asked: number): { at: number; hint: string | null } {
  if (asked < limit.lo - 0.05) return { at: limit.lo, hint: limit.below }
  if (asked > limit.hi + 0.05) return { at: limit.hi, hint: limit.above }
  const at = Math.min(limit.hi, Math.max(limit.lo, asked))
  // The bar stops at the video end, so the pointer can land on the stop without passing it.
  if (limit.above === 'Stops at the video end' && asked >= limit.hi - 1e-3) return { at: limit.hi, hint: limit.above }
  return { at, hint: null }
}

export type NewMark =
  | { ok: true; setId: number; mark: SetMark }
  | { ok: false; reason: string }

/**
 * A new mark on this video. `at` is seconds in the video when the player is sitting in free time.
 * `prefer` is the set number a Not on video row asked for.
 */
export function newMarkAt(m: MatchRecord, videoId: string, at: number | null, prefer?: number): NewMark {
  const video = m.videos.find((v) => v.id === videoId)
  if (!video) return { ok: false, reason: 'No set number is free here.' }
  const spans = spansOnVideo(m.videos, m.sets, videoId)
  const gaps = gapsOf(video.durationS, spans)
  if (gaps.length === 0) return { ok: false, reason: 'No room on this video.' }
  const room = (g: { a: number; b: number }, atIn: number | null) => {
    const start = atIn !== null && atIn >= g.a + 0.05 && atIn <= g.b - 0.05 ? atIn : g.a
    const end = Math.min(g.b, start + ADD_SET_S, video.durationS)
    return end - start >= MIN_SET_S - 0.05 ? { start, end } : null
  }
  const holding = at !== null ? gaps.find((g) => room(g, at)) : undefined
  const placed = (holding && room(holding, at)) || gaps.map((g) => room(g, null)).find((g) => g) || null
  if (!placed) return { ok: false, reason: 'No room on this video.' }
  const { start, end } = placed

  const segs = segmentsOf(m.videos)
  const startG = toGlobal(segs, videoId, start)
  if (startG === null) return { ok: false, reason: 'No set number is free here.' }
  const allowed = allowedMarkNumbers(m, startG)
  const setId = prefer !== undefined ? (allowed.includes(prefer) ? prefer : null) : (allowed[0] ?? null)
  if (setId === null) return { ok: false, reason: 'No set number is free here.' }

  const first = m.videos[0]
  const last = m.videos[m.videos.length - 1]
  const atStart = Boolean(first && videoId === first.id && start <= 0.05)
  const atEnd = Boolean(last && videoId === last.id && end >= video.durationS - 0.05)
  const round = (t: number) => Math.round(t * 100) / 100
  return {
    ok: true,
    setId,
    mark: {
      from: { videoId, t: round(start) },
      to: { videoId, t: round(end) },
      complete: !(atStart || atEnd),
    },
  }
}

function marksInOrder(videos: VideoAsset[], sets: SetData[]): boolean {
  const placed = sets.flatMap((s) => {
    if (!s.mark) return []
    const b = markBounds(videos, s.mark)
    return b ? [{ id: s.setId, g: b.start }] : []
  })
  placed.sort((a, b) => a.g - b.g || a.id - b.id)
  for (let i = 1; i < placed.length; i++) if (placed[i].id < placed[i - 1].id) return false
  return true
}

function spanBroken(videos: VideoAsset[], sets: SetData[]): boolean {
  return sets.some((s) => {
    if (!s.mark || s.mark.from.videoId === s.mark.to.videoId) return false
    const a = videos.findIndex((v) => v.id === s.mark?.from.videoId)
    const b = videos.findIndex((v) => v.id === s.mark?.to.videoId)
    return a < 0 || b !== a + 1
  })
}

/** A video a marked set runs onto from the one before, or off to the next. */
export function videoLocked(m: MatchRecord, videoId: string): boolean {
  return m.sets.some(
    (s) =>
      s.mark !== null &&
      s.mark.from.videoId !== s.mark.to.videoId &&
      (s.mark.from.videoId === videoId || s.mark.to.videoId === videoId)
  )
}

/** How far onto the next video a spanning end sits: that video's first set, or this long. */
const SPAN_ON_S = 120

/**
 * Where a mark that ends at the end of `videoId` would continue on the next video.
 * Null on the last video, or when the next video has no free time at the start.
 */
export function spanLanding(m: MatchRecord, videoId: string): { videoId: string; t: number; n: number } | null {
  const idx = m.videos.findIndex((v) => v.id === videoId)
  if (idx < 0 || idx >= m.videos.length - 1) return null
  const next = m.videos[idx + 1]
  const spans = spansOnVideo(m.videos, m.sets, next.id)
  const first = spans.length > 0 ? spans[0].a : next.durationS
  const t = Math.min(SPAN_ON_S, next.durationS, first)
  if (t < 0.05) return null
  return { videoId: next.id, t: Math.round(t * 100) / 100, n: idx + 2 }
}

/** The end wing is at the end of its video. The mark continues on the next one. */
export function spanOnto(m: MatchRecord, setId: number): SetMark | null {
  const s = m.sets.find((x) => x.setId === setId)
  if (!s?.mark || s.mark.from.videoId !== s.mark.to.videoId) return null
  const video = m.videos.find((v) => v.id === s.mark?.to.videoId)
  if (!video || s.mark.to.t < video.durationS - 0.15) return null
  const land = spanLanding(m, video.id)
  if (!land) return null
  const mark: SetMark = { ...s.mark, to: { videoId: land.videoId, t: land.t } }
  if (rallyOutside(m.videos, s.rallies, mark)) return null
  const b = markBounds(m.videos, mark)
  if (!b || markOverlaps(m.videos, m.sets, b.start, b.end, setId)) return null
  return mark
}

/** The end wing is back at 0:00 of the next video. The mark ends on the video before. */
export function spanBack(m: MatchRecord, setId: number): SetMark | null {
  const s = m.sets.find((x) => x.setId === setId)
  if (!s?.mark || s.mark.from.videoId === s.mark.to.videoId || s.mark.to.t > 0.15) return null
  const fromIdx = m.videos.findIndex((v) => v.id === s.mark?.from.videoId)
  const toIdx = m.videos.findIndex((v) => v.id === s.mark?.to.videoId)
  if (fromIdx < 0 || toIdx !== fromIdx + 1) return null
  const prev = m.videos[fromIdx]
  const mark: SetMark = { ...s.mark, to: { videoId: prev.id, t: prev.durationS } }
  if (rallyOutside(m.videos, s.rallies, mark)) return null
  const b = markBounds(m.videos, mark)
  if (!b || markOverlaps(m.videos, m.sets, b.start, b.end, setId)) return null
  return mark
}

/** Moving this video would put set numbers out of order, or pull a span apart. */
export function videoMoveBreaks(m: MatchRecord, videoId: string, by: -1 | 1): boolean {
  const from = m.videos.findIndex((v) => v.id === videoId)
  const to = from + by
  if (from < 0 || to < 0 || to >= m.videos.length) return true
  if (videoLocked(m, videoId) || videoLocked(m, m.videos[to].id)) return true
  const videos = [...m.videos]
  ;[videos[from], videos[to]] = [videos[to], videos[from]]
  return !marksInOrder(videos, m.sets) || spanBroken(videos, m.sets)
}
