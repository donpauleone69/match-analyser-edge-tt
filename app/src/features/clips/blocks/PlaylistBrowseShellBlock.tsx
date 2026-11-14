/**
 * PlaylistBrowseShellBlock — fuller Clips browse chrome on shared BrowseDisclosure.
 *
 * Sticky History-style picker + trail (Work on / Fix tags) so playlists ↔ video ↔
 * tags feel continuous with Serve/Receive focus pickers. Presentational only.
 */

import type { ReactNode } from 'react'
import { BrowseDisclosure, Button, Icon } from '@/ui-mine'
import type { ClipPreset } from '@/rules/derive/clips/deriveClipPresets'
import type { ClipPresetGroupModel } from '../models'
import { ClipPresetListBlock } from './ClipPresetListBlock'

export interface PlaylistBrowseTrailLink {
  id: string
  label: string
  onClick: () => void
  primary?: boolean
}

export interface PlaylistBrowseShellBlockProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: ClipPresetGroupModel[]
  activeKey: string | null
  activeLabel: string
  clipCount: number | null
  /** e.g. "From Work on · BH Push" */
  contextLabel?: string | null
  trail?: PlaylistBrowseTrailLink[]
  onSelect: (preset: ClipPreset) => void
  below?: ReactNode
}

export function PlaylistBrowseShellBlock({
  open,
  onOpenChange,
  groups,
  activeKey,
  activeLabel,
  clipCount,
  contextLabel = null,
  trail = [],
  onSelect,
  below,
}: PlaylistBrowseShellBlockProps) {
  return (
    <div className="sticky top-0 z-20 space-y-2 rounded-lg border border-border/80 bg-bg-shell/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-bg-shell/90">
      {contextLabel ? (
        <p className="truncate px-1 text-[10px] font-medium text-muted" title={contextLabel}>
          {contextLabel}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <BrowseDisclosure
          className="min-w-0 flex-1"
          fullWidth
          aria-label="Playlists"
          label="Playlists"
          value={activeLabel}
          meta={typeof clipCount === 'number' ? clipCount : undefined}
          open={open}
          onOpenChange={onOpenChange}
          panelClassName="p-2 max-h-[min(42dvh,22rem)] overflow-y-auto overscroll-contain"
        >
          <ClipPresetListBlock
            groups={groups}
            activeKey={activeKey}
            density="compact"
            onSelect={(preset) => {
              onSelect(preset)
              onOpenChange(false)
            }}
          />
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
                {t.id === 'workon' || t.id === 'back' ? <Icon name="arrow-left" size="xs" /> : null}
                {t.id === 'fix' ? <Icon name="edit" size="xs" /> : null}
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
