import { describe, it, expect } from 'vitest'
import {
  RALLY_TIMELINE_MIN_WINDOW_SECONDS,
  RALLY_TIMELINE_PAD_SECONDS,
  applyImpossibleFaAutoSkip,
  canSaveRallyTimeline,
  clearFosDecision,
  deriveRallyScrubMarks,
  derivePass1Stage,
  isEndAttrsComplete,
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
  shotLoopWindow,
  shotToRallyEndLoopWindow,
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

describe('deriveRallyScrubMarks (MA-83)', () => {
  it('encodes winner fill + server stripe and focuses the selected rally', () => {
    const marks = deriveRallyScrubMarks({
      completed: [
        {
          rallyIndex: 1,
          serveTimestamp: 10,
          endTimestamp: 14,
          winnerId: 'player1',
          serverId: 'player2',
          winnerName: 'A',
          serverName: 'B',
          player1ScoreAfter: 1,
          player2ScoreAfter: 0,
        },
      ],
      focusedRallyIndex: 1,
    })
    expect(marks).toHaveLength(1)
    expect(marks[0].fillColor).toBe('var(--color-player-1)')
    expect(marks[0].stripeColor).toBe('var(--color-player-2)')
    expect(marks[0].focused).toBe(true)
    expect(marks[0].seekTime).toBe(10)
    expect(marks[0].kind).toBe('rally')
  })

  it('adds draft contact ticks while tapping', () => {
    const marks = deriveRallyScrubMarks({
      completed: [],
      draftContactTimes: [3.2, 4.1],
    })
    expect(marks).toHaveLength(2)
    expect(marks.every((m) => m.kind === 'draft')).toBe(true)
    expect(marks[0].title).toMatch(/Serve/)
  })
})

describe('first attack mandatory (MA-35 / MA-68 / MA-71)', () => {
  function withEndAttrs(state: ReturnType<typeof timelineFromContacts>) {
    const end = state.end!
    return toggleShotChoice(
      toggleShotChoice({ ...state, ending: 'winner' as const }, end, 'wing', 'FH'),
      end,
      'stroke',
      'Loop'
    )
  }

  it('gates End Result then Wing/Stroke before select FA', () => {
    const base = timelineFromContacts([1, 2, 3, 4])
    expect(base.end).toBe(4)
    expect(base.noFirstAttack).toBe(false)
    expect(isFosDecided(base)).toBe(false)
    expect(canSaveRallyTimeline(base, 'Ada')).toBe(false)
    expect(pass1SaveHint(base)).toMatch(/Winner|error|end shot/i)
    expect(derivePass1Stage(base)).toBe('end_details')

    const withEndingOnly = { ...base, ending: 'winner' as const }
    expect(isEndAttrsComplete(withEndingOnly)).toBe(false)
    expect(derivePass1Stage(withEndingOnly)).toBe('end_shot')
    expect(pass1StageInfo('end_shot').text).toMatch(/Wing and Stroke/i)
    expect(pass1SaveHint(withEndingOnly)).toMatch(/Wing and Stroke/i)
    expect(canSaveRallyTimeline(withEndingOnly, 'Ada')).toBe(false)

    const endReady = withEndAttrs(base)
    expect(isEndAttrsComplete(endReady)).toBe(true)
    expect(derivePass1Stage(endReady)).toBe('select_fa')
    expect(pass1StageInfo('select_fa').text).toMatch(/No Attack/i)
    expect(pass1SaveHint(endReady)).toMatch(/first attack|No attack/i)

    const marked = markFos(endReady, 3, 3)
    expect(marked.fos).toBe(3)
    expect(marked.noFirstAttack).toBe(false)
    expect(isFosDecided(marked)).toBe(true)
    // MA-73: Save blocked until FA wing+stroke (aligned with fa_details).
    expect(canSaveRallyTimeline(marked, 'Ada')).toBe(false)
    expect(pass1SaveHint(marked)).toMatch(/First attack Wing and Stroke/i)
    expect(derivePass1Stage(marked)).toBe('fa_details')
    expect(isFaAttrsComplete(marked)).toBe(false)
    expect(pass1StageInfo('fa_details').text).toMatch(/tap FA to undo/i)

    const withFaAttrs = toggleShotChoice(
      toggleShotChoice(marked, 3, 'wing', 'FH'),
      3,
      'stroke',
      'Loop'
    )
    expect(isFaAttrsComplete(withFaAttrs)).toBe(true)
    expect(canSaveRallyTimeline(withFaAttrs, 'Ada')).toBe(true)
    expect(derivePass1Stage(withFaAttrs)).toBe('optional')
    expect(pass1StageInfo('optional', { canSave: true }).tone).toBe('ready')
    expect(pass1StageInfo('optional').tone).toBe('pending')
    expect(pass1StageInfo('select_fa').tone).toBe('pending')

    // MA-73: clear in fa_details → select_fa (model path used by rail FA tap).
    const clearedViaDecision = clearFosDecision(marked)
    expect(clearedViaDecision.fos).toBeNull()
    expect(clearedViaDecision.noFirstAttack).toBe(false)
    expect(derivePass1Stage(clearedViaDecision)).toBe('select_fa')

    const cleared = markFos(marked, 3, 3)
    expect(cleared.fos).toBeNull()
    expect(cleared.noFirstAttack).toBe(false)
    expect(isFosDecided(cleared)).toBe(false)
    expect(derivePass1Stage(cleared)).toBe('select_fa')

    const none = setFos(cleared, null)
    expect(none.fos).toBeNull()
    expect(none.noFirstAttack).toBe(true)
    expect(isFosDecided(none)).toBe(true)
    expect(derivePass1Stage(none)).toBe('optional')

    expect(canSaveRallyTimeline(none, 'Ada')).toBe(true)
    expect(pass1SaveHint(none)).toBeNull()

    // Undo No attack in optional → back through select FA
    const undone = setFos(none, null)
    expect(undone.noFirstAttack).toBe(false)
    expect(isFosDecided(undone)).toBe(false)
    expect(derivePass1Stage(undone)).toBe('select_fa')
  })

  it('serve-only end does not require first attack or end wing/stroke', () => {
    const serve = timelineFromContacts([1])
    expect(serve.end).toBe(1)
    expect(isFosDecided(serve)).toBe(true)
    const ready = { ...serve, ending: 'error_long' as const }
    expect(isEndAttrsComplete(ready)).toBe(true)
    expect(canSaveRallyTimeline(ready, 'Ada')).toBe(true)
    expect(derivePass1Stage(ready)).toBe('optional')
    // Auto-skip helper is a no-op for serve-only.
    expect(applyImpossibleFaAutoSkip(ready)).toEqual(ready)
  })

  it('end=2 Lob (defensive) auto No Attack (MA-77)', () => {
    const base = timelineFromContacts([1, 2])
    const endReady = toggleShotChoice(
      toggleShotChoice({ ...base, ending: 'error_net' as const }, 2, 'wing', 'BH'),
      2,
      'stroke',
      'Lob'
    )
    const auto = applyImpossibleFaAutoSkip(endReady)
    expect(auto.noFirstAttack).toBe(true)
    expect(auto.fos).toBeNull()
    expect(derivePass1Stage(auto)).toBe('optional')
  })

  it('end=2 defensive stroke auto No Attack and skips select_fa (MA-73)', () => {
    const base = timelineFromContacts([1, 2])
    expect(base.end).toBe(2)
    const endReady = toggleShotChoice(
      toggleShotChoice({ ...base, ending: 'error_net' as const }, 2, 'wing', 'BH'),
      2,
      'stroke',
      'Push'
    )
    expect(isEndAttrsComplete(endReady)).toBe(true)
    expect(isFosDecided(endReady)).toBe(false)
    expect(derivePass1Stage(endReady)).toBe('select_fa')

    const auto = applyImpossibleFaAutoSkip(endReady)
    expect(auto.noFirstAttack).toBe(true)
    expect(auto.fos).toBeNull()
    expect(isFosDecided(auto)).toBe(true)
    expect(derivePass1Stage(auto)).toBe('optional')
    expect(canSaveRallyTimeline(auto, 'Ada')).toBe(true)

    // Undo No Attack → undecided (composer does not re-run helper until End attrs change).
    const undone = setFos(auto, null)
    expect(undone.noFirstAttack).toBe(false)
    expect(isFosDecided(undone)).toBe(false)
    expect(derivePass1Stage(undone)).toBe('select_fa')
    // Pure helper would re-apply if called again while undecided — UI only calls it on End attr edits.
    expect(applyImpossibleFaAutoSkip(undone).noFirstAttack).toBe(true)
  })

  it('end=2 attack stroke auto FA=2 and skips select + fa_details (MA-73; Lob not attack)', () => {
    const base = timelineFromContacts([1, 2])
    const endReady = toggleShotChoice(
      toggleShotChoice({ ...base, ending: 'winner' as const }, 2, 'wing', 'FH'),
      2,
      'stroke',
      'Flick'
    )
    expect(isEndAttrsComplete(endReady)).toBe(true)

    const auto = applyImpossibleFaAutoSkip(endReady)
    expect(auto.fos).toBe(2)
    expect(auto.noFirstAttack).toBe(false)
    expect(isFaAttrsComplete(auto)).toBe(true)
    expect(derivePass1Stage(auto)).toBe('optional')
    expect(canSaveRallyTimeline(auto, 'Ada')).toBe(true)
  })

  it('end=FA same shot: fa_details skipped when wing+stroke filled (MA-73)', () => {
    const base = timelineFromContacts([1, 2, 3, 4])
    const endReady = toggleShotChoice(
      toggleShotChoice({ ...base, ending: 'winner' as const }, 4, 'wing', 'FH'),
      4,
      'stroke',
      'Loop'
    )
    const marked = markFos(endReady, 4, 4)
    expect(isFaAttrsComplete(marked)).toBe(true)
    expect(derivePass1Stage(marked)).toBe('optional')
    expect(canSaveRallyTimeline(marked, 'Ada')).toBe(true)
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
    expect(pass1StageInfo('end_details').text).toMatch(/end reason|Result/i)
  })

  it('shotToRallyEndLoopWindow runs from shot start to rally end', () => {
    const state = timelineFromContacts([10, 12, 14, 16])
    const rally = { startTime: 9, endTime: 17 }
    const win = shotToRallyEndLoopWindow(state, 2, rally)
    expect(win).not.toBeNull()
    expect(win!.endTime).toBe(17)
    expect(win!.startTime).toBeLessThanOrEqual(12)
    expect(win!.startTime).toBeGreaterThanOrEqual(rally.startTime)
    // Spans past the next contact (unlike isolated shot loop).
    const isolated = shotLoopWindow(state, 2, rally)
    expect(win!.endTime).toBeGreaterThan(isolated!.endTime)
  })
})
