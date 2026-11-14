/**
 * ClipPresetListBlock — ready-made playlists, grouped, with clip counts.
 */

import { cn } from '@/helpers/utils'
import type { ClipPreset } from '@/rules/derive/clips/deriveClipPresets'
import type { ClipPresetGroupModel } from '../models'

export interface ClipPresetListBlockProps {
  groups: ClipPresetGroupModel[]
  activeKey: string | null
  onSelect: (preset: ClipPreset) => void
  /** compact = disclosure overlay; comfortable = desktop rail */
  density?: 'compact' | 'comfortable'
}

export function ClipPresetListBlock({
  groups,
  activeKey,
  onSelect,
  density = 'comfortable',
}: ClipPresetListBlockProps) {
  const compact = density === 'compact'
  return (
    <nav aria-label="Clip playlists" className={cn(compact ? 'space-y-2' : 'space-y-3')}>
      {groups.map((g) => (
        <div key={g.group}>
          <p
            className={cn(
              'px-1 font-semibold uppercase tracking-wide text-muted',
              compact ? 'mb-1 text-[10px]' : 'mb-1.5 text-[11px]'
            )}
          >
            {g.label}
          </p>
          <div
            className={cn(
              compact ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1.5 md:flex-col md:gap-1'
            )}
          >
            {g.presets.map((p) => {
              const active = p.key === activeKey
              return (
                <button
                  key={p.key}
                  type="button"
                  data-clip-preset-key={p.key}
                  onClick={() => onSelect(p)}
                  // Compact rows live inside BrowseDisclosure listbox (MA-140).
                  {...(compact
                    ? {
                        role: 'option' as const,
                        'aria-selected': active,
                        tabIndex: active ? 0 : -1,
                      }
                    : { 'aria-pressed': active })}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md border text-left text-sm transition-colors touch-manipulation',
                    compact &&
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-inset',
                    compact ? 'min-h-10 px-2 py-2' : 'min-h-9 px-2.5 py-1.5',
                    active
                      ? 'border-contact-selected bg-contact-selected-bg text-primary'
                      : 'border-border bg-bg-card text-primary hover:border-border-strong'
                  )}
                >
                  <span className="truncate">{p.label}</span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-xs tabular-nums',
                      active ? 'text-contact-selected' : 'text-muted'
                    )}
                  >
                    {p.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
