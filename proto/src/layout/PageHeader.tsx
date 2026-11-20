import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { WfWarnBadge } from '@/layout/Wireframe'

export interface TopTab {
  to: string
  label: string
  end?: boolean
  /** Small amber mark after the label, for something on that tab needing a look. */
  mark?: string
}

/**
 * The one top row. Back only when there is somewhere to go up to, then tabs
 * or a title, then at most one end slot. One control tall, no brand.
 * A tab switch replaces the history entry.
 */
export function PageHeader({
  title,
  backTo,
  tabs,
  tabsLabel = 'Sections',
  end,
}: {
  title?: string
  backTo?: string
  tabs?: TopTab[]
  tabsLabel?: string
  end?: ReactNode
}) {
  return (
    <header
      data-top-row
      className="top-row flex h-[var(--btn-kind-control)] min-w-0 items-stretch border-b border-border bg-bg-app"
    >
      {backTo ? (
        <Link
          to={backTo}
          aria-label="Back"
          className="btn-kind-control btn-kind-square inline-flex shrink-0 items-center justify-center text-brand hover:bg-pill-idle"
        >
          <Icon name="chevron-left" size="sm" />
        </Link>
      ) : null}
      {tabs ? (
        <nav className="top-row-tabs flex min-w-0 items-stretch overflow-x-auto" aria-label={tabsLabel}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              replace
              data-top-tab={tab.label}
              className={({ isActive }) =>
                cn(
                  'btn-kind-control inline-flex shrink-0 items-center gap-1.5 px-3 text-sm font-semibold',
                  isActive
                    ? 'text-brand-primary shadow-[inset_0_-2px_0_0_var(--color-brand-primary)]'
                    : 'text-muted hover:text-primary'
                )
              }
            >
              {tab.label}
              {tab.mark ? <WfWarnBadge>{tab.mark}</WfWarnBadge> : null}
            </NavLink>
          ))}
        </nav>
      ) : (
        <h1 className="flex min-w-0 flex-1 items-center truncate px-3 text-base font-bold text-primary">{title}</h1>
      )}
      {end}
    </header>
  )
}
