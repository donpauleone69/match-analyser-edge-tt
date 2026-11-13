/**
 * ContextPolishBlock — soft nudge to add optional opponent / tournament.
 */

import { Button, Icon } from '@/ui-mine'
import type { ContextPolishModel } from '../models'

export interface ContextPolishBlockProps {
  item: ContextPolishModel
  onOpenDetails: (matchId: string) => void
}

export function ContextPolishBlock({ item, onOpenDetails }: ContextPolishBlockProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-100 truncate">{item.title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {item.dateLabel ? `${item.dateLabel} · ` : ''}
          {item.detailLabel}
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={() => onOpenDetails(item.matchId)}>
        <Icon name="user" size="sm" /> {item.actionLabel}
      </Button>
    </div>
  )
}
