/**
 * CompareCardBlock — presentational Hero | label | Villain comparison card.
 *
 * Cells with evidence are buttons; clicking opens the Evidence drawer.
 * Colour is on the value only: green = better side, red = worse, amber = warning.
 * MA-115: denser token chrome; primary % + optional detail line.
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
  none: 'text-primary',
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
  const stack = (
    <span
      className={cn(
        'flex flex-col gap-0.5 min-w-0',
        align === 'left' ? 'items-start text-left' : 'items-end text-right'
      )}
    >
      <span className={cn('text-sm font-semibold tabular-nums leading-tight', TONE_TEXT[cell.tone])}>
        {cell.text}
      </span>
      {cell.detail ? (
        <span className="text-[10px] leading-tight text-muted tabular-nums">{cell.detail}</span>
      ) : null}
    </span>
  )

  if (!cell.evidence) {
    return stack
  }
  const evidence = cell.evidence
  return (
    <button
      type="button"
      onClick={() => onOpenEvidence(evidence)}
      title="Show the rallies behind this number"
      className={cn(
        'rounded-md px-1 -mx-1 py-0.5 underline decoration-dotted decoration-border underline-offset-4',
        'hover:bg-bg-elevated hover:decoration-muted transition-colors',
        align === 'left' ? 'justify-self-start' : 'justify-self-end',
        active && 'bg-bg-elevated ring-1 ring-brand-primary/50'
      )}
    >
      {stack}
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
  emptyMessage = 'Tag a set to fill this',
  activeEvidenceTitle,
  onOpenEvidence,
}: CompareCardBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2.5 md:px-3.5 md:py-3 space-y-2.5">
      <div>
        <h3 className="text-sm font-semibold text-primary">
          <span className="sr-only">{id}</span>
          {title}
        </h3>
        {story ? <p className="mt-0.5 text-xs text-muted line-clamp-2">{story}</p> : null}
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
                s.heroWon === null && 'border-border bg-bg-elevated'
              )}
            >
              <span className="text-[10px] text-muted">S{s.setNumber}</span>
              <span className="font-mono text-sm font-bold text-primary tabular-nums">
                {s.hero}–{s.villain}
              </span>
            </span>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div>
          <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2 pb-1 border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted">
            <span className="truncate text-left" title={heroName}>
              {heroName}
            </span>
            <span />
            <span className="truncate text-right" title={villainName}>
              {villainName}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.key} className="grid grid-cols-[1fr_1.2fr_1fr] items-center gap-2 py-1.5">
                <ValueCell
                  cell={row.hero}
                  align="left"
                  active={Boolean(activeEvidenceTitle && row.hero.evidence?.title === activeEvidenceTitle)}
                  onOpenEvidence={onOpenEvidence}
                />
                <span className="text-center text-[11px] leading-snug text-muted">{row.label}</span>
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
