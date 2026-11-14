import { NavLink } from 'react-router-dom'
import { cn } from '@/helpers/utils'

export interface HubTab {
  to: string
  label: string
  end?: boolean
}

export function HubTabs({ tabs, ariaLabel }: { tabs: HubTab[]; ariaLabel: string }) {
  return (
    <nav
      className="flex gap-1 border-b border-border bg-bg-surface px-3 pt-2 sticky top-0 z-10"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-muted hover:text-primary'
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
