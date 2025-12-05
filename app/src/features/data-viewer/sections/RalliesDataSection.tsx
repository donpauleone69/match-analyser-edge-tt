import { useState } from 'react'
import { useTaggingStore } from '@/stores/taggingStore' // Legacy store - to be migrated
import { Card } from '@/ui-mine/Card'
import { Button } from '@/ui-mine/Button'

export function RalliesDataSection() {
  const rallies = useTaggingStore((state) => state.rallies)
  const player1Name = useTaggingStore((state) => state.player1Name)
  const player2Name = useTaggingStore((state) => state.player2Name)
  const [showAll, setShowAll] = useState(false)

  const displayRallies = showAll ? rallies : rallies.slice(0, 50)

  return (
    <Card className="p-6 bg-bg-card border border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-neutral-50">
          Rallies Data ({rallies.length} total)
        </h2>
        {rallies.length > 50 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show First 50' : 'Show All'}
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-bg-elevated">
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Rally #
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Set #
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Server
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Receiver
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Winner
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Scoring
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Score After
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Shots
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                End Time (s)
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Point End Type
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Luck Type
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Highlight
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRallies.map((rally, idx) => (
              <tr key={rally.id} className={idx % 2 === 0 ? 'bg-bg-card' : 'bg-bg-surface'}>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {rally.rallyIndex}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {rally.setId}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {rally.serverId === 'player1' ? player1Name : player2Name}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {rally.receiverId === 'player1' ? player1Name : player2Name}
                </td>
                <td className="border border-neutral-700 px-3 py-2 font-medium text-brand-primary">
                  {rally.winnerId 
                    ? rally.winnerId === 'player1' 
                      ? player1Name 
                      : player2Name
                    : 'N/A'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {rally.isScoring ? 'Yes' : 'No'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100 font-mono">
                  {rally.player1ScoreAfter}-{rally.player2ScoreAfter}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-center text-neutral-100">
                  {rally.shots.length}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100 font-mono">
                  {rally.endOfPointTime ? rally.endOfPointTime.toFixed(2) : 'N/A'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {rally.pointEndType || 'N/A'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {rally.luckType || 'N/A'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-center">
                  {rally.isHighlight ? '⭐' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAll && rallies.length > 50 && (
        <p className="text-sm text-neutral-400 mt-2">
          Showing first 50 of {rallies.length} rallies. Click "Show All" to view all.
        </p>
      )}
    </Card>
  )
}

