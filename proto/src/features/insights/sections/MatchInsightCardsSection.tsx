import { useNavigate } from 'react-router-dom'
import { derivePhase } from '@/rules/match'
import { WfEmpty } from '@/ui-mine'
import { Button } from '@/ui-mine'
import type { MatchInsightsModel, PlayItem } from '@/rules/insights'
import type { MatchRecord } from '@/types/match'
import { InsightCardBlock } from '../blocks/InsightCardBlock'

export function MatchInsightCardsSection({
  match,
  model,
  playing,
  open,
}: {
  match: MatchRecord
  model: MatchInsightsModel
  playing: { cardId: string } | null
  open: (cardId: string, name: string, items: PlayItem[], caption: 'name' | 'note') => void
}) {
  const navigate = useNavigate()

  return (
    <div className="insights-cards space-y-3">
      {model.coverage ? (
        <p className="text-sm text-muted" data-coverage="">
          {model.coverage}
        </p>
      ) : null}
      {model.videoLine ? <p className="text-sm text-muted">{model.videoLine}</p> : null}
      {model.empty ? (
        <div className="space-y-3">
          <WfEmpty
            title="Nothing tagged yet"
            body={
              derivePhase(match) === 'new'
                ? 'Add the video in Tag to start.'
                : 'Tag a rally to see insights for this match.'
            }
          />
          <Button kind="main" onClick={() => navigate(`/matches/${match.id}/tag`)}>
            Go to Tag
          </Button>
        </div>
      ) : (
        <>
          {model.cards.map((card) => (
            <InsightCardBlock
              key={card.id}
              card={card}
              playing={playing?.cardId === card.id}
              onPlay={() => card.playlist && open(card.id, card.playlist.name, card.playlist.items, card.playlist.caption)}
            />
          ))}
          {model.marked?.playlist ? (
            <InsightCardBlock
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
  )
}
