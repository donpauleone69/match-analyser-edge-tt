import { useState } from 'react'
import { Button } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { validateSetScore } from '@/rules/validate/validateSetScore'
import { ButtonGrid } from './ButtonGrid'

export interface SetupData {
  nextServerId: 'player1' | 'player2'
  p1Score: number
  p2Score: number
}

export interface SetupControlsBlockProps {
  player1Name: string
  player2Name: string
  onComplete: (setup: SetupData) => void
  className?: string
}

export function SetupControlsBlock({
  player1Name,
  player2Name,
  onComplete,
  className
}: SetupControlsBlockProps) {
  const [nextServer, setNextServer] = useState<'player1' | 'player2'>('player1')
  const [p1Score, setP1Score] = useState(0)
  const [p2Score, setP2Score] = useState(0)
  
  const handleStartTagging = () => {
    // Validate scores
    const validation = validateSetScore(p1Score, p2Score)
    if (!validation.valid) {
      alert(validation.error)
      return
    }
    
    onComplete({
      nextServerId: nextServer,
      p1Score,
      p2Score
    })
  }
  
  const incrementScore = (player: 'p1' | 'p2') => {
    if (player === 'p1') {
      setP1Score(prev => Math.min(prev + 1, 20))
    } else {
      setP2Score(prev => Math.min(prev + 1, 20))
    }
  }
  
  const decrementScore = (player: 'p1' | 'p2') => {
    if (player === 'p1') {
      setP1Score(prev => Math.max(prev - 1, 0))
    } else {
      setP2Score(prev => Math.max(prev - 1, 0))
    }
  }
  
  return (
    <div className={cn('bg-bg-card border-t border-neutral-700', className)}>
      <ButtonGrid columns={4}>
        {/* Column 1: Labels */}
        <div className="w-full h-full flex flex-col items-start justify-center gap-1 p-1 px-2">
          <span className="text-[11px] text-neutral-400 leading-tight">Initial Server:</span>
          <span className="text-[11px] text-neutral-400 leading-tight">Initial Score:</span>
        </div>
        
        {/* Column 2: Player 1 */}
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
          <Button
            variant={nextServer === 'player1' ? 'primary' : 'secondary'}
            onClick={() => setNextServer('player1')}
            className="w-full h-8 text-[11px] font-semibold"
          >
            {player1Name}
          </Button>
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => decrementScore('p1')}
              disabled={p1Score === 0}
              className={cn(
                'w-5 h-5 rounded bg-neutral-700 text-white font-bold text-xs',
                'hover:bg-neutral-600 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              −
            </button>
            <span className="w-5 text-center font-semibold text-neutral-200 text-xs">{p1Score}</span>
            <button
              onClick={() => incrementScore('p1')}
              disabled={p1Score === 20}
              className={cn(
                'w-5 h-5 rounded bg-neutral-700 text-white font-bold text-xs',
                'hover:bg-neutral-600 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              +
            </button>
          </div>
        </div>
        
        {/* Column 3: Player 2 */}
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
          <Button
            variant={nextServer === 'player2' ? 'primary' : 'secondary'}
            onClick={() => setNextServer('player2')}
            className="w-full h-8 text-[11px] font-semibold"
          >
            {player2Name}
          </Button>
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => decrementScore('p2')}
              disabled={p2Score === 0}
              className={cn(
                'w-5 h-5 rounded bg-neutral-700 text-white font-bold text-xs',
                'hover:bg-neutral-600 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              −
            </button>
            <span className="w-5 text-center font-semibold text-neutral-200 text-xs">{p2Score}</span>
            <button
              onClick={() => incrementScore('p2')}
              disabled={p2Score === 20}
              className={cn(
                'w-5 h-5 rounded bg-neutral-700 text-white font-bold text-xs',
                'hover:bg-neutral-600 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              +
            </button>
          </div>
        </div>
        
        {/* Column 4: Start Button */}
        <div className="w-full h-full flex items-center justify-center p-1">
          <Button
            variant="primary"
            onClick={handleStartTagging}
            className="w-full h-8 text-[11px] font-bold"
          >
            Start
          </Button>
        </div>
      </ButtonGrid>
    </div>
  )
}

