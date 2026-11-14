import type { ReactNode } from 'react'

/** Pins header (+ optional tabs) while page content scrolls underneath. */
export function StickyChrome({ children }: { children: ReactNode }) {
  return <div className="sticky top-0 z-20 bg-bg-app shadow-sm">{children}</div>
}
