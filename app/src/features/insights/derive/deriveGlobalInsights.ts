import { useMemo } from 'react'
import { insightRules, insightsFor } from '@/rules/insights'
import { filterIsSet, filterMatches, resolveNameFilters, type InsightsFilters, type NameRef } from '@/rules/filters'
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

export function useDeriveGlobalInsights(
  tagged: MatchRecord[],
  filters: InsightsFilters,
  opponents: readonly NameRef[],
  events: readonly NameRef[],
) {
  const named = resolveNameFilters(filters, opponents, events)
  const kept = useMemo(() => filterMatches(tagged, named), [tagged, named])
  const opponent = named.opponent === 'Any' ? '' : named.opponent
  const model = useMemo(
    () => insightsFor(kept, insightRules('global', opponent, filterIsSet(named)), tagged),
    [kept, opponent, named, tagged],
  )
  const videos = useMemo(() => videosOf(kept), [kept])
  return { kept, model, videos }
}
