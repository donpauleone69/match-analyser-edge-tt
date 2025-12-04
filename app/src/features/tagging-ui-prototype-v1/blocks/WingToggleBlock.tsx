/**
 * WingToggleBlock — 2-option toggle for shot wing
 * 
 * Options: Backhand, Forehand
 * Large, finger-friendly toggle button
 */

import { cn } from '@/lib/utils'

export type Wing = 'backhand' | 'forehand'

export interface WingToggleBlockProps {
  value: Wing | null
  onChange: (value: Wing) => void
  className?: string
}

export function WingToggleBlock({ value, onChange, className }: WingToggleBlockProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="text-xs font-medium text-neutral-400 w-16 shrink-0">Wing</label>
      <div className="flex gap-1.5 flex-1">
        <button
          type="button"
          onClick={() => onChange('backhand')}
          className={cn(
            'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary',
            value === 'backhand'
              ? 'bg-brand-primary text-white shadow-md'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          )}
        >
          Backhand
        </button>
        <button
          type="button"
          onClick={() => onChange('forehand')}
          className={cn(
            'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary',
            value === 'forehand'
              ? 'bg-brand-primary text-white shadow-md'
              : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
          )}
        >
          Forehand
        </button>
      </div>
    </div>
  )
}

