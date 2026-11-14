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
}

export function ClipPresetListBlock({ groups, activeKey, onSelect }: ClipPresetListBlockProps) {
  return (
    <nav aria-label="Clip playlists" className="space-y-4">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="px-1 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{g.label}</p>
          <div className="flex flex-wrap gap-1.5 md:flex-col md:gap-1">
            {g.presets.map((p) => {
              const active = p.key === activeKey
              return (
                <button
                  key={p.key}
                  type="button"
                  data-clip-preset-key={p.key}
                  onClick={() => onSelect(p)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors',
                    active
                      ? 'border-contact-selected bg-contact-selected-bg text-primary'
                      : 'border-border bg-bg-card text-primary hover:border-border-strong'
                  )}
                >
                  <span className="truncate">{p.label}</span>
                  <span className={cn('shrink-0 font-mono text-xs tabular-nums', active ? 'text-contact-selected' : 'text-muted')}>
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
