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
        <h2 className="text-xl font-semibold text-neutral-50">Your story</h2>
        <p className="text-sm text-neutral-400">
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
                'w-full text-left rounded-xl border border-neutral-700 bg-bg-card px-4 py-3',
                'hover:border-neutral-500 hover:bg-neutral-900/80 transition-colors group'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-50 group-hover:text-white">
                    {section.title}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                    {deriveCategoryTeaser(section)}
                  </p>
                </div>
                <Icon name="chevron-right" size="sm" className="mt-0.5 text-neutral-500 group-hover:text-neutral-300" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
