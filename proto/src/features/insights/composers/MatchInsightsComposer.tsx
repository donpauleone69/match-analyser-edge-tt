import { useEffect, useState } from 'react'
import { useMatchRecord, useMatchStore } from '@/stores/matchStore'
import { sceneAt } from '@/data/seed/script'
import type { PlayItem } from '@/rules/insights'
import { useDeriveMatchInsights } from '../derive/deriveMatchInsights'
import { MatchInsightCardsSection } from '../sections/MatchInsightCardsSection'
import { PlaylistSection } from '../sections/PlaylistSection'

type Playing = {
  cardId: string
  name: string
  items: PlayItem[]
  caption: 'name' | 'note'
}

/** Match Insights: five cards from the saved rallies, then marked parts. */
export function MatchInsightsComposer({ matchId }: { matchId: string }) {
  const matches = useMatchStore((s) => s.matches)
  const match = useMatchRecord(matchId)
  const model = useDeriveMatchInsights(matches, match, matchId)
  const [playing, setPlaying] = useState<Playing | null>(null)

  useEffect(() => {
    if (!playing) return
    document.querySelector(`[data-insight="${playing.cardId}"]`)?.scrollIntoView({ block: 'start' })
  }, [playing])

  if (!match || !model) return null

  const open = (cardId: string, name: string, items: PlayItem[], caption: 'name' | 'note') => {
    setPlaying({ cardId, name, items, caption })
  }

  return (
    <div className="insights-page px-4 py-4 sm:px-6 lg:px-8">
      {playing ? (
        <PlaylistSection
          sceneAt={sceneAt}
          videos={match.videos}
          name={playing.name}
          items={playing.items}
          caption={playing.caption}
          onClose={() => setPlaying(null)}
        />
      ) : null}
      <MatchInsightCardsSection match={match} model={model} playing={playing} open={open} />
    </div>
  )
}
