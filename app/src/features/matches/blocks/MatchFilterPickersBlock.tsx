import { FilterSelect, textOptions } from './FilterSelectBlock'
import { MATCH_STATUSES as STATUSES, type MatchListFilters } from '@/types/filters'
import type { NameRef } from '@/rules/filters'

function nameOptions(rows: readonly NameRef[], saved: string) {
  const options = [{ value: 'Any', label: 'Any' }, ...rows.map((row) => ({ value: row.id, label: row.name }))]
  if (options.some((option) => option.value === saved)) return options
  const known = rows.find((row) => row.id === saved)
  return [...options, { value: saved, label: known?.name ?? saved }]
}

export function MatchFilterPickersBlock({
  draft,
  setDraft,
  opponents,
  events,
}: {
  draft: MatchListFilters
  setDraft: (next: MatchListFilters) => void
  opponents: readonly NameRef[]
  events: readonly NameRef[]
}) {
  const pickers: { key: keyof MatchListFilters; label: string; options: { value: string; label: string }[] }[] = [
    { key: 'opponent', label: 'Opponent', options: nameOptions(opponents, draft.opponent) },
    { key: 'event', label: 'Event', options: nameOptions(events, draft.event) },
    { key: 'status', label: 'Status', options: textOptions(STATUSES) },
  ]
  return (
    <div className="grid grid-cols-1 gap-3">
      {pickers
        .filter((picker) => picker.options.length > 1)
        .map((picker) => (
          <FilterSelect
            key={picker.key}
            label={picker.label}
            value={draft[picker.key]}
            options={picker.options}
            onChange={(value) => setDraft({ ...draft, [picker.key]: value })}
          />
        ))}
    </div>
  )
}
