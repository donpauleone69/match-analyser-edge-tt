/**
 * SimpleTaggingModePickerBlock — Simple vs Pass 1 entry / switch.
 * Presentational only.
 */

import { cn } from '@/helpers/utils'
import type { SessionTaggingMode } from '../helpers/taggingModePreference'

export interface SimpleTaggingModePickerBlockProps {
  mode: SessionTaggingMode
  onSelect: (mode: SessionTaggingMode) => void
  disabled?: boolean
  className?: string
}

export function SimpleTaggingModePickerBlock({
  mode,
  onSelect,
  disabled = false,
  className,
}: SimpleTaggingModePickerBlockProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-md border border-pill-idle-border bg-bg-card p-0.5',
        className
      )}
      role="group"
      aria-label="Tagging mode"
    >
      {(
        [
          { id: 'simple', label: 'Simple' },
          { id: 'pass1focus', label: 'Pass 1' },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(opt.id)}
          className={cn(
            'min-h-8 rounded px-2.5 text-[11px] font-semibold touch-manipulation',
            mode === opt.id
              ? 'bg-brand-primary/25 text-neutral-50'
              : 'text-muted hover:text-neutral-200',
            disabled && 'opacity-50'
          )}
          aria-pressed={mode === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
