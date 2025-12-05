import { Circle } from 'lucide-react'
import { useTaggingStore } from '../../stores/taggingStore'

export function ScoreDisplay() {
  const {
    player1Name,
    player2Name,
    player1Score,
    player2Score,
    currentServerId,
    currentRallyShots,
  } = useTaggingStore()

  const serverName = currentServerId === 'player1' ? player1Name : player2Name
  const contactCount = currentRallyShots.length

  return (
    <div className="h-12 bg-bg-card flex items-center justify-between px-4 border-y border-neutral-700">
      {/* Score */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Player 1 */}
          <div className="text-center">
            <div className="text-xs text-neutral-400 leading-none mb-0.5">
              {player1Name}
            </div>
            <div className="text-2xl font-bold font-mono text-neutral-50">
              {player1Score}
            </div>
          </div>

          <div className="text-xl text-neutral-600">—</div>

          {/* Player 2 */}
          <div className="text-center">
            <div className="text-xs text-neutral-400 leading-none mb-0.5">
              {player2Name}
            </div>
            <div className="text-2xl font-bold font-mono text-neutral-50">
              {player2Score}
            </div>
          </div>
        </div>
      </div>

      {/* Server indicator */}
      <div className="flex items-center gap-6">
        {/* Shot count for current rally */}
        {contactCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary-muted">
            <Circle className="w-2 h-2 fill-brand-primary text-brand-primary" />
            <span className="text-sm font-medium text-brand-primary">
              {contactCount} shot{contactCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Server */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          <span className="text-sm text-neutral-300">
            <span className="font-semibold text-neutral-100">{serverName}</span>
            {' serving'}
          </span>
        </div>
      </div>
    </div>
  )
}

