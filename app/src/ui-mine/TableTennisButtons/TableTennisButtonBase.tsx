/**
 * TableTennisButtonBase — Shared wrapper for table tennis SVG buttons
 * 
 * Provides consistent behavior for hover, focus, disabled states.
 * Wraps SVG content from individual button components.
 * 
 * LAYOUT FIX (2025-12-10): Fixed button overlap in 5-column grid (Phase1)
 * - Buttons size to grid height but constrained by max-w-full/max-h-full
 * - aspect-square ensures buttons stay square within grid cell bounds
 * - Buttons remain centered and no longer overlap in narrow columns
 * 
 * PREVIOUS CHANGE (2024-12-04): Changed from fixed-size to flexible width
 * - Allows 2-6 buttons to fill available width without overflow
 * 
 * TO ROLLBACK: Restore size prop logic:
 *   size === 'square' && 'w-[100px] h-[100px]'
 *   size === 'rect' && 'w-[55px] h-[100px]'
 */

import { cn } from '@/helpers/utils'

export type ButtonSize = 'square' | 'rect'

export interface TableTennisButtonBaseProps {
  onClick: () => void
  disabled?: boolean
  size?: ButtonSize  // Currently unused but kept for API compatibility
  children: React.ReactNode
  className?: string
  title?: string
}

export function TableTennisButtonBase({
  onClick,
  disabled = false,
  size: _size = 'square',
  children,
  className,
  title,
}: TableTennisButtonBaseProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'bg-transparent border-none p-0 cursor-pointer rounded-lg overflow-hidden',
        'transition-all duration-150 shadow-md active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
        // Square buttons that fit within grid cells
        // Use max dimensions to ensure button doesn't exceed cell bounds
        'max-w-full max-h-full',  // Never exceed grid cell dimensions
        'aspect-square',           // Keep buttons square (constrained by smaller dimension)
        // Remove inline spacing from SVG children
        '[&>svg]:block',   // Make SVG block element to remove inline gaps
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      style={{
        // Size the button to fit within the grid height
        // Grid cells will constrain width via max-w-full
        width: 'var(--button-grid-height, 100px)',
        height: 'var(--button-grid-height, 100px)',
      }}
    >
      {children}
    </button>
  )
}

