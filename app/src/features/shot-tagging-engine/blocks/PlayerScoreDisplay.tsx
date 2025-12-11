/**
 * PlayerScoreDisplay - Standard score display component
 * 
 * Shows current match score in consistent format:
 * "Score: PlayerName1 X - Y PlayerName2"
 * 
 * Used in status bars across all phases.
 */

import { cn } from '@/helpers/utils'

export interface PlayerScoreDisplayProps {
  player1Name: string
  player2Name: string
  player1Score: number
  player2Score: number
  className?: string
}

export function PlayerScoreDisplay({ 
  player1Name, 
  player2Name, 
  player1Score, 
  player2Score, 
  className 
}: PlayerScoreDisplayProps) {
  return (
    <span className={cn('text-neutral-400', className)}>
      Score: {player1Name} {player1Score} - {player2Score} {player2Name}
    </span>
  )
}


