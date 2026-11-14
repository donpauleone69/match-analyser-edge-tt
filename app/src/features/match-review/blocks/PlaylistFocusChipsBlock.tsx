/**
 * PlaylistFocusChipsBlock — swaps the supporting playlist under curated stats.
 */

import { cn } from '@/helpers/utils'
import type { PlaylistFocusModel } from '../models'

export interface PlaylistFocusChipsBlockProps {
  focuses: PlaylistFocusModel[]
  activeId: string
  onSelect: (focus: PlaylistFocusModel) => void
}

const TONE_CHIP: Record<PlaylistFocusModel['tone'], string> = {
  good: 'border-result-winner/50 text-result-winner',
  bad: 'border-result-error/50 text-result-error',
  amber: 'border-warning/50 text-warning',
  none: 'border-neutral-600 text-neutral-200',
}

export function PlaylistFocusChipsBlock({ focuses, activeId, onSelect }: PlaylistFocusChipsBlockProps) {
  if (focuses.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Playlist focus">
      {focuses.map((f) => {
        const active = f.id === activeId
        return (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(f)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-bg-elevated border-neutral-400 text-neutral-50'
                : cn('bg-bg-card hover:bg-bg-elevated', TONE_CHIP[f.tone])
            )}
          >
            <span>{f.label}</span>
            <span className="tabular-nums text-neutral-400">{f.count}</span>
          </button>
        )
      })}
    </div>
  )
}
