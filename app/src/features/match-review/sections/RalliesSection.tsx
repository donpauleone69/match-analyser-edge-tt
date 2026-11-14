/**
 * RalliesSection — browse every tagged rally in a set, filter, watch,
 * star, or open a single rally to fix its tags.
 */

import { Button, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { RallyRowBlock } from '../blocks/RallyRowBlock'
import type { RallyActions, RallyRowModel, SetPanelModel } from '../models'

export type RallyFilter =
  | 'all'
  | 'won'
  | 'lost'
  | 'errors'
  | 'starred'
  | 'flagged'
  | 'incomplete'

const FILTERS: { id: RallyFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'errors', label: 'Errors' },
  { id: 'incomplete', label: 'Incomplete' },
  { id: 'starred', label: '★' },
  { id: 'flagged', label: 'Flagged' },
]

export function filterRallies(rallies: RallyRowModel[], filter: RallyFilter): RallyRowModel[] {
  switch (filter) {
    case 'won':
      return rallies.filter((r) => !r.isIncomplete && r.heroWon)
    case 'lost':
      return rallies.filter((r) => !r.isIncomplete && !r.heroWon)
    case 'errors':
      return rallies.filter((r) => !r.isIncomplete && r.isError && !r.heroWon)
    case 'incomplete':
      return rallies.filter((r) => r.isIncomplete)
    case 'starred':
      return rallies.filter((r) => r.isHighlight)
    case 'flagged':
      return rallies.filter((r) => r.reviewCount > 0)
    default:
      return rallies
  }
}

export interface RalliesSectionProps {
  sets: SetPanelModel[]
  selectedSetNumber: number
  onSelectSet: (setNumber: number) => void
  rallies: RallyRowModel[]
  filter: RallyFilter
  onFilterChange: (filter: RallyFilter) => void
  heroName: string
  actions: RallyActions
  onTagSet: (set: SetPanelModel) => void
}

export function RalliesSection({
  sets,
  selectedSetNumber,
  onSelectSet,
  rallies,
  filter,
  onFilterChange,
  heroName,
  actions,
  onTagSet,
}: RalliesSectionProps) {
  const set = sets.find((s) => s.setNumber === selectedSetNumber)
  const inSet = rallies.filter((r) => r.setNumber === selectedSetNumber)
  const shown = filterRallies(inSet, filter)
  const chip = (active: boolean) =>
    cn(
      'h-8 px-2.5 rounded-md border text-xs font-medium whitespace-nowrap transition-colors',
      active
        ? 'bg-neutral-100 text-neutral-900 border-neutral-100'
        : 'border-border text-neutral-300 hover:border-border-strong'
    )

  return (
    <div className="space-y-3">
      {sets.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Set">
          {sets.map((s) => (
            <button key={s.setId} type="button" className={chip(s.setNumber === selectedSetNumber)} onClick={() => onSelectSet(s.setNumber)}>
              Set {s.setNumber}
              {s.scoreLabel && <span className="ml-1.5 font-mono">{s.scoreLabel}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter rallies">
        {FILTERS.map((f) => {
          const count = filterRallies(inSet, f.id).length
          if (f.id !== 'all' && f.id !== filter && count === 0) return null
          return (
            <button key={f.id} type="button" className={chip(filter === f.id)} onClick={() => onFilterChange(f.id)}>
              {f.label} <span className="opacity-60 tabular-nums">{count}</span>
            </button>
          )
        })}
      </div>

      {inSet.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-3 text-center space-y-1.5">
          <p className="text-xs text-muted">No rallies in Set {selectedSetNumber} yet.</p>
          {set && (
            <Button size="sm" onClick={() => onTagSet(set)}>
              <Icon name="play" size="sm" /> Start tagging
            </Button>
          )}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-xs text-muted rounded-md bg-bg-card px-2.5 py-1.5">
          {filter === 'incomplete' ? 'No incomplete points in this set.' : 'No rallies match this filter.'}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted tabular-nums">
              {shown.length} {shown.length === 1 ? 'rally' : 'rallies'}
            </span>
            {shown.length > 1 && actions.onOpenInClips && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  actions.onOpenInClips!(
                    shown,
                    `Set ${selectedSetNumber} · ${FILTERS.find((f) => f.id === filter)?.label ?? 'All'}`
                  )
                }
              >
                <Icon name="film" size="sm" /> Clips
              </Button>
            )}
          </div>
          <ul className="divide-y divide-border rounded-lg bg-bg-card overflow-hidden">
            {shown.map((r) => (
              <RallyRowBlock
                key={r.id}
                rally={r}
                heroName={heroName}
                onWatch={(rally) => actions.onWatch(rally, shown, `Set ${selectedSetNumber} rallies`)}
                onEdit={actions.onEdit}
                onToggleHighlight={actions.onToggleHighlight}
                onRetagFrom={actions.onRetagFrom}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
