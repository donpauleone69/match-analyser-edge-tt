/**
 * ServeReceiveDataSection — curated Serve / Receive Data page.
 *
 * Flow: headlines → few compare cards → playlist focus chips → points list
 * → watch (RallyPlayer) or Play all (Clips). Reuses shared evidence/playlist blocks.
 */

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/ui-mine'
import { CompareCardBlock } from '../blocks/CompareCardBlock'
import { HeadlineMetricsBlock } from '../blocks/HeadlineMetricsBlock'
import { PlaylistFocusChipsBlock } from '../blocks/PlaylistFocusChipsBlock'
import { SummaryCategoryPlaylistBlock } from '../blocks/SummaryCategoryPlaylistBlock'
import type {
  CompareSectionModel,
  EvidenceRef,
  PlaylistFocusModel,
  RallyRowModel,
} from '../models'

export interface ServeReceiveDataSectionProps {
  section: CompareSectionModel
  villainName: string
  heroName: string
  rallies: RallyRowModel[]
  multiSet: boolean
  activeEvidenceTitle: string | null
  activeRallyId?: string | null
  onBack: () => void
  onOpenEvidence: (evidence: EvidenceRef) => void
  onPlayPlaylist: (title: string, rallies: RallyRowModel[]) => void
  onWatchRally: (rally: RallyRowModel, playlist: RallyRowModel[], title: string) => void
  onEditRally: (rally: RallyRowModel) => void
  onToggleHighlight: (rally: RallyRowModel) => void
}

function resolveFocus(
  focuses: PlaylistFocusModel[],
  activeId: string | null
): PlaylistFocusModel | null {
  if (focuses.length === 0) return null
  return focuses.find((f) => f.id === activeId) ?? focuses[0] ?? null
}

export function ServeReceiveDataSection({
  section,
  villainName,
  heroName,
  rallies,
  multiSet,
  activeEvidenceTitle,
  activeRallyId = null,
  onBack,
  onOpenEvidence,
  onPlayPlaylist,
  onWatchRally,
  onEditRally,
  onToggleHighlight,
}: ServeReceiveDataSectionProps) {
  const focuses = section.playlistFocuses ?? []
  const [focusId, setFocusId] = useState<string | null>(() => focuses[0]?.id ?? null)

  useEffect(() => {
    setFocusId(section.playlistFocuses?.[0]?.id ?? null)
    // Reset focus when switching Serve ↔ Receive pages only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id])

  const activeFocus = resolveFocus(focuses, focusId)
  const rallyById = useMemo(() => new Map(rallies.map((r) => [r.id, r])), [rallies])

  const playlistRallies = useMemo(() => {
    const ids = activeFocus?.rallyIds ?? []
    return ids
      .map((id) => rallyById.get(id))
      .filter((r): r is RallyRowModel => Boolean(r))
      .sort((a, b) => a.setNumber - b.setNumber || a.rallyIndex - b.rallyIndex)
  }, [activeFocus, rallyById])

  const playlistTitle = activeFocus
    ? `${section.title} · ${activeFocus.label}`
    : `${section.title} · points for you`

  const openEvidenceAndFocus = (evidence: EvidenceRef) => {
    onOpenEvidence(evidence)
    const match = focuses.find(
      (f) =>
        f.rallyIds.length === evidence.rallyIds.length &&
        evidence.rallyIds.every((id) => f.rallyIds.includes(id))
    )
    if (match) setFocusId(match.id)
    else if (evidence.rallyIds.length > 0) {
      // Soft-sync: prefer problems chip if it covers these ids, else keep current
      const problems = focuses.find((f) => f.id === 'problems')
      if (problems && evidence.rallyIds.every((id) => problems.rallyIds.includes(id))) {
        setFocusId('problems')
      }
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-100"
      >
        <Icon name="arrow-left" size="sm" /> All categories
      </button>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">Stats → playlist → shots</p>
        <h2 className="text-xl font-semibold text-neutral-50">{section.title}</h2>
        <p className="text-sm italic text-neutral-400">{section.question}</p>
        {section.pageStory && (
          <p className="mt-2 text-sm text-neutral-300 max-w-2xl">{section.pageStory}</p>
        )}
      </div>

      {section.headlines && section.headlines.length > 0 && (
        <HeadlineMetricsBlock
          headlines={section.headlines}
          activeEvidenceTitle={activeEvidenceTitle}
          onOpenEvidence={openEvidenceAndFocus}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {section.cards.map((card) => (
          <CompareCardBlock
            key={card.id}
            id={card.id}
            title={card.title}
            story={card.story}
            heroName="You"
            villainName={villainName}
            rows={card.rows}
            scoreline={card.scoreline}
            emptyMessage={card.emptyMessage}
            activeEvidenceTitle={activeEvidenceTitle}
            onOpenEvidence={openEvidenceAndFocus}
          />
        ))}
      </div>

      <section className="space-y-3" aria-label="Supporting playlist">
        <div>
          <h3 className="text-base font-semibold text-neutral-50">Supporting playlist</h3>
          <p className="text-xs text-neutral-400">
            Pick a focus, then watch points or open them in Clips.
          </p>
        </div>
        <PlaylistFocusChipsBlock
          focuses={focuses}
          activeId={activeFocus?.id ?? ''}
          onSelect={(f) => setFocusId(f.id)}
        />
        <SummaryCategoryPlaylistBlock
          title={playlistTitle}
          rallies={playlistRallies}
          heroName={heroName}
          multiSet={multiSet}
          activeRallyId={activeRallyId}
          onPlayAll={() => onPlayPlaylist(playlistTitle, playlistRallies)}
          onWatch={(rally, list) => onWatchRally(rally, list, playlistTitle)}
          onEdit={onEditRally}
          onToggleHighlight={onToggleHighlight}
        />
      </section>
    </div>
  )
}
