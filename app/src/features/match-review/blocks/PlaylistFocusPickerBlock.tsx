/**
 * PlaylistFocusPickerBlock — History-style disclosure for Serve/Receive playlist focus.
 *
 * Built on shared BrowseDisclosure (Track A / C cohesion).
 */

import { useEffect, useState } from 'react'
import { BrowseDisclosure, BrowseDisclosureOption } from '@/ui-mine'
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
  const active = focuses.find((f) => f.id === activeId) ?? focuses[0]

  useEffect(() => {
    setOpen(false)
  }, [activeId])

  if (!active || focuses.length === 0) return null

  return (
    <BrowseDisclosure
      aria-label="Playlist focus"
      open={open}
      onOpenChange={setOpen}
      value={
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', TONE_DOT[active.tone])} />
          <span className="truncate max-w-[12rem]">{active.label}</span>
        </span>
      }
      meta={active.count}
      panelClassName="py-1 max-h-64 overflow-y-auto"
    >
      <ul role="listbox" aria-label="Playlist focus">
        {focuses.map((f) => {
          const selected = f.id === active.id
          return (
            <li key={f.id}>
              <BrowseDisclosureOption
                selected={selected}
                leading={
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', TONE_DOT[f.tone])} />
                }
                meta={f.count}
                onSelect={() => {
                  onSelect(f)
                  setOpen(false)
                }}
              >
                {f.label}
              </BrowseDisclosureOption>
            </li>
          )
        })}
      </ul>
    </BrowseDisclosure>
  )
}
