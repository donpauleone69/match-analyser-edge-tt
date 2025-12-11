/**
 * SetupPhaseSection - Display setup phase data
 */

import type { DBSet, DBRally } from '@/data'
import { DataTableBlock } from '../blocks'
import { SET_PHASE1_FIELDS, getFieldsByCategory, RALLY_PHASE1_FIELDS } from '../fieldConfig'

interface SetupPhaseSectionProps {
  setRecord: DBSet
  stubRallies: DBRally[]
}

export function SetupPhaseSection({ 
  setRecord, 
  stubRallies 
}: SetupPhaseSectionProps) {
  const setupFields = getFieldsByCategory(SET_PHASE1_FIELDS, 'setup')
  
  // Only show relevant fields for stub rallies
  const stubRallyFields = RALLY_PHASE1_FIELDS.filter(f => 
    ['rally_index', 'server_id', 'receiver_id', 'winner_id', 
     'is_stub_rally', 'has_video_data', 'framework_confirmed'].includes(f.key)
  )
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        SETUP PHASE
      </h2>
      
      {/* Set Record - Setup Fields Only */}
      <div className="mb-6">
        <h3 className="text-base font-semibold mb-2">📊 Set Record (Setup Fields)</h3>
        <DataTableBlock 
          data={[setRecord]}
          fields={setupFields}
          categoryColor="green"
        />
      </div>
      
      {/* Stub Rallies */}
      {stubRallies.length > 0 ? (
        <div>
          <h3 className="text-base font-semibold mb-2">
            📊 Stub Rallies Created ({stubRallies.length} rows)
          </h3>
          <DataTableBlock 
            data={stubRallies}
            fields={stubRallyFields}
            categoryColor="green"
          />
        </div>
      ) : (
        <div className="text-neutral-500 italic text-sm">
          No stub rallies created (starting score was 0-0)
        </div>
      )}
    </div>
  )
}

