/**
 * SummaryCategoryPlaylistBlock — Clips-like list of points for a Summary category.
 * MA-122: quieter tokens; optional evidence-linked row highlight.
 * MA-133: denser empty shell (title + hint) for Serve/Receive focus empties.
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
  /** Quieter supporting line under emptyLabel (Serve/Receive focus empties). */
  emptyHint?: string | null
  /** Soft-highlight rows that belong to the open evidence set */
  evidenceRallyIds?: string[] | null
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
  emptyLabel = 'No points in this focus yet.',
  emptyHint = null,
  evidenceRallyIds = null,
}: SummaryCategoryPlaylistBlockProps) {
  const evidenceSet =
    evidenceRallyIds && evidenceRallyIds.length > 0 ? new Set(evidenceRallyIds) : null

  if (rallies.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-2.5 py-2 text-center">
        <p className="text-xs font-medium text-primary">{emptyLabel}</p>
        {emptyHint ? <p className="mt-0.5 text-[11px] text-muted">{emptyHint}</p> : null}
      </div>
    )
  }
  return (
    <section className="space-y-1.5" aria-label={`${title} playlist`}>
      {!hidePlayAll && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-primary">{listHeading}</h3>
            <p className="text-[11px] text-muted">
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
      {hidePlayAll && (
        <p className="text-[10px] text-muted tabular-nums px-0.5">
          {rallies.length} point{rallies.length === 1 ? '' : 's'}
          {evidenceSet ? ' · linked to open evidence' : ''}
        </p>
      )}
      <ul className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {rallies.map((r) => (
          <RallyRowBlock
            key={r.id}
            rally={r}
            heroName={heroName}
            showSet={multiSet}
            active={activeRallyId === r.id}
            evidenceLinked={Boolean(evidenceSet?.has(r.id))}
            onWatch={(rally) => onWatch(rally, rallies)}
            onEdit={onEdit}
            onToggleHighlight={onToggleHighlight}
          />
        ))}
      </ul>
    </section>
  )
}
