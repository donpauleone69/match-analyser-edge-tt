/**
 * ServeReceiveDataSection — curated Serve / Receive Data (MA-82 / MA-94 / MA-98).
 *
 * Flow: headlines → ≤2 cards → focus picker → points →
 * watch (RallyPlayer + MatchVideoOverlayBar) or Clips playlist.
 * Focus picker uses MA-100 BrowseDisclosure via PlaylistFocusPickerBlock.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Icon } from '@/ui-mine'
import { CompareCardBlock } from '../blocks/CompareCardBlock'
import { HeadlineMetricsBlock } from '../blocks/HeadlineMetricsBlock'
import { PlaylistFocusPickerBlock } from '../blocks/PlaylistFocusPickerBlock'
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
  const playlistRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const next =
      (focusIdFromUrl && baseFocuses.some((f) => f.id === focusIdFromUrl) && focusIdFromUrl) ||
      section.playlistFocuses?.[0]?.id ||
      null
    setFocusId(next)
    setEvidenceFocus(null)
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
    requestAnimationFrame(() => {
      playlistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-100"
      >
        <Icon name="arrow-left" size="sm" /> All categories
      </button>

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
        <div className="sticky top-14 z-10 -mx-1 px-1 py-2 bg-bg-surface/95 backdrop-blur border-b border-border flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          <div className="hidden md:block min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-primary">Playlist</h3>
            <p className="text-xs text-muted truncate">
              {activeFocus ? activeFocus.label : 'Pick a focus'} · watch or Clips
            </p>
          </div>
          <div className="w-full md:hidden">
            <PlaylistFocusPickerBlock
              fullWidth
              focuses={focuses}
              activeId={activeFocus?.id ?? ''}
              onSelect={selectFocus}
            />
          </div>
          <div className="hidden md:block">
            <PlaylistFocusPickerBlock
              focuses={focuses}
              activeId={activeFocus?.id ?? ''}
              onSelect={selectFocus}
            />
          </div>
          {playlistRallies.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              className="self-start md:self-auto"
              onClick={() => onPlayPlaylist(playlistTitle, playlistRallies)}
            >
              <Icon name="film" size="sm" /> Clips
            </Button>
          )}
        </div>
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
