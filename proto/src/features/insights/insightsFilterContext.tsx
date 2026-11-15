import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { MatchRecord } from '@/data/demoStore'

export type InsightsFilters = {
  matches: string
  opponent: string
  tournament: string
  dates: string
}

export const DEFAULT_INSIGHTS_FILTERS: InsightsFilters = {
  matches: 'All',
  opponent: 'Any',
  tournament: 'Any',
  dates: 'Any',
}

type FilterCtx = {
  filters: InsightsFilters
  setFilters: (next: InsightsFilters) => void
}

const InsightsFilterContext = createContext<FilterCtx | null>(null)

const FILTER_KEY = 'proto-insights-filters'

function readFilters(): InsightsFilters {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY)
    if (!raw) return DEFAULT_INSIGHTS_FILTERS
    const parsed = JSON.parse(raw) as InsightsFilters
    return { ...DEFAULT_INSIGHTS_FILTERS, ...parsed }
  } catch {
    return DEFAULT_INSIGHTS_FILTERS
  }
}

export function InsightsFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<InsightsFilters>(() => readFilters())
  const setFilters = (next: InsightsFilters) => {
    setFiltersState(next)
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  const value = useMemo(() => ({ filters, setFilters }), [filters])
  return (
    <InsightsFilterContext.Provider value={value}>{children}</InsightsFilterContext.Provider>
  )
}

export function useInsightsFilters() {
  const ctx = useContext(InsightsFilterContext)
  if (!ctx) throw new Error('useInsightsFilters requires InsightsFilterProvider')
  return ctx
}

/** The filters in force, or none where there is no filter (match Insights). */
export function useInsightsFilterValues(): InsightsFilters {
  return useContext(InsightsFilterContext)?.filters ?? DEFAULT_INSIGHTS_FILTERS
}

const DAY_MS = 86_400_000
const dayOf = (date: string) => Date.parse(`${date}T00:00:00Z`)

/**
 * The matches a filter keeps. Dates are judged against the newest dated match
 * in the list, not today, so the seeded matches answer the same on any day.
 */
export function filterMatches(matches: MatchRecord[], f: InsightsFilters): MatchRecord[] {
  const byDate = matches.filter((m) => m.date).sort((a, b) => b.date.localeCompare(a.date))
  const newest = byDate[0]?.date
  let out = matches
  if (f.opponent !== 'Any') out = out.filter((m) => m.opponent.trim() === f.opponent)
  if (f.tournament !== 'Any') out = out.filter((m) => m.event.trim() === f.tournament)
  if (f.dates !== 'Any') {
    // This week runs from the Monday on or before the newest match.
    const sinceMonday = newest ? (new Date(dayOf(newest)).getUTCDay() + 6) % 7 : 0
    const days = f.dates === 'This week' ? sinceMonday : 30
    out = out.filter((m) => newest && m.date && dayOf(newest) - dayOf(m.date) <= days * DAY_MS)
  }
  if (f.matches === 'This month') {
    out = out.filter((m) => newest && m.date.slice(0, 7) === newest.slice(0, 7))
  }
  if (f.matches === 'Last 3') {
    const last = new Set(byDate.slice(0, 3).map((m) => m.id))
    out = out.filter((m) => last.has(m.id))
  }
  return out
}

/** Opponents and events to pick from: the ones the given matches have. */
export function filterChoices(matches: MatchRecord[]): { opponents: string[]; events: string[] } {
  const unique = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))]
  return {
    opponents: unique(matches.map((m) => m.opponent)),
    events: unique(matches.map((m) => m.event)),
  }
}

export function activeFilterLabels(filters: InsightsFilters): string[] {
  return [
    filters.matches !== 'All' ? `Matches: ${filters.matches}` : null,
    filters.opponent !== 'Any' ? `Opponent: ${filters.opponent}` : null,
    filters.tournament !== 'Any' ? `Tournament: ${filters.tournament}` : null,
    filters.dates !== 'Any' ? `Dates: ${filters.dates}` : null,
  ].filter(Boolean) as string[]
}
