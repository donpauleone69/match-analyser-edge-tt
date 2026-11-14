/**
 * PlaylistFocusPickerBlock — focus options for Serve/Receive playlists.
 *
 * Default: standalone BrowseDisclosure. Prefer embedding options inside
 * PlaylistBrowseShellBlock (MA-106) via chrome="options".
 */

import { useEffect, useState } from 'react'
import { BrowseDisclosure, BrowseDisclosureOption } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { PlaylistFocusModel } from '../models'

export interface PlaylistFocusPickerBlockProps {
  focuses: PlaylistFocusModel[]
  activeId: string
  onSelect: (focus: PlaylistFocusModel) => void
  /** disclosure = own chip; options = list only (shell owns BrowseDisclosure) */
  chrome?: 'disclosure' | 'options'
  /** Full-width trigger when chrome=disclosure (phone parity with Clips). */
  fullWidth?: boolean
}

const TONE_DOT: Record<PlaylistFocusModel['tone'], string> = {
  good: 'bg-result-winner',
  bad: 'bg-result-error',
  amber: 'bg-warning',
  none: 'bg-border-strong',
}

function FocusOptionsList({
  focuses,
  activeId,
  onSelect,
}: {
  focuses: PlaylistFocusModel[]
  activeId: string
  onSelect: (focus: PlaylistFocusModel) => void
}) {
  const active = focuses.find((f) => f.id === activeId) ?? focuses[0]
  if (!active) return null
  // Parent BrowseDisclosure owns role="listbox" (MA-140) — avoid nested listboxes.
  return (
    <div>
      {focuses.map((f) => {
        const selected = f.id === active.id
        return (
          <BrowseDisclosureOption
            key={f.id}
            selected={selected}
            leading={
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', TONE_DOT[f.tone])} />
            }
            meta={f.count}
            onSelect={() => onSelect(f)}
          >
            {f.label}
          </BrowseDisclosureOption>
        )
      })}
    </div>
  )
}

export function PlaylistFocusPickerBlock({
  focuses,
  activeId,
  onSelect,
  chrome = 'disclosure',
  fullWidth = false,
}: PlaylistFocusPickerBlockProps) {
  const [open, setOpen] = useState(false)
  const active = focuses.find((f) => f.id === activeId) ?? focuses[0]

  useEffect(() => {
    setOpen(false)
  }, [activeId])

  if (!active || focuses.length === 0) return null

  if (chrome === 'options') {
    return <FocusOptionsList focuses={focuses} activeId={activeId} onSelect={onSelect} />
  }

  return (
    <BrowseDisclosure
      aria-label="Playlist focus"
      label={fullWidth ? 'Focus' : undefined}
      fullWidth={fullWidth}
      open={open}
      onOpenChange={setOpen}
      value={
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', TONE_DOT[active.tone])} />
          <span className={cn('truncate', fullWidth ? 'max-w-none' : 'max-w-[12rem]')}>
            {active.label}
          </span>
        </span>
      }
      meta={active.count}
      panelClassName="py-1 max-h-64 overflow-y-auto"
    >
      <FocusOptionsList
        focuses={focuses}
        activeId={activeId}
        onSelect={(f) => {
          onSelect(f)
          setOpen(false)
        }}
      />
    </BrowseDisclosure>
  )
}
