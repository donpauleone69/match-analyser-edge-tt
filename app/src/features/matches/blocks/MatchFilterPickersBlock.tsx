import { filterChoices } from '@/rules/filters'
import { FilterSelect } from './FilterSelectBlock'
import {
  MATCH_STATUSES as STATUSES,
  type MatchListFilters,
} from '@/types/filters'
import type { MatchRecord } from '@/types/match'

export function MatchFilterPickersBlock({
  draft,
  setDraft,
  matches,
}: {
  draft: MatchListFilters
  setDraft: (next: MatchListFilters) => void
  matches: MatchRecord[]
}) {
  const { opponents, events } = filterChoices(matches)
  const withSaved = (options: string[], saved: string) =>
    options.includes(saved) ? options : [...options, saved]
  const pickers: { key: keyof MatchListFilters; label: string; options: string[] }[] = [
    { key: 'opponent', label: 'Opponent', options: withSaved(['Any', ...opponents], draft.opponent) },
    { key: 'event', label: 'Event', options: withSaved(['Any', ...events], draft.event) },
    { key: 'status', label: 'Status', options: STATUSES },
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
