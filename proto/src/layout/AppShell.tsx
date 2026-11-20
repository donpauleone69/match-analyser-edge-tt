import { Outlet, Link, useLocation, useMatch } from 'react-router-dom'
import { Icon, type IconName } from '@/ui-mine'
import { cn } from '@/helpers/utils'

const navItems: { to: string; icon: IconName; label: string }[] = [
  { to: '/home', icon: 'home', label: 'Home' },
  { to: '/insights', icon: 'chart', label: 'Insights' },
  { to: '/account', icon: 'user', label: 'Account' },
]

function useNavActive(to: string) {
  const { pathname } = useLocation()
  if (to === '/home') {
    return (
      pathname === '/home' ||
      pathname.startsWith('/home/') ||
      pathname.startsWith('/matches/')
    )
  }
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
  layout: 'top' | 'bottom'
}) {
  const active = useNavActive(to)
  return (
    <Link
      to={to}
      className={cn(
        layout === 'bottom'
          ? 'btn-kind-control flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold'
          : 'btn-kind-control inline-flex items-center gap-1.5 px-3 text-sm font-semibold rounded-md',
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
  /** Tagging a set takes the whole screen: no top or bottom nav. */
  const tagging = Boolean(useMatch('/matches/:matchId/tag/:setId'))
  return (
    <div className="h-full bg-bg-app flex flex-col">
      {tagging ? null : (
        <header className="hidden md:flex shrink-0 items-center justify-between gap-4 border-b border-border bg-bg-shell pl-6 pr-12 lg:pl-8 lg:pr-14 min-h-[var(--btn-kind-main)] z-40">
          <nav className="flex items-center gap-1" aria-label="Main">
            {navItems.map((item) => (
              <ShellNavLink key={item.to} {...item} layout="top" />
            ))}
          </nav>
        </header>
      )}

      <main
        id="shell-scroll"
        className={cn(
          'flex-1 min-h-0 overscroll-behavior-none',
          tagging ? 'overflow-hidden' : 'overflow-y-auto pb-14 md:pb-0'
        )}
      >
        <Outlet />
      </main>

      {tagging ? null : (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 min-h-[var(--btn-kind-main)] border-t border-border bg-bg-shell flex items-stretch"
          aria-label="Main"
        >
          {navItems.map((item) => (
            <ShellNavLink key={`b-${item.to}`} {...item} layout="bottom" />
          ))}
        </nav>
      )}
    </div>
  )
}
