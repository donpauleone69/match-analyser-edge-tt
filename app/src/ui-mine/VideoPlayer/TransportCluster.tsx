/**
 * TransportCluster — shared rewind / speed / play controls for match video.
 *
 * Variants:
 * - overlay: compact chips on the video (Pass 1 style)
 * - footer: bordered buttons under the video (review / clips)
 */

import type { ReactNode } from 'react'
import { Icon } from '@/ui-mine/Icon'
import { cn } from '@/helpers/utils'
import {
  SEEK_STEP_SECONDS,
  canNudgePlaybackSpeed,
  formatPlaybackSpeed,
} from './playbackSpeeds'

export type TransportVariant = 'overlay' | 'footer'

export interface TransportClusterProps {
  variant?: TransportVariant
  isPlaying: boolean
  playbackSpeed: number
  disabled?: boolean
  showSeek?: boolean
  showSpeed?: boolean
  seekStepSeconds?: number
  onTogglePlay: () => void
  onSeekBy?: (deltaSeconds: number) => void
  onNudgeSpeed?: (direction: -1 | 1) => void
  /**
   * Overlay only: `spread` (default) puts play on the right with a spacer;
   * `cluster` keeps seek/speed/play together (e.g. HUD with score on the left).
   */
  overlayLayout?: 'spread' | 'cluster'
  /** Extra controls after the core cluster (e.g. Replay, playlist next). */
  trailing?: ReactNode
  className?: string
}

export function TransportCluster({
  variant = 'overlay',
  isPlaying,
  playbackSpeed,
  disabled = false,
  showSeek = true,
  showSpeed = true,
  seekStepSeconds = SEEK_STEP_SECONDS,
  onTogglePlay,
  onSeekBy,
  onNudgeSpeed,
  overlayLayout = 'spread',
  trailing,
  className,
}: TransportClusterProps) {
  const overlay = variant === 'overlay'
  const btn = overlay
    ? 'tag-control h-8 w-8 px-0 bg-black/70 text-white border-white/25 disabled:opacity-40'
    : 'h-10 min-w-10 px-3 rounded-md border border-neutral-600 text-neutral-100 flex items-center justify-center gap-1.5 text-sm hover:border-neutral-400 disabled:opacity-40 disabled:pointer-events-none'
  const playBtn = overlay
    ? 'tag-control h-8 min-w-8 px-2 bg-brand-primary text-on-accent border-brand-primary disabled:opacity-40'
    : btn
  const speedChip = overlay
    ? 'inline-flex h-8 min-w-[2.25rem] items-center justify-center text-center text-[11px] font-bold text-white tabular-nums bg-black/70 rounded-md px-1.5 border border-white/20'
    : 'h-10 min-w-10 px-3 rounded-md border border-neutral-600 text-neutral-100 flex items-center justify-center text-sm tabular-nums'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {showSeek && onSeekBy && (
        <>
          <button
            type="button"
            aria-label={`Rewind ${seekStepSeconds} seconds`}
            disabled={disabled}
            onClick={() => onSeekBy(-seekStepSeconds)}
            className={btn}
          >
            <Icon name="skip-back" size="sm" />
          </button>
          <button
            type="button"
            aria-label={`Forward ${seekStepSeconds} seconds`}
            disabled={disabled}
            onClick={() => onSeekBy(seekStepSeconds)}
            className={btn}
          >
            <Icon name="skip-forward" size="sm" />
          </button>
        </>
      )}

      {showSpeed && onNudgeSpeed && (
        <>
          <button
            type="button"
            aria-label="Slower"
            disabled={disabled || !canNudgePlaybackSpeed(playbackSpeed, -1)}
            onClick={() => onNudgeSpeed(-1)}
            className={btn}
          >
            <Icon name="minus" size="sm" />
          </button>
          <span className={speedChip} aria-label={`Speed ${formatPlaybackSpeed(playbackSpeed)}`}>
            {formatPlaybackSpeed(playbackSpeed)}
          </span>
          <button
            type="button"
            aria-label="Faster"
            disabled={disabled || !canNudgePlaybackSpeed(playbackSpeed, 1)}
            onClick={() => onNudgeSpeed(1)}
            className={btn}
          >
            <Icon name="plus" size="sm" />
          </button>
        </>
      )}

      {overlay && overlayLayout === 'spread' && <div className="flex-1" />}

      <button
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        disabled={disabled}
        onClick={onTogglePlay}
        className={playBtn}
      >
        <Icon name={isPlaying ? 'pause' : 'play'} size="sm" />
      </button>

      {trailing}
    </div>
  )
}
