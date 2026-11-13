/**
 * TabBarBlock — sticky in-page tabs for Match Review.
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
}

export function TabBarBlock<T extends string>({ tabs, active, onChange }: TabBarBlockProps<T>) {
  return (
    <nav
      className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 bg-bg-surface/95 backdrop-blur border-b border-neutral-800"
      aria-label="Match review sections"
    >
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
                'relative h-11 px-3 md:px-4 text-sm font-medium whitespace-nowrap transition-colors',
                tab.id === active
                  ? 'text-neutral-50 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-brand-primary after:rounded-full'
                  : 'text-neutral-400 hover:text-neutral-100'
              )}
            >
              {tab.label}
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={cn(
                    'ml-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    tab.id === 'rallies'
                      ? 'bg-amber-600 text-neutral-950'
                      : 'bg-neutral-700 text-neutral-200'
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
