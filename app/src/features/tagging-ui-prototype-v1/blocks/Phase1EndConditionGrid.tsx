/**
 * Phase1EndConditionGrid — 2x2 grid of buttons for rally end conditions
 * 
 * Layout:
 * - Top Row: Win | Let
 * - Bottom Row: In Net | Long
 * 
 * State-dependent activation:
 * - Before serve: All buttons disabled
 * - After serve: All buttons active
 */

import { cn } from '@/lib/utils'

export type RallyState = 'before-serve' | 'after-serve'
export type EndCondition = 'let' | 'winner' | 'innet' | 'long'

export interface Phase1EndConditionGridProps {
  rallyState: RallyState
  onEndCondition: (condition: EndCondition) => void
  className?: string
}

interface ButtonConfig {
  condition: EndCondition
  label: string
  colorClass: string
}

export function Phase1EndConditionGrid({
  rallyState,
  onEndCondition,
  className,
}: Phase1EndConditionGridProps) {
  const isActive = rallyState === 'after-serve'
  
  // Button configurations
  // Top row: Win (green), Let (amber)
  // Bottom row: In Net (red), Long (red)
  const topRow: ButtonConfig[] = [
    { condition: 'winner', label: 'Win', colorClass: 'bg-success hover:bg-success/90' },
    { condition: 'let', label: 'Let', colorClass: 'bg-warning hover:bg-warning/90' },
  ]
  
  const bottomRow: ButtonConfig[] = [
    { condition: 'innet', label: 'In Net', colorClass: 'bg-danger hover:bg-danger/90' },
    { condition: 'long', label: 'Long', colorClass: 'bg-danger hover:bg-danger/90' },
  ]

  const renderButton = (button: ButtonConfig) => (
    <button
      key={button.condition}
      type="button"
      onClick={() => onEndCondition(button.condition)}
      disabled={!isActive}
      className={cn(
        'h-12 px-4 rounded-lg text-base font-semibold text-white',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
        isActive 
          ? cn(button.colorClass, 'shadow-md active:scale-95')
          : 'bg-neutral-800 cursor-not-allowed opacity-50'
      )}
    >
      {button.label}
    </button>
  )

  return (
    <div className={cn('grid grid-rows-2 gap-2', className)}>
      {/* Top Row: Win | Let */}
      <div className="grid grid-cols-2 gap-2">
        {topRow.map(renderButton)}
      </div>
      
      {/* Bottom Row: In Net | Long */}
      <div className="grid grid-cols-2 gap-2">
        {bottomRow.map(renderButton)}
      </div>
    </div>
  )
}

