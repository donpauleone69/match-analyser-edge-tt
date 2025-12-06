/**
 * MatchSummarySection - Overall match record and summary stats
 */

import { StatCardBlock } from '../blocks'
import type { PlayerStatsViewModel } from '../models'

interface MatchSummarySectionProps {
  stats: PlayerStatsViewModel
}

export function MatchSummarySection({ stats }: MatchSummarySectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Match Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCardBlock
          label="Matches Played"
          value={stats.matchesPlayed}
          confidence="high"
        />
        <StatCardBlock
          label="Match Win Rate"
          value={stats.matchWinRate}
          confidence="high"
          variant={stats.matchWinRate > 50 ? 'highlight' : 'default'}
        />
        <StatCardBlock
          label="Matches Won"
          value={`${stats.matchesWon}/${stats.matchesPlayed}`}
          confidence="high"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCardBlock
          label="Sets Won"
          value={stats.setsWon}
          confidence="high"
        />
        <StatCardBlock
          label="Sets Lost"
          value={stats.setsLost}
          confidence="high"
        />
        <StatCardBlock
          label="Set Win Rate"
          value={stats.setWinRate}
          confidence="high"
        />
        <StatCardBlock
          label="Points Won"
          value={`${stats.pointsWon}/${stats.pointsWon + stats.pointsLost}`}
          confidence="high"
        />
      </div>
    </div>
  )
}

