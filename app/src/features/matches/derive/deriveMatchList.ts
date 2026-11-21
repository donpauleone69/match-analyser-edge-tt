import { activeLabels, countActive, filterMatchList, resolveNameFilters, type NameRef } from '@/rules/filters'
import type { MatchRecord } from '@/types/match'
import type { MatchListFilters } from '@/types/filters'

/** Plain compute of the Matches list. No memo: it ran during render before. */
export function useDeriveMatchList(
  matches: MatchRecord[],
  filters: MatchListFilters,
  opponents: readonly NameRef[],
  events: readonly NameRef[],
) {
  const named = resolveNameFilters(filters, opponents, events)
  const shown = filterMatchList(matches, named)
  const active = activeLabels(named)
  const n = countActive(filters)
  const hasMatches = matches.length > 0
  return { shown, active, n, hasMatches }
}
