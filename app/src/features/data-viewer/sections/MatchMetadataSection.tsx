import { useTaggingStore } from '@/stores/taggingStore'
import { Card } from '@/ui-mine/Card'

export function MatchMetadataSection() {
  const player1Name = useTaggingStore((state) => state.player1Name)
  const player2Name = useTaggingStore((state) => state.player2Name)
  const matchDate = useTaggingStore((state) => state.matchDate)
  const firstServerId = useTaggingStore((state) => state.firstServerId)
  const taggingMode = useTaggingStore((state) => state.taggingMode)
  const matchFormat = useTaggingStore((state) => state.matchFormat)
  const tournament = useTaggingStore((state) => state.tournament)
  const matchResult = useTaggingStore((state) => state.matchResult)
  const finalSetScore = useTaggingStore((state) => state.finalSetScore)
  const finalPointsScore = useTaggingStore((state) => state.finalPointsScore)
  const videoCoverage = useTaggingStore((state) => state.videoCoverage)
  const rallies = useTaggingStore((state) => state.rallies)
  const shots = useTaggingStore((state) => state.shots)
  const sets = useTaggingStore((state) => state.sets)

  const metadata = [
    { label: 'Player 1', value: player1Name },
    { label: 'Player 2', value: player2Name },
    { label: 'Match Date', value: matchDate || 'N/A' },
    { label: 'First Server', value: firstServerId === 'player1' ? player1Name : player2Name },
    { label: 'Tagging Mode', value: taggingMode || 'N/A' },
    { label: 'Match Format', value: matchFormat || 'N/A' },
    { label: 'Tournament', value: tournament || 'N/A' },
    { label: 'Video Coverage', value: videoCoverage || 'N/A' },
    { label: 'Match Result', value: matchResult || 'N/A' },
    { label: 'Final Set Score', value: finalSetScore || 'N/A' },
    { label: 'Final Points Score', value: finalPointsScore || 'N/A' },
    { label: 'Total Sets', value: sets.length.toString() },
    { label: 'Total Rallies', value: rallies.length.toString() },
    { label: 'Total Contacts', value: shots.length.toString() },
  ]

  return (
    <Card className="p-6 bg-bg-card border border-neutral-700">
      <h2 className="text-xl font-semibold mb-4 text-neutral-50">Match Metadata</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-bg-elevated">
              <th className="border border-neutral-600 px-4 py-2 text-left font-semibold text-neutral-300">
                Property
              </th>
              <th className="border border-neutral-600 px-4 py-2 text-left font-semibold text-neutral-300">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {metadata.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-bg-card' : 'bg-bg-surface'}>
                <td className="border border-neutral-700 px-4 py-2 font-medium text-neutral-300">
                  {item.label}
                </td>
                <td className="border border-neutral-700 px-4 py-2 text-neutral-50">
                  {item.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

