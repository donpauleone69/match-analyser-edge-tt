/**
 * ProgressIndicatorBlock — Shows current shot position in Phase 2
 * 
 * Displays: "Shot 3 of 27" with visual progress bar
 */

import { cn } from '@/helpers/utils'

export interface ProgressIndicatorBlockProps {
  currentIndex: number
  total: number
  className?: string
}

export function ProgressIndicatorBlock({ currentIndex, total, className }: ProgressIndicatorBlockProps) {
  const progress = total > 0 ? (currentIndex / total) * 100 : 0
  
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-400">
          Shot {currentIndex + 1} of {total}
        </span>
        <span className="text-neutral-500 text-xs">
          {Math.round(progress)}% complete
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-brand-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

