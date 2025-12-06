/**
 * TacticalSection - 3rd/4th ball and initiative statistics
 */

import { Card } from '@/ui-mine'
import { StatCardBlock, StatRowBlock } from '../blocks'
import type { PlayerStatsViewModel } from '../models'

interface TacticalSectionProps {
  stats: PlayerStatsViewModel
}

export function TacticalSection({ stats }: TacticalSectionProps) {
  const { tactical } = stats
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Tactical Analysis</h2>
      
      {/* 3rd Ball Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">3rd Ball Attack (Opening)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCardBlock
            label="3rd Ball Success Rate"
            value={tactical.thirdBallSuccessRate}
            confidence="medium"
            tooltip="Won rally after 3rd ball attack"
          />
          <StatCardBlock
            label="Attacks Attempted"
            value={tactical.thirdBallAttacks}
            confidence="high"
          />
          <StatCardBlock
            label="Winners"
            value={tactical.thirdBallWinners}
            confidence="high"
          />
          <StatCardBlock
            label="Forced Errors"
            value={tactical.thirdBallForcedErrors}
            confidence="medium"
            tooltip="Opponent errors after 3rd ball"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCardBlock
            label="Winner Rate"
            value={tactical.thirdBallWinnerRate}
            confidence="high"
          />
          <StatCardBlock
            label="Forced Error Rate"
            value={tactical.thirdBallForcedErrorRate}
            confidence="medium"
          />
        </div>
      </div>
      
      {/* 4th Ball Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">4th Ball Counter/Block</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Counter-Attack</h4>
            <div className="space-y-3">
              <StatRowBlock
                label="Success Rate"
                value={tactical.fourthBallCounterSuccessRate}
                confidence="medium"
              />
              <StatRowBlock
                label="Attempts"
                value={tactical.fourthBallCounterAttacks}
                confidence="high"
              />
              <StatRowBlock
                label="Successes"
                value={tactical.fourthBallCounterSuccess}
                confidence="medium"
              />
            </div>
          </Card>
          
          <Card className="p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Blocking</h4>
            <div className="space-y-3">
              <StatRowBlock
                label="Success Rate"
                value={tactical.fourthBallBlockSuccessRate}
                confidence="medium"
              />
              <StatRowBlock
                label="Attempts"
                value={tactical.fourthBallBlocks}
                confidence="high"
              />
              <StatRowBlock
                label="Successes"
                value={tactical.fourthBallBlockSuccess}
                confidence="medium"
              />
            </div>
          </Card>
        </div>
      </div>
      
      {/* Opening Quality */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Opening Quality</h3>
        <div className="space-y-3">
          <StatRowBlock
            label="Excellent Openings"
            value={tactical.excellentOpenings}
            confidence="medium"
          />
          <StatRowBlock
            label="Good Openings"
            value={tactical.goodOpenings}
            confidence="medium"
          />
          <StatRowBlock
            label="Poor Openings"
            value={tactical.poorOpenings}
            confidence="medium"
          />
          <StatRowBlock
            label="Average Quality"
            value={tactical.openingQualityAverage}
            subValue="0-100 scale"
            confidence="medium"
          />
        </div>
      </Card>
      
      {/* Initiative */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Initiative Control</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Initiative Holder</h4>
            <div className="space-y-3">
              <StatRowBlock
                label="Win Rate"
                value={tactical.initiativeWinRate}
                confidence="medium"
                subValue="When attacking first"
              />
              <StatRowBlock
                label="Times Held Initiative"
                value={tactical.initiativeCount}
                confidence="medium"
              />
              <StatRowBlock
                label="Wins"
                value={tactical.initiativeWins}
                confidence="medium"
              />
            </div>
          </Card>
          
          <Card className="p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Initiative Stealer</h4>
            <div className="space-y-3">
              <StatRowBlock
                label="Steal Rate"
                value={tactical.initiativeStealRate}
                confidence="medium"
                subValue="Counter-attacked and won"
              />
              <StatRowBlock
                label="Times Stolen"
                value={tactical.initiativeStolenCount}
                confidence="medium"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

