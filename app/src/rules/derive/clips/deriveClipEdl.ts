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

/**
 * Reel/file time → source-video seconds using the segment map.
 * Tags stay in source time; this only translates a trimmed/exported clock.
 */
export function mapReelToSource(edl: Edl, reelTime: number): { sourceKey: string; sourceTime: number } | null {
  const seg = findSegmentAtReelTime(edl, reelTime)
  if (!seg) return null
  const planned = seg.sourceEnd - seg.sourceStart
  const extraLead = seg.measuredDuration ? Math.max(0, seg.measuredDuration - planned) : 0
  const intoSeg = Math.max(0, reelTime - seg.reelStart - extraLead)
  return {
    sourceKey: seg.sourceKey,
    sourceTime: seg.sourceStart + intoSeg,
  }
}

/**
 * One contiguous trim of a source: file time 0…(end-start) maps back to sourceStart…sourceEnd.
 * Shot/rally tags are not rewritten — callers keep storing source seconds.
 */
export function deriveTrimMapping(input: {
  matchId: string
  setNumber: number
  sourceStart: number
  sourceEnd: number
}): Edl {
  const sourceStart = Math.max(0, input.sourceStart)
  const sourceEnd = Math.max(sourceStart, input.sourceEnd)
  const length = sourceEnd - sourceStart
  const sourceKey = `${input.matchId}#${input.setNumber}`
  return {
    duration: length,
    segments: [
      {
        id: 'seg_trim_1',
        sourceKey,
        matchId: input.matchId,
        setNumber: input.setNumber,
        sourceStart,
        sourceEnd,
        clipIds: [],
        reelStart: 0,
        reelEnd: length,
      },
    ],
  }
}

/** Prove a contact's source timestamp still names the same ball after a leading trim. */
export function contactSourceAfterTrim(args: {
  contactSourceTime: number
  trimStart: number
  trimEnd: number
  matchId: string
  setNumber: number
}): { sourceTime: number; fileTime: number | null } {
  const edl = deriveTrimMapping({
    matchId: args.matchId,
    setNumber: args.setNumber,
    sourceStart: args.trimStart,
    sourceEnd: args.trimEnd,
  })
  const fileTime = mapSourceToReel(edl, `${args.matchId}#${args.setNumber}`, args.contactSourceTime)
  const back = fileTime == null ? null : mapReelToSource(edl, fileTime)
  return {
    sourceTime: args.contactSourceTime,
    fileTime: back && Math.abs(back.sourceTime - args.contactSourceTime) < 1e-6 ? fileTime : null,
  }
}
