import { describe, it, expect } from 'vitest'
import {
  RALLY_TIMELINE_MIN_WINDOW_SECONDS,
  RALLY_TIMELINE_PAD_SECONDS,
  markEnd,
  railSlotCount,
  railSlotKind,
  rallyTimelineViewWindow,
  timelineFromContacts,
} from './pass1FocusModel'

describe('railSlotCount / railSlotKind', () => {
  it('is at least 10 and keeps two spare slots past contacts', () => {
    expect(railSlotCount(0)).toBe(10)
    expect(railSlotCount(3)).toBe(10)
    expect(railSlotCount(9)).toBe(11)
    expect(railSlotCount(12)).toBe(14)
  })

  it('classifies in-play, after-end, and unused slots', () => {
    expect(railSlotKind(1, 4, null)).toBe('in_play')
    expect(railSlotKind(4, 4, null)).toBe('in_play')
    expect(railSlotKind(5, 4, null)).toBe('unused')
    expect(railSlotKind(2, 4, 2)).toBe('in_play')
    expect(railSlotKind(3, 4, 2)).toBe('after_end')
    expect(railSlotKind(5, 4, 2)).toBe('unused')
  })
})

describe('markEnd', () => {
  it('keeps contacts so End can move forward later', () => {
    const base = timelineFromContacts([1, 2, 3, 4, 5, 6])
    const ended = markEnd(base, 3)
    expect(ended.end).toBe(3)
    expect(ended.shotCount).toBe(6)
    expect(ended.shots[5]?.contactTime).toBe(5)
    const forward = markEnd(ended, 5)
    expect(forward.end).toBe(5)
    expect(forward.shotCount).toBe(6)
  })
})

describe('rallyTimelineViewWindow', () => {
  it('starts empty around a minimum window', () => {
    expect(
      rallyTimelineViewWindow({
        duration: 900,
        liveTime: 0,
        completed: [],
      })
    ).toEqual({ viewStart: 0, viewEnd: RALLY_TIMELINE_MIN_WINDOW_SECONDS })
  })

  it('fits tagged rallies with pad and drops unused lead-in', () => {
    const win = rallyTimelineViewWindow({
      duration: 900,
      liveTime: 222,
      completed: [
        { serveTimestamp: 136, endTimestamp: 140 },
        { serveTimestamp: 210, endTimestamp: 222 },
      ],
    })
    expect(win.viewStart).toBe(136 - RALLY_TIMELINE_PAD_SECONDS)
    expect(win.viewEnd).toBe(222 + RALLY_TIMELINE_PAD_SECONDS)
  })

  it('expands short clusters to the minimum window', () => {
    const win = rallyTimelineViewWindow({
      duration: 900,
      liveTime: 20,
      completed: [{ serveTimestamp: 10, endTimestamp: 12 }],
    })
    expect(win.viewEnd - win.viewStart).toBe(RALLY_TIMELINE_MIN_WINDOW_SECONDS)
    expect(win.viewStart).toBeLessThanOrEqual(10)
    expect(win.viewEnd).toBeGreaterThanOrEqual(12)
  })

  it('never exceeds the real duration', () => {
    const win = rallyTimelineViewWindow({
      duration: 230,
      liveTime: 220,
      completed: [{ serveTimestamp: 200, endTimestamp: 220 }],
    })
    expect(win.viewStart).toBeGreaterThanOrEqual(0)
    expect(win.viewEnd).toBe(230)
  })
})
