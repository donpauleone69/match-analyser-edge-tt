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
  { to: '/', icon: Home, label: 'Home' },
  { to: '/matches', icon: Swords, label: 'Matches' },
  { to: '/training', icon: Target, label: 'Training' },
  { to: '/clips', icon: Film, label: 'Clips' },
  { to: '/settings', icon: Cloud, label: 'Account' },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 bg-bg-shell border-r border-border flex flex-col">
      <div className="flex h-12 items-center px-3 border-b border-border">
        <span className="text-lg font-bold text-brand-primary">Edge TT</span>
      </div>

      <nav className="p-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-bg-card text-neutral-50 border-l-2 border-brand-primary'
                  : 'text-neutral-500 hover:bg-bg-card hover:text-neutral-100'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
