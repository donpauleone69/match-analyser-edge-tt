/**
 * HighlightsSection — the match watch list.
 *
 * Starred rallies (from tagging or the rally browser) are the clips worth
 * re-watching or showing a coach. Longest rallies are picked automatically.
 * Works without video: the list still shows score, server and how it ended.
 */

import { Button, Card, Icon } from '@/ui-mine'
import { RallyRowBlock } from '../blocks/RallyRowBlock'
import type { RallyRowModel } from '../models'

export interface RallyActions {
  onWatch: (rally: RallyRowModel, playlist: RallyRowModel[], playlistTitle: string) => void
  onEdit: (rally: RallyRowModel) => void
  onToggleHighlight: (rally: RallyRowModel) => void
  /** Delete this rally and later ones, then resume tagging here */
  onRetagFrom?: (rally: RallyRowModel) => void
}

export interface HighlightsSectionProps {
  flagged: RallyRowModel[]
  longest: RallyRowModel[]
  heroName: string
  multiSet: boolean
  actions: RallyActions
}

function List({
  title,
  hint,
  rallies,
  heroName,
  multiSet,
  actions,
}: {
  title: string
  hint: string
  rallies: RallyRowModel[]
  heroName: string
  multiSet: boolean
  actions: RallyActions
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-neutral-50">
            {title} <span className="text-neutral-500 text-sm font-normal">({rallies.length})</span>
          </h3>
          <p className="text-xs text-neutral-500">{hint}</p>
        </div>
        {rallies.length > 1 && (
          <Button size="sm" variant="secondary" onClick={() => actions.onWatch(rallies[0], rallies, title)}>
            <Icon name="play" size="sm" /> Play all
          </Button>
        )}
      </div>
      <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 overflow-hidden">
        {rallies.map((r) => (
          <RallyRowBlock
            key={r.id}
            rally={r}
            heroName={heroName}
            showSet={multiSet}
            onWatch={(rally) => actions.onWatch(rally, rallies, title)}
            onEdit={actions.onEdit}
            onToggleHighlight={actions.onToggleHighlight}
          />
        ))}
      </ul>
    </section>
  )
}

export function HighlightsSection({ flagged, longest, heroName, multiSet, actions }: HighlightsSectionProps) {
  return (
    <div className="space-y-8">
      {flagged.length > 0 ? (
        <List
          title="Starred rallies"
          hint="Your watch list — great points, teaching moments or ones to show a coach."
          rallies={flagged}
          heroName={heroName}
          multiSet={multiSet}
          actions={actions}
        />
      ) : (
        <Card className="p-5 border border-dashed border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-50 flex items-center gap-2">
            <Icon name="star" size="md" className="text-amber-400" /> No starred rallies yet
          </h3>
          <p className="mt-1 text-sm text-neutral-400">
            Star a rally with <span className="text-neutral-200">★ Highlight</span> while tagging, or tap the star next to any
            rally here or in the Rallies tab. Starred rallies become your watch list.
          </p>
        </Card>
      )}

      {longest.length > 0 && (
        <List
          title="Longest rallies"
          hint="Picked automatically — the longest exchanges you haven’t starred."
          rallies={longest}
          heroName={heroName}
          multiSet={multiSet}
          actions={actions}
        />
      )}
    </div>
  )
}
