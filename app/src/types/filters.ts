/** The Matches list filter. */

export type MatchStatus = 'Any' | 'Not tagged' | 'Part tagged' | 'Tagged'

export const MATCH_STATUSES: MatchStatus[] = ['Any', 'Not tagged', 'Part tagged', 'Tagged']

export type MatchListFilters = {
  opponent: string
  event: string
  status: MatchStatus
}

export const DEFAULT_MATCH_LIST_FILTERS: MatchListFilters = {
  opponent: 'Any',
  event: 'Any',
  status: 'Any',
}
