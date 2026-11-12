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
  tagged: 'text-emerald-300 border-emerald-800/60 bg-emerald-950/40',
  in_progress: 'text-amber-300 border-amber-800/60 bg-amber-950/40',
  not_started: 'text-neutral-400 border-neutral-700 bg-neutral-800',
}

export function HomeMatchRowBlock({ match, onOpen }: HomeMatchRowBlockProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(match.matchId)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-neutral-800/60 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-100 truncate">{match.title}</p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {match.dateLabel}
            {match.ralliesTagged > 0 && ` · ${match.ralliesTagged === 1 ? '1 rally' : `${match.ralliesTagged} rallies`} tagged`}
          </p>
        </div>
        {match.setsLabel && (
          <span
            className={cn(
              'font-mono text-base font-bold',
              match.heroWon === true && 'text-emerald-400',
              match.heroWon === false && 'text-rose-400',
              match.heroWon === null && 'text-neutral-200'
            )}
          >
            {match.setsLabel}
          </span>
        )}
        <span className={cn('hidden sm:inline text-[11px] font-semibold rounded-full border px-2 py-0.5', STATUS_STYLE[match.status])}>
          {match.statusLabel}
        </span>
        <Icon name="chevron-right" size="sm" className="text-neutral-500" />
      </button>
    </li>
  )
}
