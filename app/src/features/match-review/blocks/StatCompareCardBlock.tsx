/**
 * StatCompareCardBlock — presentational Hero | label | Villain comparison card
 */

import { Card } from '@/ui-mine'
import type { StatCompareRowModel } from '../models'

export interface StatCompareCardBlockProps {
  title: string
  /** One-line story, shown in italics */
  story: string
  heroName: string
  villainName: string
  rows: StatCompareRowModel[]
  emptyMessage?: string
}

export function StatCompareCardBlock({
  title,
  story,
  heroName,
  villainName,
  rows,
  emptyMessage = 'Tag a set to fill this card',
}: StatCompareCardBlockProps) {
  return (
    <Card className="p-4 md:p-5 border border-neutral-700">
      <h3 className="text-lg font-semibold text-neutral-50">{title}</h3>
      <p className="mt-1 text-sm italic text-neutral-400">{story}</p>

      {rows.length === 0 ? (
        <p className="mt-6 mb-2 text-center text-sm text-neutral-500">{emptyMessage}</p>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-3 pb-2 border-b border-neutral-700 text-xs font-semibold uppercase tracking-wide text-neutral-400">
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
              <li
                key={row.key}
                className="grid grid-cols-[1fr_1.4fr_1fr] items-center gap-3 py-3"
              >
                <span className="text-left text-base font-semibold tabular-nums text-neutral-50">
                  {row.heroValue}
                </span>
                <span className="text-center text-sm text-neutral-400">{row.label}</span>
                <span className="text-right text-base font-semibold tabular-nums text-neutral-50">
                  {row.villainValue}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
