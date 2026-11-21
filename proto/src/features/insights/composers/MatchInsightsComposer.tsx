import { useNavigate } from 'react-router-dom'
import { useMatchRecord, useMatchStore } from '@/stores/matchStore'
import { sceneAt } from '@/data/seed/script'
import { useDeriveMatchInsights } from '../derive/deriveMatchInsights'
import { usePlayingCard } from '../hooks/usePlayingCard'
import { InsightCardsSection } from '../sections/InsightCardsSection'
import { PlaylistSection } from '../sections/PlaylistSection'

/** Match Insights: five cards from the saved rallies, then marked parts. */
export function MatchInsightsComposer({ matchId }: { matchId: string }) {
  const navigate = useNavigate()
  const matches = useMatchStore((s) => s.matches)
  const match = useMatchRecord(matchId)
  const model = useDeriveMatchInsights(matches, match, matchId)
  const { playing, setPlaying, open } = usePlayingCard()

  if (!match || !model) return null

  const onGoToTag = () => navigate(`/matches/${match.id}/tag`)

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
      <InsightCardsSection
        match={match}
        model={model}
        playing={playing}
        open={open}
        onGoToTag={onGoToTag}
        className="insights-cards space-y-3"
      />
    </div>
  )
}
