/**
 * HeadlineMetricsBlock — curated tap-target metrics (stats → evidence / focus).
 * Dense quiet chrome; optional detail + focusId for Serve/Receive (MA-115).
 */

import { cn } from '@/helpers/utils'
import type { EvidenceRef, HeadlineMetricModel } from '../models'
import { TONE_TEXT } from './CompareCardBlock'

export interface HeadlineMetricsBlockProps {
  headlines: HeadlineMetricModel[]
  activeEvidenceTitle?: string | null
  onOpenEvidence: (evidence: EvidenceRef, headline?: HeadlineMetricModel) => void
}

export function HeadlineMetricsBlock({
  headlines,
  activeEvidenceTitle,
  onOpenEvidence,
}: HeadlineMetricsBlockProps) {
  if (headlines.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Headline stats">
      {headlines.map((h) => {
        const active = Boolean(h.evidence && activeEvidenceTitle === h.evidence.title)
        const body = (
          <>
            <span className="text-[10px] uppercase tracking-wide text-muted leading-tight">
              {h.label}
            </span>
            <span className={cn('mt-0.5 text-xl font-bold tabular-nums leading-none', TONE_TEXT[h.tone])}>
              {h.text}
            </span>
            {h.detail ? (
              <span className="mt-0.5 text-[10px] tabular-nums text-muted leading-none">{h.detail}</span>
            ) : null}
          </>
        )
        if (!h.evidence) {
          return (
            <div
              key={h.key}
              className="rounded-lg border border-border bg-bg-card px-2.5 py-2 flex flex-col"
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
            onClick={() => onOpenEvidence(evidence, h)}
            title="Show the points behind this number"
            className={cn(
              'rounded-lg border border-border bg-bg-card px-2.5 py-2 flex flex-col text-left',
              'hover:border-border-strong hover:bg-bg-elevated/40 transition-colors',
              active && 'border-brand-primary/50 bg-bg-elevated/50'
            )}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
