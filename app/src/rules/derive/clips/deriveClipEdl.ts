/**
 * Edit decision list (EDL) for a clip playlist, and reel time mapping.
 * Pure — no React, no IO.
 *
 * - Consecutive clips from the same source video merge when they overlap or
 *   sit closer than `mergeGap`, so no footage plays twice.
 * - reelStart/reelEnd are the planned positions in an exported reel.
 * - After export, each segment may carry `measuredDuration` (read from the
 *   output). Stream-copy cuts start on the keyframe before the requested
 *   start, so the extra lead (measured − planned) shifts tags inside it.
 */

import type { Clip } from './deriveClips'

export interface EdlSegment {
  id: string
  /** `${matchId}#${setNumber}` — which source video */
  sourceKey: string
  matchId: string
  setNumber: number
  sourceStart: number
  sourceEnd: number
  clipIds: string[]
  reelStart: number
  reelEnd: number
  /** Duration of this segment in the exported file, when known */
  measuredDuration?: number
}

export interface Edl {
  segments: EdlSegment[]
  duration: number
}

export function clipSourceKey(clip: Pick<Clip, 'matchId' | 'setNumber'>): string {
  return `${clip.matchId}#${clip.setNumber}`
}

export function deriveClipEdl(clips: Clip[], mergeGap = 0.5): Edl {
  const merged: Omit<EdlSegment, 'id' | 'reelStart' | 'reelEnd'>[] = []
  for (const clip of clips) {
    const key = clipSourceKey(clip)
    const last = merged[merged.length - 1]
    if (last && last.sourceKey === key && clip.start <= last.sourceEnd + mergeGap && clip.end >= last.sourceStart) {
      last.sourceStart = Math.min(last.sourceStart, clip.start)
      last.sourceEnd = Math.max(last.sourceEnd, clip.end)
      last.clipIds.push(clip.id)
      continue
    }
    merged.push({
      sourceKey: key,
      matchId: clip.matchId,
      setNumber: clip.setNumber,
      sourceStart: clip.start,
      sourceEnd: clip.end,
      clipIds: [clip.id],
    })
  }

  let cursor = 0
  const segments: EdlSegment[] = merged.map((seg, i) => {
    const length = seg.sourceEnd - seg.sourceStart
    const out: EdlSegment = { ...seg, id: `seg_${i + 1}`, reelStart: cursor, reelEnd: cursor + length }
    cursor += length
    return out
  })
  return { segments, duration: cursor }
}

/**
 * Recompute reel positions from measured segment durations (after export).
 * Segments without a measurement keep their planned length.
 */
export function applyMeasuredDurations(edl: Edl, measured: (number | null)[]): Edl {
  let cursor = 0
  const segments = edl.segments.map((seg, i) => {
    const planned = seg.sourceEnd - seg.sourceStart
    const m = measured[i]
    const length = typeof m === 'number' && Number.isFinite(m) && m > 0 ? m : planned
    const out: EdlSegment = {
      ...seg,
      reelStart: cursor,
      reelEnd: cursor + length,
      ...(typeof m === 'number' && Number.isFinite(m) && m > 0 ? { measuredDuration: m } : {}),
    }
    cursor += length
    return out
  })
  return { segments, duration: cursor }
}

/** Source time → reel time, or null when that moment isn't in the reel. */
export function mapSourceToReel(edl: Edl, sourceKey: string, sourceTime: number): number | null {
  for (const seg of edl.segments) {
    if (seg.sourceKey !== sourceKey) continue
    if (sourceTime < seg.sourceStart || sourceTime > seg.sourceEnd) continue
    const planned = seg.sourceEnd - seg.sourceStart
    const extraLead = seg.measuredDuration ? Math.max(0, seg.measuredDuration - planned) : 0
    return Math.min(seg.reelEnd, seg.reelStart + extraLead + (sourceTime - seg.sourceStart))
  }
  return null
}

/** Reel time → which segment is playing (for showing the current clip). */
export function findSegmentAtReelTime(edl: Edl, reelTime: number): EdlSegment | null {
  return edl.segments.find((s) => reelTime >= s.reelStart && reelTime < s.reelEnd) ?? null
}
