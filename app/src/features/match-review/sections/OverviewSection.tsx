/**
 * OverviewSection — takeaways, then the comparison sections (A, D, F) and
 * the sections still to come.
 */

import { CompareCardBlock } from '../blocks/CompareCardBlock'
import { LockedSectionBlock } from '../blocks/LockedSectionBlock'
import { TakeawaysBlock } from '../blocks/TakeawaysBlock'
import type { EvidenceRef, MatchReviewViewModel } from '../models'

export interface OverviewSectionProps {
  review: MatchReviewViewModel
  activeEvidenceTitle: string | null
  onOpenEvidence: (evidence: EvidenceRef) => void
}

export function OverviewSection({ review, activeEvidenceTitle, onOpenEvidence }: OverviewSectionProps) {
  return (
    <div className="space-y-8">
      <TakeawaysBlock takeaways={review.takeaways} onOpenEvidence={onOpenEvidence} />

      {review.hasPointData && (
        <p className="text-xs text-neutral-500 -mt-4">
          Tap any underlined number to see the rallies behind it. Green = better side, red = worse.
        </p>
      )}

      {review.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-neutral-50">
              <span className="text-neutral-500 mr-2">{section.id}</span>
              {section.title}
            </h2>
            <p className="text-sm italic text-neutral-400">{section.question}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {section.cards.map((card) => (
              <CompareCardBlock
                key={card.id}
                id={card.id}
                title={card.title}
                story={card.story}
                heroName={review.heroName}
                villainName={review.villainName}
                rows={card.rows}
                scoreline={card.scoreline}
                emptyMessage={card.emptyMessage}
                activeEvidenceTitle={activeEvidenceTitle}
                onOpenEvidence={onOpenEvidence}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-50">Coming next</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {review.locked.map((s) => (
            <LockedSectionBlock key={s.id} id={s.id} title={s.title} question={s.question} note={s.note} />
          ))}
        </div>
      </section>
    </div>
  )
}
