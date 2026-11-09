/**
 * RallyTimelineComposer — four-mode Rally Timeline feel-test
 *
 * Serve → rally end → Let / Continue → timeline while video loops.
 * In-memory only. Does not touch DB or tagging_phase.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import {
  SetupControlsBlock,
  VideoControlsBar,
  RallyTimelineBlock,
  type SetupData,
} from '../blocks'
import { VideoPlayerSection } from '../sections'
import { type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { Button, ServeButton } from '@/ui-mine'
import { calculateServer } from '@/rules'
import { setDb } from '@/data'
import { getVideoFile } from '@/helpers/videoStorage'
import {
  emptyRallyTimelineState,
  canSaveRallyTimeline,
  inferWinnerName,
  summarizeRallyLine,
  toggleShotChoice,
  markFos,
  markEnd,
  toggleEnding,
  toggleLaterWinner,
  type RallyTimelineState,
  type TimelineMode,
  type ShotNumber,
  type PointEnding,
  type ShotChoiceKey,
} from './rallyTimelineModel'

export interface RallyTimelineComposerProps {
  matchId: string
  setNumber: number
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  className?: string
}

type WinnerId = 'player1' | 'player2'
type PhaseStep = 'setup' | 'serve' | 'rally' | 'gate' | 'form' | 'complete'

interface OpenRally {
  serveTimestamp: number
  endTimestamp: number
  timeline: RallyTimelineState
}

interface CompletedRally {
  rallyIndex: number
  serveTimestamp: number
  endTimestamp: number
  serverId: WinnerId
  winnerId: WinnerId
  serverName: string
  winnerName: string
  timeline: RallyTimelineState
  summary: string
}

export function RallyTimelineComposer({
  matchId,
  setNumber,
  player1Name,
  player2Name,
  className,
}: RallyTimelineComposerProps) {
  const navigate = useNavigate()
  const currentTime = useVideoPlaybackStore((state) => state.currentTime)
  const videoUrl = useVideoPlaybackStore((state) => state.videoUrl)
  const setVideoUrl = useVideoPlaybackStore((state) => state.setVideoUrl)
  const isPlaying = useVideoPlaybackStore((state) => state.isPlaying)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)

  const [setReady, setSetReady] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupNextServer, setSetupNextServer] = useState<'player1' | 'player2'>('player1')
  const [currentScore, setCurrentScore] = useState({ player1: 0, player2: 0 })

  const [phase, setPhase] = useState<PhaseStep>('setup')
  const [pendingServeAt, setPendingServeAt] = useState<number | null>(null)
  const [pendingEndAt, setPendingEndAt] = useState<number | null>(null)
  const [openRally, setOpenRally] = useState<OpenRally | null>(null)
  const [completed, setCompleted] = useState<CompletedRally[]>([])
  const [priorsOpen, setPriorsOpen] = useState(false)
  const [mode, setMode] = useState<TimelineMode>('Rally')
  const [constrainedPlayback, setConstrainedPlayback] = useState({
    enabled: false,
    startTime: 0,
    endTime: 0,
    loopOnEnd: true,
  })

  const clearPointLoop = () => {
    setConstrainedPlayback({
      enabled: false,
      startTime: 0,
      endTime: 0,
      loopOnEnd: true,
    })
  }

  useEffect(() => {
    const init = async () => {
      try {
        const sets = await setDb.getByMatchId(matchId)
        const target = sets.find((s) => s.set_number === setNumber)
        if (!target) {
          alert('Set not found')
          navigate('/matches')
          return
        }
        setSetReady(true)
        const sessionId = `${matchId}-${setNumber}`
        const videoFile = await getVideoFile(sessionId)
        if (videoFile) {
          setVideoUrl(URL.createObjectURL(videoFile))
        }
      } catch (error) {
        console.error('[RallyTimeline] Failed to init:', error)
        alert('Failed to load set for Rally Timeline test')
      }
    }
    init()
  }, [matchId, setNumber, navigate, setVideoUrl])

  const getPlayerName = (id: WinnerId) =>
    id === 'player1' ? player1Name : player2Name

  const winnerIdFromName = (name: string | null): WinnerId | null => {
    if (!name) return null
    if (name === player1Name) return 'player1'
    if (name === player2Name) return 'player2'
    return null
  }

  const openServerId = (
    setupComplete
      ? calculateServer({
          firstServerId: setupNextServer,
          player1Score: currentScore.player1,
          player2Score: currentScore.player2,
        }).serverId
      : 'player1'
  ) as WinnerId

  const players = useMemo(
    (): [string, string] => [player1Name, player2Name],
    [player1Name, player2Name]
  )
  const serverName = getPlayerName(openServerId)

  const timeline = openRally?.timeline ?? emptyRallyTimelineState()
  const winnerName = inferWinnerName(
    timeline.end,
    timeline.ending,
    players,
    serverName,
    timeline.laterWinner
  )
  const canSave = openRally
    ? canSaveRallyTimeline(timeline, winnerName)
    : false

  const patchTimeline = (updater: (prev: RallyTimelineState) => RallyTimelineState) => {
    setOpenRally((cur) => (cur ? { ...cur, timeline: updater(cur.timeline) } : cur))
  }

  const handleSetupComplete = (setup: SetupData) => {
    setSetupNextServer(setup.nextServerId)
    setCurrentScore({ player1: setup.p1Score, player2: setup.p2Score })
    setSetupComplete(true)
    setPhase('serve')
  }

  const handleServe = () => {
    if (!setupComplete || !setReady || phase !== 'serve') return
    setPendingServeAt(currentTime)
    setPendingEndAt(null)
    setPhase('rally')
    videoPlayerRef.current?.play()
  }

  const handleRallyEnd = () => {
    if (pendingServeAt === null || phase !== 'rally') return
    setPendingEndAt(currentTime)
    setPhase('gate')
    videoPlayerRef.current?.pause()
  }

  const handleLet = () => {
    if (pendingServeAt === null) return
    clearPointLoop()
    setPendingServeAt(null)
    setPendingEndAt(null)
    setOpenRally(null)
    setPhase('serve')
    videoPlayerRef.current?.seek(pendingServeAt)
  }

  const handleContinueToTimeline = () => {
    if (pendingServeAt === null || pendingEndAt === null || phase !== 'gate') return
    setOpenRally({
      serveTimestamp: pendingServeAt,
      endTimestamp: pendingEndAt,
      timeline: emptyRallyTimelineState(),
    })
    setPendingServeAt(null)
    setPendingEndAt(null)
    setMode('Rally')
    setPhase('form')
    setConstrainedPlayback({
      enabled: true,
      startTime: pendingServeAt,
      endTime: pendingEndAt,
      loopOnEnd: true,
    })
    videoPlayerRef.current?.seek(pendingServeAt)
    videoPlayerRef.current?.play()
  }

  const handleDiscardOpen = () => {
    if (!openRally) return
    const endAt = openRally.endTimestamp
    clearPointLoop()
    setOpenRally(null)
    setPhase('serve')
    videoPlayerRef.current?.seek(endAt)
    videoPlayerRef.current?.play()
  }

  const commitCompletedRally = (
    serveTimestamp: number,
    endTimestamp: number,
    winnerId: WinnerId,
    timelineState: RallyTimelineState,
    summary: string
  ) => {
    const scoreAfter = {
      player1: winnerId === 'player1' ? currentScore.player1 + 1 : currentScore.player1,
      player2: winnerId === 'player2' ? currentScore.player2 + 1 : currentScore.player2,
    }
    setCompleted((prev) => [
      ...prev,
      {
        rallyIndex: prev.length + 1,
        serveTimestamp,
        endTimestamp,
        serverId: openServerId,
        winnerId,
        serverName: getPlayerName(openServerId),
        winnerName: getPlayerName(winnerId),
        timeline: timelineState,
        summary,
      },
    ])
    setCurrentScore(scoreAfter)
  }

  const handleSave = () => {
    if (!openRally || !canSave || !winnerName) return
    const winnerId = winnerIdFromName(winnerName)
    if (!winnerId) return
    const summary = summarizeRallyLine(openRally.timeline, winnerName)
    commitCompletedRally(
      openRally.serveTimestamp,
      openRally.endTimestamp,
      winnerId,
      openRally.timeline,
      summary
    )
    setOpenRally(null)
    setPhase('serve')
    clearPointLoop()
    videoPlayerRef.current?.seek(openRally.endTimestamp)
    videoPlayerRef.current?.play()
  }

  const handleEndSession = () => {
    if (completed.length === 0 && !openRally) return
    clearPointLoop()
    setOpenRally(null)
    setPhase('complete')
  }

  const handleToggleShotChoice = (n: ShotNumber, key: ShotChoiceKey, value: string) => {
    patchTimeline((s) => toggleShotChoice(s, n, key, value))
  }

  const handleMarkFos = (at: ShotNumber | 'later') => {
    const time = currentTime
    patchTimeline((s) => markFos(s, at, time))
  }

  const handleMarkEnd = (at: ShotNumber | 'later') => {
    patchTimeline((s) => markEnd(s, at))
  }

  const handleToggleEnding = (value: PointEnding) => {
    patchTimeline((s) => toggleEnding(s, value))
  }

  const handleToggleLaterWinner = (name: string) => {
    patchTimeline((s) => toggleLaterWinner(s, name))
  }

  if (phase === 'complete') {
    const exactEnds = completed.filter((r) => typeof r.timeline.end === 'number').length
    const laterEnds = completed.filter((r) => r.timeline.end === 'later').length
    const withFos = completed.filter((r) => r.timeline.fos !== null).length

    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="p-8 max-w-lg text-center bg-bg-card rounded-lg border border-neutral-700">
          <h2 className="text-2xl font-bold text-neutral-50 mb-2">Rally Timeline test complete</h2>
          <p className="text-neutral-400 mb-1">{completed.length} rallies tagged</p>
          <p className="text-neutral-500 text-sm mb-6">
            Exact end {exactEnds} · 8+ {laterEnds} · With FOS {withFos}
            <br />
            Nothing saved — UI test only.
          </p>
          <Button variant="secondary" onClick={() => navigate('/matches')}>
            Back to Matches
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col bg-bg-surface overflow-hidden',
        className
      )}
    >
      <div className="shrink-0 w-full bg-black max-h-[32vh] flex items-center justify-center">
        <div className="w-full aspect-video max-h-[32vh]">
          <VideoPlayerSection
            ref={videoPlayerRef}
            videoUrl={videoUrl}
            onVideoSelect={setVideoUrl}
            constrainedPlayback={constrainedPlayback}
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-neutral-200 font-semibold truncate">
            {player1Name} vs {player2Name}
          </span>
          <span className="text-neutral-500">
            {currentScore.player1}–{currentScore.player2}
            {setupComplete && (
              <>
                {' · '}
                <span className={openServerId === 'player1' ? 'text-blue-400' : 'text-orange-400'}>
                  {getPlayerName(openServerId)} serving
                </span>
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-teal-400 font-semibold">Timeline</span>
          <Button
            variant="secondary"
            onClick={handleEndSession}
            disabled={completed.length === 0 && !openRally}
            className="h-7 px-2 text-[11px]"
          >
            End
          </Button>
        </div>
      </div>

      <div className="shrink-0">
        <VideoControlsBar
          isPlaying={isPlaying}
          onTogglePlay={() => videoPlayerRef.current?.togglePlay()}
          onFrameStepBack={() => videoPlayerRef.current?.stepFrame('backward')}
          onFrameStepForward={() => videoPlayerRef.current?.stepFrame('forward')}
          onRewind={() => videoPlayerRef.current?.seek(Math.max(0, currentTime - 10))}
          onFastForward={() => videoPlayerRef.current?.seek(currentTime + 10)}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-bg-surface">
        {!setupComplete ? (
          <div className="p-3">
            <SetupControlsBlock
              player1Name={player1Name}
              player2Name={player2Name}
              onComplete={handleSetupComplete}
            />
          </div>
        ) : phase === 'serve' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-3 pt-2">
              <PriorRallies
                completed={completed}
                open={priorsOpen}
                onToggle={() => setPriorsOpen((o) => !o)}
              />
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <ServeButton onClick={handleServe} disabled={!setReady} />
            </div>
          </div>
        ) : phase === 'rally' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-3 pt-2">
              <PriorRallies
                completed={completed}
                open={priorsOpen}
                onToggle={() => setPriorsOpen((o) => !o)}
              />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
              <p className="text-[12px] text-neutral-500">
                Watch the point — mark the end when it finishes
              </p>
              <Button
                variant="primary"
                onClick={handleRallyEnd}
                className="w-full max-w-xs h-14 text-base font-semibold"
              >
                Rally end
              </Button>
            </div>
          </div>
        ) : phase === 'gate' ? (
          <div className="p-3 space-y-3">
            <p className="text-[13px] font-semibold text-neutral-100 text-center">
              Tag this rally?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={handleLet}
                className="w-full h-12 text-sm font-semibold"
              >
                Let / discard
              </Button>
              <Button
                variant="primary"
                onClick={handleContinueToTimeline}
                className="w-full h-12 text-sm font-semibold"
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-3 space-y-3">
              <PriorRallies
                completed={completed}
                open={priorsOpen}
                onToggle={() => setPriorsOpen((o) => !o)}
              />

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={handleDiscardOpen}
                  className="h-7 px-2 text-[11px]"
                >
                  Discard rally
                </Button>
              </div>

              <RallyTimelineBlock
                state={timeline}
                mode={mode}
                onModeChange={setMode}
                players={players}
                server={serverName}
                onToggleShotChoice={handleToggleShotChoice}
                onMarkFos={handleMarkFos}
                onMarkEnd={handleMarkEnd}
                onToggleEnding={handleToggleEnding}
                onToggleLaterWinner={handleToggleLaterWinner}
              />
            </div>

            <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 p-3">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!canSave}
                className="w-full h-11 text-sm font-semibold"
              >
                Save & next rally
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PriorRallies({
  completed,
  open,
  onToggle,
}: {
  completed: CompletedRally[]
  open: boolean
  onToggle: () => void
}) {
  if (completed.length === 0) return null

  return (
    <div className="border border-neutral-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-neutral-400 hover:bg-neutral-800/50"
      >
        <span>{completed.length} tagged</span>
        <span>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1.5 max-h-28 overflow-y-auto">
          {completed.map((r) => (
            <div key={r.rallyIndex} className="text-[11px] text-neutral-300 leading-snug">
              <span className="text-neutral-500">R{r.rallyIndex}</span> {r.summary}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
