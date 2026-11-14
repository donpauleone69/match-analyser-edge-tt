/**
 * SimpleTaggingComposer — phone-first Simple tagging (alternative to Pass 1).
 *
 * Setup → tap contacts → 2s idle → matrix (Offensive/End/Review) while video loops.
 * Same DBRally/DBShot via Pass 1 persist path (End keeps wing/stroke; others stripped).
 * Phase 2.5 (MA-60): Pass 1 visual/protocol parity — Let before Discard;
 * FOS/End/Review colours; Rally|Shot on video; section labels above matrix.
 */

import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import {
  Pass1ShotMarkRail,
  Pass1SetHudBlock,
  Pass1SetContextBlock,
  Pass1PointLedgerBlock,
  SimpleTaggingMatrixBlock,
  SimpleTaggingModePickerBlock,
} from '../blocks'
import { VideoPlayerSection } from '../sections'
import {
  type VideoPlayerHandle,
  useVideoPlaybackStore,
  VideoStageChrome,
  MatchVideoOverlayBar,
  MATCH_VIDEO_OVERLAY_BOTTOM_CLASS,
  nudgePlaybackSpeed as nudgeSharedSpeed,
  SEEK_STEP_SECONDS as SHARED_SEEK_STEP,
} from '@/ui-mine/VideoPlayer'
import { Button } from '@/ui-mine'
import { calculateServer } from '@/rules'
import { deriveMatchSetsBeforeSet } from '@/rules/derive/set/deriveMatchSetsBeforeSet'
import { rallyDb, setDb } from '@/data'
import { resolveSetVideo } from '@/data/services/videoAssetService'
import {
  emptyRallyTimelineState,
  endReasoningLoopWindow,
  inferWinnerName,
  toggleEnding,
  toggleMissReason,
  toggleShotAttribute,
  toggleShotChoice,
  toggleShotReviewFlag,
  timelineFromContacts,
  loopWindowFromContacts,
  shotLoopWindow,
  captureContactTime,
  seekFloorFromCompleted,
  clampSeekTime,
  CONTACT_IDLE_MS,
  LOOP_PAD_SECONDS,
  CAPTURE_PLAYBACK_SPEED,
  NORMAL_PLAYBACK_SPEED,
  toPass1FocusMapperShot,
  contactTimesFromTimeline,
  shotNumberAtTime,
  type RallyTimelineState,
  type PointEnding,
  type PointMissReason,
  type ShotAttributeKey,
  type ShotChoiceKey,
} from './pass1FocusModel'
import {
  persistPass1FocusRally,
  finalizePass1FocusSet,
  loadResumedPass1FocusState,
  deleteLastPersistedPass1FocusRally,
} from './persistPass1FocusRally'
import {
  clearSimpleTaggingDraft,
  loadSimpleTaggingDraft,
  saveSimpleTaggingDraft,
} from './simpleTaggingDraftStorage'
import {
  canSaveSimpleTagging,
  isEndShotFullyTagged,
  markEndSimple,
  markFosSimple,
  offensiveShotsFromTimeline,
  toggleNoAttackSimple,
  toggleOffensiveShot,
  type SimpleMatrixRow,
} from './simpleTaggingModel'
import type { SimpleLoopScope } from '../blocks/SimpleTaggingMatrixBlock'
import {
  saveLastTaggingMode,
  saveRallyTaggingMode,
  type SessionTaggingMode,
} from '../helpers/taggingModePreference'
import { encodeClipFilter } from '@/rules/derive/clips/deriveClips'
import {
  betweenSetGapSeekS,
  shouldShowBetweenSetGapJump,
} from '@/rules/videoLifecycle/deriveVideoJumpMarkers'

export interface SimpleTaggingComposerProps {
  matchId: string
  setNumber: number
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  className?: string
  /** Switch to Pass 1 (caller confirms / navigates). */
  onRequestModeChange?: (mode: SessionTaggingMode) => void
}

type WinnerId = 'player1' | 'player2'
type PhaseStep = 'setup' | 'tapping' | 'form'

interface OpenRally {
  serveTimestamp: number
  endTimestamp: number
  timeline: RallyTimelineState
  isHighlight: boolean
  offensiveShots: number[]
}

/** Strip optional Pass 1 tags before shared persist; keep End wing/stroke/pivot. */
function stripForSimplePersist(timeline: RallyTimelineState): RallyTimelineState {
  const end =
    typeof timeline.end === 'number' && timeline.end > 1 ? timeline.end : null
  const shots: RallyTimelineState['shots'] = {}
  for (const [key, shot] of Object.entries(timeline.shots)) {
    const n = Number(key)
    const mapped = toPass1FocusMapperShot(shot)
    if (end !== null && n === end) {
      shots[n] = {
        wing: mapped.wing,
        stroke: mapped.stroke,
        standing: null,
        isHigh: false,
        isSafe: false,
        isAggressive: false,
        isPivot: mapped.isPivot,
        reviewKind: mapped.reviewKind,
        contactTime: mapped.contactTime,
        spin: null,
        depth: null,
        placement: null,
        tableContact: null,
        quality: null,
        isWeak: false,
        isHeavy: false,
      }
    } else {
      shots[n] = {
        wing: null,
        stroke: null,
        standing: null,
        isHigh: false,
        isSafe: false,
        isAggressive: false,
        isPivot: false,
        reviewKind: mapped.reviewKind,
        contactTime: mapped.contactTime,
        spin: null,
        depth: null,
        placement: null,
        tableContact: null,
        quality: null,
        isWeak: false,
        isHeavy: false,
      }
    }
  }
  return { ...timeline, shots }
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

export function SimpleTaggingComposer({
  matchId,
  setNumber,
  player1Id,
  player2Id,
  player1Name,
  player2Name,
  className,
  onRequestModeChange,
}: SimpleTaggingComposerProps) {
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
  const [selectedShot, setSelectedShot] = useState<number | null>(null)
  const [activeMatrixRow, setActiveMatrixRow] = useState<SimpleMatrixRow | null>(
    null
  )
  /** Explicit Rally vs Shot loop; End-reasoning may auto-narrow to Shot. */
  const [loopScope, setLoopScope] = useState<SimpleLoopScope>('rally')
  /** Pause rally loop only while review detail is focused (§9 8A). */
  const [reviewDetailFocused, setReviewDetailFocused] = useState(false)
  /** Which point cube is outlined — past rally index, or 'next' (about to tag / open). */
  const [focusedRallyIndex, setFocusedRallyIndex] = useState<number | 'next'>('next')
  const [pointLedgerOpen, setPointLedgerOpen] = useState(false)
  /** Live element time for form playhead underline (avoids timeupdate lag). */
  const [liveTime, setLiveTime] = useState(0)
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

        // Recover mid-point Simple draft after reload (contacts or open form).
        const draft = loadSimpleTaggingDraft(target.id)
        if (draft && draft.matchId === matchId && draft.setNumber === setNumber) {
          if (draft.phase === 'form' && draft.openRally) {
            const { serveTimestamp, endTimestamp } = draft.openRally
            const dur = useVideoPlaybackStore.getState().duration
            const loop = loopWindowFromContacts(serveTimestamp, endTimestamp, dur)
            const restored = {
              ...draft.openRally,
              offensiveShots:
                draft.openRally.offensiveShots.length > 0
                  ? draft.openRally.offensiveShots
                  : offensiveShotsFromTimeline(draft.openRally.timeline),
            }
            setOpenRally(restored)
            setContactTimes([])
            const endN =
              typeof restored.timeline.end === 'number'
                ? restored.timeline.end
                : null
            const selected =
              draft.selectedShot ?? endN
            setSelectedShot(selected)
            setActiveMatrixRow(
              selected !== null && selected === endN ? 'end' : null
            )
            setLoopScope(
              endN !== null && !isEndShotFullyTagged(restored.timeline)
                ? 'shot'
                : 'rally'
            )
            setReviewDetailFocused(draft.reviewDetailFocused)
            setFocusedRallyIndex('next')
            setPhase('form')
            setConstrainedPlayback({
              enabled: true,
              startTime: loop.startTime,
              endTime: loop.endTime,
              loopOnEnd: !draft.reviewDetailFocused,
            })
          } else if (draft.phase === 'tapping' && draft.contactTimes.length > 0) {
            setOpenRally(null)
            setContactTimes(draft.contactTimes)
            setSelectedShot(null)
            setPhase('tapping')
            setPlaybackSpeed(CAPTURE_PLAYBACK_SPEED)
          }
        }

        saveLastTaggingMode('simple')

        const video = await resolveSetVideo(matchId, setNumber)
        if (video) {
          setVideoUrl(video.url)
        }
      } catch (error) {
        console.error('[SimpleTagging] Failed to init:', error)
        alert('Failed to load set for Simple tagging')
      }
    }
    init()
  }, [matchId, setNumber, navigate, setVideoUrl, player1Id, player2Id, player1Name, player2Name])

  useEffect(() => () => clearIdleTimer(), [])

  // Persist in-progress point so reload can resume tagging.
  useEffect(() => {
    if (!setId || !setReady) return
    if (phase !== 'tapping' && phase !== 'form') return
    saveSimpleTaggingDraft({
      version: 1,
      setId,
      matchId,
      setNumber,
      phase,
      contactTimes,
      openRally,
      selectedShot,
      reviewDetailFocused,
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
    reviewDetailFocused,
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

  // Sample live video time for playhead underline under matrix columns.
  useEffect(() => {
    if (phase !== 'form' && phase !== 'tapping') return
    let rafId = 0
    const tick = () => {
      setLiveTime(readVideoTime())
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
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

  const winnerName = inferWinnerName(
    timeline.end,
    timeline.ending,
    players,
    serverName
  )
  const canSave = openRally
    ? canSaveSimpleTagging(timeline, winnerName)
    : false

  const patchOpenRally = (
    updater: (prev: OpenRally) => OpenRally
  ) => {
    setOpenRally((cur) => (cur ? updater(cur) : cur))
  }

  // Base rally loop window; pause only while review detail is focused (§9 8A).
  // Narrow Shot / End windows are applied via activePlayback overlay below.
  useEffect(() => {
    if (phase !== 'form' || !openRally) return
    const dur = useVideoPlaybackStore.getState().duration
    const loop = loopWindowFromContacts(
      openRally.serveTimestamp,
      openRally.endTimestamp,
      dur
    )
    setConstrainedPlayback({
      enabled: true,
      startTime: loop.startTime,
      endTime: loop.endTime,
      loopOnEnd: !reviewDetailFocused,
    })
    if (reviewDetailFocused) {
      videoPlayerRef.current?.pause()
    } else if (!isPlaying) {
      videoPlayerRef.current?.play()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reviewDetailFocused, openRally?.serveTimestamp, openRally?.endTimestamp])

  // When End becomes fully tagged, return to full rally loop (user can still pick Shot).
  const endFullyTagged = openRally
    ? isEndShotFullyTagged(openRally.timeline)
    : false
  useEffect(() => {
    if (phase !== 'form' || !openRally) return
    if (endFullyTagged && loopScope === 'shot') {
      // Only auto-flip when we were in End-reasoning narrow mode.
      if (activeMatrixRow === 'end' || selectedShot === openRally.timeline.end) {
        setLoopScope('rally')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, endFullyTagged])

  const finalizeContacts = (times: number[]) => {
    if (times.length === 0) return
    clearIdleTimer()
    const serveTimestamp = times[0]
    const endTimestamp = times[times.length - 1]
    const duration = useVideoPlaybackStore.getState().duration
    const loop = loopWindowFromContacts(serveTimestamp, endTimestamp, duration)
    const timeline = timelineFromContacts(times)
    const endN = timeline.end
    setOpenRally({
      serveTimestamp,
      endTimestamp,
      timeline,
      isHighlight: false,
      offensiveShots: [],
    })
    setContactTimes([])
    // End auto-selected as last contact; open End detail immediately.
    setSelectedShot(endN)
    setActiveMatrixRow('end')
    setLoopScope('shot')
    setReviewDetailFocused(false)
    setFocusedRallyIndex('next')
    setPhase('form')
    const endLoop =
      typeof endN === 'number'
        ? endReasoningLoopWindow(timeline, loop)
        : null
    setConstrainedPlayback({
      enabled: true,
      startTime: loop.startTime,
      endTime: loop.endTime,
      loopOnEnd: true,
    })
    const seekTo = endLoop?.startTime ?? loop.startTime
    videoPlayerRef.current?.seek(seekTo)
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

  /**
   * Let / redo contacts: clear this point's taps and re-capture from just
   * before the serve. No score recorded — same path as Pass 1 Redo contacts.
   */
  const handleLetRally = () => {
    if (!openRally && contactTimes.length === 0) return
    const seekSource =
      openRally?.serveTimestamp ??
      (contactTimes.length > 0 ? contactTimes[0] : null)

    clearIdleTimer()
    setOpenRally(null)
    setContactTimes([])
    setReviewDetailFocused(false)
    setSelectedShot(null)
    setActiveMatrixRow(null)
    setLoopScope('rally')
    setFocusedRallyIndex('next')
    setPhase('tapping')
    if (setId) clearSimpleTaggingDraft(setId)
    setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
    applyTappingConstraints()

    if (typeof seekSource === 'number') {
      seekClamped(seekSource - LOOP_PAD_SECONDS)
    } else {
      seekClamped(readVideoTime() - 2)
    }
    videoPlayerRef.current?.play()
  }

  const handleDiscardOpen = () => {
    if (!openRally) return
    const endAt = openRally.endTimestamp
    setOpenRally(null)
    setContactTimes([])
    setReviewDetailFocused(false)
    setFocusedRallyIndex('next')
    setPhase('tapping')
    if (setId) clearSimpleTaggingDraft(setId)
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
      // Strip optional Pass 1 tags; persist uses Pass 1 path (same DB shape).
      const timeline = stripForSimplePersist(openRally.timeline)

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
        timeline,
      })

      saveRallyTaggingMode(persisted.rally.id, 'simple')

      const savedEntry: CompletedRally = {
        dbRallyId: persisted.rally.id,
        rallyIndex,
        serveTimestamp: openRally.serveTimestamp,
        endTimestamp: openRally.endTimestamp,
        serverId: openServerId,
        winnerId,
        serverName: persisted.serverName,
        winnerName: persisted.winnerName,
        timeline,
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
      setReviewDetailFocused(false)
      setFocusedRallyIndex('next')
      setPhase('tapping')
      clearSimpleTaggingDraft(setId)
      applyTappingConstraints(nextCompleted)
      setPlaybackSpeed(NORMAL_PLAYBACK_SPEED)
      seekClamped(openRally.endTimestamp, nextCompleted)
      videoPlayerRef.current?.play()
    } catch (error) {
      console.error('[SimpleTagging] Save failed:', error)
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
        'Discard the open rally and finish this set with Done? This closes the set.'
      )
      if (!ok) return
    }
    clearIdleTimer()
    setOpenRally(null)
    setContactTimes([])
    setReviewDetailFocused(false)
    clearSimpleTaggingDraft(setId)
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
      console.error('[SimpleTagging] Finalize failed:', error)
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

  /** Seek to shot `n`'s loop start and play; selected-shot loop keeps cycling unless review-focused. */
  const playFromShot = (n: number) => {
    if (!openRally || phase !== 'form') return
    if (reviewDetailFocused) return
    const shotLoop = shotLoopWindow(openRally.timeline, n, constrainedPlayback)
    if (!shotLoop) return
    const target = shotLoop.startTime
    setCurrentTime(target)
    videoPlayerRef.current?.seek(target, true)
    videoPlayerRef.current?.play()
  }

  const handleSelectShot = (n: number) => {
    setSelectedShot(n)
    playFromShot(n)
  }

  const handleToggleOffensive = (at: number) => {
    patchOpenRally((cur) => {
      const next = toggleOffensiveShot(cur.timeline, cur.offensiveShots, at)
      return { ...cur, timeline: next.timeline, offensiveShots: next.offensiveShots }
    })
    playFromShot(at)
  }

  const handleMarkFos = (at: number) => {
    setSelectedShot(at)
    patchOpenRally((cur) => {
      const next = markFosSimple(cur.timeline, cur.offensiveShots, at)
      return { ...cur, timeline: next.timeline, offensiveShots: next.offensiveShots }
    })
    playFromShot(at)
  }

  const handleNoAttack = () => {
    patchOpenRally((cur) => {
      const next = toggleNoAttackSimple(cur.timeline, cur.offensiveShots)
      return { ...cur, timeline: next.timeline, offensiveShots: next.offensiveShots }
    })
  }

  const handleToggleReviewFlag = (n: number) => {
    patchOpenRally((cur) => ({
      ...cur,
      timeline: toggleShotReviewFlag(cur.timeline, n),
    }))
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
      console.error('[SimpleTagging] Delete last failed:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete last rally')
    }
  }

  const handleMarkEnd = (at: number) => {
    setSelectedShot(at)
    patchOpenRally((cur) => {
      const next = markEndSimple(cur.timeline, cur.offensiveShots, at)
      return { ...cur, timeline: next.timeline, offensiveShots: next.offensiveShots }
    })
  }

  const handleToggleEnding = (value: PointEnding) => {
    patchOpenRally((cur) => ({
      ...cur,
      timeline: toggleEnding(cur.timeline, value),
    }))
  }

  const handleToggleMissReason = (value: PointMissReason) => {
    patchOpenRally((cur) => ({
      ...cur,
      timeline: toggleMissReason(cur.timeline, value),
    }))
  }

  const handleToggleShotChoice = (
    n: number,
    key: ShotChoiceKey,
    value: string
  ) => {
    patchOpenRally((cur) => ({
      ...cur,
      timeline: toggleShotChoice(cur.timeline, n, key, value),
    }))
  }

  const handleToggleAttribute = (n: number, key: ShotAttributeKey) => {
    patchOpenRally((cur) => ({
      ...cur,
      timeline: toggleShotAttribute(cur.timeline, n, key),
    }))
  }

  const handleModeSwitch = (mode: SessionTaggingMode) => {
    if (mode === 'simple') return
    if (openRally || contactTimes.length > 0) {
      const ok = window.confirm(
        'Switch to Pass 1? Unsaved Simple draft for this point stays in Simple storage; Pass 1 opens separately.'
      )
      if (!ok) return
    }
    onRequestModeChange?.(mode)
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
  const endReasoningNarrow =
    phase === 'form' &&
    openRally &&
    typeof openRally.timeline.end === 'number' &&
    !isEndShotFullyTagged(openRally.timeline) &&
    (selectedShot === openRally.timeline.end || activeMatrixRow === 'end')

  const selectedShotLoop =
    phase === 'form' && openRally && loopScope === 'shot'
      ? endReasoningNarrow
        ? endReasoningLoopWindow(openRally.timeline, constrainedPlayback)
        : selectedShot !== null
          ? shotLoopWindow(openRally.timeline, selectedShot, constrainedPlayback)
          : null
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
    />
  )

  const formChromeRow =
    openRally && phase === 'form' ? (
      <div className="shrink-0 flex min-h-10 items-center gap-1 border-t border-b border-pill-idle-border bg-bg-card px-1.5 py-1 text-[length:var(--control-text)]">
        <button
          type="button"
          onClick={() =>
            void handleSetServer(openServerId === 'player1' ? 'player2' : 'player1')
          }
          className={cn(
            tagBtn,
            'min-w-0 max-w-[6.75rem] shrink-0 gap-1 font-bold',
            openServerId === 'player1'
              ? 'bg-player-1-bg border-player-1 text-primary'
              : 'bg-player-2-bg border-player-2 text-primary'
          )}
          title={`Rally server: ${serverName}. Tap to switch.`}
          aria-label={`Rally server: ${serverName}. Tap to switch.`}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              openServerId === 'player1' ? 'bg-player-1' : 'bg-player-2'
            )}
            aria-hidden
          />
          <span className="truncate">Serve · {serverName}</span>
        </button>
        <span className="min-w-0 flex-1 truncate px-1 text-center text-[10px] font-semibold text-primary">
          Point in progress
        </span>
        <button
          type="button"
          onClick={handleLetRally}
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
            topLeft={
              phase === 'form' && openRally ? (
                <button
                  type="button"
                  aria-pressed={true}
                  aria-label={`Loop scope ${loopScope === 'rally' ? 'Rally' : 'Shot'}. Tap to cycle.`}
                  onClick={() =>
                    setLoopScope(loopScope === 'rally' ? 'shot' : 'rally')
                  }
                  className={cn(
                    'tag-control tag-control-active h-7 min-w-[3.25rem] px-2 text-[10px] font-bold',
                    'border-white/30 bg-black/70 text-white backdrop-blur-sm touch-manipulation'
                  )}
                  title={
                    loopScope === 'rally'
                      ? 'Loop the whole rally — tap for Shot'
                      : 'Loop the current shot — tap for Rally'
                  }
                >
                  {loopScope === 'rally' ? 'Rally' : 'Shot'}
                </button>
              ) : null
            }
            topRight={
              <SimpleTaggingModePickerBlock
                mode="simple"
                onSelect={handleModeSwitch}
                disabled={phase === 'form' || contactTimes.length > 0}
                className="border-white/25 bg-black/70 backdrop-blur-sm [&_button]:text-white/90 [&_button[aria-pressed=true]]:bg-brand-primary/40 [&_button[aria-pressed=true]]:text-white"
              />
            }
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
            />
          </VideoStageChrome>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-bg-surface">
        {/* Score HUD sits under the empty video stage so it doesn't cover “Click to load”. */}
        {!videoUrl && (
          <div className="shrink-0 px-1.5 pt-1 flex items-center justify-between gap-2">
            {scoreBadge}
            <SimpleTaggingModePickerBlock
              mode="simple"
              onSelect={handleModeSwitch}
              disabled={phase === 'form' || contactTimes.length > 0}
            />
          </div>
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
                  className="flex-1 w-full min-h-[22dvh] !h-auto self-stretch text-2xl font-bold rounded-xl active:scale-[0.99] touch-manipulation"
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
            {/* One combined row: Serve·Hero + Let / Discard / Save */}
            {formChromeRow}
            {pointLedger}
            {openRally && (
              <SimpleTaggingMatrixBlock
                className="min-h-0 flex-1 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]"
                state={timeline}
                offensiveShots={openRally.offensiveShots}
                players={players}
                server={serverName}
                activeShot={overlayShot}
                selectedShot={selectedShot}
                activeRow={activeMatrixRow}
                reviewDetailFocused={reviewDetailFocused}
                onSelectShot={handleSelectShot}
                onToggleOffensive={handleToggleOffensive}
                onNoAttack={handleNoAttack}
                onMarkEnd={handleMarkEnd}
                onToggleReview={handleToggleReviewFlag}
                onToggleEnding={handleToggleEnding}
                onToggleMissReason={handleToggleMissReason}
                onToggleShotChoice={handleToggleShotChoice}
                onToggleAttribute={handleToggleAttribute}
                onReviewDetailFocusChange={setReviewDetailFocused}
                onSelectRow={setActiveMatrixRow}
                onMarkFos={handleMarkFos}
                isHighlight={openRally.isHighlight}
                onToggleHighlight={handleToggleHighlight}
              />
            )}
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
