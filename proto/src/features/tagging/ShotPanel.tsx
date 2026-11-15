import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import {
  ENDINGS,
  MISS_REASONS,
  NUDGE_STEP_S,
  ROLE_LABEL,
  WINGS,
  fieldsFor,
  flipSwitch,
  hitterOf,
  isError,
  markTime,
  patchShot,
  roleOf,
  setEnding,
  stageOf,
  strokeCells,
  switchOf,
  toggleShotField,
  type Draft,
  type Mark,
  type ShotTags,
  type Side,
  type StrokeSide,
} from './rally'
import { bindStrokeSide, shownStrokeSide } from './shotKeys'
import { formatClock } from './timeline'

/** Height comes from the control kind. A mouse is 36, a finger is 44. */
const chip =
  'btn-kind-control px-3.5 text-sm lg:px-2.5 lg:text-xs rounded-md border font-semibold inline-flex items-center gap-1.5'

function Pill({
  on,
  onClick,
  children,
  tone = 'brand',
  disabled = false,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
  tone?: 'brand' | 'good' | 'bad'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        chip,
        'disabled:opacity-40 disabled:hover:bg-pill-idle',
        on
          ? tone === 'good'
            ? 'bg-success text-white border-success'
            : tone === 'bad'
              ? 'bg-danger text-white border-danger'
              : 'bg-brand-primary text-on-accent border-brand-primary'
          : 'bg-pill-idle border-pill-idle-border text-primary hover:bg-bg-elevated'
      )}
    >
      {children}
    </button>
  )
}

/** Step a mark's time by a tenth of a second. The video loops around it. */
export function TimeRow({
  draft,
  mark,
  onNudge,
}: {
  draft: Draft
  mark: Mark
  onNudge: (delta: number) => void
}) {
  const name =
    mark.kind === 'start' ? 'Rally start' : mark.kind === 'end' ? 'Rally end' : `Shot ${mark.shot} time`
  const step =
    'btn-kind-control w-14 rounded-md border border-pill-idle-border bg-pill-idle text-xs font-semibold text-primary hover:bg-bg-elevated inline-flex items-center justify-center gap-1.5'
  return (
    <div className="flex items-center gap-2" role="group" aria-label={name}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted flex-1">{name}</p>
      <button type="button" className={step} aria-label="Earlier by 0.1 seconds" onClick={() => onNudge(-NUDGE_STEP_S)}>
        - 0.1
      </button>
      <span className="w-16 text-center text-sm font-semibold text-primary tabular-nums" data-mark-time>
        {formatClock(markTime(draft, mark), true)}
      </span>
      <button type="button" className={step} aria-label="Later by 0.1 seconds" onClick={() => onNudge(NUDGE_STEP_S)}>
        + 0.1
      </button>
    </div>
  )
}

const sideBar: Record<Side, string> = { me: 'border-l-side-me', them: 'border-l-side-them' }

/** Equal cells, one line, full text size. Height comes from the control kind. */
const cell =
  'btn-kind-control min-w-0 flex-1 basis-0 px-0 gap-1 text-sm font-semibold rounded-md border inline-flex items-center justify-center whitespace-nowrap overflow-hidden'

/**
 * Switch words. Both fit a 76px cell at 375, full text size, so the long names stay.
 * Stroke cells share what is left.
 */
const SWITCH_WORD: Record<StrokeSide, string> = { offensive: 'Offensive', defensive: 'Defensive' }
const SWITCH_BASIS = '76px'

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} data-row={label} className="flex gap-1">
      {children}
    </div>
  )
}

function Cell({
  on,
  onClick,
  children,
  tone = 'brand',
  disabled = false,
  label,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
  tone?: 'brand' | 'good' | 'bad'
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      data-cell={label}
      className={cn(
        cell,
        'disabled:pointer-events-none',
        on
          ? tone === 'good'
            ? 'bg-success text-white border-success'
            : tone === 'bad'
              ? 'bg-danger text-white border-danger'
              : 'bg-brand-primary text-on-accent border-brand-primary'
          : 'bg-pill-idle border-pill-idle-border text-primary'
      )}
    >
      <span data-cell-label>{children}</span>
    </button>
  )
}

/**
 * One shot's tags. One line per row, equal cells, no headings.
 * Order: result, wing, stroke, the extras for that shot, miss reason, then Review and the shot time.
 */
export function ShotPanel({
  draft,
  shot,
  names,
  onChange,
  onNudge,
  fit = 'all',
}: {
  draft: Draft
  shot: number
  names: Record<Side, string>
  onChange: (next: Draft) => void
  onNudge: (delta: number) => void
  /** Six rows when the box has the room, otherwise the first three and More. */
  fit?: 'all' | 'three'
}) {
  const tags: ShotTags = draft.shots[shot - 1] ?? {}
  const fields = fieldsFor(draft, shot)
  const hitter = hitterOf(draft.server, shot)
  const stage = stageOf(draft)
  /** Until the required steps are done, only the rows being asked show. */
  const requiredOnly = stage !== 'ready'
  /** Wing and stroke stay put while the result is asked, so a press cannot land on a row that just moved. */
  const shotRowOff = stage === 'result'
  const rule = switchOf(draft, shot)
  const [held, setHeld] = useState<{ shot: number; side: StrokeSide } | null>(null)
  const [more, setMore] = useState(false)
  useEffect(() => setMore(false), [shot, fit])
  const shown = shownStrokeSide(draft, shot, held?.shot === shot ? held.side : null)
  useEffect(() => bindStrokeSide(shot, shown, (side) => setHeld({ shot, side })), [shot, shown])
  const set = <K extends keyof ShotTags>(key: K, value: ShotTags[K]) =>
    onChange(toggleShotField(draft, shot, key, value))
  const isEnd = shot === draft.contacts.length
  const plainRole = roleOf(draft, shot)
  const role = isEnd
    ? draft.ending
      ? isError(draft.ending)
        ? 'Error'
        : 'Winner'
      : 'End shot'
    : plainRole === 'before' && shot > 2
      ? 'Before attack'
      : ROLE_LABEL[plainRole]
  const word = SWITCH_WORD[shown]
  const onFlip = () => {
    if (rule.fixed || shotRowOff) return
    const next: StrokeSide = shown === 'offensive' ? 'defensive' : 'offensive'
    setHeld({ shot, side: next })
    if (tags.stroke !== 'Block') onChange(flipSwitch(draft, shot))
  }

  const choice = (label: string, on: boolean, onClick: () => void) => ({ label, on, onClick })
  const spin = ['Under', 'Top', 'Side'].map((v) => choice(v, tags.spin === v, () => set('spin', v)))
  const depth = ['Short', 'Half', 'Deep'].map((v) => choice(v, tags.depth === v, () => set('depth', v)))
  const ball = [
    choice('High', Boolean(tags.high), () => onChange(patchShot(draft, shot, { high: !tags.high }))),
    choice('Heavy', Boolean(tags.heavy), () => onChange(patchShot(draft, shot, { heavy: !tags.heavy }))),
  ]
  const extras: { label: string; cells: { label: string; on: boolean; onClick: () => void }[] }[] = []
  if (fields.spin && fields.depth) extras.push({ label: 'Serve', cells: [...spin, ...depth] })
  else if (fields.spin) extras.push({ label: 'Spin', cells: spin })
  if (fields.depth && fields.ball && !fields.spin) extras.push({ label: 'Depth', cells: [...depth, ...ball] })
  else if (fields.depth && !fields.spin) extras.push({ label: 'Depth', cells: depth })
  if (fields.ball && !(fields.depth && !fields.spin)) extras.push({ label: 'Ball', cells: ball })
  if (fields.contact || fields.intent) {
    const cells = [
      ...(fields.contact
        ? ['Over table', 'Off table'].map((v) => choice(v, tags.contact === v, () => set('contact', v)))
        : []),
      ...(fields.intent
        ? ['Safe', 'Aggressive'].map((v) => choice(v, tags.intent === v, () => set('intent', v)))
        : []),
    ]
    extras.push({ label: 'Contact', cells })
  }
  if (fields.initiative) {
    extras.push({
      label: 'Initiative',
      cells: ['Behind', 'Level', 'Ahead'].map((v) => choice(v, tags.initiative === v, () => set('initiative', v))),
    })
  }
  const strokes = fields.stroke ? strokeCells(shown, draft.fa === shot) : null
  const primaryRows = (fields.result ? 1 : 0) + (fields.wing ? 1 : 0) + (strokes ? 1 : 0)
  const extraRows = requiredOnly ? 0 : extras.length + (fields.missReason ? 1 : 0) + 1
  const paged = fit === 'three' && primaryRows + extraRows > 3
  const page = paged ? (more ? 'rest' : 'first') : 'all'

  return (
    <div
      className={cn(
        'rounded-md border border-border border-l-4 bg-bg-surface p-3 flex flex-col gap-1.5',
        sideBar[hitter]
      )}
      aria-label={`Shot ${shot}`}
      data-shot-panel
      data-page={page}
    >
      <p className="text-sm font-semibold text-primary" data-shot-title>
        {shot} · {names[hitter]}
        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-muted">{role}</span>
      </p>

      {fields.result ? (
        <Line label="Result">
          {ENDINGS.map((e) => (
            <Cell
              key={e}
              label={e}
              on={draft.ending === e}
              tone={isError(e) ? 'bad' : 'good'}
              onClick={() => onChange(setEnding(draft, e))}
            >
              {e}
            </Cell>
          ))}
        </Line>
      ) : null}

      {fields.wing ? (
        <Line label="Wing">
          {WINGS.map((w) => (
            <Cell
              key={w}
              label={w}
              on={tags.wing === w}
              disabled={shotRowOff}
              onClick={() => set('wing', w)}
            >
              {w}
            </Cell>
          ))}
          {fields.pivot ? (
            <Cell
              label="Pivot"
              on={Boolean(tags.pivot)}
              disabled={shotRowOff}
              onClick={() => onChange(patchShot(draft, shot, { pivot: !tags.pivot }))}
            >
              Pivot
            </Cell>
          ) : null}
        </Line>
      ) : null}

      {strokes ? (
        <Line label="Stroke">
          <button
            type="button"
            data-cell={word}
            data-side={shown}
            data-fixed={rule.fixed ? 'true' : 'false'}
            aria-disabled={rule.fixed || shotRowOff}
            onClick={onFlip}
            className={cn(
              'btn-kind-control shrink-0 px-1 gap-1 text-sm font-semibold rounded-md border inline-flex items-center justify-center whitespace-nowrap overflow-hidden text-white',
              shown === 'offensive' ? 'bg-shot-fa border-shot-fa' : 'bg-info border-info'
            )}
            style={{ flex: '0 0 auto', minWidth: SWITCH_BASIS }}
          >
            <span data-cell-label>{word}</span>
          </button>
          {strokes.map((name, i) =>
            name ? (
              <Cell
                key={i}
                label={name}
                on={tags.stroke === name}
                disabled={shotRowOff}
                onClick={() => set('stroke', name)}
              >
                {name}
              </Cell>
            ) : (
              <span
                key={i}
                className="btn-kind-control min-w-0 flex-1 basis-0 border border-transparent"
                data-cell=""
                aria-hidden
              />
            )
          )}
        </Line>
      ) : null}

      {!requiredOnly
        ? extras.map((row) => (
            <Line key={row.label} label={row.label}>
              {row.cells.map((c) => (
                <Cell key={c.label} label={c.label} on={c.on} onClick={c.onClick}>
                  {c.label}
                </Cell>
              ))}
            </Line>
          ))
        : null}

      {!requiredOnly && fields.missReason ? (
        <Line label="Miss reason">
          {MISS_REASONS.map((v) => (
            <Cell key={v} label={v} on={tags.missReason === v} onClick={() => set('missReason', v)}>
              {v}
            </Cell>
          ))}
        </Line>
      ) : null}

      {!requiredOnly ? (
        <Line label="Review">
          <Cell
            label="Review"
            on={Boolean(tags.review)}
            onClick={() => onChange(patchShot(draft, shot, { review: !tags.review, missReason: undefined }))}
          >
            Review
          </Cell>
          <Cell label="- 0.1" on={false} onClick={() => onNudge(-NUDGE_STEP_S)}>
            - 0.1
          </Cell>
          <span
            className="btn-kind-control min-w-0 flex-1 basis-0 px-0 text-sm font-semibold rounded-md border border-pill-idle-border bg-pill-idle inline-flex items-center justify-center whitespace-nowrap overflow-hidden tabular-nums text-primary"
            data-cell="time"
          >
            <span data-cell-label>{formatClock(markTime(draft, { kind: 'shot', shot }), true)}</span>
          </span>
          <Cell label="+ 0.1" on={false} onClick={() => onNudge(NUDGE_STEP_S)}>
            + 0.1
          </Cell>
        </Line>
      ) : null}
      {paged ? (
        <button
          type="button"
          className="btn-kind-control w-full rounded-md border border-pill-idle-border bg-pill-idle text-sm font-semibold text-primary"
          data-more-rows
          aria-expanded={more}
          onClick={() => setMore((open) => !open)}
        >
          {more ? 'Less' : 'More'}
        </button>
      ) : null}
    </div>
  )
}

/**
 * Trim, for a saved rally: where its play starts and ends, for loops and
 * reels. Picking one opens its time row; the video loops around it.
 */
export function TrimRow({
  draft,
  selected,
  onMark,
  action,
}: {
  draft: Draft
  selected: Mark | null
  onMark: (mark: Mark) => void
  /** Sits at the end of the line: Delete rally. */
  action?: ReactNode
}) {
  const marks: { mark: Mark; label: string }[] = [
    { mark: { kind: 'start' }, label: 'Start' },
    { mark: { kind: 'end' }, label: 'End' },
  ]
  return (
    <div className="rounded-md border border-border bg-bg-surface p-3" role="group" aria-label="Trim">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">Trim</p>
      {/* One line of equal cells: Start, End, then Delete rally. It never wraps. */}
      <div className="flex gap-1.5 lg:gap-1 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:justify-center [&>*]:px-1 [&>*]:whitespace-nowrap">
        {marks.map(({ mark, label }) => (
          <Pill key={label} on={selected?.kind === mark.kind} onClick={() => onMark(mark)}>
            {label} {formatClock(markTime(draft, mark), true)}
          </Pill>
        ))}
        {action}
      </div>
    </div>
  )
}
