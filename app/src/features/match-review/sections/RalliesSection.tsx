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
  { id: 'errors', label: 'My errors' },
  { id: 'incomplete', label: 'Incomplete' },
  { id: 'starred', label: '★ Starred' },
  { id: 'flagged', label: 'Flagged shots' },
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
      'h-8 px-3 rounded-full border text-xs font-medium whitespace-nowrap transition-colors',
      active
        ? 'bg-neutral-100 text-neutral-900 border-neutral-100'
        : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
    )

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        <span className="md:hidden">
          Tap Edit to fix tags. Use{' '}
          <Icon name="rotate-ccw" size="xs" className="inline align-[-2px]" /> to re-tag from that rally on.
        </span>
        <span className="hidden md:inline">
          Fix a mistake without re-tagging: open any rally, change its tags and save — only that rally is rewritten, and later
          scores follow if the winner changes. If tagging went off track, use{' '}
          <Icon name="rotate-ccw" size="xs" className="inline align-[-2px]" /> to re-tag from that rally onwards.
        </span>
      </p>

      {sets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Set">
          {sets.map((s) => (
            <button key={s.setId} type="button" className={chip(s.setNumber === selectedSetNumber)} onClick={() => onSelectSet(s.setNumber)}>
              Set {s.setNumber}
              {s.scoreLabel && <span className="ml-1.5 font-mono">{s.scoreLabel}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filter rallies">
        {FILTERS.map((f) => {
          const count = filterRallies(inSet, f.id).length
          return (
            <button key={f.id} type="button" className={chip(filter === f.id)} onClick={() => onFilterChange(f.id)}>
              {f.label} <span className="opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {inSet.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-700 p-6 text-center space-y-3">
          <p className="text-sm text-neutral-400">No rallies tagged in Set {selectedSetNumber} yet.</p>
          {set && (
            <Button size="sm" onClick={() => onTagSet(set)}>
              <Icon name="play" size="sm" /> Start tagging
            </Button>
          )}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-neutral-500 rounded-lg border border-neutral-800 px-3 py-3">No rallies match this filter.</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              {shown.length} {shown.length === 1 ? 'rally' : 'rallies'} · edit tags here
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
                <Icon name="film" size="sm" /> Open in Clips
              </Button>
            )}
          </div>
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 overflow-hidden">
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
