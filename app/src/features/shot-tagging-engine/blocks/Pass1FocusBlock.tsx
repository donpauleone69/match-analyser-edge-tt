/**
 * Pass 1 Focus — shot pills for first-pass capture (Match Review aesthetic).
 *
 * Allow-list from `derivePass1ShotTagAllowList`. First attack only from the
 * dedicated row. Review = single “tag to view” row under first attack;
 * Technical/Tactical optional when a shot is selected. Live contact outlined.
 */

import type { ReactNode } from 'react'
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
  contactOverlayColor,
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
  end: 'var(--color-neutral-500)',
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
        'inline-flex flex-none items-center justify-center',
        'h-7 whitespace-nowrap rounded-md border text-[11px] font-semibold',
        'px-2 cursor-pointer',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500',
        className
      )}
      style={
        selected
          ? { backgroundColor: color, borderColor: color, color: 'var(--color-neutral-50)' }
          : {
              backgroundColor: 'transparent',
              borderColor: 'var(--color-neutral-600)',
              color: 'var(--color-neutral-300)',
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
      <div className="text-[8px] font-bold uppercase tracking-wide text-neutral-500 leading-none mb-px">
        {label}
      </div>
      <div className="flex gap-1 items-center flex-nowrap w-full min-w-0">{children}</div>
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
      <div className="flex gap-1 items-start w-full min-w-0">
        <div className="flex gap-1 shrink-0 items-center">
          {[...WING_OPTIONS].reverse().map((v) => (
            <TimelinePill
              key={v}
              kind="wing"
              label={v}
              selected={shot.wing === v}
              onClick={() => onToggleShotChoice(n, 'wing', v)}
              className="min-w-[36px]"
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
        <div className="flex flex-1 min-w-0 flex-wrap justify-end gap-1">
          {strokes.map((v) => (
            <TimelinePill
              key={v}
              kind="stroke"
              label={v}
              selected={shot.stroke === v}
              onClick={() => onToggleShotChoice(n, 'stroke', v)}
              className="min-w-[44px]"
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
      className={cn('bg-bg-card text-neutral-100 min-w-0 w-full px-1.5 py-1 border-t border-neutral-800', className)}
      aria-label="Pass 1 focus"
    >
      <FirstAttackPicker state={state} onMarkFos={onMarkFos} onNoAttack={onNoAttack} />
      <ReviewFlagRow
        state={state}
        onToggleReviewFlag={onToggleReviewFlag}
        onSelectShot={onSelectShot}
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
                  className="flex gap-1.5 items-center mt-1 mb-0.5 first:mt-0 text-[9px] font-bold text-neutral-500 tracking-wide"
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
                    <TimelinePill kind="end" label="End" selected={isEnd} onClick={() => onMarkEnd(n)} />
                    {isEnd && (
                      <div className="flex flex-1 min-w-0 flex-wrap justify-end gap-1">
                        {ENDING_OPTIONS.map(({ value, label }) => (
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
                      </div>
                    )}
                  </ChoiceRow>
                )}

                {isEnd && isErrorEnding(state.ending) && (
                  <ChoiceRow label="Miss reason">
                    <div className="flex flex-1 min-w-0 flex-wrap gap-1">
                      {MISS_REASON_OPTIONS.map(({ value, label }) => (
                        <TimelinePill
                          key={value}
                          kind="standing"
                          label={label}
                          selected={state.missReason === value}
                          onClick={() => onToggleMissReason(value)}
                        />
                      ))}
                    </div>
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

function FirstAttackPicker({
  state,
  onMarkFos,
  onNoAttack,
}: {
  state: RallyTimelineState
  onMarkFos: (at: number) => void
  onNoAttack: () => void
}) {
  const candidates = visibleShotNumbers(state.shotCount, state.end).filter((n) => n >= 2)
  const hasFos = typeof state.fos === 'number'

  return (
    <div
      className="mb-1.5 rounded-md border border-neutral-700 bg-neutral-900/60 px-2 py-1.5"
      role="group"
      aria-label="First attack"
    >
      <p className="text-[10px] font-bold tracking-wide text-neutral-400 mb-1">First attack</p>
      <div className="flex flex-wrap gap-1 items-center">
        <button
          type="button"
          aria-pressed={!hasFos}
          onClick={onNoAttack}
          className={cn(
            'h-7 px-2 rounded-md text-[11px] font-bold border',
            !hasFos
              ? 'bg-shot-first-attack text-neutral-950 border-shot-first-attack'
              : 'bg-transparent text-neutral-300 border-neutral-600'
          )}
        >
          No first attack
        </button>
        {candidates.map((n) => {
          const selected = state.fos === n
          const color = contactOverlayColor(n)
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              title={`First attack on shot ${n}`}
              onClick={() => onMarkFos(n)}
              className={cn(
                'h-7 min-w-7 px-2 rounded-md text-[12px] font-black tabular-nums border',
                selected ? 'text-white border-transparent' : 'bg-transparent'
              )}
              style={
                selected
                  ? { backgroundColor: color, borderColor: color }
                  : { color, borderColor: color }
              }
            >
              {n}
            </button>
          )
        })}
      </div>
      <p className="mt-1 text-[9px] text-neutral-500">
        Only from this row · gold = your side when you serve · blue = receiver side
      </p>
    </div>
  )
}

function ReviewFlagRow({
  state,
  onToggleReviewFlag,
  onSelectShot,
}: {
  state: RallyTimelineState
  onToggleReviewFlag: (n: number) => void
  onSelectShot?: (n: number) => void
}) {
  const candidates = visibleShotNumbers(state.shotCount, state.end)
  if (candidates.length === 0) return null

  return (
    <div
      className="mb-1.5 rounded-md border border-neutral-700 bg-neutral-900/40 px-2 py-1.5"
      role="group"
      aria-label="Tag to view"
    >
      <p className="text-[10px] font-bold tracking-wide text-neutral-400 mb-1">
        Review · tag to view
      </p>
      <div className="flex flex-wrap gap-1 items-center">
        {candidates.map((n) => {
          const shot = state.shots[n]
          const on = Boolean(shot?.reviewKind)
          const color = PILL_COLOR.review
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              title={on ? `Clear review on shot ${n}` : `Mark shot ${n} for review`}
              onClick={() => {
                onToggleReviewFlag(n)
                onSelectShot?.(n)
              }}
              className={cn(
                'h-7 min-w-7 px-2 rounded-md text-[12px] font-black tabular-nums border',
                on ? 'text-neutral-950 border-transparent' : 'bg-transparent text-neutral-400 border-neutral-600'
              )}
              style={on ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {n}
            </button>
          )
        })}
      </div>
      <p className="mt-1 text-[9px] text-neutral-500">
        Tap a shot number to flag it for Work on / Clips. Select the shot below to set Technical or Tactical.
      </p>
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
            <span className="w-3.5 text-[12px] font-bold text-neutral-100">{n}</span>
            <strong className="text-neutral-100">{playerForShot(n, players, server)}</strong>
            {roleLabel && (
              <span
                className={cn(
                  'inline-flex items-center h-[18px] px-1.5 rounded-full text-[9px] font-bold tracking-wide uppercase',
                  roleTone === 'serve' && 'bg-shot-serve text-neutral-950',
                  roleTone === 'receive' && 'bg-shot-receive text-neutral-950',
                  roleTone === 'attack' && 'bg-shot-first-attack text-neutral-950',
                  roleTone === 'winner' && 'bg-result-winner text-neutral-950',
                  roleTone === 'error' && 'bg-result-error text-neutral-950',
                  roleTone === 'air' && 'bg-result-air text-neutral-950'
                )}
              >
                {roleLabel}
              </span>
            )}
            {isFos && roleTone !== 'attack' && (
              <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-shot-first-attack text-neutral-950 text-[9px] font-bold tracking-wide uppercase">
                FOS
              </span>
            )}
            {flagged && (
              <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-review text-neutral-950 text-[9px] font-bold tracking-wide uppercase">
                Review
              </span>
            )}
          </div>
          <span
            className="min-w-0 text-right overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-neutral-400"
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
