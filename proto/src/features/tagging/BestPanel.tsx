import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/helpers/utils'
import { CornerPad } from './CornerPad'
import {
  PART_LABEL,
  STROKE_GRID,
  bestEndOf,
  bestHint,
  padFocus,
  stepShot,
  type BestAt,
  type PadBack,
  type BestEnd,
  type BestPart,
} from './bestFlow'
import type { AreaRegion } from './InputArea'
import { hitterOf, otherSide, winnerOf, type Draft, type Side, type Wing } from './rally'

export const railCell =
  'btn-kind-control relative w-full px-1 rounded-md border text-sm font-bold tabular-nums inline-flex items-center justify-center'

/** Player token, or that token at 15%. Open is the solid token. */
export function shotPaint(side: Side, open: boolean, fa: boolean, dim: boolean): CSSProperties {
  const token = side === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)'
  const fill = open ? token : `color-mix(in srgb, ${token} 15%, transparent)`
  const line = open
    ? token
    : fa
      ? 'var(--color-tag-first-attack)'
      : side === 'me'
        ? 'var(--tag-shot-line-a)'
        : 'var(--tag-shot-line-b)'
  const ink = open ? 'var(--color-tag-on-solid)' : 'var(--color-text)'
  return {
    backgroundColor: fill,
    borderColor: line,
    color: ink,
    ['--shot-fill' as string]: fill,
    ['--shot-line' as string]: line,
    ['--shot-ink' as string]: ink,
    ['--shot-fade' as string]: dim ? '0.6' : '1',
  }
}

const PART_SHORT: Record<BestPart, string> = { opening: 'Open', rally: 'Rally', attack: 'Att', end: 'End' }

/** Longest label that fits its chip, then smaller type, then shorter words. Never spills. */
export function PartLabel({ part }: { part: BestPart }) {
  const ref = useRef<HTMLSpanElement>(null)
  const tries: { text: string; size: number }[] = [
    { text: PART_LABEL[part], size: 10 },
    { text: PART_LABEL[part], size: 9 },
    { text: PART_LABEL[part], size: 8 },
    { text: PART_SHORT[part], size: 9 },
    { text: PART_SHORT[part], size: 8 },
    { text: PART_SHORT[part].slice(0, 1), size: 9 },
  ]
  const [pick, setPick] = useState(0)
  const key = part
  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return
    const fit = () => {
      const room = box.clientWidth - 4
      let i = 0
      for (; i < tries.length - 1; i++) {
        el.textContent = tries[i].text
        el.style.fontSize = `${tries[i].size}px`
        if (el.scrollWidth <= room) break
      }
      el.textContent = tries[i].text
      el.style.fontSize = `${tries[i].size}px`
      setPick(i)
    }
    fit()
    const watch = new ResizeObserver(fit)
    watch.observe(box)
    return () => watch.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const shown = tries[Math.min(pick, tries.length - 1)]
  return (
    <span ref={ref} className="inline-block whitespace-nowrap" style={{ fontSize: shown.size }}>
      {shown.text}
    </span>
  )
}

export function filled(): CSSProperties {
  return { backgroundColor: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)', color: 'var(--color-on-accent)' }
}

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

/** The question open now. No step row: the Rally Row is the guide. */
export function BestPanel({
  draft,
  names,
  at,
  rallyOne,
  rallyNo,
  back,
  onEnd,
  onPoint,
  onNotShot,
  onServe,
  onStroke,
  sides = false,
  notShotDim = false,
}: {
  draft: Draft
  names: Record<Side, string>
  at: BestAt
  rallyOne: boolean
  rallyNo: number
  /** Corner pad: which result question to show again. Null follows the one still open. */
  back: PadBack
  onEnd: (end: BestEnd) => void
  onPoint: (side: Side) => void
  /** Deletes the last contact. Dim on a one contact rally. */
  onNotShot: () => void
  onServe: (depth: string, wing: Wing) => void
  onStroke: (shot: number, wing: Wing, stroke: 'Attack' | 'Control') => void
  /** Landscape pad: quadrant halves sit in the side wings. */
  sides?: boolean
  /** Not a shot just fired, so a second tap is ignored. */
  notShotDim?: boolean
}) {
  const n = draft.contacts.length
  const shot = stepShot(n, at.step, at.page)
  const hitter = hitterOf(draft.server, shot)
  const grid = (k: number, title: string) => {
    const saved = draft.shots[k - 1]
    const cells = STROKE_GRID.map((row) => row.map((c) => ({ ...c, label: `${c.wing} ${c.stroke}` })))
    return (
      <CornerPad
        shot={k}
        label={title}
        showName={false}
        split={sides}
        columns="1fr 1fr"
        rows="1fr 1fr"
        regions={cells.flat().map((c) => {
          const tone = PAD_STROKE[`${c.wing}:${c.stroke}`]
          return {
            key: `${c.wing}-${c.stroke}`,
            label: c.label,
            side: c.wing === 'BH' ? ('left' as const) : ('right' as const),
            on: saved?.wing === c.wing && saved?.stroke === c.stroke,
            bg: tone.bg,
            fg: tone.fg,
            onClick: () => onStroke(k, c.wing, c.stroke),
            data: { 'data-wing': c.wing, 'data-stroke': c.stroke },
          }
        })}
      />
    )
  }

  return (
    <div
      className={cn('relative z-20 flex flex-col gap-2.5 pt-2', !sides && 'min-h-0 flex-1')}
      data-best-panel
      data-best-step={at.step}
      data-best-page={at.page ?? ''}
      data-best-rally={rallyNo}
      data-pad-phase={at.step === 'end' ? padFocus(draft, rallyOne, back) : undefined}
      data-pad-sides={sides ? '' : undefined}
    >
      {at.step === 'end' ? (
        <EndPage
          draft={draft}
          names={names}
          rallyOne={rallyOne}
          sides={sides}
          back={back}
          onEnd={onEnd}
          onPoint={onPoint}
          onNotShot={onNotShot}
          notShotDim={notShotDim}
        />
      ) : null}

      {at.step === 'serve' ? (
        <div className={cn('flex flex-col gap-2.5', !sides && 'min-h-0 flex-1')}>
          <CornerPad
            label={`Serve · ${names[draft.server]}`}
            showName={false}
            split={sides}
            columns="1fr 1fr"
            rows="1fr 1fr"
            regions={PAD_SERVE.map((cell) => ({
              key: cell.label,
              label: cell.label,
              side: cell.wing === 'BH' ? ('left' as const) : ('right' as const),
              on: draft.shots[0]?.depth === cell.depth && draft.shots[0]?.wing === cell.wing,
              bg: cell.bg,
              fg: cell.fg,
              onClick: () => onServe(cell.depth, cell.wing),
              data: { 'data-best-serve': cell.label },
              style: { gridColumn: cell.wing === 'BH' ? '1' : '2', gridRow: cell.depth === 'Long' ? '1' : '2' },
            }))}
          />
        </div>
      ) : null}

      {at.step === 'shots' ? grid(shot, `Shot ${shot} · ${names[hitter]}`) : null}
    </div>
  )
}

function EndPage({
  draft,
  names,
  rallyOne,
  sides,
  back,
  onEnd,
  onPoint,
  onNotShot,
  notShotDim,
}: {
  draft: Draft
  names: Record<Side, string>
  rallyOne: boolean
  sides: boolean
  back: PadBack
  onEnd: (end: BestEnd) => void
  onPoint: (side: Side) => void
  onNotShot: () => void
  notShotDim: boolean
}) {
  const n = draft.contacts.length
  const last = hitterOf(draft.server, n)
  const endOn = bestEndOf(draft)
  const lit = draft.ending ? bestHint(draft, rallyOne) : null
  const point = draft.best?.point
  const phase = padFocus(draft, rallyOne, back)
  const endLabel = `End · ${names[last]}`
  if (phase === 'point') {
    return (
      <div className={cn('flex flex-col gap-2', !sides && 'min-h-0 flex-1')}>
        <CornerPad
          label="Point to"
          showName={false}
          split={sides}
          columns="1fr 1fr"
          rows="1fr"
          regions={(['me', 'them'] as const).map((side) => ({
            key: side,
            label: names[side],
            side: side === 'me' ? ('left' as const) : ('right' as const),
            on: point === side,
            bg: side === 'me' ? 'var(--color-side-me)' : 'var(--color-side-them)',
            fg: '#fff',
            onClick: () => onPoint(side),
            data: {
              'data-point-to': names[side],
              'data-point-hint': lit === side ? '' : undefined,
              'data-point-on': point === side ? '' : undefined,
            },
          }))}
        />
      </div>
    )
  }
  return (
    <div className={cn('flex flex-col gap-2', !sides && 'min-h-0 flex-1')}>
      <CornerPad
        label={endLabel}
        showName={false}
        split={sides}
        columns="1fr 1fr"
        rows="1fr 1fr"
        regions={[
          ...PAD_ENDS.map((cell) => ({
            key: cell.end,
            label: cell.label,
            side: cell.end === 'Winner' ? ('left' as const) : ('right' as const),
            on: endOn === cell.end,
            bg: cell.bg,
            fg: '#fff',
            onClick: () => onEnd(cell.end),
            data: { 'data-best-end': cell.end },
            style: { gridColumn: cell.end === 'Winner' ? '1' : '2', gridRow: cell.end === 'Net' ? '2' : '1' },
          })),
          {
            key: 'not-a-shot',
            label: 'Not a shot',
            side: 'left' as const,
            on: false,
            bg: '#475569',
            fg: '#fff',
            onClick: () => {
              if (n < 2 || notShotDim) return
              onNotShot()
            },
            data: { 'data-best-not-shot': '', ...(n < 2 ? { 'data-not-shot-blocked': '' } : {}) },
            style: { gridColumn: '1', gridRow: '2', opacity: n < 2 || notShotDim ? 0.4 : 1 },
          },
        ]}
      />
    </div>
  )
}

type EditRegion = {
  key: string
  label: string
  side: 'left' | 'right'
  on: boolean
  bg: string
  fg: string
  onClick: () => void
  data?: Record<string, string | undefined>
  style?: CSSProperties
}

function blankSlot(key: string, side: 'left' | 'right', col: string, row: string, data: Record<string, string>): EditRegion {
  return {
    key,
    label: '',
    side,
    on: false,
    bg: 'transparent',
    fg: 'transparent',
    onClick: () => {},
    data,
    style: {
      gridColumn: col,
      gridRow: row,
      opacity: 0.35,
      pointerEvents: 'none',
      boxShadow: 'inset 0 0 0 1px var(--color-border)',
    },
  }
}

/**
 * Edit Rally. Two rows of controls, then the same quadrants as tagging.
 * The spare slot is blank except Kim served on shot 1. Out of turn replaces
 * Delete on shot 1 while this rally is a serve break.
 */
export function EditRallyPad({
  draft,
  names,
  stop,
  rallyOne,
  breakRally,
  sides,
  readOnly,
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
  sides: boolean
  readOnly: boolean
  onBack: () => void
  onForward: () => void
  onDelete: () => void
  onKim: () => void
  onOut: () => void
  onServe: (depth: string, wing: Wing) => void
  onStroke: (shot: number, wing: Wing, stroke: 'Attack' | 'Control') => void
  onEnd: (end: BestEnd) => void
  onPointTo: (side: Side) => void
}) {
  const n = draft.contacts.length
  const shot = typeof stop === 'number' ? stop : n
  const dim = readOnly ? 0.4 : 1
  const go = (fn: () => void) => () => {
    if (readOnly) return
    fn()
  }
  const nav = (label: string, side: 'left' | 'right', col: string, run: () => void): EditRegion => ({
    key: label,
    label,
    side,
    on: false,
    bg: '#334155',
    fg: '#fff',
    onClick: run,
    data: { 'data-shot-step': label === 'Back' ? 'back' : 'forward' },
    style: { gridColumn: col, gridRow: '1' },
  })
  const shot1 = stop === 1
  const leftAction: EditRegion = shot1 && breakRally
    ? {
        key: 'out',
        label: 'Out of turn',
        side: 'left',
        on: false,
        bg: '#475569',
        fg: '#fff',
        onClick: go(onOut),
        data: { 'data-shot-out': '' },
        style: { gridColumn: '1', gridRow: '2', opacity: dim },
      }
    : shot1 && n < 2
      ? blankSlot('delete-blank', 'left', '1', '2', { 'data-shot-spare': '' })
      : stop === 'end'
        ? blankSlot('delete-blank', 'left', '1', '2', { 'data-shot-spare': '' })
        : {
            key: 'delete',
            label: 'Delete',
            side: 'left',
            on: false,
            bg: '#b91c1c',
            fg: '#fff',
            onClick: go(onDelete),
            data: { 'data-shot-delete': '' },
            style: { gridColumn: '1', gridRow: '2', opacity: dim },
          }
  const rightAction: EditRegion = shot1
    ? {
        key: 'kim',
        label: `${names[otherSide(draft.server)]} served`,
        side: 'right',
        on: false,
        bg: otherSide(draft.server) === 'me' ? 'var(--color-side-me)' : 'var(--color-side-them)',
        fg: '#fff',
        onClick: go(onKim),
        data: { 'data-shot-kim': '' },
        style: { gridColumn: '2', gridRow: '2', opacity: dim },
      }
    : blankSlot('spare', 'right', '2', '2', { 'data-shot-spare': '' })

  let quads: EditRegion[]
  const phase = stop === 'end' ? padFocus(draft, rallyOne, null) : 'end'
  if (stop === 'end' && phase === 'point') {
    quads = (['me', 'them'] as const).map((side) => ({
      key: side,
      label: names[side],
      side: side === 'me' ? ('left' as const) : ('right' as const),
      on: draft.best?.point === side,
      bg: side === 'me' ? 'var(--color-side-me)' : 'var(--color-side-them)',
      fg: '#fff',
      onClick: go(() => onPointTo(side)),
      data: { 'data-point-to': names[side] },
      style: { gridColumn: side === 'me' ? '1' : '2', gridRow: '3 / span 2', opacity: dim },
    }))
  } else if (stop === 'end') {
    const tagged = winnerOf(draft)
    const pointSide = tagged ? otherSide(tagged) : otherSide(hitterOf(draft.server, Math.max(1, n)))
    const endOn = bestEndOf(draft)
    quads = [
      ...PAD_ENDS.map((cell) => ({
        key: cell.end,
        label: cell.label,
        side: cell.end === 'Winner' ? ('left' as const) : ('right' as const),
        on: endOn === cell.end,
        bg: cell.bg,
        fg: '#fff',
        onClick: go(() => onEnd(cell.end)),
        data: { 'data-best-end': cell.end },
        style: { gridColumn: cell.end === 'Winner' ? '1' : '2', gridRow: cell.end === 'Net' ? '4' : '3', opacity: dim },
      })),
      {
        key: 'point-kim',
        label: `Point to ${names[pointSide]}`,
        side: 'left' as const,
        on: draft.best?.point === pointSide && tagged !== null && draft.best?.point !== tagged,
        bg: '#475569',
        fg: '#fff',
        onClick: go(() => onPointTo(pointSide)),
        data: { 'data-shot-point': names[pointSide] },
        style: { gridColumn: '1', gridRow: '4', opacity: dim },
      },
    ]
  } else if (stop === 1 && n > 1) {
    quads = PAD_SERVE.map((cell) => ({
      key: cell.label,
      label: cell.label,
      side: cell.wing === 'BH' ? ('left' as const) : ('right' as const),
      on: draft.shots[0]?.depth === cell.depth && draft.shots[0]?.wing === cell.wing,
      bg: cell.bg,
      fg: cell.fg,
      onClick: go(() => onServe(cell.depth, cell.wing)),
      data: { 'data-best-serve': cell.label },
      style: {
        gridColumn: cell.wing === 'BH' ? '1' : '2',
        gridRow: cell.depth === 'Long' ? '3' : '4',
        opacity: dim,
      },
    }))
  } else if (typeof stop === 'number' && stop > 1) {
    const saved = draft.shots[stop - 1]
    quads = STROKE_GRID.flat().map((cell) => {
      const tone = PAD_STROKE[`${cell.wing}:${cell.stroke}`]
      return {
        key: `${cell.wing}-${cell.stroke}`,
        label: `${cell.wing} ${cell.stroke}`,
        side: cell.wing === 'BH' ? ('left' as const) : ('right' as const),
        on: saved?.wing === cell.wing && saved?.stroke === cell.stroke,
        bg: tone.bg,
        fg: tone.fg,
        onClick: go(() => onStroke(stop, cell.wing, cell.stroke)),
        data: { 'data-wing': cell.wing, 'data-stroke': cell.stroke },
        style: {
          gridColumn: cell.wing === 'BH' ? '1' : '2',
          gridRow: cell.stroke === 'Attack' ? '3' : '4',
          opacity: dim,
        },
      }
    })
  } else {
    quads = [
      blankSlot('q1', 'left', '1', '3', { 'data-shot-blank': '' }),
      blankSlot('q2', 'right', '2', '3', { 'data-shot-blank': '' }),
      blankSlot('q3', 'left', '1', '4', { 'data-shot-blank': '' }),
      blankSlot('q4', 'right', '2', '4', { 'data-shot-blank': '' }),
    ]
  }

  return (
    <div
      className={cn('relative z-20 flex flex-col', !sides && 'min-h-0 flex-1 gap-2.5 pt-2')}
      data-edit-rally
      data-edit-stop={stop === 'end' ? 'end' : String(stop)}
      data-edit-shot={shot}
      data-pad-sides={sides ? '' : undefined}
    >
      <CornerPad
        label="Edit Rally"
        showName={false}
        split={sides}
        columns="1fr 1fr"
        rows="1fr 1fr 1fr 1fr"
        regions={[nav('Back', 'left', '1', onBack), nav('Forward', 'right', '2', onForward), leftAction, rightAction, ...quads]}
      />
    </div>
  )
}

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
