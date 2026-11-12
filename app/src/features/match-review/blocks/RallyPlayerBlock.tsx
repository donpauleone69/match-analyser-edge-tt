/**
 * RallyPlayerBlock — watch a rally (or a playlist of rallies) in a modal.
 *
 * Loops the rally window. When the set's video is not loaded on this device,
 * the player shows its file picker; the composer saves the file for next time.
 */

import { forwardRef } from 'react'
import { Button, Icon, VideoPlayer, type VideoPlayerHandle } from '@/ui-mine'
import type { RallyRowModel } from '../models'

export interface RallyPlayerBlockProps {
  rally: RallyRowModel
  position: number
  total: number
  playlistTitle: string
  videoUrl: string | null
  /** Loop window; null when the rally has no contact times */
  loop: { start: number; end: number } | null
  isPlaying: boolean
  onVideoSelect: (url: string) => void
  onTogglePlay: () => void
  onReplay: () => void
  onPrev: () => void
  onNext: () => void
  onEdit: () => void
  onClose: () => void
}

export const RallyPlayerBlock = forwardRef<VideoPlayerHandle, RallyPlayerBlockProps>(
  (
    {
      rally,
      position,
      total,
      playlistTitle,
      videoUrl,
      loop,
      isPlaying,
      onVideoSelect,
      onTogglePlay,
      onReplay,
      onPrev,
      onNext,
      onEdit,
      onClose,
    },
    ref
  ) => {
    const ctl =
      'h-10 min-w-10 px-3 rounded-md border border-neutral-600 text-neutral-100 flex items-center justify-center gap-1.5 text-sm hover:border-neutral-400 disabled:opacity-40 disabled:pointer-events-none'
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 md:p-6" role="dialog" aria-label="Rally player">
        <div className="w-full max-w-4xl bg-bg-card border border-neutral-700 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-700">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500 truncate">
                {playlistTitle} · {position + 1} of {total}
              </p>
              <p className="text-sm font-semibold text-neutral-50 truncate">
                Set {rally.setNumber} · Rally {rally.rallyIndex}
                <span className="ml-2 font-mono text-neutral-400 font-normal">
                  {rally.scoreBefore} → {rally.scoreAfter}
                </span>
                <span className={rally.heroWon ? 'ml-2 text-emerald-400' : 'ml-2 text-rose-400'}>
                  {rally.winnerName.split(' ')[0]} won
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close player"
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-50 hover:bg-neutral-700"
            >
              <Icon name="x" size="md" />
            </button>
          </div>

          <div className="relative w-full aspect-video bg-black">
            <VideoPlayer
              ref={ref}
              videoSrc={videoUrl ?? undefined}
              onVideoSelect={onVideoSelect}
              showTimeOverlay={false}
              constrainedPlayback={
                loop ? { enabled: true, startTime: loop.start, endTime: loop.end, loopOnEnd: true } : undefined
              }
            />
            {!videoUrl && (
              <p className="absolute bottom-3 inset-x-0 text-center text-xs text-neutral-400 pointer-events-none">
                Video for Set {rally.setNumber} isn’t on this device yet — load it once and it’s remembered.
              </p>
            )}
            {videoUrl && !loop && (
              <p className="absolute top-3 inset-x-0 text-center text-xs text-amber-300">
                This rally has no contact times, so it can’t be clipped.
              </p>
            )}
          </div>

          <div className="px-4 py-3 flex flex-wrap items-center gap-2">
            <button type="button" className={ctl} onClick={onPrev} disabled={position === 0} aria-label="Previous rally">
              <Icon name="chevron-left" size="sm" />
            </button>
            <button type="button" className={ctl} onClick={onTogglePlay} disabled={!videoUrl} aria-label={isPlaying ? 'Pause' : 'Play'}>
              <Icon name={isPlaying ? 'pause' : 'play'} size="sm" />
            </button>
            <button type="button" className={ctl} onClick={onReplay} disabled={!videoUrl || !loop}>
              <Icon name="rotate-ccw" size="sm" /> Replay
            </button>
            <button type="button" className={ctl} onClick={onNext} disabled={position >= total - 1} aria-label="Next rally">
              <Icon name="chevron-right" size="sm" />
            </button>
            <p className="text-xs text-neutral-400 flex-1 min-w-[12rem] truncate">{rally.summary}</p>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Icon name="edit" size="sm" /> Edit tags
            </Button>
          </div>
        </div>
      </div>
    )
  }
)

RallyPlayerBlock.displayName = 'RallyPlayerBlock'
