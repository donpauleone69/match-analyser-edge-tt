import { Outlet, NavLink } from 'react-router-dom'
import { Home, Film, Cloud, Target } from 'lucide-react'
import { cn } from '@/helpers/utils'

/** Bottom nav — Find matches lives on Home (not a fifth tab). /matches route stays. */
const navItems = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/training', icon: Target, label: 'Training', end: false },
  { to: '/clips', icon: Film, label: 'Clips', end: false },
  { to: '/settings', icon: Cloud, label: 'Account', end: false },
]

export function AppShell() {
  return (
    <div className="h-full bg-bg-surface flex flex-col">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-none pb-16">
        <Outlet />
      </main>

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
