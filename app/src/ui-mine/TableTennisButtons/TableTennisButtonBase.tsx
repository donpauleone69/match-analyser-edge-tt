/**
 * TableTennisButtonBase — Shared wrapper for table tennis SVG buttons
 * 
 * Provides consistent behavior for hover, focus, disabled states.
 * Wraps SVG content from individual button components.
 * 
 * LAYOUT CHANGE (2024-12-04): Changed from fixed-size to flexible width
 * - Buttons now use flex-1 to share space equally
 * - Fixed height maintained for consistency
 * - Allows 2-6 buttons to fill available width without overflow
 * 
 * TO ROLLBACK: Restore size prop logic:
 *   size === 'square' && 'w-[100px] h-[100px]'
 *   size === 'rect' && 'w-[55px] h-[100px]'
 */

import { cn } from '@/lib/utils'

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
  size = 'square',  // eslint-disable-line @typescript-eslint/no-unused-vars
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
        // Flexible width with fixed height (Option 1 implementation)
        'flex-1',          // Share available space equally
        'min-w-0',         // Allow shrinking below content size
        'h-24',            // Fixed height: 96px (24 * 4px)
        'max-w-[180px]',   // Prevent excessive stretching on large screens
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      <div className="w-full h-full">
        {children}
      </div>
    </button>
  )
}

