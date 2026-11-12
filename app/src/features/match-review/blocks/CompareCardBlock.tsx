/**
 * CompareCardBlock — presentational Hero | label | Villain comparison card.
 *
 * Cells with evidence are buttons; clicking opens the Evidence drawer.
 * Colour is on the value only: green = better side, red = worse, amber = warning.
 */

import { Card } from '@/ui-mine'
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
    <Card className="p-4 md:p-5 border border-neutral-700">
      <h3 className="text-lg font-semibold text-neutral-50">
        <span className="text-neutral-500 text-sm font-mono mr-2">{id}</span>
        {title}
      </h3>
      <p className="mt-1 text-sm italic text-neutral-400">{story}</p>

      {scoreline && scoreline.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Set scores">
          {scoreline.map((s) => (
            <span
              key={s.setNumber}
              className={cn(
                'inline-flex items-baseline gap-2 rounded-lg border px-3 py-1.5',
                s.heroWon === true && 'border-result-winner/60 bg-result-winner-bg',
                s.heroWon === false && 'border-result-error/60 bg-result-error-bg',
                s.heroWon === null && 'border-neutral-700 bg-neutral-900/50'
              )}
            >
              <span className="text-[11px] uppercase tracking-wide text-neutral-400">Set {s.setNumber}</span>
              <span className="font-mono text-lg font-bold text-neutral-50">
                {s.hero}–{s.villain}
              </span>
            </span>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-6 mb-2 text-center text-sm text-neutral-500">{emptyMessage}</p>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-3 pb-2 border-b border-neutral-700 text-xs font-semibold uppercase tracking-wide text-neutral-400">
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
              <li key={row.key} className="grid grid-cols-[1fr_1.3fr_1fr] items-center gap-3 py-2.5">
                <ValueCell
                  cell={row.hero}
                  align="left"
                  active={Boolean(activeEvidenceTitle && row.hero.evidence?.title === activeEvidenceTitle)}
                  onOpenEvidence={onOpenEvidence}
                />
                <span className="text-center text-sm text-neutral-400">{row.label}</span>
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
    </Card>
  )
}
