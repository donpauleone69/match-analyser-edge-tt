/**
 * RallyGroupBlock - Display one rally + its shots together
 */

import type { DBRally, DBShot } from '@/data'
import { DataTableBlock } from './DataTableBlock'
import { RALLY_PHASE1_FIELDS, SHOT_PHASE1_FIELDS } from '../fieldConfig'

interface RallyGroupBlockProps {
  rally: DBRally
  shots: DBShot[]
  isFirstTaggedRally?: boolean
}

export function RallyGroupBlock({ 
  rally, 
  shots,
  isFirstTaggedRally = false
}: RallyGroupBlockProps) {
  // Infer button pressed from point_end_type (for display only)
  const getButtonPressed = (): string => {
    if (!rally.is_scoring) return 'Let'
    
    const lastShot = shots[shots.length - 1]
    
    switch (rally.point_end_type) {
      case 'serviceFault':
      case 'receiveError':
      case 'unforcedError':
        return lastShot?.shot_result === 'in_net' ? 'Net' : 'Long'
      case 'forcedError':
        return 'Forced Error'
      case 'winnerShot':
        return 'Win'
      default:
        return 'Unknown'
    }
  }
  
  const buttonPressed = getButtonPressed()
  
  return (
    <div className="border-l-4 border-blue-500 pl-4 mb-6">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-3 flex-wrap">
        <span>📊 RALLY {rally.rally_index}</span>
        <span className="text-sm font-normal text-neutral-400">
          ({buttonPressed} button · {shots.length} shots)
        </span>
        <span className="text-sm font-mono text-neutral-500">
          {rally.player1_score_before}-{rally.player2_score_before} 
          {' → '}
          {rally.player1_score_after}-{rally.player2_score_after}
        </span>
      </h3>
      
      {/* Rally Record */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-neutral-400 mb-1">
          Rally Record:
        </div>
        <DataTableBlock 
          data={[rally]}
          fields={RALLY_PHASE1_FIELDS}
          categoryColor="blue"
        />
      </div>
      
      {/* Shot Records */}
      <div>
        <div className="text-xs font-semibold text-neutral-400 mb-1">
          Shot Records ({shots.length} rows):
        </div>
        <DataTableBlock 
          data={shots}
          fields={SHOT_PHASE1_FIELDS}
          categoryColor="blue"
          highlightLastRow // Highlight last shot (rally-ending)
        />
      </div>
      
      {/* First rally only: show set update note */}
      {isFirstTaggedRally && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded text-sm">
          <div className="font-semibold text-blue-400 mb-1">
            Set Record Updated (first rally):
          </div>
          <div className="font-mono text-xs text-neutral-300">
            tagging_phase: 'phase1_in_progress', phase1_last_rally: {rally.rally_index}, has_video: true
          </div>
        </div>
      )}
    </div>
  )
}

