import { NavLink } from 'react-router-dom'
import {
  Home,
  Swords,
  Film,
  Cloud,
  Target,
} from 'lucide-react'
import { cn } from '@/helpers/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Library' },
  { to: '/matches', icon: Swords, label: 'Matches' },
  { to: '/training', icon: Target, label: 'Training' },
  { to: '/clips', icon: Film, label: 'Clips' },
  { to: '/settings', icon: Cloud, label: 'Account & data' },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-bg-shell border-r border-neutral-700 flex flex-col">
      <div className="flex h-14 items-center px-4 border-b border-neutral-700">
        <span className="text-xl font-bold text-brand-primary">
          Edge TT
        </span>
      </div>

      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-[var(--animate-micro)]',
                isActive
                  ? 'bg-bg-card text-neutral-50 border-l-4 border-brand-primary -ml-1 pl-[calc(1rem-3px)]'
                  : 'text-neutral-400 hover:bg-bg-card hover:text-neutral-100'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <p className="mt-auto p-4 text-xs text-neutral-600">
        Training is practice, not a match.
      </p>
    </aside>
  )
}
