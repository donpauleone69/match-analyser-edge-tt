/**
 * Pass 1 Focus — shot pills for first-pass capture (Match Review aesthetic).
 *
 * MA-71 staged flow (+ MA-73 FA undo / impossible-FA auto-skip + MA-77 rules):
 * contacts → end Result → end Wing/Stroke (locked) → select FA /
 * No Attack (last rail cell; selected red only when on) → FA details → optional/save.
 * fa_details: tap FA caption / re-tap shot clears; other ≥2 reassigns.
 * Optional (MA-77) = phase L/R matrices (spin/depth/Ball; FA contact +
 * Safe/Aggressive; initiative; Review per-shot). ★ on rally rail. Guiding
 * dialog below rail (amber→green). No Change FA / placement / Weak / Quality.
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
  ATTACK_STROKE_OPTIONS,
  ATTACK_STROKE_OPTIONS_COMPACT,
  REPLY_STROKE_OPTIONS,
  REPLY_STROKE_OPTIONS_COMPACT,
  END_STROKE_OPTIONS,
  END_STROKE_OPTIONS_COMPACT,
  WING_OPTIONS,
  SPIN_OPTIONS,
  DEPTH_OPTIONS,
  TABLE_CONTACT_OPTIONS,
  phaseAt,
  visibleShotNumbers,
  railSlotCount,
  railSlotKind,
  playerForShot,
  getShotSummary,
  isErrorEnding,
  derivePass1Stage,
  isPass1EndLockedStage,
  pass1StageInfo,
  type Pass1Stage,
  type RallyTimelineState,
  type RallyPhase,
  type PointEnding,
  type PointMissReason,
  type ShotChoiceKey,
  type ShotAttributeKey,
} from '../composers/pass1FocusModel'

/** Selected No Attack rail cell — strong red only when noFirstAttack (MA-76). */
const NO_ATTACK_RED = '#dc2626'

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
  /** Shot selected for detail entry. Always set in form. */
  selectedShot?: number | null
  onSelectShot?: (n: number) => void
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleAttribute: (n: number, key: ShotAttributeKey) => void
  onMarkFos: (at: number) => void
  onChangeFos: () => void
  onNoAttack: () => void
  onCancelFosPick: () => void
  onMarkEnd: (at: number) => void
  onToggleEnding: (value: PointEnding) => void
  onToggleMissReason: (value: PointMissReason) => void
  onToggleReviewFlag: (n: number) => void
  /** Rally-level highlight (★) — on rally rail (MA-77). */
  isHighlight?: boolean
  onToggleHighlight?: () => void
  /** Clear FA decision (undo No attack / re-tap FA) → back to select_fa. */
  onClearFosDecision?: () => void
  /** True when Basic gates pass — greens the guiding dialog (MA-77). */
  canSave?: boolean
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

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="text-[8px] font-bold uppercase tracking-wide text-primary leading-none mb-px">
      {label}
    </div>
  )
}

function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="w-full min-w-0" aria-label={label}>
      <SectionLabel label={label} />
      <div
        className="flex w-full min-w-0 items-center flex-wrap"
        style={{ gap: 'var(--control-gap)' }}
      >
        {children}
      </div>
    </div>
  )
}

/** Guiding dialog below the rally rail — amber while incomplete, green when can save. */
function Pass1StageInfoBox({
  stage,
  canSave = false,
}: {
  stage: Pass1Stage
  canSave?: boolean
}) {
  const { text, tone } = pass1StageInfo(stage, { canSave })
  const ready = tone === 'ready'
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border px-2 py-1.5 text-[11px] font-semibold leading-snug',
        ready
          ? 'border-success bg-success-muted text-success'
          : 'border-callout-warning-border bg-callout-warning-bg text-callout-warning'
      )}
      role="status"
      aria-live="polite"
      data-pass1-stage={stage}
      data-pass1-stage-tone={tone}
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          ready ? 'bg-success' : 'bg-callout-warning'
        )}
        aria-hidden
      />
      <span className="pl-1.5 block">{text}</span>
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
  stage,
  onToggleShotChoice,
  onToggleAttribute,
  onToggleEnding,
  onToggleMissReason,
  onToggleReviewFlag,
  compactStrokes = false,
}: {
  n: number
  state: RallyTimelineState
  isSelected: boolean
  stage: Pass1Stage
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleAttribute: (n: number, key: ShotAttributeKey) => void
  onToggleEnding: (value: PointEnding) => void
  onToggleMissReason: (value: PointMissReason) => void
  onToggleReviewFlag: (n: number) => void
  compactStrokes?: boolean
}) {
  const shot = state.shots[n]
  if (!shot) return null

  const isEnd = state.end === n
  const isFos = state.fos === n
  const allow = derivePass1ShotTagAllowList(n, state.fos, state.end)
  const role = derivePass1ShotTagRole(n, state.fos, state.end)
  const reviewed = shot.reviewKind !== null
  const optionalOpen = stage === 'optional'
  const endResultPhase = stage === 'end_details'
  const endShotPhase = stage === 'end_shot'
  const endPhase = endResultPhase || endShotPhase
  const faDetailPhase = stage === 'fa_details'

  const compact = Boolean(compactStrokes)
  const strokes: readonly string[] =
    role === 'first_attack' || (faDetailPhase && isFos)
      ? compact
        ? ATTACK_STROKE_OPTIONS_COMPACT
        : ATTACK_STROKE_OPTIONS
      : role === 'end_shot' || (endPhase && isEnd)
        ? compact
          ? END_STROKE_OPTIONS_COMPACT
          : END_STROKE_OPTIONS
        : compact
          ? REPLY_STROKE_OPTIONS_COMPACT
          : REPLY_STROKE_OPTIONS

  // Compulsory: Result durable on End; Wing/Stroke on End (end_shot+) and FA details.
  // Optional stage: wing/stroke stay in L column when allow-listed (continuation / reply).
  const showCompulsoryShotType =
    isSelected &&
    ((endShotPhase && isEnd) ||
      (endResultPhase && isEnd && Boolean(state.ending)) ||
      (faDetailPhase && isFos))

  const showOptionalWingStroke =
    isSelected && optionalOpen && (allow.shot_wing || allow.shot_stroke)

  const showResult =
    isSelected && isEnd && (endPhase || optionalOpen || faDetailPhase)

  const showPhaseOptionals =
    isSelected &&
    optionalOpen &&
    (allow.shot_spin ||
      allow.shot_depth ||
      allow.shot_contact ||
      allow.shot_is_high ||
      allow.shot_is_heavy ||
      allow.shot_is_safe ||
      allow.shot_initiative)

  const showMiss =
    isSelected && optionalOpen && reviewed && isEnd && isErrorEnding(state.ending)

  const showReview = isSelected && optionalOpen

  const compulsory = (
    <>
      {showResult && (
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
      {showCompulsoryShotType && (
        <ShotTypeRow
          n={n}
          shot={shot}
          strokes={allow.shot_stroke ? strokes : []}
          showPivot={allow.shot_is_pivot}
          onToggleShotChoice={onToggleShotChoice}
          onToggleAttribute={onToggleAttribute}
        />
      )}
    </>
  )

  const leftCol = (
    <>
      {showOptionalWingStroke && (
        <ShotTypeRow
          n={n}
          shot={shot}
          strokes={allow.shot_stroke ? strokes : []}
          showPivot={allow.shot_is_pivot}
          onToggleShotChoice={onToggleShotChoice}
          onToggleAttribute={onToggleAttribute}
        />
      )}
      {showPhaseOptionals && allow.shot_spin && (
        <ChoiceRow label="Spin">
          {SPIN_OPTIONS.map((v) => (
            <TimelinePill
              key={v}
              kind="standing"
              label={v}
              selected={shot.spin === v}
              onClick={() => onToggleShotChoice(n, 'spin', v)}
            />
          ))}
        </ChoiceRow>
      )}
      {showPhaseOptionals && allow.shot_depth && (
        <ChoiceRow label="Depth">
          {DEPTH_OPTIONS.map((v) => (
            <TimelinePill
              key={v}
              kind="standing"
              label={v}
              selected={shot.depth === v}
              onClick={() => onToggleShotChoice(n, 'depth', v)}
            />
          ))}
        </ChoiceRow>
      )}
      {showPhaseOptionals && allow.shot_contact && (
        <ChoiceRow label="Contact">
          {TABLE_CONTACT_OPTIONS.map(({ value, label }) => (
            <TimelinePill
              key={value}
              kind="standing"
              label={label}
              selected={shot.tableContact === value}
              onClick={() => onToggleShotChoice(n, 'tableContact', value)}
            />
          ))}
        </ChoiceRow>
      )}
      {showPhaseOptionals && allow.shot_is_safe && (
        <ChoiceRow label="Attributes">
          <TimelinePill
            kind="standing"
            label="Safe"
            selected={shot.isSafe}
            onClick={() => onToggleAttribute(n, 'isSafe')}
          />
          <TimelinePill
            kind="standing"
            label="Aggressive"
            selected={shot.isAggressive}
            onClick={() => onToggleAttribute(n, 'isAggressive')}
          />
        </ChoiceRow>
      )}
      {showPhaseOptionals && allow.shot_initiative && (
        <InitiativeRow n={n} shot={shot} onToggleShotChoice={onToggleShotChoice} />
      )}
    </>
  )

  const rightCol = (
    <>
      {showPhaseOptionals && (allow.shot_is_high || allow.shot_is_heavy) && (
        <ChoiceRow label="Ball">
          {allow.shot_is_high && (
            <TimelinePill
              kind="standing"
              label="High"
              selected={shot.isHigh}
              onClick={() => onToggleAttribute(n, 'isHigh')}
            />
          )}
          {allow.shot_is_heavy && (
            <TimelinePill
              kind="standing"
              label="Heavy"
              selected={shot.isHeavy}
              onClick={() => onToggleAttribute(n, 'isHeavy')}
            />
          )}
        </ChoiceRow>
      )}
      {showReview && (
        <ChoiceRow label="Tag">
          <TimelinePill
            kind="review"
            label="Review"
            selected={reviewed}
            title={
              reviewed
                ? `Shot ${n} flagged — tap to clear`
                : `Flag shot ${n} for later review`
            }
            onClick={() => onToggleReviewFlag(n)}
          />
        </ChoiceRow>
      )}
      {showMiss && (
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
    </>
  )

  const hasOptional =
    showOptionalWingStroke || showPhaseOptionals || showReview || showMiss

  if (!isSelected) {
    return null
  }

  // select_fa: rail picks FA / No Attack; no detail chrome.
  if (stage === 'select_fa') return null

  return (
    <>
      <div className="flex flex-col gap-1">{compulsory}</div>
      {hasOptional && (
        <>
          <div className="my-0.5 h-px w-full bg-pill-idle-border" aria-hidden />
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-2">
            <div className="flex flex-col gap-1 min-w-0">{leftCol}</div>
            <div className="flex flex-col gap-1 min-w-0">{rightCol}</div>
          </div>
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
  onMarkFos: _onMarkFos,
  onMarkEnd: _onMarkEnd,
  onToggleEnding,
  onToggleMissReason,
  onToggleReviewFlag,
  onNoAttack,
  onClearFosDecision,
  isHighlight = false,
  onToggleHighlight,
  canSave = false,
  scrollableShotRail = false,
  className,
}: Pass1FocusBlockProps) {
  void _onMarkEnd
  void _onMarkFos
  const compactStrokes = useCompactPass1Strokes()
  const [shotsExpanded, setShotsExpanded] = useState(false)
  const stage = derivePass1Stage(state, { inForm: true, hasContacts: true })
  const endLocked = isPass1EndLockedStage(stage)
  const visible = visibleShotNumbers(state.shotCount, state.end)
  const selected =
    typeof selectedShot === 'number' && state.shots[selectedShot] ? selectedShot : null
  // No shot selected (select_fa / post-FA optional): show nothing until user taps.
  const detailShots =
    selected === null
      ? []
      : shotsExpanded
        ? visible
        : visible.filter((n) => n === selected)
  const showNoAttackRail =
    stage === 'select_fa' ||
    (stage === 'optional' && state.noFirstAttack && state.end !== 1)
  const showHighlightRail = Boolean(onToggleHighlight) && !endLocked

  const handleSelectShot = (n: number) => {
    if (endLocked && typeof state.end === 'number' && n !== state.end) return
    onSelectShot?.(n)
  }

  return (
    <section
      className={cn('bg-bg-card text-primary min-w-0 w-full px-1.5 py-1', className)}
      aria-label="Pass 1 focus"
    >
      {/* Sticky: RALLY rail + phase markers; guiding dialog below rail (MA-77). */}
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
          onSelectShot={handleSelectShot}
          scrollable={scrollableShotRail}
          showNoAttack={showNoAttackRail}
          onNoAttack={onNoAttack}
          noAttackInteractive={stage === 'select_fa' || stage === 'optional'}
          fosClearInteractive={stage === 'fa_details'}
          onClearFos={
            stage === 'fa_details' && onClearFosDecision
              ? onClearFosDecision
              : undefined
          }
          showHighlight={showHighlightRail}
          isHighlight={isHighlight}
          onToggleHighlight={onToggleHighlight}
        />
        <Pass1StageInfoBox stage={stage} canSave={canSave} />
      </div>
      <div className="flex flex-col gap-1">
        {detailShots.map((n) => {
          const shot = state.shots[n]
          if (!shot) return null
          const isServe = n === 1
          const isSelected = selected === n
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
                onSelect={() => handleSelectShot(n)}
              >
                <ShotTagging
                  n={n}
                  state={state}
                  isSelected={isSelected}
                  stage={stage}
                  onToggleShotChoice={onToggleShotChoice}
                  onToggleAttribute={onToggleAttribute}
                  onToggleEnding={onToggleEnding}
                  onToggleMissReason={onToggleMissReason}
                  onToggleReviewFlag={onToggleReviewFlag}
                  compactStrokes={compactStrokes}
                />
              </ShotRow>
            </div>
          )
        })}
        {selected === null && stage === 'optional' && (
          <p className="text-[10px] text-muted px-0.5">
            Tap a shot on the rail for optional details
          </p>
        )}
        {visible.length > 1 &&
          selected !== null &&
          stage !== 'select_fa' &&
          !endLocked && (
          <button
            type="button"
            className="self-start text-[10px] font-semibold text-muted underline-offset-2 hover:underline"
            onClick={() => setShotsExpanded((v) => !v)}
            aria-expanded={shotsExpanded}
          >
            {shotsExpanded ? 'Show selected only' : `Show all ${visible.length} shots`}
          </button>
        )}
      </div>
      <div data-pass1-tail aria-hidden className="shrink-0" />
    </section>
  )
}

/** Phase group label for a shot on the rally rail (MA-77). */
function railPhaseGroupName(n: number, state: RallyTimelineState): string {
  if (n === 1) return 'SERVE'
  return PHASE_GROUP[phaseAt(n, state)]
}

/** Compact phase markers spanning shot groups on the rally row. */
function Pass1RailPhaseMarkers({
  state,
  slotCount,
  scrollable,
}: {
  state: RallyTimelineState
  slotCount: number
  scrollable: boolean
}) {
  const inPlay = visibleShotNumbers(state.shotCount, state.end)
  if (inPlay.length === 0) return null

  type Group = { name: string; start: number; end: number }
  const groups: Group[] = []
  for (const n of inPlay) {
    const name = railPhaseGroupName(n, state)
    const last = groups[groups.length - 1]
    if (last && last.name === name) {
      last.end = n
    } else {
      groups.push({ name, start: n, end: n })
    }
  }

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-nowrap items-stretch',
        scrollable && 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      )}
      style={{ gap: 'var(--control-gap)' }}
      aria-label="Phase groups"
    >
      {Array.from({ length: slotCount }, (_, i) => i + 1).map((n) => {
        const group = groups.find((g) => n === g.start)
        const inGroup = groups.some((g) => n >= g.start && n <= g.end)
        return (
          <div
            key={n}
            className="min-w-0 flex items-center justify-center"
            style={{ flex: scrollable ? '0 0 2rem' : '1 1 0' }}
          >
            {group ? (
              <span className="w-full truncate text-center text-[8px] font-bold uppercase tracking-wide text-muted leading-none">
                {group.name === 'PRE OFFENSIVE SHOT'
                  ? 'PRE'
                  : group.name === 'INITIAL OFFENSE'
                    ? 'INIT'
                    : group.name === 'CONTINUATION'
                      ? 'CONT'
                      : 'SRV'}
              </span>
            ) : inGroup ? (
              <span className="h-px w-3/4 mx-auto bg-pill-idle-border" aria-hidden />
            ) : (
              <span className="h-px w-full bg-transparent" aria-hidden />
            )}
          </div>
        )
      })}
    </div>
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
  showNoAttack = false,
  onNoAttack,
  noAttackInteractive = false,
  fosClearInteractive = false,
  onClearFos,
  showHighlight = false,
  isHighlight = false,
  onToggleHighlight,
}: {
  state: RallyTimelineState
  players: [string, string]
  server: string
  activeShot?: number | null
  selectedShot?: number | null
  onSelectShot?: (n: number) => void
  scrollable?: boolean
  /** Last cell: No Attack (select_fa / optional undo). */
  showNoAttack?: boolean
  onNoAttack?: () => void
  noAttackInteractive?: boolean
  /** MA-73: FA caption clears FA → select_fa while in fa_details. */
  fosClearInteractive?: boolean
  onClearFos?: () => void
  /** MA-77: ★ Highlight on rally rail. */
  showHighlight?: boolean
  isHighlight?: boolean
  onToggleHighlight?: () => void
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
  const noAttackSelected = state.noFirstAttack

  return (
    <div className="space-y-0.5" role="group" aria-label="Rally shot guide">
      <SectionLabel label="Rally" />
      <Pass1RailPhaseMarkers
        state={state}
        slotCount={slotCount}
        scrollable={scrollable}
      />
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
                  'relative w-full h-7 rounded-md font-black tabular-nums text-xs touch-manipulation',
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
                    ? 'border-2 border-contact-selected shadow-sm'
                    : 'border border-transparent',
                  active && !selected && !grey && 'ring-1 ring-contact-live/70',
                  !canTap && 'cursor-default'
                )}
              >
                {n}
                {flagged && !isFos && !isEnd && (
                  <span
                    className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-review"
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
              {isFos && fosClearInteractive && onClearFos ? (
                <button
                  type="button"
                  className="min-h-[0.75rem] text-[8px] font-black uppercase leading-none tracking-wide text-shot-first-attack touch-manipulation"
                  title="Clear first attack — choose again"
                  aria-label={`Clear first attack on shot ${n}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClearFos()
                  }}
                >
                  {isEnd ? 'FA·E' : 'FA'}
                </button>
              ) : (
                <span
                  className={cn(
                    'min-h-[0.75rem] text-[8px] font-black uppercase leading-none tracking-wide',
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
              )}
            </div>
          )
        })}
        {showNoAttack && (
          <div
            className="relative min-w-0 flex flex-col items-center gap-px"
            style={{ flex: scrollable ? '0 0 2.75rem' : '1.15 1 0' }}
            role="listitem"
          >
            <button
              type="button"
              disabled={!noAttackInteractive}
              aria-pressed={noAttackSelected}
              title={
                noAttackSelected
                  ? 'No attack — tap to undo'
                  : 'No first attack this point'
              }
              onClick={() => {
                if (!noAttackInteractive) return
                onNoAttack?.()
              }}
              className={cn(
                'relative w-full h-7 rounded font-black text-[9px] leading-none uppercase tracking-wide',
                'border touch-manipulation',
                !noAttackInteractive && 'cursor-default opacity-80'
              )}
              style={
                noAttackSelected
                  ? { backgroundColor: NO_ATTACK_RED, borderColor: NO_ATTACK_RED, color: '#fff' }
                  : {
                      backgroundColor: 'var(--color-pill-idle)',
                      borderColor: 'var(--color-pill-idle-border)',
                      color: 'var(--color-text)',
                    }
              }
            >
              No
            </button>
            <span className="h-1 w-full max-w-none rounded-sm shrink-0 bg-transparent" aria-hidden />
            <span
              className={cn(
                'min-h-[0.75rem] text-[8px] font-black uppercase leading-none tracking-wide',
                !noAttackSelected && 'text-muted'
              )}
              style={noAttackSelected ? { color: NO_ATTACK_RED } : undefined}
            >
              Atk
            </span>
          </div>
        )}
        {showHighlight && onToggleHighlight && (
          <div
            className="relative min-w-0 flex flex-col items-center gap-px"
            style={{ flex: scrollable ? '0 0 2rem' : '0.85 1 0' }}
            role="listitem"
          >
            <button
              type="button"
              aria-pressed={isHighlight}
              title={
                isHighlight
                  ? 'Highlight on — tap to clear'
                  : 'Mark this rally as a highlight (show-reel)'
              }
              aria-label={isHighlight ? 'Highlight on — tap to clear' : 'Highlight rally'}
              onClick={() => onToggleHighlight()}
              className={cn(
                'relative w-full h-7 rounded font-bold text-sm leading-none',
                'border touch-manipulation',
                isHighlight
                  ? 'bg-warning border-warning text-neutral-950'
                  : 'bg-[var(--color-pill-idle)] border-[var(--color-pill-idle-border)] text-warning'
              )}
            >
              ★
            </button>
            <span className="h-1 w-full max-w-none rounded-sm shrink-0 bg-transparent" aria-hidden />
            <span
              className={cn(
                'min-h-[0.75rem] text-[8px] font-black uppercase leading-none tracking-wide',
                isHighlight ? 'text-warning' : 'text-muted'
              )}
            >
              ★
            </span>
          </div>
        )}
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
