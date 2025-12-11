import { Button } from '@/ui-mine'
import { cn } from '@/helpers/utils'

export interface SetEndWarningBlockProps {
  currentScore: { player1: number; player2: number }
  setEndScore: { player1: number; player2: number }
  onSaveSet: () => void
  onContinueTagging: () => void
  className?: string
}

export function SetEndWarningBlock({
  currentScore,
  setEndScore,
  onSaveSet,
  onContinueTagging,
  className
}: SetEndWarningBlockProps) {
  return (
    <div className={cn('bg-warning/10 border-t border-warning/30 px-4 py-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-warning text-lg">⚠️</span>
          <span className="text-sm text-neutral-200">
            Set end detected at <span className="font-semibold">{setEndScore.player1}-{setEndScore.player2}</span>
            {(currentScore.player1 !== setEndScore.player1 || currentScore.player2 !== setEndScore.player2) && (
              <>, now at <span className="font-semibold">{currentScore.player1}-{currentScore.player2}</span></>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={onSaveSet}
            className="!h-9 !text-sm"
          >
            Save Set
          </Button>
          <Button
            variant="secondary"
            onClick={onContinueTagging}
            className="!h-9 !text-sm"
          >
            Continue Tagging
          </Button>
        </div>
      </div>
    </div>
  )
}


