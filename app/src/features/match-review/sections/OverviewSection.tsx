/**
 * OverviewSection — Summary body: takeaways, category nav, or one category
 * (hero-first stats + playlist of your points). Replaces the wall of cards.
 */

import { Icon } from '@/ui-mine'
import { CompareCardBlock } from '../blocks/CompareCardBlock'
import { LockedSectionBlock } from '../blocks/LockedSectionBlock'
import { TakeawaysBlock } from '../blocks/TakeawaysBlock'
import { SummaryCategoryNavBlock } from '../blocks/SummaryCategoryNavBlock'
import { SummaryCategoryPlaylistBlock } from '../blocks/SummaryCategoryPlaylistBlock'
import { buildCategoryPlaylist } from '../derive/buildSummaryCategories'
import type { EvidenceRef, MatchReviewViewModel, RallyRowModel } from '../models'

export interface OverviewSectionProps {
  review: MatchReviewViewModel
  activeEvidenceTitle: string | null
  categoryId: string | null
  onSelectCategory: (id: string | null) => void
  onOpenEvidence: (evidence: EvidenceRef) => void
  activeRallyId?: string | null
  onPlayCategoryPlaylist: (title: string, rallies: RallyRowModel[]) => void
  onWatchRally: (rally: RallyRowModel, playlist: RallyRowModel[], title: string) => void
  onEditRally: (rally: RallyRowModel) => void
  onToggleHighlight: (rally: RallyRowModel) => void
  /** Soft context polish — open Details to add opponent / tournament. */
  onOpenDetails?: () => void
}

export function OverviewSection({
  review,
  activeEvidenceTitle,
  categoryId,
  onSelectCategory,
  onOpenEvidence,
  activeRallyId = null,
  onPlayCategoryPlaylist,
  onWatchRally,
  onEditRally,
  onToggleHighlight,
  onOpenDetails,
}: OverviewSectionProps) {
  const rallyById = new Map(review.rallies.map((r) => [r.id, r]))
  const multiSet = review.sets.length > 1
  const activeSection = categoryId ? review.sections.find((s) => s.id === categoryId) ?? null : null
  const needsOpponent = review.totalPoints > 0 && !review.context.player2Id
  const needsTournament =
    review.totalPoints > 0 && Boolean(review.context.player2Id) && !review.context.tournamentId

  if (activeSection) {
    const playlist = buildCategoryPlaylist(activeSection, rallyById)
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-100"
        >
          <Icon name="arrow-left" size="sm" /> All categories
        </button>
        <div>
          <h2 className="text-xl font-semibold text-neutral-50">{activeSection.title}</h2>
          <p className="text-sm italic text-neutral-400">{activeSection.question}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {activeSection.cards.map((card) => (
            <CompareCardBlock
              key={card.id}
              id={card.id}
              title={card.title}
              story={card.story}
              heroName="You"
              villainName={review.villainName}
              rows={card.rows}
              scoreline={card.scoreline}
              emptyMessage={card.emptyMessage}
              activeEvidenceTitle={activeEvidenceTitle}
              onOpenEvidence={onOpenEvidence}
            />
          ))}
        </div>
        <SummaryCategoryPlaylistBlock
          title={activeSection.title}
          rallies={playlist.rallies}
          heroName={review.heroName}
          multiSet={multiSet}
          activeRallyId={activeRallyId}
          onPlayAll={() => onPlayCategoryPlaylist(playlist.evidence.title, playlist.rallies)}
          onWatch={(rally, list) => onWatchRally(rally, list, playlist.evidence.title)}
          onEdit={onEditRally}
          onToggleHighlight={onToggleHighlight}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {(needsOpponent || needsTournament) && onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full text-left rounded-lg border border-neutral-700 bg-neutral-900/50 px-4 py-3 hover:border-neutral-500"
        >
          <p className="text-sm font-medium text-neutral-100">
            {needsOpponent ? 'Add an opponent (optional)' : 'Add a tournament (optional)'}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {needsOpponent
              ? 'Opens Details — unlocks Clips “vs player” filters. Never required to tag.'
              : 'Opens Details — unlocks event filters in Clips / Review scope.'}
          </p>
        </button>
      )}

      <TakeawaysBlock takeaways={review.takeaways} onOpenEvidence={onOpenEvidence} />

      {review.hasPointData && (
        <p className="text-xs text-neutral-500 -mt-4">
          Tap a category for your stats and the points behind them. Underlined numbers open evidence.
        </p>
      )}

      <SummaryCategoryNavBlock sections={review.sections} onSelect={onSelectCategory} />

      {review.locked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-50">Coming next</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {review.locked.map((s) => (
              <LockedSectionBlock key={s.id} id={s.id} title={s.title} question={s.question} note={s.note} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
