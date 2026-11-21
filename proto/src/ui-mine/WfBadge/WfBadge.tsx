import type { WfBadgeProps } from './types'

/** Tiny “proto only” badge for fake CTAs. */
export function WfBadge({ children }: WfBadgeProps) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-pill-idle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
      {children}
    </span>
  )
}