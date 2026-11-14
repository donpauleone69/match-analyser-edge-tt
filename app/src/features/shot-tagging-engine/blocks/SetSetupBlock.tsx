/**
 * SetSetupBlock - Choose which set to tag
 */

import { Button, Icon } from '@/ui-mine'

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
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-neutral-50 flex items-center gap-2">
              <Icon name="list-video" size="md" className="text-brand-primary" />
              Select set
            </h1>
            <p className="text-neutral-500 mt-1 text-sm">Tag or re-tag a set.</p>
          </div>

          <div className="space-y-2">
            {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => {
              const isCompleted = completedSets.includes(setNum)
              const isNext = setNum === nextSetToTag && !hasCompletedAll

              return (
                <div
                  key={setNum}
                  className="flex items-center justify-between gap-3 p-3 bg-bg-shell rounded-lg border border-border hover:border-border-strong transition-colors flex-wrap md:flex-nowrap"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {isCompleted ? (
                      <Icon name="check" size="sm" className="text-result-winner shrink-0" />
                    ) : isNext ? (
                      <Icon name="clock" size="sm" className="text-callout-info shrink-0" />
                    ) : (
                      <Icon name="circle" size="sm" className="text-neutral-500 shrink-0" />
                    )}
                    <span className="text-base font-semibold text-neutral-50">Set {setNum}</span>
                    {isCompleted && (
                      <span className="px-1.5 py-0.5 rounded-md bg-result-winner-bg text-result-winner text-[11px] font-medium">
                        Tagged
                      </span>
                    )}
                    {isNext && !isCompleted && (
                      <span className="px-1.5 py-0.5 rounded-md bg-callout-info-bg text-callout-info border border-callout-info-border text-[11px] font-medium">
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

          {hasCompletedAll && (
            <div className="p-3 bg-result-winner-bg border border-result-winner/40 rounded-lg">
              <p className="text-result-winner font-medium text-sm text-center">
                All {totalSets} sets tagged
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-border">
            <Button onClick={onComplete} variant="secondary" className="flex-1">
              Done
            </Button>
            {!hasCompletedAll && (
              <Button onClick={() => onSelectSet(nextSetToTag)} className="flex-1">
                Tag Set {nextSetToTag}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
