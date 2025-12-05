/**
 * SequentialQuestionBlock — Reusable component for sequential questions
 * 
 * Layout: 
 * - Full-width button grid for answers (question text is in status bar)
 * 
 * Auto-advances to next question after selection.
 * Consistent height and spacing across all question types.
 */

import { cn } from '@/helpers/utils'

export interface QuestionOption<T = string> {
  value: T
  label: string
  colorClass?: string  // Optional custom color for the button
}

export interface SequentialQuestionBlockProps<T = string> {
  options: QuestionOption<T>[]
  onSelect: (value: T) => void
  className?: string
}

export function SequentialQuestionBlock<T = string>({
  options,
  onSelect,
  className,
}: SequentialQuestionBlockProps<T>) {
  return (
    <div className={cn('grid gap-3', className)}>
      {/* Full-width button grid */}
      <div className={cn(
        'grid gap-3',
        options.length === 2 && 'grid-cols-2',
        options.length === 3 && 'grid-cols-3',
        options.length === 4 && 'grid-cols-4'
      )}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cn(
              'h-20 px-4 rounded-lg text-xl font-bold text-white',
              'flex items-center justify-center',
              'whitespace-nowrap overflow-hidden text-ellipsis',
              'transition-all duration-150 shadow-md active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
              option.colorClass || 'bg-brand-primary hover:bg-brand-primary/90'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

