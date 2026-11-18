import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import { Answer, AnswerRow, StrokeGrid, restStyle } from './AnswerCells'
import { CornerPad } from './CornerPad'
import {
  BEST_ENDS,
  BEST_SERVE,
  PART_LABEL,
  STROKE_GRID,
  bestEndOf,
  bestHint,
  bestMismatch,
  bestOpener,
  canOpenCell,
  cellMark,
  mismatchLine,
  partsOf,
  padFocus,
  stepShot,
  type AnswerLayout,
  type BestAt,
  type PadBack,
  type BestEnd,
  type BestPart,
} from './bestFlow'
import { hitterOf, type Draft, type Side, type Wing } from './rally'
import { railCell, shotPaint } from './ShotRail'

/** Check is a mode. Amber, so it is not the same fill as the open question. */
function checkingOn(): CSSProperties {
  return { backgroundColor: 'var(--color-warning)', borderColor: 'var(--color-warning)', color: '#0b1220' }
}

/** The worked out Point to: a dashed brand edge on the rest fill, so it never reads as chosen. */
function hinted(): CSSProperties {
  return { ...restStyle(), borderStyle: 'dashed', borderColor: 'var(--color-brand-primary)' }
}

const PART_SHORT: Record<BestPart, string> = { opening: 'Open', rally: 'Rally', attack: 'Att', end: 'End' }

/** Longest label that fits its button, then smaller type, then shorter words. Never spills. */
function PartLabel({ part, marked }: { part: BestPart; marked: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const tries: { text: string; size: number }[] = [
    ...(marked ? [{ text: `⚑ ${PART_LABEL[part]}`, size: 10 }] : []),
    { text: PART_LABEL[part], size: 10 },
    { text: PART_LABEL[part], size: 9 },
    { text: PART_LABEL[part], size: 8 },
    { text: PART_SHORT[part], size: 9 },
    { text: PART_SHORT[part], size: 8 },
    { text: PART_SHORT[part].slice(0, 1), size: 9 },
  ]
  const [pick, setPick] = useState(0)
  const key = `${part}:${marked}`
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

function filled(): CSSProperties {
  return { backgroundColor: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)', color: 'var(--color-on-accent)' }
}

const headButton = 'h-8 shrink-0 rounded-md border px-2 text-xs font-semibold inline-flex items-center justify-center'

/** BH left, FH right. Attack is the strong colour, Control the light one. */
const PAD_STROKE: Record<string, { bg: string; fg: string }> = {
  'BH:Attack': { bg: '#1d4ed8', fg: '#fff' },
  'FH:Attack': { bg: '#c2410c', fg: '#fff' },
  'BH:Control': { bg: '#bfdbfe', fg: '#0b1220' },
  'FH:Control': { bg: '#fed7aa', fg: '#0b1220' },
}

const PAD_SERVE = [
  { label: 'Short', bg: '#0f766e', fg: '#fff' },
  { label: 'Long', bg: '#6d28d9', fg: '#fff' },
] as const

/** Winner takes the left half. Long is top right, In net bottom right. Net is the stored end. */
const PAD_ENDS: { end: BestEnd; label: string; bg: string; style: CSSProperties }[] = [
  { end: 'Winner', label: 'Winner', bg: '#15803d', style: { gridColumn: '1', gridRow: '1 / span 2' } },
  { end: 'Long', label: 'Long', bg: '#b45309', style: { gridColumn: '2', gridRow: '1' } },
  { end: 'Net', label: 'In net', bg: '#b91c1c', style: { gridColumn: '2', gridRow: '2' } },
]

/**
 * The rally, one cell per shot in the hitter's colour. Each cell is the way
 * back to its question. Under the cells, one button per part marks it for review.
 */
export function BestRallyRow({
  draft,
  label,
  at,
  rallyOne,
  saved,
  checking,
  showCheck,
  flash,
  onCell,
  onMinus,
  onCheck,
  onStar,
  onPart,
  onRally,
}: {
  draft: Draft | null
  label: string
  /** The question open now. Null while tapping and on the saved row. */
  at: BestAt | null
  rallyOne: boolean
  saved: boolean
  checking: boolean
  showCheck: boolean
  /** The cell whose contact is on screen during Check, or -1. */
  flash: number
  onCell: (shot: number) => void
  onMinus: (shot: number) => void
  onCheck: () => void
  onStar: () => void
  onPart: (part: BestPart) => void
  onRally: () => void
}) {
  const n = draft?.contacts.length ?? 0
  const closed = Boolean(draft?.closed && n > 0)
  const parts = closed && draft ? partsOf(draft) : []
  const opener = closed && draft ? bestOpener(n, draft.shots, draft.best?.first) : null
  const fa = typeof opener === 'number' ? opener : null
  const showStar = closed || saved
  const tapping = !closed && !saved
  const groupOf = (shot: number) => parts.findIndex((p) => shot >= p.from && shot <= p.to)
  const columns = closed
    ? parts.map((p) => `repeat(${p.to - p.from + 1}, minmax(24px, var(--btn-kind-control)))`).join(' 0px ')
    : `repeat(${n + 1}, minmax(24px, var(--btn-kind-control)))`
  const canDelete = checking && n > 1

  return (
    <div className="flex w-full min-w-0 flex-col gap-1" data-best-rail data-best-saved={saved ? '' : undefined}>
      <div className="flex h-8 min-w-0 items-center gap-1.5">
        {closed && !saved ? (
          <button type="button" data-best-rally className="h-8 shrink-0 rounded-md px-1 text-sm font-semibold text-primary" onClick={onRally}>
            {label}
          </button>
        ) : (
          <span className="shrink-0 px-1 text-sm font-semibold text-primary">{label}</span>
        )}
        {saved ? (
          <span className="shrink-0 rounded-[4px] bg-success/15 px-1.5 text-[10px] font-bold uppercase leading-[18px] text-success" data-best-saved-tag>
            Saved
          </span>
        ) : null}
        <span className="flex-1" />
        {showStar ? (
          <button
            type="button"
            data-best-star="rally"
            aria-label="Highlight"
            aria-pressed={Boolean(draft?.highlight)}
            className={cn(headButton, 'w-8 px-0 text-sm')}
            style={draft?.highlight ? checkingOn() : { ...restStyle(), color: 'var(--color-text)' }}
            onClick={onStar}
          >
            ★
          </button>
        ) : null}
        {showCheck && !saved ? (
          <button
            type="button"
            data-best-check
            aria-pressed={checking}
            aria-label="Check contacts"
            className={headButton}
            style={checking ? checkingOn() : { ...restStyle(), color: 'var(--color-text)' }}
            onClick={onCheck}
          >
            Check
          </button>
        ) : null}
      </div>

      <div
        className="grid min-w-0 justify-start gap-x-1 gap-y-1 overflow-hidden"
        style={{ gridTemplateColumns: columns }}
        data-best-cells
      >
        {draft
          ? draft.contacts.map((_, i) => {
              const shot = i + 1
              const side = hitterOf(draft.server, shot)
              const g = groupOf(shot)
              const mark = closed ? cellMark(draft, shot, rallyOne, at) : null
              const open = mark === 'now'
              const isFa = fa === shot && !open
              const tags = draft.shots[i]
              const enabled = canDelete || (closed && canOpenCell(draft, shot, rallyOne))
              return (
                <button
                  key={shot}
                  type="button"
                  data-best-chip={shot}
                  data-best-mark={mark ?? ''}
                  data-best-minus={canDelete ? shot : undefined}
                  data-best-wing={tags?.wing ?? ''}
                  data-best-stroke={tags?.stroke ?? ''}
                  data-best-flash={flash === i ? '' : undefined}
                  aria-label={canDelete ? `Delete shot ${shot}` : `Shot ${shot}`}
                  aria-current={open ? 'step' : undefined}
                  aria-disabled={!enabled}
                  onClick={() => {
                    if (!enabled) return
                    if (canDelete) onMinus(shot)
                    else onCell(shot)
                  }}
                  className={cn(
                    railCell,
                    'min-w-0 px-0',
                    !enabled && 'cursor-default',
                    isFa && 'border-2',
                    mark === 'todo' && 'border-dashed',
                    mark === 'off' && 'opacity-45',
                    flash === i && 'ring-2 ring-warning'
                  )}
                  style={{
                    ...shotPaint(side, open, isFa, false),
                    gridRow: 1,
                    gridColumn: closed ? shot + g : shot,
                    ...(mark === 'todo' && !isFa
                      ? { borderColor: side === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)' }
                      : {}),
                  }}
                >
                  {shot}
                  {mark === 'done' && !canDelete ? (
                    <span aria-hidden className="absolute right-0.5 top-0 text-[9px] font-bold leading-3" data-best-done>
                      ✓
                    </span>
                  ) : null}
                  {canDelete ? (
                    <span
                      aria-hidden
                      className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[11px] font-bold leading-none text-white"
                    >
                      −
                    </span>
                  ) : null}
                </button>
              )
            })
          : null}
        {tapping ? (
          <span
            aria-hidden
            className={cn(railCell, 'min-w-0 px-0 border-dashed border-border text-muted opacity-60')}
            style={{ gridRow: 1, gridColumn: n + 1 }}
          >
            {n + 1}
          </span>
        ) : null}
        {closed && draft
          ? parts.map((p, g) => {
              const marked = Boolean(draft.best?.review?.includes(p.part))
              return (
                <button
                  key={p.part}
                  type="button"
                  data-best-part={p.part}
                  data-best-review={p.part}
                  data-label={marked ? `⚑ ${PART_LABEL[p.part]}` : PART_LABEL[p.part]}
                  data-from={p.from}
                  data-to={p.to}
                  aria-pressed={marked}
                  aria-label={`${marked ? 'Unmark' : 'Mark'} ${PART_LABEL[p.part]} for review`}
                  className="flex h-7 min-w-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-md border px-0 font-semibold"
                  style={{
                    gridRow: 2,
                    gridColumn: `${p.from + g} / span ${p.to - p.from + 1}`,
                    ...(marked ? filled() : { ...restStyle(), color: 'var(--color-text)' }),
                  }}
                  onClick={() => onPart(p.part)}
                >
                  <PartLabel part={p.part} marked={marked} />
                </button>
              )
            })
          : null}
      </div>
    </div>
  )
}

export type BestFix = 'deleteLast' | 'deleteFirst' | 'check' | 'more' | 'add' | 'switch' | 'keep'

/** The question open now. No step row: the Rally Row is the guide. */
export function BestPanel({
  draft,
  names,
  at,
  rallyOne,
  rallyNo,
  more,
  note,
  layout,
  back,
  onBack,
  onEnd,
  onPoint,
  onServe,
  onServer,
  onStroke,
  onFix,
  onTossInstead,
  onNotShot,
  onDeleteLast,
  sides = false,
}: {
  draft: Draft
  names: Record<Side, string>
  at: BestAt
  rallyOne: boolean
  rallyNo: number
  /** The second fix row is open. */
  more: boolean
  /** A short note under the open question. */
  note: string | null
  layout: AnswerLayout
  /** Corner pad: which result question to show again. Null follows the one still open. */
  back: PadBack
  onBack: (back: PadBack) => void
  onEnd: (end: BestEnd) => void
  onPoint: (side: Side) => void
  onServe: (depth: string) => void
  onServer: () => void
  onStroke: (shot: number, wing: Wing, stroke: 'Attack' | 'Control') => void
  onFix: (fix: BestFix) => void
  onTossInstead: () => void
  onNotShot: () => void
  onDeleteLast: () => void
  /** Landscape pad: quadrant halves sit in the side wings. */
  sides?: boolean
}) {
  const n = draft.contacts.length
  const shot = stepShot(n, at.step, at.page)
  const hitter = hitterOf(draft.server, shot)
  const toolBtn = 'shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted'
  const notShot = (
    <button type="button" className={toolBtn} data-best-not-shot onClick={onNotShot}>
      Not a shot
    </button>
  )
  const deleteLast =
    n >= 2 ? (
      <button type="button" className={toolBtn} data-best-delete-last onClick={onDeleteLast}>
        Delete last
      </button>
    ) : null
  const grid = (k: number, title: string) => {
    const saved = draft.shots[k - 1]
    const cells = STROKE_GRID.map((row) => row.map((c) => ({ ...c, label: `${c.wing} ${c.stroke}` })))
    if (layout === 'pad') {
      return (
        <CornerPad
          shot={k}
          label={title}
          split={sides}
          columns="1fr 1fr"
          rows="1fr 1fr"
          aside={notShot}
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
      <StrokeGrid
        shot={k}
        label={title}
        rows={cells}
        aside={notShot}
        isOn={(c) => saved?.wing === c.wing && saved?.stroke === c.stroke}
        onPick={(c) => onStroke(k, c.wing, c.stroke)}
      />
    )
  }
  const serverSwitch = (
    <button
      type="button"
      role="switch"
      data-best-server={draft.server}
      aria-label={`${names[draft.server]} serving`}
      aria-checked={draft.server === 'them'}
      className="inline-flex h-7 shrink-0 items-center rounded-full border border-border bg-bg-card p-0.5"
      onClick={onServer}
    >
      {(['me', 'them'] as const).map((side) => (
        <span
          key={side}
          className="rounded-full px-2 text-xs font-semibold leading-6"
          style={
            draft.server === side
              ? { backgroundColor: side === 'me' ? 'var(--color-side-me)' : 'var(--color-side-them)', color: '#fff' }
              : { color: 'var(--color-text-muted)' }
          }
        >
          {names[side]}
        </span>
      ))}
    </button>
  )
  const serveAside = (
    <span className="flex shrink-0 items-center gap-1.5">
      {serverSwitch}
      {notShot}
    </span>
  )

  return (
    <div
      className={cn('relative z-20 flex flex-col gap-2.5 pt-2', layout === 'pad' && !sides && 'min-h-0 flex-1')}
      data-best-panel
      data-best-step={at.step}
      data-best-page={at.page ?? ''}
      data-best-rally={rallyNo}
      data-answer-layout={layout}
      data-pad-phase={at.step === 'end' ? padFocus(draft, rallyOne, back) : undefined}
      data-pad-sides={sides ? '' : undefined}
    >
      {at.step === 'end' ? (
        <EndPage
          draft={draft}
          names={names}
          rallyOne={rallyOne}
          more={more}
          note={note}
          layout={layout}
          sides={sides}
          back={back}
          onBack={onBack}
          onEnd={onEnd}
          onPoint={onPoint}
          onFix={onFix}
          aside={n === 1 ? serverSwitch : deleteLast}
        />
      ) : null}

      {at.step === 'serve' ? (
        <div className={cn('flex flex-col gap-2.5', layout === 'pad' && !sides && 'min-h-0 flex-1')}>
          {layout === 'pad' ? (
            <CornerPad
              label={`Serve · ${names[draft.server]}`}
              aside={serveAside}
              split={sides}
              columns="1fr 1fr"
              rows="1fr"
              regions={PAD_SERVE.map((cell) => ({
                key: cell.label,
                label: cell.label,
                side: cell.label === 'Short' ? ('left' as const) : ('right' as const),
                on: draft.shots[0]?.depth === cell.label,
                bg: cell.bg,
                fg: cell.fg,
                onClick: () => onServe(cell.label),
                data: { 'data-best-serve': cell.label },
              }))}
            />
          ) : (
            <AnswerRow label={`Serve · ${names[draft.server]}`} aside={serveAside}>
              {BEST_SERVE.map((label) => (
                <Answer key={label} label={label} on={draft.shots[0]?.depth === label} onClick={() => onServe(label)} data={{ 'data-best-serve': label }} />
              ))}
            </AnswerRow>
          )}
          {draft.best?.cut !== undefined ? (
            <div className="flex items-center gap-2" data-best-toss-offer>
              <p className="text-sm font-semibold text-warning">Shot 1 the toss?</p>
              <Answer label="Delete first instead" on={false} size="sm" onClick={onTossInstead} data={{ 'data-best-toss-instead': '' }} />
            </div>
          ) : null}
          {note ? (
            <p className="text-xs font-semibold text-primary" data-best-serve-note>
              {note}
            </p>
          ) : null}
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
  more,
  note,
  layout,
  sides,
  back,
  onBack,
  onEnd,
  onPoint,
  onFix,
  aside,
}: {
  draft: Draft
  names: Record<Side, string>
  rallyOne: boolean
  more: boolean
  note: string | null
  layout: AnswerLayout
  sides: boolean
  back: PadBack
  onBack: (back: PadBack) => void
  onEnd: (end: BestEnd) => void
  onPoint: (side: Side) => void
  onFix: (fix: BestFix) => void
  aside: ReactNode
}) {
  const n = draft.contacts.length
  const last = hitterOf(draft.server, n)
  const endOn = bestEndOf(draft)
  const lit = draft.ending ? bestHint(draft, rallyOne) : null
  const mismatch = bestMismatch(draft, rallyOne)
  const point = draft.best?.point
  const phase = padFocus(draft, rallyOne, back)
  const endLabel = `End · ${names[last]}`
  const noteLine = note ? (
    <p className="shrink-0 text-xs font-semibold text-primary" data-best-end-note>
      {note}
    </p>
  ) : null
  const fixes: [BestFix, string][] = n < 2 ? [] : [['deleteFirst', 'Delete first'], ['check', 'Check'], ['more', 'More']]
  const moreFixes: [BestFix, string][] = [['add', 'Add missed'], ['switch', 'Switch server'], ['keep', 'Keep as is']]
  const mismatchBlock = mismatch ? (
    <div className="flex flex-col gap-1.5" data-best-mismatch>
      <p className="text-sm font-semibold leading-4 text-warning" data-best-line>
        {mismatchLine(draft, names)}
      </p>
      {fixes.length ? (
        <div className="flex flex-nowrap gap-1.5 overflow-hidden" data-best-fixes>
          {fixes.map(([fix, label]) => (
            <Answer
              key={fix}
              label={label}
              on={false}
              className={fix === 'more' ? 'min-w-0 px-2' : undefined}
              onClick={() => onFix(fix)}
              data={{ 'data-best-fix': fix, 'aria-expanded': fix === 'more' ? String(more) : undefined }}
            />
          ))}
        </div>
      ) : null}
      {more ? (
        <div className="flex flex-nowrap gap-1.5 overflow-hidden" data-best-more>
          {moreFixes.map(([fix, label]) => (
            <Answer key={fix} label={label} on={false} onClick={() => onFix(fix)} data={{ 'data-best-fix': fix }} />
          ))}
        </div>
      ) : null}
    </div>
  ) : null
  if (phase === 'point') {
    const backEnd = draft.ending ? (
      <button type="button" className="shrink-0 text-xs font-semibold text-primary" data-pad-back="end" onClick={() => onBack('end')}>
        {endOn === 'Net' ? 'In net' : (endOn ?? 'End')}
      </button>
    ) : null
    if (layout === 'pad') {
      return (
        <div className={cn('flex flex-col gap-2', !sides && 'min-h-0 flex-1')}>
          <CornerPad
            label="Point to"
            split={sides}
            aside={backEnd}
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
          {noteLine}
          {mismatchBlock}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        <AnswerRow label="Point to" aside={backEnd}>
          {(['me', 'them'] as const).map((side) => (
            <Answer
              key={side}
              label={names[side]}
              on={point === side}
              style={lit === side ? hinted() : undefined}
              onClick={() => onPoint(side)}
              data={{ 'data-point-to': names[side], 'data-point-hint': lit === side ? '' : undefined, 'data-point-on': point === side ? '' : undefined }}
            />
          ))}
        </AnswerRow>
        {noteLine}
        {mismatchBlock}
      </div>
    )
  }
  if (layout === 'pad') {
    return (
      <div className={cn('flex flex-col gap-2', !sides && 'min-h-0 flex-1')}>
        <CornerPad
          label={endLabel}
          split={sides}
          aside={aside}
          columns="1fr 1fr"
          rows="1fr 1fr"
          regions={PAD_ENDS.map((cell) => ({
            key: cell.end,
            label: cell.label,
            side: cell.end === 'Winner' ? ('left' as const) : ('right' as const),
            on: endOn === cell.end,
            bg: cell.bg,
            fg: '#fff',
            onClick: () => onEnd(cell.end),
            data: { 'data-best-end': cell.end },
            style: cell.style,
          }))}
        />
        {noteLine}
        {mismatchBlock}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <AnswerRow label={endLabel} aside={aside}>
        {BEST_ENDS.map((label) => (
          <Answer
            key={label}
            label={label}
            on={endOn === label}
            tone={label === 'Winner' ? 'chosen' : 'error'}
            onClick={() => onEnd(label)}
            data={{ 'data-best-end': label }}
          />
        ))}
      </AnswerRow>
      {noteLine}
      {mismatchBlock}
    </div>
  )
}
