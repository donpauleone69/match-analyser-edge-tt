/**
 * ServeDetailBlock — Detailed inputs for serve shots
 * 
 * Fields: Contact (table location), Direction, Length, Spin
 * All fields required before advancing to next shot
 */

import { cn } from '@/lib/utils'

export type ServeContact = 'left' | 'right'
export type ServeDirection = 'line' | 'diagonal'
export type ServeLength = 'short' | 'halflong' | 'long'
export type ServeSpin = 'under' | 'nospin' | 'topspin'

export interface ServeDetailData {
  contact: ServeContact
  direction: ServeDirection
  length: ServeLength | null
  spin: ServeSpin | null
}

export interface ServeDetailBlockProps {
  value: ServeDetailData
  onChange: (value: ServeDetailData) => void
  className?: string
}

const LENGTH_OPTIONS: { value: ServeLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'halflong', label: 'Half-Long' },
  { value: 'long', label: 'Long' },
]

const SPIN_OPTIONS: { value: ServeSpin; label: string }[] = [
  { value: 'under', label: 'Under' },
  { value: 'nospin', label: 'No Spin' },
  { value: 'topspin', label: 'Topspin' },
]

export function ServeDetailBlock({ value, onChange, className }: ServeDetailBlockProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Column headers */}
      <div className="flex items-center gap-2">
        <div className="w-20 shrink-0"></div>
        <div className="flex-1 grid grid-cols-2 gap-1.5">
          <div className="text-xs text-neutral-500 text-center">Contact</div>
          <div className="text-xs text-neutral-500 text-center">Direction</div>
        </div>
      </div>
      
      {/* Toggles row */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-neutral-400 w-20 shrink-0">Toggles:</label>
        <div className="flex-1 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ ...value, contact: value.contact === 'left' ? 'right' : 'left' })}
            className={cn(
              'px-3 py-3.5 rounded-lg text-sm font-medium transition-all capitalize',
              'focus:outline-none focus:ring-2 focus:ring-brand-primary',
              'bg-brand-primary text-white shadow-md'
            )}
          >
            {value.contact}
          </button>
          
          <button
            type="button"
            onClick={() => onChange({ ...value, direction: value.direction === 'line' ? 'diagonal' : 'line' })}
            className={cn(
              'px-3 py-3.5 rounded-lg text-sm font-medium transition-all capitalize',
              'focus:outline-none focus:ring-2 focus:ring-brand-primary',
              'bg-brand-primary text-white shadow-md'
            )}
          >
            {value.direction}
          </button>
        </div>
      </div>

      {/* Length row */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-neutral-400 w-20 shrink-0">Length:</label>
        <div className="grid grid-cols-3 gap-1.5 flex-1">
          {LENGTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...value, length: option.value })}
              className={cn(
                'px-3 py-3.5 rounded-lg text-sm font-medium transition-all',
                'focus:outline-none focus:ring-2 focus:ring-brand-primary',
                value.length === option.value
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spin row */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-neutral-400 w-20 shrink-0">Spin:</label>
        <div className="grid grid-cols-3 gap-1.5 flex-1">
          {SPIN_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...value, spin: option.value })}
              className={cn(
                'px-3 py-3.5 rounded-lg text-sm font-medium transition-all',
                'focus:outline-none focus:ring-2 focus:ring-brand-primary',
                value.spin === option.value
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

