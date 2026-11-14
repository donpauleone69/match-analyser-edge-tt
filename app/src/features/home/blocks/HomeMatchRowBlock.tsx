/**
 * HomeMatchRowBlock — one recent match; the row opens Match Review.
 */

import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { HomeMatchModel } from '../models'

export interface HomeMatchRowBlockProps {
  match: HomeMatchModel
  onOpen: (matchId: string) => void
}

const STATUS_STYLE: Record<HomeMatchModel['status'], string> = {
  tagged: 'text-result-winner bg-result-winner-bg',
  in_progress: 'text-callout-warning bg-callout-warning-bg',
  not_started: 'text-muted bg-bg-elevated',
}

export function HomeMatchRowBlock({ match, onOpen }: HomeMatchRowBlockProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(match.matchId)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-bg-elevated transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary truncate">{match.title}</p>
          <p className="text-[11px] text-muted mt-0.5">
            {match.dateLabel}
            {match.ralliesTagged > 0 &&
              ` · ${match.ralliesTagged === 1 ? '1 rally' : `${match.ralliesTagged} rallies`}`}
          </p>
        </div>
        {match.setsLabel && (
          <span
            className={cn(
              'font-mono text-sm font-bold tabular-nums',
              match.heroWon === true && 'text-result-winner',
              match.heroWon === false && 'text-result-error',
              match.heroWon === null && 'text-primary'
            )}
          >
            {match.setsLabel}
          </span>
        )}
        <span
          className={cn(
            'hidden sm:inline text-[10px] font-semibold rounded-md px-1.5 py-0.5',
            STATUS_STYLE[match.status]
          )}
        >
          {match.statusLabel}
        </span>
        <Icon name="chevron-right" size="sm" className="text-muted" />
      </button>
    </li>
  )
}
