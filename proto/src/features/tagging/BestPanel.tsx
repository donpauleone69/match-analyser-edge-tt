import type { CSSProperties } from 'react'
import {
  STROKE_GRID,
  bestEndOf,
  padFocus,
  stepShot,
  type BestAt,
  type PadBack,
  type BestEnd,
} from '@/rules/bestFa'
import type { AreaRegion } from './models'
import type { Draft, Side, Wing } from '@/types/rally'
import { hitterOf, otherSide, winnerOf } from '@/rules/rally'

/** BH left, FH right. Attack is the strong colour, Control the light one. */
const PAD_STROKE: Record<string, { bg: string; fg: string }> = {
  'BH:Attack': { bg: '#1d4ed8', fg: '#fff' },
  'FH:Attack': { bg: '#c2410c', fg: '#fff' },
  'BH:Control': { bg: '#bfdbfe', fg: '#0b1220' },
  'FH:Control': { bg: '#fed7aa', fg: '#0b1220' },
}

/** Receiver's side, right-hander. Bottom Short, top Long, left BH, right FH. */
const PAD_SERVE: { depth: 'Short' | 'Long'; wing: 'BH' | 'FH'; label: string; bg: string; fg: string }[] = [
  { depth: 'Long', wing: 'BH', label: 'BH Long', bg: '#1d4ed8', fg: '#fff' },
  { depth: 'Long', wing: 'FH', label: 'FH Long', bg: '#c2410c', fg: '#fff' },
  { depth: 'Short', wing: 'BH', label: 'BH Short', bg: '#bfdbfe', fg: '#0b1220' },
  { depth: 'Short', wing: 'FH', label: 'FH Short', bg: '#fed7aa', fg: '#0b1220' },
]

/** Winner takes the left half. Long is top right, In net bottom right. Net is the stored end. */
const PAD_ENDS: { end: BestEnd; label: string; bg: string; style: CSSProperties }[] = [
  { end: 'Winner', label: 'Winner', bg: '#15803d', style: { gridColumn: '1', gridRow: '1 / span 2' } },
  { end: 'Long', label: 'Long', bg: '#b45309', style: { gridColumn: '2', gridRow: '1' } },
  { end: 'Net', label: 'In net', bg: '#b91c1c', style: { gridColumn: '2', gridRow: '2' } },
]


const SLATE = '#334155'

function area(
  part: Omit<AreaRegion, 'pressed'> & { pressed?: boolean },
): AreaRegion {
  return { pressed: false, ...part }
}

/** The question pad as Input Area regions. Rally 1 opens on who served, and never asks Point to. */
export function bestPadRegions({
  draft,
  names,
  at,
  rallyOne,
  back,
  dim,
  notShotDim,
  onServer,
  onEnd,
  onPoint,
  onNotShot,
  onServe,
  onStroke,
}: {
  draft: Draft
  names: Record<Side, string>
  at: BestAt
  rallyOne: boolean
  back: PadBack
  dim: boolean
  notShotDim: boolean
  onServer: (side: Side) => void
  onEnd: (end: BestEnd) => void
  onPoint: (side: Side) => void
  onNotShot: () => void
  onServe: (depth: string, wing: Wing) => void
  onStroke: (shot: number, wing: Wing, stroke: 'Attack' | 'Control') => void
}): AreaRegion[] {
  if (at.step === 'server') {
    return (['me', 'them'] as const).map((side) =>
      area({
        key: side,
        label: `${names[side]} served`,
        column: side === 'me' ? 1 : 2,
        row: 0,
        bg: side === 'me' ? 'var(--color-side-me)' : 'var(--color-side-them)',
        fg: '#fff',
        dim,
        onClick: () => onServer(side),
        data: { 'data-serve-side': side },
      }),
    )
  }
  if (at.step === 'serve') {
    return PAD_SERVE.map((cell) =>
      area({
        key: cell.label,
        label: cell.label,
        column: cell.wing === 'BH' ? 1 : 2,
        row: cell.depth === 'Long' ? 0 : 1,
        bg: cell.bg,
        fg: cell.fg,
        pressed: draft.shots[0]?.depth === cell.depth && draft.shots[0]?.wing === cell.wing,
        dim,
        onClick: () => onServe(cell.depth, cell.wing),
        data: { 'data-best-serve': cell.label },
      }),
    )
  }
  if (at.step === 'shots') {
    const shot = stepShot(draft.contacts.length, at.step, at.page)
    const saved = draft.shots[shot - 1]
    return STROKE_GRID.flat().map((cell) => {
      const tone = PAD_STROKE[`${cell.wing}:${cell.stroke}`]
      return area({
        key: `${cell.wing}-${cell.stroke}`,
        label: `${cell.wing} ${cell.stroke}`,
        column: cell.wing === 'BH' ? 1 : 2,
        row: cell.stroke === 'Attack' ? 0 : 1,
        bg: tone.bg,
        fg: tone.fg,
        pressed: saved?.wing === cell.wing && saved?.stroke === cell.stroke,
        dim,
        onClick: () => onStroke(shot, cell.wing, cell.stroke),
        data: { 'data-wing': cell.wing, 'data-stroke': cell.stroke },
      })
    })
  }
  const phase = padFocus(draft, rallyOne, back)
  if (phase === 'point') {
    return (['me', 'them'] as const).map((side) =>
      area({
        key: side,
        label: names[side],
        column: side === 'me' ? 1 : 2,
        row: 0,
        bg: side === 'me' ? 'var(--color-side-me)' : 'var(--color-side-them)',
        fg: '#fff',
        pressed: draft.best?.point === side,
        dim,
        onClick: () => onPoint(side),
        data: { 'data-point-to': names[side] },
      }),
    )
  }
  const n = draft.contacts.length
  const endOn = bestEndOf(draft)
  return [
    ...PAD_ENDS.map((cell) =>
      area({
        key: cell.end,
        label: cell.label,
        column: cell.end === 'Winner' ? 1 : 2,
        row: cell.end === 'Net' ? 1 : 0,
        bg: cell.bg,
        fg: '#fff',
        pressed: endOn === cell.end,
        dim,
        onClick: () => onEnd(cell.end),
        data: { 'data-best-end': cell.end },
      }),
    ),
    area({
      key: 'not-a-shot',
      label: 'Not a shot',
      column: 1,
      row: 1,
      bg: '#475569',
      fg: '#fff',
      dim: dim || n < 2 || notShotDim,
      onClick: () => {
        if (n < 2 || notShotDim) return
        onNotShot()
      },
      data: { 'data-best-not-shot': '', ...(n < 2 ? { 'data-not-shot-blocked': '' } : {}) },
    }),
  ]
}

/** Edit Rally as regions. Blank slots are omitted, so they are space. Point to is not on rally 1. */
export function editRallyRegions({
  draft,
  names,
  stop,
  rallyOne,
  breakRally,
  dim,
  onBack,
  onForward,
  onDelete,
  onKim,
  onOut,
  onServe,
  onStroke,
  onEnd,
  onPointTo,
}: {
  draft: Draft
  names: Record<Side, string>
  stop: number | 'end'
  rallyOne: boolean
  breakRally: boolean
  dim: boolean
  onBack: () => void
  onForward: () => void
  onDelete: () => void
  onKim: () => void
  onOut: () => void
  onServe: (depth: string, wing: Wing) => void
  onStroke: (shot: number, wing: Wing, stroke: 'Attack' | 'Control') => void
  onEnd: (end: BestEnd) => void
  onPointTo: (side: Side) => void
}): AreaRegion[] {
  const n = draft.contacts.length
  const shot = stop === 'end' ? n : stop
  const shot1 = shot === 1
  const regions: AreaRegion[] = [
    area({
      key: 'back',
      label: 'Back',
      column: 1,
      row: 0,
      bg: SLATE,
      fg: '#fff',
      dim,
      onClick: onBack,
      data: { 'data-edit-step': 'back' },
    }),
    area({
      key: 'forward',
      label: 'Forward',
      column: 2,
      row: 0,
      bg: SLATE,
      fg: '#fff',
      dim,
      onClick: onForward,
      data: { 'data-edit-step': 'forward' },
    }),
  ]
  if (shot1 && breakRally) {
    regions.push(
      area({
        key: 'out',
        label: 'Out of turn',
        column: 1,
        row: 1,
        bg: '#475569',
        fg: '#fff',
        dim,
        onClick: onOut,
        data: { 'data-shot-out': '' },
      }),
    )
  } else if (!(shot1 && n < 2) && stop !== 'end') {
    regions.push(
      area({
        key: 'delete',
        label: 'Delete',
        column: 1,
        row: 1,
        bg: '#b91c1c',
        fg: '#fff',
        dim,
        onClick: onDelete,
        data: { 'data-shot-delete': '' },
      }),
    )
  }
  if (shot1) {
    const other = otherSide(draft.server)
    regions.push(
      area({
        key: 'kim',
        label: `${names[other]} served`,
        column: 2,
        row: 1,
        bg: other === 'me' ? 'var(--color-side-me)' : 'var(--color-side-them)',
        fg: '#fff',
        dim,
        onClick: onKim,
        data: { 'data-shot-kim': '' },
      }),
    )
  }
  if (stop === 'end' && !rallyOne && padFocus(draft, rallyOne, null) === 'point') {
    for (const side of ['me', 'them'] as const) {
      regions.push(
        area({
          key: side,
          label: names[side],
          column: side === 'me' ? 1 : 2,
          row: 2,
          bg: side === 'me' ? 'var(--color-side-me)' : 'var(--color-side-them)',
          fg: '#fff',
          pressed: draft.best?.point === side,
          dim,
          onClick: () => onPointTo(side),
          data: { 'data-point-to': names[side] },
        }),
      )
    }
    return regions
  }
  if (stop === 'end') {
    const endOn = bestEndOf(draft)
    for (const cell of PAD_ENDS) {
      regions.push(
        area({
          key: cell.end,
          label: cell.label,
          column: cell.end === 'Winner' ? 1 : 2,
          row: cell.end === 'Net' ? 3 : 2,
          bg: cell.bg,
          fg: '#fff',
          pressed: endOn === cell.end,
          dim,
          onClick: () => onEnd(cell.end),
          data: { 'data-best-end': cell.end },
        }),
      )
    }
    if (!rallyOne) {
      const tagged = winnerOf(draft)
      const pointSide = tagged ? otherSide(tagged) : otherSide(hitterOf(draft.server, Math.max(1, n)))
      regions.push(
        area({
          key: 'point-kim',
          label: `Point to ${names[pointSide]}`,
          column: 1,
          row: 3,
          bg: '#475569',
          fg: '#fff',
          pressed: draft.best?.point === pointSide && tagged !== null && draft.best?.point !== tagged,
          dim,
          onClick: () => onPointTo(pointSide),
          data: { 'data-shot-point': names[pointSide] },
        }),
      )
    }
    return regions
  }
  if (stop === 1 && n > 1) {
    for (const cell of PAD_SERVE) {
      regions.push(
        area({
          key: cell.label,
          label: cell.label,
          column: cell.wing === 'BH' ? 1 : 2,
          row: cell.depth === 'Long' ? 2 : 3,
          bg: cell.bg,
          fg: cell.fg,
          pressed: draft.shots[0]?.depth === cell.depth && draft.shots[0]?.wing === cell.wing,
          dim,
          onClick: () => onServe(cell.depth, cell.wing),
          data: { 'data-best-serve': cell.label },
        }),
      )
    }
    return regions
  }
  if (typeof stop === 'number' && stop > 1) {
    const saved = draft.shots[stop - 1]
    for (const cell of STROKE_GRID.flat()) {
      const tone = PAD_STROKE[`${cell.wing}:${cell.stroke}`]
      regions.push(
        area({
          key: `${cell.wing}-${cell.stroke}`,
          label: `${cell.wing} ${cell.stroke}`,
          column: cell.wing === 'BH' ? 1 : 2,
          row: cell.stroke === 'Attack' ? 2 : 3,
          bg: tone.bg,
          fg: tone.fg,
          pressed: saved?.wing === cell.wing && saved?.stroke === cell.stroke,
          dim,
          onClick: () => onStroke(stop, cell.wing, cell.stroke),
          data: { 'data-wing': cell.wing, 'data-stroke': cell.stroke },
        }),
      )
    }
  }
  return regions
}
