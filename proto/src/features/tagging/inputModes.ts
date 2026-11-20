import type { AreaRegion } from './InputArea'
import type { BestAt } from './bestFlow'

const SLATE = '#334155'
const BRAND = 'var(--color-brand-primary)'
const CARD = 'var(--color-bg-card)'
const INK = 'var(--color-text)'

function region(part: AreaRegion): AreaRegion {
  return part
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
  hold: boolean
  overDim: boolean
  removeDim: boolean
  showRemove: boolean
  removeAfter: number
  endPad: boolean
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
    const dim = p.hold || p.overDim
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
    return {
      regions: [
        region({
          key: 'remove',
          label: `Remove after ${p.removeAfter}`,
          column: 1,
          row: 0,
          bg: SLATE,
          fg: '#fff',
          dim: p.removeDim,
          onClick: p.onRemove,
          data: { 'data-remove-after': String(p.removeAfter) },
        }),
      ],
      attrs,
    }
  }
  if (p.endPad) {
    attrs['data-end-pad'] = ''
    return {
      regions: [
        region({
          key: 'save',
          label: 'Save set',
          column: 2,
          row: 0,
          bg: BRAND,
          fg: '#fff',
          onClick: p.onFinish,
          data: { 'data-save-set': '' },
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
