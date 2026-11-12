/**
 * ReviewShotsListBlock — shots flagged Technical / Tactical in Pass 1.
 */

import type { ReviewShotRowModel } from '../models'

export interface ReviewShotsListBlockProps {
  rows: ReviewShotRowModel[]
}

export function ReviewShotsListBlock({ rows }: ReviewShotsListBlockProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">Shots for review</h2>
        <p className="text-sm italic text-neutral-400">
          Contacts you flagged while tagging — technical includes wing and stroke.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3">
          No shots flagged yet. In Pass 1, mark a shot Technical or Tactical under Review.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 overflow-hidden">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-start justify-between gap-3 px-3 py-2.5 bg-neutral-900/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-100 truncate">{row.label}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{row.detail}</p>
              </div>
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-amber-200/90 border border-amber-700/50 rounded px-1.5 py-0.5">
                {row.kindLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
