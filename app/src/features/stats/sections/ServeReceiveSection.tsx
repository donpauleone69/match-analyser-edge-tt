/**
 * ServeReceiveSection - Serve and receive statistics
 */

import { Card } from '@/ui-mine'
import { StatCardBlock, StatRowBlock } from '../blocks'
import type { PlayerStatsViewModel } from '../models'

interface ServeReceiveSectionProps {
  stats: PlayerStatsViewModel
}

export function ServeReceiveSection({ stats }: ServeReceiveSectionProps) {
  const { serve, receive } = stats
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Serve & Receive Analysis</h2>
      
      {/* Serve Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Serve Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCardBlock
            label="Serve Win Rate"
            value={serve.serveWinRate}
            confidence="high"
            variant={serve.serveWinRate > 55 ? 'highlight' : 'default'}
          />
          <StatCardBlock
            label="Serves Attempted"
            value={serve.servesAttempted}
            confidence="high"
          />
          <StatCardBlock
            label="Serve Faults"
            value={serve.serveFaults}
            confidence="high"
            variant={serve.serveFaultRate > 10 ? 'warning' : 'default'}
          />
          <StatCardBlock
            label="Fault Rate"
            value={serve.serveFaultRate}
            confidence="high"
          />
        </div>
        
        {/* Serve by Spin Family */}
        <Card className="p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Serve by Spin Type</h4>
          <div className="space-y-1">
            {Object.entries(serve.bySpinFamily).map(([spin, data]) => (
              <StatRowBlock
                key={spin}
                label={spin.charAt(0).toUpperCase() + spin.slice(1)}
                value={data.winRate}
                subValue={`${data.wins}/${data.count}`}
                confidence="high"
              />
            ))}
          </div>
        </Card>
        
        {/* Serve by Length */}
        <Card className="p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Serve by Length</h4>
          <div className="space-y-1">
            {Object.entries(serve.byLength).map(([length, data]) => (
              <StatRowBlock
                key={length}
                label={length.charAt(0).toUpperCase() + length.slice(1).replace('_', ' ')}
                value={data.winRate}
                subValue={`${data.wins}/${data.count}`}
                confidence="high"
              />
            ))}
          </div>
        </Card>
        
        {/* Serve by Score Situation */}
        <Card className="p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Serve by Situation</h4>
          <div className="space-y-1">
            <StatRowBlock
              label="Normal Points"
              value={serve.byScoreSituation.normal.winRate}
              subValue={`${serve.byScoreSituation.normal.wins}/${serve.byScoreSituation.normal.count}`}
              confidence="high"
            />
            <StatRowBlock
              label="Clutch Points (9-9+)"
              value={serve.byScoreSituation.clutch.winRate}
              subValue={`${serve.byScoreSituation.clutch.wins}/${serve.byScoreSituation.clutch.count}`}
              confidence="high"
            />
            <StatRowBlock
              label="Game Points"
              value={serve.byScoreSituation.gamePoint.winRate}
              subValue={`${serve.byScoreSituation.gamePoint.wins}/${serve.byScoreSituation.gamePoint.count}`}
              confidence="high"
            />
          </div>
        </Card>
      </div>
      
      {/* Receive Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Receive Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCardBlock
            label="Receive Win Rate"
            value={receive.receiveWinRate}
            confidence="high"
            variant={receive.receiveWinRate > 45 ? 'highlight' : 'default'}
          />
          <StatCardBlock
            label="Receives Attempted"
            value={receive.receivesAttempted}
            confidence="high"
          />
          <StatCardBlock
            label="Receive Errors"
            value={receive.receiveErrors}
            confidence="high"
            variant={receive.receiveErrorRate > 15 ? 'warning' : 'default'}
          />
          <StatCardBlock
            label="Error Rate"
            value={receive.receiveErrorRate}
            confidence="high"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCardBlock
            label="Aggressive Receives"
            value={receive.aggressiveReceives}
            confidence="medium"
            tooltip="Receives with aggressive intent"
          />
          <StatCardBlock
            label="Aggressive Success Rate"
            value={receive.aggressiveReceiveSuccessRate}
            confidence="medium"
          />
        </div>
        
        {/* Receive vs Spin */}
        <Card className="p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Receive vs Spin Type</h4>
          <div className="space-y-1">
            <StatRowBlock
              label="vs Underspin"
              value={receive.vsUnderSpin.winRate}
              subValue={`${receive.vsUnderSpin.wins}/${receive.vsUnderSpin.count}`}
              confidence="medium"
            />
            <StatRowBlock
              label="vs Topspin"
              value={receive.vsTopSpin.winRate}
              subValue={`${receive.vsTopSpin.wins}/${receive.vsTopSpin.count}`}
              confidence="medium"
            />
            <StatRowBlock
              label="vs Sidespin"
              value={receive.vsSideSpin.winRate}
              subValue={`${receive.vsSideSpin.wins}/${receive.vsSideSpin.count}`}
              confidence="medium"
            />
            <StatRowBlock
              label="vs No Spin"
              value={receive.vsNoSpin.winRate}
              subValue={`${receive.vsNoSpin.wins}/${receive.vsNoSpin.count}`}
              confidence="medium"
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

