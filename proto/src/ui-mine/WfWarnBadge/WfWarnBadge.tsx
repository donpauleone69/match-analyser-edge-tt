import type { WfWarnBadgeProps } from './types'
import { WfBadge } from '../WfBadge/WfBadge'

/** Amber mark for a mismatch that needs a look (scores or result differ). */
export function WfWarnBadge({ children }: WfWarnBadgeProps) {
  return <WfBadge tone="warning">{children}</WfBadge>
}
