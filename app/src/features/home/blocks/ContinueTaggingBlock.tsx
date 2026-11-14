/**
 * ContinueTaggingBlock — a match left to tag or finish incomplete points.
 */

import { Button, Icon } from '@/ui-mine'
import type { ContinueTaggingModel } from '../models'

export interface ContinueTaggingBlockProps {
  item: ContinueTaggingModel
  onContinue: (item: ContinueTaggingModel) => void
  onReview: (matchId: string) => void
}

export function ContinueTaggingBlock({ item, onContinue, onReview }: ContinueTaggingBlockProps) {
  const tone =
    item.kind === 'fix_incomplete' || item.kind === 'in_progress'
      ? 'border-callout-warning-border bg-callout-warning-bg'
      : 'border-border'
  const showScore = item.kind === 'in_progress' || item.kind === 'fix_incomplete'
  const actionIcon = item.kind === 'fix_incomplete' ? 'edit' : 'play'

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 ${tone}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-100 truncate">{item.title}</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {item.detailLabel}
          {showScore && (
            <>
              {' '}
              · <span className="font-mono tabular-nums">{item.scoreLabel}</span>
            </>
          )}
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={() => onReview(item.matchId)}>
        Review
      </Button>
      <Button size="sm" onClick={() => onContinue(item)}>
        <Icon name={actionIcon} size="sm" /> {item.actionLabel}
      </Button>
    </div>
  )
}
