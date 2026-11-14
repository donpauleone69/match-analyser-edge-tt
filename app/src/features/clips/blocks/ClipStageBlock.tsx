/**
 * ClipStageBlock — the video for the current clip (or a saved reel) + controls.
 *
 * Clip mode plays the clip window and reports its end so the composer can move
 * on (virtual gameplay reel: no file is made). Reel mode plays a saved reel.
 * Shot-based playlists can toggle Whole rally (default) vs Shot. Speed uses the
 * shared match ladder (0.5×–2×).
 *
 * Transport + score use the Pass 1 overlay spine (MatchVideoOverlayBar).
 */

import { forwardRef } from 'react'
import {
  Button,
  Icon,
  VideoPlayer,
  VideoStageChrome,
  MatchScoreHud,
  MatchVideoOverlayBar,
  MATCH_VIDEO_OVERLAY_BOTTOM_CLASS,
  type MatchScoreHudProps,
  type VideoPlayerHandle,
  useVideoPlaybackStore,
  nudgePlaybackSpeed,
  SEEK_STEP_SECONDS,
} from '@/ui-mine'
import { cn } from '@/helpers/utils'
import type { ClipPlaybackMode } from '@/rules/derive/clips/deriveClips'

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
  /** Whole rally vs Shot — only when playlist is shot-based */
  playbackMode?: ClipPlaybackMode | null
  onPlaybackModeChange?: (mode: ClipPlaybackMode) => void
  onVideoSelect?: (url: string) => void
  onClipEnd: () => void
  onTogglePlay: () => void
  onReplay: () => void
  onPrev: () => void
  onNext: () => void
  onToggleAutoAdvance: () => void
  onEdit?: () => void
  onClose?: () => void
  /** Pass 1 scorebug on the video (omit for reels / unknown score). */
  scoreHud?: MatchScoreHudProps | null
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
      playbackMode = null,
      onPlaybackModeChange,
      onVideoSelect,
      onClipEnd,
      onTogglePlay,
      onReplay,
      onPrev,
      onNext,
      onToggleAutoAdvance,
      onEdit,
      onClose,
      scoreHud = null,
    },
    ref
  ) => {
    const playbackSpeed = useVideoPlaybackStore((s) => s.playbackSpeed)
    const setPlaybackSpeed = useVideoPlaybackStore((s) => s.setPlaybackSpeed)
    const chip =
      'tag-control h-7 min-w-7 px-1.5 bg-black/70 text-white border-white/25 disabled:opacity-40'
    const clipMode = window !== null
    const reelMode = !clipMode
    const showWindowToggle = clipMode && playbackMode != null && onPlaybackModeChange
    const showPlaylistNav = total > 1

    const handleSeekBy = (deltaSeconds: number) => {
      if (!ref || typeof ref === 'function') return
      const player = ref.current
      if (!player) return
      player.seek(player.getCurrentTime() + deltaSeconds)
    }

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
            <VideoStageChrome
              bottomOverlayClassName={MATCH_VIDEO_OVERLAY_BOTTOM_CLASS}
              bottomOverlay={
                videoUrl ? (
                  <MatchVideoOverlayBar
                    score={scoreHud ? <MatchScoreHud {...scoreHud} compact /> : null}
                    isPlaying={isPlaying}
                    playbackSpeed={playbackSpeed}
                    disabled={!videoUrl}
                    seekStepSeconds={SEEK_STEP_SECONDS}
                    onTogglePlay={onTogglePlay}
                    onSeekBy={handleSeekBy}
                    onNudgeSpeed={(dir) => setPlaybackSpeed(nudgePlaybackSpeed(playbackSpeed, dir))}
                    trailing={
                      <>
                        <button
                          type="button"
                          className={chip}
                          onClick={onReplay}
                          disabled={!videoUrl}
                          aria-label="Replay"
                          title="Replay"
                        >
                          <Icon name="rotate-ccw" size="sm" />
                        </button>
                        {showPlaylistNav && (
                          <>
                            <button
                              type="button"
                              className={chip}
                              onClick={onPrev}
                              disabled={position <= 0}
                              aria-label="Previous clip"
                            >
                              <Icon name="chevron-left" size="sm" />
                            </button>
                            <button
                              type="button"
                              className={chip}
                              onClick={onNext}
                              disabled={position >= total - 1}
                              aria-label="Next clip"
                            >
                              <Icon name="chevron-right" size="sm" />
                            </button>
                          </>
                        )}
                      </>
                    }
                  />
                ) : null
              }
            >
              <VideoPlayer
                ref={ref}
                videoSrc={videoUrl ?? undefined}
                onVideoSelect={onVideoSelect}
                allowVideoChange={Boolean(onVideoSelect) && !reelMode}
                showTimeOverlay
                onConstrainedEnd={onClipEnd}
                constrainedPlayback={
                  window ? { enabled: true, startTime: window.start, endTime: window.end, loopOnEnd: false } : undefined
                }
              />
            </VideoStageChrome>
          )}
          {!videoLoading && !videoUrl && (
            <p className="absolute bottom-3 inset-x-0 px-4 text-center text-xs text-neutral-400 pointer-events-none">
              {missingMessage}
            </p>
          )}
        </div>

        <div className="px-4 py-2.5 flex flex-wrap items-center gap-2">
          {showWindowToggle && (
            <div className="flex rounded-md border border-neutral-600 overflow-hidden text-xs">
              <button
                type="button"
                className={cn(
                  'px-2.5 h-9 transition-colors',
                  playbackMode === 'rally' ? 'bg-neutral-600 text-neutral-50' : 'text-neutral-400 hover:text-neutral-100'
                )}
                onClick={() => onPlaybackModeChange('rally')}
              >
                <span className="md:hidden">Rally</span>
                <span className="hidden md:inline">Whole rally</span>
              </button>
              <button
                type="button"
                className={cn(
                  'px-2.5 h-9 transition-colors border-l border-neutral-600',
                  playbackMode === 'shot' ? 'bg-neutral-600 text-neutral-50' : 'text-neutral-400 hover:text-neutral-100'
                )}
                onClick={() => onPlaybackModeChange('shot')}
              >
                Shot
              </button>
            </div>
          )}
          {clipMode && (
            <label className="flex items-center gap-2 text-xs text-neutral-400 select-none cursor-pointer">
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
