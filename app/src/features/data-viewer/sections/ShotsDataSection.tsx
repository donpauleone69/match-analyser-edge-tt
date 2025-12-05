import { useState } from 'react'
import { useTaggingStore } from '@/stores/taggingStore' // Legacy store - to be migrated
import { Card } from '@/ui-mine/Card'
import { Button } from '@/ui-mine/Button'

export function ShotsDataSection() {
  const shots = useTaggingStore((state) => state.shots)
  const rallies = useTaggingStore((state) => state.rallies)
  const player1Name = useTaggingStore((state) => state.player1Name)
  const player2Name = useTaggingStore((state) => state.player2Name)
  const [showAll, setShowAll] = useState(false)

  // Helper to get rally index from rallyId
  const getRallyIndex = (rallyId: string) => {
    const rally = rallies.find((r) => r.id === rallyId)
    return rally ? rally.rallyIndex : 'N/A'
  }

  const displayContacts = showAll ? shots : shots.slice(0, 100)

  return (
    <Card className="p-6 bg-bg-card border border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-neutral-50">
          Contacts/Shots Data ({shots.length} total)
        </h2>
        {shots.length > 100 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show First 100' : 'Show All'}
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-bg-elevated">
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Shot ID
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Rally #
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Shot #
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Time (s)
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Player
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Serve Type
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Serve Spin
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Wing
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Shot Type
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Quality
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Landing Zone
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Landing Type
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Inferred Spin
              </th>
              <th className="border border-neutral-600 px-3 py-2 text-left font-semibold text-neutral-300">
                Tagged
              </th>
            </tr>
          </thead>
          <tbody>
            {displayContacts.map((shot, idx) => (
              <tr key={shot.id} className={idx % 2 === 0 ? 'bg-bg-card' : 'bg-bg-surface'}>
                <td className="border border-neutral-700 px-3 py-2 font-mono text-xs text-neutral-300">
                  {shot.id.substring(0, 8)}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {getRallyIndex(shot.rallyId)}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-center text-neutral-100">
                  {shot.shotIndex}
                </td>
                <td className="border border-neutral-700 px-3 py-2 font-mono text-neutral-100">
                  {shot.time.toFixed(3)}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {shot.playerId === 'player1' ? player1Name : shot.playerId === 'player2' ? player2Name : 'N/A'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {shot.serveType || '—'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {shot.serveSpin || '—'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {shot.wing || '—'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {shot.shotType || '—'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {shot.shotQuality || 'N/A'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {shot.landingZone || '—'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {shot.landingType || '—'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-neutral-100">
                  {shot.inferredSpin || '—'}
                </td>
                <td className="border border-neutral-700 px-3 py-2 text-center text-success">
                  {shot.isTagged ? '✓' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAll && shots.length > 100 && (
        <p className="text-sm text-neutral-400 mt-2">
          Showing first 100 of {shots.length} shots. Click "Show All" to view all.
        </p>
      )}
    </Card>
  )
}

