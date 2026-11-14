/**
 * ReviewPatternBlock — one repeated review pattern (e.g. "BH Push · 3×")
 * with its flagged shots. Each shot can be watched or its rally edited.
 */

import { useState } from 'react'
import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { ReviewItemModel, ReviewPatternModel } from '../models'

export interface ReviewPatternBlockProps {
  pattern: ReviewPatternModel
  defaultOpen?: boolean
  onWatch: (item: ReviewItemModel, pattern: ReviewPatternModel) => void
  onEdit: (item: ReviewItemModel) => void
  onPlayPlaylist?: (pattern: ReviewPatternModel) => void
}

export function ReviewPatternBlock({
  pattern,
  defaultOpen = false,
  onWatch,
  onEdit,
  onPlayPlaylist,
}: ReviewPatternBlockProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <li className="rounded-lg bg-bg-card overflow-hidden">
      <div className="flex items-center gap-1 pr-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="min-w-0 flex-1 flex items-center gap-2 px-2.5 py-2 text-left hover:bg-bg-elevated"
        >
          <span
            className={cn(
              'shrink-0 min-w-8 h-6 px-1.5 rounded-md flex items-center justify-center font-mono text-xs font-bold',
              pattern.count > 1 ? 'bg-review-bg text-review' : 'bg-bg-elevated text-neutral-500'
            )}
          >
            {pattern.count}×
          </span>
          <span className="flex-1 min-w-0 text-sm font-semibold text-neutral-100 truncate">
            {pattern.title}
          </span>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" className="text-neutral-500" />
        </button>
        {onPlayPlaylist && pattern.count > 0 && (
          <button
            type="button"
            onClick={() => onPlayPlaylist(pattern)}
            className="h-7 w-7 shrink-0 rounded-md bg-review-bg/40 text-review hover:bg-review-bg inline-flex items-center justify-center"
            title="Open this pattern as a Clips playlist"
            aria-label={`Open ${pattern.title} in Clips`}
          >
            <Icon name="film" size="xs" />
          </button>
        )}
      </div>
      {open && (
        <ul className="border-t border-border divide-y divide-border">
          {pattern.items.map((item) => (
            <li key={item.shotId} className="flex items-center gap-1.5 pl-12 pr-1.5 py-1">
              <span className="flex-1 text-xs text-neutral-300 truncate">{item.label}</span>
              <button
                type="button"
                onClick={() => onWatch(item, pattern)}
                className="h-7 w-7 rounded-md text-muted hover:bg-bg-elevated hover:text-primary inline-flex items-center justify-center"
                title="Open in Clips at this shot"
                aria-label={`Open ${item.label} in Clips`}
              >
                <Icon name="play" size="xs" />
              </button>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="h-7 w-7 rounded-md text-muted hover:bg-bg-elevated hover:text-primary inline-flex items-center justify-center"
                title="Fix tags"
                aria-label={`Fix ${item.label}`}
              >
                <Icon name="edit" size="xs" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
