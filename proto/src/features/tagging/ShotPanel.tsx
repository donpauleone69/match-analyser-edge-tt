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
import { formatClock } from './timeline'

function Pill({
  on,
  onClick,
  children,
  tone = 'brand',
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
  tone?: 'brand' | 'good' | 'bad'
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'h-8 px-2.5 rounded-md border text-xs font-semibold',
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
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
    'h-8 w-12 rounded-md border border-pill-idle-border bg-pill-idle text-xs font-semibold text-primary hover:bg-bg-elevated'
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
  const showShotRow = !(stage === 'result')
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
          {ENDINGS.map((e) => (
            <Pill
              key={e}
              on={draft.ending === e}
              tone={isError(e) ? 'bad' : 'good'}
              onClick={() => onChange(setEnding(draft, e))}
            >
              {e}
            </Pill>
          ))}
        </Row>
      ) : null}

      {fields.wing && showShotRow ? (
        <Row label="Shot">
          {WINGS.map((w) => (
            <Pill key={w} on={tags.wing === w} onClick={() => set('wing', w)}>
              {w}
            </Pill>
          ))}
          {fields.pivot ? (
            <Pill on={Boolean(tags.pivot)} onClick={() => onChange(patchShot(draft, shot, { pivot: !tags.pivot }))}>
              Pivot
            </Pill>
          ) : null}
          {fields.strokes ? <span className="w-2" aria-hidden /> : null}
          {fields.strokes?.map((s) => (
            <Pill key={s} on={tags.stroke === s} onClick={() => set('stroke', s)}>
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
              {['Short', 'Half', 'Long'].map((v) => (
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
