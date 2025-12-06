/**
 * ErrorAnalysisSection - Error statistics and breakdown
 */

import { Card } from '@/ui-mine'
import { StatCardBlock, StatRowBlock } from '../blocks'
import type { PlayerStatsViewModel } from '../models'

interface ErrorAnalysisSectionProps {
  stats: PlayerStatsViewModel
}

export function ErrorAnalysisSection({ stats }: ErrorAnalysisSectionProps) {
  const { errors } = stats
  
  // Sort shot types by error count (highest first)
  const sortedShotTypes = Object.entries(errors.errorsByShotType)
    .sort((a, b) => b[1].errorRate - a[1].errorRate)
    .slice(0, 10) // Show top 10
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Error Analysis</h2>
      
      {/* Overall Errors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCardBlock
          label="Total Errors"
          value={errors.totalErrors}
          confidence="high"
          variant="warning"
        />
        <StatCardBlock
          label="Unforced Errors"
          value={errors.unforcedErrors}
          confidence="high"
          variant="warning"
        />
        <StatCardBlock
          label="Forced Errors"
          value={errors.forcedErrors}
          confidence="high"
        />
        <StatCardBlock
          label="Unforced %"
          value={errors.totalErrors > 0 ? (errors.unforcedErrors / errors.totalErrors) * 100 : 0}
          confidence="high"
        />
      </div>
      
      {/* Errors by Phase */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Errors by Phase</h3>
        <div className="space-y-1">
          <StatRowBlock
            label="Serve Errors"
            value={errors.serveErrors}
            confidence="high"
          />
          <StatRowBlock
            label="Receive Errors"
            value={errors.receiveErrors}
            confidence="high"
          />
          <StatRowBlock
            label="Rally Errors"
            value={errors.rallyErrors}
            confidence="high"
          />
        </div>
      </Card>
      
      {/* Error Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCardBlock
          label="Net Errors"
          value={errors.netErrors}
          confidence="high"
        />
        <StatCardBlock
          label="Long/Wide Errors"
          value={errors.longErrors}
          confidence="high"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCardBlock
          label="Net Error Rate"
          value={errors.netErrorRate}
          confidence="high"
          tooltip="% of errors that hit the net"
        />
        <StatCardBlock
          label="Long Error Rate"
          value={errors.longErrorRate}
          confidence="high"
          tooltip="% of errors that went long/wide"
        />
      </div>
      
      {/* Errors by Shot Type */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Error Profile by Shot Type</h3>
        <p className="text-sm text-gray-600 mb-3">Top 10 shot types by error rate</p>
        
        {sortedShotTypes.length > 0 ? (
          <div className="space-y-1">
            {sortedShotTypes.map(([shotType, data]) => (
              <div key={shotType} className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-sm text-gray-700">{shotType}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    {data.attempts} attempts
                  </span>
                  <span className="text-gray-600">
                    {data.errors} errors
                  </span>
                  <span className={`font-medium ${data.errorRate > 30 ? 'text-red-600' : 'text-gray-900'}`}>
                    {data.errorRate.toFixed(1)}% error
                  </span>
                  <span className="text-green-600">
                    {data.winnerRate.toFixed(1)}% winner
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No shot type data available yet</p>
        )}
      </Card>
    </div>
  )
}

