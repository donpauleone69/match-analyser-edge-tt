/**
 * RallyListBlock - Display raw rally data
 */

import { Table } from '@/ui-mine'

interface RallyData {
  rallyIndex: number
  serverId: string
  receiverId: string
  winnerId: string | null
  isScoring: boolean
  player1ScoreAfter: number
  player2ScoreAfter: number
  pointEndType: string | null
  shotCount: number
}

interface RallyListBlockProps {
  rallies: RallyData[]
  player1Name: string
  player2Name: string
}

export function RallyListBlock({ rallies, player1Name, player2Name }: RallyListBlockProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rally</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Server</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shots</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">End Type</th>
          </tr>
        </thead>
        <tbody>
          {rallies.map(rally => (
            <tr key={rally.rallyIndex} className="border-t border-gray-200">
              <td className="px-3 py-2 text-sm text-gray-900">{rally.rallyIndex}</td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {rally.serverId === 'player1' ? player1Name : player2Name}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">{rally.shotCount}</td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {rally.player1ScoreAfter}-{rally.player2ScoreAfter}
              </td>
              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                {rally.isScoring ? (
                  rally.winnerId === 'player1' ? player1Name : player2Name
                ) : (
                  <span className="text-gray-400">Let</span>
                )}
              </td>
              <td className="px-3 py-2 text-sm text-gray-600">
                {rally.pointEndType || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

