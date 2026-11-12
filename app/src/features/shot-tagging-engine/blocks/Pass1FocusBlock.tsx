/**
 * Pass 1 Focus — shot pills for first-pass capture (Match Review aesthetic).
 *
 * Allow-list from `derivePass1ShotTagAllowList`. First attack + review flags
 * share one 12-slot rail. Technical/Tactical optional when a shot is selected.
 * Live contact outlined.
 */

import { useState, type ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import {
  derivePass1ShotTagAllowList,
  derivePass1ShotTagRole,
} from '@/rules/derive/shot/derivePass1ShotTagRole'
import {
  PHASE_META,
  ENDING_OPTIONS,
  MISS_REASON_OPTIONS,
  REVIEW_KIND_OPTIONS,
  ATTACK_STROKE_OPTIONS,
  REPLY_STROKE_OPTIONS,
  END_STROKE_OPTIONS,
  WING_OPTIONS,
  phaseAt,
  visibleShotNumbers,
  playerForShot,
  getShotSummary,
  isErrorEnding,
  type RallyTimelineState,
  type RallyPhase,
  type PointEnding,
  type PointMissReason,
  type ShotReviewKind,
  type ShotChoiceKey,
  type ShotAttributeKey,
} from '../composers/pass1FocusModel'

export interface Pass1FocusBlockProps {
  state: RallyTimelineState
  players: [string, string]
  server: string
  /** Shot whose contact the loop is currently on (outlined). */
  activeShot?: number | null
  /** Shot selected for optional tags / review kind. */
  selectedShot?: number | null
  onSelectShot?: (n: number) => void
  /** @deprecated First attack is only set from the dedicated row. */
  fosPickMode?: boolean
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleAttribute: (n: number, key: ShotAttributeKey) => void
  onMarkFos: (at: number) => void
  onChangeFos: () => void
  onNoAttack: () => void
  onCancelFosPick: () => void
  onMarkEnd: (at: number) => void
  onToggleEnding: (value: PointEnding) => void
  onToggleMissReason: (value: PointMissReason) => void
  onToggleReviewKind: (n: number, value: ShotReviewKind) => void
  onToggleReviewFlag: (n: number) => void
  className?: string
}

type PillKind =
  | 'wing'
  | 'stroke'
  | 'fos'
  | 'end'
  | 'winner'
  | 'error'
  | 'air'
  | 'standing'
  | 'review'

const PILL_COLOR: Record<PillKind, string> = {
  wing: 'var(--color-player-1)',
  stroke: 'var(--color-shot-aggressive)',
  fos: 'var(--color-shot-first-attack)',
  end: 'var(--color-shot-end)',
  winner: 'var(--color-result-winner)',
  error: 'var(--color-result-error)',
  air: 'var(--color-result-air)',
  standing: 'var(--color-shot-serve)',
  review: 'var(--color-review)',
}

const PLAYER_ROW = { odd: 'bg-player-1-bg', even: 'bg-player-2-bg' }
const SERVE_STRIPE = 'var(--color-shot-serve)'

const PHASE_GROUP: Record<RallyPhase, string> = {
  opening: 'PRE OFFENSIVE SHOT',
  ball: 'PRE OFFENSIVE SHOT',
  fos: 'INITIAL OFFENSE',
  reply: 'INITIAL OFFENSE',
  next: 'INITIAL OFFENSE',
  after: 'CONTINUATION',
}

function TimelinePill({
  label,
  selected,
  onClick,
  kind,
  className,
}: {
  label: string
  selected: boolean
  onClick: () => void
  kind: PillKind
  className?: string
}) {
  const color = PILL_COLOR[kind]
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex items-center justify-center min-w-0',
        'h-[var(--control-height)] whitespace-nowrap rounded-[var(--control-radius)] border',
        'px-[var(--control-px)] text-[length:var(--control-text)] font-semibold cursor-pointer',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500',
        className
      )}
      style={
        selected
          ? { backgroundColor: color, borderColor: color, color: 'var(--color-text)' }
          : {
              backgroundColor: 'var(--color-pill-idle)',
              borderColor: 'var(--color-pill-idle-border)',
              color: 'var(--color-text)',
            }
      }
    >
      {label}
    </button>
  )
}

function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="w-full min-w-0" aria-label={label}>
      <div className="text-[8px] font-bold uppercase tracking-wide text-primary leading-none mb-px">
        {label}
      </div>
      <div
        className="flex items-center flex-nowrap min-w-0"
        style={{ gap: 'var(--control-gap)' }}
      >
        {children}
      </div>
    </div>
  )
}

function ShotTypeRow({
  n,
  shot,
  strokes,
  showPivot,
  onToggleShotChoice,
  onToggleAttribute,
}: {
  n: number
  shot: NonNullable<RallyTimelineState['shots'][number]>
  strokes: readonly string[]
  showPivot: boolean
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleAttribute: (n: number, key: ShotAttributeKey) => void
}) {
  return (
    <ChoiceRow label="Shot">
      <div
        className="flex min-w-0 flex-nowrap items-center"
        style={{ gap: 'var(--control-gap)' }}
      >
        <div
          className="flex shrink-0 flex-nowrap items-center"
          style={{ gap: 'var(--control-gap)' }}
        >
          {[...WING_OPTIONS].reverse().map((v) => (
            <TimelinePill
              key={v}
              kind="wing"
              label={v}
              selected={shot.wing === v}
              onClick={() => onToggleShotChoice(n, 'wing', v)}
            />
          ))}
          {showPivot && (
            <TimelinePill
              kind="wing"
              label="Pivot"
              selected={shot.isPivot}
              onClick={() => onToggleAttribute(n, 'isPivot')}
            />
          )}
        </div>
        <div
          className="flex shrink-0 flex-nowrap items-center"
          style={{ gap: 'var(--control-gap)' }}
        >
          {strokes.map((v) => (
            <TimelinePill
              key={v}
              kind="stroke"
              label={v}
              selected={shot.stroke === v}
              onClick={() => onToggleShotChoice(n, 'stroke', v)}
            />
          ))}
        </div>
      </div>
    </ChoiceRow>
  )
}

function InitiativeRow({
  n,
  shot,
  onToggleShotChoice,
}: {
  n: number
  shot: NonNullable<RallyTimelineState['shots'][number]>
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
}) {
  return (
    <ChoiceRow label="Initiative">
      {(['behind', 'level', 'ahead'] as const).map((v) => (
        <TimelinePill
          key={v}
          kind="standing"
          label={v === 'behind' ? 'Behind' : v === 'level' ? 'Level' : 'Ahead'}
          selected={shot.standing === v}
          onClick={() => onToggleShotChoice(n, 'standing', v)}
        />
      ))}
    </ChoiceRow>
  )
}

export function Pass1FocusBlock({
  state,
  players,
  server,
  activeShot = null,
  selectedShot = null,
  onSelectShot,
  onToggleShotChoice,
  onToggleAttribute,
  onMarkFos,
  onChangeFos: _onChangeFos,
  onNoAttack,
  onCancelFosPick: _onCancelFosPick,
  onMarkEnd,
  onToggleEnding,
  onToggleMissReason,
  onToggleReviewKind,
  onToggleReviewFlag,
  className,
}: Pass1FocusBlockProps) {
  const visible = visibleShotNumbers(state.shotCount, state.end)

  return (
    <section
      className={cn('bg-bg-card text-primary min-w-0 w-full px-1.5 py-1 border-t border-pill-idle-border', className)}
      aria-label="Pass 1 focus"
    >
      <ShotMarkRail
        state={state}
        selectedShot={selectedShot}
        onSelectShot={onSelectShot}
        onMarkFos={onMarkFos}
        onNoAttack={onNoAttack}
        onToggleReviewFlag={onToggleReviewFlag}
      />
      <div className="flex flex-col gap-1">
        {visible.map((n) => {
          const shot = state.shots[n]
          if (!shot) return null
          const isServe = n === 1
          const isEnd = state.end === n
          const allow = derivePass1ShotTagAllowList(n, state.fos, state.end)
          const role = derivePass1ShotTagRole(n, state.fos, state.end)
          const forceTechnical = shot.reviewKind === 'technical'
          const isSelected = selectedShot === n
          const showShotType =
            ((allow.shot_wing && allow.shot_stroke) || forceTechnical) &&
            (isSelected || allow.shot_wing || allow.shot_stroke || forceTechnical)

          const phase = phaseAt(n, state)
          const prior = n > 1 ? phaseAt(n - 1, state) : null
          const phaseName = isServe ? 'SERVE' : PHASE_GROUP[phase]
          const priorName = prior ? (n - 1 === 1 ? 'SERVE' : PHASE_GROUP[prior]) : null
          const isPre = !isServe && (phase === 'opening' || phase === 'ball')
          const rowBg = n % 2 === 0 ? PLAYER_ROW.even : PLAYER_ROW.odd
          const resultStripe =
            state.ending === 'winner' || state.ending === 'lucky'
              ? 'var(--color-result-winner)'
              : state.ending === 'error_air'
                ? 'var(--color-result-air)'
                : 'var(--color-result-error)'
          const stripeColor = isServe
            ? SERVE_STRIPE
            : isEnd && state.ending
              ? resultStripe
              : role === 'first_attack'
                ? 'var(--color-shot-first-attack)'
                : n === 2 || role === 'reply'
                  ? 'var(--color-shot-receive)'
                  : isPre
                    ? PHASE_META.ball.stripe
                    : PHASE_META[phase].stripe
          const showPhaseMark = n === 1 || phaseName !== priorName

          const strokes: readonly string[] =
            role === 'first_attack'
              ? ATTACK_STROKE_OPTIONS
              : role === 'end_shot'
                ? END_STROKE_OPTIONS
                : REPLY_STROKE_OPTIONS

          const showOptional =
            isSelected &&
            (allow.shot_is_high ||
              allow.shot_is_safe ||
              allow.shot_initiative ||
              showShotType ||
              shot.reviewKind !== null)

          return (
            <div key={n}>
              {showPhaseMark && (
                <div
                  className="flex gap-1.5 items-center mt-1 mb-0.5 first:mt-0 text-[9px] font-bold text-muted tracking-wide"
                  aria-label={phaseName}
                >
                  <span
                    className="flex-none w-1.5 h-[2px] rounded-full"
                    style={{ background: stripeColor }}
                  />
                  <span>{phaseName}</span>
                  <span className="flex-1 min-w-2 h-px bg-neutral-700" />
                </div>
              )}

              <ShotRow
                n={n}
                players={players}
                server={server}
                rowBg={rowBg}
                stripeColor={stripeColor}
                active={activeShot === n}
                selected={isSelected}
                isFos={state.fos === n}
                roleLabel={
                  isEnd && state.ending
                    ? state.ending === 'winner' || state.ending === 'lucky'
                      ? 'Winner'
                      : state.ending === 'error_air'
                        ? 'Air'
                        : 'Error'
                    : isServe
                      ? 'Serve'
                      : role === 'first_attack'
                        ? 'First attack'
                        : n === 2 || role === 'reply'
                          ? 'Receive'
                          : null
                }
                roleTone={
                  isEnd && state.ending
                    ? state.ending === 'winner' || state.ending === 'lucky'
                      ? 'winner'
                      : state.ending === 'error_air'
                        ? 'air'
                        : 'error'
                    : isServe
                      ? 'serve'
                      : role === 'first_attack'
                        ? 'attack'
                        : 'receive'
                }
                flagged={shot.reviewKind !== null}
                summary={getShotSummary(n, shot)}
                onSelect={() => onSelectShot?.(n)}
              >
                {/* Always-visible role tags when allow-list requires them (first attack / end) */}
                {!isSelected && (allow.shot_wing && allow.shot_stroke) && (
                  <ShotTypeRow
                    n={n}
                    shot={shot}
                    strokes={strokes}
                    showPivot={allow.shot_is_pivot}
                    onToggleShotChoice={onToggleShotChoice}
                    onToggleAttribute={onToggleAttribute}
                  />
                )}
                {!isSelected && allow.shot_is_high && (
                  <ChoiceRow label="Ball">
                    <TimelinePill
                      kind="standing"
                      label="High"
                      selected={shot.isHigh}
                      onClick={() => onToggleAttribute(n, 'isHigh')}
                    />
                  </ChoiceRow>
                )}
                {!isSelected && allow.shot_is_safe && (
                  <ChoiceRow label="Attribute">
                    <TimelinePill
                      kind="standing"
                      label="Safe"
                      selected={shot.isSafe}
                      onClick={() => onToggleAttribute(n, 'isSafe')}
                    />
                  </ChoiceRow>
                )}
                {!isSelected && allow.shot_initiative && (
                  <InitiativeRow n={n} shot={shot} onToggleShotChoice={onToggleShotChoice} />
                )}

                {(state.end === null || isEnd) && (
                  <ChoiceRow label="Result">
                    <TimelinePill
                      kind="end"
                      label="End"
                      selected={isEnd}
                      onClick={() => onMarkEnd(n)}
                    />
                    {isEnd &&
                      ENDING_OPTIONS.map(({ value, label }) => (
                        <TimelinePill
                          key={value}
                          kind={
                            value === 'winner' || value === 'lucky'
                              ? 'winner'
                              : value === 'error_air'
                                ? 'air'
                                : 'error'
                          }
                          label={label}
                          selected={state.ending === value}
                          onClick={() => onToggleEnding(value)}
                        />
                      ))}
                  </ChoiceRow>
                )}

                {isEnd && isErrorEnding(state.ending) && (
                  <ChoiceRow label="Miss reason">
                    {MISS_REASON_OPTIONS.map(({ value, label }) => (
                      <TimelinePill
                        key={value}
                        kind="standing"
                        label={label}
                        selected={state.missReason === value}
                        onClick={() => onToggleMissReason(value)}
                      />
                    ))}
                  </ChoiceRow>
                )}

                {showOptional && (
                  <>
                    {allow.shot_is_high && (
                      <ChoiceRow label="Ball">
                        <TimelinePill
                          kind="standing"
                          label="High"
                          selected={shot.isHigh}
                          onClick={() => onToggleAttribute(n, 'isHigh')}
                        />
                      </ChoiceRow>
                    )}
                    {showShotType && (
                      <ShotTypeRow
                        n={n}
                        shot={shot}
                        strokes={
                          forceTechnical && !allow.shot_stroke ? END_STROKE_OPTIONS : strokes
                        }
                        showPivot={allow.shot_is_pivot || forceTechnical}
                        onToggleShotChoice={onToggleShotChoice}
                        onToggleAttribute={onToggleAttribute}
                      />
                    )}
                    {allow.shot_is_safe && (
                      <ChoiceRow label="Attribute">
                        <TimelinePill
                          kind="standing"
                          label="Safe"
                          selected={shot.isSafe}
                          onClick={() => onToggleAttribute(n, 'isSafe')}
                        />
                      </ChoiceRow>
                    )}
                    {allow.shot_initiative && (
                      <InitiativeRow n={n} shot={shot} onToggleShotChoice={onToggleShotChoice} />
                    )}
                    <ChoiceRow label="Review kind">
                      <div className="flex flex-1 min-w-0 flex-wrap gap-1">
                        {REVIEW_KIND_OPTIONS.map(({ value, label }) => (
                          <TimelinePill
                            key={value}
                            kind="review"
                            label={label}
                            selected={shot.reviewKind === value}
                            onClick={() => onToggleReviewKind(n, value)}
                          />
                        ))}
                      </div>
                    </ChoiceRow>
                  </>
                )}
              </ShotRow>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const SHOT_RAIL_SLOTS = 12

function ShotMarkRail({
  state,
  selectedShot,
  onSelectShot,
  onMarkFos,
  onNoAttack,
  onToggleReviewFlag,
}: {
  state: RallyTimelineState
  selectedShot?: number | null
  onSelectShot?: (n: number) => void
  onMarkFos: (at: number) => void
  onNoAttack: () => void
  onToggleReviewFlag: (n: number) => void
}) {
  const [mode, setMode] = useState<'fa' | 'review'>('fa')
  const hasFos = typeof state.fos === 'number'
  const maxShot = Math.max(state.shotCount, state.end ?? 0, 1)

  return (
    <div
      className="mb-1.5 rounded-md border border-pill-idle-border bg-bg-card px-1.5 py-1"
      role="group"
      aria-label="First attack and review marks"
    >
      <div className="flex items-center gap-1 mb-1">
        <p className="text-[9px] font-bold tracking-wide text-primary shrink-0">Shots</p>
        <button
          type="button"
          aria-pressed={mode === 'fa'}
          onClick={() => setMode('fa')}
          className={cn('tag-control', mode === 'fa' && 'tag-control-active')}
        >
          FA
        </button>
        <button
          type="button"
          aria-pressed={mode === 'review'}
          onClick={() => setMode('review')}
          className={cn('tag-control', mode === 'review' && 'bg-review border-review text-primary')}
        >
          Rv
        </button>
        <button
          type="button"
          aria-pressed={!hasFos}
          onClick={onNoAttack}
          className={cn(
            'tag-control',
            !hasFos ? 'bg-shot-first-attack border-shot-first-attack text-primary' : undefined
          )}
        >
          No FA
        </button>
        <span className="text-[9px] text-primary truncate ml-auto">
          {mode === 'fa' ? 'Tap 2+ = first attack' : 'Tap = tag to view'}
        </span>
      </div>
      <div className="flex w-full min-w-0 flex-nowrap" style={{ gap: 'var(--control-gap)' }}>
        {Array.from({ length: SHOT_RAIL_SLOTS }, (_, i) => {
          const n = i + 1
          const inRally = n <= maxShot
          const isFos = state.fos === n
          const flagged = Boolean(state.shots[n]?.reviewKind)
          const selected = selectedShot === n
          const disabled = !inRally
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              aria-pressed={isFos || flagged || selected}
              title={
                disabled
                  ? `Shot ${n} not in this rally`
                  : mode === 'fa'
                    ? `First attack on shot ${n}`
                    : flagged
                      ? `Clear review on shot ${n}`
                      : `Mark shot ${n} for review`
              }
              onClick={() => {
                if (disabled) return
                onSelectShot?.(n)
                if (mode === 'fa') {
                  if (n >= 2) onMarkFos(n)
                } else {
                  onToggleReviewFlag(n)
                }
              }}
              className={cn(
                'tag-control flex-1 min-w-0 font-black tabular-nums px-0',
                disabled && 'opacity-30',
                selected && 'ring-1 ring-contact-live',
                isFos && 'bg-shot-first-attack border-shot-first-attack',
                flagged && !isFos && 'bg-review border-review'
              )}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ShotRow({
  n,
  players,
  server,
  rowBg,
  stripeColor,
  active,
  selected,
  isFos,
  roleLabel,
  roleTone,
  flagged,
  summary,
  onSelect,
  children,
}: {
  n: number
  players: [string, string]
  server: string
  rowBg: string
  stripeColor: string
  active: boolean
  selected: boolean
  isFos: boolean
  roleLabel: string | null
  roleTone: 'serve' | 'receive' | 'attack' | 'winner' | 'error' | 'air'
  flagged: boolean
  summary: string
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <div
      data-rally-shot={n}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Shot ${n}${active ? ', live contact' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'flex items-stretch gap-1.5 rounded-md px-1.5 py-1 min-w-0 w-full cursor-pointer border border-transparent',
        rowBg,
        active && 'outline outline-2 outline-contact-live outline-offset-0',
        selected && !active && 'border-contact-selected bg-contact-selected-bg',
        selected && active && 'ring-2 ring-contact-selected'
      )}
    >
      <div
        className="w-[3px] flex-none rounded-full self-stretch"
        style={{ background: stripeColor }}
        aria-hidden
      />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="min-w-0 flex justify-between items-center gap-1.5 min-h-[15px]">
          <div className="inline-flex flex-none items-center gap-1.5 text-[11px]">
            <span className="w-3.5 text-[12px] font-bold text-primary">{n}</span>
            <strong className="text-primary">{playerForShot(n, players, server)}</strong>
            {roleLabel && (
              <span
                className={cn(
                  'inline-flex items-center h-[18px] px-1.5 rounded-full text-[9px] font-bold tracking-wide uppercase text-neutral-50',
                  roleTone === 'serve' && 'bg-shot-serve',
                  roleTone === 'receive' && 'bg-shot-receive',
                  roleTone === 'attack' && 'bg-shot-first-attack',
                  roleTone === 'winner' && 'bg-result-winner',
                  roleTone === 'error' && 'bg-result-error',
                  roleTone === 'air' && 'bg-result-air'
                )}
              >
                {roleLabel}
              </span>
            )}
            {isFos && roleTone !== 'attack' && (
              <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-shot-first-attack text-neutral-50 text-[9px] font-bold tracking-wide uppercase">
                FOS
              </span>
            )}
            {flagged && (
              <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-review text-neutral-50 text-[9px] font-bold tracking-wide uppercase">
                Review
              </span>
            )}
          </div>
          <span
            className="min-w-0 text-right overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted"
            title={summary}
          >
            {summary}
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
