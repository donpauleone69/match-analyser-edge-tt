/**
 * PositionGrid — 3x3 player position selector
 * 
 * Grid layout:
 * 
 *   closeLeft   closeMid   closeRight
 *   midLeft     midMid     midRight
 *   farLeft     farMid     farRight
 * 
 * Supports keyboard numpad input for quick selection.
 */

import { forwardRef, useCallback, useEffect } from 'react'
import type { PositionSector } from '@/rules/types'
import { POSITION_SECTOR_GRID } from '@/rules/types'
import { cn } from '@/lib/utils'

export interface PositionGridProps {
  /** Currently selected position */
  value?: PositionSector
  /** Selection handler */
  onChange: (position: PositionSector) => void
  /** Enable numpad keyboard shortcuts */
  enableKeyboard?: boolean
  /** Disable interaction */
  disabled?: boolean
  /** Custom class name */
  className?: string
  /** Show position labels */
  showLabel?: boolean
}

const POSITION_LABELS: Record<PositionSector, string> = {
  closeLeft: 'Close\nLeft',
  closeMid: 'Close\nMid',
  closeRight: 'Close\nRight',
  midLeft: 'Mid\nLeft',
  midMid: 'Mid',
  midRight: 'Mid\nRight',
  farLeft: 'Far\nLeft',
  farMid: 'Far\nMid',
  farRight: 'Far\nRight',
}

const POSITION_SHORT_LABELS: Record<PositionSector, string> = {
  closeLeft: 'CL',
  closeMid: 'C',
  closeRight: 'CR',
  midLeft: 'ML',
  midMid: 'M',
  midRight: 'MR',
  farLeft: 'FL',
  farMid: 'F',
  farRight: 'FR',
}

// Numpad mapping (1-9)
const POSITION_NUMPAD: Record<number, PositionSector> = {
  7: 'closeLeft', 8: 'closeMid', 9: 'closeRight',
  4: 'midLeft', 5: 'midMid', 6: 'midRight',
  1: 'farLeft', 2: 'farMid', 3: 'farRight',
}

const PositionGrid = forwardRef<HTMLDivElement, PositionGridProps>(
  ({ value, onChange, enableKeyboard = true, disabled = false, className, showLabel = true }, ref) => {
    
    // Keyboard handler for numpad
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (disabled || !enableKeyboard) return
      
      const key = e.key
      const numpadMatch = key.match(/^[1-9]$/)
      
      if (numpadMatch) {
        const num = parseInt(key, 10)
        const position = POSITION_NUMPAD[num]
        if (position) {
          e.preventDefault()
          onChange(position)
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
      <div ref={ref} className={cn('flex flex-col gap-2', className)}>
        {showLabel && (
          <div className="flex justify-between text-xs text-neutral-400">
            <span>← Left</span>
            <span>Player position</span>
            <span>Right →</span>
          </div>
        )}
        <div
          className={cn(
            'grid grid-cols-3 gap-1 p-2 bg-neutral-800 rounded-lg',
            disabled && 'opacity-50 pointer-events-none'
          )}
          role="radiogroup"
          aria-label="Player position selection"
        >
        {POSITION_SECTOR_GRID.map((row: PositionSector[], rowIndex: number) =>
          row.map((position: PositionSector, colIndex: number) => {
              const isSelected = value === position
              const numpadKey = [7, 8, 9, 4, 5, 6, 1, 2, 3][rowIndex * 3 + colIndex]
              
              // Color by distance
              const distanceColors = {
                0: 'border-l-info', // Close - blue
                1: 'border-l-warning', // Mid - yellow
                2: 'border-l-danger', // Far - red
              }
              
              return (
                <button
                  key={position}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onChange(position)}
                  disabled={disabled}
                  className={cn(
                    'relative flex flex-col items-center justify-center',
                    'w-14 h-12 rounded text-xs font-medium',
                    'transition-all duration-150 border-l-4',
                    distanceColors[rowIndex as 0 | 1 | 2],
                    'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 focus:ring-offset-neutral-800',
                    isSelected
                      ? 'bg-brand-primary text-white shadow-lg'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 hover:text-neutral-100'
                  )}
                >
                  <span className="text-[10px]">{POSITION_SHORT_LABELS[position]}</span>
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-40 font-mono">
                    {numpadKey}
                  </span>
                </button>
              )
            })
          )}
        </div>
        {showLabel && (
          <div className="flex justify-between text-xs text-neutral-400 px-2">
            <span>↑ Close to table</span>
            <span>↓ Far from table</span>
          </div>
        )}
      </div>
    )
  }
)

PositionGrid.displayName = 'PositionGrid'

export { PositionGrid, POSITION_LABELS, POSITION_SHORT_LABELS }

