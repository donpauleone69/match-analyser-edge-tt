/**
 * RawDataSection - Display raw rally and shot data
 */

import { Card } from '@/ui-mine'
import { RallyListBlock } from '../blocks'
import type { RawDataViewModel } from '../models'

interface RawDataSectionProps {
  rawData: RawDataViewModel
  player1Name: string
  player2Name: string
}

export function RawDataSection({ rawData, player1Name, player2Name }: RawDataSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Raw Data (By Set)</h2>
      <p className="text-sm text-gray-600">
        Unprocessed rally and shot data for validation and inspection.
      </p>
      
      {rawData.sets.map(set => (
        <Card key={set.setNumber} className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Set {set.setNumber}
            </h3>
            <p className="text-sm text-gray-600">
              Final Score: {player1Name} {set.player1Score} - {set.player2Score} {player2Name}
              {set.winnerId && (
                <span className="ml-2 text-green-600 font-medium">
                  Winner: {set.winnerId === 'player1' ? player1Name : player2Name}
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {set.rallies.length} rallies, {set.rallies.reduce((sum, r) => sum + r.shotCount, 0)} shots
            </p>
          </div>
          
          <RallyListBlock
            rallies={set.rallies}
            player1Name={player1Name}
            player2Name={player2Name}
          />
        </Card>
      ))}
      
      {rawData.sets.length === 0 && (
        <Card className="p-6">
          <p className="text-center text-gray-500">No data available</p>
        </Card>
      )}
    </div>
  )
}

