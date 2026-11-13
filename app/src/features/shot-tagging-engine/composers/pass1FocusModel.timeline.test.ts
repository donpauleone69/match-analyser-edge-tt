import { describe, it, expect } from 'vitest'
import {
  RALLY_TIMELINE_MIN_WINDOW_SECONDS,
  RALLY_TIMELINE_PAD_SECONDS,
  canSaveRallyTimeline,
  isFosDecided,
  markEnd,
  markFos,
  pass1SaveHint,
  railSlotCount,
  railSlotKind,
  rallyTimelineViewWindow,
  setFos,
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

describe('first attack mandatory (MA-35)', () => {
  it('treats fos null as undecided until noFirstAttack or a shot mark', () => {
    // timelineFromContacts pre-marks End at N
    const base = timelineFromContacts([1, 2, 3, 4])
    expect(base.end).toBe(4)
    expect(base.noFirstAttack).toBe(false)
    expect(isFosDecided(base)).toBe(false)
    expect(canSaveRallyTimeline(base, 'Ada')).toBe(false)
    expect(pass1SaveHint(base)).toMatch(/First attack|No attack/)

    const marked = markFos(base, 3, 3)
    expect(marked.fos).toBe(3)
    expect(marked.noFirstAttack).toBe(false)
    expect(isFosDecided(marked)).toBe(true)

    const cleared = markFos(marked, 3, 3)
    expect(cleared.fos).toBeNull()
    expect(cleared.noFirstAttack).toBe(false)
    expect(isFosDecided(cleared)).toBe(false)

    const none = setFos(cleared, null)
    expect(none.fos).toBeNull()
    expect(none.noFirstAttack).toBe(true)
    expect(isFosDecided(none)).toBe(true)

    const withEnding = { ...none, ending: 'winner' as const }
    expect(canSaveRallyTimeline(withEnding, 'Ada')).toBe(true)
    expect(pass1SaveHint(withEnding)).toBeNull()
  })

  it('serve-only end does not require first attack', () => {
    const serve = timelineFromContacts([1])
    expect(serve.end).toBe(1)
    expect(isFosDecided(serve)).toBe(true)
    const ready = { ...serve, ending: 'error_long' as const }
    expect(canSaveRallyTimeline(ready, 'Ada')).toBe(true)
  })

  it('toggling No attack returns to undecided', () => {
    const base = timelineFromContacts([1, 2, 3])
    const none = setFos(base, null)
    expect(none.noFirstAttack).toBe(true)
    const again = setFos(none, null)
    expect(again.noFirstAttack).toBe(false)
    expect(isFosDecided(again)).toBe(false)
  })
})
