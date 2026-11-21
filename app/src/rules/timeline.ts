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

type Placed = { videoId: string; contacts: number[]; start: number; end: number }

/** Where a saved rally's play starts on the match clock: its first contact, or its place for a point with no video. */
export function firstContactG(segs: Segment[], r: Placed): number | null {
  return toGlobal(segs, r.videoId, r.contacts[0] ?? r.start)
}

/** Where a saved rally's play ends on the match clock: its last contact. */
export function lastContactG(segs: Segment[], r: Placed): number | null {
  return toGlobal(segs, r.videoId, r.contacts[r.contacts.length - 1] ?? r.end)
}

/**
 * Where a rally starting at `g` goes in a list kept in video order: before
 * the first rally that starts later. Rallies on a removed video hold their place.
 */
export function insertIndex(segs: Segment[], rallies: Placed[], g: number): number {
  for (let i = 0; i < rallies.length; i++) {
    const at = firstContactG(segs, rallies[i])
    if (at !== null && at > g) return i
  }
  return rallies.length
}
