import type { AreaRegion } from '../models'
import { PART_LABEL, type BestAt } from '@/rules/bestFa'
import { formatScore } from '@/rules/match'
import { gapFitsRally } from '@/rules/matchOps'
import type { ActionGuard } from '../hooks/useActionGuard'
import type { TagSetFlow } from '../hooks/useTagSetFlow'
import { useDeriveBestPanel } from './deriveBestPanel'
import { useDeriveTagScreen } from './deriveTagScreen'

const SLATE = '#334155'
const BRAND = 'var(--color-brand-primary)'
const CARD = 'var(--color-bg-card)'
const INK = 'var(--color-text)'

function region(part: AreaRegion): AreaRegion {
  return part
}

/** Overrun pad. Edit Rally N leads. One rally after is Remove N. A run is Remove N+1 to M. */
export function overrunLabels(endRally: number, lastRally: number): { edit: string; remove: string } {
  const from = endRally + 1
  return {
    edit: `Edit Rally ${endRally}`,
    remove: from === lastRally ? `Remove ${from}` : `Remove ${from} to ${lastRally}`,
  }
}

/** Which controls the Input Area shows. Words never go in here. */
export function tagRegions(p: {
  mode: string
  bestOn: boolean
  bestQ: BestAt | null
  best: AreaRegion[]
  shotEdit: boolean
  editRally: AreaRegion[]
  editStop: string
  zoneOn: boolean
  padTitle: string
  tapDim: boolean
  overDim: boolean
  removeDim: boolean
  showRemove: boolean
  removeAfter: number
  removeLast: number
  endPad: boolean
  saveEarly: boolean
  saveLabel: string
  onOverrunEdit: () => void
  editing: boolean
  editKind: 'rally' | 'gap' | null
  editName: string
  rallyOn: boolean
  saveOn: boolean
  saveDim: boolean
  backDim: boolean
  forwardDim: boolean
  insertDim: boolean
  onPad: () => void
  onFinish: () => void
  onOverEdit: () => void
  onRemove: () => void
  onRallies: () => void
  onGaps: () => void
  onBack: () => void
  onForward: () => void
  onEditRally: () => void
  onDeleteRally: () => void
  onInsert: () => void
  review: boolean
  reviewPart: string
  reviewMarked: boolean
  reviewBackDim: boolean
  reviewForwardDim: boolean
  onReviewBack: () => void
  onReviewForward: () => void
  onReviewMark: () => void
}): { regions: AreaRegion[]; attrs: Record<string, string | undefined> } {
  const attrs: Record<string, string | undefined> = {}
  const AMBER = 'var(--color-warning)'
  if (p.review) {
    attrs['data-review'] = ''
    return {
      regions: [
        region({
          key: 'back',
          label: 'Back',
          column: 1,
          row: 0,
          bg: SLATE,
          fg: '#fff',
          dim: p.reviewBackDim,
          onClick: p.onReviewBack,
          data: { 'data-review-step': 'back' },
        }),
        region({
          key: 'forward',
          label: 'Forward',
          column: 2,
          row: 0,
          bg: SLATE,
          fg: '#fff',
          dim: p.reviewForwardDim,
          onClick: p.onReviewForward,
          data: { 'data-review-step': 'forward' },
        }),
        region({
          key: 'mark',
          label: `Review ${p.reviewPart}`,
          column: 1,
          row: 1,
          bg: p.reviewMarked ? AMBER : SLATE,
          fg: p.reviewMarked ? '#0b1220' : '#fff',
          onClick: p.onReviewMark,
          data: { 'data-review-mark': p.reviewPart },
        }),
      ],
      attrs,
    }
  }
  if (p.shotEdit) {
    attrs['data-edit-rally'] = ''
    attrs['data-edit-stop'] = p.editStop
    return { regions: p.editRally, attrs }
  }
  if (p.bestOn && p.bestQ && p.best.length > 0) {
    attrs['data-best-panel'] = ''
    attrs['data-best-step'] = p.bestQ.step
    attrs['data-best-page'] = p.bestQ.page !== undefined ? String(p.bestQ.page) : ''
    return { regions: p.best, attrs }
  }
  if (p.editing && !p.zoneOn && p.editKind) {
    attrs['data-edit-pad'] = ''
    const save = p.saveOn
      ? [
          region({
            key: 'save',
            label: 'Save set',
            column: 2,
            row: 3,
            bg: BRAND,
            fg: '#fff',
            dim: p.saveDim,
            onClick: p.onFinish,
            data: { 'data-save-set': '' },
          }),
        ]
      : []
    const third =
      p.editKind === 'rally'
        ? [
            region({
              key: 'edit',
              label: `Edit Rally ${p.editName}`,
              column: 1,
              row: 2,
              bg: BRAND,
              fg: '#fff',
              dim: p.saveDim,
              onClick: p.onEditRally,
              data: { 'data-edit-select': '' },
            }),
            region({
              key: 'delete',
              label: `Delete rally ${p.editName}`,
              column: 2,
              row: 2,
              bg: '#7f1d1d',
              fg: '#fff',
              dim: p.saveDim,
              onClick: p.onDeleteRally,
              data: { 'data-edit-delete': '' },
            }),
          ]
        : [
            region({
              key: 'insert',
              label: `Insert rally ${p.editName}`,
              column: 1,
              row: 2,
              bg: BRAND,
              fg: '#fff',
              dim: p.insertDim,
              onClick: p.onInsert,
              data: { 'data-edit-insert': '' },
            }),
          ]
    return {
      regions: [
        region({
          key: 'rallies',
          label: 'Rallies',
          column: 1,
          row: 0,
          short: true,
          bg: p.rallyOn ? BRAND : CARD,
          fg: p.rallyOn ? '#fff' : INK,
          pressed: p.rallyOn,
          outline: !p.rallyOn,
          onClick: p.onRallies,
          data: { 'data-edit-kind': 'rally' },
        }),
        region({
          key: 'gaps',
          label: 'Gaps',
          column: 2,
          row: 0,
          short: true,
          bg: p.rallyOn ? CARD : BRAND,
          fg: p.rallyOn ? INK : '#fff',
          pressed: !p.rallyOn,
          outline: p.rallyOn,
          onClick: p.onGaps,
          data: { 'data-edit-kind': 'gap' },
        }),
        region({
          key: 'back',
          label: 'Back',
          column: 1,
          row: 1,
          bg: SLATE,
          fg: '#fff',
          dim: p.backDim,
          onClick: p.onBack,
          data: { 'data-edit-step': 'back' },
        }),
        region({
          key: 'forward',
          label: 'Forward',
          column: 2,
          row: 1,
          bg: SLATE,
          fg: '#fff',
          dim: p.forwardDim,
          onClick: p.onForward,
          data: { 'data-edit-step': 'forward' },
        }),
        ...third,
        ...save,
      ],
      attrs,
    }
  }
  if (p.mode === 'setPoint') {
    const dim = p.overDim
    attrs['data-set-over'] = ''
    return {
      regions: [
        region({
          key: 'edit',
          label: 'Edit',
          column: 1,
          row: 0,
          bg: SLATE,
          fg: '#fff',
          dim,
          onClick: p.onOverEdit,
          data: { 'data-over-edit': '' },
        }),
        region({
          key: 'save',
          label: 'Save set',
          column: 2,
          row: 0,
          bg: BRAND,
          fg: '#fff',
          dim,
          onClick: p.onFinish,
          data: { 'data-save-set': '' },
        }),
      ],
      attrs,
    }
  }
  if (p.showRemove) {
    attrs['data-overrun'] = ''
    const labels = overrunLabels(p.removeAfter, p.removeLast)
    return {
      regions: [
        region({
          key: 'edit',
          label: labels.edit,
          column: 1,
          row: 0,
          bg: SLATE,
          fg: '#fff',
          dim: p.removeDim,
          onClick: p.onOverrunEdit,
          data: { 'data-edit-rally': String(p.removeAfter) },
        }),
        region({
          key: 'remove',
          label: labels.remove,
          column: 2,
          row: 0,
          bg: SLATE,
          fg: '#fff',
          dim: p.removeDim,
          onClick: p.onRemove,
          data: { 'data-remove-from': String(p.removeAfter + 1), 'data-remove-to': String(p.removeLast) },
        }),
      ],
      attrs,
    }
  }
  if (p.endPad) {
    attrs['data-end-pad'] = ''
    // A leader is Save at 9 - 7. A level score is Save set, and stays incomplete.
    const level = !p.saveEarly
    return {
      regions: [
        region({
          key: 'save',
          label: level ? 'Save set' : p.saveLabel,
          column: 2,
          row: 0,
          bg: BRAND,
          fg: '#fff',
          onClick: p.onFinish,
          data: level
            ? { 'data-save-set': '', 'data-save-level': '' }
            : { 'data-save-set': '', 'data-save-early': '' },
        }),
      ],
      attrs,
    }
  }
  if (p.zoneOn) {
    return {
      regions: [
        region({
          key: 'pad',
          label: p.padTitle,
          column: 1,
          row: 0,
          span: true,
          bg: BRAND,
          fg: '#fff',
          dim: p.tapDim,
          onClick: p.onPad,
          data: { 'data-tap-pad': '', 'data-tag-zone': 'pad' },
        }),
      ],
      attrs: { 'data-tag-slot': 'pad' },
    }
  }
  return { regions: [], attrs: { 'data-input-empty': '' } }
}

type TagScreen = ReturnType<typeof useDeriveTagScreen>
type BestPanel = ReturnType<typeof useDeriveBestPanel>

export function useDeriveInputArea({
  flow,
  screen,
  panel,
  tapGuard,
  overGuard,
  editGuard,
  removeGuard,
}: {
  flow: TagSetFlow
  screen: TagScreen
  panel: BestPanel
  tapGuard: ActionGuard
  overGuard: ActionGuard
  editGuard: ActionGuard
  removeGuard: ActionGuard
}) {
  const {
    set,
    boundNote,
    gap,
    reviewFocus,
    shotEdit,
    editPick,
    onPad,
    flipKind,
    stepList,
    stepAt,
    onPickEdit,
    stepPick,
    onDeletePicked,
    onOverEdit,
    onDropAfter,
    onOverrunEdit,
    stepReview,
    onReviewMark,
    onAddRally,
    readyToFinish,
    onFinishSet,
    readOnly,
    bestOn,
    viewedGap,
    running,
    endIndex,
    saveEarly,
    mode,
    editIndex,
  } = flow
  const {
    finishCard,
    zoneOn,
    zoneTitle,
    bestQ,
    coverTaps,
    showRemove,
    reviewDraftNow,
    reviewParts,
    reviewMarked,
  } = screen
  const {
    bestRegions,
    editRegions,
  } = panel
  const guarded = (guard: ActionGuard, fn: () => void) => () => {
    if (!guard.allow()) return
    fn()
  }
  const area = tagRegions({
    mode,
    bestOn,
    bestQ,
    best: bestRegions,
    shotEdit: Boolean(shotEdit),
    editRally: editRegions,
    editStop: shotEdit ? (shotEdit.stop === 'end' ? 'end' : String(shotEdit.stop)) : '',
    zoneOn,
    padTitle: zoneTitle,
    tapDim: tapGuard.waiting || coverTaps,
    overDim: overGuard.waiting || readOnly,
    removeDim: removeGuard.waiting || readOnly,
    showRemove,
    removeAfter: endIndex + 1,
    removeLast: set.rallies.length,
    endPad: Boolean(
      !showRemove &&
        (finishCard || (readyToFinish && boundNote && mode !== 'setPoint' && mode !== 'edit' && !set.finished)),
    ),
    saveEarly,
    saveLabel: `Save at ${formatScore(running)}`,
    onOverrunEdit: guarded(removeGuard, onOverrunEdit),
    editing: mode === 'edit' && editPick !== null && !gap,
    editKind: editPick?.kind ?? null,
    editName: editPick?.kind === 'gap' ? String(viewedGap?.n ?? '') : String(editIndex + 1),
    rallyOn: editPick?.kind !== 'gap',
    saveOn: readyToFinish,
    saveDim: tapGuard.waiting || editGuard.waiting || readOnly,
    backDim: stepAt <= 0,
    forwardDim: stepAt >= stepList.length - 1,
    insertDim: readOnly || editGuard.waiting || Boolean(viewedGap && !gapFitsRally(viewedGap)),
    onPad: guarded(tapGuard, onPad),
    onFinish: () => {
      if (mode === 'setPoint' && !overGuard.allow()) return
      onFinishSet()
    },
    onOverEdit: guarded(overGuard, onOverEdit),
    onRemove: guarded(removeGuard, onDropAfter),
    onRallies: () => flipKind('rally'),
    onGaps: () => flipKind('gap'),
    onBack: () => stepPick(-1),
    onForward: () => stepPick(1),
    onEditRally: guarded(editGuard, onPickEdit),
    onDeleteRally: guarded(editGuard, onDeletePicked),
    onInsert: guarded(editGuard, () => {
      if (viewedGap) onAddRally(viewedGap.index)
    }),
    review: Boolean(reviewDraftNow),
    reviewPart: reviewFocus ? PART_LABEL[reviewFocus] : '',
    reviewMarked,
    reviewBackDim: reviewParts.length < 2,
    reviewForwardDim: reviewParts.length < 2,
    onReviewBack: () => stepReview(-1),
    onReviewForward: () => stepReview(1),
    onReviewMark,
  })


  return area
}
