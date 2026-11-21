import type { WfWarnBadgeProps } from './types'

/** Amber mark for a mismatch that needs a look (scores or result differ). */
export function WfWarnBadge({ children }: WfWarnBadgeProps) {
  return (
    <span className="inline-flex items-center rounded border border-warning bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      {children}
    </span>
  )
}