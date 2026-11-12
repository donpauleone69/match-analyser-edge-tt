import { NavLink } from 'react-router-dom'
import {
  Home,
  Building2,
  Trophy,
  Users,
  Swords,
  Film,
  BarChart3,
  Database,
  Cloud,
} from 'lucide-react'
import { cn } from '@/helpers/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/matches', icon: Swords, label: 'Matches' },
  { to: '/clips', icon: Film, label: 'Clips' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/tournaments', icon: Trophy, label: 'Tournaments' },
  { to: '/clubs', icon: Building2, label: 'Clubs' },
  { to: '/settings', icon: Cloud, label: 'Account & data' },
]

const toolItems = [
  { to: '/analytics', icon: BarChart3, label: 'Analytics (beta)' },
  { to: '/data-viewer', icon: Database, label: 'Data viewer' },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-bg-shell border-r border-neutral-700 flex flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-neutral-700">
        <span className="text-xl font-bold text-brand-primary">
          TT Tagger
        </span>
      </div>

      {/* Navigation */}
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

      {/* Developer tools */}
      <div className="mt-auto p-4 border-t border-neutral-800 space-y-1">
        <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Tools</p>
        {toolItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors',
                isActive ? 'bg-bg-card text-neutral-100' : 'text-neutral-500 hover:bg-bg-card hover:text-neutral-200'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
