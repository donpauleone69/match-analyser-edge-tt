import { Outlet, NavLink } from 'react-router-dom'
import { Icon, type IconName } from '@/ui-mine'
import { cn } from '@/helpers/utils'

const navItems: { to: string; icon: IconName; label: string; end?: boolean }[] = [
  { to: '/home', icon: 'home', label: 'Home', end: true },
  { to: '/insights', icon: 'chart', label: 'Insights' },
  { to: '/account', icon: 'user', label: 'Account' },
]

/** Shell content cap — phone density on desktop; full width on narrow. */
const CONTENT_MAX = 'mx-auto w-full max-w-lg'

export function AppShell() {
  return (
    <div className="h-full bg-bg-app flex flex-col">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-none pb-14">
        <div className={cn(CONTENT_MAX, 'min-h-full')}>
          <Outlet />
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 h-12 border-t border-border bg-bg-shell flex items-stretch"
        aria-label="Main"
      >
        <div className={cn(CONTENT_MAX, 'flex h-full items-stretch')}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold',
                  isActive ? 'text-brand-primary' : 'text-muted'
                )
              }
            >
              <Icon name={item.icon} size="sm" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
