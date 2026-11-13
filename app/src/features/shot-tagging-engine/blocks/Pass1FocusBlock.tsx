/**
 * Pass 1 Focus — shot pills for first-pass capture (Match Review aesthetic).
 *
 * Rally guide rail: width max(10, contacts+2). Server is set per rally, not on the rail.
 * Tap a shot → select it and snap that list row under the sticky rail (no duplicate card).
 * Rows wear opaque pastels: hitter colour by default, serve / first attack / result override.
 * Shot-level First attack / End point / Flag for review live ONLY in the sticky
 * selected-shot tools (one tap, always visible, same on mobile/desktop).
 * Row-inline controls keep only the follow-ups that belong to that shot
 * (ending type once it is the end, review kind once flagged); rail cells stay
 * display/selection only. Session Done / Leave live in the set context bar.
 * Live = rail underline; selected = rail border. List keeps allow-list tagging.
 */

import { type ReactNode, useEffect, useState } from 'react'
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
  ATTACK_STROKE_OPTIONS_COMPACT,
  REPLY_STROKE_OPTIONS,
  REPLY_STROKE_OPTIONS_COMPACT,
  END_STROKE_OPTIONS,
  END_STROKE_OPTIONS_COMPACT,
  WING_OPTIONS,
  phaseAt,
  visibleShotNumbers,
  railSlotCount,
  railSlotKind,
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

/** Phone / narrow Pass 1 — fewer stroke pills after wrap. */
function useCompactPass1Strokes(): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = () => setCompact(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return compact
}

export interface Pass1FocusBlockProps {
  state: RallyTimelineState
  players: [string, string]
  server: string
  /** Shot whose contact the loop is currently on (rail underline). */
  activeShot?: number | null
  /** Shot selected for sticky FA/End/Review tools + optional tags / review kind. */
  selectedShot?: number | null
  onSelectShot?: (n: number) => void
  /** @deprecated First attack is only set from the selected-shot tools. */
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
  scrollableShotRail?: boolean
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

/**
 * Row washes are always opaque pastels (never card/elevated greys on the card surface).
 * Default = hitter's player pastel, matching the shot rail; role/result rows override.
 */
const PLAYER_ROW_BG = { p1: 'bg-player-1-bg', p2: 'bg-player-2-bg' }
const SERVE_ROW_BG = 'bg-shot-serve-bg'
const FOS_ROW_BG = 'bg-shot-first-attack-bg'
const RESULT_ROW_BG = {
  winner: 'bg-result-winner-bg',
  error: 'bg-result-error-bg',
  air: 'bg-result-air-bg',
}
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
  title,
}: {
  label: string
  selected: boolean
  onClick: () => void
  kind: PillKind
  className?: string
  title?: string
}) {
  const color = PILL_COLOR[kind]
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex flex-none items-center justify-center',
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
        className="flex w-full min-w-0 items-center flex-wrap"
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
        className="flex w-full min-w-0 flex-wrap items-start"
        style={{ gap: 'var(--control-gap)' }}
      >
        <div
          className="flex shrink-0 flex-wrap items-center"
          style={{ gap: 'var(--control-gap)' }}
        >
          {[...WING_OPTIONS].reverse().map((v) => (
            <TimelinePill
              key={v}
              kind="wing"
              label={v}
              selected={shot.wing === v}
              onClick={() => onToggleShotChoice(n, 'wing', v)}
              className="min-w-[1.75rem]"
            />
          ))}
          {showPivot && (
            <TimelinePill
              kind="wing"
              label="Pivot"
              selected={shot.isPivot}
              onClick={() => onToggleAttribute(n, 'isPivot')}
              className="min-w-[2.25rem]"
            />
          )}
        </div>
        <div
          className="flex flex-1 min-w-0 flex-wrap justify-end"
          style={{ gap: 'var(--control-gap)' }}
        >
          {strokes.map((v) => (
            <TimelinePill
              key={v}
              kind="stroke"
              label={v}
              selected={shot.stroke === v}
              onClick={() => onToggleShotChoice(n, 'stroke', v)}
              className="min-w-[2.25rem]"
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

type ShotVisual = {
  rowBg: string
  stripeColor: string
  roleLabel: string | null
  roleTone: 'serve' | 'receive' | 'attack' | 'winner' | 'error' | 'air'
}

function deriveShotVisual(
  n: number,
  state: RallyTimelineState,
  players: [string, string],
  server: string
): ShotVisual {
  const isServe = n === 1
  const isEnd = state.end === n
  const role = derivePass1ShotTagRole(n, state.fos, state.end)
  const phase = phaseAt(n, state)
  const isPre = !isServe && (phase === 'opening' || phase === 'ball')
  const resultKey: keyof typeof RESULT_ROW_BG =
    state.ending === 'winner' || state.ending === 'lucky'
      ? 'winner'
      : state.ending === 'error_air'
        ? 'air'
        : 'error'
  const rowBg =
    isEnd && state.ending
      ? RESULT_ROW_BG[resultKey]
      : isServe
        ? SERVE_ROW_BG
        : role === 'first_attack'
          ? FOS_ROW_BG
          : playerForShot(n, players, server) === players[0]
            ? PLAYER_ROW_BG.p1
            : PLAYER_ROW_BG.p2
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

  const roleLabel =
    isEnd && state.ending
      ? state.ending === 'winner'
        ? 'Winner'
        : state.ending === 'lucky'
          ? 'Lucky'
          : state.ending === 'error_air'
            ? 'Air'
            : 'Error'
      : isServe
        ? 'Serve'
        : role === 'first_attack'
          ? 'First attack'
          : n === 2
            ? 'Receive'
            : role === 'reply'
              ? 'Reply'
              : role === 'ball_before_attack'
                ? 'Ball'
                : null

  const roleTone: ShotVisual['roleTone'] =
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

  return { rowBg, stripeColor, roleLabel, roleTone }
}

function ShotTagging({
  n,
  state,
  isSelected,
  onToggleShotChoice,
  onToggleAttribute,
  onToggleEnding,
  onToggleMissReason,
  onToggleReviewKind,
  compactStrokes = false,
}: {
  n: number
  state: RallyTimelineState
  isSelected: boolean
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleAttribute: (n: number, key: ShotAttributeKey) => void
  onToggleEnding: (value: PointEnding) => void
  onToggleMissReason: (value: PointMissReason) => void
  onToggleReviewKind: (n: number, value: ShotReviewKind) => void
  compactStrokes?: boolean
}) {
  const shot = state.shots[n]
  if (!shot) return null

  const isEnd = state.end === n
  const allow = derivePass1ShotTagAllowList(n, state.fos, state.end)
  const role = derivePass1ShotTagRole(n, state.fos, state.end)
  const forceTechnical = shot.reviewKind === 'technical'
  const showShotType =
    ((allow.shot_wing && allow.shot_stroke) || forceTechnical) &&
    (isSelected || allow.shot_wing || allow.shot_stroke || forceTechnical)

  const compact = Boolean(compactStrokes)
  const strokes: readonly string[] =
    role === 'first_attack'
      ? compact
        ? ATTACK_STROKE_OPTIONS_COMPACT
        : ATTACK_STROKE_OPTIONS
      : role === 'end_shot'
        ? compact
          ? END_STROKE_OPTIONS_COMPACT
          : END_STROKE_OPTIONS
        : compact
          ? REPLY_STROKE_OPTIONS_COMPACT
          : REPLY_STROKE_OPTIONS

  const showOptional =
    isSelected &&
    (allow.shot_is_high ||
      allow.shot_is_safe ||
      allow.shot_initiative ||
      showShotType ||
      shot.reviewKind !== null)

  return (
    <>
      {/* Always-visible role tags when allow-list requires them (first attack / end) */}
      {!isSelected && allow.shot_wing && allow.shot_stroke && (
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

      {/* End itself is marked only in the sticky selected-shot tools; the
          row keeps just the ending type for the shot that already is the end. */}
      {isEnd && (
        <ChoiceRow label="Result">
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
                forceTechnical && !allow.shot_stroke
                  ? compact
                    ? END_STROKE_OPTIONS_COMPACT
                    : END_STROKE_OPTIONS
                  : strokes
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
          <ChoiceRow label="Flag kind">
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
    </>
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
  onNoAttack,
  onMarkEnd,
  onToggleEnding,
  onToggleMissReason,
  onToggleReviewKind,
  onToggleReviewFlag,
  scrollableShotRail = false,
  className,
}: Pass1FocusBlockProps) {
  const compactStrokes = useCompactPass1Strokes()
  const visible = visibleShotNumbers(state.shotCount, state.end)
  const selected =
    typeof selectedShot === 'number' && state.shots[selectedShot] ? selectedShot : null
  const selectedShotData = selected !== null ? state.shots[selected] : null

  return (
    <section
      className={cn('bg-bg-card text-primary min-w-0 w-full px-1.5 py-1', className)}
      aria-label="Pass 1 focus"
    >
      <div
        data-pass1-sticky
        className="sticky top-0 z-10 -mx-1.5 px-1.5 pt-0.5 pb-1 mb-1 bg-bg-card/95 backdrop-blur-sm border-b border-pill-idle-border space-y-1"
      >
        <Pass1ShotMarkRail
          state={state}
          players={players}
          server={server}
          activeShot={activeShot}
          selectedShot={selectedShot}
          onSelectShot={onSelectShot}
          scrollable={scrollableShotRail}
        />
        {selected !== null && selectedShotData && (
          <div className="space-y-1" aria-label={`Shot ${selected} tools`}>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <span className="mr-auto text-[9px] font-bold uppercase tracking-wide text-muted">
                Shot {selected}
                {typeof state.fos === 'number'
                  ? ` · FA ${state.fos}`
                  : state.noFirstAttack
                    ? ' · No attack'
                    : state.end === 1
                      ? ''
                      : ' · FA?'}
                {typeof state.end === 'number' ? ` · End ${state.end}` : ' · End?'}
              </span>
              {selected >= 2 && (
                <>
                  <TimelinePill
                    kind="fos"
                    label={state.fos === selected ? 'First attack ✓' : 'First attack'}
                    selected={state.fos === selected}
                    title={
                      state.fos === selected
                        ? `Shot ${selected} is the first attack — tap to clear (undecided)`
                        : `Mark shot ${selected} as the first attack of the point`
                    }
                    onClick={() => onMarkFos(selected)}
                  />
                  <TimelinePill
                    kind="fos"
                    label={state.noFirstAttack ? 'No attack ✓' : 'No attack'}
                    selected={state.noFirstAttack}
                    title={
                      state.noFirstAttack
                        ? 'No first attack marked — tap to clear (undecided)'
                        : 'This point had no first attack'
                    }
                    onClick={() => onNoAttack()}
                  />
                </>
              )}
              <TimelinePill
                kind="end"
                label={state.end === selected ? 'End point ✓' : 'End point'}
                selected={state.end === selected}
                title={
                  state.end === selected
                    ? `Shot ${selected} ends the point — tap to un-mark the point end`
                    : `Mark shot ${selected} as the last shot of the point, then choose the result on its row`
                }
                onClick={() => onMarkEnd(selected)}
              />
              <TimelinePill
                kind="review"
                label="Flag for review"
                selected={selectedShotData.reviewKind !== null}
                title={
                  selectedShotData.reviewKind !== null
                    ? `Shot ${selected} is flagged for later review — tap to remove the flag`
                    : `Flag shot ${selected} for later review (starts as Technical; refine the kind on its row)`
                }
                onClick={() => onToggleReviewFlag(selected)}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {visible.map((n) => {
          const shot = state.shots[n]
          if (!shot) return null
          const isServe = n === 1
          const isSelected = selectedShot === n
          const visual = deriveShotVisual(n, state, players, server)

          const phase = phaseAt(n, state)
          const prior = n > 1 ? phaseAt(n - 1, state) : null
          const phaseName = isServe ? 'SERVE' : PHASE_GROUP[phase]
          const priorName = prior ? (n - 1 === 1 ? 'SERVE' : PHASE_GROUP[prior]) : null
          const showPhaseMark = n === 1 || phaseName !== priorName

          return (
            <div
              key={n}
              data-rally-shot-wrap={n}
              className="scroll-mt-[var(--pass1-sticky-offset,4rem)]"
            >
              {showPhaseMark && (
                <div
                  className="flex gap-1.5 items-center mt-1 mb-0.5 first:mt-0 text-[9px] font-bold text-muted tracking-wide"
                  aria-label={phaseName}
                >
                  <span
                    className="flex-none w-1.5 h-[2px] rounded-full"
                    style={{ background: visual.stripeColor }}
                  />
                  <span>{phaseName}</span>
                  <span className="flex-1 min-w-2 h-px bg-neutral-700" />
                </div>
              )}

              <ShotRow
                n={n}
                players={players}
                server={server}
                rowBg={visual.rowBg}
                stripeColor={visual.stripeColor}
                selected={isSelected}
                isFos={state.fos === n}
                roleLabel={visual.roleLabel}
                roleTone={visual.roleTone}
                flagged={shot.reviewKind !== null}
                summary={getShotSummary(n, shot)}
                onSelect={() => onSelectShot?.(n)}
              >
                <ShotTagging
                  n={n}
                  state={state}
                  isSelected={isSelected}
                  onToggleShotChoice={onToggleShotChoice}
                  onToggleAttribute={onToggleAttribute}
                  onToggleEnding={onToggleEnding}
                  onToggleMissReason={onToggleMissReason}
                  onToggleReviewKind={onToggleReviewKind}
                  compactStrokes={compactStrokes}
                />
              </ShotRow>
            </div>
          )
        })}
      </div>
      {/* Runway so the last shot can scroll up under the sticky rail; sized by snapPass1ShotIntoView. */}
      <div data-pass1-tail aria-hidden className="shrink-0" />
    </section>
  )
}

/** Shared shot-number rail (form sticky + contact-tap chrome). */
export function Pass1ShotMarkRail({
  state,
  players,
  server,
  activeShot,
  selectedShot,
  onSelectShot,
  scrollable = false,
}: {
  state: RallyTimelineState
  players: [string, string]
  server: string
  activeShot?: number | null
  selectedShot?: number | null
  onSelectShot?: (n: number) => void
  scrollable?: boolean
}) {
  const slotCount = scrollable
    ? Math.max(1, state.shotCount + 1)
    : railSlotCount(state.shotCount)
  const slots = Array.from({ length: slotCount }, (_, i) => i + 1)
  const endResultBg = !state.ending
    ? null
    : state.ending === 'winner' || state.ending === 'lucky'
      ? RESULT_ROW_BG.winner
      : state.ending === 'error_air'
        ? RESULT_ROW_BG.air
        : RESULT_ROW_BG.error

  return (
    <div className="space-y-0.5" role="group" aria-label="Rally shot guide">
      <div
        className={cn(
          'flex w-full min-w-0 flex-nowrap items-stretch',
          scrollable && 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        )}
        style={{ gap: 'var(--control-gap)' }}
        role="list"
        aria-label="Shots in this rally"
      >
        {slots.map((n) => {
          const kind = railSlotKind(n, state.shotCount, state.end)
          const grey = kind === 'unused'
          const dimmed = kind === 'after_end'
          const hitter = kind === 'unused' ? null : playerForShot(n, players, server)
          const isPlayer1 = hitter === players[0]
          const isFos = state.fos === n
          const isEnd = state.end === n
          const flagged = Boolean(state.shots[n]?.reviewKind)
          const active = activeShot === n
          const selected = selectedShot === n
          const canTap = kind !== 'unused'

          return (
            <div
              key={n}
              className="relative min-w-0 flex flex-col items-center gap-px"
              style={{ flex: scrollable ? '0 0 2rem' : '1 1 0' }}
              role="listitem"
            >
              <button
                type="button"
                disabled={!canTap}
                aria-pressed={selected}
                aria-current={active ? 'true' : undefined}
                title={!canTap ? `Shot ${n} — no contact yet` : `Select shot ${n}`}
                onClick={() => {
                  if (!canTap) return
                  onSelectShot?.(n)
                }}
                className={cn(
                  'relative w-full h-7 rounded font-black tabular-nums text-xs',
                  grey
                    ? 'bg-bg-elevated text-muted opacity-40 border border-transparent'
                    : isPlayer1
                      ? 'bg-player-1-bg text-primary'
                      : 'bg-player-2-bg text-primary',
                  dimmed && 'opacity-45',
                  isFos && !grey && 'bg-shot-first-attack-bg',
                  isEnd && !grey && (endResultBg ?? 'bg-shot-end-bg'),
                  flagged && !isFos && !isEnd && !grey && 'bg-review-bg',
                  selected
                    ? 'border-2 border-contact-selected'
                    : 'border border-transparent',
                  !canTap && 'cursor-default'
                )}
              >
                {n}
                {flagged && !isFos && !isEnd && (
                  <span
                    className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-review"
                    aria-hidden
                  />
                )}
              </button>
              <span
                className={cn(
                  'h-1 w-full max-w-none rounded-sm shrink-0',
                  active ? 'bg-contact-live' : 'bg-transparent'
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'min-h-[0.7rem] text-[7px] font-black uppercase leading-none tracking-wide',
                  isFos && isEnd
                    ? 'text-shot-first-attack'
                    : isFos
                      ? 'text-shot-first-attack'
                      : isEnd
                        ? 'text-shot-end'
                        : 'text-transparent'
                )}
                aria-hidden={!isFos && !isEnd}
              >
                {isFos && isEnd ? 'FA·E' : isFos ? 'FA' : isEnd ? 'End' : '·'}
              </span>
            </div>
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
      aria-label={`Shot ${n}`}
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
        selected && 'border-2 border-contact-selected shadow-[inset_0_0_0_1px_var(--color-contact-selected)]'
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
                Flagged
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

/**
 * Snap the list shot under the sticky rail (after select / FA / End).
 * The tail runway is sized from the LAST visible shot (not the selected one), so it
 * stays stable between selections and is exactly enough for the last shot to reach the snap line.
 */
export function snapPass1ShotIntoView(n: number) {
  const sticky = document.querySelector<HTMLElement>('[data-pass1-sticky]')
  const wrap = document.querySelector<HTMLElement>(`[data-rally-shot-wrap="${n}"]`)
  if (!wrap) return
  const stickyOffset = sticky ? Math.ceil(sticky.offsetHeight) + 4 : 0
  wrap.style.setProperty('--pass1-sticky-offset', `${stickyOffset}px`)

  const scroller = wrap.closest<HTMLElement>('[data-pass1-scroller]')
  const tail = scroller?.querySelector<HTMLElement>('[data-pass1-tail]')
  const wraps = scroller?.querySelectorAll<HTMLElement>('[data-rally-shot-wrap]')
  const last = wraps && wraps.length > 0 ? wraps[wraps.length - 1] : null
  if (scroller && tail && last) {
    const runway = scroller.clientHeight - stickyOffset - last.offsetHeight
    tail.style.height = `${Math.max(0, Math.ceil(runway))}px`
  }

  wrap.scrollIntoView({ block: 'start', behavior: 'smooth' })
}
