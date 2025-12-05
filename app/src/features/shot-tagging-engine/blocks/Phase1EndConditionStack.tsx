/**
 * Phase1EndConditionStack — 3 stacked buttons for rally end conditions
 * 
 * State-dependent labels and colors:
 * - Before serve: Let (amber), In Net (red), Long (red) - all inactive
 * - After serve: Winner (green), In Net (red), Long (red) - all active
 */

import { cn } from '@/helpers/utils'

export type RallyState = 'before-serve' | 'after-serve'
export type EndCondition = 'let' | 'winner' | 'innet' | 'long'

export interface Phase1EndConditionStackProps {
  rallyState: RallyState
  onEndCondition: (condition: EndCondition) => void
  className?: string
}

interface ButtonConfig {
  condition: EndCondition
  label: string
  colorClass: string
  activeColorClass: string
}

export function Phase1EndConditionStack({
  rallyState,
  onEndCondition,
  className,
}: Phase1EndConditionStackProps) {
  const isActive = rallyState === 'after-serve'
  
  // Button configurations based on rally state
  // Before serve: Let/InNet/Long (inactive)
  // After serve: Winner/InNet/Long (active)
  const buttons: ButtonConfig[] = rallyState === 'before-serve'
    ? [
        { condition: 'let', label: 'Let', colorClass: 'bg-warning/30', activeColorClass: 'bg-warning hover:bg-warning/90' },
        { condition: 'innet', label: 'In Net', colorClass: 'bg-danger/30', activeColorClass: 'bg-danger hover:bg-danger/90' },
        { condition: 'long', label: 'Long', colorClass: 'bg-danger/30', activeColorClass: 'bg-danger hover:bg-danger/90' },
      ]
    : [
        { condition: 'winner', label: 'Winner', colorClass: 'bg-success/30', activeColorClass: 'bg-success hover:bg-success/90' },
        { condition: 'innet', label: 'In Net', colorClass: 'bg-danger/30', activeColorClass: 'bg-danger hover:bg-danger/90' },
        { condition: 'long', label: 'Long', colorClass: 'bg-danger/30', activeColorClass: 'bg-danger hover:bg-danger/90' },
      ]

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {buttons.map((button) => (
        <button
          key={button.condition}
          type="button"
          onClick={() => onEndCondition(button.condition)}
          disabled={!isActive}
          className={cn(
            'px-6 py-4 rounded-lg text-base font-semibold text-white',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            isActive 
              ? cn(button.activeColorClass, 'shadow-md active:scale-95 focus:ring-white')
              : cn(button.colorClass, 'cursor-not-allowed opacity-50')
          )}
        >
          {button.label}
        </button>
      ))}
    </div>
  )
}

