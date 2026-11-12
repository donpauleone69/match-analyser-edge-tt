/**
 * SummaryCategoryNavBlock — navigable story categories (not a wall of cards).
 * First-person labels; each opens stats + a playlist of your points.
 */

import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { CompareSectionModel } from '../models'
import { deriveCategoryTeaser } from '../derive/buildSummaryCategories'

export interface SummaryCategoryNavBlockProps {
  sections: CompareSectionModel[]
  onSelect: (sectionId: string) => void
}

export function SummaryCategoryNavBlock({ sections, onSelect }: SummaryCategoryNavBlockProps) {
  if (sections.length === 0) return null
  return (
    <section className="space-y-3" aria-label="Match story categories">
      <div>
        <h2 className="text-xl font-semibold text-primary">Your story</h2>
        <p className="text-sm text-primary">
          Pick an area — see your numbers, then the points behind them.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => onSelect(section.id)}
              className={cn(
                'w-full text-left rounded-xl border border-pill-idle-border bg-bg-card px-4 py-3',
                'hover:border-neutral-600 hover:bg-bg-elevated transition-colors group'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">{section.title}</p>
                  <p className="mt-1 text-xs text-primary line-clamp-2">
                    {deriveCategoryTeaser(section)}
                  </p>
                </div>
                <Icon name="chevron-right" size="sm" className="mt-0.5 text-primary" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
