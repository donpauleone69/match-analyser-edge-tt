/**
 * ServeReceiveDataSection — curated Serve / Receive Data (MA-82 → MA-106).
 *
 * Flow: headlines → ≤2 cards → PlaylistBrowseShell focus → points →
 * watch (RallyPlayer + MatchVideoOverlayBar) or Clips playlist.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/helpers/utils'
import {
  PlaylistBrowseShellBlock,
  type PlaylistBrowseTrailLink,
} from '@/features/clips'
import { PlaylistFocusPickerBlock } from '../blocks/PlaylistFocusPickerBlock'
import { CompareCardBlock } from '../blocks/CompareCardBlock'
import { HeadlineMetricsBlock } from '../blocks/HeadlineMetricsBlock'
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
  /** URL `?focus=` deep-link into a playlist focus id */
  focusIdFromUrl?: string | null
  onFocusChange?: (focusId: string | null) => void
  onBack: () => void
  onOpenEvidence: (evidence: EvidenceRef) => void
  onPlayPlaylist: (title: string, rallies: RallyRowModel[]) => void
  onWatchRally: (rally: RallyRowModel, playlist: RallyRowModel[], title: string) => void
  onEditRally: (rally: RallyRowModel) => void
  onToggleHighlight: (rally: RallyRowModel) => void
}

const EVIDENCE_FOCUS_ID = 'from-evidence'

const TONE_DOT: Record<PlaylistFocusModel['tone'], string> = {
  good: 'bg-result-winner',
  bad: 'bg-result-error',
  amber: 'bg-warning',
  none: 'bg-neutral-500',
}

function resolveFocus(
  focuses: PlaylistFocusModel[],
  activeId: string | null
): PlaylistFocusModel | null {
  if (focuses.length === 0) return null
  return focuses.find((f) => f.id === activeId) ?? focuses[0] ?? null
}

function shortEvidenceLabel(title: string): string {
  const parts = title.split('·').map((s) => s.trim())
  return parts[parts.length - 1] || title
}

export function ServeReceiveDataSection({
  section,
  villainName,
  heroName,
  rallies,
  multiSet,
  activeEvidenceTitle,
  activeRallyId = null,
  focusIdFromUrl = null,
  onFocusChange,
  onBack,
  onOpenEvidence,
  onPlayPlaylist,
  onWatchRally,
  onEditRally,
  onToggleHighlight,
}: ServeReceiveDataSectionProps) {
  const baseFocuses = section.playlistFocuses ?? []
  const initialFocus =
    (focusIdFromUrl && baseFocuses.some((f) => f.id === focusIdFromUrl) && focusIdFromUrl) ||
    baseFocuses[0]?.id ||
    null
  const [focusId, setFocusId] = useState<string | null>(initialFocus)
  const [evidenceFocus, setEvidenceFocus] = useState<PlaylistFocusModel | null>(null)
  const [focusOpen, setFocusOpen] = useState(false)
  const playlistRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const next =
      (focusIdFromUrl && baseFocuses.some((f) => f.id === focusIdFromUrl) && focusIdFromUrl) ||
      section.playlistFocuses?.[0]?.id ||
      null
    setFocusId(next)
    setEvidenceFocus(null)
    setFocusOpen(false)
    // Reset when switching Serve ↔ Receive or URL focus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id, focusIdFromUrl])

  const focuses = useMemo(() => {
    if (!evidenceFocus) return baseFocuses
    return [evidenceFocus, ...baseFocuses.filter((f) => f.id !== EVIDENCE_FOCUS_ID)]
  }, [baseFocuses, evidenceFocus])

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
    : `${section.title} · points`

  const selectFocus = (f: PlaylistFocusModel) => {
    setFocusId(f.id)
    if (f.id !== EVIDENCE_FOCUS_ID) {
      setEvidenceFocus(null)
      onFocusChange?.(f.id)
    } else {
      onFocusChange?.(null)
    }
  }

  const openEvidenceAndFocus = (evidence: EvidenceRef) => {
    onOpenEvidence(evidence)
    const match = baseFocuses.find(
      (f) =>
        f.rallyIds.length === evidence.rallyIds.length &&
        evidence.rallyIds.every((id) => f.rallyIds.includes(id))
    )
    if (match) {
      setEvidenceFocus(null)
      setFocusId(match.id)
      onFocusChange?.(match.id)
    } else {
      const next: PlaylistFocusModel = {
        id: EVIDENCE_FOCUS_ID,
        label: shortEvidenceLabel(evidence.title),
        count: evidence.rallyIds.length,
        tone: 'amber',
        rallyIds: [...evidence.rallyIds],
      }
      setEvidenceFocus(next)
      setFocusId(EVIDENCE_FOCUS_ID)
      onFocusChange?.(null)
    }
    setFocusOpen(false)
    requestAnimationFrame(() => {
      playlistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const trail: PlaylistBrowseTrailLink[] = [
    { id: 'summary', label: 'Summary', onClick: onBack, primary: true },
  ]
  if (playlistRallies.length > 0) {
    trail.push({
      id: 'clips',
      label: 'Clips',
      onClick: () => onPlayPlaylist(playlistTitle, playlistRallies),
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-50">{section.title}</h2>
        <p className="text-sm text-neutral-500">{section.question}</p>
        {section.pageStory && (
          <p className="mt-1 text-sm text-neutral-500 max-w-2xl line-clamp-2">{section.pageStory}</p>
        )}
      </div>

      {section.headlines && section.headlines.length > 0 && (
        <HeadlineMetricsBlock
          headlines={section.headlines}
          activeEvidenceTitle={activeEvidenceTitle}
          onOpenEvidence={openEvidenceAndFocus}
        />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {section.cards.map((card) => (
          <CompareCardBlock
            key={card.id}
            id={card.id}
            title={card.title}
            story={card.id === 'B0' || card.id === 'C0' ? '' : card.story}
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

      <section ref={playlistRef} className="space-y-2.5" aria-label="Supporting playlist">
        <PlaylistBrowseShellBlock
          className="top-14"
          open={focusOpen}
          onOpenChange={setFocusOpen}
          label="Focus"
          aria-label="Playlist focus"
          activeLabel={
            activeFocus ? (
              <span className="inline-flex items-center gap-2 min-w-0">
                <span
                  className={cn('h-1.5 w-1.5 rounded-full shrink-0', TONE_DOT[activeFocus.tone])}
                />
                <span className="truncate">{activeFocus.label}</span>
              </span>
            ) : (
              'Pick a focus'
            )
          }
          meta={activeFocus?.count}
          contextLabel={`${section.title} · watch or open Clips`}
          trail={trail}
          panelClassName="py-1 max-h-[min(42dvh,22rem)] overflow-y-auto overscroll-contain"
        >
          <PlaylistFocusPickerBlock
            chrome="options"
            focuses={focuses}
            activeId={activeFocus?.id ?? ''}
            onSelect={(f) => {
              selectFocus(f)
              setFocusOpen(false)
            }}
          />
        </PlaylistBrowseShellBlock>
        <SummaryCategoryPlaylistBlock
          title={playlistTitle}
          rallies={playlistRallies}
          heroName={heroName}
          multiSet={multiSet}
          activeRallyId={activeRallyId}
          hidePlayAll
          emptyLabel="No points in this focus yet."
          listHeading={activeFocus?.label ?? 'Points'}
          onPlayAll={() => onPlayPlaylist(playlistTitle, playlistRallies)}
          onWatch={(rally, list) => onWatchRally(rally, list, playlistTitle)}
          onEdit={onEditRally}
          onToggleHighlight={onToggleHighlight}
        />
      </section>
    </div>
  )
}
