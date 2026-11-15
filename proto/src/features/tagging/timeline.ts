/**
 * A match's videos play end to end in list order. Positions are stored as a
 * video id plus seconds in that video, so reordering videos keeps every rally.
 * "Global" time below is seconds along the whole list.
 */

export type Segment = {
  id: string
  index: number
  offset: number
  duration: number
}

export function segmentsOf(videos: { id: string; durationS: number }[]): Segment[] {
  let offset = 0
  return videos.map((v, index) => {
    const seg = { id: v.id, index, offset, duration: v.durationS }
    offset += v.durationS
    return seg
  })
}

export function totalDuration(segs: Segment[]): number {
  const last = segs[segs.length - 1]
  return last ? last.offset + last.duration : 0
}

/** Null when the video is no longer in the list. */
export function toGlobal(segs: Segment[], videoId: string, t: number): number | null {
  const seg = segs.find((s) => s.id === videoId)
  return seg ? seg.offset + t : null
}

export function segmentAt(segs: Segment[], g: number): Segment | null {
  if (segs.length === 0) return null
  for (let i = segs.length - 1; i >= 0; i--) {
    if (g >= segs[i].offset) return segs[i]
  }
  return segs[0]
}

export function formatClock(seconds: number, tenths = false): string {
  // Whole tenths first, so 7.3 never reads as 7.2 through float error.
  const t = Math.floor(Math.max(0, seconds) * 10 + 1e-6)
  const m = Math.floor(t / 600)
  const whole = Math.floor((t % 600) / 10)
  const base = `${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}`
  return tenths ? `${base}.${t % 10}` : base
}
