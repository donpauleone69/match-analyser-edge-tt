/**
 * PlaylistFocusPickerBlock — History-style disclosure for Serve/Receive playlist focus.
 *
 * Same language Track C wants for playlist browse: closed = active context chip;
 * open = pick another focus. Reusable until a shared PlaylistBrowseShell lands.
 */

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { PlaylistFocusModel } from '../models'

export interface PlaylistFocusPickerBlockProps {
  focuses: PlaylistFocusModel[]
  activeId: string
  onSelect: (focus: PlaylistFocusModel) => void
}

const TONE_DOT: Record<PlaylistFocusModel['tone'], string> = {
  good: 'bg-result-winner',
  bad: 'bg-result-error',
  amber: 'bg-warning',
  none: 'bg-neutral-500',
}

export function PlaylistFocusPickerBlock({
  focuses,
  activeId,
  onSelect,
}: PlaylistFocusPickerBlockProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = focuses.find((f) => f.id === activeId) ?? focuses[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [activeId])

  if (!active || focuses.length === 0) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-bg-card px-3 py-1.5',
          'text-sm text-neutral-100 hover:border-neutral-500 transition-colors'
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', TONE_DOT[active.tone])} />
        <span className="font-medium truncate max-w-[12rem]">{active.label}</span>
        <span className="tabular-nums text-neutral-500">{active.count}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" className="text-neutral-400" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Playlist focus"
          className="absolute z-30 mt-1 min-w-[14rem] max-h-64 overflow-y-auto rounded-lg border border-neutral-700 bg-bg-elevated shadow-xl py-1"
        >
          {focuses.map((f) => {
            const selected = f.id === active.id
            return (
              <li key={f.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(f)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
                    selected ? 'bg-neutral-800 text-neutral-50' : 'text-neutral-200 hover:bg-neutral-800/70'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', TONE_DOT[f.tone])} />
                  <span className="flex-1 truncate">{f.label}</span>
                  <span className="tabular-nums text-neutral-500">{f.count}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
