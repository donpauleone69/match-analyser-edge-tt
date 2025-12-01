/**
 * ScoreDisplayBlock — Displays current match score
 * 
 * Presentational component — props in, JSX out.
 */

import { cn } from '@/lib/utils'
import { Badge } from '@/ui-mine'
import type { PlayerId } from '@/rules/types'

export interface ScoreDisplayBlockProps {
  player1Name: string
  player2Name: string
  setScore: string // e.g. "2-1"
  pointsScore: string // e.g. "7-4"
  currentServerId: PlayerId
  className?: string
}

export function ScoreDisplayBlock({
  player1Name,
  player2Name,
  setScore,
  pointsScore,
  currentServerId,
  className,
}: ScoreDisplayBlockProps) {
  const [p1Points, p2Points] = pointsScore.split('-').map(Number)
  
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Set score */}
      <div className="flex items-center justify-between text-sm text-neutral-400">
        <span>Sets</span>
        <span className="font-mono">{setScore}</span>
      </div>
      
      {/* Points display */}
      <div className="flex items-center gap-4">
        {/* Player 1 */}
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium truncate max-w-[100px]',
              currentServerId === 'player1' ? 'text-brand-primary' : 'text-neutral-300'
            )}>
              {player1Name}
            </span>
            {currentServerId === 'player1' && (
              <Badge variant="brand" className="text-[10px] px-1.5 py-0">
                SERVE
              </Badge>
            )}
          </div>
          <span className={cn(
            'text-4xl font-bold font-mono',
            p1Points > p2Points ? 'text-success' : 'text-neutral-100'
          )}>
            {p1Points}
          </span>
        </div>
        
        {/* Separator */}
        <div className="text-2xl text-neutral-500 font-light">—</div>
        
        {/* Player 2 */}
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-2">
            {currentServerId === 'player2' && (
              <Badge variant="brand" className="text-[10px] px-1.5 py-0">
                SERVE
              </Badge>
            )}
            <span className={cn(
              'text-sm font-medium truncate max-w-[100px]',
              currentServerId === 'player2' ? 'text-brand-primary' : 'text-neutral-300'
            )}>
              {player2Name}
            </span>
          </div>
          <span className={cn(
            'text-4xl font-bold font-mono',
            p2Points > p1Points ? 'text-success' : 'text-neutral-100'
          )}>
            {p2Points}
          </span>
        </div>
      </div>
    </div>
  )
}

