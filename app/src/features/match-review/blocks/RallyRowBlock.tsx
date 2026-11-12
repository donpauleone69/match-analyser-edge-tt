/**
 * RallyRowBlock — one tagged rally with Watch / Edit / Highlight actions.
 * Used by the Evidence drawer, Highlights and the rally browser.
 */

import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { RallyRowModel } from '../models'

export interface RallyRowBlockProps {
  rally: RallyRowModel
  heroName: string
  /** Show "Set N ·" in the label (multi-set matches) */
  showSet?: boolean
  active?: boolean
  onWatch: (rally: RallyRowModel) => void
  onEdit: (rally: RallyRowModel) => void
  onToggleHighlight: (rally: RallyRowModel) => void
  onRetagFrom?: (rally: RallyRowModel) => void
}

export function RallyRowBlock({
  rally,
  heroName,
  showSet = false,
  active = false,
  onWatch,
  onEdit,
  onToggleHighlight,
  onRetagFrom,
}: RallyRowBlockProps) {
  const iconBtn =
    'h-8 w-8 shrink-0 rounded-md border border-neutral-700 flex items-center justify-center text-neutral-300 hover:border-neutral-400 hover:text-neutral-50 transition-colors'
  return (
    <li
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 bg-neutral-900/50',
        active && 'bg-contact-selected-bg ring-1 ring-inset ring-contact-selected/50'
      )}
    >
      <button
        type="button"
        onClick={() => onWatch(rally)}
        className="min-w-0 flex-1 text-left group"
        title={rally.loop ? 'Watch this rally' : 'No contact times — open to view tags'}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-neutral-100">
            {showSet && <span className="text-neutral-500 font-normal">Set {rally.setNumber} · </span>}
            Rally {rally.rallyIndex}
          </span>
          <span className="font-mono text-xs text-neutral-400">
            {rally.scoreBefore} → <span className="text-neutral-200">{rally.scoreAfter}</span>
          </span>
          <span
            className={cn(
              'text-[11px] font-semibold rounded px-1.5 py-0.5 border',
              rally.heroWon
                ? 'text-result-winner border-result-winner/70 bg-result-winner-bg'
                : 'text-result-error border-result-error/70 bg-result-error-bg'
            )}
          >
            {rally.heroWon ? `${heroName.split(' ')[0]} won` : `${rally.winnerName.split(' ')[0]} won`}
          </span>
          {rally.isHighlight && <span className="text-review text-xs" aria-label="Highlight">★</span>}
          {rally.reviewCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-review border border-review/50 rounded px-1">
              {rally.reviewCount} flagged
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-400 mt-0.5 truncate group-hover:text-neutral-300">
          {rally.serverName.split(' ')[0]} serves · {rally.summary}
        </p>
      </button>
      <button
        type="button"
        aria-label={`Watch rally ${rally.rallyIndex}`}
        title="Watch"
        onClick={() => onWatch(rally)}
        className={iconBtn}
      >
        <Icon name="play" size="sm" />
      </button>
      <button
        type="button"
        aria-label={`Edit rally ${rally.rallyIndex}`}
        title="Edit this rally's tags"
        onClick={() => onEdit(rally)}
        className={iconBtn}
      >
        <Icon name="edit" size="sm" />
      </button>
      <button
        type="button"
        aria-pressed={rally.isHighlight}
        aria-label={rally.isHighlight ? 'Remove highlight' : 'Add to highlights'}
        title={rally.isHighlight ? 'Remove from highlights' : 'Add to highlights'}
        onClick={() => onToggleHighlight(rally)}
        className={cn(iconBtn, rally.isHighlight && 'text-review border-review/70')}
      >
        <Icon name="star" size="sm" className={rally.isHighlight ? 'fill-current' : undefined} />
      </button>
      {onRetagFrom && (
        <button
          type="button"
          aria-label={`Re-tag from rally ${rally.rallyIndex}`}
          title="Re-tag from this rally onwards (earlier rallies are kept)"
          onClick={() => onRetagFrom(rally)}
          className={cn(iconBtn, 'text-neutral-500 hover:text-review hover:border-review')}
        >
          <Icon name="rotate-ccw" size="sm" />
        </button>
      )}
    </li>
  )
}
