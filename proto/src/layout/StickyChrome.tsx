import type { ReactNode } from 'react'
import { cn } from '@/helpers/utils'

/** Pins header (+ optional tabs) while page content scrolls underneath. */
export function StickyChrome({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('sticky top-0 z-20 bg-bg-app shadow-sm', className)} data-sticky-chrome>
      {children}
    </div>
  )
}
