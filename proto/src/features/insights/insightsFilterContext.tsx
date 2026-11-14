import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

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

export function activeFilterLabels(filters: InsightsFilters): string[] {
  return [
    filters.matches !== 'All' ? `Matches: ${filters.matches}` : null,
    filters.opponent !== 'Any' ? `Opponent: ${filters.opponent}` : null,
    filters.tournament !== 'Any' ? `Tournament: ${filters.tournament}` : null,
    filters.dates !== 'Any' ? `Dates: ${filters.dates}` : null,
  ].filter(Boolean) as string[]
}
