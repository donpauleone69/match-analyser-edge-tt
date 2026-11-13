import { describe, it, expect } from 'vitest'
import {
  CONTACT_LATENCY_BUFFER_SECONDS,
  MIN_SHOT_LOOP_SECONDS,
  captureContactTime,
  endReasoningLoopWindow,
  loopWindowFromContacts,
  shotLoopWindow,
  timelineFromContacts,
} from './pass1FocusModel'

const contacts = [10, 11, 12.5, 13.4]
const timeline = timelineFromContacts(contacts)
const rallyLoop = loopWindowFromContacts(10, 13.4, 100) // [9, 14.4]

describe('captureContactTime', () => {
  it('subtracts the 0.3s latency buffer from the tap clock', () => {
    expect(CONTACT_LATENCY_BUFFER_SECONDS).toBe(0.3)
    expect(captureContactTime(10.5)).toBeCloseTo(10.2)
  })

  it('never stores before the floor (0, prior contact, or last rally end)', () => {
    expect(captureContactTime(0.1)).toBe(0)
    expect(captureContactTime(50.1, 50)).toBe(50)
    expect(captureContactTime(11.0, 10.8)).toBeCloseTo(10.8)
  })
})

describe('shotLoopWindow', () => {
  it('uses stored contact times as-is (no second latency subtract)', () => {
    const w = shotLoopWindow(timeline, 2, rallyLoop)!
    expect(w.startTime).toBeCloseTo(11)
    expect(w.endTime).toBeCloseTo(12.5)
  })

  it('serve window starts at the stored serve contact (inside the rally pad)', () => {
    const w = shotLoopWindow(timeline, 1, rallyLoop)!
    expect(w.startTime).toBeCloseTo(10)
    expect(w.endTime).toBeCloseTo(11)
  })

  it('final shot ends at the whole-rally loop end', () => {
    const w = shotLoopWindow(timeline, 4, rallyLoop)!
    expect(w.startTime).toBeCloseTo(13.4)
    expect(w.endTime).toBeCloseTo(rallyLoop.endTime)
  })

  it('clamps inside the rally loop', () => {
    const t = timelineFromContacts([0.1, 0.25])
    const loop = loopWindowFromContacts(0.1, 0.25, 0.4) // [0, 0.4]
    const first = shotLoopWindow(t, 1, loop)!
    expect(first.startTime).toBeCloseTo(0.1)
    const last = shotLoopWindow(t, 2, loop)!
    expect(last.endTime).toBeCloseTo(0.4)
  })

  it('keeps a minimum window when contacts are near-identical', () => {
    const t = timelineFromContacts([5, 5.02, 6])
    const loop = loopWindowFromContacts(5, 6, 100)
    const w = shotLoopWindow(t, 1, loop)!
    expect(w.endTime - w.startTime).toBeCloseTo(MIN_SHOT_LOOP_SECONDS)
  })

  it('returns null for a shot without a contact time', () => {
    expect(shotLoopWindow(timeline, 9, rallyLoop)).toBeNull()
  })

  it('a shot past End still ends at its next contact', () => {
    const ended = { ...timeline, end: 2 }
    const w = shotLoopWindow(ended, 2, rallyLoop)!
    expect(w.endTime).toBeCloseTo(12.5)
  })
})

describe('endReasoningLoopWindow', () => {
  it('spans previous contact through end shot window', () => {
    const w = endReasoningLoopWindow(timeline, rallyLoop)!
    // End = 4; previous = 3 → start at 12.5, end at rally loop end
    expect(w.startTime).toBeCloseTo(12.5)
    expect(w.endTime).toBeCloseTo(rallyLoop.endTime)
  })

  it('serve-only End loops just the serve/end shot', () => {
    const t = timelineFromContacts([10])
    const loop = loopWindowFromContacts(10, 10, 100)
    const w = endReasoningLoopWindow(t, loop)!
    expect(w.startTime).toBeCloseTo(10)
    expect(w.endTime).toBeCloseTo(loop.endTime)
  })
})
