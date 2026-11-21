import { activeLabels, countActive, filterMatchList } from '@/rules/filters'
import type { MatchRecord } from '@/types/match'
import type { MatchListFilters } from '@/types/filters'

/** Plain compute of the Matches list. No memo: it ran during render before. */
export function useDeriveMatchList(matches: MatchRecord[], filters: MatchListFilters) {
  const shown = filterMatchList(matches, filters)
  const active = activeLabels(filters)
  const n = countActive(filters)
  const hasMatches = matches.length > 0
  return { shown, active, n, hasMatches }
}
