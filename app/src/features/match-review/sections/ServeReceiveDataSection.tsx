/**
 * ServeReceiveDataSection — curated Serve / Receive Data (MA-82 → MA-143).
 *
 * Flow: headlines → glance + detail cards → PlaylistBrowseShell focus → points →
 * watch (RallyPlayer + MatchVideoOverlayBar) or Clips playlist.
 * MA-122: evidence sync. MA-133: empties. MA-143: featured glance card.
 */

import { useEffect, useMemo, useState } from 'react'
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
  HeadlineMetricModel,
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
  evidenceRallyIds?: string[] | null
  activeRallyId?: string | null
  /** URL `?focus=` deep-link into a playlist focus id */
  focusIdFromUrl?: string | null
  onFocusChange?: (focusId: string | null) => void
  onClearEvidence?: () => void
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
  none: 'bg-border-strong',
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

/** Prefer exact rally-set match, else smallest focus that covers all evidence ids. */
function matchFocusForEvidence(
  focuses: PlaylistFocusModel[],
  evidence: EvidenceRef,
  preferredId?: string | null
): PlaylistFocusModel | null {
  if (preferredId) {
    const preferred = focuses.find((f) => f.id === preferredId && f.count > 0)
    if (preferred) return preferred
  }
  const exact = focuses.find(
    (f) =>
      f.rallyIds.length === evidence.rallyIds.length &&
      evidence.rallyIds.every((id) => f.rallyIds.includes(id))
  )
  if (exact) return exact
  const covers = focuses
    .filter(
      (f) =>
        f.id !== 'all' &&
        f.count > 0 &&
        evidence.rallyIds.every((id) => f.rallyIds.includes(id))
    )
    .sort((a, b) => a.count - b.count)
  return covers[0] ?? null
}

export function ServeReceiveDataSection({
  section,
  villainName,
  heroName,
  rallies,
  multiSet,
  activeEvidenceTitle,
  evidenceRallyIds = null,
  activeRallyId = null,
  focusIdFromUrl = null,
  onFocusChange,
  onClearEvidence,
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

  // Evidence closed externally → drop synthetic from-evidence focus
  useEffect(() => {
    if (activeEvidenceTitle) return
    if (focusId === EVIDENCE_FOCUS_ID) {
      const fallback = baseFocuses[0]?.id ?? null
      setFocusId(fallback)
      onFocusChange?.(fallback)
    }
    setEvidenceFocus(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvidenceTitle])

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
      if (activeEvidenceTitle) onClearEvidence?.()
    } else {
      onFocusChange?.(null)
    }
  }

  const openEvidenceAndFocus = (evidence: EvidenceRef, headline?: HeadlineMetricModel) => {
    onOpenEvidence(evidence)
    const match = matchFocusForEvidence(baseFocuses, evidence, headline?.focusId)
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
    // Sticky PlaylistBrowseShell owns focus chrome — no scrollIntoView (MA-127).
    setFocusOpen(false)
  }

  const trail: PlaylistBrowseTrailLink[] = [
    { id: 'summary', label: 'Summary', shortLabel: 'Summary', onClick: onBack, primary: true },
  ]
  if (playlistRallies.length > 0) {
    trail.push({
      id: 'clips',
      label: 'Clips',
      shortLabel: 'Clips',
      onClick: () => onPlayPlaylist(playlistTitle, playlistRallies),
    })
  }

  const evidenceOpen = Boolean(activeEvidenceTitle)
  const focusEmpty = playlistRallies.length === 0
  const shellContext = evidenceOpen
    ? `Evidence · ${shortEvidenceLabel(activeEvidenceTitle!)} · playlist synced`
    : focusEmpty
      ? `${section.title} · pick another focus`
      : `${section.title} · watch or open Clips`

  const emptyLabel = activeFocus
    ? `No points in “${activeFocus.label}”`
    : 'No points in this focus yet.'
  const emptyHint = evidenceOpen
    ? 'Close evidence or pick a focus that covers those points.'
    : 'Switch Focus above, or tag more points in this set.'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">{section.title}</h2>
        <p className="text-sm text-muted">{section.question}</p>
        {section.pageStory && (
          <p className="mt-1 text-sm text-muted max-w-2xl line-clamp-2">{section.pageStory}</p>
        )}
      </div>

      {section.headlines && section.headlines.length > 0 && (
        <HeadlineMetricsBlock
          headlines={section.headlines}
          activeEvidenceTitle={activeEvidenceTitle}
          onOpenEvidence={openEvidenceAndFocus}
        />
      )}

      <div className="grid gap-2.5 lg:grid-cols-2 lg:gap-3">
        {section.cards.map((card) => {
          const glance = card.emphasis === 'glance' || card.id === 'B0' || card.id === 'C0'
          return (
            <div key={card.id} className={cn(glance && 'lg:col-span-2')}>
              <CompareCardBlock
                id={card.id}
                title={card.title}
                story={glance ? '' : card.story}
                heroName="You"
                villainName={villainName}
                rows={card.rows}
                scoreline={card.scoreline}
                emptyMessage={card.emptyMessage}
                emphasis={glance ? 'glance' : 'detail'}
                activeEvidenceTitle={activeEvidenceTitle}
                onOpenEvidence={openEvidenceAndFocus}
              />
            </div>
          )
        })}
      </div>

      <section className="space-y-2.5" aria-label="Supporting playlist">
        <PlaylistBrowseShellBlock
          stickyMode="under-tabs"
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
          contextLabel={shellContext}
          trail={trail}
          panelClassName="py-1 max-h-[min(42dvh,22rem)] overflow-y-auto overscroll-contain"
        >
          {focuses.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted">No focuses yet — tag serve/receive points.</p>
          ) : (
            <PlaylistFocusPickerBlock
              chrome="options"
              focuses={focuses}
              activeId={activeFocus?.id ?? ''}
              onSelect={(f) => {
                selectFocus(f)
                setFocusOpen(false)
              }}
            />
          )}
        </PlaylistBrowseShellBlock>
        <SummaryCategoryPlaylistBlock
          title={playlistTitle}
          rallies={playlistRallies}
          heroName={heroName}
          multiSet={multiSet}
          activeRallyId={activeRallyId}
          evidenceRallyIds={evidenceOpen ? evidenceRallyIds : null}
          hidePlayAll
          emptyLabel={emptyLabel}
          emptyHint={emptyHint}
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
