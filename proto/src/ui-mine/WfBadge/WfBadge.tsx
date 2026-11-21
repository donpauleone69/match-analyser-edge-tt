import type { WfBadgeProps, WfBadgeTone } from './types'

/** One full class string per tone. Do not merge these with cn(). */
const badgeClass: Record<WfBadgeTone, string> = {
  idle: 'inline-flex items-center rounded border border-border bg-pill-idle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted',
  warning:
    'inline-flex items-center rounded border border-warning bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary',
}

/** Tiny badge. `tone` picks the whole class string (idle or warning). */
export function WfBadge({ children, tone = 'idle' }: WfBadgeProps) {
  return <span className={badgeClass[tone]}>{children}</span>
}
