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
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-100 truncate">{item.title}</p>
        <p className="text-xs text-neutral-500 mt-0.5">
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
