/**
 * TaggingPhaseSection - Display rally-by-rally tagging data
 */

import type { DBRally, DBShot } from '@/data'
import { RallyGroupBlock } from '../blocks'

interface TaggingPhaseSectionProps {
  taggedRallies: DBRally[]
  allShots: DBShot[]
}

export function TaggingPhaseSection({ 
  taggedRallies,
  allShots 
}: TaggingPhaseSectionProps) {
  if (taggedRallies.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          TAGGING PHASE
        </h2>
        <div className="text-neutral-500 italic text-sm">
          No rallies tagged yet
        </div>
      </div>
    )
  }
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        TAGGING PHASE ({taggedRallies.length} rallies)
      </h2>
      
      <div className="space-y-6">
        {taggedRallies.map((rally, idx) => {
          const rallyShots = allShots
            .filter(s => s.rally_id === rally.id)
            .sort((a, b) => a.shot_index - b.shot_index)
          
          return (
            <RallyGroupBlock
              key={rally.id}
              rally={rally}
              shots={rallyShots}
              isFirstTaggedRally={idx === 0}
            />
          )
        })}
      </div>
    </div>
  )
}




