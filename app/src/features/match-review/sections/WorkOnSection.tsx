/**
 * WorkOnSection — "what to work on": shots flagged for review, grouped by
 * technical vs tactical and by wing + stroke, plus why points were missed.
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
}

function PatternGroup({
  title,
  hint,
  patterns,
  onWatchItem,
  onEditItem,
}: {
  title: string
  hint: string
  patterns: ReviewPatternModel[]
  onWatchItem: WorkOnSectionProps['onWatchItem']
  onEditItem: WorkOnSectionProps['onEditItem']
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
            defaultOpen={i === 0 && p.count > 1}
            onWatch={onWatchItem}
            onEdit={onEditItem}
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
}: {
  side: ReviewSideModel
  onWatchItem: WorkOnSectionProps['onWatchItem']
  onEditItem: WorkOnSectionProps['onEditItem']
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
      />
      <PatternGroup
        title="Tactical"
        hint="the choice of shot"
        patterns={side.tactical}
        onWatchItem={onWatchItem}
        onEditItem={onEditItem}
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
}: WorkOnSectionProps) {
  const [showVillain, setShowVillain] = useState(false)
  const heroFocus = workOn.focus.filter((f) => f.side === 'hero')

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-5 border border-neutral-700">
        <h2 className="text-lg font-semibold text-neutral-50">What to work on</h2>
        {workOn.total === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">
            No shots flagged yet. While tagging (or editing a rally), tap <span className="text-neutral-200">Technical</span> or{' '}
            <span className="text-neutral-200">Tactical</span> under Review on any shot you want to look at again. Repeated
            patterns show up here.
          </p>
        ) : heroFocus.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {heroFocus.map((f) => (
              <li key={f.key} className="rounded-full border border-amber-700/60 bg-amber-950/30 px-3 py-1 text-sm text-amber-100">
                {f.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-400">
            {workOn.hero.total} of your shots flagged, no repeated pattern yet — see the list below.
          </p>
        )}
        {workOn.heroErrors.rallyIds.length > 0 && (
          <div className="mt-4">
            <Button size="sm" variant="secondary" onClick={() => onOpenEvidence(workOn.heroErrors)}>
              <Icon name="alert" size="sm" /> See all {workOn.heroErrors.rallyIds.length} of your errors
            </Button>
          </div>
        )}
      </Card>

      {workOn.hero.total > 0 && (
        <SideCard side={workOn.hero} onWatchItem={onWatchItem} onEditItem={onEditItem} />
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
          {showVillain && <SideCard side={workOn.villain} onWatchItem={onWatchItem} onEditItem={onEditItem} />}
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
