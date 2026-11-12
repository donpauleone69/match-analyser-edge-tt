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
  info: 'bg-sky-400',
}

export function TakeawaysBlock({ takeaways, onOpenEvidence }: TakeawaysBlockProps) {
  if (takeaways.length === 0) return null
  return (
    <Card className="p-4 md:p-5 border border-neutral-700">
      <h2 className="text-lg font-semibold text-neutral-50">What this match says about you</h2>
      <ul className="mt-3 space-y-2">
        {takeaways.map((t) => (
          <li key={t.key} className="flex items-start gap-3">
            <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', DOT[t.tone])} aria-hidden />
            <span className="flex-1 text-sm md:text-base text-neutral-200">{t.text}</span>
            {t.evidence && (
              <button
                type="button"
                onClick={() => onOpenEvidence(t.evidence!)}
                className="shrink-0 inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-50 border border-neutral-700 hover:border-neutral-500 rounded-md px-2 py-1"
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
