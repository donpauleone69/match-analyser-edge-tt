import { useLayoutEffect, type ReactNode } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

/** Puts the chosen pack on html[data-theme]. The choice itself lives in settingsStore. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.theme)

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return children
}
