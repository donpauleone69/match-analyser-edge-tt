/**
 * PlaylistBrowseShellBlock — sticky browse chrome on shared BrowseDisclosure.
 *
 * Clips: preset groups. Serve/Receive: pass focus options as children.
 * MA-118: mobile polish — safe sticky strip, trail wrap, under-tabs sticky.
 * MA-121: Work-on trail — return cluster vs Fix action; phone Fix icon-only.
 * MA-127: sticky chrome — under-review offset tracks Match Review header height
 * (title + tabs), not a hard-coded top-14; quieter strip; open elevates z.
 * MA-131: Summary / Evidence / Rallies arrival trail parity with Work-on.
 * MA-145: phone trail density — one-row chip+trail, h-9 taps, icon-only return.
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
  if (id === 'workon' || id === 'back' || id === 'summary' || id === 'rallies') {
    return <Icon name="arrow-left" size="xs" />
  }
  if (id === 'fix') return <Icon name="edit" size="xs" />
  if (id === 'clips') return <Icon name="film" size="xs" />
  return null
}

/** Arrival / return chrome (Work on, Summary, Rallies, Stay) vs clip actions (Fix). */
function isReturnTrailId(id: string) {
  return (
    id === 'workon' ||
    id === 'stay' ||
    id === 'back' ||
    id === 'summary' ||
    id === 'rallies' ||
    id === 'clips'
  )
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
  // Arrival chrome → phone trail is icon-first so the chip keeps width (MA-145).
  const compactPhoneTrail = returnTrail.some(
    (t) => t.id === 'workon' || t.id === 'summary' || t.id === 'rallies' || t.id === 'stay'
  )

  const renderTrailButton = (t: PlaylistBrowseTrailLink) => {
    const phoneIcon =
      t.iconOnly ||
      (compactPhoneTrail && (t.id === 'fix' || t.primary || t.id === 'clips'))

    if (t.iconOnly || (phoneIcon && (t.id === 'stay' || t.id === 'fix'))) {
      const icon =
        t.id === 'stay' ? (
          <Icon name="x" size="sm" />
        ) : t.id === 'fix' ? (
          <Icon name="edit" size="sm" />
        ) : (
          trailIcon(t.id) ?? <Icon name="x" size="sm" />
        )
      return (
        <Button
          key={t.id}
          size="sm"
          variant="ghost"
          className={cn(
            'h-9 w-9 shrink-0 px-0 touch-manipulation',
            // Fix: labelled from sm up when compacted beside arrival chrome.
            t.id === 'fix' && !t.iconOnly && 'sm:w-auto sm:gap-1 sm:px-2'
          )}
          onClick={t.onClick}
          aria-label={t.label}
          title={t.label}
        >
          {icon}
          {t.id === 'fix' && !t.iconOnly ? (
            <span className="hidden sm:inline text-xs">{t.shortLabel ?? t.label}</span>
          ) : null}
        </Button>
      )
    }

    if (phoneIcon && (t.primary || t.id === 'clips')) {
      return (
        <Button
          key={t.id}
          size="sm"
          variant={t.primary ? 'secondary' : 'ghost'}
          className="h-9 w-9 shrink-0 px-0 touch-manipulation sm:w-auto sm:gap-1 sm:px-2"
          onClick={t.onClick}
          aria-label={t.label}
          title={t.label}
        >
          {trailIcon(t.id)}
          <span className="hidden sm:inline text-xs">{t.shortLabel ?? t.label}</span>
        </Button>
      )
    }

    return (
      <Button
        key={t.id}
        size="sm"
        variant={t.primary ? 'secondary' : 'ghost'}
        className="h-9 shrink-0 gap-1 px-2 text-xs touch-manipulation"
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
        'sticky -mx-1 space-y-0.5 border-b border-border bg-bg-surface/95 px-1 py-1 backdrop-blur',
        // Open disclosure must clear scrolling stage content; closed sits under review chrome.
        open ? 'z-30' : 'z-20',
        !underTabs && 'top-0',
        className
      )}
      style={underTabs ? { top: underTop } : undefined}
    >
      {/*
        MA-145: chip + trail share one row on phone (icon-first trail) so the
        sticky strip stays a single dense band. sm+ keeps labelled trail.
      */}
      <div className="flex flex-row items-center gap-1">
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
          <nav
            aria-label="Playlist trail"
            className="flex shrink-0 items-center gap-0.5"
          >
            {returnTrail.length > 0 ? (
              <div className="flex items-center gap-0.5" role="group" aria-label="Return">
                {returnTrail.map(renderTrailButton)}
              </div>
            ) : null}
            {returnTrail.length > 0 && actionTrail.length > 0 ? (
              <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border" />
            ) : null}
            {actionTrail.length > 0 ? (
              <div className="flex items-center gap-0.5" role="group" aria-label="Clip actions">
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
