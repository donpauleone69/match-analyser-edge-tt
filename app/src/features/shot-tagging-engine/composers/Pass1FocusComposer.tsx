/**
 * Pass1FocusComposer — sequential rally tagging (Pass 1 Focus)
 *
 * Setup → tap contacts → 2s idle finalize → timeline while video loops.
 * Each Save writes the rally + shots to IndexedDB.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import { Pass1FocusBlock } from '../blocks'
import { VideoPlayerSection } from '../sections'
import { type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { Button, Icon } from '@/ui-mine'
import { calculateServer } from '@/rules'
import { setDb } from '@/data'
import { resolveSetVideo } from '@/data/services/videoAssetService'
import {
  emptyRallyTimelineState,
  canSaveRallyTimeline,
  inferWinnerName,
  toggleShotChoice,
  toggleShotAttribute,
  setFos,
  markEnd,
  toggleEnding,
  toggleMissReason,
  toggleShotReviewKind,
  toggleShotReviewFlag,
  timelineFromContacts,
  contactTimesFromTimeline,
  shotNumberAtTime,
  contactOverlayColor,
  loopWindowFromContacts,
  seekFloorFromCompleted,
  rallyTimelineViewWindow,
  clampSeekTime,
  CONTACT_IDLE_MS,
  LOOP_PAD_SECONDS,
  PLAYBACK_SPEED_STEPS,
  CAPTURE_PLAYBACK_SPEED,
  NORMAL_PLAYBACK_SPEED,
  SEEK_STEP_SECONDS,
  type RallyTimelineState,
  type PointEnding,
  type PointMissReason,
  type ShotChoiceKey,
  type ShotAttributeKey,
  type ShotReviewKind,
} from './pass1FocusModel'
import {
  persistPass1FocusRally,
  finalizePass1FocusSet,
  loadResumedPass1FocusState,
  deleteLastPersistedPass1FocusRally,
} from './persistPass1FocusRally'

/** How far Redo rewinds when there are no contacts yet */
const REDO_REWIND_SECONDS = 2

export interface Pass1FocusComposerProps {
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
  dbRallyId: string | null
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
  player1ScoreAfter: number
  player2ScoreAfter: number
}

export function Pass1FocusComposer({
  matchId,
  setNumber,
  player1Id,
  player2Id,
  player1Name,
  player2Name,
  className,
}: Pass1FocusComposerProps) {
  const navigate = useNavigate()
  const videoUrl = useVideoPlaybackStore((state) => state.videoUrl)
  const setVideoUrl = useVideoPlaybackStore((state) => state.setVideoUrl)
  const setCurrentTime = useVideoPlaybackStore((state) => state.setCurrentTime)
  const isPlaying = useVideoPlaybackStore((state) => state.isPlaying)
  const playbackSpeed = useVideoPlaybackStore((state) => state.playbackSpeed)
  const setPlaybackSpeed = useVideoPlaybackStore((state) => state.setPlaybackSpeed)
  const duration = useVideoPlaybackStore((state) => state.duration)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)

  const [setId, setSetId] = useState<string | null>(null)
  const [setReady, setSetReady] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupNextServer, setSetupNextServer] = useState<'player1' | 'player2'>('player1')
  const [currentScore, setCurrentScore] = useState({ player1: 0, player2: 0 })
  const [saving, setSaving] = useState(false)

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
  const [selectedShot, setSelectedShot] = useState<number | null>(null)
  /** null = not answered yet on the complete screen */
  const [scoreConfirmed, setScoreConfirmed] = useState<boolean | null>(null)

  const contactTimesRef = useRef(contactTimes)
  contactTimesRef.current = contactTimes
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Prefer the <video> element's clock over the ~4 Hz store sample. */
  const readVideoTime = () =>
    videoPlayerRef.current?.getCurrentTime() ??
    useVideoPlaybackStore.getState().currentTime

  const minSeek = useMemo(() => seekFloorFromCompleted(completed), [completed])

  /** While tapping, constrain seek to [last rally end, duration]. */
  const applyTappingConstraints = (rallies: CompletedRally[] = completed) => {
    const floor = seekFloorFromCompleted(rallies)
    const dur = useVideoPlaybackStore.getState().duration
    const endTime =
      typeof dur === 'number' && dur > 0 ? dur : Math.max(floor + 0.1, 1)
    setConstrainedPlayback({
      enabled: true,
      startTime: floor,
      endTime,
      loopOnEnd: false,
    })
  }

  const seekClamped = (t: number, rallies: CompletedRally[] = completed) => {
    // Form loop: let VideoPlayer clamp to the contact window (includes serve pad).
    if (phase === 'form') {
      setCurrentTime(t)
      videoPlayerRef.current?.seek(t)
      return t
    }
    const floor = seekFloorFromCompleted(rallies)
    const dur = useVideoPlaybackStore.getState().duration
    const next = clampSeekTime(t, floor, dur)
    setCurrentTime(next)
    // ignoreConstraints: floor already applied; constrainedPlayback state may lag
    videoPlayerRef.current?.seek(next, true)
    return next
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
          navigate(`/matches/${matchId}`)
          return
        }
        setSetId(target.id)
        setSetReady(true)

        const resumed = await loadResumedPass1FocusState({
          setId: target.id,
          player1Id,
          player2Id,
          player1Name,
          player2Name,
        })

        if (resumed.completed.length > 0) {
          setCompleted(resumed.completed)
          setCurrentScore(resumed.currentScore)
          setSetupNextServer(resumed.setupNextServer)
          setSetupComplete(true)
          setPhase('tapping')
        } else {
          // Thin start: always begin at 0–0 with the focal player serving.
          // No pre-tagging setup screen.
          const firstServer: 'player1' | 'player2' =
            target.setup_next_server_id === player2Id ? 'player2' : 'player1'
          setSetupNextServer(firstServer)
          setCurrentScore({ player1: 0, player2: 0 })
          setSetupComplete(true)
          setPhase('tapping')

          if (!target.setup_completed_at) {
            await setDb.update(target.id, {
              setup_starting_score_p1: 0,
              setup_starting_score_p2: 0,
              setup_next_server_id:
                firstServer === 'player1' ? player1Id : player2Id,
              setup_completed_at: new Date().toISOString(),
              tagging_phase: 'phase1_in_progress',
              tagging_started_at: new Date().toISOString(),
            })
            await setDb.markTaggingStarted(target.id)
          }
        }

        if (typeof target.score_confirmed === 'boolean') {
          setScoreConfirmed(target.score_confirmed)
        }

        const video = await resolveSetVideo(matchId, setNumber)
        if (video) {
          setVideoUrl(video.url)
        }
      } catch (error) {
        console.error('[Pass1Focus] Failed to init:', error)
        alert('Failed to load set for Pass 1 Focus')
      }
    }
    init()
  }, [matchId, setNumber, navigate, setVideoUrl, player1Id, player2Id, player1Name, player2Name])

  useEffect(() => () => clearIdleTimer(), [])

  // Keep tapping seek floor in sync with completed rallies + duration
  useEffect(() => {
    if (phase !== 'tapping') return
    applyTappingConstraints(completed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, completed, duration])

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

  /** One tap: this side serves here; re-anchor first-server so later pills follow. */
  const handleToggleServer = async () => {
    if (!setupComplete || phase === 'complete') return
    const desired: WinnerId = openServerId === 'player1' ? 'player2' : 'player1'
    let nextFirst: 'player1' | 'player2' = setupNextServer
    for (const candidate of ['player1', 'player2'] as const) {
      const result = calculateServer({
        firstServerId: candidate,
        player1Score: currentScore.player1,
        player2Score: currentScore.player2,
      })
      if (result.serverId === desired) {
        nextFirst = candidate
        break
      }
    }
    setSetupNextServer(nextFirst)
    if (setId) {
      await setDb.update(setId, {
        setup_next_server_id: nextFirst === 'player1' ? player1Id : player2Id,
        set_first_server_id: nextFirst === 'player1' ? player1Id : player2Id,
      })
    }
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

  /** Discard taps / open form rally as a let (no score). Resume from serve. */
  const handleLet = () => {
    clearIdleTimer()
    const first =
      openRally?.serveTimestamp ??
      (contactTimes.length > 0 ? contactTimes[0] : null)
    setContactTimes([])
    setOpenRally(null)
    setFosPickMode(false)
    setPhase('tapping')
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    applyTappingConstraints()
    if (typeof first === 'number') {
      seekClamped(first)
    }
    videoPlayerRef.current?.play()
  }

  /** Restart contact tapping for this rally (from form or mid-tap), or rewind if empty. */
  const handleRedoRally = () => {
    const seekSource =
      openRally?.serveTimestamp ??
      (contactTimes.length > 0 ? contactTimes[0] : null)

    clearIdleTimer()
    setOpenRally(null)
    setContactTimes([])
    setPhase('tapping')
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    applyTappingConstraints()

    if (typeof seekSource === 'number') {
      seekClamped(seekSource - LOOP_PAD_SECONDS)
    } else {
      seekClamped(readVideoTime() - REDO_REWIND_SECONDS)
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

  const handleSeekBy = (deltaSeconds: number) => {
    seekClamped(readVideoTime() + deltaSeconds)
  }

  const handleJumpToLastRallyEnd = () => {
    if (completed.length === 0) return
    seekClamped(minSeek)
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  const handleDiscardOpen = () => {
    if (!openRally) return
    const endAt = openRally.endTimestamp
    setOpenRally(null)
    setContactTimes([])
    setPhase('tapping')
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    applyTappingConstraints()
    seekClamped(endAt)
    videoPlayerRef.current?.play()
  }

  const handleToggleHighlight = () => {
    setOpenRally((cur) => (cur ? { ...cur, isHighlight: !cur.isHighlight } : cur))
  }

  const handleSave = async () => {
    if (!openRally || !canSave || !winnerName || !setId || saving) return
    const winnerId = winnerIdFromName(winnerName)
    if (!winnerId) return

    setSaving(true)
    try {
      const serverId = openServerId === 'player1' ? player1Id : player2Id
      const rallyIndex = completed.length + 1
      const persisted = await persistPass1FocusRally({
        setId,
        rallyIndex,
        videoId: null,
        serverId,
        player1Id,
        player2Id,
        player1Name,
        player2Name,
        player1ScoreBefore: currentScore.player1,
        player2ScoreBefore: currentScore.player2,
        isHighlight: openRally.isHighlight,
        timeline: openRally.timeline,
      })

      const savedEntry: CompletedRally = {
        dbRallyId: persisted.rally.id,
        rallyIndex,
        serveTimestamp: openRally.serveTimestamp,
        endTimestamp: openRally.endTimestamp,
        serverId: openServerId,
        winnerId,
        serverName: persisted.serverName,
        winnerName: persisted.winnerName,
        timeline: openRally.timeline,
        summary: persisted.summary,
        isHighlight: openRally.isHighlight,
        player1ScoreAfter: persisted.rally.player1_score_after,
        player2ScoreAfter: persisted.rally.player2_score_after,
      }
      const nextCompleted = [...completed, savedEntry]
      setCompleted(nextCompleted)
      setCurrentScore({
        player1: persisted.rally.player1_score_after,
        player2: persisted.rally.player2_score_after,
      })

      setOpenRally(null)
      setContactTimes([])
      setPhase('tapping')
      applyTappingConstraints(nextCompleted)
      setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
      seekClamped(openRally.endTimestamp, nextCompleted)
      videoPlayerRef.current?.play()
    } catch (error) {
      console.error('[Pass1Focus] Save failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to save rally')
    } finally {
      setSaving(false)
    }
  }

  const handleEndSession = async () => {
    if (completed.length === 0 && !openRally) return
    if (!setId) return
    clearIdleTimer()
    setOpenRally(null)
    setContactTimes([])
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    setScoreConfirmed(null)

    try {
      await finalizePass1FocusSet({
        setId,
        player1Id,
        player2Id,
        player1Score: currentScore.player1,
        player2Score: currentScore.player2,
        scoreConfirmed: null,
      })
    } catch (error) {
      console.error('[Pass1Focus] Finalize failed:', error)
      alert('Failed to finalize set')
      return
    }

    setPhase('complete')
  }

  const handleScoreConfirm = async (matches: boolean) => {
    if (!setId) return
    setScoreConfirmed(matches)
    try {
      await setDb.update(setId, { score_confirmed: matches })
    } catch (error) {
      console.error('[Pass1Focus] Score confirm failed:', error)
      alert('Failed to save score confirmation')
    }
  }

  const handleToggleShotChoice = (n: number, key: ShotChoiceKey, value: string) => {
    patchTimeline((s) => toggleShotChoice(s, n, key, value))
  }

  const handleToggleAttribute = (n: number, key: ShotAttributeKey) => {
    patchTimeline((s) => toggleShotAttribute(s, n, key))
  }

  const handleMarkFos = (at: number) => {
    if (!openRally || phase !== 'form') return
    if (at < 2) return
    const contact = openRally.timeline.shots[at]?.contactTime ?? null
    // Radio select from the FOS picker / shot number / video click.
    patchTimeline((s) => setFos(s, at, contact))
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
    patchTimeline((s) => setFos(s, null))
    setFosPickMode(false)
  }

  const handleCancelFosPick = () => {
    setFosPickMode(false)
  }

  const handleToggleReviewKind = (n: number, value: ShotReviewKind) => {
    patchTimeline((s) => toggleShotReviewKind(s, n, value))
  }

  const handleToggleReviewFlag = (n: number) => {
    patchTimeline((s) => toggleShotReviewFlag(s, n))
  }

  const handleUndoLastContact = () => {
    if (phase !== 'tapping' || contactTimes.length === 0) return
    clearIdleTimer()
    const removed = contactTimes[contactTimes.length - 1]
    const next = contactTimes.slice(0, -1)
    setContactTimes(next)
    seekClamped(removed)
    if (next.length === 0) {
      setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    } else {
      scheduleIdleFinalize()
    }
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  /** Timeline click on a completed rally → its end (seek floor for that rally). */
  const handleSeekToRallyEnd = (endTimestamp: number) => {
    seekClamped(endTimestamp)
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  const handleTimelineScrub = (t: number) => {
    seekClamped(t)
  }

  const handleDeleteLastRally = async () => {
    if (phase !== 'tapping' || completed.length === 0) return
    if (contactTimes.length > 0) {
      const ok = window.confirm(
        'Discard current taps and delete the last completed rally?'
      )
      if (!ok) return
      clearIdleTimer()
      setContactTimes([])
      setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    }

    const last = completed[completed.length - 1]
    const nextCompleted = completed.slice(0, -1)
    const prev = nextCompleted[nextCompleted.length - 1]
    const rolledScore = prev
      ? {
          player1: prev.player1ScoreAfter,
          player2: prev.player2ScoreAfter,
        }
      : { player1: 0, player2: 0 }

    try {
      if (setId && last.dbRallyId) {
        await deleteLastPersistedPass1FocusRally({
          setId,
          rallyId: last.dbRallyId,
        })
      }
      setCompleted(nextCompleted)
      setCurrentScore(rolledScore)
      applyTappingConstraints(nextCompleted)
      seekClamped(
        nextCompleted.length > 0
          ? nextCompleted[nextCompleted.length - 1].endTimestamp
          : 0,
        nextCompleted
      )
      if (!isPlaying) {
        videoPlayerRef.current?.play()
      }
    } catch (error) {
      console.error('[Pass1Focus] Delete last failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete last rally')
    }
  }

  const handleMarkEnd = (at: number) => {
    patchTimeline((s) => markEnd(s, at))
  }

  const handleToggleEnding = (value: PointEnding) => {
    patchTimeline((s) => toggleEnding(s, value))
  }

  const handleToggleMissReason = (value: PointMissReason) => {
    patchTimeline((s) => toggleMissReason(s, value))
  }

  if (phase === 'complete') {
    const withFos = completed.filter((r) => r.timeline.fos !== null).length
    const avgShots =
      completed.length > 0
        ? (
            completed.reduce((sum, r) => sum + r.timeline.shotCount, 0) / completed.length
          ).toFixed(1)
        : '0'
    const scoreLabel = `${currentScore.player1}–${currentScore.player2}`

    return (
      <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
        <div className="p-8 max-w-lg text-center bg-bg-card rounded-lg border border-neutral-700">
          <h2 className="text-2xl font-bold text-neutral-50 mb-2">Pass 1 complete</h2>
          <p className="text-neutral-400 mb-1">{completed.length} rallies saved</p>
          <p className="text-neutral-500 text-sm mb-4">
            Avg contacts {avgShots} · With FOS {withFos}
          </p>
          <p className="text-neutral-200 text-lg font-semibold mb-2">
            Counted score {scoreLabel}
          </p>
          <p className="text-neutral-400 text-sm mb-3">
            Does that match the scoreboard?
          </p>
          <div className="flex gap-3 justify-center mb-6">
            <Button
              variant={scoreConfirmed === true ? 'primary' : 'secondary'}
              onClick={() => handleScoreConfirm(true)}
            >
              Yes
            </Button>
            <Button
              variant={scoreConfirmed === false ? 'primary' : 'secondary'}
              onClick={() => handleScoreConfirm(false)}
            >
              No
            </Button>
          </div>
          {scoreConfirmed === false && (
            <p className="text-amber-400/90 text-xs mb-4">
              Flagged. Stored point scores are unchanged.
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate(`/matches/${matchId}?tab=clips`)}>
              Watch clips
            </Button>
            <Button variant="primary" onClick={() => navigate(`/matches/${matchId}`)}>
              Review match
            </Button>
          </div>
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
        <div
          className="relative w-full aspect-video"
          onClick={(e) => {
            if (phase !== 'form') return
            if ((e.target as HTMLElement).closest('button')) return
            if (typeof overlayShot === 'number' && overlayShot >= 2) {
              handleMarkFos(overlayShot)
            }
          }}
        >
          <VideoPlayerSection
            ref={videoPlayerRef}
            videoUrl={videoUrl}
            onVideoSelect={setVideoUrl}
            constrainedPlayback={constrainedPlayback}
          />
          {showContactOverlay && typeof overlayShot === 'number' && (
            <div
              role={phase === 'form' && overlayShot >= 2 ? 'button' : undefined}
              tabIndex={phase === 'form' && overlayShot >= 2 ? 0 : undefined}
              onClick={() => {
                if (phase === 'form' && overlayShot >= 2) handleMarkFos(overlayShot)
              }}
              onKeyDown={(e) => {
                if (
                  phase === 'form' &&
                  overlayShot >= 2 &&
                  (e.key === 'Enter' || e.key === ' ')
                ) {
                  e.preventDefault()
                  handleMarkFos(overlayShot)
                }
              }}
              className={cn(
                'absolute z-20 flex flex-col items-center rounded-xl bg-neutral-950/90 shadow-lg border border-white/10',
                phase === 'form'
                  ? 'top-14 right-2 px-2.5 py-1.5'
                  : 'top-1/2 right-3 -translate-y-1/2 px-3 py-2.5',
                phase === 'form' &&
                  overlayShot >= 2 &&
                  'cursor-pointer hover:border-[#329985]/60'
              )}
              aria-live="polite"
              aria-label={
                phase === 'form'
                  ? overlayShot >= 2
                    ? `Mark shot ${overlayShot} as first attack`
                    : `Shot ${overlayShot}`
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
                  aria-label={`Rewind ${SEEK_STEP_SECONDS} seconds`}
                  onClick={() => handleSeekBy(-SEEK_STEP_SECONDS)}
                  className="h-10 w-10 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/25"
                >
                  <Icon name="skip-back" className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label={`Forward ${SEEK_STEP_SECONDS} seconds`}
                  onClick={() => handleSeekBy(SEEK_STEP_SECONDS)}
                  className="h-10 w-10 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/25"
                >
                  <Icon name="skip-forward" className="w-5 h-5" />
                </button>
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
        <RallyProgressTimeline
          duration={duration}
          liveTime={liveTime}
          completed={completed}
          contactTimes={contactTimes}
          minSeek={minSeek}
          onSeekRallyEnd={handleSeekToRallyEnd}
          onScrub={handleTimelineScrub}
        />
      )}

      <div className="flex-1 min-h-0 flex flex-col bg-bg-surface">
        {phase === 'tapping' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <TaggingSessionBar
              completed={completed}
              priorsOpen={priorsOpen}
              onTogglePriors={() => setPriorsOpen((o) => !o)}
              onEnd={handleEndSession}
              canEnd={completed.length > 0}
              onJumpLast={handleJumpToLastRallyEnd}
              onDeleteLast={handleDeleteLastRally}
              tagBtn={tagBtn}
              player1Name={player1Name}
              player2Name={player2Name}
              score={currentScore}
              serverId={openServerId}
              onToggleServer={handleToggleServer}
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
                  Let
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
                <ServerPill
                  serverId={openServerId}
                  player1Name={player1Name}
                  player2Name={player2Name}
                  onToggle={handleToggleServer}
                />
                <div className="flex-1" />
                <button type="button" onClick={handleLet} className={cn(tagBtn, 'shrink-0')}>
                  Let
                </button>
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
                  disabled={!canSave || saving}
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
              <Pass1FocusBlock
                state={timeline}
                players={players}
                server={serverName}
                activeShot={overlayShot}
                selectedShot={selectedShot}
                onSelectShot={setSelectedShot}
                fosPickMode={fosPickMode}
                onToggleShotChoice={handleToggleShotChoice}
                onToggleAttribute={handleToggleAttribute}
                onMarkFos={handleMarkFos}
                onChangeFos={handleChangeFos}
                onNoAttack={handleNoAttack}
                onCancelFosPick={handleCancelFosPick}
                onMarkEnd={handleMarkEnd}
                onToggleEnding={handleToggleEnding}
                onToggleMissReason={handleToggleMissReason}
                onToggleReviewKind={handleToggleReviewKind}
                onToggleReviewFlag={handleToggleReviewFlag}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ServerPill({
  serverId,
  player1Name,
  player2Name,
  onToggle,
}: {
  serverId: WinnerId
  player1Name: string
  player2Name: string
  onToggle: () => void
}) {
  return (
    <div className="shrink-0 flex items-center gap-1" role="group" aria-label="Server">
      <button
        type="button"
        aria-pressed={serverId === 'player1'}
        onClick={() => {
          if (serverId !== 'player1') onToggle()
        }}
        className={cn(
          'h-7 px-2 rounded-md text-[11px] font-semibold border truncate max-w-[5.5rem]',
          serverId === 'player1'
            ? 'bg-teal-700/50 border-teal-500 text-teal-100'
            : 'border-neutral-600 text-neutral-400 hover:border-neutral-400'
        )}
      >
        {player1Name}
      </button>
      <button
        type="button"
        aria-pressed={serverId === 'player2'}
        onClick={() => {
          if (serverId !== 'player2') onToggle()
        }}
        className={cn(
          'h-7 px-2 rounded-md text-[11px] font-semibold border truncate max-w-[5.5rem]',
          serverId === 'player2'
            ? 'bg-teal-700/50 border-teal-500 text-teal-100'
            : 'border-neutral-600 text-neutral-400 hover:border-neutral-400'
        )}
      >
        {player2Name}
      </button>
    </div>
  )
}

function TaggingSessionBar({
  completed,
  priorsOpen,
  onTogglePriors,
  onEnd,
  canEnd,
  onJumpLast,
  onDeleteLast,
  tagBtn,
  player1Name,
  player2Name,
  score,
  serverId,
  onToggleServer,
}: {
  completed: CompletedRally[]
  priorsOpen: boolean
  onTogglePriors: () => void
  onEnd: () => void
  canEnd: boolean
  onJumpLast: () => void
  onDeleteLast: () => void
  tagBtn: string
  player1Name: string
  player2Name: string
  score: { player1: number; player2: number }
  serverId: WinnerId
  onToggleServer: () => void
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
        <ServerPill
          serverId={serverId}
          player1Name={player1Name}
          player2Name={player2Name}
          onToggle={onToggleServer}
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={onJumpLast}
          disabled={completed.length === 0}
          className={tagBtn}
          title="Jump to end of last completed rally"
        >
          Last rally
        </button>
        <button
          type="button"
          onClick={onDeleteLast}
          disabled={completed.length === 0}
          className={cn(tagBtn, 'text-red-300 border-red-800/60')}
          title="Delete last completed rally"
        >
          Delete last
        </button>
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

function RallyProgressTimeline({
  duration,
  liveTime,
  completed,
  contactTimes,
  minSeek,
  onSeekRallyEnd,
  onScrub,
}: {
  duration: number
  liveTime: number
  completed: CompletedRally[]
  contactTimes: number[]
  minSeek: number
  onSeekRallyEnd: (endTimestamp: number) => void
  onScrub: (t: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  // Zoom to tagged activity so short rallies paint as ranges, not ticks.
  const { viewStart, viewEnd } = rallyTimelineViewWindow({
    duration,
    liveTime,
    completed,
    contactTimes,
  })
  const span = Math.max(0.001, viewEnd - viewStart)
  const pct = (t: number) =>
    `${Math.min(100, Math.max(0, ((t - viewStart) / span) * 100))}%`
  const rangeStyle = (start: number, end: number) => {
    const left = Math.min(100, Math.max(0, ((start - viewStart) / span) * 100))
    const rawW = ((Math.max(end, start) - start) / span) * 100
    const width = Math.min(100 - left, Math.max(0, rawW))
    return {
      left: `${left}%`,
      // Pixel floor keeps 1–2s rallies readable on dense clusters.
      width: `max(12px, ${width}%)`,
    }
  }

  const timeFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el || span <= 0) return minSeek
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return clampSeekTime(viewStart + ratio * span, minSeek, duration)
  }

  return (
    <div
      className="shrink-0 h-9 px-2 bg-neutral-950 border-t border-neutral-800 flex items-center"
      aria-label="Rally timeline"
    >
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={viewStart}
        aria-valuemax={viewEnd}
        aria-valuenow={liveTime}
        tabIndex={0}
        className="relative w-full h-4 rounded-sm bg-black cursor-pointer touch-none overflow-hidden"
        onClick={(e) => onScrub(timeFromClientX(e.clientX))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            onScrub(liveTime - 1)
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            onScrub(liveTime + 1)
          }
        }}
      >
        {completed.map((r) => {
          const rawStart = Math.min(r.serveTimestamp, r.endTimestamp)
          const rawEnd = Math.max(r.serveTimestamp, r.endTimestamp)
          // Slight pad so contact-to-contact spans read as a filled rally block.
          const start = Math.max(viewStart, rawStart - LOOP_PAD_SECONDS)
          const end = Math.min(viewEnd, rawEnd + LOOP_PAD_SECONDS)
          const fill = r.isHighlight ? '#f59e0b' : '#c4a574'
          return (
            <button
              key={r.rallyIndex}
              type="button"
              title={`Rally ${r.rallyIndex} · jump to end`}
              aria-label={`Jump to end of rally ${r.rallyIndex}`}
              onClick={(e) => {
                e.stopPropagation()
                onSeekRallyEnd(r.endTimestamp)
              }}
              className="absolute top-0 bottom-0 rounded-[1px] border border-black/25 hover:brightness-110"
              style={{
                ...rangeStyle(start, end),
                backgroundColor: fill,
              }}
            />
          )
        })}
        {contactTimes.map((t, i) => (
          <span
            key={`c-${i}-${t}`}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#7eb8e8] pointer-events-none z-10"
            style={{ left: pct(t) }}
            aria-hidden
          />
        ))}
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-white pointer-events-none z-20"
          style={{ left: pct(liveTime) }}
          aria-hidden
        />
      </div>
    </div>
  )
}
