import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { Upload } from 'lucide-react'
import { useVideoPlaybackStore } from './videoPlaybackStore'
import { cn, formatTime } from '@/helpers/utils'

export interface ConstrainedPlayback {
  enabled: boolean
  startTime: number
  endTime: number
  loopOnEnd?: boolean
}

export interface VideoPlayerHandle {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  stepFrame: (direction: 'forward' | 'backward', ignoreConstraints?: boolean) => void
  getCurrentTime: () => number
}

export interface TaggingModeControls {
  enabled: boolean
  currentSpeedMode: 'normal' | 'tag' | 'ff'
  speedPresets: { tag: number; ff: number }
  canNavigateBack: boolean
  canNavigateForward: boolean
  canDelete: boolean
  onShotBack: () => void
  onShotForward: () => void
  onDelete: () => void
  onFrameStepBack: () => void
  onFrameStepForward: () => void
  shotDescription?: string  // NEW: Display current shot info (e.g., "Shot 3/12 - FH Loop")
}

interface VideoPlayerProps {
  videoSrc?: string
  onVideoSelect?: (url: string) => void
  constrainedPlayback?: ConstrainedPlayback
  onConstrainedEnd?: () => void
  showTimeOverlay?: boolean
  taggingMode?: TaggingModeControls
  shotDescription?: string  // NEW: For Phase 2 - persistent shot label
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
  videoSrc,
  onVideoSelect,
  constrainedPlayback,
  onConstrainedEnd,
  showTimeOverlay = false,
  taggingMode,
  shotDescription,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  
  // Use either the provided src or local selection
  const effectiveVideoSrc = videoSrc || localVideoUrl
  
  const {
    currentTime,
    duration,
    isPlaying,
    playbackSpeed,
    setCurrentTime,
    setDuration,
    setIsPlaying,
  } = useVideoPlaybackStore()

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setIsProcessingFile(true)
    
    // Save to IndexedDB for persistence (import saveVideoFile dynamically to avoid issues)
    try {
      const { saveVideoFile } = await import('@/helpers/videoStorage')
      // Use a session ID from URL params if available
      const urlParams = new URLSearchParams(window.location.search)
      const matchId = window.location.pathname.split('/')[2] // Extract from /matches/:matchId/tag
      const setNumber = urlParams.get('set')
      
      if (matchId && setNumber) {
        const sessionId = `${matchId}-${setNumber}`
        await saveVideoFile(sessionId, file)
        console.log('Video saved to IndexedDB')
      }
    } catch (error) {
      console.error('Failed to save video to IndexedDB:', error)
      // Don't block - video will still work from blob URL
    }
    
    // Create blob URL immediately - video element will trigger onLoadedMetadata when ready
    const url = URL.createObjectURL(file)
    setLocalVideoUrl(url)
    onVideoSelect?.(url)
    // Processing state will be cleared by handleLoadedMetadata
  }

  // Cleanup local URL on unmount
  useEffect(() => {
    return () => {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl)
      }
    }
  }, [localVideoUrl])

  // Sync playback speed with video
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackSpeed
  }, [playbackSpeed])

  // Constrained playback: auto-pause at endTime
  useEffect(() => {
    if (!constrainedPlayback?.enabled) return
    
    const video = videoRef.current
    if (!video || !isPlaying) return
    
    const { startTime, endTime, loopOnEnd } = constrainedPlayback
    
    if (currentTime >= endTime) {
      video.pause()
      if (loopOnEnd) {
        video.currentTime = startTime
        video.play().catch(console.error)
      } else {
        onConstrainedEnd?.()
      }
    }
  }, [currentTime, isPlaying, constrainedPlayback, onConstrainedEnd])

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (video) {
      setCurrentTime(video.currentTime)
    }
  }, [setCurrentTime])

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (video) {
      setDuration(video.duration)
      // Clear processing state when video is ready
      setIsProcessingFile(false)
    }
  }, [setDuration])

  const handlePlay = useCallback(() => {
    if (!isPlaying) {
      setIsPlaying(true)
    }
  }, [isPlaying, setIsPlaying])
  
  const handlePause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
    }
  }, [isPlaying, setIsPlaying])
  
  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video error:', e.currentTarget.error)
  }, [])

  // Control functions
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    // If constrained and at/past end, seek to start first
    if (constrainedPlayback?.enabled && video.paused) {
      const { startTime, endTime } = constrainedPlayback
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime
      }
    }
    
    if (video.paused) {
      video.play().catch(console.error)
    } else {
      video.pause()
    }
  }, [constrainedPlayback])

  const stepFrame = useCallback((direction: 'forward' | 'backward', ignoreConstraints = false) => {
    const video = videoRef.current
    if (!video) return
    
    video.pause()
    
    const frameTime = 1 / 30
    const step = direction === 'forward' ? frameTime : -frameTime
    let newTime = video.currentTime + step
    
    // Respect constrained bounds only if not ignoring and constrained mode is enabled
    if (!ignoreConstraints && constrainedPlayback?.enabled) {
      const { startTime, endTime } = constrainedPlayback
      newTime = Math.max(startTime, Math.min(endTime, newTime))
    } else {
      newTime = Math.max(0, newTime)
    }
    
    video.currentTime = newTime
    setCurrentTime(newTime)
  }, [setCurrentTime, constrainedPlayback])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (video) {
      video.currentTime = time
      setCurrentTime(time)
    }
  }, [setCurrentTime])

  const getCurrentTime = useCallback(() => {
    return videoRef.current?.currentTime || 0
  }, [])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play().catch(console.error),
    pause: () => videoRef.current?.pause(),
    seek,
    stepFrame: (direction: 'forward' | 'backward', ignoreConstraints?: boolean) => 
      stepFrame(direction, ignoreConstraints),
    getCurrentTime,
  }), [seek, stepFrame, getCurrentTime])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const video = videoRef.current
      if (!video) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          stepFrame('backward')
          break
        case 'ArrowRight':
          e.preventDefault()
          stepFrame('forward')
          break
        case 'j':
          e.preventDefault()
          seek(Math.max(0, currentTime - 10))
          break
        case 'l':
          e.preventDefault()
          seek(Math.min(duration, currentTime + 10))
          break
        case 'f':
          e.preventDefault()
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            video.requestFullscreen?.()
          }
          break
        case ',':
          e.preventDefault()
          stepFrame('backward')
          break
        case '.':
          e.preventDefault()
          stepFrame('forward')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, stepFrame, seek, currentTime, duration])

  // Calculate progress bar positions for constrained mode
  const getProgressBarStyle = () => {
    if (!constrainedPlayback?.enabled || duration <= 0) {
      return {
        left: '0%',
        width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
      }
    }
    
    const { startTime, endTime } = constrainedPlayback
    const startPercent = (startTime / duration) * 100
    const endPercent = (endTime / duration) * 100
    const currentPercent = (currentTime / duration) * 100
    const progressPercent = Math.min(currentPercent, endPercent)
    
    return {
      constrainedStart: startPercent,
      constrainedEnd: endPercent,
      currentProgress: progressPercent,
    }
  }

  const progressStyle = getProgressBarStyle()

  return (
    <div className={cn(
      "relative bg-bg-app w-full h-full overflow-hidden",
      // Removed aspect ratio classes - container should control sizing
    )}>
      {/* Video Element */}
      {effectiveVideoSrc ? (
        <video
          ref={videoRef}
          src={effectiveVideoSrc}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onError={handleError}
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {isProcessingFile ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-neutral-800 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-600 border-t-brand-primary"></div>
              </div>
              <p className="text-brand-primary text-lg mt-4 font-medium">Processing video...</p>
              <p className="text-neutral-400 text-sm max-w-xs mx-auto">
                📱 iOS transcoding video to MP4...
                <br />
                <span className="text-neutral-500">This happens locally - no upload!</span>
                <br />
                <span className="text-brand-primary text-xs mt-2 inline-block">
                  💡 Tip: Use "Choose File" instead of "Photo Library" for instant loading
                </span>
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
                <div className="w-20 h-20 mx-auto rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center">
                  <Upload className="w-10 h-10 text-brand-primary" />
                </div>
                <p className="text-brand-primary text-lg mt-4 font-medium">Click to load video</p>
              </label>
              <p className="text-neutral-500 text-sm">Supports MP4, MOV, WebM</p>
              <p className="text-neutral-600 text-xs max-w-xs mx-auto mt-2">
                🔒 Videos stay on your device
              </p>
            </div>
          )}
        </div>
      )}

      {/* Time Overlay */}
      {showTimeOverlay && effectiveVideoSrc && (
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/90 text-white font-mono text-sm">
          {formatTime(currentTime)}
          {constrainedPlayback?.enabled && (
            <span className="text-neutral-400 ml-2">
              / {formatTime(constrainedPlayback.endTime)}
            </span>
          )}
        </div>
      )}

      {/* Constrained mode indicator */}
      {constrainedPlayback?.enabled && effectiveVideoSrc && (
        <div className="absolute top-4 right-16 px-2 py-1 rounded bg-brand-primary text-white text-xs font-medium">
          Shot View
        </div>
      )}

      {/* Shot Description Overlay - NEW */}
      {(shotDescription || taggingMode?.shotDescription) && effectiveVideoSrc && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/95 border border-neutral-600 text-white text-sm font-medium shadow-lg">
          {shotDescription || taggingMode?.shotDescription}
        </div>
      )}

      {/* Progress Bar Overlay - Always at bottom of video */}
      {effectiveVideoSrc && (
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
          <div
            className="h-2 bg-black/60 rounded-full cursor-pointer relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const percent = (e.clientX - rect.left) / rect.width
              if (duration > 0) {
                let targetTime = percent * duration
                
                // Constrain click to bounds if in constrained mode
                if (constrainedPlayback?.enabled) {
                  const { startTime, endTime } = constrainedPlayback
                  targetTime = Math.max(startTime, Math.min(endTime, targetTime))
                }
                
                seek(targetTime)
              }
            }}
          >
            {/* Constrained region highlight */}
            {constrainedPlayback?.enabled && 'constrainedStart' in progressStyle && (
              <div
                className="absolute top-0 bottom-0 bg-brand-primary/30 rounded-full"
                style={{
                  left: `${progressStyle.constrainedStart}%`,
                  width: `${(progressStyle.constrainedEnd || 0) - (progressStyle.constrainedStart || 0)}%`,
                }}
              />
            )}
            
            {/* Progress indicator */}
            <div
              className="h-full bg-white rounded-full transition-all absolute top-0 left-0"
              style={{
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
              }}
            />
            
            {/* Constrained bounds markers */}
            {constrainedPlayback?.enabled && 'constrainedStart' in progressStyle && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-1 bg-brand-primary rounded"
                  style={{ left: `${progressStyle.constrainedStart}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-brand-primary rounded"
                  style={{ left: `${progressStyle.constrainedEnd}%` }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Re-select video button */}
      {effectiveVideoSrc && (
        <label className="absolute top-4 right-4 cursor-pointer z-10">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          <div className="px-3 py-1.5 rounded-lg bg-black/95 hover:bg-black border border-neutral-600 text-white text-sm flex items-center gap-2 transition-colors">
            <Upload className="w-4 h-4" />
            Change
          </div>
        </label>
      )}
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'
