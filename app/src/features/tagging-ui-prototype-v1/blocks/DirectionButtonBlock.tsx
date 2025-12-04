/**
 * DirectionButtonBlock — 2-button selector for shot direction
 * 
 * Options: Line, Diagonal
 */

import { cn } from '@/lib/utils'

export type Direction = 'line' | 'diagonal'

export interface DirectionButtonBlockProps {
  value: Direction | null
  onChange: (value: Direction) => void
  className?: string
}

const DIRECTION_OPTIONS: { value: Direction; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'diagonal', label: 'Diagonal' },
]

export function DirectionButtonBlock({ value, onChange, className }: DirectionButtonBlockProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-neutral-400">Direction</label>
      <div className="grid grid-cols-2 gap-1.5">
        {DIRECTION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-brand-primary',
              value === option.value
                ? 'bg-brand-primary text-white shadow-md'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

