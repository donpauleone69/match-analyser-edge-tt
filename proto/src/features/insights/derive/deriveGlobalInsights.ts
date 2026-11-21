import { useMemo } from 'react'
import { insightRules, insightsFor } from '@/rules/insights'
import { filterIsSet, filterMatches, type InsightsFilters } from '@/rules/filters'
import type { MatchRecord, VideoAsset } from '@/types/match'

function videosOf(matches: MatchRecord[]): VideoAsset[] {
  const seen = new Set<string>()
  const out: VideoAsset[] = []
  for (const match of matches) {
    for (const video of match.videos) {
      if (seen.has(video.id)) continue
      seen.add(video.id)
      out.push(video)
    }
  }
  return out
}

export function useDeriveGlobalInsights(tagged: MatchRecord[], filters: InsightsFilters) {
  const kept = useMemo(() => filterMatches(tagged, filters), [tagged, filters])
  const opponent = filters.opponent === 'Any' ? '' : filters.opponent
  const model = useMemo(
    () => insightsFor(kept, insightRules('global', opponent, filterIsSet(filters)), tagged),
    [kept, opponent, filters, tagged],
  )
  const videos = useMemo(() => videosOf(kept), [kept])
  return { kept, model, videos }
}
