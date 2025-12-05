/**
 * IntentTabBlock — 3-option tab selector for shot intent
 * 
 * Options: Defensive, Neutral, Aggressive
 * Default: Neutral
 */

import { cn } from '@/helpers/utils'

export type Intent = 'defensive' | 'neutral' | 'aggressive'

export interface IntentTabBlockProps {
  value: Intent | null
  onChange: (value: Intent) => void
  className?: string
}

const INTENT_OPTIONS: { value: Intent; label: string }[] = [
  { value: 'defensive', label: 'Defensive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'aggressive', label: 'Aggressive' },
]

export function IntentTabBlock({ value, onChange, className }: IntentTabBlockProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="text-xs font-medium text-neutral-400 w-16 shrink-0">Intent</label>
      <div className="grid grid-cols-3 gap-1.5 flex-1">
        {INTENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-all',
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

