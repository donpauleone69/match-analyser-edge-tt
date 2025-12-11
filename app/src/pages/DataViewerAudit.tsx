/**
 * DataViewerAudit Page - Phase 1 Audit View
 */

import { useSearchParams } from 'react-router-dom'
import { Phase1AuditComposer } from '@/features/data-audit/composers'

export function DataViewerAudit() {
  const [searchParams] = useSearchParams()
  const matchId = searchParams.get('matchId')
  
  if (!matchId) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2 text-yellow-400">Missing Parameter</div>
          <div className="text-sm text-neutral-400 mb-4">
            No matchId provided in URL
          </div>
          <a 
            href="/data-viewer" 
            className="text-brand-primary hover:underline"
          >
            Back to Data Viewer
          </a>
        </div>
      </div>
    )
  }
  
  return <Phase1AuditComposer matchId={matchId} />
}

