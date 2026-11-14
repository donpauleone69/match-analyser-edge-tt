/**
 * PlaylistBrowseShellBlock — sticky playlist browse chrome on shared BrowseDisclosure.
 *
 * Clips: preset groups panel. Serve/Receive: pass focus options as children.
 * Trail keeps Summary / Work on / Clips / Fix tags continuous with the stage.
 */

import type { ReactNode } from 'react'
import { BrowseDisclosure, Button, Icon } from '@/ui-mine'
import type { ClipPreset } from '@/rules/derive/clips/deriveClipPresets'
import type { ClipPresetGroupModel } from '../models'
import { ClipPresetListBlock } from './ClipPresetListBlock'
import { cn } from '@/helpers/utils'

export interface PlaylistBrowseTrailLink {
  id: string
  label: string
  onClick: () => void
  primary?: boolean
}

export interface PlaylistBrowseShellBlockProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeLabel: ReactNode
  /** Count / meta beside the active label. */
  meta?: ReactNode
  /** Quiet prefix on the chip (default "Playlists"). */
  label?: ReactNode
  'aria-label'?: string
  /** e.g. "From Work on · BH Push" or "Serve Data · Problems" */
  contextLabel?: string | null
  trail?: PlaylistBrowseTrailLink[]
  below?: ReactNode
  className?: string
  panelClassName?: string
  /** Clips preset panel (ignored when children provided). */
  groups?: ClipPresetGroupModel[]
  activeKey?: string | null
  onSelect?: (preset: ClipPreset) => void
  /** Custom panel (Serve/Receive focuses). Takes precedence over groups. */
  children?: ReactNode
}

function trailIcon(id: string) {
  if (id === 'workon' || id === 'back' || id === 'summary') {
    return <Icon name="arrow-left" size="xs" />
  }
  if (id === 'fix') return <Icon name="edit" size="xs" />
  if (id === 'clips') return <Icon name="film" size="xs" />
  return null
}

export function PlaylistBrowseShellBlock({
  open,
  onOpenChange,
  activeLabel,
  meta,
  label = 'Playlists',
  'aria-label': ariaLabel = 'Playlists',
  contextLabel = null,
  trail = [],
  below,
  className,
  panelClassName = 'p-2 max-h-[min(42dvh,22rem)] overflow-y-auto overscroll-contain',
  groups,
  activeKey = null,
  onSelect,
  children,
}: PlaylistBrowseShellBlockProps) {
  const panel =
    children ??
    (groups && onSelect ? (
      <ClipPresetListBlock
        groups={groups}
        activeKey={activeKey}
        density="compact"
        onSelect={(preset) => {
          onSelect(preset)
          onOpenChange(false)
        }}
      />
    ) : null)

  return (
    <div
      className={cn(
        'sticky top-0 z-20 space-y-2 rounded-lg border border-border/80 bg-bg-shell/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-bg-shell/90',
        className
      )}
    >
      {contextLabel ? (
        <p className="truncate px-1 text-[10px] font-medium text-muted" title={contextLabel}>
          {contextLabel}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <BrowseDisclosure
          className="min-w-0 flex-1"
          fullWidth
          aria-label={ariaLabel}
          label={label}
          value={activeLabel}
          meta={meta}
          open={open}
          onOpenChange={onOpenChange}
          panelClassName={panelClassName}
        >
          {panel}
        </BrowseDisclosure>

        {trail.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {trail.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={t.primary ? 'secondary' : 'ghost'}
                className="h-8 shrink-0 px-2 text-xs"
                onClick={t.onClick}
              >
                {trailIcon(t.id)}
                {t.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {below}
    </div>
  )
}
