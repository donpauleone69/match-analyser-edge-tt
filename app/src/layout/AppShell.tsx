import { Outlet, Link, useLocation, useMatch } from 'react-router-dom'
import { Icon, type IconName } from '@/ui-mine'
import { cn } from '@/helpers/utils'

const navItems: { to: string; icon: IconName; label: string }[] = [
  { to: '/matches', icon: 'list', label: 'Matches' },
  { to: '/insights', icon: 'chart', label: 'Insights' },
  { to: '/account', icon: 'user', label: 'Account' },
]

function useNavActive(to: string) {
  const { pathname } = useLocation()
  // The list only. Inside a match the nav is not shown.
  if (to === '/matches') return pathname === '/matches'
  return pathname === to || pathname.startsWith(`${to}/`)
}

function ShellNavLink({
  to,
  icon,
  label,
  layout,
}: {
  to: string
  icon: IconName
  label: string
  layout: 'bar' | 'rail'
}) {
  const active = useNavActive(to)
  return (
    <Link
      to={to}
      className={cn(
        'btn-kind-control font-semibold',
        layout === 'bar'
          ? 'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px]'
          : 'flex w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] leading-none',
        active ? 'text-brand-primary' : 'text-muted hover:text-primary'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={icon} size="sm" />
      {label}
    </Link>
  )
}

export function AppShell() {
  /** Any match page, including one that was not found. The list at /matches is not one. */
  const inMatch = Boolean(useMatch({ path: '/matches/:matchId', end: false }))
  /** The set screen sizes its zones from the container. A scrolling main would break that. */
  const tagging = Boolean(useMatch('/matches/:matchId/tag/:setId'))
  return (
    <div className={cn('shell', !inMatch && 'shell-with-nav')}>
      {inMatch ? null : (
        <nav className="shell-rail" aria-label="Main">
          {navItems.map((item) => (
            <ShellNavLink key={`r-${item.to}`} {...item} layout="rail" />
          ))}
        </nav>
      )}

      <main
        id="shell-scroll"
        className={cn(
          'shell-main min-h-0 min-w-0 flex-1 overscroll-behavior-none',
          tagging ? 'overflow-hidden' : 'overflow-y-auto',
          !inMatch && 'shell-main-nav'
        )}
      >
        <Outlet />
      </main>

      {inMatch ? null : (
        <nav className="shell-bar" aria-label="Main">
          {navItems.map((item) => (
            <ShellNavLink key={`b-${item.to}`} {...item} layout="bar" />
          ))}
        </nav>
      )}
    </div>
  )
}
