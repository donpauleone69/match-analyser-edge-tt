/**
 * TabBarBlock — in-page tabs for Match Review.
 *
 * Sticky ownership lives on the Match Review header (`data-match-review-chrome`).
 * Nested sticky here double-painted borders and fought PlaylistBrowseShell offsets (MA-127).
 */

import { cn } from '@/helpers/utils'

export interface TabItem<T extends string> {
  id: T
  label: string
  badge?: number
}

export interface TabBarBlockProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
  /** Clicking the count badge (e.g. Incomplete) — does not replace tab label click. */
  onBadgeClick?: (id: T) => void
}

export function TabBarBlock<T extends string>({
  tabs,
  active,
  onChange,
  onBadgeClick,
}: TabBarBlockProps<T>) {
  return (
    <nav className="-mx-1" aria-label="Match review sections">
      <ul className="flex gap-1 overflow-x-auto" role="tablist">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <button
              type="button"
              role="tab"
              aria-selected={tab.id === active}
              aria-label={
                tab.id === 'rallies' && typeof tab.badge === 'number' && tab.badge > 0
                  ? `${tab.label}, ${tab.badge} incomplete`
                  : undefined
              }
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative h-9 px-2 md:px-3 text-sm font-medium whitespace-nowrap transition-colors',
                tab.id === active
                  ? 'text-neutral-50 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-brand-primary after:rounded-full'
                  : 'text-neutral-500 hover:text-neutral-100'
              )}
            >
              {tab.label}
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  role={onBadgeClick ? 'link' : undefined}
                  title={
                    tab.id === 'rallies' && onBadgeClick
                      ? 'Open Incomplete filter'
                      : undefined
                  }
                  onClick={
                    onBadgeClick
                      ? (e) => {
                          e.stopPropagation()
                          onBadgeClick(tab.id)
                        }
                      : undefined
                  }
                  className={cn(
                    'ml-1 inline-flex min-w-[1rem] items-center justify-center rounded-md border px-1 py-px text-[10px] font-bold tabular-nums',
                    tab.id === 'rallies'
                      ? 'border-callout-warning-border bg-callout-warning-bg text-callout-warning'
                      : 'border-border bg-bg-elevated text-primary',
                    onBadgeClick && 'cursor-pointer hover:opacity-90'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
