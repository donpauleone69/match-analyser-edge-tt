import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Swords,
  Users,
  BarChart3,
  Database,
  Settings,
} from 'lucide-react'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/matches', icon: Swords, label: 'Matches' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/data-viewer', icon: Database, label: 'Data Viewer' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-bg-shell border-r border-neutral-700">
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
    </aside>
  )
}

