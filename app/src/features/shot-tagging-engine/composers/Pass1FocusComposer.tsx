/**
 * Pass1FocusComposer — sequential rally tagging (Pass 1 Focus)
 *
 * Setup → tap contacts → 2s idle finalize → timeline while video loops.
 * Each Save writes the rally + shots to IndexedDB.
 * MA-67: Simple video overlay + Let/Discard/Save chrome.
 * MA-71/77: staged flow — contacts → end Result → end Wing/Stroke
 * (locked) → select FA / No Attack on rail → FA details → optional/save.
 * Guiding dialog below Rally; mute default for tagging; rally loop when no
 * shot selected; shot loop only while a shot is selected.
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
  Pass1ContactCaptureBlock,
  Pass1LeaveDraftChoiceBlock,
  snapPass1ShotIntoView,
} from '../blocks'
import { VideoPlayerSection } from '../sections'
import {
  type VideoPlayerHandle,
  type VideoProgressMarker,
  useVideoPlaybackStore,
  VideoStageChrome,
  MatchVideoOverlayBar,
  MATCH_VIDEO_OVERLAY_BOTTOM_CLASS,
  useTaggingMuteDefault,
  nudgePlaybackSpeed as nudgeSharedSpeed,
  SEEK_STEP_SECONDS as SHARED_SEEK_STEP,
} from '@/ui-mine/VideoPlayer'
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
  clearFosDecision,
  applyImpossibleFaAutoSkip,
  markEnd,
  toggleEnding,
  toggleMissReason,
  toggleShotReviewFlag,
  timelineFromContacts,
  contactTimesFromTimeline,
  shotNumberAtTime,
  loopWindowFromContacts,
  shotLoopWindow,
  captureContactTime,
  seekFloorFromCompleted,
  clampSeekTime,
  isFosDecided,
  isEndAttrsComplete,
  isPass1EndLockedStage,
  derivePass1Stage,
  CONTACT_IDLE_MS,
  LOOP_PAD_SECONDS,
  CAPTURE_PLAYBACK_SPEED,
  NORMAL_PLAYBACK_SPEED,
  rallyTimelineViewWindow,
  deriveRallyScrubMarks,
  type RallyTimelineState,
  type PointEnding,
  type PointMissReason,
  type ShotChoiceKey,
  type ShotAttributeKey,
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
import { saveLastTaggingMode, saveRallyTaggingMode } from '../helpers/taggingModePreference'
import { encodeClipFilter } from '@/rules/derive/clips/deriveClips'
import {
  betweenSetGapSeekS,
  shouldShowBetweenSetGapJump,
} from '@/rules/videoLifecycle/deriveVideoJumpMarkers'

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
  /** Switch to Simple (caller confirms / navigates). */
  onRequestModeChange?: (mode: 'simple' | 'pass1focus') => void
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
  onRequestModeChange: _onRequestModeChange,
}: Pass1FocusComposerProps) {
  void _onRequestModeChange
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
  /** MA-77: shot loop iff selectedShot != null; else rally loop. */
  const [selectedShot, setSelectedShot] = useState<number | null>(null)
  const setMuted = useVideoPlaybackStore((s) => s.setMuted)
  useTaggingMuteDefault()
  /** Which point cube is outlined — past rally index, or 'next' (about to tag / open). */
  const [focusedRallyIndex, setFocusedRallyIndex] = useState<number | 'next'>('next')
  const [pointLedgerOpen, setPointLedgerOpen] = useState(false)
  /** Previous set’s last timed action — between-set gap jump on multi-set captures. */
  const [prevSetEndS, setPrevSetEndS] = useState<number | null>(null)
  /** Mid-rally Leave: Keep draft vs Discard choice. */
  const [leaveDraftChoiceOpen, setLeaveDraftChoiceOpen] = useState(false)
  /** Skip autosave when Discarding so the draft is not rewritten before navigate. */
  const skipDraftPersistRef = useRef(false)

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
            const { serveTimestamp, endTimestamp, timeline: draftTimeline } =
              draft.openRally
            const dur = useVideoPlaybackStore.getState().duration
            const loop = loopWindowFromContacts(serveTimestamp, endTimestamp, dur)
            const endN =
              typeof draftTimeline.end === 'number'
                ? draftTimeline.end
                : draftTimeline.shotCount
            const stage = derivePass1Stage(draftTimeline, {
              inForm: true,
              hasContacts: true,
            })
            // MA-77: select_fa / optional start with no shot selected (rally loop).
            const restoredSelected =
              stage === 'fa_details' && typeof draftTimeline.fos === 'number'
                ? draftTimeline.fos
                : stage === 'end_details' || stage === 'end_shot'
                  ? endN > 0
                    ? endN
                    : null
                  : stage === 'select_fa' || stage === 'optional'
                    ? null
                    : (draft.selectedShot ?? (endN > 0 ? endN : null))
            setOpenRally(draft.openRally)
            setContactTimes([])
            setSelectedShot(restoredSelected)
            setMuted(true)
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
    if (skipDraftPersistRef.current) return
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

  // End / FA-detail stages keep a shot selected; select_fa + optional allow none (MA-77).
  useEffect(() => {
    if (phase !== 'form' || !openRally) return
    const stage = derivePass1Stage(openRally.timeline, {
      inForm: true,
      hasContacts: true,
    })
    if (typeof selectedShot === 'number' && openRally.timeline.shots[selectedShot]) {
      return
    }
    if (stage === 'select_fa' || stage === 'optional') return
    const endN = openRally.timeline.end
    const fallback =
      stage === 'fa_details' && typeof openRally.timeline.fos === 'number'
        ? openRally.timeline.fos
        : (typeof endN === 'number' ? endN : null) ??
          (openRally.timeline.shotCount > 0 ? openRally.timeline.shotCount : null)
    if (typeof fallback === 'number') setSelectedShot(fallback)
  }, [phase, openRally, selectedShot])

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
    const lastShot = times.length
    const duration = useVideoPlaybackStore.getState().duration
    const loop = loopWindowFromContacts(serveTimestamp, endTimestamp, duration)
    // End already pre-marked at N in timelineFromContacts; select last + Shot loop.
    setOpenRally({
      serveTimestamp,
      endTimestamp,
      timeline: timelineFromContacts(times),
      isHighlight: false,
    })
    setContactTimes([])
    setMuted(true)
    setSelectedShot(lastShot)
    setFocusedRallyIndex('next')
    setPhase('form')
    setConstrainedPlayback({
      enabled: true,
      startTime: loop.startTime,
      endTime: loop.endTime,
      loopOnEnd: true,
    })
    // Shot loop starts on the end contact once selectedShot drives activePlayback.
    const endContact = times[times.length - 1]
    videoPlayerRef.current?.seek(Math.max(loop.startTime, endContact - LOOP_PAD_SECONDS))
    videoPlayerRef.current?.play()
    requestAnimationFrame(() => snapPass1ShotIntoView(lastShot))
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
   * Let / redo contacts: clear this point's taps and re-capture from just
   * before the serve. No score recorded — wired as "Let" on the Simple-style bar.
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

  /**
   * Multi-set Gap: seek-only (live-next / Done unchanged).
   * No first serve yet → prevEnd + lead (estimated dead-air / start).
   * After contacts with gap ≥15s → previous set end.
   */
  const handleJumpPrevSetEnd = () => {
    const firstServeS = completed[0]?.serveTimestamp
    const dur = useVideoPlaybackStore.getState().duration
    const target = betweenSetGapSeekS(prevSetEndS, firstServeS, dur)
    if (target == null) return
    setCurrentTime(target)
    videoPlayerRef.current?.seek(target, true)
    if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
  }

  /** Show Gap only when prev end known and gap unknown or ≥ threshold (Details markers). */
  const firstServeSForGap = completed[0]?.serveTimestamp
  const showBetweenSetGapJump = shouldShowBetweenSetGapJump(
    prevSetEndS,
    firstServeSForGap
  )
  const gapJumpIsEstimate =
    showBetweenSetGapJump &&
    !(typeof firstServeSForGap === 'number' && Number.isFinite(firstServeSForGap))

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
      saveRallyTaggingMode(persisted.rally.id, 'pass1focus')
      saveLastTaggingMode('pass1focus')

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
        'Discard the open rally and finish this set with Done? This closes the set — use Leave if you only want to exit and resume later.'
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
    if (!openRally) {
      patchTimeline((s) =>
        applyImpossibleFaAutoSkip(toggleShotChoice(s, n, key, value))
      )
      return
    }
    const prevStage = derivePass1Stage(openRally.timeline, {
      inForm: true,
      hasContacts: true,
    })
    // MA-73: end=2 defensive → No Attack; end=2 attack → FA=2 (skip select).
    const next = applyImpossibleFaAutoSkip(
      toggleShotChoice(openRally.timeline, n, key, value)
    )
    patchTimeline(() => next)
    const nextStage = derivePass1Stage(next, { inForm: true, hasContacts: true })
    // End Wing/Stroke complete → select_fa (or auto-skipped optional): close panel + rally loop.
    if (
      prevStage === 'end_shot' &&
      (nextStage === 'select_fa' || nextStage === 'optional')
    ) {
      setMuted(true)
      setSelectedShot(null)
      const { startTime } = constrainedPlayback
      setCurrentTime(startTime)
      videoPlayerRef.current?.seek(startTime, true)
      videoPlayerRef.current?.play()
    }
    // FA Wing/Stroke complete → optional: close panel + rally loop (MA-77).
    if (prevStage === 'fa_details' && nextStage === 'optional') {
      setMuted(true)
      setSelectedShot(null)
    }
    // Entering FA details after FA mark already sets shot loop; keep muted shot loop while editing.
    if (nextStage === 'fa_details') {
      setMuted(true)
      if (typeof next.fos === 'number') setSelectedShot(next.fos)
    }
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

  /**
   * Rail or list row tap: select + replay.
   * End stages: locked to End shot.
   * select_fa: tap ≥2 marks / reassigns FA → FA details shot loop.
   * fa_details (MA-73): re-tap FA shot / FA caption → clear → select_fa;
   *   tap other ≥2 → reassign FA.
   * optional: from-that-shot-to-rally-end + mute.
   */
  const handleSelectShot = (n: number) => {
    if (!openRally || phase !== 'form') {
      setSelectedShot(n)
      return
    }
    const stage = derivePass1Stage(openRally.timeline, {
      inForm: true,
      hasContacts: true,
    })
    if (isPass1EndLockedStage(stage)) {
      const end = openRally.timeline.end
      if (typeof end === 'number') setSelectedShot(end)
      return
    }
    if (stage === 'select_fa' && n >= 2 && openRally.timeline.end !== 1) {
      const contact = openRally.timeline.shots[n]?.contactTime ?? null
      patchTimeline((s) => markFos({ ...s, noFirstAttack: false, fos: null }, n, contact))
      setSelectedShot(n)
      setMuted(true)
      playFromShot(n)
      requestAnimationFrame(() => snapPass1ShotIntoView(n))
      return
    }
    // MA-73: undo / reassign FA while still in fa_details (attrs incomplete).
    if (stage === 'fa_details' && openRally.timeline.end !== 1 && n >= 2) {
      const currentFos = openRally.timeline.fos
      if (currentFos === n) {
        patchTimeline((s) => clearFosDecision(s))
        setMuted(true)
        setSelectedShot(null)
        const { startTime } = constrainedPlayback
        setCurrentTime(startTime)
        videoPlayerRef.current?.seek(startTime, true)
        videoPlayerRef.current?.play()
        return
      }
      const contact = openRally.timeline.shots[n]?.contactTime ?? null
      patchTimeline((s) =>
        markFos({ ...s, noFirstAttack: false, fos: null }, n, contact)
      )
      setSelectedShot(n)
      setMuted(true)
      playFromShot(n)
      requestAnimationFrame(() => snapPass1ShotIntoView(n))
      return
    }
    setSelectedShot(n)
    // MA-77: shot loop only while a shot is selected; mute stays on.
    if (stage === 'optional' || stage === 'fa_details') {
      setMuted(true)
    }
    playFromShot(n)
    requestAnimationFrame(() => snapPass1ShotIntoView(n))
  }

  /**
   * Mark / move First attack (rare — select_fa uses rail; optional uses Change).
   */
  const handleMarkFos = (at: number) => {
    if (!openRally || phase !== 'form') return
    if (at < 2) return
    if (openRally.timeline.end === 1) return
    setSelectedShot(at)
    const contact = openRally.timeline.shots[at]?.contactTime ?? null
    if (openRally.timeline.fos === at) {
      patchTimeline((s) => markFos(s, at, contact))
      return
    }
    patchTimeline((s) =>
      markFos({ ...s, noFirstAttack: false, fos: null }, at, contact)
    )
    setMuted(true)
    playFromShot(at)
  }

  const handleChangeFos = () => {
    // Kept for Pass1FocusBlock props; select_fa is derived from state.
  }

  const handleNoAttack = () => {
    if (!openRally) {
      patchTimeline((s) => setFos(s, null))
      return
    }
    const next = setFos(openRally.timeline, null)
    patchTimeline(() => next)
    const nextStage = derivePass1Stage(next, { inForm: true, hasContacts: true })
    // MA-77: close panel + rally loop (muted) after No Attack or undo.
    if (nextStage === 'optional' || nextStage === 'select_fa') {
      setMuted(true)
      setSelectedShot(null)
      const { startTime } = constrainedPlayback
      setCurrentTime(startTime)
      videoPlayerRef.current?.seek(startTime, true)
      videoPlayerRef.current?.play()
    }
  }

  const handleClearFosDecision = () => {
    patchTimeline((s) => clearFosDecision(s))
    setMuted(true)
    setSelectedShot(null)
  }

  const handleCancelFosPick = () => {
    // No-op: stage machine replaces armed pick mode.
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

  /** Soft exit to Match Review without finalizing the set. */
  const exitToMatchReview = () => {
    clearIdleTimer()
    setLeaveDraftChoiceOpen(false)
    navigate(`/matches/${matchId}`)
  }

  /**
   * Soft exit. Mid-rally: Keep draft vs Discard choice (both leave; Stay cancels).
   * Between points with no open work: leave immediately.
   */
  const handleReviewMatch = () => {
    if (openRally || contactTimes.length > 0) {
      setLeaveDraftChoiceOpen(true)
      return
    }
    exitToMatchReview()
  }

  const handleLeaveKeepDraft = () => {
    // Autosaved draft stays — resume restores open taps/form.
    exitToMatchReview()
  }

  const handleLeaveDiscardDraft = () => {
    skipDraftPersistRef.current = true
    if (setId) clearPass1FocusDraft(setId)
    setOpenRally(null)
    setContactTimes([])
    setSelectedShot(null)
    exitToMatchReview()
  }

  const handleMarkEnd = (at: number) => {
    setSelectedShot(at)
    setMuted(true)
    patchTimeline((s) => markEnd(s, at))
  }

  const handleToggleEnding = (value: PointEnding) => {
    if (!openRally) return
    const next = toggleEnding(openRally.timeline, value)
    patchTimeline(() => next)
    // Stay on End shot loop through Result → Wing/Stroke (end_shot).
    // Rally loop + no selection once End attrs complete → select_fa / optional.
    if (next.ending && isEndAttrsComplete(next) && !isFosDecided(next)) {
      setMuted(true)
      setSelectedShot(null)
      const { startTime } = constrainedPlayback
      setCurrentTime(startTime)
      videoPlayerRef.current?.seek(startTime, true)
      videoPlayerRef.current?.play()
    } else if (next.ending && isEndAttrsComplete(next) && isFosDecided(next)) {
      // Serve-only / already decided → optional → close panel + rally loop.
      setMuted(true)
      setSelectedShot(null)
    } else {
      if (typeof next.end === 'number') setSelectedShot(next.end)
      setMuted(true)
    }
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
  // MA-77: shot loop only while a shot is selected; otherwise full rally loop.
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

  const scrubViewWindow = useMemo(
    () =>
      rallyTimelineViewWindow({
        duration: duration > 0 ? duration : 1,
        liveTime,
        completed,
        contactTimes:
          phase === 'tapping'
            ? contactTimes
            : openRally
              ? [openRally.serveTimestamp, openRally.endTimestamp]
              : [],
      }),
    [duration, liveTime, completed, phase, contactTimes, openRally]
  )

  const scrubMarks = useMemo(
    () =>
      deriveRallyScrubMarks({
        completed,
        focusedRallyIndex,
        draftContactTimes: phase === 'tapping' && !previewRally ? contactTimes : [],
        openDraft:
          phase === 'form' && openRally && !previewRally
            ? {
                serveTimestamp: openRally.serveTimestamp,
                endTimestamp: openRally.endTimestamp,
                serverId: openServerId,
              }
            : null,
      }),
    [
      completed,
      focusedRallyIndex,
      phase,
      previewRally,
      contactTimes,
      openRally,
      openServerId,
    ]
  )

  const progressMarkers: VideoProgressMarker[] = useMemo(
    () =>
      scrubMarks.map((m) => ({
        id: m.id,
        startTime: m.startTime,
        endTime: m.endTime,
        fillColor: m.fillColor,
        stripeColor: m.stripeColor,
        title: m.title,
        focused: m.focused,
        kind: m.kind,
      })),
    [scrubMarks]
  )

  const handleProgressMarkerSeek = (marker: VideoProgressMarker) => {
    const match = scrubMarks.find((m) => m.id === marker.id)
    // Completed rally marks → History preview (same as ledger / Last).
    if (match?.kind === 'rally' && match.id.startsWith('rally-')) {
      const idx = Number(match.id.replace('rally-', ''))
      const rally = completed.find((r) => r.rallyIndex === idx)
      if (rally && !(phase === 'form' || contactTimes.length > 0)) {
        handleSelectCompletedRally(rally)
        return
      }
    }
    if (match?.id === 'open-draft-rally' && openRally) {
      handleSelectNextRally()
      return
    }
    seekClamped(match?.seekTime ?? marker.startTime)
  }

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
      compact
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
      onJumpPrevSetEnd={showBetweenSetGapJump ? handleJumpPrevSetEnd : undefined}
      gapJumpIsEstimate={gapJumpIsEstimate}
      prevSetNumber={setNumber > 1 ? setNumber - 1 : null}
      onToggleHistory={() => setPointLedgerOpen((open) => !open)}
      canEndSet={canEndSet}
      onEndSet={() => void handleEndSession()}
      onReviewMatch={handleReviewMatch}
    />
  )

  /**
   * Form action row under the persistent set bar (MA-102).
   * Serve / Point in progress / Done / Leave live on setContextBar — avoid duplicate Serve.
   */
  const formChromeRow =
    openRally && phase === 'form' ? (
      <div className="shrink-0 flex min-h-10 items-center gap-1 border-b border-border bg-bg-card px-1.5 py-1 text-[length:var(--control-text)]">
        <span
          className="min-w-0 flex-1 truncate px-1 text-[10px] font-semibold text-muted"
          role="status"
        >
          {saveHint && !canSave ? saveHint : 'Tag End · FA · optionals'}
        </span>
        <button
          type="button"
          onClick={handleRedoRally}
          className={cn(tagBtn, 'shrink-0 touch-manipulation')}
          title="Let — clear contacts and re-tap this rally from just before the serve (no score)"
        >
          Let
        </button>
        <button
          type="button"
          onClick={handleDiscardOpen}
          className={cn(tagBtn, 'tag-control-danger shrink-0 touch-manipulation')}
          title="Discard this rally draft without saving"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave || saving}
          className={cn(
            tagBtn,
            'shrink-0 touch-manipulation font-bold',
            canSave ? 'tag-control-accent' : 'opacity-50'
          )}
          title="Save this rally and move to the next point"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    ) : null

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
            bottomOverlayClassName={MATCH_VIDEO_OVERLAY_BOTTOM_CLASS}
            bottomOverlay={
              videoUrl ? (
                <MatchVideoOverlayBar
                  score={scoreBadge}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  seekStepSeconds={SHARED_SEEK_STEP}
                  onTogglePlay={() => videoPlayerRef.current?.togglePlay()}
                  onSeekBy={handleSeekBy}
                  onNudgeSpeed={nudgePlaybackSpeed}
                />
              ) : null
            }
          >
            <VideoPlayerSection
              ref={videoPlayerRef}
              videoUrl={videoUrl}
              onVideoSelect={setVideoUrl}
              constrainedPlayback={activePlayback}
              showProgressBar
              progressViewWindow={
                videoUrl
                  ? { start: scrubViewWindow.viewStart, end: scrubViewWindow.viewEnd }
                  : null
              }
              progressMarkers={videoUrl ? progressMarkers : []}
              onProgressMarkerSeek={handleProgressMarkerSeek}
            />
          </VideoStageChrome>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-bg-surface">
        {/* Score HUD sits under the empty video stage so it doesn't cover “Click to load”. */}
        {!videoUrl && (
          <div className="shrink-0 px-1.5 pt-1 flex items-center gap-2">
            {scoreBadge}
          </div>
        )}
        {phase === 'tapping' ? (
          <div className="relative flex flex-col flex-1 min-h-0">
            {setContextBar}
            {pointLedger}
            <TaggingSessionBar
              captureRail={
                <div className="space-y-1" data-pass1-stage="contacts">
                  <Pass1ShotMarkRail
                    state={
                      previewRally
                        ? previewRally.timeline
                        : { ...timelineFromContacts(contactTimes), end: null }
                    }
                    players={players}
                    server={previewRally?.serverName ?? serverName}
                    activeShot={
                      previewRally
                        ? null
                        : contactTimes.length > 0
                          ? contactTimes.length
                          : null
                    }
                    onSelectShot={(n) => {
                      const t = previewRally
                        ? previewRally.timeline.shots[n]?.contactTime
                        : contactTimes[n - 1]
                      if (typeof t === 'number') seekClamped(t)
                    }}
                    scrollable
                  />
                </div>
              }
            />
            <Pass1ContactCaptureBlock
              contactCount={contactCount}
              disabled={!setReady}
              previewingPast={Boolean(previewRally)}
              serverSide={previewRally?.serverId ?? openServerId}
              onTap={handleTapContact}
              onUndo={handleUndoLastContact}
            />
          </div>
        ) : (
          <div className="relative flex flex-col flex-1 min-h-0">
            {/* Persistent set chrome through form (Done / Leave / Serve); slim Let·Discard·Save below. */}
            {setContextBar}
            {formChromeRow}
            {pointLedger}
            <div
              data-pass1-scroller
              className="flex-1 min-h-0 overflow-y-auto pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]"
            >
              <Pass1FocusBlock
                state={timeline}
                players={players}
                server={serverName}
                activeShot={overlayShot}
                selectedShot={selectedShot}
                onSelectShot={handleSelectShot}
                onToggleShotChoice={handleToggleShotChoice}
                onToggleAttribute={handleToggleAttribute}
                onMarkFos={handleMarkFos}
                onChangeFos={handleChangeFos}
                onNoAttack={handleNoAttack}
                onClearFosDecision={handleClearFosDecision}
                onCancelFosPick={handleCancelFosPick}
                onMarkEnd={handleMarkEnd}
                onToggleEnding={handleToggleEnding}
                onToggleMissReason={handleToggleMissReason}
                onToggleReviewFlag={handleToggleReviewFlag}
                isHighlight={Boolean(openRally?.isHighlight)}
                onToggleHighlight={handleToggleHighlight}
                canSave={canSave}
                scrollableShotRail
              />
            </div>
          </div>
        )}
      </div>

      <Pass1LeaveDraftChoiceBlock
        open={leaveDraftChoiceOpen}
        onKeepDraft={handleLeaveKeepDraft}
        onDiscard={handleLeaveDiscardDraft}
        onCancel={() => setLeaveDraftChoiceOpen(false)}
      />
    </div>
  )
}

/** Contact-phase chrome: shot rail under the set context bar (flush with capture pad). */
function TaggingSessionBar({ captureRail }: { captureRail: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-border bg-bg-card">
      <div className="px-1.5 pt-1 pb-0">{captureRail}</div>
    </div>
  )
}
