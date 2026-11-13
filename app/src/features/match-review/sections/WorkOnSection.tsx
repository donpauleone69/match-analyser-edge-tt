/**
 * WorkOnSection — "what to work on": shots flagged for review, grouped by
 * technical vs tactical and by wing + stroke. Every pattern opens a Clips playlist.
 */

import { useState } from 'react'
import { Button, Card, Icon } from '@/ui-mine'
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
  hint,
  patterns,
  onWatchItem,
  onEditItem,
  onPlayPlaylist,
}: {
  title: string
  hint: string
  patterns: ReviewPatternModel[]
  onWatchItem: WorkOnSectionProps['onWatchItem']
  onEditItem: WorkOnSectionProps['onEditItem']
  onPlayPlaylist?: WorkOnSectionProps['onPlayPlaylist']
}) {
  if (patterns.length === 0) return null
  const total = patterns.reduce((s, p) => s + p.count, 0)
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h4 className="text-sm font-semibold text-neutral-200">
          {title} <span className="text-neutral-500 font-normal">({total})</span>
        </h4>
        <span className="text-xs text-neutral-500">{hint}</span>
      </div>
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
    <Card className="p-4 md:p-5 border border-neutral-700 space-y-4">
      <h3 className="text-lg font-semibold text-neutral-50">
        {side.name} <span className="text-neutral-500 text-sm font-normal">· {side.total} flagged</span>
      </h3>
      <PatternGroup
        title="Technical"
        hint="how the shot was played"
        patterns={side.technical}
        onWatchItem={onWatchItem}
        onEditItem={onEditItem}
        onPlayPlaylist={onPlayPlaylist}
      />
      <PatternGroup
        title="Tactical"
        hint="the choice of shot"
        patterns={side.tactical}
        onWatchItem={onWatchItem}
        onEditItem={onEditItem}
        onPlayPlaylist={onPlayPlaylist}
      />
    </Card>
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
    <div className="space-y-6">
      <Card className="p-4 md:p-5 border border-neutral-700">
        <h2 className="text-lg font-semibold text-neutral-50">What to work on</h2>
        {workOn.total === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">
            No shots flagged yet. In Pass 1, select a shot →{' '}
            <span className="text-neutral-200">Flag for review</span>, then open{' '}
            <span className="text-neutral-200">Clips</span> here to play, Download, or Save as reel.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-400">
              Open <span className="text-neutral-200">Clips</span> on a row to play the playlist — then
              Download one clip or Save as reel.
            </p>
            {heroFocus.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {heroFocus.map((f) => {
                  const pattern = patternByKey.get(f.key)
                  return (
                    <li key={f.key}>
                      {pattern && onPlayPlaylist ? (
                        <button
                          type="button"
                          onClick={() => onPlayPlaylist(pattern)}
                          className="rounded-full border border-review/60 bg-review-bg px-3 py-1 text-sm text-review hover:border-review"
                          title="Open this pattern as a Clips playlist"
                        >
                          {f.text} · Clips
                        </button>
                      ) : (
                        <span className="rounded-full border border-review/60 bg-review-bg px-3 py-1 text-sm text-review">
                          {f.text}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-neutral-400">
                {workOn.hero.total} flagged
                {workOn.hero.total === 1 ? ' shot' : ' shots'} — tap{' '}
                <span className="text-neutral-200">Clips</span> on a row below.
              </p>
            )}
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {workOn.heroErrors.rallyIds.length > 0 && onOpenErrorsPlaylist && (
            <Button size="sm" onClick={onOpenErrorsPlaylist}>
              <Icon name="film" size="sm" /> Errors playlist ({workOn.heroErrors.rallyIds.length})
            </Button>
          )}
          {workOn.heroErrors.rallyIds.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => onOpenEvidence(workOn.heroErrors)}>
              <Icon name="list-video" size="sm" /> List errors
            </Button>
          )}
          {onOpenHighlights && (
            <Button size="sm" variant="secondary" onClick={onOpenHighlights}>
              <Icon name="star" size="sm" /> Highlights show-reel
            </Button>
          )}
        </div>
      </Card>

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
            className="text-sm text-neutral-400 hover:text-neutral-100 inline-flex items-center gap-1"
          >
            <Icon name={showVillain ? 'chevron-up' : 'chevron-down'} size="sm" />
            {villainName}’s flagged shots ({workOn.villain.total}) — scouting
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
    </div>
  )
}
