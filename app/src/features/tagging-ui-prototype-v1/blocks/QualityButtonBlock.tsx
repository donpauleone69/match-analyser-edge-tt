/**
 * QualityButtonBlock — 4-button selector for shot quality
 * 
 * Options: Good, Average, InNet, OffEnd
 * No default - user must select
 * Layout: Single row with semantic labels above button groups
 */

import { cn } from '@/lib/utils'

export type Quality = 'good' | 'average' | 'innet' | 'offend'

export interface QualityButtonBlockProps {
  value: Quality | null
  onChange: (value: Quality) => void
  className?: string
}

const IN_PLAY_OPTIONS: { value: Quality; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'average', label: 'Average' },
]

const POINT_LOST_OPTIONS: { value: Quality; label: string }[] = [
  { value: 'innet', label: 'In Net' },
  { value: 'offend', label: 'Off End' },
]

export function QualityButtonBlock({ value, onChange, className }: QualityButtonBlockProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-neutral-400">Quality</label>
      
      <div className="flex gap-2">
        {/* In Play Group */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-1 px-1">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wide">In Play</span>
            <div className="flex-1 h-px bg-neutral-700" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {IN_PLAY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  'px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-success',
                  value === option.value
                    ? 'bg-success text-white shadow-md'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Point Lost Group */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-1 px-1">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Point Lost</span>
            <div className="flex-1 h-px bg-neutral-700" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {POINT_LOST_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  'px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-danger',
                  value === option.value
                    ? 'bg-danger text-white shadow-md'
                    : 'bg-neutral-700 text-danger/70 hover:bg-danger/20 hover:text-danger'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

