import { NavLink } from 'react-router-dom'
import { WfWarnBadge } from '@/layout/Wireframe'
import { cn } from '@/helpers/utils'

export interface HubTab {
  to: string
  label: string
  end?: boolean
  /** Small amber mark after the label, for something on that tab needing a look. */
  mark?: string
}

export function HubTabs({ tabs, ariaLabel }: { tabs: HubTab[]; ariaLabel: string }) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border bg-bg-surface px-4 sm:px-6 lg:px-8 pt-2"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'btn-kind-control inline-flex shrink-0 items-center gap-1.5 px-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-muted hover:text-primary'
            )
          }
        >
          {tab.label}
          {tab.mark ? <WfWarnBadge>{tab.mark}</WfWarnBadge> : null}
        </NavLink>
      ))}
    </nav>
  )
}
