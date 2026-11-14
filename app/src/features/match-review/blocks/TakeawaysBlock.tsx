/**
 * TakeawaysBlock — the few lines a player should read first.
 * Each line can open its evidence.
 */

import { Card, Icon } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { EvidenceRef, TakeawayModel } from '../models'

export interface TakeawaysBlockProps {
  takeaways: TakeawayModel[]
  onOpenEvidence: (evidence: EvidenceRef) => void
}

const DOT: Record<TakeawayModel['tone'], string> = {
  good: 'bg-result-winner',
  bad: 'bg-result-error',
  info: 'bg-callout-info',
}

export function TakeawaysBlock({ takeaways, onOpenEvidence }: TakeawaysBlockProps) {
  if (takeaways.length === 0) return null
  return (
    <Card className="p-4 md:p-5 border border-border">
      <h2 className="text-lg font-semibold text-primary">What this match says about you</h2>
      <ul className="mt-3 space-y-2">
        {takeaways.map((t) => (
          <li key={t.key} className="flex items-start gap-3">
            <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', DOT[t.tone])} aria-hidden />
            <span className="flex-1 text-sm md:text-base text-primary">{t.text}</span>
            {t.evidence && (
              <button
                type="button"
                onClick={() => onOpenEvidence(t.evidence!)}
                className="tag-control shrink-0 gap-1"
              >
                Rallies <Icon name="chevron-right" size="xs" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
