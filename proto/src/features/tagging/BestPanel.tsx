import { type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import {
  BEST_ENDS,
  BEST_SERVE,
  BEST_SHOTS,
  PART_LABEL,
  STEP_LABEL,
  bestEndOf,
  finishShowsStroke,
  asksWhoFirst,
  firstAttackShot,
  stepAnswered,
  stepOpen,
  stepsFor,
  type BestEnd,
  type BestPartSpan,
  type BestStep,
  type MiddleAnswer,
} from './bestFlow'
import { hitterOf, winnerOf, type BestPart, type Draft, type Side, type Wing } from './rally'

const cell =
  'h-8 shrink-0 rounded-md border px-2 text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap'

const caption = 'text-[9px] font-bold uppercase tracking-wide leading-4 text-muted'

function rest(): CSSProperties {
  return { backgroundColor: 'var(--tag-cell-rest)', borderColor: 'var(--tag-cell-rest-line)', color: 'var(--color-text)' }
}

function chosen(): CSSProperties {
  return {
    backgroundColor: 'var(--color-brand-primary)',
    borderColor: 'var(--color-brand-primary)',
    color: 'var(--color-on-accent)',
  }
}

/** Check is a mode. Amber, so it is not the same fill as the open step. */
function checkingOn(): CSSProperties {
  return {
    backgroundColor: 'var(--color-warning)',
    borderColor: 'var(--color-warning)',
    color: '#0b1220',
  }
}

function endTone(kind: 'win' | 'err', on: boolean): CSSProperties {
  const color = kind === 'win' ? 'var(--color-success)' : 'var(--color-danger)'
  if (on) return { backgroundColor: color, borderColor: color, color: kind === 'win' ? '#0b1220' : '#fff' }
  return {
    backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
    color: 'var(--color-text)',
  }
}

/** A calculated Point to. An outline and a tint, stronger than a resting cell, and not the filled selected style. */
function hinted(): CSSProperties {
  return {
    backgroundColor: 'color-mix(in srgb, var(--color-brand-primary) 32%, var(--tag-cell-rest))',
    borderColor: 'var(--color-brand-primary)',
    boxShadow: 'inset 0 0 0 2px var(--color-brand-primary)',
    color: 'var(--color-text)',
  }
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} data-row={label} className="flex flex-col gap-0.5">
      <span className={caption}>{label}</span>
      <div className="flex flex-nowrap items-center gap-1">{children}</div>
    </div>
  )
}

function Choice({
  label,
  on,
  onClick,
  data,
  className,
  tone,
}: {
  label: string
  on: boolean
  onClick: () => void
  data?: Record<string, string>
  className?: string
  tone?: 'win' | 'err'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(cell, className)}
      style={tone ? endTone(tone, on) : on ? chosen() : rest()}
      aria-pressed={on}
      {...data}
    >
      {label}
    </button>
  )
}

/** The rally as a picture of the shots. Chips are not controls. */
export function BestRallyRow({
  draft,
  flash,
  showStar,
  label = 'Rally',
  onRally,
  onCheck,
  checking,
  showCheck,
  onMinus,
  onStar,
  toss,
  parts,
}: {
  draft: Draft | null
  flash: number
  showStar: boolean
  label?: string
  onRally?: () => void
  onCheck?: () => void
  checking?: boolean
  /** Check while contacts are still being tapped, and after they are committed. */
  showCheck?: boolean
  /** While Check is on, each chip can delete that contact. */
  onMinus?: (shot: number) => void
  onStar?: () => void
  /** Shot 1 may be a toss. A suggestion after an end contact was removed. */
  toss?: boolean
  /** The same array the review row uses. Ignored until the rally closes. */
  parts: BestPartSpan[]
}) {
  const flow = draft?.best?.flow
  const found = flow === 'bestfa' && draft ? firstAttackShot(draft.shots) : null
  const fa = found && draft && flow === 'bestfa' && asksWhoFirst(flow, draft.contacts.length, found) ? null : found
  const withCheck = Boolean(onCheck && (showStar || showCheck))
  const grouped = Boolean(draft?.closed && parts.length > 0)
  const chip = (i: number) => {
    if (!draft) return null
    const shot = i + 1
    const side = hitterOf(draft.server, shot)
    const flagged = Boolean(toss && shot === 1)
    const canDelete = Boolean(onMinus && draft.contacts.length > 1 && (checking || flagged))
    const tags = draft.shots[i]
    const paint = {
      backgroundColor: `color-mix(in srgb, ${side === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)'} 15%, transparent)`,
      borderColor: `color-mix(in srgb, ${side === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)'} 50%, transparent)`,
      color: 'var(--color-text)',
    }
    const look = cn(
      'relative flex shrink-0 flex-col items-center justify-center rounded-md border text-[10px] font-bold leading-none tabular-nums',
      canDelete ? 'h-9 min-w-9' : 'h-7 min-w-7',
      flagged ? 'w-auto px-0.5' : canDelete ? 'w-9' : 'w-7',
      flash === i && 'ring-2 ring-warning',
      flagged && flash !== i && 'ring-2 ring-warning',
      fa === shot && flash !== i && !flagged && 'ring-2 ring-[var(--color-tag-first-attack)]'
    )
    const body = (
      <>
        <span>{shot}</span>
        {flagged ? <span className="text-[8px] font-bold leading-none text-warning">toss?</span> : null}
        {canDelete ? (
          <span
            aria-hidden
            className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[11px] font-bold leading-none text-white"
          >
            −
          </span>
        ) : null}
      </>
    )
    if (!canDelete) {
      return (
        <div
          key={shot}
          data-best-chip={shot}
          data-best-toss={flagged ? '' : undefined}
          data-best-wing={tags?.wing ?? ''}
          data-best-stroke={tags?.stroke ?? ''}
          data-best-flash={flash === i ? '' : undefined}
          className={look}
          style={paint}
        >
          {body}
        </div>
      )
    }
    return (
      <button
        key={shot}
        type="button"
        data-best-chip={shot}
        data-best-minus={shot}
        data-best-toss={flagged ? '' : undefined}
        data-best-wing={tags?.wing ?? ''}
        data-best-stroke={tags?.stroke ?? ''}
        data-best-flash={flash === i ? '' : undefined}
        aria-label={`Delete shot ${shot}`}
        className={look}
        style={paint}
        onClick={() => onMinus?.(shot)}
      >
        {body}
      </button>
    )
  }
  return (
    <div
      className="grid w-full min-w-0 items-start gap-x-1"
      style={{
        gridTemplateColumns: withCheck
          ? showStar
            ? 'auto auto minmax(0,1fr) auto'
            : 'auto auto minmax(0,1fr)'
          : showStar
            ? 'auto minmax(0,1fr) auto'
            : 'auto minmax(0,1fr)',
      }}
      data-best-rail
    >
      {showStar ? (
        <button
          type="button"
          data-best-rally
          className="h-8 shrink-0 rounded-md px-1.5 text-xs font-semibold text-primary"
          onClick={onRally}
        >
          {label}
        </button>
      ) : (
        <span className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase text-muted">{label}</span>
      )}
      {withCheck ? (
        <button
          type="button"
          data-best-check
          aria-pressed={checking}
          aria-label="Check contacts"
          className={cn(cell, 'flex-none px-2')}
          style={checking ? checkingOn() : rest()}
          onClick={onCheck}
        >
          Check
        </button>
      ) : null}
      <div className={cn('flex min-w-0 flex-wrap content-start py-0.5', grouped ? 'gap-2' : 'gap-0.5')}>
        {grouped && draft
          ? parts.map((group) => {
              const marked = Boolean(draft.best?.review?.includes(group.part))
              const ink = marked ? 'var(--color-brand-primary)' : undefined
              return (
                <div
                  key={group.part}
                  data-best-part={group.part}
                  data-from={group.from}
                  data-to={group.to}
                  className="flex w-fit max-w-full flex-col items-start"
                >
                  <div className="flex max-w-full flex-col">
                    <div className="flex flex-wrap gap-0.5">
                      {draft.contacts.map((_, i) => (i + 1 >= group.from && i + 1 <= group.to ? chip(i) : null))}
                    </div>
                    <div
                      className="mt-0.5 h-0.5 w-full rounded-full"
                      style={{ backgroundColor: ink ?? 'var(--tag-cell-rest-line)' }}
                    />
                  </div>
                  <span
                    className="whitespace-nowrap text-left text-[8px] font-semibold leading-none text-muted"
                    style={ink ? { color: ink } : undefined}
                  >
                    {PART_LABEL[group.part]}
                  </span>
                </div>
              )
            })
          : draft
            ? draft.contacts.map((_, i) => chip(i))
            : null}
      </div>
      {showStar && onStar ? (
        <button
          type="button"
          data-best-star="rally"
          aria-label="Highlight"
          aria-pressed={Boolean(draft?.highlight)}
          className="h-8 w-8 shrink-0 rounded-md border text-sm"
          style={draft?.highlight ? { backgroundColor: 'var(--color-warning)', borderColor: 'var(--color-warning)', color: '#0b1220' } : rest()}
          onClick={onStar}
        >
          ★
        </button>
      ) : null}
    </div>
  )
}

/** Steps, then the row for the step that is open. */
export function BestPanel({
  draft,
  names,
  step,
  rallyOne,
  rallyNo,
  showFirst,
  mismatch,
  onStep,
  onServe,
  onServer,
  onStroke,
  onEnding,
  onPoint,
  onStar,
  onFirst,
  onFix,
  endNote,
  tossWatch,
  serveNote,
  openSteps,
  parts,
  onMiddle,
  onReview,
}: {
  draft: Draft
  names: Record<Side, string>
  step: BestStep
  rallyOne: boolean
  rallyNo: number
  showFirst: boolean
  mismatch: boolean
  onStep: (step: BestStep) => void
  onServe: (depth: string) => void
  onServer: () => void
  onStroke: (shot: number, wing: Wing, stroke: string) => void
  onEnding: (ending: BestEnd) => void
  onPoint: (side: Side) => void
  onStar: () => void
  onFirst: (name: string) => void
  onMiddle: (side: MiddleAnswer) => void
  onReview: (part: BestPart) => void
  onFix: (action: 'check' | 'add' | 'switch' | 'keep') => void
  /** The same array the Rally Row uses. */
  parts: BestPartSpan[]
  endNote?: string | null
  /** After an end contact was removed: the serve loop is playing and shot 1 may be a toss. */
  tossWatch?: boolean
  /** The serve length left with a deleted contact. */
  serveNote?: string | null
  /** Step tabs stay open so the glance can go straight to the next question. */
  openSteps?: boolean
}) {
  const n = draft.contacts.length
  const steps = stepsFor(draft)
  const lit = rallyOne ? null : winnerOf(draft)
  const endOn = bestEndOf(draft)
  const strokeShot = step === 'receive' ? 2 : step === 'third' ? 3 : step === 'finish' && finishShowsStroke(n) ? n : 0
  const who = [names.me, names.them, 'Nobody']

  return (
    <div className="relative z-20 flex flex-col gap-1 pt-1.5" data-best-panel data-best-step={step} data-best-rally={rallyNo}>
      <div className="flex flex-nowrap gap-1" role="tablist" aria-label="Steps">
        {steps.map((name) => {
          const done = stepAnswered(draft, name)
          const on = name === step
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={on}
              data-best-step={name}
              data-best-done={done ? '' : undefined}
              disabled={!stepOpen(draft, name, step, openSteps)}
              onClick={() => onStep(name)}
              className={cn(cell, 'disabled:opacity-40')}
              style={on ? chosen() : rest()}
            >
              {done ? `✓ ${STEP_LABEL[name]}` : STEP_LABEL[name]}
            </button>
          )
        })}
      </div>

      {step === 'serve' ? (
        <div role="group" aria-label="Serve" data-row="Serve" className="flex flex-col gap-0.5">
          <span className={caption}>Serve</span>
          {rallyOne ? null : (
            <button
              type="button"
              role="switch"
              data-best-server={draft.server}
              aria-label={`${names[draft.server]} serving`}
              aria-checked={draft.server === 'them'}
              className="inline-flex h-8 w-fit shrink-0 items-center rounded-full border border-border bg-bg-card p-0.5"
              onClick={onServer}
            >
              {(['me', 'them'] as const).map((side) => (
                <span
                  key={side}
                  className="rounded-full px-2 text-xs font-semibold"
                  style={
                    draft.server === side
                      ? {
                          backgroundColor: side === 'me' ? 'var(--color-side-me)' : 'var(--color-side-them)',
                          color: '#fff',
                        }
                      : { color: 'var(--color-text-muted)' }
                  }
                >
                  {names[side]}
                </span>
              ))}
            </button>
          )}
          {tossWatch ? (
            <p className="text-xs font-semibold text-warning" data-best-toss-note>
              Toss? shot 1 may be extra
            </p>
          ) : null}
          {serveNote ? (
            <p className="text-xs font-semibold text-primary" data-best-serve-note>
              {serveNote}
            </p>
          ) : null}
          <div className="flex flex-nowrap items-center gap-1">
            {BEST_SERVE.map((label) => (
              <Choice
                key={label}
                label={label}
                on={draft.shots[0]?.depth === label}
                onClick={() => onServe(label)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {strokeShot > 0 ? (
        <Row label="Shot">
          {BEST_SHOTS.map((shot) => {
            const saved = draft.shots[strokeShot - 1]
            return (
              <Choice
                key={shot.label}
                label={shot.label}
                on={saved?.wing === shot.wing && saved?.stroke === shot.stroke}
                onClick={() => onStroke(strokeShot, shot.wing, shot.stroke)}
                className="px-1.5"
                data={{ 'data-wing': shot.wing, 'data-stroke': shot.stroke }}
              />
            )
          })}
        </Row>
      ) : null}

      {step === 'middle' ? (
        <div role="group" aria-label="End of middle: who was attacking?" data-row="End of middle" className="flex flex-col gap-0.5">
          <span className={caption}>End of middle: who was attacking?</span>
          <div className="flex flex-nowrap items-center gap-1">
            {(['me', 'them', 'none'] as const).map((side) => (
              <Choice
                key={side}
                label={side === 'none' ? 'Nobody' : names[side]}
                on={draft.best?.middle === side}
                onClick={() => onMiddle(side)}
                data={{ 'data-best-middle': side }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {step === 'finish' ? (
        <>
          <Row label="End">
            {BEST_ENDS.map((label) => (
              <Choice
                key={label}
                label={label}
                tone={label === 'BH' || label === 'FH' ? 'win' : 'err'}
                on={endOn === label}
                onClick={() => onEnding(label)}
                data={{ 'data-best-end': label }}
              />
            ))}
          </Row>
          {showFirst ? (
            <div className="space-y-1">
              <p className={caption}>Who attacked first?</p>
              <div className="flex flex-nowrap gap-1" role="group" aria-label="Who attacked first?">
                {who.map((label) => (
                  <Choice key={label} label={label} on={draft.best?.first === label} onClick={() => onFirst(label)} />
                ))}
              </div>
            </div>
          ) : null}
          {endNote && !draft.ending ? (
            <p className="text-xs font-semibold text-primary" data-best-end-note>
              {endNote}
            </p>
          ) : null}
          {mismatch ? null : (
            <Row label="Mark for review">
              {parts.map((group) => (
                <Choice
                  key={group.part}
                  label={PART_LABEL[group.part]}
                  on={Boolean(draft.best?.review?.includes(group.part))}
                  onClick={() => onReview(group.part)}
                  data={{
                    'data-best-review': group.part,
                    'data-from': String(group.from),
                    'data-to': String(group.to),
                  }}
                />
              ))}
            </Row>
          )}
          <Row label="Point to">
            {(['me', 'them'] as const).map((side) => (
              <button
                key={side}
                type="button"
                data-point-to={names[side]}
                data-point-hint={lit === side ? '' : undefined}
                aria-pressed={false}
                className={cell}
                style={lit === side ? hinted() : rest()}
                onClick={() => onPoint(side)}
              >
                {names[side]}
              </button>
            ))}
            <button
              type="button"
              data-best-star="point"
              aria-label="Highlight"
              aria-pressed={draft.highlight}
              className="h-8 w-8 shrink-0 rounded-md border text-sm"
              style={draft.highlight ? { backgroundColor: 'var(--color-warning)', borderColor: 'var(--color-warning)', color: '#0b1220' } : rest()}
              onClick={onStar}
            >
              ★
            </button>
          </Row>
          {serveNote && step === 'finish' ? (
            <p className="text-xs font-semibold text-primary" data-best-serve-note>
              {serveNote}
            </p>
          ) : null}
          {mismatch ? (
            <div className="space-y-1" data-best-mismatch>
              <p className={caption}>Does not match</p>
              <div className="flex flex-nowrap gap-1">
                {(
                  [
                    ['check', 'Check', 'Check contacts'],
                    ['add', 'Add', 'Add contact'],
                    ['switch', 'Switch', 'Switch server'],
                    ['keep', 'Keep', 'Keep'],
                  ] as const
                ).map(([action, label, aria]) => (
                  <button
                    key={action}
                    type="button"
                    data-best-fix={action}
                    aria-label={aria}
                    className={cn(cell, 'px-1.5')}
                    style={rest()}
                    onClick={() => onFix(action)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
