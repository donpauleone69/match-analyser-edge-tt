/**
 * HeadlineMetricsBlock — curated tap-target metrics (stats → evidence).
 */

import { cn } from '@/helpers/utils'
import type { EvidenceRef, HeadlineMetricModel } from '../models'
import { TONE_TEXT } from './CompareCardBlock'

export interface HeadlineMetricsBlockProps {
  headlines: HeadlineMetricModel[]
  activeEvidenceTitle?: string | null
  onOpenEvidence: (evidence: EvidenceRef) => void
}

export function HeadlineMetricsBlock({
  headlines,
  activeEvidenceTitle,
  onOpenEvidence,
}: HeadlineMetricsBlockProps) {
  if (headlines.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Headline stats">
      {headlines.map((h) => {
        const active = Boolean(h.evidence && activeEvidenceTitle === h.evidence.title)
        const body = (
          <>
            <span className="text-[11px] uppercase tracking-wide text-neutral-400">{h.label}</span>
            <span className={cn('mt-1 text-2xl font-bold tabular-nums', TONE_TEXT[h.tone])}>{h.text}</span>
          </>
        )
        if (!h.evidence) {
          return (
            <div
              key={h.key}
              className="rounded-xl border border-neutral-700 bg-bg-card px-3 py-3 flex flex-col"
            >
              {body}
            </div>
          )
        }
        const evidence = h.evidence
        return (
          <button
            key={h.key}
            type="button"
            onClick={() => onOpenEvidence(evidence)}
            title="Show the points behind this number"
            className={cn(
              'rounded-xl border border-neutral-700 bg-bg-card px-3 py-3 flex flex-col text-left',
              'hover:border-neutral-500 hover:bg-bg-elevated transition-colors',
              active && 'ring-1 ring-brand-primary/60 border-brand-primary/40'
            )}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
