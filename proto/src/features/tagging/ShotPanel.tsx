import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
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
  statusText,
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

const answerCell =
  'h-8 min-w-10 shrink-0 border px-2.5 text-sm font-semibold inline-flex items-center justify-center whitespace-nowrap'

const MARK_W = { High: 42, Heavy: 51, Review: 56 } as const

function restStyle(): CSSProperties {
  return { backgroundColor: 'var(--tag-cell-rest)', borderColor: 'var(--tag-cell-rest-line)' }
}

function Name({ children }: { children: string }) {
  return <p className="h-3 text-[10px] font-bold uppercase leading-3 tracking-[0.025em] text-muted">{children}</p>
}

function Answer({
  label,
  on,
  onClick,
  tone = 'chosen',
  disabled = false,
  radius = 'rounded-md',
  dim = false,
  side,
  fixed,
}: {
  label: string
  on: boolean
  onClick: () => void
  tone?: 'chosen' | 'error'
  disabled?: boolean
  radius?: string
  dim?: boolean
  side?: StrokeSide
  fixed?: boolean
}) {
  return (
    <button
      type="button"
      data-cell={label}
      data-side={side}
      data-fixed={fixed === undefined ? undefined : fixed ? 'true' : 'false'}
      aria-pressed={on}
      aria-disabled={disabled || dim}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        answerCell,
        radius,
        on
          ? tone === 'error'
            ? 'border-tag-error bg-tag-error text-white'
            : 'border-tag-chosen bg-tag-chosen text-on-accent'
          : 'text-primary',
        dim && 'pointer-events-none opacity-[0.45]'
      )}
      style={on ? undefined : restStyle()}
    >
      {label}
    </button>
  )
}

function Cells({ children }: { children: ReactNode }) {
  return <div className="flex flex-nowrap gap-1.5">{children}</div>
}

/**
 * One shot's tags. The heading, then up to the three sections that shot asks.
 * Result and Miss reason are on End.
 */
export function ShotPanel({
  draft,
  shot,
  names,
  onChange,
  onNudge,
}: {
  draft: Draft
  shot: number
  names: Record<Side, string>
  onChange: (next: Draft) => void
  /** Edit keeps the shot time row. Live tagging does not: the numbers leave no room. */
  onNudge?: (delta: number) => void
}) {
  const tags: ShotTags = draft.shots[shot - 1] ?? {}
  const fields = fieldsFor(draft, shot)
  const hitter = hitterOf(draft.server, shot)
  const stage = stageOf(draft)
  /** Until the required steps are done, only the sections being asked show. */
  const requiredOnly = stage !== 'ready'
  /** Wing and stroke stay put while the result is asked, so a press cannot land on a row that just moved. */
  const shotRowOff = stage === 'result'
  const rule = switchOf(draft, shot)
  const [held, setHeld] = useState<{ shot: number; side: StrokeSide } | null>(null)
  const shown = shownStrokeSide(draft, shot, held?.shot === shot ? held.side : null)
  useEffect(() => bindStrokeSide(shot, shown, (side) => setHeld({ shot, side })), [shot, shown])
  const set = <K extends keyof ShotTags>(key: K, value: ShotTags[K]) =>
    onChange(toggleShotField(draft, shot, key, value))
  const plainRole = roleOf(draft, shot)
  const role = plainRole === 'before' && shot > 2 ? 'Before attack' : ROLE_LABEL[plainRole]
  const onFlip = () => {
    if (rule.fixed || shotRowOff) return
    const next: StrokeSide = shown === 'offensive' ? 'defensive' : 'offensive'
    setHeld({ shot, side: next })
    if (tags.stroke !== 'Block') onChange(flipSwitch(draft, shot))
  }
  const words = requiredOnly ? statusText(draft).replace(/ of shot \d+$/, '') : ''
  const markNames = (plainRole === 'serve' || plainRole === 'before' ? ['High', 'Heavy', 'Review'] : ['Review']) as Array<
    keyof typeof MARK_W
  >
  const markOn = (name: keyof typeof MARK_W) =>
    name === 'High' ? Boolean(tags.high) : name === 'Heavy' ? Boolean(tags.heavy) : Boolean(tags.review)
  const toggleMark = (name: keyof typeof MARK_W) => {
    if (name === 'High') onChange(patchShot(draft, shot, { high: !tags.high }))
    else if (name === 'Heavy') onChange(patchShot(draft, shot, { heavy: !tags.heavy }))
    else onChange(patchShot(draft, shot, { review: !tags.review }))
  }
  const strokes = fields.stroke ? strokeCells(shown, draft.fa === shot).filter((name): name is string => Boolean(name)) : null
  const token = hitter === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)'
  const roleStyle: CSSProperties =
    role === 'First attack'
      ? {
          backgroundColor: 'color-mix(in srgb, var(--color-tag-first-attack) 15%, transparent)',
          color: 'var(--color-tag-first-attack-text)',
        }
      : { backgroundColor: 'var(--color-tag-rest)', color: 'var(--color-text-muted)' }

  return (
    <div className="flex flex-col gap-2.5 pt-2.5" aria-label={`Shot ${shot}`} data-shot-panel>
      <div className="flex h-6 min-w-0 items-center">
        <span className="h-3.5 w-1 shrink-0 rounded-[2px]" style={{ backgroundColor: token }} aria-hidden />
        <p className="ml-1.5 min-w-0 truncate text-sm font-semibold text-primary" data-shot-title>
          {shot} · {names[hitter]}
        </p>
        <span className="ml-2 inline-flex h-[18px] shrink-0 items-center rounded-[4px] px-1.5 text-[10px] font-bold uppercase" style={roleStyle}>
          {role}
        </span>
        {words ? <span className="ml-3 shrink-0 text-sm font-normal text-primary">{words}</span> : null}
        {!requiredOnly ? (
          <div className="ml-auto flex shrink-0 gap-1.5 pl-3">
            {markNames.map((name) => {
              const on = markOn(name)
              return (
                <button
                  key={name}
                  type="button"
                  data-cell={name}
                  aria-pressed={on}
                  onClick={() => toggleMark(name)}
                  className={cn(
                    'inline-flex h-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    on ? 'border-tag-mark-set bg-tag-mark-set text-tag-on-solid' : 'border-border-strong bg-transparent text-primary'
                  )}
                  style={{ width: MARK_W[name] }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {strokes ? (
        <div role="group" aria-label="Stroke" data-row="Stroke" className="flex flex-col">
          <Name>Stroke</Name>
          <div className="flex gap-0.5">
            {(['Offensive', 'Defensive'] as const).map((label) => {
              const on = (label === 'Offensive') === (shown === 'offensive')
              const dim = rule.fixed && !on
              return (
                <Answer
                  key={label}
                  label={label}
                  on={on}
                  disabled={shotRowOff}
                  dim={dim}
                  side={label === 'Offensive' ? 'offensive' : 'defensive'}
                  fixed={rule.fixed}
                  radius={label === 'Offensive' ? 'rounded-l-md rounded-r-none' : 'rounded-r-md rounded-l-none'}
                  onClick={() => {
                    if (!on) onFlip()
                  }}
                />
              )
            })}
          </div>
          <div className="h-1.5" data-stroke-gap />
          <Cells>
            {strokes.map((name) => (
              <Answer
                key={name}
                label={name}
                on={tags.stroke === name}
                disabled={shotRowOff}
                onClick={() => set('stroke', name)}
              />
            ))}
          </Cells>
        </div>
      ) : null}

      {fields.wing ? (
        <div role="group" aria-label="Wing" data-row="Wing">
          <Name>Wing</Name>
          <Cells>
            {WINGS.map((w) => (
              <Answer key={w} label={w} on={tags.wing === w} disabled={shotRowOff} onClick={() => set('wing', w)} />
            ))}
          </Cells>
        </div>
      ) : null}

      {!requiredOnly && fields.depth ? (
        <div role="group" aria-label="Depth" data-row="Depth">
          <Name>Depth</Name>
          <Cells>
            {['Short', 'Half', 'Deep'].map((v) => (
              <Answer key={v} label={v} on={tags.depth === v} onClick={() => set('depth', v)} />
            ))}
          </Cells>
        </div>
      ) : null}

      {!requiredOnly && fields.intent ? (
        <div role="group" aria-label="Intent" data-row="Intent">
          <Name>Intent</Name>
          <Cells>
            {['Safe', 'Neutral', 'Aggressive'].map((v) => (
              <Answer key={v} label={v} on={tags.intent === v} onClick={() => set('intent', v)} />
            ))}
          </Cells>
        </div>
      ) : null}

      {!requiredOnly && fields.initiative ? (
        <div role="group" aria-label="Initiative" data-row="Initiative">
          <Name>Initiative</Name>
          <Cells>
            {['Behind', 'Level', 'Ahead'].map((v) => (
              <Answer key={v} label={v} on={tags.initiative === v} onClick={() => set('initiative', v)} />
            ))}
          </Cells>
        </div>
      ) : null}

      {onNudge && !requiredOnly ? (
        <TimeRow draft={draft} mark={{ kind: 'shot', shot }} onNudge={onNudge} />
      ) : null}
    </div>
  )
}

/**
 * End of the point. The last shot's hitter, then Result, then Miss reason
 * once the rally is ready and the result is an error.
 */
export function EndPanel({
  draft,
  names,
  onChange,
}: {
  draft: Draft
  names: Record<Side, string>
  onChange: (next: Draft) => void
}) {
  const shot = draft.contacts.length
  const hitter = hitterOf(draft.server, shot)
  const tags: ShotTags = draft.shots[shot - 1] ?? {}
  const stage = stageOf(draft)
  const token = hitter === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)'
  const error = isError(draft.ending)
  const roleStyle: CSSProperties = error
    ? {
        backgroundColor: 'color-mix(in srgb, var(--color-tag-error) 15%, transparent)',
        color: 'var(--color-tag-error-text)',
      }
    : { backgroundColor: 'var(--color-tag-rest)', color: 'var(--color-text-muted)' }
  const words = draft.ending && stage !== 'ready' ? statusText(draft).replace(/ of shot \d+$/, '') : ''

  return (
    <div className="flex flex-col gap-2.5 pt-2.5" aria-label="End of the point" data-shot-panel>
      <div className="flex h-6 min-w-0 items-center">
        <span className="h-3.5 w-1 shrink-0 rounded-[2px]" style={{ backgroundColor: token }} aria-hidden />
        <p className="ml-1.5 min-w-0 truncate text-sm font-semibold text-primary" data-shot-title>
          End · {names[hitter]}
        </p>
        {draft.ending ? (
          <span
            className="ml-2 inline-flex h-[18px] shrink-0 items-center rounded-[4px] px-1.5 text-[10px] font-bold uppercase"
            style={roleStyle}
          >
            {error ? 'Error' : 'Winner'}
          </span>
        ) : null}
        {words ? <span className="ml-3 shrink-0 text-sm font-normal text-primary">{words}</span> : null}
      </div>
      <div role="group" aria-label="Result" data-row="Result">
        <Name>Result</Name>
        <Cells>
          {ENDINGS.map((e) => (
            <Answer
              key={e}
              label={e}
              on={draft.ending === e}
              tone={isError(e) ? 'error' : 'chosen'}
              onClick={() => onChange(setEnding(draft, e))}
            />
          ))}
        </Cells>
      </div>
      {stage === 'ready' && error ? (
        <div role="group" aria-label="Miss reason" data-row="Miss reason">
          <Name>Miss reason</Name>
          <Cells>
            {MISS_REASONS.map((v) => (
              <Answer
                key={v}
                label={v}
                on={tags.missReason === v}
                onClick={() => onChange(toggleShotField(draft, shot, 'missReason', v))}
              />
            ))}
          </Cells>
        </div>
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
