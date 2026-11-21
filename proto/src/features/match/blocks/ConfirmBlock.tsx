import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import { flagClass } from '../styles'

/**
 * An amber box that asks before something is lost. It opens in place, so it
 * scrolls itself clear of the fold and of the phone's bottom nav.
 */
export function ConfirmBlock({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [])
  return (
    <div
      ref={ref}
      className={cn(flagClass, 'space-y-2 scroll-mb-16 md:scroll-mb-4')}
      role="alertdialog"
      aria-label={label}
    >
      {children}
    </div>
  )
}
