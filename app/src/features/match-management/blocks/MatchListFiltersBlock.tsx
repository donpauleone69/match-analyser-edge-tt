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

const labelClass = 'flex flex-col gap-0.5 text-[11px] font-medium text-neutral-400'

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
    <section className="rounded-xl border border-neutral-700 bg-bg-card p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Filters</h2>
        <div className="flex items-center gap-2">
          <p className="text-xs text-neutral-500">
            {active
              ? `${resultCount} of ${totalCount}`
              : `${totalCount} ${totalCount === 1 ? 'match' : 'matches'}`}
          </p>
          {active && (
            <Button size="sm" variant="secondary" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <label className={`${labelClass} col-span-2 sm:col-span-1`}>
          Opponent
          <select
            className={fieldClass}
            value={filters.opponentId ?? ''}
            onChange={(e) => onChange({ ...filters, opponentId: e.target.value || null })}
            aria-describedby={opponents.length === 0 ? 'find-opp-hint' : undefined}
          >
            <option value="">Any</option>
            {opponents.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {opponents.length === 0 && (
            <span id="find-opp-hint" className="text-[10px] font-normal text-neutral-500">
              No named opponents yet — add on Details (optional).
            </span>
          )}
        </label>

        <label className={`${labelClass} col-span-2 sm:col-span-1`}>
          Tournament
          <select
            className={fieldClass}
            value={filters.tournamentId ?? ''}
            onChange={(e) => onChange({ ...filters, tournamentId: e.target.value || null })}
            aria-describedby={tournaments.length === 0 ? 'find-tour-hint' : undefined}
          >
            <option value="">Any</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {tournaments.length === 0 && (
            <span id="find-tour-hint" className="text-[10px] font-normal text-neutral-500">
              None linked yet — add on Details (optional).
            </span>
          )}
        </label>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-neutral-500">Match date</p>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            From
            <input
              type="date"
              className={fieldClass}
              value={filters.matchDateFrom ?? ''}
              onChange={(e) => onChange({ ...filters, matchDateFrom: e.target.value || null })}
            />
          </label>
          <label className={labelClass}>
            To
            <input
              type="date"
              className={fieldClass}
              value={filters.matchDateTo ?? ''}
              onChange={(e) => onChange({ ...filters, matchDateTo: e.target.value || null })}
            />
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-neutral-500">Date tagged</p>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            From
            <input
              type="date"
              className={fieldClass}
              value={filters.taggedDateFrom ?? ''}
              onChange={(e) => onChange({ ...filters, taggedDateFrom: e.target.value || null })}
            />
          </label>
          <label className={labelClass}>
            To
            <input
              type="date"
              className={fieldClass}
              value={filters.taggedDateTo ?? ''}
              onChange={(e) => onChange({ ...filters, taggedDateTo: e.target.value || null })}
            />
          </label>
        </div>
      </div>

      <label className={labelClass}>
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
    </section>
  )
}
