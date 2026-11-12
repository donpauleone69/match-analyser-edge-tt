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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onOpen(s.key)}
            className="h-9 px-3 rounded-full border border-neutral-700 bg-neutral-900/60 text-sm text-neutral-200 hover:border-brand-primary hover:text-neutral-50 flex items-center gap-2"
          >
            <Icon name="play" size="xs" className="text-brand-primary" />
            {s.label}
            <span className="font-mono text-xs text-neutral-500">{s.count}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onOpen(null)} className="text-sm text-brand-primary hover:underline flex items-center gap-1.5">
        <Icon name="film" size="sm" />
        All clip playlists{reelCount > 0 ? ` · ${reelCount} saved reel${reelCount === 1 ? '' : 's'}` : ''}
      </button>
    </div>
  )
}
