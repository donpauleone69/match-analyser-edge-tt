/**
 * SetSetupBlock - Choose which set to tag
 * Updated to match DataViewer/Settings template
 */

import { Button } from '@/ui-mine/Button'
import { CheckCircle, Clock, Circle, ListOrdered } from 'lucide-react'

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
    <div className="w-full min-h-screen flex items-center justify-center bg-bg-surface p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-bg-card border border-neutral-700 rounded-lg p-4 md:p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
              <ListOrdered className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
              Select Set to Tag
            </h1>
            <p className="text-neutral-400 mt-2 text-sm md:text-base">
              Choose which set you want to tag or review
            </p>
          </div>
          
          {/* Set List */}
          <div className="space-y-3 mb-6">
            {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => {
              const isCompleted = completedSets.includes(setNum)
              const isNext = setNum === nextSetToTag && !hasCompletedAll
              
              return (
                <div
                  key={setNum}
                  className="flex items-center justify-between gap-3 p-3 md:p-4 bg-bg-shell rounded-lg border border-neutral-700 hover:border-neutral-600 transition-colors flex-wrap md:flex-nowrap"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                    ) : isNext ? (
                      <Clock className="h-5 w-5 text-blue-400 shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-neutral-600 shrink-0" />
                    )}
                    <span className="text-base md:text-lg font-semibold text-neutral-50">Set {setNum}</span>
                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded bg-green-900 text-green-200 text-xs font-medium">
                        Tagged
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
                    className="shrink-0"
                  >
                    {isCompleted ? 'Re-tag' : 'Tag'}
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Completion Message */}
          {hasCompletedAll && (
            <div className="mb-6 p-3 md:p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 font-medium text-sm md:text-base text-center">
                ✓ All {totalSets} sets have been tagged!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-neutral-700">
            <Button
              onClick={onComplete}
              variant="secondary"
              className="flex-1"
            >
              Done
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
        </div>
      </div>
    </div>
  )
}
