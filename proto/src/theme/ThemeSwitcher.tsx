import { THEME_PACKS } from './packs'
import { useTheme } from './ThemeProvider'
import { cn } from '@/helpers/utils'

/** Stub switcher — Account (or Home) control to flip proto token packs. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-2" role="group" aria-label="Theme packs">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Theme packs</p>
      <div className="grid gap-2">
        {THEME_PACKS.map((pack) => {
          const active = pack.id === theme
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => setTheme(pack.id)}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-left transition-colors',
                active
                  ? 'border-brand-primary bg-brand-primary-muted'
                  : 'border-border bg-bg-card hover:bg-bg-elevated'
              )}
              aria-pressed={active}
            >
              <span className="block text-sm font-semibold text-primary">{pack.label}</span>
              <span className="block text-xs text-muted mt-0.5">{pack.blurb}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
