import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { Play, Pause, SkipBack, SkipForward, Upload, Repeat } from 'lucide-react'
import { useTaggingStore } from '../../stores/taggingStore'
import { cn } from '../../lib/utils'
import { formatTime } from '../../lib/utils'

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

interface VideoPlayerProps {
  videoSrc?: string
  onVideoSelect?: (url: string) => void
  constrainedPlayback?: ConstrainedPlayback
  onConstrainedEnd?: () => void
  showTimeOverlay?: boolean
  compact?: boolean
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
  videoSrc,
  onVideoSelect,
  constrainedPlayback,
  onConstrainedEnd,
  showTimeOverlay = false,
  compact = false,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null)
  const [loopEnabled, setLoopEnabled] = useState(false)
  
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
    setPlaybackSpeed,
  } = useTaggingStore()

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file)
    setLocalVideoUrl(url)
    onVideoSelect?.(url)
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
    const effectiveLoop = loopOnEnd ?? loopEnabled
    
    if (currentTime >= endTime) {
      video.pause()
      if (effectiveLoop) {
        video.currentTime = startTime
        video.play().catch(console.error)
      } else {
        onConstrainedEnd?.()
      }
    }
  }, [currentTime, isPlaying, constrainedPlayback, loopEnabled, onConstrainedEnd])

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

  const speedOptions = [0.5, 0.75, 1]

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
      "relative bg-bg-app w-full overflow-hidden",
      compact ? "aspect-[16/10]" : "aspect-video"
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
          <div className="text-center space-y-4">
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="video/*"
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
          </div>
        </div>
      )}

      {/* Time Overlay */}
      {showTimeOverlay && effectiveVideoSrc && (
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/70 text-white font-mono text-sm">
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
        <div className="absolute top-4 right-16 px-2 py-1 rounded bg-brand-primary/80 text-white text-xs font-medium">
          Shot View
        </div>
      )}

      {/* Controls Overlay */}
      {effectiveVideoSrc && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            {/* Left: Frame step buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => stepFrame('backward')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Step backward"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => stepFrame('forward')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Step forward"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>
              
              {/* Loop toggle for constrained mode */}
              {constrainedPlayback?.enabled && (
                <button
                  onClick={() => setLoopEnabled(!loopEnabled)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    loopEnabled ? "bg-brand-primary text-white" : "bg-white/10 hover:bg-white/20 text-white"
                  )}
                  title="Loop shot"
                >
                  <Repeat className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Center: Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Play/Pause (Space)"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
            </button>

            {/* Right: Speed selector */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              {speedOptions.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    playbackSpeed === speed
                      ? 'bg-brand-primary text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar with constrained bounds visualization */}
          <div className="mt-3">
            <div
              className="h-2 bg-white/20 rounded-full cursor-pointer relative"
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
        </div>
      )}

      {/* Re-select video button */}
      {effectiveVideoSrc && (
        <label className="absolute top-4 right-4 cursor-pointer">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          <div className="px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white text-sm flex items-center gap-2 transition-colors">
            <Upload className="w-4 h-4" />
            Change
          </div>
        </label>
      )}
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'
