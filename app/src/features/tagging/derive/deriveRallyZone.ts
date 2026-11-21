import type { Player } from '../hooks/usePlayer'
import type { TagSetFlow } from '../hooks/useTagSetFlow'
import type { RallyZoneView } from '../models'
import { useDeriveTagScreen } from './deriveTagScreen'

type TagScreen = ReturnType<typeof useDeriveTagScreen>

export function useDeriveRallyZone({
  flow,
  screen,
  player,
  landscape,
}: {
  flow: TagSetFlow
  screen: TagScreen
  player: Player
  landscape: boolean
}): RallyZoneView {
  const {
    pickDraft,
    shotEdit,
    editOf,
    bestRowSaved,
    active,
    offsetOf,
    set,
    names,
    nextServer,
    reviewFocus,
    jumpReview,
    editFromRallyZone,
    onReviewStar,
    live,
    readOnly,
    cancelEdit,
    onDiscardProgress,
    cancelInsert,
    gap,
    switchInsertServer,
  } = flow
  const {
    atEndPad,
    reviewDraftNow,
    rowDraft,
    bestQ,
    savedIndex,
    bestRallyOne,
    rallyState,
    rallyNo,
    nextHead,
    rallyServer,
    scoreBefore,
    rallyScoreAt,
    rallyWord,
    starShown,
    insertingBare,
  } = screen
  return {
    state: atEndPad ? 'before' : reviewDraftNow ? 'review' : rallyState,
    draft: atEndPad ? null : rowDraft,
    at: atEndPad || pickDraft || shotEdit ? null : bestQ,
    rallyOne: atEndPad ? false : pickDraft || editOf ? false : bestRowSaved ? savedIndex <= 0 : bestRallyOne,
    saved: atEndPad ? false : shotEdit ? Boolean(shotEdit.rallyId) : pickDraft ? true : bestRowSaved,
    focus: shotEdit ? shotEdit.stop : null,
    flash:
      shotEdit && active && typeof shotEdit.stop === 'number'
        ? Math.abs((active.contacts[shotEdit.stop - 1] ?? -1) - (player.time - offsetOf(active.videoId))) < 0.2
          ? shotEdit.stop - 1
          : -1
        : -1,
    rallyNo: atEndPad || nextHead ? set.rallies.length + 1 : rallyNo,
    headDashed: nextHead,
    names,
    server: atEndPad || nextHead ? nextServer : rallyServer,
    score: atEndPad || nextHead ? scoreBefore(set.rallies.length) : scoreBefore(rallyScoreAt),
    word: atEndPad ? null : rallyWord,
    tight: landscape,
    pressed: rallyState === 'editing',
    reviewFocus,
    onReviewPart: reviewDraftNow ? jumpReview : undefined,
    onEdit: !atEndPad && (rallyState === 'saved' || rallyState === 'editing') ? editFromRallyZone : undefined,
    onStar: starShown ? onReviewStar : undefined,
    onDiscard: atEndPad
      ? undefined
      : editOf && live
        ? cancelEdit
        : !readOnly && !bestRowSaved && live && live.contacts.length > 0
          ? onDiscardProgress
          : undefined,
    onCancel: insertingBare ? cancelInsert : undefined,
    onServer: insertingBare && gap && gap.index !== 0 ? switchInsertServer : undefined,
  }
}
