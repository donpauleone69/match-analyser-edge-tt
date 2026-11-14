/**
 * ClipShortcutsBlock — jump straight into a clip playlist from Home.
 */

import { Icon } from '@/ui-mine'

export interface ClipShortcut {
  key: string
  label: string
  count: number
}

export interface ClipShortcutsBlockProps {
  shortcuts: ClipShortcut[]
  reelCount: number
  onOpen: (key: string | null) => void
}

export function ClipShortcutsBlock({ shortcuts, reelCount, onOpen }: ClipShortcutsBlockProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {shortcuts.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onOpen(s.key)}
            className="h-8 px-2.5 rounded-md border border-border text-sm text-neutral-200 hover:border-brand-primary hover:text-neutral-50 inline-flex items-center gap-1.5"
          >
            <Icon name="play" size="xs" className="text-brand-primary" />
            {s.label}
            <span className="font-mono text-xs text-neutral-500 tabular-nums">{s.count}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onOpen(null)}
        className="text-sm text-brand-primary hover:underline inline-flex items-center gap-1.5"
      >
        <Icon name="film" size="sm" />
        All playlists
        {reelCount > 0 ? ` · ${reelCount} reel${reelCount === 1 ? '' : 's'}` : ''}
      </button>
    </div>
  )
}
