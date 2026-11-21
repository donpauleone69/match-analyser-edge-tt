import { derivePhase } from '@/rules/match'
import type { MatchRecord } from '@/types/match'
import type { MatchListFilters, MatchStatus } from '@/types/filters'

function countActive(f: MatchListFilters): number {
  let n = 0
  if (f.opponent !== 'Any') n++
  if (f.event !== 'Any') n++
  if (f.status !== 'Any') n++
  return n
}

function matchesStatus(match: MatchRecord, status: MatchStatus): boolean {
  if (status === 'Any') return true
  const phase = derivePhase(match)
  if (status === 'Not tagged') return phase === 'new' || phase === 'ready'
  if (status === 'Part tagged') return phase === 'partial'
  return phase === 'complete'
}

function filterMatchList(matches: MatchRecord[], f: MatchListFilters): MatchRecord[] {
  return matches.filter((m) => {
    if (f.opponent !== 'Any' && m.opponent.trim() !== f.opponent) return false
    if (f.event !== 'Any' && m.event.trim() !== f.event) return false
    return matchesStatus(m, f.status)
  })
}

function activeLabels(f: MatchListFilters): string[] {
  const out: string[] = []
  if (f.opponent !== 'Any') out.push(`Opponent: ${f.opponent}`)
  if (f.event !== 'Any') out.push(`Event: ${f.event}`)
  if (f.status !== 'Any') out.push(`Status: ${f.status}`)
  return out
}

/** Plain compute of the Matches list. No memo: it ran during render before. */
export function useDeriveMatchList(matches: MatchRecord[], filters: MatchListFilters) {
  const shown = filterMatchList(matches, filters)
  const active = activeLabels(filters)
  const n = countActive(filters)
  const hasMatches = matches.length > 0
  return { shown, active, n, hasMatches }
}
