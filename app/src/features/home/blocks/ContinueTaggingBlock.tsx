/**
 * ContinueTaggingBlock — a match left to tag (in progress or not started).
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
    item.kind === 'in_progress'
      ? 'border-amber-800/50 bg-amber-950/20'
      : 'border-neutral-700 bg-neutral-900/40'

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${tone}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-100 truncate">{item.title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {item.detailLabel}
          {item.kind === 'in_progress' && (
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
        <Icon name="play" size="sm" /> {item.actionLabel}
      </Button>
    </div>
  )
}
