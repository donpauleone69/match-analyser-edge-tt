import { Button } from '@/ui-mine'
import { cn } from '@/helpers/utils'

export interface CompletionModalProps {
  setNumber: number
  finalScore: { player1: number; player2: number }
  player1Name: string
  player2Name: string
  onTagNextSet: () => void
  onBackToMatches: () => void
  onViewData: () => void
  className?: string
}

export function CompletionModal({
  setNumber,
  finalScore,
  player1Name,
  player2Name,
  onTagNextSet,
  onBackToMatches,
  onViewData,
  className
}: CompletionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={cn('bg-bg-card rounded-lg p-8 max-w-md w-full mx-4 border border-neutral-700', className)}>
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-neutral-50">Set {setNumber} Complete!</h2>
            <div className="mt-3 text-xl text-neutral-300">
              Final Score: <span className="font-semibold text-success">{player1Name} {finalScore.player1}</span>
              {' - '}
              <span className="font-semibold text-success">{player2Name} {finalScore.player2}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={onTagNextSet}
              className="!w-full !h-12"
            >
              Tag Next Set
            </Button>
            <Button
              variant="secondary"
              onClick={onViewData}
              className="!w-full !h-12"
            >
              View Data
            </Button>
            <Button
              variant="secondary"
              onClick={onBackToMatches}
              className="!w-full !h-12"
            >
              Back to Matches
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}





