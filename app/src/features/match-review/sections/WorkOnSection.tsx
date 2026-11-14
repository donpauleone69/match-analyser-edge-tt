/**
 * WorkOnSection — "what to work on": shots flagged for review, grouped by
 * technical vs tactical and by wing + stroke. Every pattern opens a Clips playlist.
 */

import { useState } from 'react'
import { Button, Icon } from '@/ui-mine'
import { CompareCardBlock } from '../blocks/CompareCardBlock'
import { ReviewPatternBlock } from '../blocks/ReviewPatternBlock'
import type {
  EvidenceRef,
  ReviewItemModel,
  ReviewPatternModel,
  ReviewSideModel,
  WorkOnModel,
} from '../models'

export interface WorkOnSectionProps {
  workOn: WorkOnModel
  heroName: string
  villainName: string
  activeEvidenceTitle: string | null
  onOpenEvidence: (evidence: EvidenceRef) => void
  onWatchItem: (item: ReviewItemModel, pattern: ReviewPatternModel) => void
  onEditItem: (item: ReviewItemModel) => void
  onPlayPlaylist?: (pattern: ReviewPatternModel) => void
  onOpenHighlights?: () => void
  onOpenErrorsPlaylist?: () => void
}

function PatternGroup({
  title,
  patterns,
  onWatchItem,
  onEditItem,
  onPlayPlaylist,
}: {
  title: string
  patterns: ReviewPatternModel[]
  onWatchItem: WorkOnSectionProps['onWatchItem']
  onEditItem: WorkOnSectionProps['onEditItem']
  onPlayPlaylist?: WorkOnSectionProps['onPlayPlaylist']
}) {
  if (patterns.length === 0) return null
  const total = patterns.reduce((s, p) => s + p.count, 0)
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title} <span className="font-normal tabular-nums">({total})</span>
      </h4>
      <ul className="space-y-2">
        {patterns.map((p, i) => (
          <ReviewPatternBlock
            key={p.key}
            pattern={p}
            defaultOpen={i === 0}
            onWatch={onWatchItem}
            onEdit={onEditItem}
            onPlayPlaylist={onPlayPlaylist}
          />
        ))}
      </ul>
    </div>
  )
}

function SideCard({
  side,
  onWatchItem,
  onEditItem,
  onPlayPlaylist,
}: {
  side: ReviewSideModel
  onWatchItem: WorkOnSectionProps['onWatchItem']
  onEditItem: WorkOnSectionProps['onEditItem']
  onPlayPlaylist?: WorkOnSectionProps['onPlayPlaylist']
}) {
  return (
    <div className="space-y-2.5 rounded-md border border-border px-2.5 py-2">
      <h3 className="text-sm font-semibold text-primary">
        {side.name}{' '}
        <span className="text-muted font-normal tabular-nums">· {side.total}</span>
      </h3>
      <PatternGroup
        title="Technical"
        patterns={side.technical}
        onWatchItem={onWatchItem}
        onEditItem={onEditItem}
        onPlayPlaylist={onPlayPlaylist}
      />
      <PatternGroup
        title="Tactical"
        patterns={side.tactical}
        onWatchItem={onWatchItem}
        onEditItem={onEditItem}
        onPlayPlaylist={onPlayPlaylist}
      />
    </div>
  )
}

export function WorkOnSection({
  workOn,
  heroName,
  villainName,
  activeEvidenceTitle,
  onOpenEvidence,
  onWatchItem,
  onEditItem,
  onPlayPlaylist,
  onOpenHighlights,
  onOpenErrorsPlaylist,
}: WorkOnSectionProps) {
  const [showVillain, setShowVillain] = useState(false)
  const heroFocus = workOn.focus.filter((f) => f.side === 'hero')
  const patternByKey = new Map(
    [...workOn.hero.technical, ...workOn.hero.tactical, ...workOn.villain.technical, ...workOn.villain.tactical].map(
      (p) => [p.key, p]
    )
  )

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {workOn.total === 0 ? (
          <p className="rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted text-center">
            No flagged shots yet — flag in Pass 1.
          </p>
        ) : (
          heroFocus.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {heroFocus.map((f) => {
                const pattern = patternByKey.get(f.key)
                return (
                  <li key={f.key}>
                    {pattern && onPlayPlaylist ? (
                      <button
                        type="button"
                        onClick={() => onPlayPlaylist(pattern)}
                        className="rounded-md border border-review/60 bg-review-bg px-2 py-0.5 text-xs text-review hover:border-review"
                        title="Open this pattern as a Clips playlist"
                      >
                        {f.text}
                      </button>
                    ) : (
                      <span className="rounded-md border border-review/60 bg-review-bg px-2 py-0.5 text-xs text-review">
                        {f.text}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )
        )}
        <div className="flex flex-wrap gap-1.5">
          {workOn.heroErrors.rallyIds.length > 0 && onOpenErrorsPlaylist && (
            <Button size="sm" onClick={onOpenErrorsPlaylist}>
              <Icon name="film" size="sm" /> Errors ({workOn.heroErrors.rallyIds.length})
            </Button>
          )}
          {workOn.heroErrors.rallyIds.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => onOpenEvidence(workOn.heroErrors)}>
              <Icon name="list-video" size="sm" /> List
            </Button>
          )}
          {onOpenHighlights && (
            <Button size="sm" variant="secondary" onClick={onOpenHighlights}>
              <Icon name="star" size="sm" /> Highlights
            </Button>
          )}
        </div>
      </div>

      {workOn.hero.total > 0 && (
        <SideCard
          side={workOn.hero}
          onWatchItem={onWatchItem}
          onEditItem={onEditItem}
          onPlayPlaylist={onPlayPlaylist}
        />
      )}

      {workOn.villain.total > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowVillain((s) => !s)}
            className="text-xs text-muted hover:text-primary inline-flex items-center gap-1"
          >
            <Icon name={showVillain ? 'chevron-up' : 'chevron-down'} size="sm" />
            {villainName} ({workOn.villain.total})
          </button>
          {showVillain && (
            <SideCard
              side={workOn.villain}
              onWatchItem={onWatchItem}
              onEditItem={onEditItem}
              onPlayPlaylist={onPlayPlaylist}
            />
          )}
        </div>
      )}

      {workOn.missReasons.rows.length > 0 && (
        <CompareCardBlock
          id={workOn.missReasons.id}
          title={workOn.missReasons.title}
          story={workOn.missReasons.story}
          heroName={heroName}
          villainName={villainName}
          rows={workOn.missReasons.rows}
          emptyMessage={workOn.missReasons.emptyMessage}
          activeEvidenceTitle={activeEvidenceTitle}
          onOpenEvidence={onOpenEvidence}
        />
      )}
    </div>
  )
}
