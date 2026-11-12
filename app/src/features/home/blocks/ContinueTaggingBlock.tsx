/**
 * ContinueTaggingBlock — a set left part-way through tagging.
 */

import { Button, Icon } from '@/ui-mine'
import type { ContinueTaggingModel } from '../models'

export interface ContinueTaggingBlockProps {
  item: ContinueTaggingModel
  onContinue: (item: ContinueTaggingModel) => void
  onReview: (matchId: string) => void
}

export function ContinueTaggingBlock({ item, onContinue, onReview }: ContinueTaggingBlockProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-100 truncate">{item.title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          Set {item.setNumber} · {item.ralliesTagged === 1 ? '1 rally' : `${item.ralliesTagged} rallies`} tagged ·{' '}
          <span className="font-mono">{item.scoreLabel}</span>
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
