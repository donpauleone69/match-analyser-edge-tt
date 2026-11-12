/**
 * ClipQueueBlock — the clips in the current playlist; the playing one is marked.
 */

import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { ClipRowModel } from '../models'

export interface ClipQueueBlockProps {
  rows: ClipRowModel[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function ClipQueueBlock({ rows, activeIndex, onSelect }: ClipQueueBlockProps) {
  return (
    <ol className="divide-y divide-neutral-800 rounded-lg border border-neutral-700 bg-bg-card overflow-hidden">
      {rows.map((row, i) => {
        const active = i === activeIndex
        return (
          <li key={row.clip.id}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                active ? 'bg-contact-selected-bg ring-1 ring-inset ring-contact-selected/40' : 'hover:bg-neutral-800/60'
              )}
            >
              <span className={cn('w-6 text-right font-mono text-xs', active ? 'text-brand-primary' : 'text-neutral-500')}>
                {active ? <Icon name="play" size="xs" className="inline" /> : i + 1}
              </span>
              <span
                className={cn('h-2 w-2 rounded-full shrink-0', row.heroWon ? 'bg-result-winner' : 'bg-result-error')}
                aria-label={row.heroWon ? 'Won' : 'Lost'}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-neutral-100 truncate">{row.title}</span>
                <span className="block text-xs text-neutral-500 truncate">{row.subtitle}</span>
              </span>
              <span className="font-mono text-xs text-neutral-500">{row.durationLabel}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
