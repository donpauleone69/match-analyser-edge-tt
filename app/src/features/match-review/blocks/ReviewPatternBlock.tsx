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
    <li className="rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="min-w-0 flex-1 flex items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-800/60"
        >
          <span
            className={cn(
              'shrink-0 min-w-9 h-7 px-2 rounded-md flex items-center justify-center font-mono text-sm font-bold',
              pattern.count > 1 ? 'bg-review-bg text-review' : 'bg-neutral-800 text-neutral-300'
            )}
          >
            {pattern.count}×
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-neutral-100 truncate">{pattern.title}</span>
            <span className="block text-xs text-neutral-500">{pattern.kindLabel}</span>
          </span>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" className="text-neutral-500" />
        </button>
        {onPlayPlaylist && pattern.count > 0 && (
          <button
            type="button"
            onClick={() => onPlayPlaylist(pattern)}
            className="h-7 shrink-0 px-2 rounded-md border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-400 inline-flex items-center gap-1"
            title="Open this pattern as a Clips playlist"
          >
            <Icon name="play" size="xs" /> Playlist
          </button>
        )}
      </div>
      {open && (
        <ul className="border-t border-neutral-800 divide-y divide-neutral-800">
          {pattern.items.map((item) => (
            <li key={item.shotId} className="flex items-center gap-2 pl-14 pr-3 py-2">
              <span className="flex-1 text-xs text-neutral-300">{item.label}</span>
              <button
                type="button"
                onClick={() => onWatch(item, pattern)}
                className="h-7 px-2 rounded-md border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-400 inline-flex items-center gap-1"
              >
                <Icon name="play" size="xs" /> Watch
              </button>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="h-7 px-2 rounded-md border border-neutral-700 text-xs text-neutral-200 hover:border-neutral-400 inline-flex items-center gap-1"
              >
                <Icon name="edit" size="xs" /> Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
