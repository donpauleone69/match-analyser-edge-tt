/**
 * ClipStageBlock — the video for the current clip (or a saved reel) + controls.
 *
 * Clip mode plays the clip window and reports its end so the composer can move
 * on (virtual gameplay reel: no file is made). Reel mode plays a saved reel.
 */

import { forwardRef } from 'react'
import { Button, Icon, VideoPlayer, type VideoPlayerHandle } from '@/ui-mine'
import { cn } from '@/helpers/utils'

export interface ClipStageBlockProps {
  heading: string
  title: string
  subtitle: string
  position: number
  total: number
  videoUrl: string | null
  videoOrigin: 'device' | 'cloud' | null
  videoLoading: boolean
  /** Clip window; null in reel mode */
  window: { start: number; end: number } | null
  isPlaying: boolean
  autoAdvance: boolean
  missingMessage: string
  onVideoSelect?: (url: string) => void
  onClipEnd: () => void
  onTogglePlay: () => void
  onReplay: () => void
  onPrev: () => void
  onNext: () => void
  onToggleAutoAdvance: () => void
  onEdit?: () => void
  onClose?: () => void
}

export const ClipStageBlock = forwardRef<VideoPlayerHandle, ClipStageBlockProps>(
  (
    {
      heading,
      title,
      subtitle,
      position,
      total,
      videoUrl,
      videoOrigin,
      videoLoading,
      window,
      isPlaying,
      autoAdvance,
      missingMessage,
      onVideoSelect,
      onClipEnd,
      onTogglePlay,
      onReplay,
      onPrev,
      onNext,
      onToggleAutoAdvance,
      onEdit,
      onClose,
    },
    ref
  ) => {
    const ctl =
      'h-10 min-w-10 px-3 rounded-md border border-neutral-600 text-neutral-100 flex items-center justify-center gap-1.5 text-sm hover:border-neutral-400 disabled:opacity-40 disabled:pointer-events-none'
    const clipMode = window !== null
    return (
      <div className="rounded-xl border border-neutral-700 bg-bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-700">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500 truncate">
              {heading}
              {total > 0 && ` · ${position + 1} of ${total}`}
            </p>
            <p className="text-sm font-semibold text-neutral-50 truncate">
              {title}
              {subtitle && <span className="ml-2 font-normal text-neutral-400">{subtitle}</span>}
            </p>
          </div>
          {videoOrigin && (
            <span
              className={cn(
                'hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                videoOrigin === 'cloud' ? 'bg-sky-950 text-sky-300' : 'bg-neutral-800 text-neutral-400'
              )}
              title={videoOrigin === 'cloud' ? 'Streaming from your cloud backup' : 'Playing from this device'}
            >
              <Icon name={videoOrigin === 'cloud' ? 'cloud' : 'hard-drive'} size="xs" />
              {videoOrigin === 'cloud' ? 'Cloud' : 'Device'}
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-50 hover:bg-neutral-700"
            >
              <Icon name="x" size="md" />
            </button>
          )}
        </div>

        <div className="relative w-full aspect-video bg-black">
          {videoLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400 gap-2">
              <Icon name="loader" size="sm" className="animate-spin" /> Finding video…
            </div>
          ) : (
            <VideoPlayer
              ref={ref}
              videoSrc={videoUrl ?? undefined}
              onVideoSelect={onVideoSelect}
              showTimeOverlay={false}
              onConstrainedEnd={onClipEnd}
              constrainedPlayback={
                window ? { enabled: true, startTime: window.start, endTime: window.end, loopOnEnd: false } : undefined
              }
            />
          )}
          {!videoLoading && !videoUrl && (
            <p className="absolute bottom-3 inset-x-0 px-4 text-center text-xs text-neutral-400 pointer-events-none">
              {missingMessage}
            </p>
          )}
        </div>

        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
          <button type="button" className={ctl} onClick={onPrev} disabled={position <= 0} aria-label="Previous clip">
            <Icon name="chevron-left" size="sm" />
          </button>
          <button type="button" className={ctl} onClick={onTogglePlay} disabled={!videoUrl} aria-label={isPlaying ? 'Pause' : 'Play'}>
            <Icon name={isPlaying ? 'pause' : 'play'} size="sm" />
          </button>
          <button type="button" className={ctl} onClick={onReplay} disabled={!videoUrl}>
            <Icon name="rotate-ccw" size="sm" /> Replay
          </button>
          <button type="button" className={ctl} onClick={onNext} disabled={position >= total - 1} aria-label="Next clip">
            <Icon name="chevron-right" size="sm" />
          </button>
          {clipMode && (
            <label className="ml-1 flex items-center gap-2 text-xs text-neutral-400 select-none cursor-pointer">
              <input type="checkbox" checked={autoAdvance} onChange={onToggleAutoAdvance} className="accent-brand-primary" />
              Play through
            </label>
          )}
          <span className="flex-1" />
          {onEdit && (
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Icon name="edit" size="sm" /> Edit tags
            </Button>
          )}
        </div>
      </div>
    )
  }
)

ClipStageBlock.displayName = 'ClipStageBlock'
