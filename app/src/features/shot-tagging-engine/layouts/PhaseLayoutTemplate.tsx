/**
 * PhaseLayoutTemplate - Responsive layout for all tagging phases
 * 
 * MOBILE (< 768px):
 * Vertical stack: Shot Log | Video | Video Controls | Status | Input
 * 
 * DESKTOP (≥ 768px):
 * 2-column layout with left sidebar:
 * ┌─────────┬─────────────────┐
 * │         │   (space top)   │
 * │         │     Video       │
 * │  Shot   │   (max 50vh)    │
 * │  Log    ├─────────────────┤
 * │ (320px) │   Status Bar    │
 * │         ├─────────────────┤
 * │         │ Video Controls  │
 * │         ├─────────────────┤
 * │         │   User Input    │
 * └─────────┴─────────────────┘
 * 
 * Desktop video has max-height (50vh) with vertical centering.
 * Video Controls bar is fixed height (h-12) between video and status.
 * Bottom UI (status + input) maintains same height as mobile.
 * Video maintains 16:9 aspect ratio and centers within available space.
 */

import { type ReactNode } from 'react'
import { cn } from '@/helpers/utils'

export interface PhaseLayoutTemplateProps {
  shotLog: ReactNode
  videoPlayer: ReactNode
  videoControls: ReactNode
  statusBar: ReactNode
  userInput: ReactNode
  className?: string
  shotLogRef?: React.RefObject<HTMLDivElement> | React.MutableRefObject<HTMLDivElement | null>
}

export function PhaseLayoutTemplate({
  shotLog,
  videoPlayer,
  videoControls,
  statusBar,
  userInput,
  className,
  shotLogRef
}: PhaseLayoutTemplateProps) {
  return (
    <div className={cn('fixed inset-0 flex flex-col md:grid md:grid-cols-[320px_1fr] md:grid-rows-[1fr_auto_auto_auto] bg-bg-surface overflow-hidden', className)}>
      {/* Shot Log - Left sidebar on desktop, top on mobile */}
      <div 
        ref={shotLogRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-bg-surface md:row-span-4 md:border-r md:border-neutral-700"
      >
        {shotLog}
      </div>
      
      {/* Video Player - Max height on all screens to preserve shot log visibility */}
      <div className="shrink-0 w-full bg-black flex items-center justify-center overflow-hidden max-h-[40vh] md:max-h-none md:aspect-auto md:min-h-0">
        <div className="w-full h-full aspect-video md:max-h-[50vh] md:aspect-video md:mx-auto">
          {videoPlayer}
        </div>
      </div>
      
      {/* Status Bar - Fixed height, below video */}
      <div className="shrink-0 border-t border-neutral-700 bg-neutral-900">
        {statusBar}
      </div>
      
      {/* Video Controls Bar - Fixed height, below status bar */}
      <div className="shrink-0">
        {videoControls}
      </div>
      
      {/* User Input - Fixed height, maintains size across breakpoints */}
      <div className="shrink-0">
        {userInput}
      </div>
    </div>
  )
}

