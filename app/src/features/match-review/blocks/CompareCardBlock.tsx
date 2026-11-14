/**
 * CompareCardBlock — presentational Hero | label | Villain comparison card.
 *
 * Cells with evidence are buttons; clicking opens the Evidence drawer.
 * Colour is on the value only: green = better side, red = worse, amber = warning.
 * MA-115: denser token chrome; primary % + optional detail line.
 * MA-143: `emphasis="glance"` — tighter rows, quieter dashes, scannable labels.
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
  /** Serve/Receive glance cards (B0/C0) */
  emphasis?: 'glance' | 'detail'
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
  glance,
  onOpenEvidence,
}: {
  cell: MetricCellModel
  align: 'left' | 'right'
  active: boolean
  glance: boolean
  onOpenEvidence: (evidence: EvidenceRef) => void
}) {
  const empty = cell.text === '—'
  const stack = (
    <span
      className={cn(
        'flex flex-col gap-0.5 min-w-0',
        align === 'left' ? 'items-start text-left' : 'items-end text-right'
      )}
    >
      <span
        className={cn(
          'font-semibold tabular-nums leading-tight',
          glance ? 'text-[13px]' : 'text-sm',
          empty ? 'text-muted font-medium' : TONE_TEXT[cell.tone]
        )}
      >
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

function rowLeads(row: CompareRowModel): 'hero' | 'villain' | null {
  if (row.hero.tone === 'good' && row.villain.tone !== 'good') return 'hero'
  if (row.villain.tone === 'good' && row.hero.tone !== 'good') return 'villain'
  if (row.hero.tone === 'bad' && row.villain.tone !== 'bad') return 'villain'
  if (row.villain.tone === 'bad' && row.hero.tone !== 'bad') return 'hero'
  return null
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
  emphasis = 'detail',
  activeEvidenceTitle,
  onOpenEvidence,
}: CompareCardBlockProps) {
  const glance = emphasis === 'glance'
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-bg-card',
        glance ? 'px-2.5 py-2 md:px-3 md:py-2.5 space-y-1.5' : 'px-3 py-2.5 md:px-3.5 md:py-3 space-y-2.5'
      )}
    >
      <div className={cn('flex items-baseline justify-between gap-2', glance && 'min-h-0')}>
        <h3 className={cn('font-semibold text-primary', glance ? 'text-[13px]' : 'text-sm')}>
          <span className="sr-only">{id}</span>
          {title}
        </h3>
        {glance ? (
          <span className="text-[10px] uppercase tracking-wide text-muted shrink-0">Glance</span>
        ) : null}
      </div>
      {story ? <p className="mt-0.5 text-xs text-muted line-clamp-2">{story}</p> : null}

      {scoreline && scoreline.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Set scores">
          {scoreline.map((s) => (
            <span
              key={s.setNumber}
              className={cn(
                'inline-flex items-baseline gap-1.5 rounded-md px-2 py-1',
                s.heroWon === true && 'bg-result-winner-bg',
                s.heroWon === false && 'bg-result-error-bg',
                s.heroWon === null && 'bg-bg-elevated'
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
        <div className="rounded-md bg-bg-elevated/50 px-2.5 py-2 text-center">
          <p className="text-xs font-medium text-primary">Nothing to compare yet</p>
          <p className="mt-0.5 text-[11px] text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div>
          <div
            className={cn(
              'grid grid-cols-[1fr_1.1fr_1fr] gap-1.5 border-b border-border font-semibold uppercase tracking-wide text-muted',
              glance ? 'pb-0.5 text-[9px]' : 'gap-2 pb-1 text-[10px]'
            )}
          >
            <span className="truncate text-left" title={heroName}>
              {heroName}
            </span>
            <span />
            <span className="truncate text-right" title={villainName}>
              {villainName}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const lead = glance ? rowLeads(row) : null
              return (
                <li
                  key={row.key}
                  className={cn(
                    'grid grid-cols-[1fr_1.1fr_1fr] items-center',
                    glance ? 'gap-1.5 py-1' : 'gap-2 py-1.5',
                    lead === 'hero' && 'bg-result-winner-bg/40 -mx-1 px-1 rounded-sm',
                    lead === 'villain' && 'bg-result-error-bg/35 -mx-1 px-1 rounded-sm'
                  )}
                >
                  <ValueCell
                    cell={row.hero}
                    align="left"
                    glance={glance}
                    active={Boolean(activeEvidenceTitle && row.hero.evidence?.title === activeEvidenceTitle)}
                    onOpenEvidence={onOpenEvidence}
                  />
                  <span
                    className={cn(
                      'text-center leading-snug text-muted',
                      glance ? 'text-[10px] font-medium' : 'text-[11px]'
                    )}
                  >
                    {row.label}
                  </span>
                  <ValueCell
                    cell={row.villain}
                    align="right"
                    glance={glance}
                    active={Boolean(
                      activeEvidenceTitle && row.villain.evidence?.title === activeEvidenceTitle
                    )}
                    onOpenEvidence={onOpenEvidence}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
