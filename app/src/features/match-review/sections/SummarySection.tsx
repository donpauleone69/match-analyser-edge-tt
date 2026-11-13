/**
 * SummarySection — first-person narrative entry for Match Review.
 * Takeaways + category navigation into story areas (stats → playlists).
 */

import { OverviewSection } from './OverviewSection'
import type { EvidenceRef, MatchReviewViewModel, RallyRowModel } from '../models'

export interface SummarySectionProps {
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
  onOpenDetails?: () => void
  onOpenIncomplete?: () => void
}

export function SummarySection(props: SummarySectionProps) {
  return <OverviewSection {...props} />
}
