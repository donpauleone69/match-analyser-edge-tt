/**
 * SetSetupBlock - Choose which set to tag
 */

import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'

interface SetSetupBlockProps {
  totalSets: number
  completedSets: number[]
  onSelectSet: (setNumber: number) => void
  onComplete: () => void
}

export function SetSetupBlock({
  totalSets,
  completedSets,
  onSelectSet,
  onComplete,
}: SetSetupBlockProps) {
  const hasCompletedAll = completedSets.length === totalSets
  const nextSetToTag = hasCompletedAll ? 1 : completedSets.length + 1

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-neutral-50 mb-6">
        Which Set to Tag?
      </h2>
      
      <div className="space-y-4 mb-6">
        {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => {
          const isCompleted = completedSets.includes(setNum)
          const isNext = setNum === nextSetToTag && !hasCompletedAll
          
          return (
            <div
              key={setNum}
              className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-neutral-50">Set {setNum}</span>
                {isCompleted && (
                  <span className="px-2 py-0.5 rounded bg-green-900 text-green-200 text-xs font-medium">
                    ✓ Tagged
                  </span>
                )}
                {isNext && !isCompleted && (
                  <span className="px-2 py-0.5 rounded bg-blue-900 text-blue-200 text-xs font-medium">
                    Next
                  </span>
                )}
              </div>
              
              <Button
                size="sm"
                onClick={() => onSelectSet(setNum)}
                variant={isNext ? 'primary' : 'secondary'}
              >
                {isCompleted ? 'Re-tag' : 'Tag Set'}
              </Button>
            </div>
          )
        })}
      </div>

      {hasCompletedAll && (
        <div className="text-center p-4 bg-green-900/20 border border-green-700 rounded-lg mb-4">
          <p className="text-green-400 font-medium">
            ✓ All {totalSets} sets have been tagged!
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onComplete}
          variant="secondary"
          className="flex-1"
        >
          Done Tagging
        </Button>
        {!hasCompletedAll && (
          <Button
            onClick={() => onSelectSet(nextSetToTag)}
            className="flex-1"
          >
            Tag Set {nextSetToTag}
          </Button>
        )}
      </div>
    </Card>
  )
}

