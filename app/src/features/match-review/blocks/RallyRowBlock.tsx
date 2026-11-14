/**
 * RallyRowBlock — one tagged rally with Edit / Highlight / re-tag actions.
 * Row click watches. Used by the Evidence drawer and the rally browser.
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
  /** Soft highlight when this point is in the open evidence set (MA-122) */
  evidenceLinked?: boolean
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
  evidenceLinked = false,
  onWatch,
  onEdit,
  onToggleHighlight,
  onRetagFrom,
}: RallyRowBlockProps) {
  const iconBtn =
    'h-7 w-7 shrink-0 rounded-md border border-border flex items-center justify-center text-primary hover:border-border-strong transition-colors'
  return (
    <li
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 bg-bg-card',
        evidenceLinked && !active && 'bg-bg-elevated/70',
        active && 'bg-contact-selected-bg ring-1 ring-inset ring-contact-selected/50'
      )}
    >
      <button
        type="button"
        onClick={() => onWatch(rally)}
        className="min-w-0 flex-1 text-left group"
        title={rally.loop ? 'Watch this rally' : 'No contact times — open to view tags'}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-primary">
            {showSet && <span className="text-muted font-normal">S{rally.setNumber} · </span>}
            R{rally.rallyIndex}
          </span>
          <span className="font-mono text-xs text-muted tabular-nums">
            {rally.scoreBefore}→<span className="text-primary">{rally.scoreAfter}</span>
          </span>
          {!rally.isIncomplete && (
            <span
              className={cn(
                'text-[10px] font-bold rounded px-1 py-0.5 border tabular-nums',
                rally.heroWon
                  ? 'text-result-winner border-result-winner/70 bg-result-winner-bg'
                  : 'text-result-error border-result-error/70 bg-result-error-bg'
              )}
              title={
                rally.heroWon
                  ? `${heroName.split(' ')[0]} won`
                  : `${rally.winnerName.split(' ')[0]} won`
              }
            >
              {rally.heroWon ? 'W' : 'L'}
            </span>
          )}
          {rally.isIncomplete && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide text-callout-warning border border-callout-warning-border bg-callout-warning-bg rounded px-1"
              title="Missing Pass 1 required tags — open Edit to finish"
            >
              Inc
            </span>
          )}
          {rally.isHighlight && <span className="text-review text-xs" aria-label="Highlight">★</span>}
          {rally.reviewCount > 0 && (
            <span
              className="text-[10px] font-bold tabular-nums text-review border border-review/50 rounded px-1"
              title={`${rally.reviewCount} flagged shot${rally.reviewCount === 1 ? '' : 's'}`}
            >
              {rally.reviewCount}
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5 truncate group-hover:text-primary">
          {rally.serverName.split(' ')[0]} · {rally.summary}
        </p>
      </button>
      <button
        type="button"
        aria-label={
          rally.isIncomplete
            ? `Fix incomplete rally ${rally.rallyIndex}`
            : `Edit rally ${rally.rallyIndex}`
        }
        title={
          rally.isIncomplete
            ? 'Fix incomplete — set FA, End, and ending, then Save fix'
            : "Edit this rally's tags"
        }
        onClick={() => onEdit(rally)}
        className={cn(
          iconBtn,
          rally.isIncomplete &&
            'border-callout-warning-border text-callout-warning hover:border-callout-warning'
        )}
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
          className={cn(iconBtn, 'text-muted hover:text-review hover:border-review')}
        >
          <Icon name="rotate-ccw" size="sm" />
        </button>
      )}
    </li>
  )
}
