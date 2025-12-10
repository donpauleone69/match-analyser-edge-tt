/**
 * StatusGrid - 5-column grid container for status bar items
 * 
 * Creates a single-row horizontal grid where each item is a column.
 * Supports the standard 5-column template:
 * - Columns 1-2: Multi-line text with internal left/right justification
 * - Column 3: Centered value
 * - Column 4: Centered badge (full height)
 * - Column 5: Action button (full height)
 * 
 * Grid uses auto-sizing columns with 4-unit gaps.
 * All items are vertically centered within the fixed-height container.
 */

import { type ReactNode } from 'react'
import { cn } from '@/helpers/utils'

export interface StatusGridProps {
  items: ReactNode[]
  className?: string
}

export function StatusGrid({ items, className }: StatusGridProps) {
  return (
    <div 
      className={cn(
        'grid grid-flow-col auto-cols-auto gap-x-4 h-full items-center',
        className
      )}
    >
      {items}
    </div>
  )
}

