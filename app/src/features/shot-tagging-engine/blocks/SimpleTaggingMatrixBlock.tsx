/**
 * SimpleTaggingMatrixBlock — Phase 2.5 Pass 1 visual parity (MA-60) + MA-63/64
 * density + MA-65 Pass 1 detail-card retheme.
 *
 * CNT columns + final RALLY column (None / ★). Row labels sit ABOVE each
 * matrix section (not sticky-left) so shot columns can scroll L→R freely.
 * Shot # headers: number + colour/underline only (no FA/End captions).
 * Idle = pill-idle (Shot 1 Offensive non-pressed). Pressed + shot # + detail
 * use Pass 1 protocol colours. Selected-shot detail card matches Pass 1
 * ShotRow (pastel wash, 3px left stripe, role badges, contact-selected ring).
 * Rally|Shot lives on the video overlay (composer).
 * Offensive/End/Review vertical gaps use `--control-gap` (same as DetailPill rows).
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import { derivePass1ShotTagRole } from '@/rules/derive/shot/derivePass1ShotTagRole'
import {
  ENDING_OPTIONS,
  END_STROKE_OPTIONS,
  END_STROKE_OPTIONS_COMPACT,
  MISS_REASON_OPTIONS,
  PHASE_META,
  WING_OPTIONS,
  getShotSummary,
  isErrorEnding,
  phaseAt,
  playerForShot,
  type PointEnding,
  type PointMissReason,
  type RallyTimelineState,
  type ShotAttributeKey,
  type ShotChoiceKey,
} from '../composers/pass1FocusModel'
import {
  isMissReasonRequired,
  type SimpleMatrixRow,
} from '../composers/simpleTaggingModel'

/** Kept for composer/edit loop-scope state (control lives on video overlay). */
export type SimpleLoopScope = 'rally' | 'shot'

export interface SimpleTaggingMatrixBlockProps {
  state: RallyTimelineState
  offensiveShots: number[]
  players: [string, string]
  server: string
  /** Playhead shot (green underline). */
  activeShot?: number | null
  selectedShot: number | null
  activeRow: SimpleMatrixRow | null
  reviewDetailFocused: boolean
  onSelectShot: (n: number) => void
  onToggleOffensive: (n: number) => void
  onNoAttack: () => void
  onMarkEnd: (n: number) => void
  onToggleReview: (n: number) => void
  onToggleEnding: (value: PointEnding) => void
  onToggleMissReason: (value: PointMissReason) => void
  onToggleShotChoice: (n: number, key: ShotChoiceKey, value: string) => void
  onToggleAttribute: (n: number, key: ShotAttributeKey) => void
  onReviewDetailFocusChange: (focused: boolean) => void
  onSelectRow: (row: SimpleMatrixRow) => void
  /** Pass 1 sticky: mark selected shot as FOS (toggle). */
  onMarkFos: (n: number) => void
  /** Rally-level highlight (lives in RALLY column on Review row). */
  isHighlight?: boolean
  onToggleHighlight?: () => void
  className?: string
}

const LINEAR_ROWS: { id: SimpleMatrixRow; label: string; short: string }[] = [
  { id: 'offensive', label: 'Offensive Shots', short: 'Offensive' },
  { id: 'end', label: 'End', short: 'End' },
]

const REVIEW_ROW = { id: 'review' as const, label: 'Review', short: 'Review' }

/** Same square footprint for shot cells and RALLY toggles (matches DetailPill height). */
const CELL = 'var(--control-height)'
const COL_W = CELL
const RALLY_W = CELL

const cellToggle =
  'tag-control h-[var(--control-height)] w-[var(--control-height)] shrink-0 px-0 touch-manipulation'

type PillKind =
  | 'fos'
  | 'end'
  | 'winner'
  | 'error'
  | 'air'
  | 'standing'
  | 'wing'
  | 'stroke'
  | 'review'

/** Pass 1 TimelinePill colour map — shared by detail strip + pressed matrix cells. */
const PILL_COLOR: Record<PillKind, string> = {
  fos: 'var(--color-shot-first-attack)',
  end: 'var(--color-shot-end)',
  winner: 'var(--color-result-winner)',
  error: 'var(--color-result-error)',
  air: 'var(--color-result-air)',
  standing: 'var(--color-shot-serve)',
  wing: 'var(--color-player-1)',
  stroke: 'var(--color-shot-aggressive)',
  review: 'var(--color-review)',
}

const RESULT_HEADER_BG = {
  winner: 'bg-result-winner-bg',
  error: 'bg-result-error-bg',
  air: 'bg-result-air-bg',
} as const

/** Pass 1 ShotRow washes — opaque pastels (never grey card surface). */
const PLAYER_ROW_BG = { p1: 'bg-player-1-bg', p2: 'bg-player-2-bg' } as const
const SERVE_ROW_BG = 'bg-shot-serve-bg'
const FOS_ROW_BG = 'bg-shot-first-attack-bg'
const RESULT_ROW_BG = {
  winner: 'bg-result-winner-bg',
  error: 'bg-result-error-bg',
  air: 'bg-result-air-bg',
} as const
const SERVE_STRIPE = 'var(--color-shot-serve)'

type ShotRoleTone = 'serve' | 'receive' | 'attack' | 'winner' | 'error' | 'air'

type SimpleShotVisual = {
  rowBg: string
  stripeColor: string
  roleLabel: string | null
  roleTone: ShotRoleTone
}

/** Mirror Pass1FocusBlock.deriveShotVisual for Simple detail-card paint. */
function deriveSimpleShotVisual(
  n: number,
  state: RallyTimelineState,
  players: [string, string],
  server: string
): SimpleShotVisual {
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

  const roleTone: ShotRoleTone =
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

function useCompactPass1Strokes(): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 639px)').matches
      : false
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

function DetailPill({
  label,
  selected,
  onClick,
  kind,
  title,
  className,
}: {
  label: string
  selected: boolean
  onClick: () => void
  kind: PillKind
  title?: string
  className?: string
}) {
  const color = PILL_COLOR[kind]
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex flex-none items-center justify-center',
        'h-[var(--control-height)] whitespace-nowrap rounded-[var(--control-radius)] border',
        'px-[var(--control-px)] text-[length:var(--control-text)] font-semibold cursor-pointer touch-manipulation',
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

function SectionLabel({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left text-[8px] font-bold uppercase tracking-wide leading-none touch-manipulation',
        active ? 'text-primary' : 'text-muted'
      )}
      aria-label={`${label} section`}
    >
      {label}
    </button>
  )
}

export function SimpleTaggingMatrixBlock({
  state,
  offensiveShots,
  players,
  server,
  activeShot = null,
  selectedShot,
  activeRow,
  reviewDetailFocused,
  onSelectShot,
  onToggleOffensive,
  onNoAttack,
  onMarkEnd,
  onToggleReview,
  onToggleEnding,
  onToggleMissReason,
  onToggleShotChoice,
  onToggleAttribute,
  onReviewDetailFocusChange,
  onSelectRow,
  onMarkFos,
  isHighlight = false,
  onToggleHighlight,
  className,
}: SimpleTaggingMatrixBlockProps) {
  const compactStrokes = useCompactPass1Strokes()
  const shotCount = state.shotCount
  const shots = Array.from({ length: shotCount }, (_, i) => i + 1)
  const offensiveSet = new Set(offensiveShots)
  const fos = typeof state.fos === 'number' ? state.fos : null
  const end = typeof state.end === 'number' ? state.end : null
  const endShot = end !== null ? state.shots[end] : null
  const selectedShotData =
    selectedShot !== null ? state.shots[selectedShot] ?? null : null
  const endStrokes = compactStrokes
    ? END_STROKE_OPTIONS_COMPACT
    : END_STROKE_OPTIONS

  const endResultBg = !state.ending
    ? null
    : state.ending === 'winner' || state.ending === 'lucky'
      ? RESULT_HEADER_BG.winner
      : state.ending === 'error_air'
        ? RESULT_HEADER_BG.air
        : RESULT_HEADER_BG.error

  const handleCell = (row: SimpleMatrixRow, n: number) => {
    onSelectShot(n)
    onSelectRow(row)
    if (row === 'offensive') onToggleOffensive(n)
    else if (row === 'end') onMarkEnd(n)
    else if (row === 'review') {
      onToggleReview(n)
      onReviewDetailFocusChange(true)
    }
  }

  const handleSelectColumn = (n: number) => {
    onSelectShot(n)
  }

  // Detail strip: Pass 1 sticky-tool function whenever a shot is selected.
  const showDetail = selectedShot !== null && selectedShotData !== null
  const showFosTools =
    selectedShot !== null && selectedShot >= 2 && state.end !== 1
  const showEndDetail = selectedShot !== null && selectedShot === end
  const detailVisual =
    showDetail && selectedShot !== null
      ? deriveSimpleShotVisual(selectedShot, state, players, server)
      : null
  const detailHitter =
    showDetail && selectedShot !== null
      ? playerForShot(selectedShot, players, server)
      : null
  const detailSummary =
    showDetail && selectedShotData
      ? getShotSummary(selectedShot!, selectedShotData)
      : ''
  const detailIsFos =
    showDetail && selectedShot !== null && state.fos === selectedShot
  const detailFlagged =
    showDetail && selectedShotData != null && selectedShotData.reviewKind !== null

  const pressedStyle = (kind: PillKind): CSSProperties => ({
    backgroundColor: PILL_COLOR[kind],
    borderColor: PILL_COLOR[kind],
    color: 'var(--color-text)',
  })

  const renderShotCell = (row: SimpleMatrixRow, n: number) => {
    const on =
      row === 'offensive'
        ? offensiveSet.has(n)
        : row === 'end'
          ? end === n
          : state.shots[n]?.reviewKind != null
    const isFosCell = row === 'offensive' && fos === n
    const disabled = row === 'offensive' && (n < 2 || state.end === 1)
    const columnSelected = selectedShot === n
    const pressedKind: PillKind =
      row === 'review' ? 'review' : row === 'end' ? 'end' : 'fos'
    return (
      <div
        key={`${row}-${n}`}
        className="flex items-center justify-center"
        style={{ flex: `0 0 ${COL_W}`, width: COL_W, height: CELL }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleCell(row, n)}
          className={cn(
            cellToggle,
            'text-[11px] font-bold',
            disabled && 'opacity-30',
            // Selected idle cell: Pass 1 contact-selected border (not brand teal)
            columnSelected &&
              !on &&
              'border-2 border-contact-selected'
          )}
          style={on ? pressedStyle(pressedKind) : undefined}
          aria-pressed={on}
          aria-label={`${row} shot ${n}${isFosCell ? ', first offensive' : ''}`}
          title={isFosCell ? 'First offensive shot (FOS)' : `${row} · ${n}`}
        >
          {on ? (isFosCell ? 'F' : '■') : ''}
        </button>
      </div>
    )
  }

  const renderRow = (row: {
    id: SimpleMatrixRow
    label: string
    short: string
  }) => (
    <div
      key={row.id}
      className={cn(
        // Label→cells: same tight mb as ChoiceRow (`mb-px`); section↔section uses `--control-gap`
        'space-y-px',
        activeRow === row.id && 'bg-white/[0.03] rounded-sm'
      )}
    >
      {/* Row label ABOVE cells — not sticky-left (frees L→R scroll width) */}
      <SectionLabel
        label={row.short}
        active={activeRow === row.id}
        onClick={() => onSelectRow(row.id)}
      />
      <div
        className="flex flex-nowrap items-center gap-[var(--control-gap)]"
      >
        {shots.map((n) => renderShotCell(row.id, n))}

        {/* Final RALLY column — same square toggle form as shot cells */}
        <div
          className="flex items-center justify-center"
          style={{ flex: `0 0 ${RALLY_W}`, width: RALLY_W, height: CELL }}
        >
          {row.id === 'offensive' && state.end !== 1 ? (
            <button
              type="button"
              aria-pressed={state.noFirstAttack}
              onClick={() => {
                onSelectRow('offensive')
                onNoAttack()
              }}
              className={cn(cellToggle, 'text-[9px] font-bold')}
              style={state.noFirstAttack ? pressedStyle('fos') : undefined}
              title={
                state.noFirstAttack
                  ? 'No first attack — tap to clear (undecided)'
                  : 'No attack this point'
              }
            >
              None
            </button>
          ) : row.id === 'review' && onToggleHighlight ? (
            <button
              type="button"
              aria-pressed={isHighlight}
              onClick={onToggleHighlight}
              className={cn(
                cellToggle,
                'text-[12px] font-bold',
                // Pressed ★ keeps Pass 1 highlight amber; idle = pill-idle (canonical)
                isHighlight &&
                  'border-amber-400 bg-amber-500 text-neutral-950'
              )}
              title="Mark this whole rally as a highlight (show-reel)"
              aria-label={isHighlight ? 'Highlight on' : 'Highlight off'}
            >
              ★
            </button>
          ) : (
            <span
              className="inline-block h-[var(--control-height)] w-[var(--control-height)]"
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {/* Pinned matrix — section labels above; shot columns scroll L→R */}
      <div className="shrink-0 px-1.5 pt-0.5 pb-0.5">
        <div
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Simple tagging matrix"
        >
          <div
            className="min-w-max flex flex-col"
            style={{ gap: 'var(--control-gap)' }}
          >
            {/* Shot header L→R = colour + live underline only (no FA/End captions) */}
            <div
              className="flex flex-nowrap items-end gap-[var(--control-gap)]"
              role="list"
              aria-label="Shots in this rally"
            >
              {shots.map((n) => {
                const hitter = playerForShot(n, players, server)
                const isPlayer1 = hitter === players[0]
                const isFos = fos === n
                const isEnd = end === n
                const flagged = Boolean(state.shots[n]?.reviewKind)
                const active = activeShot === n
                const selected = selectedShot === n
                return (
                  <div
                    key={`h-${n}`}
                    className="relative flex flex-col items-center gap-px"
                    style={{ flex: `0 0 ${COL_W}`, width: COL_W }}
                    role="listitem"
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-current={active ? 'true' : undefined}
                      title={
                        isFos && isEnd
                          ? `Shot ${n} — first attack & end`
                          : isFos
                            ? `Shot ${n} — first attack`
                            : isEnd
                              ? `Shot ${n} — end`
                              : `Select shot ${n}`
                      }
                      onClick={() => handleSelectColumn(n)}
                      className={cn(
                        cellToggle,
                        'relative font-black tabular-nums text-[11px]',
                        isPlayer1
                          ? 'bg-player-1-bg text-primary'
                          : 'bg-player-2-bg text-primary',
                        isFos && 'bg-shot-first-attack-bg',
                        isEnd && (endResultBg ?? 'bg-shot-end-bg'),
                        flagged &&
                          !isFos &&
                          !isEnd &&
                          'bg-review-bg',
                        selected
                          ? 'border-2 border-contact-selected'
                          : 'border border-transparent'
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
                        'h-1 w-full rounded-sm shrink-0',
                        active ? 'bg-contact-live' : 'bg-transparent'
                      )}
                      aria-hidden
                    />
                  </div>
                )
              })}

              {/* RALLY column spacer (cycle moved to video overlay) */}
              <div
                className="flex flex-col items-center justify-end gap-px"
                style={{ flex: `0 0 ${RALLY_W}`, width: RALLY_W }}
                role="listitem"
                aria-label="Rally column"
              >
                <span
                  className="inline-block h-[var(--control-height)] w-[var(--control-height)]"
                  aria-hidden
                />
                <span className="h-1 w-full shrink-0 bg-transparent" aria-hidden />
              </div>
            </div>

            {/* Offensive + End + Review — vertical gap = DetailPill `--control-gap` */}
            <div
              role="group"
              aria-label="Offensive and End"
              className="flex flex-col"
              style={{ gap: 'var(--control-gap)' }}
            >
              {LINEAR_ROWS.map((row) => renderRow(row))}
            </div>

            {/* Review apart — label above cells */}
            <div role="group" aria-label="Review">
              {renderRow(REVIEW_ROW)}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable detail — Pass 1 ShotRow card + sticky-tool function */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {showDetail &&
          selectedShot !== null &&
          selectedShotData &&
          detailVisual &&
          detailHitter && (
          <div
            className={cn(
              'flex items-stretch gap-1.5 rounded-md px-1.5 py-1 min-w-0 w-full',
              'border-2 border-contact-selected shadow-[inset_0_0_0_1px_var(--color-contact-selected)]',
              detailVisual.rowBg
            )}
            aria-label={`Shot ${selectedShot} detail`}
          >
            <div
              className="w-[3px] flex-none rounded-full self-stretch"
              style={{ background: detailVisual.stripeColor }}
              aria-hidden
            />
            <div
              className="flex-1 min-w-0 flex flex-col"
              style={{ gap: 'var(--control-gap)' }}
            >
              {/* Pass 1 ShotRow header: # + hitter + role badge + summary */}
              <div className="min-w-0 flex justify-between items-center gap-1.5 min-h-[15px]">
                <div className="inline-flex flex-none items-center gap-1.5 text-[11px]">
                  <span className="w-3.5 text-[12px] font-bold text-primary">
                    {selectedShot}
                  </span>
                  <strong className="text-primary">{detailHitter}</strong>
                  {detailVisual.roleLabel && (
                    <span
                      className={cn(
                        'inline-flex items-center h-[18px] px-1.5 rounded-full text-[9px] font-bold tracking-wide uppercase text-neutral-50',
                        detailVisual.roleTone === 'serve' && 'bg-shot-serve',
                        detailVisual.roleTone === 'receive' && 'bg-shot-receive',
                        detailVisual.roleTone === 'attack' && 'bg-shot-first-attack',
                        detailVisual.roleTone === 'winner' && 'bg-result-winner',
                        detailVisual.roleTone === 'error' && 'bg-result-error',
                        detailVisual.roleTone === 'air' && 'bg-result-air'
                      )}
                    >
                      {detailVisual.roleLabel}
                    </span>
                  )}
                  {detailIsFos && detailVisual.roleTone !== 'attack' && (
                    <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-shot-first-attack text-neutral-50 text-[9px] font-bold tracking-wide uppercase">
                      FOS
                    </span>
                  )}
                  {detailFlagged && (
                    <span className="inline-flex items-center h-[18px] px-1.5 rounded-full bg-review text-neutral-50 text-[9px] font-bold tracking-wide uppercase">
                      Flagged
                    </span>
                  )}
                </div>
                <span
                  className="min-w-0 text-right overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted"
                  title={detailSummary}
                >
                  {detailSummary}
                </span>
              </div>

              <div
                className="flex flex-wrap items-center justify-end gap-1"
                aria-label={`Shot ${selectedShot} tools`}
              >
                <span className="mr-auto text-[9px] font-bold uppercase tracking-wide text-muted">
                  {typeof state.fos === 'number'
                    ? `FA ${state.fos}`
                    : state.noFirstAttack
                      ? 'No attack'
                      : state.end === 1
                        ? ''
                        : 'FA?'}
                  {typeof state.end === 'number'
                    ? `${state.end === 1 && state.fos == null && !state.noFirstAttack ? '' : ' · '}End ${state.end}`
                    : ' · End?'}
                </span>
                {showFosTools && (
                  <>
                    <DetailPill
                      kind="fos"
                      label={state.fos === selectedShot ? 'First attack ✓' : 'First attack'}
                      selected={state.fos === selectedShot}
                      title={
                        state.fos === selectedShot
                          ? `Shot ${selectedShot} is the first attack — tap to clear (undecided)`
                          : `Mark shot ${selectedShot} as the first attack of the point`
                      }
                      onClick={() => onMarkFos(selectedShot)}
                    />
                    <DetailPill
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
                <DetailPill
                  kind="end"
                  label={state.end === selectedShot ? 'End point ✓' : 'End point'}
                  selected={state.end === selectedShot}
                  title={
                    state.end === selectedShot
                      ? `Shot ${selectedShot} ends the point — tap to un-mark the point end`
                      : `Mark shot ${selectedShot} as the last shot of the point`
                  }
                  onClick={() => {
                    onSelectRow('end')
                    onMarkEnd(selectedShot)
                  }}
                />
                <DetailPill
                  kind="review"
                  label="Flag for review"
                  selected={selectedShotData.reviewKind !== null}
                  title={
                    selectedShotData.reviewKind !== null
                      ? `Shot ${selectedShot} is flagged for later review — tap to remove the flag`
                      : `Flag shot ${selectedShot} for later review`
                  }
                  onClick={() => {
                    onSelectRow('review')
                    onToggleReview(selectedShot)
                    onReviewDetailFocusChange(true)
                  }}
                />
              </div>

              {showEndDetail && endShot && end !== null && (
                <>
                  {end > 1 && (
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
                            <DetailPill
                              key={v}
                              kind="wing"
                              label={v}
                              selected={endShot.wing === v}
                              onClick={() => onToggleShotChoice(end, 'wing', v)}
                              className="min-w-[1.75rem]"
                            />
                          ))}
                          <DetailPill
                            kind="wing"
                            label="Pivot"
                            selected={endShot.isPivot}
                            onClick={() => onToggleAttribute(end, 'isPivot')}
                            className="min-w-[2.25rem]"
                          />
                        </div>
                        <div
                          className="flex flex-1 min-w-0 flex-wrap justify-end"
                          style={{ gap: 'var(--control-gap)' }}
                        >
                          {endStrokes.map((v) => (
                            <DetailPill
                              key={v}
                              kind="stroke"
                              label={v}
                              selected={endShot.stroke === v}
                              onClick={() => onToggleShotChoice(end, 'stroke', v)}
                              className="min-w-[2.25rem]"
                            />
                          ))}
                        </div>
                      </div>
                    </ChoiceRow>
                  )}

                  <ChoiceRow label="Result">
                    {ENDING_OPTIONS.map(({ value, label }) => (
                      <DetailPill
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
                        title={
                          value === 'lucky'
                            ? 'Lucky — valid when the error was forced (opponent lucky)'
                            : undefined
                        }
                        onClick={() => onToggleEnding(value)}
                      />
                    ))}
                  </ChoiceRow>

                  {isMissReasonRequired(state.ending) && (
                    <ChoiceRow
                      label={`Miss reason${isErrorEnding(state.ending) ? ' (required)' : ''}`}
                    >
                      {MISS_REASON_OPTIONS.map(({ value, label }) => (
                        <DetailPill
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
              )}

              {selectedShotData.reviewKind != null && (
                <div
                  className={cn(
                    'mt-0.5 rounded border border-review/40 bg-review-bg p-2',
                    reviewDetailFocused && 'ring-1 ring-review'
                  )}
                  onFocus={() => onReviewDetailFocusChange(true)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      onReviewDetailFocusChange(false)
                    }
                  }}
                  tabIndex={0}
                  role="group"
                  aria-label="Review detail"
                >
                  <p className="text-[11px] text-primary">
                    Review flagged → technical. Loop pauses while this detail is focused.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
