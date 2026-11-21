import type { ReactNode } from 'react'

export type WfBadgeTone = 'idle' | 'warning'

export type WfBadgeProps = {
  children: ReactNode
  tone?: WfBadgeTone
}
