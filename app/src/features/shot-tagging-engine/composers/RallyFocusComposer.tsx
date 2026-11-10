/**
 * RallyFocusComposer — coaching-phase copy of the Rally Timeline feel-test
 *
 * Setup → tap contacts → 2s idle finalize → timeline while video loops.
 * In-memory only. Does not touch DB or tagging_phase.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import {
  SetupControlsBlock,
  RallyFocusBlock,
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
  PLAYBACK_SPEED_STEPS,
  CAPTURE_PLAYBACK_SPEED,
  NORMAL_PLAYBACK_SPEED,
  toggleAttackable,
  type RallyTimelineState,
  type PointEnding,
  type ShotChoiceKey,
} from './rallyFocusModel'

/** How far Redo rewinds when there are no contacts yet */
const REDO_REWIND_SECONDS = 2

export interface RallyFocusComposerProps {
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
  isHighlight: boolean
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
  isHighlight: boolean
}

export function RallyFocusComposer({
  matchId,
  setNumber,
  player1Name,
  player2Name,
  className,
}: RallyFocusComposerProps) {
  const navigate = useNavigate()
  const videoUrl = useVideoPlaybackStore((state) => state.videoUrl)
  const setVideoUrl = useVideoPlaybackStore((state) => state.setVideoUrl)
  const setCurrentTime = useVideoPlaybackStore((state) => state.setCurrentTime)
  const isPlaying = useVideoPlaybackStore((state) => state.isPlaying)
  const playbackSpeed = useVideoPlaybackStore((state) => state.playbackSpeed)
  const setPlaybackSpeed = useVideoPlaybackStore((state) => state.setPlaybackSpeed)
  const duration = useVideoPlaybackStore((state) => state.duration)
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
  const [constrainedPlayback, setConstrainedPlayback] = useState({
    enabled: false,
    startTime: 0,
    endTime: 0,
    loopOnEnd: true,
  })
  /** Live element time for form overlay (avoids timeupdate lag). */
  const [liveTime, setLiveTime] = useState(0)
  /** When true, shot rows from 2 onward pick the first attack. */
  const [fosPickMode, setFosPickMode] = useState(false)

  const contactTimesRef = useRef(contactTimes)
  contactTimesRef.current = contactTimes
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Prefer the <video> element's clock over the ~4 Hz store sample. */
  const readVideoTime = () =>
    videoPlayerRef.current?.getCurrentTime() ??
    useVideoPlaybackStore.getState().currentTime

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
        console.error('[RallyFocus] Failed to init:', error)
        alert('Failed to load set for Rally Focus test')
      }
    }
    init()
  }, [matchId, setNumber, navigate, setVideoUrl])

  useEffect(() => () => clearIdleTimer(), [])

  // Sample live video time for the form overlay and the tapping timeline
  useEffect(() => {
    if (phase !== 'form' && phase !== 'tapping') return
    let rafId = 0
    const tick = () => {
      setLiveTime(readVideoTime())
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
    // readVideoTime closes over the stable videoPlayerRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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

  useEffect(() => {
    if (phase !== 'form' || typeof timeline.fos !== 'number') return
    document
      .querySelector(`[data-rally-shot="${timeline.fos}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [phase, timeline.fos])

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
      isHighlight: false,
    })
    setContactTimes([])
    setFosPickMode(true)
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
    const t = readVideoTime()
    setCurrentTime(t)
    const isServeTap = contactTimes.length === 0
    setContactTimes((prev) => [...prev, t])
    if (isServeTap) {
      setPlaybackSpeed(CAPTURE_PLAYBACK_SPEED)
    }
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
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    if (typeof first === 'number') {
      videoPlayerRef.current?.seek(first)
    }
    videoPlayerRef.current?.play()
  }

  /** Restart contact tapping for this rally (from form or mid-tap), or rewind if empty. */
  const handleRedoRally = () => {
    const seekSource =
      openRally?.serveTimestamp ??
      (contactTimes.length > 0 ? contactTimes[0] : null)

    clearIdleTimer()
    clearPointLoop()
    setOpenRally(null)
    setContactTimes([])
    setPhase('tapping')
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)

    if (typeof seekSource === 'number') {
      videoPlayerRef.current?.seek(Math.max(0, seekSource - LOOP_PAD_SECONDS))
    } else {
      const t = readVideoTime()
      videoPlayerRef.current?.seek(Math.max(0, t - REDO_REWIND_SECONDS))
    }
    videoPlayerRef.current?.play()
  }

  const nudgePlaybackSpeed = (direction: -1 | 1) => {
    const steps = PLAYBACK_SPEED_STEPS
    let idx = steps.findIndex((s) => s >= playbackSpeed - 0.001)
    if (idx < 0) idx = steps.indexOf(1) >= 0 ? steps.indexOf(1) : 0
    // If current is between steps, snap toward nearest then step
    const exact = steps.findIndex((s) => Math.abs(s - playbackSpeed) < 0.001)
    const from = exact >= 0 ? exact : idx
    const next = Math.max(0, Math.min(steps.length - 1, from + direction))
    setPlaybackSpeed(steps[next])
  }

  const handleDiscardOpen = () => {
    if (!openRally) return
    const endAt = openRally.endTimestamp
    clearPointLoop()
    setOpenRally(null)
    setContactTimes([])
    setPhase('tapping')
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    videoPlayerRef.current?.seek(endAt)
    videoPlayerRef.current?.play()
  }

  const commitCompletedRally = (
    serveTimestamp: number,
    endTimestamp: number,
    winnerId: WinnerId,
    timelineState: RallyTimelineState,
    summary: string,
    isHighlight: boolean
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
        isHighlight,
      },
    ])
    setCurrentScore(scoreAfter)
  }

  const handleToggleHighlight = () => {
    setOpenRally((cur) => (cur ? { ...cur, isHighlight: !cur.isHighlight } : cur))
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
      summary,
      openRally.isHighlight
    )
    setOpenRally(null)
    setContactTimes([])
    setPhase('tapping')
    clearPointLoop()
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    videoPlayerRef.current?.seek(openRally.endTimestamp)
    videoPlayerRef.current?.play()
  }

  const handleEndSession = () => {
    if (completed.length === 0 && !openRally) return
    clearIdleTimer()
    clearPointLoop()
    setOpenRally(null)
    setContactTimes([])
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    setPhase('complete')
  }

  const handleToggleShotChoice = (n: number, key: ShotChoiceKey, value: string) => {
    patchTimeline((s) => toggleShotChoice(s, n, key, value))
  }

  const handleToggleAttackable = (n: number) => {
    patchTimeline((s) => toggleAttackable(s, n))
  }

  const handleMarkFos = (at: number) => {
    if (!openRally || !fosPickMode) return
    if (openRally.timeline.fos === at) {
      setFosPickMode(false)
      return
    }
    const contact = openRally.timeline.shots[at]?.contactTime ?? null
    patchTimeline((s) => markFos(s, at, contact))
    setFosPickMode(false)
    if (typeof contact === 'number') {
      setCurrentTime(contact)
      videoPlayerRef.current?.seek(contact)
    }
  }

  const handleChangeFos = () => {
    setFosPickMode(true)
  }

  const handleNoAttack = () => {
    setFosPickMode(false)
  }

  const handleCancelFosPick = () => {
    setFosPickMode(false)
  }

  const handleUndoLastContact = () => {
    if (phase !== 'tapping' || contactTimes.length === 0) return
    clearIdleTimer()
    const removed = contactTimes[contactTimes.length - 1]
    const next = contactTimes.slice(0, -1)
    setContactTimes(next)
    setCurrentTime(removed)
    videoPlayerRef.current?.seek(removed)
    if (next.length === 0) {
      setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    } else {
      scheduleIdleFinalize()
    }
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  const handleSeekToServe = (serveTimestamp: number) => {
    const t = Math.max(0, serveTimestamp - LOOP_PAD_SECONDS)
    setCurrentTime(t)
    videoPlayerRef.current?.seek(t)
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
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
          <h2 className="text-2xl font-bold text-neutral-50 mb-2">Rally Focus test complete</h2>
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
      ? contactCount
      : phase === 'form'
        ? shotNumberAtTime(formContactTimes, liveTime)
        : null
  const showContactOverlay = phase === 'tapping' || phase === 'form'
  const overlayColor =
    typeof overlayShot === 'number' && overlayShot > 0
      ? contactOverlayColor(overlayShot)
      : '#e5e7eb'
  const speedLabel =
    Number.isInteger(playbackSpeed) ? `${playbackSpeed}×` : `${playbackSpeed}×`
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
          {showContactOverlay && typeof overlayShot === 'number' && (
            <div
              className={cn(
                'absolute z-20 flex flex-col items-center rounded-xl bg-neutral-950/90 shadow-lg border border-white/10',
                phase === 'form'
                  ? 'top-14 right-2 px-2.5 py-1.5'
                  : 'top-1/2 right-3 -translate-y-1/2 px-3 py-2.5'
              )}
              aria-live="polite"
              aria-label={
                phase === 'form'
                  ? `Shot ${overlayShot}`
                  : `${overlayShot} contacts`
              }
            >
              <span
                className={cn(
                  'font-black leading-none text-center tabular-nums select-none',
                  phase === 'form' ? 'text-[40px]' : 'text-[56px] sm:text-[64px]'
                )}
                style={{ color: overlayColor }}
              >
                {overlayShot}
              </span>
            </div>
          )}
          {videoUrl && (
            <>
              <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Slower"
                  onClick={() => nudgePlaybackSpeed(-1)}
                  disabled={playbackSpeed <= PLAYBACK_SPEED_STEPS[0]}
                  className="h-10 w-10 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/25 disabled:opacity-40"
                >
                  <Icon name="minus" className="w-5 h-5" />
                </button>
                <span className="min-w-[2.75rem] text-center text-[12px] font-bold text-white tabular-nums bg-black/70 rounded-md px-1.5 py-1 border border-white/20">
                  {speedLabel}
                </span>
                <button
                  type="button"
                  aria-label="Faster"
                  onClick={() => nudgePlaybackSpeed(1)}
                  disabled={playbackSpeed >= PLAYBACK_SPEED_STEPS[PLAYBACK_SPEED_STEPS.length - 1]}
                  className="h-10 w-10 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/25 disabled:opacity-40"
                >
                  <Icon name="plus" className="w-5 h-5" />
                </button>
              </div>
              <button
                type="button"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={() => videoPlayerRef.current?.togglePlay()}
                className="absolute bottom-3 right-3 z-30 h-12 w-12 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/25"
              >
                <Icon name={isPlaying ? 'pause' : 'play'} className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>

      {phase === 'tapping' && typeof duration === 'number' && duration > 0 && (
        <ServeTimeline
          duration={duration}
          liveTime={liveTime}
          completed={completed}
          contactTimes={contactTimes}
          onSeekServe={handleSeekToServe}
        />
      )}

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
              player1Name={player1Name}
              player2Name={player2Name}
              score={currentScore}
            />
            <div className="flex-1 min-h-0 flex flex-col gap-2 p-2">
              <Button
                variant="primary"
                onClick={handleTapContact}
                disabled={!setReady}
                className="flex-1 w-full min-h-0 !h-auto self-stretch text-2xl font-bold rounded-xl"
              >
                Tap contact
              </Button>
              <div className="shrink-0 grid grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  onClick={handleLet}
                  disabled={contactCount === 0}
                  className="w-full h-11 text-sm font-semibold"
                >
                  Let / discard
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleUndoLastContact}
                  disabled={contactCount === 0}
                  className="w-full h-11 text-sm font-semibold"
                >
                  Undo last
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleRedoRally}
                  className="w-full h-11 text-sm font-semibold"
                >
                  Redo
                </Button>
              </div>
              <p className="shrink-0 text-[11px] text-neutral-500 text-center pb-1">
                {contactCount === 0
                  ? 'Tap each bat contact · first tap is the serve · Undo last drops one tap'
                  : `${contactCount} contact${contactCount === 1 ? '' : 's'} · auto-finishes after 2s idle`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Tagging chrome */}
            <div className="shrink-0 border-t border-neutral-700 bg-neutral-900">
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
                <span className="min-w-0 truncate text-neutral-400">
                  <span className="text-neutral-300">{player1Name}</span>
                  <span className="mx-1 font-mono">
                    {currentScore.player1}–{currentScore.player2}
                  </span>
                  <span className="text-neutral-300">{player2Name}</span>
                </span>
                <div className="flex-1" />
                <button type="button" onClick={handleDiscardOpen} className={cn(tagBtn, 'shrink-0')}>
                  Discard
                </button>
                <button type="button" onClick={handleRedoRally} className={cn(tagBtn, 'shrink-0')}>
                  Redo
                </button>
                <button
                  type="button"
                  aria-pressed={Boolean(openRally?.isHighlight)}
                  onClick={handleToggleHighlight}
                  className={cn(
                    tagBtn,
                    'shrink-0',
                    openRally?.isHighlight
                      ? 'bg-amber-500/90 text-neutral-950 border-amber-400'
                      : 'text-amber-200/90 border-amber-700/60'
                  )}
                >
                  ★ Highlight
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
                      <span className="text-neutral-500">R{r.rallyIndex}</span>
                      {r.isHighlight && (
                        <span className="ml-1 text-amber-400" title="Highlight">
                          ★
                        </span>
                      )}{' '}
                      {r.summary}
                    </div>
                  ))}
                </div>
              )}

            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <RallyFocusBlock
                state={timeline}
                players={players}
                server={serverName}
                activeShot={overlayShot}
                fosPickMode={fosPickMode}
                onToggleShotChoice={handleToggleShotChoice}
                onToggleAttackable={handleToggleAttackable}
                onMarkFos={handleMarkFos}
                onChangeFos={handleChangeFos}
                onNoAttack={handleNoAttack}
                onCancelFosPick={handleCancelFosPick}
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
  player1Name,
  player2Name,
  score,
}: {
  completed: CompletedRally[]
  priorsOpen: boolean
  onTogglePriors: () => void
  onEnd: () => void
  canEnd: boolean
  tagBtn: string
  player1Name: string
  player2Name: string
  score: { player1: number; player2: number }
}) {
  return (
    <div className="shrink-0 border-t border-neutral-700 bg-neutral-900">
      <div className="h-9 px-2 flex items-center gap-1.5 text-[11px]">
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
        <span className="min-w-0 truncate text-neutral-400">
          <span className="text-neutral-300">{player1Name}</span>
          <span className="mx-1 font-mono">
            {score.player1}–{score.player2}
          </span>
          <span className="text-neutral-300">{player2Name}</span>
        </span>
        <div className="flex-1" />
        <button type="button" onClick={onEnd} disabled={!canEnd} className={tagBtn}>
          End
        </button>
      </div>
      {priorsOpen && completed.length > 0 && (
        <div className="px-2 pb-1.5 max-h-16 overflow-y-auto space-y-0.5 border-t border-neutral-800">
          {completed.map((r) => (
            <div key={r.rallyIndex} className="text-[10px] text-neutral-400 leading-snug">
              <span className="text-neutral-500">R{r.rallyIndex}</span>
              {r.isHighlight && (
                <span className="ml-1 text-amber-400" title="Highlight">
                  ★
                </span>
              )}{' '}
              {r.summary}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ServeTimeline({
  duration,
  liveTime,
  completed,
  contactTimes,
  onSeekServe,
}: {
  duration: number
  liveTime: number
  completed: CompletedRally[]
  contactTimes: number[]
  onSeekServe: (serveTimestamp: number) => void
}) {
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / duration) * 100))}%`

  return (
    <div
      className="shrink-0 h-7 px-2 bg-neutral-950 border-t border-neutral-800 flex items-center"
      aria-label="Serve timeline"
    >
      <div className="relative w-full h-2 rounded-full bg-neutral-800">
        {completed.map((r) => (
          <button
            key={r.rallyIndex}
            type="button"
            title={`Rally ${r.rallyIndex} serve`}
            aria-label={`Jump to rally ${r.rallyIndex} serve`}
            onClick={() => onSeekServe(r.serveTimestamp)}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-sm border border-neutral-950"
            style={{
              left: pct(r.serveTimestamp),
              backgroundColor: r.isHighlight ? '#f59e0b' : '#c4a574',
            }}
          />
        ))}
        {contactTimes.map((t, i) => (
          <span
            key={`c-${i}-${t}`}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#7eb8e8] pointer-events-none"
            style={{ left: pct(t) }}
            aria-hidden
          />
        ))}
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-full bg-white pointer-events-none"
          style={{ left: pct(liveTime) }}
          aria-hidden
        />
      </div>
    </div>
  )
}
