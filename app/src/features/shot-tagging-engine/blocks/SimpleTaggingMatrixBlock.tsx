/**
 * SimpleTaggingMatrixBlock — Phase 2 matrix (Paul UX refine).
 *
 * Column alignment + playhead underline like Pass 1 CNT rail (no separate CNT row).
 * Rows: Offensive Shots · End · Review. Rally ★ lives on the Save-point row.
 * Detail = Pass 1 look/logic for FOS + End only; column select highlights + drives it.
 */

import { cn } from '@/helpers/utils'
import {
  ENDING_OPTIONS,
  MISS_REASON_OPTIONS,
  isErrorEnding,
  playerForShot,
  type PointEnding,
  type PointMissReason,
  type RallyTimelineState,
} from '../composers/pass1FocusModel'
import {
  isMissReasonRequired,
  type SimpleMatrixRow,
} from '../composers/simpleTaggingModel'

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
  onSelectShot: (n: number) => void
  onToggleOffensive: (n: number) => void
  onNoAttack: () => void
  onMarkEnd: (n: number) => void
  onToggleReview: (n: number) => void
  onToggleEnding: (value: PointEnding) => void
  onToggleMissReason: (value: PointMissReason) => void
  onReviewDetailFocusChange: (focused: boolean) => void
  onSelectRow: (row: SimpleMatrixRow) => void
  /** Pass 1 sticky: mark selected shot as FOS (toggle). */
  onMarkFos: (n: number) => void
  className?: string
}

const ROWS: { id: SimpleMatrixRow; label: string; short: string }[] = [
  { id: 'offensive', label: 'Offensive Shots', short: 'Offensive' },
  { id: 'end', label: 'End', short: 'End' },
  { id: 'review', label: 'Review', short: 'Review' },
]

const PILL_COLOR = {
  fos: 'var(--color-shot-first-attack)',
  end: 'var(--color-shot-end)',
  winner: 'var(--color-result-winner)',
  error: 'var(--color-result-error)',
  air: 'var(--color-result-air)',
  standing: 'var(--color-shot-serve)',
} as const

function DetailPill({
  label,
  selected,
  onClick,
  kind,
  title,
}: {
  label: string
  selected: boolean
  onClick: () => void
  kind: keyof typeof PILL_COLOR
  title?: string
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
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500'
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
  onReviewDetailFocusChange,
  onSelectRow,
  onMarkFos,
  className,
}: SimpleTaggingMatrixBlockProps) {
  const shotCount = state.shotCount
  const shots = Array.from({ length: shotCount }, (_, i) => i + 1)
  const offensiveSet = new Set(offensiveShots)
  const fos = typeof state.fos === 'number' ? state.fos : null
  const end = typeof state.end === 'number' ? state.end : null

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
      state.noFirstAttack ||
      (activeRow === 'offensive' && selectedShot >= 2))

  const showEndDetail = selectedShot !== null && selectedShot === end

  const showDetail = showFosDetail || showEndDetail

  return (
    <div className={cn('flex flex-col gap-2 px-1.5 pb-2', className)}>
      {/* Matrix — columns align like Pass 1 CNT rail; underline = playhead */}
      <div
        className="overflow-x-auto rounded-md border border-pill-idle-border bg-bg-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Simple tagging matrix"
      >
        <div className="min-w-max">
          {/* Shot header (CNT layout, no CNT label) */}
          <div
            className="flex flex-nowrap items-stretch border-b border-pill-idle-border px-1 pt-1"
            style={{ gap: 'var(--control-gap)' }}
            role="list"
            aria-label="Shots in this rally"
          >
            <div className="sticky left-0 z-10 w-[4.25rem] shrink-0 bg-bg-card" aria-hidden />
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

          {/* Binary rows */}
          {ROWS.map((row) => (
            <div
              key={row.id}
              className={cn(
                'flex flex-nowrap items-center border-b border-pill-idle-border/60 last:border-0 px-1 py-0.5',
                activeRow === row.id && 'bg-white/5'
              )}
              style={{ gap: 'var(--control-gap)' }}
            >
              <button
                type="button"
                className="sticky left-0 z-10 w-[4.25rem] shrink-0 bg-bg-card px-0.5 text-left text-[10px] font-semibold leading-tight text-neutral-300 touch-manipulation"
                onClick={() => onSelectRow(row.id)}
                aria-label={`${row.label} row`}
              >
                {row.short}
              </button>
              {shots.map((n) => {
                const on =
                  row.id === 'offensive'
                    ? offensiveSet.has(n)
                    : row.id === 'end'
                      ? end === n
                      : state.shots[n]?.reviewKind != null
                const isFosCell = row.id === 'offensive' && fos === n
                const disabled =
                  row.id === 'offensive' && (n < 2 || state.end === 1)
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
                        'flex h-8 w-8 items-center justify-center rounded-md border text-[11px] font-bold touch-manipulation',
                        disabled && 'opacity-30',
                        on
                          ? row.id === 'review'
                            ? 'border-review bg-review/30 text-neutral-50'
                            : 'border-brand-primary bg-brand-primary/25 text-neutral-50'
                          : 'border-pill-idle-border/80 bg-bg-surface text-muted'
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
          ))}
        </div>
      </div>

      {/* Status chips */}
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

      {/* Detail — Pass 1 look/logic for FOS + End only */}
      {showDetail && selectedShot !== null && (
        <div
          className="rounded-md border border-pill-idle-border bg-bg-card p-2 space-y-1.5"
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
              <DetailPill
                kind="fos"
                label={state.noFirstAttack ? 'No attack ✓' : 'No attack'}
                selected={state.noFirstAttack}
                title={
                  state.noFirstAttack
                    ? 'No first attack marked — tap to clear (undecided)'
                    : 'This point had no first attack'
                }
                onClick={onNoAttack}
              />
              <span className="text-[10px] text-muted self-center">
                Offensive row: first selected = FOS
              </span>
            </div>
          )}

          {showEndDetail && (
            <>
              <div className="w-full min-w-0" aria-label="Result">
                <div className="text-[8px] font-bold uppercase tracking-wide text-primary leading-none mb-px">
                  Result
                </div>
                <div
                  className="flex w-full min-w-0 items-center flex-wrap"
                  style={{ gap: 'var(--control-gap)' }}
                >
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
                      onClick={() => onToggleEnding(value)}
                    />
                  ))}
                </div>
              </div>

              {isMissReasonRequired(state.ending) && (
                <div className="w-full min-w-0" aria-label="Miss reason">
                  <div className="text-[8px] font-bold uppercase tracking-wide text-primary leading-none mb-px">
                    Miss reason{isErrorEnding(state.ending) ? ' (required)' : ''}
                  </div>
                  <div
                    className="flex w-full min-w-0 items-center flex-wrap"
                    style={{ gap: 'var(--control-gap)' }}
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
                  </div>
                </div>
              )}
            </>
          )}

          {/* Review focus target so loop can pause (binary flag is on the matrix). */}
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
  )
}
