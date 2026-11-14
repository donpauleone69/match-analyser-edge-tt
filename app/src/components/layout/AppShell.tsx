import { Outlet, NavLink } from 'react-router-dom'
import { Home, Film, Cloud } from 'lucide-react'
import { cn } from '@/helpers/utils'

/**
 * Bottom nav — Find matches from Home; Training is practice (Account link / /training),
 * not a primary tab until the stub is a real product surface.
 */
const navItems = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/clips', icon: Film, label: 'Clips', end: false },
  { to: '/settings', icon: Cloud, label: 'Account', end: false },
]

export function AppShell() {
  return (
    <div className="h-full bg-bg-surface flex flex-col">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-none pb-14">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 h-12 border-t border-border bg-bg-shell flex items-stretch"
        aria-label="Main"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold',
                isActive ? 'text-brand-primary' : 'text-primary/70'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
