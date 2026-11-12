import { describe, it, expect } from 'vitest'
import {
  RALLY_TIMELINE_MIN_WINDOW_SECONDS,
  RALLY_TIMELINE_PAD_SECONDS,
  rallyTimelineViewWindow,
} from './pass1FocusModel'

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
