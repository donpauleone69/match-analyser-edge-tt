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
      ? 'border-amber-800/50 bg-amber-950/20'
      : 'border-neutral-700 bg-neutral-900/40'
  const showScore = item.kind === 'in_progress' || item.kind === 'fix_incomplete'
  const actionIcon = item.kind === 'fix_incomplete' ? 'edit' : 'play'

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${tone}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-100 truncate">{item.title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {item.detailLabel}
          {showScore && (
            <>
              {' '}
              · <span className="font-mono">{item.scoreLabel}</span>
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
