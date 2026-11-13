import { describe, it, expect } from 'vitest'
import {
  RALLY_TIMELINE_MIN_WINDOW_SECONDS,
  RALLY_TIMELINE_PAD_SECONDS,
  canSaveRallyTimeline,
  derivePass1Stage,
  isFaAttrsComplete,
  isFosDecided,
  markEnd,
  markFos,
  pass1SaveHint,
  pass1StageInfo,
  railSlotCount,
  railSlotKind,
  rallyTimelineViewWindow,
  setFos,
  toggleShotChoice,
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

describe('first attack mandatory (MA-35 / MA-68 / MA-70)', () => {
  it('treats fos null as undecided until noFirstAttack or a shot mark', () => {
    // timelineFromContacts pre-marks End at N
    const base = timelineFromContacts([1, 2, 3, 4])
    expect(base.end).toBe(4)
    expect(base.noFirstAttack).toBe(false)
    expect(isFosDecided(base)).toBe(false)
    expect(canSaveRallyTimeline(base, 'Ada')).toBe(false)
    // End phase first: Result before FA (MA-68 / MA-70 sequencing)
    expect(pass1SaveHint(base)).toMatch(/Winner|error|end shot/i)
    expect(derivePass1Stage(base)).toBe('end_details')

    const withEndingOnly = { ...base, ending: 'winner' as const }
    expect(canSaveRallyTimeline(withEndingOnly, 'Ada')).toBe(false)
    expect(pass1SaveHint(withEndingOnly)).toMatch(/first attack|No attack/i)
    expect(derivePass1Stage(withEndingOnly)).toBe('select_fa')
    expect(pass1StageInfo('select_fa').text).toBe('Select first attack')

    const marked = markFos(withEndingOnly, 3, 3)
    expect(marked.fos).toBe(3)
    expect(marked.noFirstAttack).toBe(false)
    expect(isFosDecided(marked)).toBe(true)
    expect(canSaveRallyTimeline(marked, 'Ada')).toBe(true)
    // FA chosen but wing/stroke missing → FA details (rail may paint FA now)
    expect(derivePass1Stage(marked)).toBe('fa_details')
    expect(isFaAttrsComplete(marked)).toBe(false)

    const withFaAttrs = toggleShotChoice(
      toggleShotChoice(marked, 3, 'wing', 'FH'),
      3,
      'stroke',
      'Loop'
    )
    expect(isFaAttrsComplete(withFaAttrs)).toBe(true)
    expect(derivePass1Stage(withFaAttrs)).toBe('optional')
    expect(pass1StageInfo('optional').tone).toBe('ready')

    const cleared = markFos(marked, 3, 3)
    expect(cleared.fos).toBeNull()
    expect(cleared.noFirstAttack).toBe(false)
    expect(isFosDecided(cleared)).toBe(false)
    expect(derivePass1Stage(cleared)).toBe('select_fa')

    const none = setFos(cleared, null)
    expect(none.fos).toBeNull()
    expect(none.noFirstAttack).toBe(true)
    expect(isFosDecided(none)).toBe(true)
    // No attack skips FA details → optional
    expect(derivePass1Stage(none)).toBe('optional')

    expect(canSaveRallyTimeline(none, 'Ada')).toBe(true)
    expect(pass1SaveHint(none)).toBeNull()
  })

  it('serve-only end does not require first attack', () => {
    const serve = timelineFromContacts([1])
    expect(serve.end).toBe(1)
    expect(isFosDecided(serve)).toBe(true)
    const ready = { ...serve, ending: 'error_long' as const }
    expect(canSaveRallyTimeline(ready, 'Ada')).toBe(true)
    expect(derivePass1Stage(ready)).toBe('optional')
  })

  it('toggling No attack returns to undecided', () => {
    const base = timelineFromContacts([1, 2, 3])
    const none = setFos(base, null)
    expect(none.noFirstAttack).toBe(true)
    const again = setFos(none, null)
    expect(again.noFirstAttack).toBe(false)
    expect(isFosDecided(again)).toBe(false)
  })

  it('stays on contacts until form opens', () => {
    expect(
      derivePass1Stage(timelineFromContacts([]), { inForm: false, hasContacts: false })
    ).toBe('contacts')
    expect(pass1StageInfo('contacts').text).toBe('Click rally contacts')
    expect(pass1StageInfo('end_details').text).toBe('Enter End shot details')
  })
})
