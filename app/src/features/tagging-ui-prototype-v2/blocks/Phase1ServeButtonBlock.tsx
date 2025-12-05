/**
 * Phase1ServeButtonBlock — Large action button for Phase 1 timestamp capture
 * 
 * Changes label between "SERVE" and "SHOT" based on rally state
 * Captures timestamp on each press
 */

import { cn } from '@/helpers/utils'

export interface Phase1ServeButtonBlockProps {
  label: 'SERVE' | 'SHOT'
  onClick: () => void
  shotCount: number
  className?: string
}

export function Phase1ServeButtonBlock({
  label,
  onClick,
  shotCount: _shotCount,
  className,
}: Phase1ServeButtonBlockProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full h-[104px] px-4 rounded-xl text-2xl font-bold tracking-wide',
        'bg-brand-primary text-white shadow-lg',
        'hover:bg-brand-primary/90 active:scale-95',
        'transition-all duration-150',
        'focus:outline-none focus:ring-4 focus:ring-brand-primary/50',
        className
      )}
    >
      {label}
    </button>
  )
}

