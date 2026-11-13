/**
 * MatchListFiltersBlock — phone-first find controls for the match catalog.
 */

import { Button } from '@/ui-mine'
import type { MatchListFilters, MatchListSort } from '@/rules/matchList'
import { matchListFiltersActive } from '@/rules/matchList'

export interface MatchListFilterOption {
  id: string
  label: string
}

export interface MatchListFiltersBlockProps {
  filters: MatchListFilters
  opponents: MatchListFilterOption[]
  tournaments: MatchListFilterOption[]
  resultCount: number
  totalCount: number
  onChange: (next: MatchListFilters) => void
  onClear: () => void
}

const fieldClass =
  'w-full rounded-md border border-neutral-600 bg-bg-surface px-2.5 py-2 text-sm text-neutral-100'

const labelClass = 'flex flex-col gap-1 text-xs font-medium text-neutral-400'

export function MatchListFiltersBlock({
  filters,
  opponents,
  tournaments,
  resultCount,
  totalCount,
  onChange,
  onClear,
}: MatchListFiltersBlockProps) {
  const active = matchListFiltersActive(filters)

  return (
    <section className="rounded-xl border border-neutral-700 bg-bg-card p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Find</h2>
        <p className="text-xs text-neutral-500">
          {active ? `${resultCount} of ${totalCount}` : `${totalCount} matches`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className={labelClass}>
          Opponent
          <select
            className={fieldClass}
            value={filters.opponentId ?? ''}
            onChange={(e) => onChange({ ...filters, opponentId: e.target.value || null })}
          >
            <option value="">Any opponent</option>
            {opponents.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Tournament
          <select
            className={fieldClass}
            value={filters.tournamentId ?? ''}
            onChange={(e) => onChange({ ...filters, tournamentId: e.target.value || null })}
          >
            <option value="">Any tournament</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Match date from
          <input
            type="date"
            className={fieldClass}
            value={filters.matchDateFrom ?? ''}
            onChange={(e) => onChange({ ...filters, matchDateFrom: e.target.value || null })}
          />
        </label>

        <label className={labelClass}>
          Match date to
          <input
            type="date"
            className={fieldClass}
            value={filters.matchDateTo ?? ''}
            onChange={(e) => onChange({ ...filters, matchDateTo: e.target.value || null })}
          />
        </label>

        <label className={labelClass}>
          Date tagged from
          <input
            type="date"
            className={fieldClass}
            value={filters.taggedDateFrom ?? ''}
            onChange={(e) => onChange({ ...filters, taggedDateFrom: e.target.value || null })}
          />
        </label>

        <label className={labelClass}>
          Date tagged to
          <input
            type="date"
            className={fieldClass}
            value={filters.taggedDateTo ?? ''}
            onChange={(e) => onChange({ ...filters, taggedDateTo: e.target.value || null })}
          />
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          Sort by
          <select
            className={fieldClass}
            value={filters.sort}
            onChange={(e) => onChange({ ...filters, sort: e.target.value as MatchListSort })}
          >
            <option value="match_date">Match date</option>
            <option value="tagged_at">Date tagged</option>
            <option value="created_at">Date added</option>
          </select>
        </label>
      </div>

      {active && (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      )}
    </section>
  )
}
