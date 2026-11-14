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
import { ServeReceiveDataSection } from './ServeReceiveDataSection'
import type { EvidenceRef, MatchReviewViewModel, RallyRowModel } from '../models'

export interface OverviewSectionProps {
  review: MatchReviewViewModel
  activeEvidenceTitle: string | null
  categoryId: string | null
  focusId?: string | null
  onSelectCategory: (id: string | null) => void
  onFocusChange?: (focusId: string | null) => void
  onOpenEvidence: (evidence: EvidenceRef) => void
  /** Close evidence drawer (Serve/Receive focus change) */
  onClearEvidence?: () => void
  /** Rally ids in the open evidence set (playlist soft-highlight) */
  evidenceRallyIds?: string[] | null
  activeRallyId?: string | null
  onPlayCategoryPlaylist: (title: string, rallies: RallyRowModel[]) => void
  onWatchRally: (rally: RallyRowModel, playlist: RallyRowModel[], title: string) => void
  onEditRally: (rally: RallyRowModel) => void
  onToggleHighlight: (rally: RallyRowModel) => void
  /** Soft context polish — open Details to add opponent / tournament. */
  onOpenDetails?: () => void
  /** Soft incomplete polish — open Rallies Incomplete filter. */
  onOpenIncomplete?: () => void
}

export function OverviewSection({
  review,
  activeEvidenceTitle,
  categoryId,
  focusId = null,
  onSelectCategory,
  onFocusChange,
  onOpenEvidence,
  onClearEvidence,
  evidenceRallyIds = null,
  activeRallyId = null,
  onPlayCategoryPlaylist,
  onWatchRally,
  onEditRally,
  onToggleHighlight,
  onOpenDetails,
  onOpenIncomplete,
}: OverviewSectionProps) {
  const rallyById = new Map(review.rallies.map((r) => [r.id, r]))
  const multiSet = review.sets.length > 1
  const activeSection = categoryId ? review.sections.find((s) => s.id === categoryId) ?? null : null
  const incompleteCount = review.rallies.filter((r) => r.isIncomplete).length
  const needsOpponent = review.totalPoints > 0 && !review.context.player2Id
  const needsTournament =
    review.totalPoints > 0 && Boolean(review.context.player2Id) && !review.context.tournamentId

  if (activeSection && (activeSection.id === 'B' || activeSection.id === 'C')) {
    return (
      <ServeReceiveDataSection
        section={activeSection}
        villainName={review.villainName}
        heroName={review.heroName}
        rallies={review.rallies}
        multiSet={multiSet}
        activeEvidenceTitle={activeEvidenceTitle}
        evidenceRallyIds={evidenceRallyIds}
        activeRallyId={activeRallyId}
        focusIdFromUrl={focusId}
        onFocusChange={onFocusChange}
        onClearEvidence={onClearEvidence}
        onBack={() => onSelectCategory(null)}
        onOpenEvidence={onOpenEvidence}
        onPlayPlaylist={onPlayCategoryPlaylist}
        onWatchRally={onWatchRally}
        onEditRally={onEditRally}
        onToggleHighlight={onToggleHighlight}
      />
    )
  }

  if (activeSection) {
    const playlist = buildCategoryPlaylist(activeSection, rallyById)
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-100"
        >
          <Icon name="arrow-left" size="sm" /> All categories
        </button>
        <div>
          <h2 className="text-lg font-semibold text-neutral-50">{activeSection.title}</h2>
          <p className="text-sm text-neutral-500">{activeSection.question}</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
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
    <div className="space-y-4">
      {incompleteCount > 0 && onOpenIncomplete && (
        <button
          type="button"
          onClick={onOpenIncomplete}
          className="w-full text-left rounded-md border border-callout-warning-border bg-callout-warning-bg px-2.5 py-1.5 hover:border-callout-warning"
        >
          <p className="text-xs font-medium text-callout-warning">
            {incompleteCount} incomplete · Rallies → Incomplete
          </p>
        </button>
      )}

      {(needsOpponent || needsTournament) && onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full text-left rounded-md border border-border px-2.5 py-1.5 hover:border-border-strong"
        >
          <p className="text-xs font-medium text-neutral-100">
            {needsOpponent ? 'Add opponent (optional)' : 'Add tournament (optional)'}
            <span className="ml-1 font-normal text-neutral-500">
              {needsOpponent ? '· Find / Clips' : '· Find / Clips'}
            </span>
          </p>
        </button>
      )}

      <TakeawaysBlock takeaways={review.takeaways} onOpenEvidence={onOpenEvidence} />

      <SummaryCategoryNavBlock sections={review.sections} onSelect={onSelectCategory} />

      {review.locked.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Coming next</h2>
          <div className="grid gap-2 md:grid-cols-3">
            {review.locked.map((s) => (
              <LockedSectionBlock key={s.id} id={s.id} title={s.title} question={s.question} note={s.note} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
