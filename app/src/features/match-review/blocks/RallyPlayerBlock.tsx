/**
 * RallyPlayerBlock — watch a rally (or a playlist of rallies) in a modal.
 *
 * Loops the rally window. When the set's video is not loaded on this device,
 * the player shows its file picker; the composer saves the file for next time.
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
  MatchVideoOverlayIconButton,
  MATCH_VIDEO_OVERLAY_BOTTOM_CLASS,
  parseScorePair,
  shortPlayerName,
  type VideoPlayerHandle,
  useVideoPlaybackStore,
  nudgePlaybackSpeed,
  SEEK_STEP_SECONDS,
} from '@/ui-mine'
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
  heroName: string
  villainName: string
  /** Sets won before this rally's set (optional HUD context). */
  player1Sets?: number
  player2Sets?: number
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
      heroName,
      villainName,
      player1Sets = 0,
      player2Sets = 0,
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
    const playbackSpeed = useVideoPlaybackStore((s) => s.playbackSpeed)
    const setPlaybackSpeed = useVideoPlaybackStore((s) => s.setPlaybackSpeed)

    const handleSeekBy = (deltaSeconds: number) => {
      if (!ref || typeof ref === 'function') return
      const player = ref.current
      if (!player) return
      player.seek(player.getCurrentTime() + deltaSeconds)
    }

    const scorePair = parseScorePair(rally.scoreBefore)
    const p1Short = shortPlayerName(heroName)
    const p2Short = shortPlayerName(villainName)
    const serveShort = shortPlayerName(rally.serverName)
    const scoreHud = scorePair ? (
      <MatchScoreHud
        compact
        setNumber={rally.setNumber}
        player1Name={p1Short}
        player2Name={p2Short}
        player1Score={scorePair.player1}
        player2Score={scorePair.player2}
        player1Sets={player1Sets}
        player2Sets={player2Sets}
        showSets={player1Sets > 0 || player2Sets > 0}
        serverSide={rally.heroServed ? 'player1' : 'player2'}
        serverName={serveShort}
      />
    ) : null

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
                {rally.isIncomplete ? (
                  <span className="ml-2 text-callout-warning">Incomplete</span>
                ) : (
                  <span className={rally.heroWon ? 'ml-2 text-result-winner' : 'ml-2 text-result-error'}>
                    {rally.winnerName.split(' ')[0]} won
                  </span>
                )}
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
            <VideoStageChrome
              bottomOverlayClassName={MATCH_VIDEO_OVERLAY_BOTTOM_CLASS}
              bottomOverlay={
                videoUrl ? (
                  <MatchVideoOverlayBar
                    score={scoreHud}
                    isPlaying={isPlaying}
                    playbackSpeed={playbackSpeed}
                    disabled={!videoUrl}
                    seekStepSeconds={SEEK_STEP_SECONDS}
                    onTogglePlay={onTogglePlay}
                    onSeekBy={handleSeekBy}
                    onNudgeSpeed={(dir) => setPlaybackSpeed(nudgePlaybackSpeed(playbackSpeed, dir))}
                    trailing={
                      <>
                        <MatchVideoOverlayIconButton
                          onClick={onReplay}
                          disabled={!videoUrl || !loop}
                          aria-label="Replay"
                          title="Replay"
                        >
                          <Icon name="rotate-ccw" size="sm" />
                        </MatchVideoOverlayIconButton>
                        <MatchVideoOverlayIconButton
                          onClick={onPrev}
                          disabled={position === 0}
                          aria-label="Previous rally"
                        >
                          <Icon name="chevron-left" size="sm" />
                        </MatchVideoOverlayIconButton>
                        <MatchVideoOverlayIconButton
                          onClick={onNext}
                          disabled={position >= total - 1}
                          aria-label="Next rally"
                        >
                          <Icon name="chevron-right" size="sm" />
                        </MatchVideoOverlayIconButton>
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
                allowVideoChange={!videoUrl}
                showProgressBar
                constrainedPlayback={
                  loop ? { enabled: true, startTime: loop.start, endTime: loop.end, loopOnEnd: true } : undefined
                }
              />
            </VideoStageChrome>
            {!videoUrl && (
              <p className="absolute bottom-3 inset-x-0 text-center text-xs text-neutral-400 pointer-events-none">
                Video for Set {rally.setNumber} isn’t on this device yet — load it once and it’s remembered.
              </p>
            )}
            {videoUrl && !loop && (
              <p className="absolute top-3 inset-x-0 text-center text-xs text-warning">
                This rally has no contact times, so it can’t be clipped.
              </p>
            )}
          </div>

          <div className="px-4 py-2.5 flex flex-wrap items-center gap-2">
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
