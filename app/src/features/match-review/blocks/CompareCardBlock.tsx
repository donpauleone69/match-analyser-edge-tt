/**
 * CompareCardBlock — presentational Hero | label | Villain comparison card.
 *
 * Cells with evidence are buttons; clicking opens the Evidence drawer.
 * Colour is on the value only: green = better side, red = worse, amber = warning.
 */

import { cn } from '@/helpers/utils'
import type { CellTone, CompareRowModel, EvidenceRef, MetricCellModel, SetScoreChipModel } from '../models'

export interface CompareCardBlockProps {
  id: string
  title: string
  story: string
  heroName: string
  villainName: string
  rows: CompareRowModel[]
  scoreline?: SetScoreChipModel[]
  emptyMessage?: string
  activeEvidenceTitle?: string | null
  onOpenEvidence: (evidence: EvidenceRef) => void
}

export const TONE_TEXT: Record<CellTone, string> = {
  good: 'text-result-winner',
  bad: 'text-result-error',
  amber: 'text-warning',
  none: 'text-neutral-50',
}

function ValueCell({
  cell,
  align,
  active,
  onOpenEvidence,
}: {
  cell: MetricCellModel
  align: 'left' | 'right'
  active: boolean
  onOpenEvidence: (evidence: EvidenceRef) => void
}) {
  const text = (
    <span className={cn('text-base font-semibold tabular-nums', TONE_TEXT[cell.tone])}>
      {cell.text}
    </span>
  )
  if (!cell.evidence) {
    return <span className={align === 'left' ? 'text-left' : 'text-right'}>{text}</span>
  }
  const evidence = cell.evidence
  return (
    <button
      type="button"
      onClick={() => onOpenEvidence(evidence)}
      title="Show the rallies behind this number"
      className={cn(
        'rounded-md px-1.5 -mx-1.5 py-0.5 underline decoration-dotted decoration-neutral-600 underline-offset-4 hover:bg-neutral-800 hover:decoration-neutral-300 transition-colors',
        align === 'left' ? 'justify-self-start text-left' : 'justify-self-end text-right',
        active && 'bg-neutral-800 ring-1 ring-brand-primary/60'
      )}
    >
      {text}
    </button>
  )
}

export function CompareCardBlock({
  id,
  title,
  story,
  heroName,
  villainName,
  rows,
  scoreline,
  emptyMessage = 'Tag a set to fill this card',
  activeEvidenceTitle,
  onOpenEvidence,
}: CompareCardBlockProps) {
  return (
    <div className="rounded-lg border border-neutral-800 px-3 py-3 md:px-4 md:py-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-100">
          <span className="sr-only">{id}</span>
          {title}
        </h3>
        {story ? <p className="mt-0.5 text-xs text-neutral-500">{story}</p> : null}
      </div>

      {scoreline && scoreline.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Set scores">
          {scoreline.map((s) => (
            <span
              key={s.setNumber}
              className={cn(
                'inline-flex items-baseline gap-1.5 rounded-md border px-2 py-1',
                s.heroWon === true && 'border-result-winner/60 bg-result-winner-bg',
                s.heroWon === false && 'border-result-error/60 bg-result-error-bg',
                s.heroWon === null && 'border-neutral-800 bg-neutral-900/50'
              )}
            >
              <span className="text-[10px] text-neutral-500">S{s.setNumber}</span>
              <span className="font-mono text-sm font-bold text-neutral-50 tabular-nums">
                {s.hero}–{s.villain}
              </span>
            </span>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-2 text-center text-sm text-neutral-500">{emptyMessage}</p>
      ) : (
        <div>
          <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-2 pb-1.5 border-b border-neutral-800 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            <span className="truncate text-left" title={heroName}>
              {heroName}
            </span>
            <span />
            <span className="truncate text-right" title={villainName}>
              {villainName}
            </span>
          </div>
          <ul className="divide-y divide-neutral-800">
            {rows.map((row) => (
              <li key={row.key} className="grid grid-cols-[1fr_1.3fr_1fr] items-center gap-2 py-2">
                <ValueCell
                  cell={row.hero}
                  align="left"
                  active={Boolean(activeEvidenceTitle && row.hero.evidence?.title === activeEvidenceTitle)}
                  onOpenEvidence={onOpenEvidence}
                />
                <span className="text-center text-xs text-neutral-400">{row.label}</span>
                <ValueCell
                  cell={row.villain}
                  align="right"
                  active={Boolean(activeEvidenceTitle && row.villain.evidence?.title === activeEvidenceTitle)}
                  onOpenEvidence={onOpenEvidence}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
