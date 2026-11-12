/**
 * MatchStorySection — Section A: why did the match end with this score?
 * Cards A1 (The score) and A2 (How points ended).
 */

import { StatCompareCardBlock } from '../blocks/StatCompareCardBlock'
import type { MatchStoryViewModel } from '../models'

export interface MatchStorySectionProps {
  story: MatchStoryViewModel
}

export function MatchStorySection({ story }: MatchStorySectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">
          <span className="text-neutral-500 mr-2">A</span>Match story
        </h2>
        <p className="text-sm italic text-neutral-400">Why did the match end with this score?</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {story.cards.map((card) => (
          <StatCompareCardBlock
            key={card.id}
            title={card.title}
            story={card.story}
            heroName={story.heroName}
            villainName={story.villainName}
            rows={card.rows}
          />
        ))}
      </div>
    </section>
  )
}
