/**
 * SummaryCategoryPlaylistBlock — Clips-like list of points for a Summary category.
 */

import { Button, Icon } from '@/ui-mine'
import { RallyRowBlock } from './RallyRowBlock'
import type { RallyRowModel } from '../models'

export interface SummaryCategoryPlaylistBlockProps {
  title: string
  rallies: RallyRowModel[]
  heroName: string
  multiSet: boolean
  activeRallyId: string | null
  onPlayAll: () => void
  onWatch: (rally: RallyRowModel, playlist: RallyRowModel[]) => void
  onEdit: (rally: RallyRowModel) => void
  onToggleHighlight: (rally: RallyRowModel) => void
  /** When true, parent owns the Clips/Play CTA (Serve/Receive sticky bar). */
  hidePlayAll?: boolean
  listHeading?: string
  emptyLabel?: string
}

export function SummaryCategoryPlaylistBlock({
  title,
  rallies,
  heroName,
  multiSet,
  activeRallyId,
  onPlayAll,
  onWatch,
  onEdit,
  onToggleHighlight,
  hidePlayAll = false,
  listHeading = 'Points for you',
  emptyLabel = 'No points linked to your numbers in this category yet.',
}: SummaryCategoryPlaylistBlockProps) {
  if (rallies.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-5 text-sm text-neutral-500 text-center">
        {emptyLabel}
      </div>
    )
  }
  return (
    <section className="space-y-2" aria-label={`${title} playlist`}>
      {!hidePlayAll && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-neutral-50">{listHeading}</h3>
            <p className="text-xs text-neutral-500">
              {rallies.length} point{rallies.length === 1 ? '' : 's'}
            </p>
          </div>
          {rallies.length > 1 && (
            <Button size="sm" variant="secondary" onClick={onPlayAll}>
              <Icon name="film" size="sm" /> Clips
            </Button>
          )}
        </div>
      )}
      <ul className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {rallies.map((r) => (
          <RallyRowBlock
            key={r.id}
            rally={r}
            heroName={heroName}
            showSet={multiSet}
            active={activeRallyId === r.id}
            onWatch={(rally) => onWatch(rally, rallies)}
            onEdit={onEdit}
            onToggleHighlight={onToggleHighlight}
          />
        ))}
      </ul>
    </section>
  )
}
