/**
 * SpinGrid — 3x3 serve spin selector
 * 
 * Grid layout (numpad mapping):
 * 
 *   topLeft(7)    topspin(8)    topRight(9)
 *   sideLeft(4)   noSpin(5)     sideRight(6)
 *   backLeft(1)   backspin(2)   backRight(3)
 * 
 * Supports keyboard numpad input for quick selection.
 */

import { forwardRef, useCallback, useEffect } from 'react'
import type { ServeSpin } from '@/rules/types'
import { SERVE_SPIN_GRID, SERVE_SPIN_NUMPAD } from '@/rules/types'
import { cn } from '@/lib/utils'

export interface SpinGridProps {
  /** Currently selected spin */
  value?: ServeSpin
  /** Selection handler */
  onChange: (spin: ServeSpin) => void
  /** Enable numpad keyboard shortcuts */
  enableKeyboard?: boolean
  /** Disable interaction */
  disabled?: boolean
  /** Custom class name */
  className?: string
}

const SPIN_LABELS: Record<ServeSpin, string> = {
  topLeft: 'Top\nLeft',
  topspin: 'Top',
  topRight: 'Top\nRight',
  sideLeft: 'Side\nLeft',
  noSpin: 'No\nSpin',
  sideRight: 'Side\nRight',
  backLeft: 'Back\nLeft',
  backspin: 'Back',
  backRight: 'Back\nRight',
}

const SPIN_SHORT_LABELS: Record<ServeSpin, string> = {
  topLeft: 'TL',
  topspin: 'T',
  topRight: 'TR',
  sideLeft: 'SL',
  noSpin: '—',
  sideRight: 'SR',
  backLeft: 'BL',
  backspin: 'B',
  backRight: 'BR',
}

const SpinGrid = forwardRef<HTMLDivElement, SpinGridProps>(
  ({ value, onChange, enableKeyboard = true, disabled = false, className }, ref) => {
    
    // Keyboard handler for numpad
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (disabled || !enableKeyboard) return
      
      // Check for numpad keys (1-9) or regular number keys
      const key = e.key
      const numpadMatch = key.match(/^[1-9]$/)
      
      if (numpadMatch) {
        const num = parseInt(key, 10)
        const spin = SERVE_SPIN_NUMPAD[num]
        if (spin) {
          e.preventDefault()
          onChange(spin)
        }
      }
    }, [disabled, enableKeyboard, onChange])
    
    useEffect(() => {
      if (enableKeyboard) {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
      }
    }, [enableKeyboard, handleKeyDown])
    
    return (
      <div
        ref={ref}
        className={cn(
          'grid grid-cols-3 gap-1 p-2 bg-neutral-800 rounded-lg',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        role="radiogroup"
        aria-label="Serve spin selection"
      >
        {SERVE_SPIN_GRID.map((row: ServeSpin[], rowIndex: number) =>
          row.map((spin: ServeSpin, colIndex: number) => {
            const isSelected = value === spin
            const numpadKey = [7, 8, 9, 4, 5, 6, 1, 2, 3][rowIndex * 3 + colIndex]
            
            return (
              <button
                key={spin}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(spin)}
                disabled={disabled}
                className={cn(
                  'relative flex flex-col items-center justify-center',
                  'w-16 h-16 rounded-md text-xs font-medium',
                  'transition-all duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 focus:ring-offset-neutral-800',
                  isSelected
                    ? 'bg-brand-primary text-white shadow-lg'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 hover:text-neutral-100'
                )}
              >
                <span className="whitespace-pre-wrap text-center leading-tight">
                  {SPIN_SHORT_LABELS[spin]}
                </span>
                <span className="absolute bottom-1 right-1 text-[10px] opacity-50 font-mono">
                  {numpadKey}
                </span>
              </button>
            )
          })
        )}
      </div>
    )
  }
)

SpinGrid.displayName = 'SpinGrid'

export { SpinGrid, SPIN_LABELS, SPIN_SHORT_LABELS }

