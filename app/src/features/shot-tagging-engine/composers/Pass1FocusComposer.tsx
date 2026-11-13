/**
 * Pass1FocusComposer — sequential rally tagging (Pass 1 Focus)
 *
 * Setup → tap contacts → 2s idle finalize → timeline while video loops.
 * Each Save writes the rally + shots to IndexedDB.
 */

import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import {
  Pass1FocusBlock,
  Pass1ShotMarkRail,
  Pass1SetHudBlock,
  Pass1SetContextBlock,
  Pass1PointLedgerBlock,
  snapPass1ShotIntoView,
} from '../blocks'
import { VideoPlayerSection } from '../sections'
import {
  type VideoPlayerHandle,
  useVideoPlaybackStore,
  TransportCluster,
  VideoStageChrome,
  nudgePlaybackSpeed as nudgeSharedSpeed,
  SEEK_STEP_SECONDS as SHARED_SEEK_STEP,
} from '@/ui-mine/VideoPlayer'
import { Button, Icon } from '@/ui-mine'
import { calculateServer } from '@/rules'
import { deriveMatchSetsBeforeSet } from '@/rules/derive/set/deriveMatchSetsBeforeSet'
import { rallyDb, setDb } from '@/data'
import { resolveSetVideo } from '@/data/services/videoAssetService'
import {
  emptyRallyTimelineState,
  canSaveRallyTimeline,
  pass1SaveHint,
  inferWinnerName,
  toggleShotChoice,
  toggleShotAttribute,
  markFos,
  setFos,
  markEnd,
  toggleEnding,
  toggleMissReason,
  toggleShotReviewKind,
  toggleShotReviewFlag,
  timelineFromContacts,
  contactTimesFromTimeline,
  shotNumberAtTime,
  loopWindowFromContacts,
  shotLoopWindow,
  captureContactTime,
  seekFloorFromCompleted,
  clampSeekTime,
  CONTACT_IDLE_MS,
  LOOP_PAD_SECONDS,
  CAPTURE_PLAYBACK_SPEED,
  NORMAL_PLAYBACK_SPEED,
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
import {
  clearPass1FocusDraft,
  loadPass1FocusDraft,
  savePass1FocusDraft,
} from './pass1FocusDraftStorage'
import { encodeClipFilter } from '@/rules/derive/clips/deriveClips'

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
type PhaseStep = 'setup' | 'tapping' | 'form'

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
  const [matchSets, setMatchSets] = useState({ player1: 0, player2: 0 })
  const [saving, setSaving] = useState(false)

  const [phase, setPhase] = useState<PhaseStep>('setup')
  const [contactTimes, setContactTimes] = useState<number[]>([])
  const [openRally, setOpenRally] = useState<OpenRally | null>(null)
  const [completed, setCompleted] = useState<CompletedRally[]>([])
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
  /** Which point cube is outlined — past rally index, or 'next' (about to tag / open). */
  const [focusedRallyIndex, setFocusedRallyIndex] = useState<number | 'next'>('next')
  const [pointLedgerOpen, setPointLedgerOpen] = useState(false)
  const [formMoreOpen, setFormMoreOpen] = useState(false)
  /** Previous set’s last timed action — between-set gap jump on multi-set captures. */
  const [prevSetEndS, setPrevSetEndS] = useState<number | null>(null)

  const contactTimesRef = useRef(contactTimes)
  contactTimesRef.current = contactTimes
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Prefer the <video> element's clock over the ~4 Hz store sample. */
  const readVideoTime = () =>
    videoPlayerRef.current?.getCurrentTime() ??
    useVideoPlaybackStore.getState().currentTime

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
        setMatchSets(deriveMatchSetsBeforeSet(sets, setNumber, player1Id))

        if (setNumber > 1) {
          const prev = sets.find((s) => s.set_number === setNumber - 1)
          if (prev) {
            const prevRallies = (await rallyDb.getBySetId(prev.id)).sort(
              (a, b) => a.rally_index - b.rally_index
            )
            const lastTimed = [...prevRallies]
              .reverse()
              .find((r) => typeof r.timestamp_end === 'number' && Number.isFinite(r.timestamp_end))
            setPrevSetEndS(lastTimed?.timestamp_end ?? null)
          } else {
            setPrevSetEndS(null)
          }
        } else {
          setPrevSetEndS(null)
        }

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

        // Recover mid-point draft after reload (contacts or open form).
        const draft = loadPass1FocusDraft(target.id)
        if (draft && draft.matchId === matchId && draft.setNumber === setNumber) {
          if (draft.phase === 'form' && draft.openRally) {
            const { serveTimestamp, endTimestamp } = draft.openRally
            const dur = useVideoPlaybackStore.getState().duration
            const loop = loopWindowFromContacts(serveTimestamp, endTimestamp, dur)
            setOpenRally(draft.openRally)
            setContactTimes([])
            setSelectedShot(draft.selectedShot)
            setFosPickMode(false)
            setFocusedRallyIndex('next')
            setPhase('form')
            setConstrainedPlayback({
              enabled: true,
              startTime: loop.startTime,
              endTime: loop.endTime,
              loopOnEnd: true,
            })
          } else if (draft.phase === 'tapping' && draft.contactTimes.length > 0) {
            setOpenRally(null)
            setContactTimes(draft.contactTimes)
            setSelectedShot(null)
            setPhase('tapping')
            setPlaybackSpeed(CAPTURE_PLAYBACK_SPEED)
          }
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

  // Persist in-progress point so reload can resume tagging.
  useEffect(() => {
    if (!setId || !setReady) return
    if (phase !== 'tapping' && phase !== 'form') return
    savePass1FocusDraft({
      version: 1,
      setId,
      matchId,
      setNumber,
      phase,
      contactTimes,
      openRally,
      selectedShot,
      savedAt: new Date().toISOString(),
    })
  }, [
    setId,
    setReady,
    matchId,
    setNumber,
    phase,
    contactTimes,
    openRally,
    selectedShot,
  ])

  // Keep tapping seek floor in sync with completed rallies + duration
  useEffect(() => {
    if (phase !== 'tapping') return
    applyTappingConstraints(completed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, completed, duration])

  // When video duration arrives after draft restore, re-fit the form loop.
  const openServeTs = openRally?.serveTimestamp
  const openEndTs = openRally?.endTimestamp
  useEffect(() => {
    if (phase !== 'form') return
    if (typeof openServeTs !== 'number' || typeof openEndTs !== 'number') return
    if (!duration) return
    const loop = loopWindowFromContacts(openServeTs, openEndTs, duration)
    setConstrainedPlayback({
      enabled: true,
      startTime: loop.startTime,
      endTime: loop.endTime,
      loopOnEnd: true,
    })
  }, [phase, openServeTs, openEndTs, duration])

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
    if (phase !== 'form') return
    const n =
      selectedShot ??
      (typeof timeline.end === 'number' ? timeline.end : null) ??
      (typeof timeline.fos === 'number' ? timeline.fos : null)
    if (typeof n !== 'number') return
    snapPass1ShotIntoView(n)
  }, [phase, selectedShot, timeline.fos, timeline.end])

  const winnerName = inferWinnerName(
    timeline.end,
    timeline.ending,
    players,
    serverName
  )
  const saveHint = openRally ? pass1SaveHint(timeline) : null
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
    setSelectedShot(null)
    setFocusedRallyIndex('next')
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

  /** Set who serves this rally; re-anchor first-server so later pills follow. */
  const handleSetServer = async (desired: WinnerId) => {
    if (!setupComplete) return
    if (openServerId === desired) return
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
    // Bake click-latency into the stored contact so playback uses true times as-is.
    const floor =
      contactTimes.length > 0
        ? contactTimes[contactTimes.length - 1]
        : seekFloorFromCompleted(completed)
    const stored = captureContactTime(t, floor)
    setContactTimes((prev) => [...prev, stored])
    if (isServeTap) {
      setPlaybackSpeed(CAPTURE_PLAYBACK_SPEED)
    }
    scheduleIdleFinalize()
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  /**
   * Restart contact tapping for this rally (from form or mid-tap), or rewind if empty.
   * This is also the let path: no score is recorded, and the replayed point is
   * captured as the next taps — so there is no separate Let control.
   */
  const handleRedoRally = () => {
    const seekSource =
      openRally?.serveTimestamp ??
      (contactTimes.length > 0 ? contactTimes[0] : null)

    clearIdleTimer()
    setOpenRally(null)
    setContactTimes([])
    setPhase('tapping')
    if (setId) clearPass1FocusDraft(setId)
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
    setPlaybackSpeed(nudgeSharedSpeed(playbackSpeed, direction))
  }

  const handleSeekBy = (deltaSeconds: number) => {
    seekClamped(readVideoTime() + deltaSeconds)
  }

  const handleJumpToLastRallyEnd = () => {
    if (completed.length === 0) return
    const last = completed[completed.length - 1]
    setFocusedRallyIndex(last.rallyIndex)
    seekClamped(last.serveTimestamp)
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  const handleJumpToFirstServe = () => {
    if (completed.length === 0) return
    // Seek only — stay on live “next” so Done / tapping stay available.
    seekClamped(completed[0].serveTimestamp)
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  /** Multi-set: seek to end of previous set (start of between-set gap). Seek-only. */
  const handleJumpPrevSetEnd = () => {
    if (prevSetEndS == null) return
    setCurrentTime(prevSetEndS)
    videoPlayerRef.current?.seek(prevSetEndS, true)
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  const handleDiscardOpen = () => {
    if (!openRally) return
    const endAt = openRally.endTimestamp
    setOpenRally(null)
    setContactTimes([])
    setFocusedRallyIndex('next')
    setPhase('tapping')
    if (setId) clearPass1FocusDraft(setId)
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
      setFocusedRallyIndex('next')
      setPhase('tapping')
      clearPass1FocusDraft(setId)
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

  /** Done: finalize the set and go straight to Match Review (no score-confirm screen). */
  const handleEndSession = async () => {
    if (completed.length === 0 && !openRally) return
    if (!setId) return
    if (openRally || contactTimes.length > 0) {
      const ok = window.confirm(
        'Discard the open rally and finish this set?'
      )
      if (!ok) return
    }
    clearIdleTimer()
    setOpenRally(null)
    setContactTimes([])
    clearPass1FocusDraft(setId)
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)

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

    const hasReview = completed.some((r) =>
      Object.values(r.timeline.shots).some((s) => s.reviewKind !== null)
    )
    const hasHighlight = completed.some((r) => r.isHighlight)
    const params = new URLSearchParams()
    if (hasReview) {
      params.set('tab', 'workon')
    } else if (hasHighlight) {
      params.set('tab', 'clips')
      params.set('clip', encodeClipFilter({ kind: 'highlights' }))
    }
    const q = params.toString()
    navigate(`/matches/${matchId}${q ? `?${q}` : ''}`)
  }

  const handleToggleShotChoice = (n: number, key: ShotChoiceKey, value: string) => {
    patchTimeline((s) => toggleShotChoice(s, n, key, value))
  }

  const handleToggleAttribute = (n: number, key: ShotAttributeKey) => {
    patchTimeline((s) => toggleShotAttribute(s, n, key))
  }

  /** Seek to shot `n`'s loop start and play; the selected-shot loop then keeps cycling. */
  const playFromShot = (n: number) => {
    if (!openRally || phase !== 'form') return
    const shotLoop = shotLoopWindow(openRally.timeline, n, constrainedPlayback)
    if (!shotLoop) return
    const target = shotLoop.startTime
    setCurrentTime(target)
    // ignoreConstraints: the player still holds the previous shot's window until re-render.
    videoPlayerRef.current?.seek(target, true)
    videoPlayerRef.current?.play()
  }

  /** Rail or list row tap: select, snap the row under the rail, and replay from that shot. */
  const handleSelectShot = (n: number) => {
    setSelectedShot(n)
    playFromShot(n)
    requestAnimationFrame(() => snapPass1ShotIntoView(n))
  }

  const handleMarkFos = (at: number) => {
    if (!openRally || phase !== 'form') return
    if (at < 2) return
    setSelectedShot(at)
    const contact = openRally.timeline.shots[at]?.contactTime ?? null
    patchTimeline((s) => markFos(s, at, contact))
    setFosPickMode(false)
    playFromShot(at)
  }

  const handleChangeFos = () => {
    setSelectedShot(null)
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

  /** Point-cube: jump to a completed rally's serve and outline it. */
  const handleSelectCompletedRally = (rally: CompletedRally) => {
    setFocusedRallyIndex(rally.rallyIndex)
    seekClamped(rally.serveTimestamp)
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  /** Point-cube: return focus to the next / open point. */
  const handleSelectNextRally = () => {
    setFocusedRallyIndex('next')
    if (phase === 'tapping') {
      applyTappingConstraints()
      seekClamped(seekFloorFromCompleted(completed))
    } else if (openRally) {
      setSelectedShot(null)
      const { startTime, endTime } = constrainedPlayback
      const target = Math.max(startTime, Math.min(endTime, openRally.serveTimestamp))
      setCurrentTime(target)
      videoPlayerRef.current?.seek(target, true)
    }
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  const handleDeleteLastRally = async () => {
    if (completed.length === 0 || focusedRallyIndex !== 'next') return
    if (phase === 'tapping' && contactTimes.length > 0) {
      const ok = window.confirm(
        'Discard current taps and delete the last completed rally?'
      )
      if (!ok) return
      clearIdleTimer()
      setContactTimes([])
      setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    }
    if (phase === 'form' && openRally) {
      const ok = window.confirm(
        'Delete the last completed rally? The open rally draft is kept.'
      )
      if (!ok) return
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
      setFocusedRallyIndex('next')
      if (phase === 'tapping') {
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
      }
    } catch (error) {
      console.error('[Pass1Focus] Delete last failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete last rally')
    }
  }

  /** Soft exit to Match Review without finalizing the set (Resume still works). */
  const handleReviewMatch = () => {
    if (openRally || contactTimes.length > 0) {
      const ok = window.confirm(
        'Leave tagging? Unsaved rally progress will be lost.'
      )
      if (!ok) return
    }
    clearIdleTimer()
    navigate(`/matches/${matchId}`)
  }

  const handleMarkEnd = (at: number) => {
    setSelectedShot(at)
    patchTimeline((s) => markEnd(s, at))
  }

  const handleToggleEnding = (value: PointEnding) => {
    patchTimeline((s) => toggleEnding(s, value))
  }

  const handleToggleMissReason = (value: PointMissReason) => {
    patchTimeline((s) => toggleMissReason(s, value))
  }

  const tagBtn = 'tag-control'

  const contactCount = contactTimes.length
  const formContactTimes =
    phase === 'form' && openRally ? contactTimesFromTimeline(openRally.timeline) : []
  const overlayShot =
    phase === 'tapping'
      ? contactCount
      : phase === 'form'
        ? shotNumberAtTime(formContactTimes, liveTime)
        : null
  const selectedShotLoop =
    phase === 'form' && openRally && selectedShot !== null
      ? shotLoopWindow(openRally.timeline, selectedShot, constrainedPlayback)
      : null
  const activePlayback = selectedShotLoop
    ? { ...constrainedPlayback, ...selectedShotLoop }
    : constrainedPlayback
  const previewRally =
    focusedRallyIndex !== 'next'
      ? completed.find((rally) => rally.rallyIndex === focusedRallyIndex) ?? null
      : null

  const scoreBadge = (
    <Pass1SetHudBlock
      setNumber={setNumber}
      player1Name={player1Name}
      player2Name={player2Name}
      player1Sets={matchSets.player1}
      player2Sets={matchSets.player2}
      player1Score={currentScore.player1}
      player2Score={currentScore.player2}
      serverId={openServerId}
      serverName={serverName}
    />
  )

  const pointLedger = (
    <Pass1PointLedgerBlock
      open={pointLedgerOpen}
      completed={completed}
      player1Name={player1Name}
      player2Name={player2Name}
      nextServerId={openServerId}
      focusedRallyIndex={focusedRallyIndex}
      nextIsOpen={phase === 'form' || contactTimes.length > 0}
      onClose={() => setPointLedgerOpen(false)}
      onSelectCompleted={(rallyIndex) => {
        const rally = completed.find((item) => item.rallyIndex === rallyIndex)
        if (rally) {
          handleSelectCompletedRally(rally)
          setPointLedgerOpen(false)
        }
      }}
      onSelectNext={() => {
        handleSelectNextRally()
        setPointLedgerOpen(false)
      }}
      canDeleteLast={completed.length > 0 && focusedRallyIndex === 'next'}
      onDeleteLast={() => {
        void handleDeleteLastRally()
      }}
    />
  )
  const canEndSet = completed.length > 0 && focusedRallyIndex === 'next'
  const setContextBar = (
    <Pass1SetContextBlock
      completed={completed}
      player1Name={player1Name}
      player2Name={player2Name}
      serverId={previewRally?.serverId ?? openServerId}
      serverName={previewRally?.serverName ?? serverName}
      focusedRallyIndex={focusedRallyIndex}
      historyOpen={pointLedgerOpen}
      navigationLocked={phase === 'form' || contactTimes.length > 0}
      canToggleServer={focusedRallyIndex === 'next'}
      onToggleServer={() =>
        void handleSetServer(openServerId === 'player1' ? 'player2' : 'player1')
      }
      onSelectLast={handleJumpToLastRallyEnd}
      onSelectNext={handleSelectNextRally}
      onJumpFirstServe={handleJumpToFirstServe}
      onJumpPrevSetEnd={prevSetEndS != null ? handleJumpPrevSetEnd : undefined}
      prevSetNumber={setNumber > 1 ? setNumber - 1 : null}
      onToggleHistory={() => setPointLedgerOpen((open) => !open)}
      canEndSet={canEndSet}
      onEndSet={() => void handleEndSession()}
      onReviewMatch={handleReviewMatch}
    />
  )

  return (
    <div
      className={cn(
        'fixed inset-0 flex flex-col bg-bg-surface overflow-hidden pb-[env(safe-area-inset-bottom,0px)]',
        className
      )}
    >
      {/* Phone: cap video so Tap / form chrome own the lower viewport (goal 1 speed). */}
      <div className="relative shrink-0 w-full bg-black overflow-hidden max-h-[42dvh] flex justify-center">
        <div className="relative w-full aspect-video max-h-[42dvh]">
          <VideoStageChrome
            bottomOverlay={
              videoUrl ? (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-start">{scoreBadge}</div>
                  <TransportCluster
                    variant="overlay"
                    isPlaying={isPlaying}
                    playbackSpeed={playbackSpeed}
                    seekStepSeconds={SHARED_SEEK_STEP}
                    onTogglePlay={() => videoPlayerRef.current?.togglePlay()}
                    onSeekBy={handleSeekBy}
                    onNudgeSpeed={nudgePlaybackSpeed}
                    className="[&_button]:max-sm:h-10 [&_button]:max-sm:min-w-10 [&_button]:max-sm:w-10"
                  />
                </div>
              ) : null
            }
          >
            <VideoPlayerSection
              ref={videoPlayerRef}
              videoUrl={videoUrl}
              onVideoSelect={setVideoUrl}
              constrainedPlayback={activePlayback}
              showProgressBar
            />
          </VideoStageChrome>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-bg-surface">
        {/* Score HUD sits under the empty video stage so it doesn't cover “Click to load”. */}
        {!videoUrl && (
          <div className="shrink-0 px-1.5 pt-1 flex justify-start">{scoreBadge}</div>
        )}
        {phase === 'tapping' ? (
          <div className="relative flex flex-col flex-1 min-h-0">
            {setContextBar}
            {pointLedger}
            <TaggingSessionBar
              captureRail={
                <Pass1ShotMarkRail
                  state={
                    previewRally
                      ? previewRally.timeline
                      : { ...timelineFromContacts(contactTimes), end: null }
                  }
                  players={players}
                  server={previewRally?.serverName ?? serverName}
                  activeShot={previewRally ? null : contactTimes.length > 0 ? contactTimes.length : null}
                  onSelectShot={(n) => {
                    const t = previewRally
                      ? previewRally.timeline.shots[n]?.contactTime
                      : contactTimes[n - 1]
                    if (typeof t === 'number') seekClamped(t)
                  }}
                  scrollable
                />
              }
            />
            <div className="flex-1 min-h-0 flex flex-col gap-2 p-2">
              <div className="relative flex-1 min-h-0 flex flex-col">
                <Button
                  variant="primary"
                  onClick={handleTapContact}
                  disabled={!setReady || Boolean(previewRally)}
                  className="flex-1 w-full min-h-[28dvh] !h-auto self-stretch text-2xl font-bold rounded-xl active:scale-[0.99] touch-manipulation"
                >
                  {previewRally
                    ? 'Return to live to capture'
                    : 'Tap contact'}
                </Button>
                {contactCount > 0 && !previewRally && (
                  <button
                    type="button"
                    onClick={handleUndoLastContact}
                    className="absolute bottom-2 right-2 rounded-md border border-white/25 bg-black/45 px-2 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm"
                    title="Drop the last contact tap"
                  >
                    Undo tap
                  </button>
                )}
              </div>
              <p className="shrink-0 text-[11px] text-muted text-center pb-1">
                {previewRally
                  ? 'Viewing a past point · Live → in the set bar to capture'
                  : contactCount === 0
                    ? 'Tap each bat contact · first tap is the serve · auto-finishes after 2s idle'
                    : `${contactCount} contact${contactCount === 1 ? '' : 's'} · auto-finishes after 2s idle`}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col flex-1 min-h-0">
            {setContextBar}
            {pointLedger}
            {/* Tagging chrome — primary Save; Highlight; Redo/Discard in More */}
            <div className="shrink-0 border-t border-pill-idle-border bg-bg-card pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
              {saveHint && !canSave && (
                <p className="px-1.5 pt-1 text-[10px] font-semibold text-muted" role="status">
                  {saveHint}
                </p>
              )}
              <div className="relative min-h-11 px-1.5 py-1.5 flex flex-wrap items-center justify-end gap-1.5 text-[length:var(--control-text)]">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    aria-expanded={formMoreOpen}
                    aria-haspopup="menu"
                    onClick={() => setFormMoreOpen((o) => !o)}
                    className={cn(tagBtn, 'shrink-0 min-h-10 px-3 touch-manipulation', formMoreOpen && 'tag-control-active')}
                    title="More rally actions"
                  >
                    <Icon name="more-h" size="sm" />
                    More
                  </button>
                  {formMoreOpen && (
                    <div
                      role="menu"
                      className="absolute bottom-full right-0 z-40 mb-1 min-w-[11rem] rounded-md border border-pill-idle-border bg-bg-card p-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setFormMoreOpen(false)
                          handleRedoRally()
                        }}
                        className={cn(tagBtn, 'w-full justify-start min-h-10')}
                        title="Clear these contacts and re-tap this rally from just before the serve"
                      >
                        Redo contacts
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setFormMoreOpen(false)
                          handleDiscardOpen()
                        }}
                        className={cn(tagBtn, 'tag-control-danger w-full justify-start min-h-10')}
                        title="Discard this rally draft without saving"
                      >
                        Discard rally
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-pressed={Boolean(openRally?.isHighlight)}
                  onClick={handleToggleHighlight}
                  className={cn(
                    tagBtn,
                    'shrink-0 min-h-10 px-3 touch-manipulation',
                    openRally?.isHighlight && 'bg-review border-review text-primary'
                  )}
                  title="Mark this whole rally as a highlight (show-reel)"
                >
                  ★ Highlight
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className={cn(
                    tagBtn,
                    'shrink-0 min-h-10 px-4 touch-manipulation font-bold',
                    canSave ? 'tag-control-accent' : 'opacity-50'
                  )}
                  title="Save this rally and move to the next point"
                >
                  {saving ? 'Saving…' : 'Save rally'}
                </button>
              </div>
            </div>

            <div data-pass1-scroller className="flex-1 min-h-0 overflow-y-auto">
              <Pass1FocusBlock
                state={timeline}
                players={players}
                server={serverName}
                activeShot={overlayShot}
                selectedShot={selectedShot}
                onSelectShot={handleSelectShot}
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
                scrollableShotRail
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Contact-phase chrome: shot rail under the set context bar. */
function TaggingSessionBar({ captureRail }: { captureRail: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-pill-idle-border bg-bg-card">
      <div className="px-1.5 pb-0.5">{captureRail}</div>
    </div>
  )
}
