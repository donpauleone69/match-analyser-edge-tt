import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_INSIGHTS_FILTERS, migrateFilters, type SavedFilters } from '@/rules/filters'
import type { InsightsFilters } from './models'

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
    return migrateFilters(JSON.parse(raw) as SavedFilters)
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
  return <InsightsFilterContext.Provider value={value}>{children}</InsightsFilterContext.Provider>
}

export function useInsightsFilters() {
  const ctx = useContext(InsightsFilterContext)
  if (!ctx) throw new Error('useInsightsFilters requires InsightsFilterProvider')
  return ctx
}
