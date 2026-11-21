import { filterChoices } from '@/rules/filters'
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
          <label key={picker.key} className="block space-y-1">
            <span className="text-xs font-semibold text-muted">{picker.label}</span>
            <select
              className="btn-kind-field w-full rounded-md border border-border bg-bg-card px-2 text-sm text-primary"
              value={draft[picker.key]}
              onChange={(e) => setDraft({ ...draft, [picker.key]: e.target.value })}
            >
              {picker.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
    </div>
  )
}
