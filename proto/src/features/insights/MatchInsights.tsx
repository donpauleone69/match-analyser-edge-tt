import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDemo } from '@/data/demoStore'
import { Button } from '@/ui-mine'
import { InsightCard } from './InsightCard'
import { matchInsights, type PlayItem } from './insightCounts'
import { PlaylistPlayer } from './PlaylistPlayer'

type Playing = {
  cardId: string
  name: string
  items: PlayItem[]
  caption: 'name' | 'note'
}

/** Match Insights: five cards from the saved rallies, then marked parts. */
export function MatchInsights() {
  const { matchId = '' } = useParams()
  const { getMatch } = useDemo()
  const navigate = useNavigate()
  const match = getMatch(matchId)
  const model = useMemo(() => (match ? matchInsights(match) : null), [match])
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
        <PlaylistPlayer
          match={match}
          name={playing.name}
          items={playing.items}
          caption={playing.caption}
          onClose={() => setPlaying(null)}
        />
      ) : null}
      <div className="insights-cards space-y-3">
        {model.coverage ? (
          <p className="text-sm text-muted" data-coverage="">
            {model.coverage}
          </p>
        ) : null}
        {model.videoLine ? <p className="text-sm text-muted">{model.videoLine}</p> : null}
        {model.empty ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Nothing tagged yet</p>
            <Button kind="main" onClick={() => navigate(`/matches/${match.id}/tag`)}>
              Go to Tag
            </Button>
          </div>
        ) : (
          <>
            {model.cards.map((card) => (
              <InsightCard
                key={card.id}
                card={card}
                playing={playing?.cardId === card.id}
                onPlay={() => card.playlist && open(card.id, card.playlist.name, card.playlist.items, card.playlist.caption)}
              />
            ))}
            {model.marked?.playlist ? (
              <InsightCard
                card={model.marked}
                playing={playing?.cardId === model.marked.id}
                onPlay={() =>
                  model.marked?.playlist &&
                  open(model.marked.id, model.marked.playlist.name, model.marked.playlist.items, model.marked.playlist.caption)
                }
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
