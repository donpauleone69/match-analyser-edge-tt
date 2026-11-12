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
}: SummaryCategoryPlaylistBlockProps) {
  if (rallies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-700 px-4 py-6 text-sm text-neutral-400 text-center">
        No points linked to your numbers in this category yet.
      </div>
    )
  }
  return (
    <section className="space-y-3" aria-label={`${title} playlist`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-50">Points for you</h3>
          <p className="text-xs text-neutral-400">
            {rallies.length} point{rallies.length === 1 ? '' : 's'} from your side of these stats
          </p>
        </div>
        {rallies.length > 1 && (
          <Button size="sm" variant="secondary" onClick={onPlayAll}>
            <Icon name="play" size="sm" /> Play all
          </Button>
        )}
      </div>
      <ul className="rounded-xl border border-neutral-700 overflow-hidden divide-y divide-neutral-800">
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
