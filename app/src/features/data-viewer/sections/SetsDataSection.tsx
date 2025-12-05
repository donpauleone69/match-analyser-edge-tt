import { useTaggingStore } from '@/stores/taggingStore' // Legacy store - to be migrated
import { Card } from '@/ui-mine/Card'

export function SetsDataSection() {
  const sets = useTaggingStore((state) => state.sets)
  const player1Name = useTaggingStore((state) => state.player1Name)
  const player2Name = useTaggingStore((state) => state.player2Name)

  return (
    <Card className="p-6 bg-bg-card border border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-neutral-50">
          Games/Sets Data ({sets.length} total)
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-bg-elevated">
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Set #
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Set ID
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Final Score
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Winner
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Has Video
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                End of Set Time (s)
              </th>
            </tr>
          </thead>
          <tbody>
            {sets.map((game, idx) => (
              <tr key={game.id} className={idx % 2 === 0 ? 'bg-bg-card' : 'bg-bg-surface'}>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {game.setNumber}
                </td>
                <td className="border border-neutral-700 px-3 py-2 font-mono text-xs text-neutral-300">
                  {game.id}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100 font-mono">
                  {player1Name} {game.player1FinalScore} - {game.player2FinalScore} {player2Name}
                </td>
                <td className="border border-neutral-700 px-3 py-2 font-medium text-brand-primary">
                  {game.winnerId 
                    ? game.winnerId === 'player1' 
                      ? player1Name 
                      : game.winnerId === 'player2'
                      ? player2Name
                      : 'N/A'
                    : 'N/A'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {game.hasVideo ? 'Yes' : 'No'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 font-mono text-neutral-100">
                  {game.endOfSetTimestamp ? game.endOfSetTimestamp.toFixed(3) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

