import type { MatchInsightsModel, PlayItem } from '@/rules/insights'
import { InsightCardBlock } from '../blocks/InsightCardBlock'

export function InsightCardsSection({
  model,
  playing,
  open,
}: {
  model: MatchInsightsModel
  playing: { cardId: string } | null
  open: (cardId: string, name: string, items: PlayItem[], caption: 'name' | 'note') => void
}) {
  return (
    <div className="insights-cards space-y-3 px-4 py-4 sm:px-6 lg:px-8">
      {model.coverage ? (
        <p className="text-sm text-muted" data-coverage="">
          {model.coverage}
        </p>
      ) : null}
      {model.videoLine ? <p className="text-sm text-muted">{model.videoLine}</p> : null}
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
    </div>
  )
}
