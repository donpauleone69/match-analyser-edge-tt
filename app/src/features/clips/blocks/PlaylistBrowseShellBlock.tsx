/**
 * PlaylistBrowseShellBlock — sticky browse chrome on shared BrowseDisclosure.
 *
 * Clips: preset groups. Serve/Receive: pass focus options as children.
 * MA-118: mobile polish — safe sticky strip, trail wrap, under-tabs sticky.
 * MA-121: Work-on trail — return cluster vs Fix action; phone Fix icon-only.
 * MA-127: sticky chrome — under-review offset tracks Match Review header height
 * (title + tabs), not a hard-coded top-14; quieter strip; open elevates z.
 */

import { useEffect, useState, type ReactNode } from 'react'
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
   * `under-tabs` = below Match Review sticky chrome (`[data-match-review-chrome]`).
   * `page` = standalone /clips (top of scrollport).
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

/** Arrival / return chrome (Work on, Stay, Summary) vs clip actions (Fix). */
function isReturnTrailId(id: string) {
  return id === 'workon' || id === 'stay' || id === 'back' || id === 'summary' || id === 'clips'
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

/** Fallback when review chrome isn't mounted yet (~title + denser tabs). */
const UNDER_TABS_FALLBACK_PX = 104

function useUnderReviewStickyTop(enabled: boolean): number {
  const [top, setTop] = useState(UNDER_TABS_FALLBACK_PX)

  useEffect(() => {
    if (!enabled) return
    const chrome = document.querySelector<HTMLElement>('[data-match-review-chrome]')
    if (!chrome) {
      setTop(UNDER_TABS_FALLBACK_PX)
      return
    }
    const sync = () => {
      const h = Math.ceil(chrome.getBoundingClientRect().height)
      if (h > 0) setTop(h)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(chrome)
    return () => ro.disconnect()
  }, [enabled])

  return top
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
  panelClassName = 'p-1 max-h-[min(45dvh,20rem)] overflow-y-auto overscroll-contain',
  groups,
  activeKey = null,
  onSelect,
  priorityGroup = null,
  stickyMode = 'page',
  children,
}: PlaylistBrowseShellBlockProps) {
  const underTabs = stickyMode === 'under-tabs'
  const underTop = useUnderReviewStickyTop(underTabs)

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

  const returnTrail = trail.filter((t) => isReturnTrailId(t.id))
  const actionTrail = trail.filter((t) => !isReturnTrailId(t.id))
  // When Work-on arrival chrome is present, Fix is icon-only on phone so the
  // return path stays readable (MA-121).
  const compactActions = returnTrail.some((t) => t.id === 'workon' || t.id === 'stay')

  const renderTrailButton = (t: PlaylistBrowseTrailLink) => {
    // Stay is always icon-only; Fix becomes icon-only on phone beside Work on.
    const forcePhoneIcon = t.iconOnly || (compactActions && t.id === 'fix')
    if (t.iconOnly) {
      return (
        <Button
          key={t.id}
          size="sm"
          variant="ghost"
          className="h-10 w-10 shrink-0 px-0 touch-manipulation sm:h-9 sm:w-9"
          onClick={t.onClick}
          aria-label={t.label}
          title={t.label}
        >
          <Icon name="x" size="sm" />
        </Button>
      )
    }
    if (forcePhoneIcon && t.id === 'fix') {
      return (
        <Button
          key={t.id}
          size="sm"
          variant="ghost"
          className="h-10 w-10 shrink-0 px-0 touch-manipulation sm:h-9 sm:w-auto sm:gap-1 sm:px-2"
          onClick={t.onClick}
          aria-label={t.label}
          title={t.label}
        >
          <Icon name="edit" size="sm" />
          <span className="hidden sm:inline text-xs">{t.shortLabel ?? t.label}</span>
        </Button>
      )
    }
    return (
      <Button
        key={t.id}
        size="sm"
        variant={t.primary ? 'secondary' : 'ghost'}
        className="h-10 shrink-0 gap-1 px-2.5 text-xs touch-manipulation sm:h-9 sm:px-2"
        onClick={t.onClick}
      >
        {trailIcon(t.id)}
        <span className="sm:hidden">{t.shortLabel ?? t.label}</span>
        <span className="hidden sm:inline">{t.label}</span>
      </Button>
    )
  }

  return (
    <div
      className={cn(
        'sticky -mx-1 space-y-1 border-b border-border bg-bg-surface/95 px-1 py-1.5 backdrop-blur',
        // Open disclosure must clear scrolling stage content; closed sits under review chrome.
        open ? 'z-30' : 'z-20',
        !underTabs && 'top-0',
        className
      )}
      style={underTabs ? { top: underTop } : undefined}
    >
      {/*
        Phone: chip full-width, trail on a second row so the disclosure never
        starves. sm+: chip + trail on one row (MA-107 density).
      */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
        <BrowseDisclosure
          className="min-w-0 w-full sm:flex-1"
          fullWidth
          aria-label={ariaLabel}
          label={label}
          value={activeLabel}
          meta={meta}
          open={open}
          onOpenChange={onOpenChange}
          triggerClassName="rounded-md border-border bg-bg-card py-2.5 text-sm sm:py-2"
          panelClassName={panelClassName}
        >
          {panel}
        </BrowseDisclosure>

        {trail.length > 0 ? (
          <nav
            aria-label="Playlist trail"
            className="flex shrink-0 items-center justify-end gap-1 sm:justify-start"
          >
            {returnTrail.length > 0 ? (
              <div className="flex items-center gap-1" role="group" aria-label="Return">
                {returnTrail.map(renderTrailButton)}
              </div>
            ) : null}
            {returnTrail.length > 0 && actionTrail.length > 0 ? (
              <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />
            ) : null}
            {actionTrail.length > 0 ? (
              <div className="flex items-center gap-1" role="group" aria-label="Clip actions">
                {actionTrail.map(renderTrailButton)}
              </div>
            ) : null}
          </nav>
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
