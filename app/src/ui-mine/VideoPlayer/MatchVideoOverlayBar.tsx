/**
 * MatchVideoOverlayBar — Pass 1 bottom overlay spine: score left, transport right.
 *
 * Drop into VideoStageChrome `bottomOverlay`. Clips / Work-on / Rallies / Review
 * should use this instead of footer TransportCluster rows so chrome stays one language.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/helpers/utils'
import { TransportCluster, type TransportClusterProps } from './TransportCluster'

const OVERLAY_TRANSPORT_CLASS =
  'h-7 shrink-0 gap-0.5 [&_button]:h-7 [&_button]:min-w-7 [&_button]:w-7 [&_span]:inline-flex [&_span]:h-7 [&_span]:min-w-7 [&_span]:items-center [&_span]:justify-center [&_span]:px-1 [&_span]:py-0 [&_span]:text-[10px]'

/** Trailing playlist / replay chips beside overlay transport (Clips, Rallies). */
export const MATCH_VIDEO_OVERLAY_CHIP_CLASS =
  'tag-control h-7 min-w-7 px-1.5 bg-black/70 text-white border-white/25 disabled:opacity-40'

export interface MatchVideoOverlayBarProps
  extends Pick<
    TransportClusterProps,
    | 'isPlaying'
    | 'playbackSpeed'
    | 'disabled'
    | 'showSeek'
    | 'showSpeed'
    | 'showMute'
    | 'seekStepSeconds'
    | 'onTogglePlay'
    | 'onSeekBy'
    | 'onNudgeSpeed'
    | 'trailing'
  > {
  /** Usually `<MatchScoreHud … />`. Omit when score is unavailable. */
  score?: ReactNode
  className?: string
  transportClassName?: string
}

/** Score + overlay transport on one h-7 baseline (Pass 1 canonical). */
export function MatchVideoOverlayBar({
  score,
  isPlaying,
  playbackSpeed,
  disabled,
  showSeek,
  showSpeed,
  showMute,
  seekStepSeconds,
  onTogglePlay,
  onSeekBy,
  onNudgeSpeed,
  trailing,
  className,
  transportClassName,
}: MatchVideoOverlayBarProps) {
  return (
    <div className={cn('flex h-7 min-w-0 items-end justify-between gap-1.5', className)}>
      <div className="flex h-7 min-w-0 shrink items-end">{score}</div>
      <TransportCluster
        variant="overlay"
        overlayLayout="cluster"
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        disabled={disabled}
        showSeek={showSeek}
        showSpeed={showSpeed}
        showMute={showMute}
        seekStepSeconds={seekStepSeconds}
        onTogglePlay={onTogglePlay}
        onSeekBy={onSeekBy}
        onNudgeSpeed={onNudgeSpeed}
        trailing={trailing}
        className={cn(OVERLAY_TRANSPORT_CLASS, transportClassName)}
      />
    </div>
  )
}

export type MatchVideoOverlayIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

/** Icon chip for MatchVideoOverlayBar `trailing` (replay / prev / next). */
export function MatchVideoOverlayIconButton({
  className,
  type = 'button',
  ...props
}: MatchVideoOverlayIconButtonProps) {
  return <button type={type} className={cn(MATCH_VIDEO_OVERLAY_CHIP_CLASS, className)} {...props} />
}

/** Shared bottom offset so HUD clears the progress bar + rally marks (Pass 1 / Simple). */
export const MATCH_VIDEO_OVERLAY_BOTTOM_CLASS = '!bottom-5'
