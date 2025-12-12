/**
 * SetAuditSection - Display one set's complete audit data
 */

import { cn } from '@/helpers/utils'
import type { DBSet, DBRally, DBShot } from '@/data'
import { SetupPhaseSection } from './SetupPhaseSection'
import { TaggingPhaseSection } from './TaggingPhaseSection'

interface SetAuditSectionProps {
  set: DBSet
  rallies: DBRally[]
  shots: DBShot[]
  isFirst: boolean
}

export function SetAuditSection({ 
  set, 
  rallies, 
  shots,
  isFirst 
}: SetAuditSectionProps) {
  const stubRallies = rallies.filter(r => r.is_stub_rally)
  const taggedRallies = rallies.filter(r => !r.is_stub_rally && r.framework_confirmed)
  
  return (
    <div className={cn("mb-12", !isFirst && "pt-12 border-t-4 border-neutral-800")}>
      {/* Set Header */}
      <div className="mb-6 p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
        <h2 className="text-2xl font-bold mb-1">SET {set.set_number}</h2>
        <div className="text-sm text-neutral-400 flex flex-wrap gap-4">
          <span>Phase: <span className="text-neutral-300">{set.tagging_phase || 'not_started'}</span></span>
          <span>•</span>
          <span>Final Score: <span className="text-neutral-300">{set.player1_score_final ?? '—'}-{set.player2_score_final ?? '—'}</span></span>
          <span>•</span>
          <span>Tagged Rallies: <span className="text-neutral-300">{taggedRallies.length}</span></span>
          <span>•</span>
          <span>Stub Rallies: <span className="text-neutral-300">{stubRallies.length}</span></span>
        </div>
      </div>
      
      {/* Setup Phase */}
      <SetupPhaseSection 
        setRecord={set}
        stubRallies={stubRallies}
      />
      
      {/* Tagging Phase */}
      <TaggingPhaseSection 
        taggedRallies={taggedRallies}
        allShots={shots}
      />
    </div>
  )
}




