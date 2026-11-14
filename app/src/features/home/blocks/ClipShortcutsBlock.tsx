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
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {shortcuts.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onOpen(s.key)}
            className="h-7 px-2 rounded-md border border-border text-xs text-primary hover:border-brand-primary inline-flex items-center gap-1.5"
          >
            <Icon name="play" size="xs" className="text-brand-primary" />
            {s.label}
            <span className="font-mono text-[11px] text-muted tabular-nums">{s.count}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onOpen(null)}
        className="text-xs text-brand-primary hover:underline inline-flex items-center gap-1.5"
      >
        <Icon name="film" size="sm" />
        All playlists
        {reelCount > 0 ? ` · ${reelCount} reel${reelCount === 1 ? '' : 's'}` : ''}
      </button>
    </div>
  )
}
