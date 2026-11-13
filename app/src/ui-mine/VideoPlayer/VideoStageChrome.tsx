/**
 * VideoStageChrome — slot wrapper around a video surface.
 *
 * Keeps context overlays (score, contact #) and transport out of VideoPlayer
 * so every match-video window can share the same media core.
 */

import type { ReactNode, MouseEventHandler } from 'react'
import { cn } from '@/helpers/utils'

export interface VideoStageChromeProps {
  children: ReactNode
  topLeft?: ReactNode
  topRight?: ReactNode
  bottomOverlay?: ReactNode
  className?: string
  onPointerDown?: MouseEventHandler<HTMLDivElement>
}

export function VideoStageChrome({
  children,
  topLeft,
  topRight,
  bottomOverlay,
  className,
  onPointerDown,
}: VideoStageChromeProps) {
  return (
    <div className={cn('relative w-full h-full', className)} onPointerDown={onPointerDown}>
      {children}
      {(topLeft || topRight) && (
        <div className="absolute top-2 left-2 right-2 z-30 flex items-start gap-1.5 pointer-events-none">
          {topLeft && <div className="pointer-events-auto flex items-center gap-1.5">{topLeft}</div>}
          <div className="flex-1" />
          {topRight && <div className="pointer-events-auto flex items-center gap-1.5">{topRight}</div>}
        </div>
      )}
      {bottomOverlay && (
        <div className="absolute bottom-6 left-2 right-2 z-30 pointer-events-none">
          <div className="pointer-events-auto">{bottomOverlay}</div>
        </div>
      )}
    </div>
  )
}
