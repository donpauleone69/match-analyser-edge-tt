/**
 * SimpleTaggingMatrixBlock — phone one-screen matrix for Simple mode.
 *
 * Contacts row + Offensive / End / ★ / Rev matrix. Detail strip for ending
 * + miss-reason (+ No attack). Presentational — no store access.
 */

import { cn } from '@/helpers/utils'
import {
  ENDING_OPTIONS,
  MISS_REASON_OPTIONS,
  contactOverlayColor,
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
  isHighlight: boolean
  players: [string, string]
  server: string
  selectedShot: number | null
  activeRow: SimpleMatrixRow | null
  reviewDetailFocused: boolean
  onSelectShot: (n: number) => void
  onToggleOffensive: (n: number) => void
  onNoAttack: () => void
  onMarkEnd: (n: number) => void
  onToggleHighlight: () => void
  onToggleReview: (n: number) => void
  onToggleEnding: (value: PointEnding) => void
  onToggleMissReason: (value: PointMissReason) => void
  onReviewDetailFocusChange: (focused: boolean) => void
  onSelectRow: (row: SimpleMatrixRow) => void
  className?: string
}

const ROWS: { id: SimpleMatrixRow; label: string; short: string }[] = [
  { id: 'offensive', label: 'Offensive', short: 'Off' },
  { id: 'end', label: 'End', short: 'End' },
  { id: 'highlight', label: 'Highlight', short: '★' },
  { id: 'review', label: 'Review', short: 'Rev' },
]

export function SimpleTaggingMatrixBlock({
  state,
  offensiveShots,
  isHighlight,
  players,
  server,
  selectedShot,
  activeRow,
  reviewDetailFocused,
  onSelectShot,
  onToggleOffensive,
  onNoAttack,
  onMarkEnd,
  onToggleHighlight,
  onToggleReview,
  onToggleEnding,
  onToggleMissReason,
  onReviewDetailFocusChange,
  onSelectRow,
  className,
}: SimpleTaggingMatrixBlockProps) {
  const shotCount = state.shotCount
  const shots = Array.from({ length: shotCount }, (_, i) => i + 1)
  const offensiveSet = new Set(offensiveShots)
  const fos = typeof state.fos === 'number' ? state.fos : null
  const end = typeof state.end === 'number' ? state.end : null
  const detailShot =
    selectedShot ?? end ?? (shotCount > 0 ? shotCount : null)

  const handleCell = (row: SimpleMatrixRow, n: number) => {
    onSelectShot(n)
    onSelectRow(row)
    if (row === 'offensive') onToggleOffensive(n)
    else if (row === 'end') onMarkEnd(n)
    else if (row === 'highlight') onToggleHighlight()
    else if (row === 'review') {
      onToggleReview(n)
      onReviewDetailFocusChange(true)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2 px-1.5 pb-2', className)}>
      {/* Contacts */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <span className="shrink-0 w-10 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Cnt
        </span>
        <div className="flex gap-1">
          {shots.map((n) => {
            const name = playerForShot(n, players, server)
            const selected = selectedShot === n
            return (
              <button
                key={`c-${n}`}
                type="button"
                onClick={() => {
                  onSelectShot(n)
                  onSelectRow('end')
                }}
                className={cn(
                  'flex h-9 w-9 flex-col items-center justify-center rounded-md border text-[11px] font-bold touch-manipulation',
                  selected
                    ? 'border-brand-primary bg-brand-primary/20 text-neutral-50'
                    : 'border-pill-idle-border bg-bg-card text-neutral-200'
                )}
                title={`${name} · shot ${n}`}
                aria-label={`Contact ${n}, ${name}`}
                aria-pressed={selected}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: contactOverlayColor(n) }}
                  aria-hidden
                />
                {n}
              </button>
            )
          })}
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-md border border-pill-idle-border bg-bg-card">
        <table className="w-full min-w-[16rem] border-collapse text-center">
          <thead>
            <tr className="border-b border-pill-idle-border">
              <th className="sticky left-0 z-10 w-10 bg-bg-card px-1 py-1 text-left text-[10px] font-semibold uppercase text-muted">
                Mark
              </th>
              {shots.map((n) => (
                <th
                  key={`h-${n}`}
                  className="px-0.5 py-1 text-[10px] font-semibold tabular-nums text-muted"
                >
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-pill-idle-border/60 last:border-0',
                  activeRow === row.id && 'bg-white/5'
                )}
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-bg-card px-1 py-0.5 text-left text-[10px] font-semibold text-neutral-300"
                >
                  <button
                    type="button"
                    className="touch-manipulation"
                    onClick={() => onSelectRow(row.id)}
                    aria-label={`${row.label} row`}
                  >
                    {row.short}
                  </button>
                </th>
                {shots.map((n) => {
                  const on =
                    row.id === 'offensive'
                      ? offensiveSet.has(n)
                      : row.id === 'end'
                        ? end === n
                        : row.id === 'highlight'
                          ? isHighlight
                          : state.shots[n]?.reviewKind != null
                  const isFosCell = row.id === 'offensive' && fos === n
                  const disabled =
                    row.id === 'offensive' && (n < 2 || state.end === 1)
                  return (
                    <td key={`${row.id}-${n}`} className="p-0.5">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleCell(row.id, n)}
                        className={cn(
                          'mx-auto flex h-8 w-8 items-center justify-center rounded-md border text-[11px] font-bold touch-manipulation',
                          disabled && 'opacity-30',
                          on
                            ? row.id === 'review'
                              ? 'border-review bg-review/30 text-neutral-50'
                              : row.id === 'highlight'
                                ? 'border-review bg-review/25 text-neutral-50'
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
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
        {isHighlight && (
          <>
            <span>·</span>
            <span>★</span>
          </>
        )}
      </div>

      {/* Detail strip */}
      <div className="rounded-md border border-pill-idle-border bg-bg-card p-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Detail{detailShot ? ` · shot ${detailShot}` : ''}
        </p>

        {state.end !== 1 && (
          <div className="mb-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={onNoAttack}
              className={cn(
                'tag-control min-h-9 px-3 touch-manipulation',
                state.noFirstAttack && 'tag-control-active'
              )}
              aria-pressed={state.noFirstAttack}
            >
              No attack
            </button>
            <span className="self-center text-[10px] text-muted">
              Offensive: first selected = FOS
            </span>
          </div>
        )}

        <p className="mb-1 text-[10px] font-semibold text-muted">Ending</p>
        <div className="mb-2 flex flex-wrap gap-1">
          {ENDING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggleEnding(opt.value)}
              className={cn(
                'tag-control min-h-9 px-2.5 touch-manipulation',
                state.ending === opt.value && 'tag-control-accent'
              )}
              aria-pressed={state.ending === opt.value}
              disabled={end === null}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isMissReasonRequired(state.ending) && (
          <>
            <p className="mb-1 text-[10px] font-semibold text-muted">
              Miss reason (required)
            </p>
            <div className="mb-2 flex flex-wrap gap-1">
              {MISS_REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggleMissReason(opt.value)}
                  className={cn(
                    'tag-control min-h-9 px-2.5 touch-manipulation',
                    state.missReason === opt.value && 'tag-control-accent'
                  )}
                  aria-pressed={state.missReason === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {detailShot !== null && state.shots[detailShot]?.reviewKind != null && (
          <div
            className={cn(
              'mt-1 rounded border border-review/40 bg-review/10 p-2',
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
              Review flagged → technical (refine later in Work on / Pass 1).
              Loop pauses while this detail is focused.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
