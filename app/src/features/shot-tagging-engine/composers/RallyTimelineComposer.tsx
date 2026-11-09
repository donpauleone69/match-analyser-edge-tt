/**
 * RallyTimelineComposer — four-mode Rally Timeline feel-test (tap-along contacts)
 *
 * Setup → tap contacts → 2s idle finalize → timeline while video loops.
 * In-memory only. Does not touch DB or tagging_phase.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import {
  SetupControlsBlock,
  RallyTimelineBlock,
  type SetupData,
} from '../blocks'
import { VideoPlayerSection } from '../sections'
import { type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { Button, Icon } from '@/ui-mine'
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
  timelineFromContacts,
  contactTimesFromTimeline,
  shotNumberAtTime,
  contactOverlayColor,
  loopWindowFromContacts,
  CONTACT_IDLE_MS,
  LOOP_PAD_SECONDS,
  TIMELINE_MODES,
  type RallyTimelineState,
  type TimelineMode,
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
type PhaseStep = 'setup' | 'tapping' | 'form' | 'complete'

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
  const [contactTimes, setContactTimes] = useState<number[]>([])
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

  const contactTimesRef = useRef(contactTimes)
  contactTimesRef.current = contactTimes
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPointLoop = () => {
    setConstrainedPlayback({
      enabled: false,
      startTime: 0,
      endTime: 0,
      loopOnEnd: true,
    })
  }

  const clearIdleTimer = () => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
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

  useEffect(() => () => clearIdleTimer(), [])

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
    serverName
  )
  const canSave = openRally
    ? canSaveRallyTimeline(timeline, winnerName)
    : false

  const patchTimeline = (updater: (prev: RallyTimelineState) => RallyTimelineState) => {
    setOpenRally((cur) => (cur ? { ...cur, timeline: updater(cur.timeline) } : cur))
  }

  const finalizeContacts = (times: number[]) => {
    if (times.length === 0) return
    clearIdleTimer()
    const serveTimestamp = times[0]
    const endTimestamp = times[times.length - 1]
    const duration = useVideoPlaybackStore.getState().duration
    const loop = loopWindowFromContacts(serveTimestamp, endTimestamp, duration)
    setOpenRally({
      serveTimestamp,
      endTimestamp,
      timeline: timelineFromContacts(times),
    })
    setContactTimes([])
    setMode('Rally')
    setPhase('form')
    setConstrainedPlayback({
      enabled: true,
      startTime: loop.startTime,
      endTime: loop.endTime,
      loopOnEnd: true,
    })
    videoPlayerRef.current?.seek(loop.startTime)
    videoPlayerRef.current?.play()
  }

  const scheduleIdleFinalize = () => {
    clearIdleTimer()
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null
      const times = contactTimesRef.current
      if (times.length >= 1) {
        finalizeContacts(times)
      }
    }, CONTACT_IDLE_MS)
  }

  const handleSetupComplete = (setup: SetupData) => {
    setSetupNextServer(setup.nextServerId)
    setCurrentScore({ player1: setup.p1Score, player2: setup.p2Score })
    setSetupComplete(true)
    setContactTimes([])
    setPhase('tapping')
    videoPlayerRef.current?.play()
  }

  const handleTapContact = () => {
    if (!setupComplete || !setReady || phase !== 'tapping') return
    const t = currentTime
    setContactTimes((prev) => [...prev, t])
    scheduleIdleFinalize()
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  const handleLet = () => {
    clearIdleTimer()
    clearPointLoop()
    const first = contactTimes[0]
    setContactTimes([])
    setOpenRally(null)
    setPhase('tapping')
    if (typeof first === 'number') {
      videoPlayerRef.current?.seek(first)
    }
    videoPlayerRef.current?.play()
  }

  /** Restart contact tapping for this rally (from form or mid-tap). */
  const handleRedoRally = () => {
    const seekSource =
      openRally?.serveTimestamp ??
      (contactTimes.length > 0 ? contactTimes[0] : null)
    if (seekSource === null && phase !== 'form') return

    clearIdleTimer()
    clearPointLoop()
    setOpenRally(null)
    setContactTimes([])
    setPhase('tapping')
    if (typeof seekSource === 'number') {
      videoPlayerRef.current?.seek(Math.max(0, seekSource - LOOP_PAD_SECONDS))
    }
    videoPlayerRef.current?.play()
  }

  const handleDiscardOpen = () => {
    if (!openRally) return
    const endAt = openRally.endTimestamp
    clearPointLoop()
    setOpenRally(null)
    setContactTimes([])
    setPhase('tapping')
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
    setContactTimes([])
    setPhase('tapping')
    clearPointLoop()
    videoPlayerRef.current?.seek(openRally.endTimestamp)
    videoPlayerRef.current?.play()
  }

  const handleEndSession = () => {
    if (completed.length === 0 && !openRally) return
    clearIdleTimer()
    clearPointLoop()
    setOpenRally(null)
    setContactTimes([])
    setPhase('complete')
  }

  const handleToggleShotChoice = (n: number, key: ShotChoiceKey, value: string) => {
    patchTimeline((s) => toggleShotChoice(s, n, key, value))
  }

  const handleMarkFos = (at: number) => {
    const time = currentTime
    patchTimeline((s) => markFos(s, at, time))
  }

  const handleMarkEnd = (at: number) => {
    patchTimeline((s) => markEnd(s, at))
  }

  const handleToggleEnding = (value: PointEnding) => {
    patchTimeline((s) => toggleEnding(s, value))
  }

  if (phase === 'complete') {
    const withFos = completed.filter((r) => r.timeline.fos !== null).length
    const avgShots =
      completed.length > 0
        ? (
            completed.reduce((sum, r) => sum + r.timeline.shotCount, 0) / completed.length
          ).toFixed(1)
        : '0'

    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="p-8 max-w-lg text-center bg-bg-card rounded-lg border border-neutral-700">
          <h2 className="text-2xl font-bold text-neutral-50 mb-2">Rally Timeline test complete</h2>
          <p className="text-neutral-400 mb-1">{completed.length} rallies tagged</p>
          <p className="text-neutral-500 text-sm mb-6">
            Avg contacts {avgShots} · With FOS {withFos}
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

  const tagBtn =
    'h-7 px-2 text-[11px] font-semibold rounded-md border border-neutral-600 text-neutral-200 hover:border-neutral-400 disabled:opacity-40 disabled:pointer-events-none'

  const contactCount = contactTimes.length
  const formContactTimes =
    phase === 'form' && openRally ? contactTimesFromTimeline(openRally.timeline) : []
  const overlayShot =
    phase === 'tapping'
      ? contactCount > 0
        ? contactCount
        : null
      : phase === 'form'
        ? shotNumberAtTime(formContactTimes, currentTime)
        : null
  const overlayColor =
    typeof overlayShot === 'number' ? contactOverlayColor(overlayShot) : null

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col bg-bg-surface overflow-hidden',
        className
      )}
    >
      {/* Full-width 16:9 video */}
      <div className="relative shrink-0 w-full bg-black overflow-hidden">
        <div className="relative w-full aspect-video">
          <VideoPlayerSection
            ref={videoPlayerRef}
            videoUrl={videoUrl}
            onVideoSelect={setVideoUrl}
            constrainedPlayback={constrainedPlayback}
          />
          {typeof overlayShot === 'number' && overlayColor && (
            <div
              className="absolute top-1/2 right-3 z-20 -translate-y-1/2 flex flex-col items-stretch gap-1.5 rounded-xl bg-neutral-950/90 px-3 py-2.5 shadow-lg border border-white/10"
              aria-live="polite"
              aria-label={
                phase === 'form'
                  ? `Shot ${overlayShot}`
                  : `${overlayShot} contacts`
              }
            >
              <span
                className="text-[56px] sm:text-[64px] font-black leading-none text-center tabular-nums select-none"
                style={{ color: overlayColor }}
              >
                {overlayShot}
              </span>
              <button
                type="button"
                onClick={handleRedoRally}
                className="h-8 rounded-md bg-neutral-100 text-neutral-900 text-[12px] font-bold tracking-wide hover:bg-white active:bg-neutral-200"
              >
                Redo
              </button>
            </div>
          )}
          {videoUrl && (
            <button
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={() => videoPlayerRef.current?.togglePlay()}
              className="absolute bottom-3 right-3 z-30 h-12 w-12 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/25"
            >
              <Icon name={isPlaying ? 'pause' : 'play'} className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-bg-surface">
        {!setupComplete ? (
          <div className="p-3 overflow-y-auto">
            <SetupControlsBlock
              player1Name={player1Name}
              player2Name={player2Name}
              onComplete={handleSetupComplete}
            />
          </div>
        ) : phase === 'tapping' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <TaggingSessionBar
              completed={completed}
              priorsOpen={priorsOpen}
              onTogglePriors={() => setPriorsOpen((o) => !o)}
              onEnd={handleEndSession}
              canEnd={completed.length > 0}
              tagBtn={tagBtn}
            />
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
              <Button
                variant="primary"
                onClick={handleTapContact}
                disabled={!setReady}
                className="w-full max-w-xs h-14 text-lg font-semibold"
              >
                Tap contact
              </Button>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                <Button
                  variant="secondary"
                  onClick={handleLet}
                  disabled={contactCount === 0}
                  className="w-full h-10 text-sm font-semibold"
                >
                  Let / discard
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleRedoRally}
                  disabled={contactCount === 0}
                  className="w-full h-10 text-sm font-semibold"
                >
                  Redo
                </Button>
              </div>
              <p className="text-[11px] text-neutral-500 text-center">
                {contactCount === 0
                  ? 'Tap each bat contact · first tap is the serve'
                  : `${contactCount} contact${contactCount === 1 ? '' : 's'} · auto-finishes after 2s idle`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Tagging chrome */}
            <div className="shrink-0 border-t border-neutral-700 bg-neutral-900">
              {/* Row 1: N tagged · score · Discard · End · Save */}
              <div className="h-9 px-2 flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => completed.length > 0 && setPriorsOpen((o) => !o)}
                  className={cn(
                    'shrink-0 px-1.5 h-7 rounded-md text-neutral-300',
                    completed.length > 0 && 'hover:bg-neutral-800'
                  )}
                >
                  {completed.length} tagged
                  {completed.length > 0 && (
                    <span className="ml-1 text-neutral-500">{priorsOpen ? '▾' : '▸'}</span>
                  )}
                </button>
                <span className="min-w-0 truncate font-mono text-neutral-400">
                  {currentScore.player1}–{currentScore.player2}
                </span>
                <div className="flex-1" />
                <button type="button" onClick={handleDiscardOpen} className={cn(tagBtn, 'shrink-0')}>
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleEndSession}
                  disabled={completed.length === 0 && !openRally}
                  className={cn(tagBtn, 'shrink-0')}
                >
                  End
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className={cn(
                    tagBtn,
                    'shrink-0 border-teal-600/60 text-teal-300',
                    canSave && 'bg-teal-700/40 border-teal-500 text-teal-100'
                  )}
                >
                  Save
                </button>
              </div>

              {priorsOpen && completed.length > 0 && (
                <div className="px-2 pb-1.5 max-h-16 overflow-y-auto space-y-0.5 border-t border-neutral-800">
                  {completed.map((r) => (
                    <div key={r.rallyIndex} className="text-[10px] text-neutral-400 leading-snug">
                      <span className="text-neutral-500">R{r.rallyIndex}</span> {r.summary}
                    </div>
                  ))}
                </div>
              )}

              {/* Row 2: modes */}
              <nav
                className="flex items-center gap-1 px-2 py-1 border-t border-neutral-800 bg-neutral-950"
                aria-label="Tag across shots"
              >
                {TIMELINE_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'h-7 px-2.5 rounded-full text-[11px] border whitespace-nowrap shrink-0',
                      mode === m
                        ? 'bg-neutral-100 text-neutral-900 border-neutral-100 font-bold'
                        : 'bg-transparent text-neutral-300 border-neutral-600 font-medium'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <RallyTimelineBlock
                state={timeline}
                mode={mode}
                players={players}
                server={serverName}
                onToggleShotChoice={handleToggleShotChoice}
                onMarkFos={handleMarkFos}
                onMarkEnd={handleMarkEnd}
                onToggleEnding={handleToggleEnding}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TaggingSessionBar({
  completed,
  priorsOpen,
  onTogglePriors,
  onEnd,
  canEnd,
  tagBtn,
}: {
  completed: CompletedRally[]
  priorsOpen: boolean
  onTogglePriors: () => void
  onEnd: () => void
  canEnd: boolean
  tagBtn: string
}) {
  return (
    <div className="shrink-0 border-t border-neutral-700 bg-neutral-900">
      <div className="h-9 px-2 flex items-center gap-2 text-[11px]">
        <button
          type="button"
          disabled={completed.length === 0}
          onClick={onTogglePriors}
          className={cn(
            'shrink-0 px-1.5 h-7 rounded-md text-neutral-300',
            completed.length > 0 && 'hover:bg-neutral-800',
            'disabled:opacity-40'
          )}
        >
          {completed.length} tagged
          {completed.length > 0 && (
            <span className="ml-1 text-neutral-500">{priorsOpen ? '▾' : '▸'}</span>
          )}
        </button>
        <div className="flex-1" />
        <button type="button" onClick={onEnd} disabled={!canEnd} className={tagBtn}>
          End
        </button>
      </div>
      {priorsOpen && completed.length > 0 && (
        <div className="px-2 pb-1.5 max-h-16 overflow-y-auto space-y-0.5 border-t border-neutral-800">
          {completed.map((r) => (
            <div key={r.rallyIndex} className="text-[10px] text-neutral-400 leading-snug">
              <span className="text-neutral-500">R{r.rallyIndex}</span> {r.summary}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
