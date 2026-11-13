/**
 * SimpleTaggingMatrixBlock — Phase 2.1 matrix (Paul UX).
 *
 * Pinned CNT-style columns + playhead underline. Rows: Offensive · End · Review
 * (grouped Offensive+End; Review apart). No-attack lives on the Offensive row.
 * Detail = Pass 1 look for FOS / End only; End includes wing + shot + ending.
 * Rally ★ lives on the Save-point row. Lighter cells; ghost-style End.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import {
  ENDING_OPTIONS,
  END_STROKE_OPTIONS,
  END_STROKE_OPTIONS_COMPACT,
  MISS_REASON_OPTIONS,
  WING_OPTIONS,
  isErrorEnding,
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

export type SimpleLoopScope = 'rally' | 'shot'

export interface SimpleTaggingMatrixBlockProps {
  state: RallyTimelineState
  offensiveShots: number[]
  players: [string, string]
  server: string
  /** Playhead shot (CNT-style underline). */
  activeShot?: number | null
  selectedShot: number | null
  activeRow: SimpleMatrixRow | null
  reviewDetailFocused: boolean
  loopScope: SimpleLoopScope
  onLoopScopeChange: (scope: SimpleLoopScope) => void
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
  className?: string
}

const LINEAR_ROWS: { id: SimpleMatrixRow; label: string; short: string }[] = [
  { id: 'offensive', label: 'Offensive Shots', short: 'Offensive' },
  { id: 'end', label: 'End', short: 'End' },
]

const REVIEW_ROW = { id: 'review' as const, label: 'Review', short: 'Review' }

const PILL_COLOR = {
  fos: 'var(--color-shot-first-attack)',
  end: 'var(--color-shot-end)',
  winner: 'var(--color-result-winner)',
  error: 'var(--color-result-error)',
  air: 'var(--color-result-air)',
  standing: 'var(--color-shot-serve)',
  wing: 'var(--color-player-1)',
  stroke: 'var(--color-shot-aggressive)',
} as const

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
  kind: keyof typeof PILL_COLOR
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

export function SimpleTaggingMatrixBlock({
  state,
  offensiveShots,
  players,
  server,
  activeShot = null,
  selectedShot,
  activeRow,
  reviewDetailFocused,
  loopScope,
  onLoopScopeChange,
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
  className,
}: SimpleTaggingMatrixBlockProps) {
  const compactStrokes = useCompactPass1Strokes()
  const shotCount = state.shotCount
  const shots = Array.from({ length: shotCount }, (_, i) => i + 1)
  const offensiveSet = new Set(offensiveShots)
  const fos = typeof state.fos === 'number' ? state.fos : null
  const end = typeof state.end === 'number' ? state.end : null
  const endShot = end !== null ? state.shots[end] : null
  const endStrokes = compactStrokes
    ? END_STROKE_OPTIONS_COMPACT
    : END_STROKE_OPTIONS

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

  // Detail only for FOS / End (Pass 1 look); column select highlights always.
  const showFosDetail =
    selectedShot !== null &&
    state.end !== 1 &&
    (selectedShot === fos ||
      (activeRow === 'offensive' && selectedShot >= 2) ||
      (state.noFirstAttack && activeRow === 'offensive'))

  const showEndDetail = selectedShot !== null && selectedShot === end

  const showDetail = showFosDetail || showEndDetail

  const renderRow = (
    row: { id: SimpleMatrixRow; label: string; short: string },
    opts?: { ghost?: boolean; showNoAttack?: boolean }
  ) => (
    <div
      key={row.id}
      className={cn(
        'flex flex-nowrap items-center px-1 py-0.5',
        activeRow === row.id && 'bg-white/[0.04]'
      )}
      style={{ gap: 'var(--control-gap)' }}
    >
      <div className="sticky left-0 z-10 flex w-[4.5rem] shrink-0 flex-col gap-0.5 bg-bg-surface px-0.5">
        <button
          type="button"
          className="text-left text-[10px] font-semibold leading-tight text-neutral-300 touch-manipulation"
          onClick={() => onSelectRow(row.id)}
          aria-label={`${row.label} row`}
        >
          {row.short}
        </button>
        {opts?.showNoAttack && state.end !== 1 && (
          <button
            type="button"
            aria-pressed={state.noFirstAttack}
            onClick={() => {
              onSelectRow('offensive')
              onNoAttack()
            }}
            className={cn(
              'rounded border px-0.5 py-0.5 text-[9px] font-bold leading-tight touch-manipulation',
              state.noFirstAttack
                ? 'border-[color:var(--color-shot-first-attack)] bg-[color:var(--color-shot-first-attack)]/30 text-neutral-50'
                : 'border-pill-idle-border/70 bg-transparent text-muted'
            )}
            title={
              state.noFirstAttack
                ? 'No first attack — tap to clear (undecided)'
                : 'No attack this point'
            }
          >
            {state.noFirstAttack ? 'No atk ✓' : 'No atk'}
          </button>
        )}
      </div>
      {shots.map((n) => {
        const on =
          row.id === 'offensive'
            ? offensiveSet.has(n)
            : row.id === 'end'
              ? end === n
              : state.shots[n]?.reviewKind != null
        const isFosCell = row.id === 'offensive' && fos === n
        const disabled = row.id === 'offensive' && (n < 2 || state.end === 1)
        const columnSelected = selectedShot === n
        return (
          <div
            key={`${row.id}-${n}`}
            className={cn(
              'flex justify-center',
              columnSelected && 'rounded-md bg-brand-primary/10'
            )}
            style={{ flex: '0 0 2rem' }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleCell(row.id, n)}
              className={cn(
                'flex h-8 w-8 items-center justify-center text-[11px] font-bold touch-manipulation',
                opts?.ghost
                  ? 'rounded-md border border-dashed'
                  : 'rounded-md border',
                disabled && 'opacity-30',
                on
                  ? row.id === 'review'
                    ? 'border-review bg-review/30 text-neutral-50'
                    : row.id === 'end'
                      ? 'border-[color:var(--color-shot-end)] bg-shot-end-bg text-primary'
                      : 'border-brand-primary bg-brand-primary/25 text-neutral-50'
                  : opts?.ghost
                    ? 'border-pill-idle-border/50 bg-transparent text-muted'
                    : 'border-transparent bg-transparent text-muted'
              )}
              aria-pressed={on}
              aria-label={`${row.label} shot ${n}${isFosCell ? ', first offensive' : ''}`}
              title={
                isFosCell
                  ? 'First offensive shot (FOS)'
                  : `${row.label} · ${n}`
              }
            >
              {on ? (isFosCell ? 'F' : '■') : '·'}
            </button>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {/* Pinned matrix — does not scroll away */}
      <div className="shrink-0 space-y-1.5 px-1.5 pt-1.5 pb-1">
        <div
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Simple tagging matrix"
        >
          <div className="min-w-max">
            {/* Shot header (CNT layout, no CNT label) */}
            <div
              className="flex flex-nowrap items-stretch px-1 pt-0.5"
              style={{ gap: 'var(--control-gap)' }}
              role="list"
              aria-label="Shots in this rally"
            >
              <div className="sticky left-0 z-10 w-[4.5rem] shrink-0 bg-bg-surface" aria-hidden />
              {shots.map((n) => {
                const hitter = playerForShot(n, players, server)
                const isPlayer1 = hitter === players[0]
                const isFos = fos === n
                const isEnd = end === n
                const active = activeShot === n
                const selected = selectedShot === n
                return (
                  <div
                    key={`h-${n}`}
                    className={cn(
                      'relative flex flex-col items-center gap-px',
                      selected && 'rounded-md bg-brand-primary/15 ring-1 ring-brand-primary/50'
                    )}
                    style={{ flex: '0 0 2rem' }}
                    role="listitem"
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-current={active ? 'true' : undefined}
                      title={`Select shot ${n}`}
                      onClick={() => handleSelectColumn(n)}
                      className={cn(
                        'relative w-full h-7 rounded font-black tabular-nums text-xs touch-manipulation',
                        isPlayer1 ? 'bg-player-1-bg text-primary' : 'bg-player-2-bg text-primary',
                        isFos && 'bg-shot-first-attack-bg',
                        isEnd &&
                          (state.ending === 'winner' || state.ending === 'lucky'
                            ? 'bg-result-winner-bg'
                            : state.ending === 'error_air'
                              ? 'bg-result-air-bg'
                              : state.ending
                                ? 'bg-result-error-bg'
                                : 'bg-shot-end-bg'),
                        selected
                          ? 'border-2 border-contact-selected'
                          : 'border border-transparent'
                      )}
                    >
                      {n}
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
            </div>

            {/* Offensive + End grouped (linear tagging) */}
            <div
              className="mt-0.5 rounded-md bg-bg-card/40 py-0.5"
              role="group"
              aria-label="Offensive and End"
            >
              {LINEAR_ROWS.map((row) =>
                renderRow(row, {
                  ghost: row.id === 'end',
                  showNoAttack: row.id === 'offensive',
                })
              )}
            </div>

            {/* Review sits apart */}
            <div className="mt-1.5 border-t border-dashed border-pill-idle-border/50 pt-1">
              {renderRow(REVIEW_ROW)}
            </div>
          </div>
        </div>

        {/* Status + Rally/Shot loop control */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-muted">
            <span>
              {fos
                ? `FA ${fos}`
                : state.noFirstAttack
                  ? 'No attack'
                  : state.end === 1
                    ? 'Serve-only'
                    : 'FA?'}
            </span>
            <span>·</span>
            <span>{end ? `End ${end}` : 'End?'}</span>
          </div>
          <div className="flex-1" />
          <div
            className="inline-flex overflow-hidden rounded-md border border-pill-idle-border"
            role="group"
            aria-label="Video loop scope"
          >
            <button
              type="button"
              aria-pressed={loopScope === 'rally'}
              onClick={() => onLoopScopeChange('rally')}
              className={cn(
                'tag-control rounded-none border-0 px-2',
                loopScope === 'rally' && 'tag-control-active'
              )}
              title="Loop the whole rally"
            >
              Rally
            </button>
            <button
              type="button"
              aria-pressed={loopScope === 'shot'}
              onClick={() => onLoopScopeChange('shot')}
              className={cn(
                'tag-control rounded-none border-0 border-l border-pill-idle-border px-2',
                loopScope === 'shot' && 'tag-control-active'
              )}
              title="Loop the current shot (or previous + End while tagging End)"
            >
              Shot
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable detail — Pass 1 look/logic for FOS + End only */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {showDetail && selectedShot !== null && (
          <div
            className="space-y-1.5 rounded-md border border-pill-idle-border/70 bg-bg-card/60 p-2"
            aria-label={`Shot ${selectedShot} detail`}
          >
            <div className="flex flex-wrap items-center justify-end gap-1">
              <span className="mr-auto text-[9px] font-bold uppercase tracking-wide text-muted">
                Shot {selectedShot}
                {fos
                  ? ` · FA ${fos}`
                  : state.noFirstAttack
                    ? ' · No attack'
                    : state.end === 1
                      ? ''
                      : ' · FA?'}
                {end ? ` · End ${end}` : ' · End?'}
              </span>
            </div>

            {showFosDetail && (
              <div
                className="flex flex-wrap items-center gap-1"
                style={{ gap: 'var(--control-gap)' }}
              >
                {selectedShot >= 2 && (
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
                )}
                <span className="text-[10px] text-muted self-center">
                  Offensive row: first selected = FOS · No attack on row
                </span>
              </div>
            )}

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

            {state.shots[selectedShot]?.reviewKind != null && (
              <div
                className={cn(
                  'mt-0.5 rounded border border-review/40 bg-review/10 p-2',
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
                <p className="text-[11px] text-neutral-200">
                  Review flagged → technical. Loop pauses while this detail is focused.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
