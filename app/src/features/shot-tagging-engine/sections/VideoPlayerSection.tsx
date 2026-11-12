/**
 * VideoPlayerSection — thin wrapper around shared VideoPlayer for tagging composers.
 * Transport chrome lives in TransportCluster / VideoStageChrome beside this section.
 */

import { forwardRef } from 'react'
import { VideoPlayer, type VideoPlayerHandle, type ConstrainedPlayback } from '@/ui-mine/VideoPlayer'

export interface VideoPlayerSectionProps {
  videoUrl: string | null
  onVideoSelect: (url: string) => void
  constrainedPlayback?: ConstrainedPlayback
  showTimeOverlay?: boolean
  shotDescription?: string
  allowVideoChange?: boolean
  constrainedBadgeLabel?: string | null
}

export const VideoPlayerSection = forwardRef<VideoPlayerHandle, VideoPlayerSectionProps>(
  ({ 
    videoUrl, 
    onVideoSelect, 
    constrainedPlayback, 
    showTimeOverlay = true,
    shotDescription,
    allowVideoChange = true,
    constrainedBadgeLabel = null,
  }, ref) => {
    return (
      <VideoPlayer
        ref={ref}
        videoSrc={videoUrl || undefined}
        onVideoSelect={onVideoSelect}
        allowVideoChange={allowVideoChange}
        showTimeOverlay={showTimeOverlay}
        constrainedPlayback={constrainedPlayback}
        constrainedBadgeLabel={constrainedBadgeLabel}
        shotDescription={shotDescription}
      />
    )
  }
)

VideoPlayerSection.displayName = 'VideoPlayerSection'





