/**
 * VideoPlayerSection - Standardized video player wrapper for all phases
 * 
 * Wraps the VideoPlayer component with consistent configuration:
 * - Phase 1: Uses tagging mode controls (shot navigation, delete, etc.)
 * - Phase 2: Uses constrained playback (loops current shot preview)
 * - Phase 3: Standard playback
 * 
 * All phases get compact mode and time overlay by default.
 */

import { forwardRef } from 'react'
import { VideoPlayer, type VideoPlayerHandle, type TaggingModeControls, type ConstrainedPlayback } from '@/ui-mine/VideoPlayer'

export interface VideoPlayerSectionProps {
  videoUrl: string | null
  onVideoSelect: (url: string) => void
  taggingMode?: TaggingModeControls
  constrainedPlayback?: ConstrainedPlayback
  compact?: boolean
  showTimeOverlay?: boolean
}

export const VideoPlayerSection = forwardRef<VideoPlayerHandle, VideoPlayerSectionProps>(
  ({ 
    videoUrl, 
    onVideoSelect, 
    taggingMode, 
    constrainedPlayback, 
    compact = true, 
    showTimeOverlay = true 
  }, ref) => {
    return (
      <VideoPlayer
        ref={ref}
        videoSrc={videoUrl || undefined}
        onVideoSelect={onVideoSelect}
        compact={compact}
        showTimeOverlay={showTimeOverlay}
        taggingMode={taggingMode}
        constrainedPlayback={constrainedPlayback}
      />
    )
  }
)

VideoPlayerSection.displayName = 'VideoPlayerSection'

