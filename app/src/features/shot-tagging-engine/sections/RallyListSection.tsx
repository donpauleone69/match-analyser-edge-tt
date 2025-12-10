/**
 * RallyListSection - Generic rally/shot list container
 * 
 * Provides consistent header and empty state for shot log area:
 * - Phase 1: Shows in-progress rally + completed rallies
 * - Phase 2: Shows rallies with detailed shot data + current tagging indicator
 * - Phase 3: Shows rallies with inferred data
 * 
 * The actual rally cards and shot items are passed as children,
 * allowing each phase to customize the detail level.
 */

import { type ReactNode } from 'react'

export interface RallyListSectionProps {
  title?: string
  emptyMessage?: string
  children: ReactNode
}

export function RallyListSection({ 
  title = 'Shot Log', 
  emptyMessage, 
  children 
}: RallyListSectionProps) {
  return (
    <div>
      {/* Section header */}
      <div className="text-sm text-neutral-500 mb-3">{title}</div>
      
      {/* Empty state (shown when no children) */}
      {!children && emptyMessage && (
        <div className="text-center text-neutral-600 py-8">
          {emptyMessage}
        </div>
      )}
      
      {/* Rally/shot content */}
      {children}
    </div>
  )
}

