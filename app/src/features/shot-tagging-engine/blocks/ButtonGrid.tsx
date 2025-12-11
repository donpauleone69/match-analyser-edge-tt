/**
 * ButtonGrid — Standardized button layout container
 * 
 * Ensures consistent button sizing across all layouts by calculating height
 * based on the 4-button baseline. Uses CSS variables to stay theme-aware.
 * 
 * Height formula: (viewport width - padding - gaps) / 4
 * - Padding: 0.125rem on each side (gap-0.5, p-0.5)
 * - Gaps: 3 gaps between 4 buttons (0.125rem each)
 * 
 * Button behavior:
 * - 2/3/4/5 buttons: Square, centered in grid cells
 * - 6 buttons: Tall rectangles (width < height), fill grid cells with !aspect-auto
 */

import { cn } from '@/helpers/utils'
import type { ReactNode } from 'react'

interface ButtonGridProps {
  columns: 2 | 3 | 4 | 5 | 6
  children: ReactNode
  className?: string
}

export function ButtonGrid({ columns, children, className }: ButtonGridProps) {
  // Define spacing as CSS variables for theme consistency
  // These match Tailwind's spacing.0.5 (0.125rem = 2px)
  const gridGap = '0.125rem'
  const gridPadding = '0.125rem'
  
  // Maximum height for landscape/tablet devices (prevents buttons from becoming too large)
  const maxHeight = '120px'
  
  return (
    <div
      className={cn(
        'grid place-items-center',
        'gap-0.5 p-0.5', // Visual spacing (must match variables above)
        {
          'grid-cols-2': columns === 2,
          'grid-cols-3': columns === 3,
          'grid-cols-4': columns === 4,
          'grid-cols-5': columns === 5,
          'grid-cols-6': columns === 6,
        },
        className
      )}
      style={{
        // Calculate height dynamically based on 4-button layout
        // This ensures all containers have the same height regardless of button count
        // Use min() to cap at maxHeight for landscape devices
        '--button-grid-height': `min(calc((100vw - (${gridPadding} * 2) - (${gridGap} * 3)) / 4), ${maxHeight})`,
        height: 'var(--button-grid-height)',
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

