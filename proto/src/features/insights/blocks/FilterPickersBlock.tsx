import { DATE_CHOICES, filterChoices } from '@/rules/filters'
import type { InsightsFilters } from '@/rules/filters'
import type { MatchRecord } from '@/types/match'

export function FilterPickersBlock({
  draft,
  setDraft,
  tagged,
}: {
  draft: InsightsFilters
  setDraft: (next: InsightsFilters) => void
  tagged: MatchRecord[]
}) {
  const { opponents, events } = filterChoices(tagged)
  const withSaved = (options: string[], saved: string) => (options.includes(saved) ? options : [...options, saved])
  const pickers: { key: 'dates' | 'opponent' | 'event'; label: string; options: string[] }[] = [
    { key: 'dates', label: 'Dates', options: [...DATE_CHOICES] },
    { key: 'opponent', label: 'Opponent', options: withSaved(['Any', ...opponents], draft.opponent) },
    { key: 'event', label: 'Event', options: withSaved(['Any', ...events], draft.event) },
  ]
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              {picker.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      {draft.dates === 'From and to' ? (
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted">From</span>
            <input
              type="date"
              aria-label="From"
              className="btn-kind-field w-full rounded-md border border-border bg-bg-card px-2 text-sm text-primary"
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted">To</span>
            <input
              type="date"
              aria-label="To"
              className="btn-kind-field w-full rounded-md border border-border bg-bg-card px-2 text-sm text-primary"
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
