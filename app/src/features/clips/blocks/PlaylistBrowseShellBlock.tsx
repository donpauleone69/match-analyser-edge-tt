/**
 * PlaylistBrowseShellBlock — sticky browse chrome on shared BrowseDisclosure.
 *
 * Clips: preset groups. Serve/Receive: pass focus options as children.
 * MA-107: denser strip, compact Work on / Stay / Fix trail, sticky under tabs.
 */

import type { ReactNode } from 'react'
import { BrowseDisclosure, Button, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { ClipPreset, ClipPresetGroup } from '@/rules/derive/clips/deriveClipPresets'
import type { ClipPresetGroupModel } from '../models'
import { ClipPresetListBlock } from './ClipPresetListBlock'

export interface PlaylistBrowseTrailLink {
  id: string
  label: string
  onClick: () => void
  /** Strong return path (Work on / Summary) */
  primary?: boolean
  /** Phone: icon-only control (e.g. Stay dismiss) */
  iconOnly?: boolean
  /** Shorter label on narrow viewports when not iconOnly */
  shortLabel?: string
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
  /** e.g. pattern title or "Serve Data · watch or open Clips" */
  contextLabel?: string | null
  trail?: PlaylistBrowseTrailLink[]
  below?: ReactNode
  className?: string
  panelClassName?: string
  /** Clips preset panel (ignored when children provided). */
  groups?: ClipPresetGroupModel[]
  activeKey?: string | null
  onSelect?: (preset: ClipPreset) => void
  /** Prefer this preset group at the top of the disclosure (Work on deep-link). */
  priorityGroup?: ClipPresetGroup | null
  /**
   * `under-tabs` = Match Review sticky header (~3.5rem).
   * `page` = standalone /clips. Serve/Receive may also pass className="top-14".
   */
  stickyMode?: 'page' | 'under-tabs'
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

function orderGroups(
  groups: ClipPresetGroupModel[],
  priority: ClipPresetGroup | null | undefined
): ClipPresetGroupModel[] {
  if (!priority) return groups
  const head = groups.filter((g) => g.group === priority)
  const rest = groups.filter((g) => g.group !== priority)
  return [...head, ...rest]
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
  panelClassName = 'p-1.5 max-h-[min(40dvh,20rem)] overflow-y-auto overscroll-contain border-border bg-bg-elevated',
  groups,
  activeKey = null,
  onSelect,
  priorityGroup = null,
  stickyMode = 'page',
  children,
}: PlaylistBrowseShellBlockProps) {
  const ordered = groups ? orderGroups(groups, priorityGroup) : null
  const panel =
    children ??
    (ordered && onSelect ? (
      <ClipPresetListBlock
        groups={ordered}
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
        'sticky z-20 -mx-1 space-y-1.5 border-b border-border bg-bg-surface/95 px-1 py-1.5 backdrop-blur',
        stickyMode === 'under-tabs' ? 'top-14' : 'top-0',
        className
      )}
    >
      <div className="flex items-stretch gap-1.5">
        <BrowseDisclosure
          className="min-w-0 flex-1"
          fullWidth
          aria-label={ariaLabel}
          label={label}
          value={activeLabel}
          meta={meta}
          open={open}
          onOpenChange={onOpenChange}
          triggerClassName="rounded-md border-border bg-bg-card py-2 text-sm"
          panelClassName={panelClassName}
        >
          {panel}
        </BrowseDisclosure>

        {trail.length > 0 ? (
          <div className="flex shrink-0 items-center gap-1">
            {trail.map((t) => {
              if (t.iconOnly) {
                return (
                  <Button
                    key={t.id}
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 px-0"
                    onClick={t.onClick}
                    aria-label={t.label}
                    title={t.label}
                  >
                    <Icon name="x" size="sm" />
                  </Button>
                )
              }
              return (
                <Button
                  key={t.id}
                  size="sm"
                  variant={t.primary ? 'secondary' : 'ghost'}
                  className="h-9 shrink-0 gap-1 px-2 text-xs"
                  onClick={t.onClick}
                >
                  {trailIcon(t.id)}
                  <span className="sm:hidden">{t.shortLabel ?? t.label}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </Button>
              )
            })}
          </div>
        ) : null}
      </div>

      {contextLabel ? (
        <p className="truncate px-0.5 text-[10px] leading-tight text-muted" title={contextLabel}>
          {contextLabel}
        </p>
      ) : null}

      {below}
    </div>
  )
}
