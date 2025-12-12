/**
 * VideoPlayerSection - Standardized video player wrapper for all phases
 * 
 * Wraps the VideoPlayer component with consistent configuration:
 * - Phase 1: Basic video display with progress bar
 * - Phase 2: Constrained playback (loops current shot preview) with shot description
 * - Phase 3: Standard playback
 * 
 * All phases get compact mode and time overlay by default.
 * Video controls are now separate (see VideoControlsBar component).
 */

import { forwardRef } from 'react'
import { VideoPlayer, type VideoPlayerHandle, type ConstrainedPlayback } from '@/ui-mine/VideoPlayer'

export interface VideoPlayerSectionProps {
  videoUrl: string | null
  onVideoSelect: (url: string) => void
  constrainedPlayback?: ConstrainedPlayback
  showTimeOverlay?: boolean
  shotDescription?: string
}

export const VideoPlayerSection = forwardRef<VideoPlayerHandle, VideoPlayerSectionProps>(
  ({ 
    videoUrl, 
    onVideoSelect, 
    constrainedPlayback, 
    showTimeOverlay = true,
    shotDescription 
  }, ref) => {
    return (
      <VideoPlayer
        ref={ref}
        videoSrc={videoUrl || undefined}
        onVideoSelect={onVideoSelect}
        showTimeOverlay={showTimeOverlay}
        constrainedPlayback={constrainedPlayback}
        shotDescription={shotDescription}
      />
    )
  }
)

VideoPlayerSection.displayName = 'VideoPlayerSection'





