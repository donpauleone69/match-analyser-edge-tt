import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
  useId,
} from 'react'
import { Upload } from 'lucide-react'
import { useVideoPlaybackStore } from './videoPlaybackStore'
import { DEFAULT_PLAYBACK_SPEED } from './playbackSpeeds'
import { cn, formatTime } from '@/helpers/utils'

export interface ConstrainedPlayback {
  enabled: boolean
  startTime: number
  endTime: number
  loopOnEnd?: boolean
}

/** Colour-coded mark on the shared video scrub (rally winner / server, draft ticks). */
export interface VideoProgressMarker {
  id: string
  startTime: number
  endTime: number
  /** Winner (or draft) fill — CSS color / var(). */
  fillColor: string
  /** Server stripe along the top edge — CSS color / var(). */
  stripeColor?: string
  title?: string
  focused?: boolean
  /** Rally range vs in-progress contact tick. */
  kind?: 'rally' | 'draft'
}

export interface VideoProgressViewWindow {
  start: number
  end: number
}

export interface VideoPlayerHandle {
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number, ignoreConstraints?: boolean) => void
  stepFrame: (direction: 'forward' | 'backward', ignoreConstraints?: boolean) => void
  getCurrentTime: () => number
}

interface VideoPlayerProps {
  videoSrc?: string
  onVideoSelect?: (url: string) => void
  /** When false, hide the Change file control even if a video is loaded. Default: true when onVideoSelect is set. */
  allowVideoChange?: boolean
  constrainedPlayback?: ConstrainedPlayback
  onConstrainedEnd?: () => void
  showTimeOverlay?: boolean
  /** Scrub bar under the frame. Off when a shot timeline owns seeking (Pass 1). Default true. */
  showProgressBar?: boolean
  /** Optional label for constrained playback (e.g. "Loop"). Omit to hide the badge. */
  constrainedBadgeLabel?: string | null
  shotDescription?: string
  /** Window hotkeys (Space/k, arrows, j/l, f). Only the last-activated instance responds. Default true. */
  enableHotkeys?: boolean
  /** Zoom the scrub to tagged activity so rally marks stay readable. */
  progressViewWindow?: VideoProgressViewWindow | null
  /** Colour-coded rally / draft marks on the scrub. */
  progressMarkers?: ReadonlyArray<VideoProgressMarker>
  /** Seek when a rally mark is tapped (defaults to marker start). */
  onProgressMarkerSeek?: (marker: VideoProgressMarker) => void
}

/** Only one VideoPlayer should own window hotkeys at a time. */
let activeHotkeyOwner: string | null = null

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
  videoSrc,
  onVideoSelect,
  allowVideoChange,
  constrainedPlayback,
  onConstrainedEnd,
  showTimeOverlay = false,
  showProgressBar = true,
  constrainedBadgeLabel = null,
  shotDescription,
  enableHotkeys = true,
  progressViewWindow = null,
  progressMarkers = [],
  onProgressMarkerSeek,
}, ref) => {
  const instanceId = useId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [hotkeysActive, setHotkeysActive] = useState(false)

  const effectiveVideoSrc = videoSrc || localVideoUrl
  const canChangeVideo = allowVideoChange ?? Boolean(onVideoSelect)

  const {
    currentTime,
    duration,
    isPlaying,
    playbackSpeed,
    isMuted,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setPlaybackSpeed,
  } = useVideoPlaybackStore()

  // Isolate speed per mount so clips slow-mo does not leak into tagging.
  useEffect(() => {
    setPlaybackSpeed(DEFAULT_PLAYBACK_SPEED)
    return () => {
      setPlaybackSpeed(DEFAULT_PLAYBACK_SPEED)
      if (activeHotkeyOwner === instanceId) {
        activeHotkeyOwner = null
      }
    }
  }, [instanceId, setPlaybackSpeed])

  const claimHotkeys = useCallback(() => {
    if (!enableHotkeys) return
    activeHotkeyOwner = instanceId
    setHotkeysActive(true)
  }, [enableHotkeys, instanceId])

  useEffect(() => {
    if (!enableHotkeys) {
      setHotkeysActive(false)
      return
    }
    // First mounted player claims hotkeys until another is activated.
    if (activeHotkeyOwner == null) {
      claimHotkeys()
    }
    const sync = () => setHotkeysActive(activeHotkeyOwner === instanceId)
    sync()
    const id = window.setInterval(sync, 250)
    return () => window.clearInterval(id)
  }, [claimHotkeys, enableHotkeys, instanceId])

  const handleFileSelect = async (file: File) => {
    setIsProcessingFile(true)

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const matchId = window.location.pathname.split('/')[2]
      const setNumber = Number(urlParams.get('set'))
      if (matchId && setNumber > 0) {
        const { storeSetVideoChecked } = await import('@/data/services/videoAssetService')
        let result = await storeSetVideoChecked(matchId, setNumber, file)
        if (result.status === 'duplicate') {
          const first = result.hits[0]
          const label = first
            ? `${first.matchId}${first.setNumber != null ? ` set ${first.setNumber}` : ''}`
            : 'another match'
          const attachAnyway = window.confirm(
            `This video looks like it’s already on ${label}.\n\nOK = attach here anyway\nCancel = don’t attach`
          )
          if (!attachAnyway) {
            setIsProcessingFile(false)
            return
          }
          result = await storeSetVideoChecked(matchId, setNumber, file, { force: true })
        }
        if (result.status !== 'stored') {
          setIsProcessingFile(false)
          return
        }
      }
    } catch (error) {
      console.error('Failed to save video on this device:', error)
    }

    const url = URL.createObjectURL(file)
    setLocalVideoUrl(url)
    onVideoSelect?.(url)
  }

  useEffect(() => {
    return () => {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl)
      }
    }
  }, [localVideoUrl])

  // A media load resets playbackRate to defaultPlaybackRate, and the <video> can mount after
  // the speed was set — re-apply on src change, loadedmetadata, and any foreign ratechange.
  const applyStoreSpeed = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const speed = useVideoPlaybackStore.getState().playbackSpeed
    if (video.defaultPlaybackRate !== speed) video.defaultPlaybackRate = speed
    if (video.playbackRate !== speed) video.playbackRate = speed
  }, [])

  useEffect(() => {
    applyStoreSpeed()
  }, [playbackSpeed, effectiveVideoSrc, applyStoreSpeed])

  // Keep <video>.muted in sync with store (TransportCluster mute toggle).
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (video.muted !== isMuted) video.muted = isMuted
  }, [isMuted, effectiveVideoSrc])

  useEffect(() => {
    if (!constrainedPlayback?.enabled) return

    const video = videoRef.current
    if (!video || !isPlaying) return

    const { startTime, endTime, loopOnEnd } = constrainedPlayback

    if (currentTime >= endTime) {
      if (loopOnEnd) {
        video.currentTime = startTime
        if (video.paused) {
          video.play().catch(console.error)
        }
      } else {
        video.pause()
        onConstrainedEnd?.()
      }
    }
  }, [currentTime, isPlaying, constrainedPlayback, onConstrainedEnd])

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
      setIsPlaying(!video.paused)
      setIsProcessingFile(false)
      applyStoreSpeed()
    }
  }, [setDuration, setIsPlaying, applyStoreSpeed])

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

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

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

    if (!ignoreConstraints && constrainedPlayback?.enabled) {
      const { startTime, endTime } = constrainedPlayback
      newTime = Math.max(startTime, Math.min(endTime, newTime))
    } else {
      newTime = Math.max(0, newTime)
    }

    video.currentTime = newTime
    setCurrentTime(newTime)
  }, [setCurrentTime, constrainedPlayback])

  const seek = useCallback((time: number, ignoreConstraints = false) => {
    const video = videoRef.current
    if (!video) return
    let next = time
    if (!ignoreConstraints && constrainedPlayback?.enabled) {
      const { startTime, endTime } = constrainedPlayback
      next = Math.max(startTime, Math.min(endTime, next))
    }
    video.currentTime = next
    setCurrentTime(next)
  }, [setCurrentTime, constrainedPlayback])

  const getCurrentTime = useCallback(() => {
    return videoRef.current?.currentTime || 0
  }, [])

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play().catch(console.error),
    pause: () => videoRef.current?.pause(),
    togglePlay,
    seek,
    stepFrame: (direction: 'forward' | 'backward', ignoreConstraints?: boolean) =>
      stepFrame(direction, ignoreConstraints),
    getCurrentTime,
  }), [togglePlay, seek, stepFrame, getCurrentTime])

  useEffect(() => {
    if (!enableHotkeys || !hotkeysActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeHotkeyOwner !== instanceId) return
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
  }, [
    enableHotkeys,
    hotkeysActive,
    instanceId,
    togglePlay,
    stepFrame,
    seek,
    currentTime,
    duration,
  ])

  const scrubSpan = (() => {
    if (
      progressViewWindow &&
      Number.isFinite(progressViewWindow.start) &&
      Number.isFinite(progressViewWindow.end) &&
      progressViewWindow.end > progressViewWindow.start
    ) {
      return {
        start: Math.max(0, progressViewWindow.start),
        end: progressViewWindow.end,
      }
    }
    return { start: 0, end: duration > 0 ? duration : 1 }
  })()
  const scrubLength = Math.max(0.001, scrubSpan.end - scrubSpan.start)

  const timeToScrubPercent = (t: number) =>
    ((Math.min(scrubSpan.end, Math.max(scrubSpan.start, t)) - scrubSpan.start) /
      scrubLength) *
    100

  const getProgressBarStyle = () => {
    const playheadPct = duration > 0 ? timeToScrubPercent(currentTime) : 0
    if (!constrainedPlayback?.enabled || duration <= 0) {
      return {
        left: '0%',
        width: `${playheadPct}%`,
      }
    }

    const { startTime, endTime } = constrainedPlayback
    return {
      constrainedStart: timeToScrubPercent(startTime),
      constrainedEnd: timeToScrubPercent(endTime),
      currentProgress: playheadPct,
      width: `${playheadPct}%`,
    }
  }

  const progressStyle = getProgressBarStyle()
  const hasRallyMarks = progressMarkers.length > 0

  return (
    <div
      ref={rootRef}
      className={cn('relative bg-bg-app w-full h-full overflow-hidden')}
      onPointerDown={claimHotkeys}
    >
      {effectiveVideoSrc ? (
        <video
          ref={videoRef}
          src={effectiveVideoSrc}
          className="w-full h-full object-contain"
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onRateChange={applyStoreSpeed}
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
                iOS may transcode to MP4 locally — no upload.
              </p>
            </div>
          ) : canChangeVideo ? (
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
                Videos stay on your device
              </p>
            </div>
          ) : (
            <div className="text-center text-neutral-400 text-sm px-4">No video loaded</div>
          )}
        </div>
      )}

      {showTimeOverlay && effectiveVideoSrc && (
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-video-scrim-strong text-white font-mono text-sm">
          {formatTime(currentTime)}
          {constrainedPlayback?.enabled && (
            <span className="text-neutral-400 ml-2">
              / {formatTime(constrainedPlayback.endTime)}
            </span>
          )}
        </div>
      )}

      {constrainedBadgeLabel && constrainedPlayback?.enabled && effectiveVideoSrc && (
        <div className="absolute top-4 right-16 px-2 py-1 rounded bg-brand-primary text-white text-xs font-medium">
          {constrainedBadgeLabel}
        </div>
      )}

      {shotDescription && effectiveVideoSrc && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-video-scrim-strong border border-video-scrim-border text-white text-sm font-medium shadow-lg">
          {shotDescription}
        </div>
      )}

      {effectiveVideoSrc && showProgressBar && (
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 z-20">
          <div
            className={cn(
              'bg-video-scrim-soft rounded-full cursor-pointer relative',
              hasRallyMarks ? 'h-3' : 'h-1.5'
            )}
            role="slider"
            aria-label="Video timeline"
            aria-valuemin={scrubSpan.start}
            aria-valuemax={scrubSpan.end}
            aria-valuenow={currentTime}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const percent = (e.clientX - rect.left) / rect.width
              if (duration > 0) {
                let targetTime = scrubSpan.start + percent * scrubLength

                if (constrainedPlayback?.enabled) {
                  const { startTime, endTime } = constrainedPlayback
                  targetTime = Math.max(startTime, Math.min(endTime, targetTime))
                }

                seek(targetTime)
              }
            }}
          >
            {constrainedPlayback?.enabled && 'constrainedStart' in progressStyle && (
              <div
                className="absolute top-0 bottom-0 bg-brand-primary/25 rounded-full pointer-events-none"
                style={{
                  left: `${progressStyle.constrainedStart}%`,
                  width: `${(progressStyle.constrainedEnd || 0) - (progressStyle.constrainedStart || 0)}%`,
                }}
              />
            )}

            {/* Soft elapsed wash under marks — marks stay colour-readable. */}
            <div
              className="absolute top-0 bottom-0 left-0 rounded-full bg-white/25 pointer-events-none"
              style={{ width: progressStyle.width }}
            />

            {progressMarkers.map((marker) => {
              const left = timeToScrubPercent(marker.startTime)
              const right = timeToScrubPercent(marker.endTime)
              const rawWidth = Math.max(right - left, marker.kind === 'draft' ? 0.7 : 2.2)
              const width = Math.min(100 - left, rawWidth)
              return (
                <button
                  key={marker.id}
                  type="button"
                  title={marker.title}
                  aria-label={marker.title ?? 'Rally mark'}
                  className={cn(
                    'absolute top-0 bottom-0 rounded-sm touch-manipulation border-0 p-0 z-[1]',
                    marker.focused && 'ring-1 ring-white z-[2] scale-y-110',
                    marker.kind === 'draft' ? 'opacity-90' : 'opacity-100'
                  )}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: marker.fillColor,
                    minWidth: marker.kind === 'draft' ? 3 : 5,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onProgressMarkerSeek) {
                      onProgressMarkerSeek(marker)
                    } else {
                      seek(marker.startTime)
                    }
                  }}
                >
                  {marker.stripeColor && (
                    <span
                      className="absolute inset-x-0 top-0 h-[3px] rounded-t-sm"
                      style={{ backgroundColor: marker.stripeColor }}
                      aria-hidden
                    />
                  )}
                </button>
              )
            })}

            {/* Playhead caret — does not wash out winner/server colours. */}
            <div
              className="absolute top-[-2px] bottom-[-2px] w-0.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)] pointer-events-none z-[3]"
              style={{ left: progressStyle.width }}
            />

            {constrainedPlayback?.enabled && 'constrainedStart' in progressStyle && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-brand-primary rounded pointer-events-none z-[2]"
                  style={{ left: `${progressStyle.constrainedStart}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-brand-primary rounded pointer-events-none z-[2]"
                  style={{ left: `${progressStyle.constrainedEnd}%` }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {effectiveVideoSrc && canChangeVideo && (
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
          <div className="px-3 py-1.5 rounded-lg bg-video-scrim-strong hover:bg-black border border-video-scrim-border text-white text-sm flex items-center gap-2 transition-colors">
            <Upload className="w-4 h-4" />
            Change
          </div>
        </label>
      )}
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'
