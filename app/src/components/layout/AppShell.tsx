import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Swords, Film, Cloud, Target } from 'lucide-react'
import { cn } from '@/helpers/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Library', end: true },
  { to: '/matches', icon: Swords, label: 'Matches', end: false },
  { to: '/training', icon: Target, label: 'Training', end: false },
  { to: '/clips', icon: Film, label: 'Clips', end: false },
  { to: '/settings', icon: Cloud, label: 'Account', end: false },
]

export function AppShell() {
  const location = useLocation()
  const onMatchReview = /^\/matches\/[^/]+$/.test(location.pathname)

  return (
    <div className="h-full bg-bg-surface flex flex-col">
      {/* Compact top brand strip — no hamburger drawer */}
      <div className="sticky top-0 z-40 h-11 shrink-0 bg-bg-shell border-b border-pill-idle-border flex items-center px-3">
        <span className="text-base font-bold text-brand-primary">Edge TT</span>
        {onMatchReview && (
          <span className="ml-2 text-xs text-primary truncate">Match review</span>
        )}
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-none pb-16">
        <Outlet />
      </main>

      {/* Primary phone/desktop nav — destinations, not a slide-out */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 h-14 border-t border-pill-idle-border bg-bg-shell flex items-stretch"
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
                isActive ? 'text-brand-primary' : 'text-primary'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
