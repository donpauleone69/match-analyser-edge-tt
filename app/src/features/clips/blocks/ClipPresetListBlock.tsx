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
          <p className="px-1 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{g.label}</p>
          <div className="flex flex-wrap gap-1.5 md:flex-col md:gap-1">
            {g.presets.map((p) => {
              const active = p.key === activeKey
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onSelect(p)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'border-brand-primary bg-brand-primary/15 text-neutral-50'
                      : 'border-neutral-700 bg-bg-card text-neutral-300 hover:border-neutral-500 hover:text-neutral-50'
                  )}
                >
                  <span className="truncate">{p.label}</span>
                  <span className={cn('shrink-0 font-mono text-xs', active ? 'text-brand-primary' : 'text-neutral-500')}>
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
