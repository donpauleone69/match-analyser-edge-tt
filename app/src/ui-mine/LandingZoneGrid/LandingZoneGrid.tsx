/**
 * LandingZoneGrid — 3x3 landing zone selector
 * 
 * Grid layout (from opponent's perspective):
 * 
 *   BHShort   MidShort   FHShort
 *   BHMid     MidMid     FHMid
 *   BHLong    MidLong    FHLong
 * 
 * Supports keyboard numpad input for quick selection.
 */

import { forwardRef, useCallback, useEffect } from 'react'
import type { LandingZone } from '@/rules/types'
import { LANDING_ZONE_GRID } from '@/rules/types'
import { cn } from '@/lib/utils'

export interface LandingZoneGridProps {
  /** Currently selected zone */
  value?: LandingZone
  /** Selection handler */
  onChange: (zone: LandingZone) => void
  /** Enable numpad keyboard shortcuts */
  enableKeyboard?: boolean
  /** Disable interaction */
  disabled?: boolean
  /** Custom class name */
  className?: string
  /** Show table perspective label */
  showLabel?: boolean
}

const ZONE_LABELS: Record<LandingZone, string> = {
  BHShort: 'BH\nShort',
  MidShort: 'Mid\nShort',
  FHShort: 'FH\nShort',
  BHMid: 'BH\nMid',
  MidMid: 'Mid',
  FHMid: 'FH\nMid',
  BHLong: 'BH\nLong',
  MidLong: 'Mid\nLong',
  FHLong: 'FH\nLong',
}

const ZONE_SHORT_LABELS: Record<LandingZone, string> = {
  BHShort: 'BH↑',
  MidShort: 'M↑',
  FHShort: 'FH↑',
  BHMid: 'BH',
  MidMid: '●',
  FHMid: 'FH',
  BHLong: 'BH↓',
  MidLong: 'M↓',
  FHLong: 'FH↓',
}

// Numpad mapping (1-9)
const ZONE_NUMPAD: Record<number, LandingZone> = {
  7: 'BHShort', 8: 'MidShort', 9: 'FHShort',
  4: 'BHMid', 5: 'MidMid', 6: 'FHMid',
  1: 'BHLong', 2: 'MidLong', 3: 'FHLong',
}

const LandingZoneGrid = forwardRef<HTMLDivElement, LandingZoneGridProps>(
  ({ value, onChange, enableKeyboard = true, disabled = false, className, showLabel = true }, ref) => {
    
    // Keyboard handler for numpad
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (disabled || !enableKeyboard) return
      
      const key = e.key
      const numpadMatch = key.match(/^[1-9]$/)
      
      if (numpadMatch) {
        const num = parseInt(key, 10)
        const zone = ZONE_NUMPAD[num]
        if (zone) {
          e.preventDefault()
          onChange(zone)
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
            <span>← BH</span>
            <span>Opponent's table</span>
            <span>FH →</span>
          </div>
        )}
        <div
          className={cn(
            'grid grid-cols-3 gap-1 p-2 bg-neutral-800 rounded-lg',
            'border-2 border-neutral-600',
            disabled && 'opacity-50 pointer-events-none'
          )}
          role="radiogroup"
          aria-label="Landing zone selection"
        >
        {LANDING_ZONE_GRID.map((row: LandingZone[], rowIndex: number) =>
          row.map((zone: LandingZone, colIndex: number) => {
              const isSelected = value === zone
              const numpadKey = [7, 8, 9, 4, 5, 6, 1, 2, 3][rowIndex * 3 + colIndex]
              
              return (
                <button
                  key={zone}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onChange(zone)}
                  disabled={disabled}
                  className={cn(
                    'relative flex flex-col items-center justify-center',
                    'w-14 h-10 rounded text-xs font-medium',
                    'transition-all duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 focus:ring-offset-neutral-800',
                    isSelected
                      ? 'bg-success text-white shadow-lg'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 hover:text-neutral-100',
                    // Visual hint for depth
                    rowIndex === 0 && 'border-t-2 border-t-neutral-500',
                    rowIndex === 2 && 'border-b-2 border-b-neutral-500'
                  )}
                >
                  <span className="text-[10px]">{ZONE_SHORT_LABELS[zone]}</span>
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-40 font-mono">
                    {numpadKey}
                  </span>
                </button>
              )
            })
          )}
        </div>
        {showLabel && (
          <div className="flex justify-center text-xs text-neutral-400">
            <span>↓ Net</span>
          </div>
        )}
      </div>
    )
  }
)

LandingZoneGrid.displayName = 'LandingZoneGrid'

export { LandingZoneGrid, ZONE_LABELS, ZONE_SHORT_LABELS }

