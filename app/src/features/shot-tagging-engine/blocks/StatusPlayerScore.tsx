/**
 * StatusPlayerScore - 2-line player score display for StatusGrid
 * 
 * Displays player name and score stacked:
 * - PlayerName (top)
 * - Score (bottom)
 */

import { cn } from '@/helpers/utils'

export interface StatusPlayerScoreProps {
  playerName: string
  score: number
  className?: string
}

export function StatusPlayerScore({ playerName, score, className }: StatusPlayerScoreProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      <div className="text-xs text-neutral-300 font-medium">
        {playerName}
      </div>
      <div className="text-sm font-bold text-neutral-100">
        {score}
      </div>
    </div>
  )
}


