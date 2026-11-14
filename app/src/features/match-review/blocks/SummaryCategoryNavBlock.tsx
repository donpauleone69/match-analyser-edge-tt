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
    <section className="space-y-2" aria-label="Match story categories">
      <h2 className="text-base font-semibold text-primary">Your story</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => onSelect(section.id)}
              className={cn(
                'w-full text-left rounded-lg border border-border bg-bg-card px-3 py-2.5',
                'hover:border-border-strong hover:bg-bg-elevated transition-colors group'
              )}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">{section.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">
                    {deriveCategoryTeaser(section)}
                  </p>
                </div>
                <Icon name="chevron-right" size="sm" className="mt-0.5 text-neutral-500" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
