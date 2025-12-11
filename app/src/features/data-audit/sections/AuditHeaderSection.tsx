/**
 * AuditHeaderSection - Sticky header with match info and refresh button
 */

import { Icon } from '@/ui-mine/Icon'

interface MatchWithPlayerNames {
  player1_name: string
  player2_name: string
  [key: string]: any
}

interface AuditHeaderSectionProps {
  matchRecord: MatchWithPlayerNames
  onRefresh: () => void
}

export function AuditHeaderSection({ 
  matchRecord, 
  onRefresh 
}: AuditHeaderSectionProps) {
  return (
    <div className="sticky top-0 z-10 bg-neutral-950 border-b border-neutral-800 p-4 shadow-lg">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a 
            href="/data-viewer" 
            className="text-brand-primary hover:underline flex items-center gap-2"
          >
            <Icon name="arrow-left" size="sm" />
            Back to Data Viewer
          </a>
          <span className="text-neutral-600">|</span>
          <h1 className="text-xl font-bold">Phase 1 Audit</h1>
          <span className="text-neutral-400">
            {matchRecord.player1_name} vs {matchRecord.player2_name}
          </span>
        </div>
        
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-primary/90 transition-colors"
        >
          <Icon name="rotate-ccw" size="sm" />
          Refresh
        </button>
      </div>
    </div>
  )
}

