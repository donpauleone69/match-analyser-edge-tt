import { useMemo } from 'react'
import { hasTaggedRallies } from '@/rules/match'
import { matchInsights, type MatchInsightsModel } from '@/rules/insights'
import type { MatchRecord } from '@/types/match'

export function useDeriveMatchInsights(
  matches: MatchRecord[],
  match: MatchRecord | undefined,
  matchId: string,
): MatchInsightsModel | null {
  const usualFrom = useMemo(
    () => matches.filter((row) => hasTaggedRallies(row) && row.id !== matchId),
    [matches, matchId],
  )
  const model = useMemo(() => (match ? matchInsights(match, usualFrom) : null), [match, usualFrom])
  return model
}
