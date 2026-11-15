import type { ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import {
  ENDINGS,
  MISS_REASONS,
  NUDGE_STEP_S,
  ROLE_LABEL,
  WINGS,
  fieldsFor,
  hitterOf,
  isError,
  markTime,
  patchShot,
  roleOf,
  setEnding,
  stageOf,
  toggleShotField,
  type Draft,
  type Mark,
  type ShotTags,
  type Side,
} from './rally'
import { NO_ATTACK_KEY, PIVOT_KEY, RESULT_KEYS, STROKE_KEYS, WING_KEYS } from './shotKeys'
import { formatClock } from './timeline'

/** A key printed on its control. Desktop only: a phone has no keys. */
export function KeyHint({ k, className }: { k: string; className?: string }) {
  return (
    <kbd
      aria-hidden
      className={cn(
        'hidden lg:inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-sm border border-current/40 font-sans text-[9px] font-bold uppercase leading-none opacity-70',
        className
      )}
    >
      {k}
    </kbd>
  )
}

/** Thumb-sized on a phone, compact with a mouse. */
const chip =
  'h-11 px-3.5 text-sm lg:h-8 lg:px-2.5 lg:text-xs rounded-md border font-semibold inline-flex items-center gap-1.5'

function Pill({
  on,
  onClick,
  children,
  tone = 'brand',
  hint,
  disabled = false,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
  tone?: 'brand' | 'good' | 'bad'
  hint?: string
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
      {hint ? <KeyHint k={hint} /> : null}
    </button>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5 lg:gap-1">{children}</div>
    </div>
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
    'h-11 w-14 lg:h-8 lg:w-16 rounded-md border border-pill-idle-border bg-pill-idle text-xs font-semibold text-primary hover:bg-bg-elevated inline-flex items-center justify-center gap-1.5'
  return (
    <div className="flex items-center gap-2" role="group" aria-label={name}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted flex-1">{name}</p>
      <button type="button" className={step} aria-label="Earlier by 0.1 seconds" onClick={() => onNudge(-NUDGE_STEP_S)}>
        - 0.1
        <KeyHint k="-" />
      </button>
      <span className="w-16 text-center text-sm font-semibold text-primary tabular-nums" data-mark-time>
        {formatClock(markTime(draft, mark), true)}
      </span>
      <button type="button" className={step} aria-label="Later by 0.1 seconds" onClick={() => onNudge(NUDGE_STEP_S)}>
        + 0.1
        <KeyHint k="=" />
      </button>
    </div>
  )
}

const sideBar: Record<Side, string> = { me: 'border-l-side-me', them: 'border-l-side-them' }

/**
 * One shot's tags. The required rows come first (result, wing, stroke), then
 * the optional rows its role allows. Optional rows never block Save.
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
  onNudge: (delta: number) => void
}) {
  const tags: ShotTags = draft.shots[shot - 1] ?? {}
  const fields = fieldsFor(draft, shot)
  const hitter = hitterOf(draft.server, shot)
  const stage = stageOf(draft)
  /** Until the required steps are done, only the row being asked for shows. */
  const requiredOnly = stage !== 'ready'
  /**
   * The wing and stroke row is there from the start, waiting for the result,
   * so picking a result never moves another chip under the pointer.
   */
  const shotRowOff = stage === 'result'
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

  return (
    <div
      className={cn('rounded-md border border-border border-l-4 bg-bg-surface p-3 space-y-3', sideBar[hitter])}
      aria-label={`Shot ${shot}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">
          {shot} · {names[hitter]}
          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-muted">{role}</span>
        </p>
      </div>

      {!requiredOnly ? <TimeRow draft={draft} mark={{ kind: 'shot', shot }} onNudge={onNudge} /> : null}

      {fields.result ? (
        <Row label="Result">
          {ENDINGS.map((e, i) => (
            <Pill
              key={e}
              on={draft.ending === e}
              tone={isError(e) ? 'bad' : 'good'}
              hint={RESULT_KEYS[i]}
              onClick={() => onChange(setEnding(draft, e))}
            >
              {e}
            </Pill>
          ))}
        </Row>
      ) : null}

      {fields.wing ? (
        <Row label="Shot">
          {WINGS.map((w, i) => (
            <Pill key={w} on={tags.wing === w} hint={WING_KEYS[i]} disabled={shotRowOff} onClick={() => set('wing', w)}>
              {w}
            </Pill>
          ))}
          {fields.pivot ? (
            <Pill
              on={Boolean(tags.pivot)}
              hint={PIVOT_KEY}
              disabled={shotRowOff}
              onClick={() => onChange(patchShot(draft, shot, { pivot: !tags.pivot }))}
            >
              Pivot
            </Pill>
          ) : null}
          {fields.strokes ? <span className="w-2" aria-hidden /> : null}
          {fields.strokes?.map((s, i) => (
            <Pill
              key={s}
              on={tags.stroke === s}
              hint={STROKE_KEYS[i]}
              disabled={shotRowOff}
              onClick={() => set('stroke', s)}
            >
              {s}
            </Pill>
          ))}
        </Row>
      ) : null}

      {!requiredOnly ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.spin ? (
            <Row label="Spin">
              {['Under', 'Top', 'Side'].map((v) => (
                <Pill key={v} on={tags.spin === v} onClick={() => set('spin', v)}>
                  {v}
                </Pill>
              ))}
            </Row>
          ) : null}
          {fields.depth ? (
            <Row label="Depth">
              {['Short', 'Half', 'Deep'].map((v) => (
                <Pill key={v} on={tags.depth === v} onClick={() => set('depth', v)}>
                  {v}
                </Pill>
              ))}
            </Row>
          ) : null}
          {fields.contact ? (
            <Row label="Contact">
              {['Over table', 'Off table'].map((v) => (
                <Pill key={v} on={tags.contact === v} onClick={() => set('contact', v)}>
                  {v}
                </Pill>
              ))}
            </Row>
          ) : null}
          {fields.intent ? (
            <Row label="Attributes">
              {['Safe', 'Aggressive'].map((v) => (
                <Pill key={v} on={tags.intent === v} onClick={() => set('intent', v)}>
                  {v}
                </Pill>
              ))}
            </Row>
          ) : null}
          {fields.initiative ? (
            <Row label="Initiative">
              {['Behind', 'Level', 'Ahead'].map((v) => (
                <Pill key={v} on={tags.initiative === v} onClick={() => set('initiative', v)}>
                  {v}
                </Pill>
              ))}
            </Row>
          ) : null}
          {fields.ball ? (
            <Row label="Ball">
              <Pill on={Boolean(tags.high)} onClick={() => onChange(patchShot(draft, shot, { high: !tags.high }))}>
                High
              </Pill>
              <Pill on={Boolean(tags.heavy)} onClick={() => onChange(patchShot(draft, shot, { heavy: !tags.heavy }))}>
                Heavy
              </Pill>
            </Row>
          ) : null}
          <Row label="Tag">
            <Pill
              on={Boolean(tags.review)}
              onClick={() =>
                onChange(patchShot(draft, shot, { review: !tags.review, missReason: undefined }))
              }
            >
              Review
            </Pill>
          </Row>
          {fields.missReason ? (
            <Row label="Miss reason">
              {MISS_REASONS.map((v) => (
                <Pill key={v} on={tags.missReason === v} onClick={() => set('missReason', v)}>
                  {v}
                </Pill>
              ))}
            </Row>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const faTint: Record<Side, string> = {
  me: 'bg-side-me/15 border-side-me/50 text-primary',
  them: 'bg-side-them/15 border-side-them/50 text-primary',
}

/**
 * The first attack, picked where the thumb is: one button per shot it could
 * be, and No attack. Pressing the lit one clears it.
 */
export function FirstAttackRow({
  draft,
  onPick,
  onNoAttack,
}: {
  draft: Draft
  onPick: (shot: number) => void
  onNoAttack: () => void
}) {
  const shots = draft.contacts.map((_, i) => i + 1).slice(1)
  return (
    <div className="rounded-md border border-border bg-bg-surface p-3" role="group" aria-label="First attack">
      <Row label="First attack">
        {shots.map((shot) => (
          <button
            key={shot}
            type="button"
            aria-label={`First attack on shot ${shot}`}
            aria-pressed={draft.fa === shot}
            onClick={() => onPick(shot)}
            className={cn(
              chip,
              'min-w-11 lg:min-w-8 justify-center tabular-nums',
              draft.fa === shot
                ? 'bg-shot-fa text-white border-shot-fa'
                : faTint[hitterOf(draft.server, shot)]
            )}
          >
            {shot}
          </button>
        ))}
        <Pill on={draft.noAttack} tone="bad" hint={NO_ATTACK_KEY} onClick={onNoAttack}>
          No attack
        </Pill>
      </Row>
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
}: {
  draft: Draft
  selected: Mark | null
  onMark: (mark: Mark) => void
}) {
  const marks: { mark: Mark; label: string; hint: string }[] = [
    { mark: { kind: 'start' }, label: 'Start', hint: '[' },
    { mark: { kind: 'end' }, label: 'End', hint: ']' },
  ]
  return (
    <div className="rounded-md border border-border bg-bg-surface p-3" role="group" aria-label="Trim">
      <Row label="Trim">
        {marks.map(({ mark, label, hint }) => (
          <Pill key={label} on={selected?.kind === mark.kind} hint={hint} onClick={() => onMark(mark)}>
            {label} {formatClock(markTime(draft, mark), true)}
          </Pill>
        ))}
      </Row>
    </div>
  )
}
