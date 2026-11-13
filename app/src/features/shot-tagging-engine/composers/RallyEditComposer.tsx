/**
 * RallyEditComposer — edit one already-tagged rally (route: /matches/:matchId/edit-rally?set=N&rally=R)
 *
 * Loads the saved rally into the Pass 1 Focus form, loops the video on just
 * that rally, and saves only that rally. Later scores are re-chained when
 * the winner changes; nothing else in the set is rewritten.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { cn } from '@/helpers/utils'
import { Button, Icon } from '@/ui-mine'
import {
  type VideoPlayerHandle,
  useVideoPlaybackStore,
  TransportCluster,
  VideoStageChrome,
  nudgePlaybackSpeed as nudgeSharedSpeed,
  SEEK_STEP_SECONDS as SHARED_SEEK_STEP,
} from '@/ui-mine/VideoPlayer'
import { matchDb, setDb, usePlayerStore, type DBMatch } from '@/data'
import { resolveSetVideo } from '@/data/services/videoAssetService'
import { resolveOpponentId, resolveOpponentName } from '@/helpers/themSide'
import {
  Pass1FocusBlock,
  SimpleTaggingMatrixBlock,
  SimpleTaggingModePickerBlock,
  snapPass1ShotIntoView,
} from '../blocks'
import { VideoPlayerSection } from '../sections'
import {
  canSaveRallyTimeline,
  contactTimesFromTimeline,
  derivePass1Stage,
  inferWinnerName,
  loopWindowFromContacts,
  markEnd,
  markFos,
  pass1SaveHint,
  setFos,
  shotLoopWindow,
  shotNumberAtTime,
  toggleEnding,
  toggleMissReason,
  toggleShotAttribute,
  toggleShotChoice,
  toggleShotReviewFlag,
  toPass1FocusMapperShot,
  type PointEnding,
  type PointMissReason,
  type RallyTimelineState,
  type ShotAttributeKey,
  type ShotChoiceKey,
} from './pass1FocusModel'
import {
  canSaveSimpleTagging,
  markEndSimple,
  markFosSimple,
  offensiveShotsFromTimeline,
  simpleSaveHint,
  toggleNoAttackSimple,
  toggleOffensiveShot,
  type SimpleMatrixRow,
} from './simpleTaggingModel'
import {
  loadRallyTaggingMode,
  saveRallyTaggingMode,
  type SessionTaggingMode,
} from '../helpers/taggingModePreference'
import {
  loadResumedPass1FocusState,
  updatePersistedPass1FocusRally,
  type ResumedCompletedRally,
} from './persistPass1FocusRally'

type Side = 'player1' | 'player2'

interface EditDraft {
  timeline: RallyTimelineState
  serverId: Side
  isHighlight: boolean
  offensiveShots: number[]
}

export interface RallyEditNotice {
  notice: string
}

export function RallyEditComposer() {
  const { matchId } = useParams<{ matchId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setNumber = Number(searchParams.get('set'))
  const rallyIndex = Number(searchParams.get('rally'))
  const shotParam = Number(searchParams.get('shot'))
  const fromParam = searchParams.get('from') // workon | rallies | clips
  const modeParam = searchParams.get('mode')
  const focusShot = Number.isFinite(shotParam) && shotParam > 0 ? shotParam : null

  const { players, load: loadPlayers } = usePlayerStore()
  const videoUrl = useVideoPlaybackStore((s) => s.videoUrl)
  const setVideoUrl = useVideoPlaybackStore((s) => s.setVideoUrl)
  const isPlaying = useVideoPlaybackStore((s) => s.isPlaying)
  const playbackSpeed = useVideoPlaybackStore((s) => s.playbackSpeed)
  const setPlaybackSpeed = useVideoPlaybackStore((s) => s.setPlaybackSpeed)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)

  const [match, setMatch] = useState<DBMatch | null>(null)
  const [setId, setSetId] = useState<string | null>(null)
  const [rallies, setRallies] = useState<ResumedCompletedRally[]>([])
  const [original, setOriginal] = useState<EditDraft | null>(null)
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedShot, setSelectedShot] = useState<number | null>(null)
  const [liveTime, setLiveTime] = useState(0)
  const [editMode, setEditMode] = useState<SessionTaggingMode>(
    modeParam === 'simple' ? 'simple' : 'pass1focus'
  )
  const [activeMatrixRow, setActiveMatrixRow] = useState<SimpleMatrixRow | null>(null)
  const [reviewDetailFocused, setReviewDetailFocused] = useState(false)
  const [loopScope, setLoopScope] = useState<'rally' | 'shot'>('rally')

  useEffect(() => {
    if (typeof selectedShot !== 'number') return
    snapPass1ShotIntoView(selectedShot)
  }, [selectedShot])

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  useEffect(() => {
    if (!matchId) return
    let active = true
    matchDb
      .getById(matchId)
      .then((row) => {
        if (!active) return
        if (!row) setLoadError('Match not found')
        setMatch(row ?? null)
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load match')
      })
    return () => {
      active = false
    }
  }, [matchId])

  const player1Name = match
    ? players.find((p) => p.id === match.player1_id)?.first_name || 'Hero'
    : 'Hero'
  const player2Name = match
    ? resolveOpponentName(
        match.player2_id,
        match.player2_id ? players.find((p) => p.id === match.player2_id)?.first_name : null
      )
    : 'Villain'
  const player1Id = match?.player1_id ?? ''
  const player2Id = resolveOpponentId(match?.player2_id)

  // Load the set's rallies once the match (and names) are known
  useEffect(() => {
    if (!match || !matchId || !setNumber) return
    let active = true
    const load = async () => {
      try {
        const sets = await setDb.getByMatchId(matchId)
        const target = sets.find((s) => s.set_number === setNumber)
        if (!target) throw new Error(`Set ${setNumber} not found`)
        const resumed = await loadResumedPass1FocusState({
          setId: target.id,
          player1Id,
          player2Id,
          player1Name,
          player2Name,
        })
        if (!active) return
        setSetId(target.id)
        setRallies(resumed.completed)
        const rally = resumed.completed.find((r) => r.rallyIndex === rallyIndex)
        if (!rally) throw new Error(`Rally ${rallyIndex} not found in set ${setNumber}`)
        const next: EditDraft = {
          timeline: rally.timeline,
          serverId: rally.serverId,
          isHighlight: rally.isHighlight,
          offensiveShots: offensiveShotsFromTimeline(rally.timeline),
        }
        setOriginal(next)
        setDraft(next)
        const savedMode =
          modeParam === 'simple' || modeParam === 'pass1focus'
            ? modeParam
            : loadRallyTaggingMode(rally.dbRallyId) ?? 'pass1focus'
        setEditMode(savedMode)

        const video = await resolveSetVideo(matchId, setNumber)
        if (active && video) setVideoUrl(video.url)
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load rally')
      }
    }
    load()
    return () => {
      active = false
    }
    // Names only label the summary; reload is keyed by ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, matchId, setNumber, rallyIndex, player1Id, player2Id, setVideoUrl])

  const current = rallies.find((r) => r.rallyIndex === rallyIndex) ?? null
  const position = current ? rallies.indexOf(current) : -1
  const prevRally = position > 0 ? rallies[position - 1] : null
  const nextRally = position >= 0 && position < rallies.length - 1 ? rallies[position + 1] : null

  const contactTimes = useMemo(
    () => (draft ? contactTimesFromTimeline(draft.timeline) : []),
    [draft]
  )
  const loop = useMemo(() => {
    if (contactTimes.length === 0) return null
    const duration = useVideoPlaybackStore.getState().duration
    return loopWindowFromContacts(contactTimes[0], contactTimes[contactTimes.length - 1], duration)
  }, [contactTimes])

  const rallyConstrained = useMemo(
    () =>
      loop
        ? { enabled: true, startTime: loop.startTime, endTime: loop.endTime, loopOnEnd: true }
        : { enabled: false, startTime: 0, endTime: 0, loopOnEnd: true },
    [loop]
  )
  const shotConstrained =
    editMode === 'simple' &&
    loopScope === 'shot' &&
    draft &&
    selectedShot !== null
      ? shotLoopWindow(draft.timeline, selectedShot, rallyConstrained)
      : null
  const constrainedPlayback = shotConstrained
    ? { ...rallyConstrained, ...shotConstrained }
    : rallyConstrained

  // Jump to the rally (or the flagged shot) whenever the video / rally / shot deep-link changes
  useEffect(() => {
    if (!videoUrl || !loop || !draft) return
    const contact = focusShot ? draft.timeline.shots[focusShot]?.contactTime : null
    const seekTo =
      typeof contact === 'number' && Number.isFinite(contact)
        ? Math.max(loop.startTime, contact - 1.5)
        : loop.startTime
    if (focusShot) {
      setSelectedShot(focusShot)
      snapPass1ShotIntoView(focusShot)
    }
    const t = setTimeout(() => {
      videoPlayerRef.current?.seek(seekTo, true)
      videoPlayerRef.current?.play()
    }, 150)
    return () => clearTimeout(t)
  }, [videoUrl, loop, draft, focusShot])

  useEffect(() => {
    if (!videoUrl) return
    let raf = 0
    const tick = () => {
      setLiveTime(videoPlayerRef.current?.getCurrentTime() ?? 0)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [videoUrl])

  const playersPair = useMemo(
    (): [string, string] => [player1Name, player2Name],
    [player1Name, player2Name]
  )
  const serverName = draft?.serverId === 'player2' ? player2Name : player1Name
  const winnerName = draft
    ? inferWinnerName(draft.timeline.end, draft.timeline.ending, playersPair, serverName)
    : null
  const originalWinner = original
    ? inferWinnerName(
        original.timeline.end,
        original.timeline.ending,
        playersPair,
        original.serverId === 'player2' ? player2Name : player1Name
      )
    : null
  const isDirty = JSON.stringify(draft) !== JSON.stringify(original)
  const canSave = Boolean(
    draft &&
      (editMode === 'simple'
        ? canSaveSimpleTagging(draft.timeline, winnerName)
        : canSaveRallyTimeline(draft.timeline, winnerName))
  )
  const saveHint = draft
    ? editMode === 'simple'
      ? simpleSaveHint(draft.timeline)
      : pass1SaveHint(draft.timeline)
    : null
  const winnerWillChange = Boolean(winnerName && originalWinner && winnerName !== originalWinner)
  // Incomplete rows may already look “complete” in the form but still need Save fix
  // to write framework_confirmed / ending back to the DB.
  const needsCompleteSave = Boolean(current?.isIncomplete && canSave)
  const saveEnabled = Boolean((isDirty || needsCompleteSave) && canSave && !saving)

  const patchTimeline = (fn: (s: RallyTimelineState) => RallyTimelineState) =>
    setDraft((d) => (d ? { ...d, timeline: fn(d.timeline) } : d))

  const backToReview = (notice?: string, opts?: { keepIncompleteFilter?: boolean }) => {
    useVideoPlaybackStore.getState().setVideoUrl(null)
    const tab =
      fromParam === 'workon' ? 'workon' : fromParam === 'clips' ? 'clips' : 'rallies'
    const q = new URLSearchParams({ tab })
    if (tab === 'rallies') {
      q.set('s', String(setNumber))
      if (opts?.keepIncompleteFilter || current?.isIncomplete) q.set('rf', 'incomplete')
    }
    navigate(`/matches/${matchId}?${q.toString()}`, {
      state: notice ? ({ notice } satisfies RallyEditNotice) : undefined,
    })
  }

  const confirmLeave = () =>
    !(isDirty || needsCompleteSave) ||
    window.confirm(
      needsCompleteSave && !isDirty
        ? 'This point is still incomplete — leave without Save fix?'
        : 'Discard your changes to this rally?'
    )

  const goToRally = (index: number) => {
    if (!confirmLeave()) return
    const q = new URLSearchParams({ set: String(setNumber), rally: String(index) })
    if (fromParam) q.set('from', fromParam)
    q.set('mode', editMode)
    navigate(`/matches/${matchId}/edit-rally?${q.toString()}`, { replace: true })
  }

  const handleEditModeChange = (mode: SessionTaggingMode) => {
    if (mode === editMode) return
    const ok = window.confirm(
      mode === 'simple'
        ? 'Switch this edit to Simple? Pass 1-only tags stay in memory until Save; Simple UI hides them.'
        : 'Switch this edit to Pass 1? You can add richer shot tags before Save.'
    )
    if (!ok) return
    setEditMode(mode)
  }

  const handleSave = async () => {
    if (!draft || !setId || !current || !canSave || saving) return
    if (!isDirty && !current.isIncomplete) return
    setSaving(true)
    try {
      const wasIncomplete = current.isIncomplete
      let timeline = draft.timeline
      if (editMode === 'simple') {
        const shots: RallyTimelineState['shots'] = {}
        for (const [key, shot] of Object.entries(timeline.shots)) {
          const mapped = toPass1FocusMapperShot(shot)
          shots[Number(key)] = {
            wing: null,
            stroke: null,
            standing: null,
            isHigh: false,
            isSafe: false,
            isPivot: false,
            reviewKind: mapped.reviewKind,
            contactTime: mapped.contactTime,
          }
        }
        timeline = { ...timeline, shots }
      }
      const result = await updatePersistedPass1FocusRally({
        setId,
        rallyId: current.dbRallyId,
        serverId: draft.serverId === 'player1' ? player1Id : player2Id,
        player1Id,
        player2Id,
        isHighlight: draft.isHighlight,
        timeline,
      })
      saveRallyTaggingMode(current.dbRallyId, editMode)
      const parts = [
        focusShot
          ? `Set ${setNumber} · rally ${rallyIndex} · shot ${focusShot} updated.`
          : wasIncomplete
            ? `Set ${setNumber} · rally ${rallyIndex} fixed — Incomplete badge cleared.`
            : `Set ${setNumber} · rally ${rallyIndex} updated.`,
      ]
      if (result.winnerChanged) {
        parts.push(
          `Winner changed — ${result.rescoredCount} later rall${result.rescoredCount === 1 ? 'y' : 'ies'} re-scored (set now ${result.finalScore.player1}–${result.finalScore.player2}).`
        )
      }
      backToReview(parts.join(' '), { keepIncompleteFilter: wasIncomplete })
    } catch (err) {
      console.error('[RallyEdit] Save failed:', err)
      alert(err instanceof Error ? err.message : 'Failed to save rally')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="h-dvh flex items-center justify-center bg-bg-surface p-4">
        <div className="max-w-md text-center bg-bg-card border border-neutral-700 rounded-lg p-8">
          <h2 className="text-xl font-semibold text-neutral-50 mb-2">Can’t open this rally</h2>
          <p className="text-sm text-neutral-400 mb-6">{loadError}</p>
          <Button onClick={() => navigate(matchId ? `/matches/${matchId}` : '/matches')}>
            Back to match review
          </Button>
        </div>
      </div>
    )
  }

  if (!draft || !current) {
    return (
      <div className="h-dvh flex items-center justify-center bg-bg-surface">
        <p className="text-neutral-400">Loading rally…</p>
      </div>
    )
  }

  const activeShot = videoUrl ? shotNumberAtTime(contactTimes, liveTime) : null
  const scoreBefore = position > 0
    ? `${rallies[position - 1].player1ScoreAfter}–${rallies[position - 1].player2ScoreAfter}`
    : null
  const pillBtn =
    'h-8 px-2.5 text-xs font-semibold rounded-md border border-neutral-600 text-neutral-200 hover:border-neutral-400 disabled:opacity-40 disabled:pointer-events-none'

  const handleSeekBy = (deltaSeconds: number) => {
    const t = videoPlayerRef.current?.getCurrentTime() ?? 0
    videoPlayerRef.current?.seek(t + deltaSeconds)
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-bg-surface overflow-hidden">
      <div className="relative shrink-0 w-full bg-black max-h-[45dvh] flex justify-center">
        <div className="relative w-full max-w-4xl aspect-video max-h-[45dvh]">
          <VideoStageChrome
            topLeft={
              editMode === 'simple' && draft ? (
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
            bottomOverlay={
              videoUrl ? (
                <TransportCluster
                  variant="overlay"
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  seekStepSeconds={SHARED_SEEK_STEP}
                  onTogglePlay={() => videoPlayerRef.current?.togglePlay()}
                  onSeekBy={handleSeekBy}
                  onNudgeSpeed={(dir) => setPlaybackSpeed(nudgeSharedSpeed(playbackSpeed, dir))}
                />
              ) : null
            }
          >
            <VideoPlayerSection
              ref={videoPlayerRef}
              videoUrl={videoUrl}
              onVideoSelect={setVideoUrl}
              constrainedPlayback={constrainedPlayback}
            />
          </VideoStageChrome>
        </div>
      </div>

      <div className="shrink-0 border-y border-neutral-700 bg-neutral-900 px-2 py-1.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => confirmLeave() && backToReview()}
          className={cn(pillBtn, 'flex items-center gap-1')}
        >
          <Icon name="arrow-left" size="xs" /> Review
        </button>
        <SimpleTaggingModePickerBlock
          mode={editMode}
          onSelect={handleEditModeChange}
        />
        <button
          type="button"
          aria-label="Previous rally"
          disabled={!prevRally}
          onClick={() => prevRally && goToRally(prevRally.rallyIndex)}
          className={pillBtn}
        >
          <Icon name="chevron-left" size="xs" />
        </button>
        <span className="text-xs text-neutral-300 px-1">
          <span className="font-semibold text-neutral-50">
            Set {setNumber} · Rally {rallyIndex}
          </span>
          <span className="text-neutral-500"> / {rallies.length}</span>
          {scoreBefore && <span className="ml-2 font-mono text-neutral-400">from {scoreBefore}</span>}
        </span>
        <button
          type="button"
          aria-label="Next rally"
          disabled={!nextRally}
          onClick={() => nextRally && goToRally(nextRally.rallyIndex)}
          className={pillBtn}
        >
          <Icon name="chevron-right" size="xs" />
        </button>

        <div className="flex items-center gap-1 ml-1" role="group" aria-label="Server">
          <span className="text-[11px] text-neutral-500 mr-0.5">Server</span>
          {(['player1', 'player2'] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={draft.serverId === side}
              onClick={() => setDraft((d) => (d ? { ...d, serverId: side } : d))}
              className={cn(
                'h-8 px-2 rounded-md text-xs font-semibold border truncate max-w-[6rem]',
                draft.serverId === side
                  ? 'bg-teal-700/50 border-teal-500 text-teal-100'
                  : 'border-neutral-600 text-neutral-400 hover:border-neutral-400'
              )}
            >
              {side === 'player1' ? player1Name : player2Name}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <button
          type="button"
          aria-pressed={draft.isHighlight}
          onClick={() => setDraft((d) => (d ? { ...d, isHighlight: !d.isHighlight } : d))}
          className={cn(
            pillBtn,
            'hidden sm:inline-flex',
            draft.isHighlight
              ? 'bg-amber-500/90 text-neutral-950 border-amber-400'
              : 'text-amber-200/90 border-amber-700/60'
          )}
        >
          ★ Highlight
        </button>
        <button
          type="button"
          disabled={!isDirty}
          onClick={() => {
            setDraft(original)
          }}
          className={cn(pillBtn, 'hidden sm:inline-flex')}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!saveEnabled}
          className={cn(
            pillBtn,
            'hidden sm:inline-flex border-teal-600/60 text-teal-300',
            saveEnabled && 'bg-teal-700/50 border-teal-500 text-teal-50'
          )}
        >
          {saving ? 'Saving…' : 'Save fix'}
        </button>
      </div>

      <div className="shrink-0 px-3 py-1.5 text-[11px] bg-neutral-950 text-neutral-400 flex flex-wrap gap-x-3">
        {current.isIncomplete && (
          <span className="text-amber-200 font-semibold" role="status">
            Incomplete point — set FA, End, and ending, then Save fix. Still out of stats until complete.
          </span>
        )}
        {focusShot && (
          <span className="text-review font-semibold">Editing shot {focusShot} — fix tags, then Save fix.</span>
        )}
        <span>
          Winner: <span className="text-neutral-100 font-semibold">{winnerName ?? '—'}</span>
        </span>
        {winnerWillChange && (
          <span className="text-amber-300">
            Winner changes from {originalWinner} — later scores in this set will shift.
          </span>
        )}
        {!videoUrl && <span>Load the set video above to watch this rally while editing.</span>}
        <span className="text-neutral-500">Contacts can’t be re-timed here — use the tagger for that.</span>
        {saveHint && !canSave && (
          <span className="text-amber-300/90 font-semibold" role="status">
            {saveHint}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-20 sm:pb-0">
        {editMode === 'simple' ? (
          <SimpleTaggingMatrixBlock
            state={draft.timeline}
            offensiveShots={draft.offensiveShots}
            players={playersPair}
            server={serverName}
            activeShot={activeShot}
            selectedShot={selectedShot}
            activeRow={activeMatrixRow}
            reviewDetailFocused={reviewDetailFocused}
            onSelectShot={setSelectedShot}
            onToggleOffensive={(n) => {
              setSelectedShot(n)
              setDraft((d) => {
                if (!d) return d
                const next = toggleOffensiveShot(d.timeline, d.offensiveShots, n)
                return {
                  ...d,
                  timeline: next.timeline,
                  offensiveShots: next.offensiveShots,
                }
              })
            }}
            onNoAttack={() => {
              setDraft((d) => {
                if (!d) return d
                const next = toggleNoAttackSimple(d.timeline, d.offensiveShots)
                return {
                  ...d,
                  timeline: next.timeline,
                  offensiveShots: next.offensiveShots,
                }
              })
            }}
            onMarkEnd={(n) => {
              setSelectedShot(n)
              setDraft((d) => {
                if (!d) return d
                const next = markEndSimple(d.timeline, d.offensiveShots, n)
                return {
                  ...d,
                  timeline: next.timeline,
                  offensiveShots: next.offensiveShots,
                }
              })
            }}
            onMarkFos={(n) => {
              setSelectedShot(n)
              setDraft((d) => {
                if (!d) return d
                const next = markFosSimple(d.timeline, d.offensiveShots, n)
                return {
                  ...d,
                  timeline: next.timeline,
                  offensiveShots: next.offensiveShots,
                }
              })
            }}
            onToggleReview={(n) =>
              patchTimeline((s) => toggleShotReviewFlag(s, n))
            }
            onToggleEnding={(value: PointEnding) =>
              patchTimeline((s) => toggleEnding(s, value))
            }
            onToggleMissReason={(value: PointMissReason) =>
              patchTimeline((s) => toggleMissReason(s, value))
            }
            onToggleShotChoice={(n, key, value) =>
              patchTimeline((s) => toggleShotChoice(s, n, key, value))
            }
            onToggleAttribute={(n, key) =>
              patchTimeline((s) => toggleShotAttribute(s, n, key))
            }
            onReviewDetailFocusChange={setReviewDetailFocused}
            onSelectRow={setActiveMatrixRow}
          />
        ) : (
          <Pass1FocusBlock
            state={draft.timeline}
            players={playersPair}
            server={serverName}
            activeShot={activeShot}
            selectedShot={selectedShot}
            onSelectShot={(n) => {
              const stage = derivePass1Stage(draft.timeline, {
                inForm: true,
                hasContacts: true,
              })
              if (stage === 'select_fa' && n >= 2 && draft.timeline.end !== 1) {
                const contact = draft.timeline.shots[n]?.contactTime ?? null
                patchTimeline((s) =>
                  markFos({ ...s, noFirstAttack: false, fos: null }, n, contact)
                )
                setSelectedShot(n)
                snapPass1ShotIntoView(n)
                return
              }
              setSelectedShot(n)
            }}
            onToggleShotChoice={(n: number, key: ShotChoiceKey, value: string) =>
              patchTimeline((s) => toggleShotChoice(s, n, key, value))
            }
            onToggleAttribute={(n: number, key: ShotAttributeKey) =>
              patchTimeline((s) => toggleShotAttribute(s, n, key))
            }
            onMarkFos={(at: number) => {
              if (at < 2) return
              setSelectedShot(at)
              // MA-70: mark / clear FA; No attack is a separate control
              patchTimeline((s) => {
                const contact = s.shots[at]?.contactTime ?? null
                if (s.fos === at) return markFos(s, at, contact)
                return markFos({ ...s, noFirstAttack: false, fos: null }, at, contact)
              })
              snapPass1ShotIntoView(at)
            }}
            onChangeFos={() => {}}
            onNoAttack={() => {
              patchTimeline((s) => setFos(s, null))
            }}
            onCancelFosPick={() => {}}
            onMarkEnd={(at: number) => {
              setSelectedShot(at)
              patchTimeline((s) => markEnd(s, at))
              snapPass1ShotIntoView(at)
            }}
            onToggleEnding={(value: PointEnding) => patchTimeline((s) => toggleEnding(s, value))}
            onToggleMissReason={(value: PointMissReason) =>
              patchTimeline((s) => toggleMissReason(s, value))
            }
            onToggleReviewFlag={(n: number) => patchTimeline((s) => toggleShotReviewFlag(s, n))}
            isHighlight={draft.isHighlight}
            onToggleHighlight={() =>
              setDraft((d) => (d ? { ...d, isHighlight: !d.isHighlight } : d))
            }
          />
        )}
      </div>

      {/* Phone-first sticky save strip */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-neutral-700 bg-bg-shell/95 px-3 py-2 backdrop-blur safe-area-pb">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            type="button"
            aria-pressed={draft.isHighlight}
            onClick={() => setDraft((d) => (d ? { ...d, isHighlight: !d.isHighlight } : d))}
            className={cn(
              'h-10 px-3 rounded-md text-sm font-semibold border',
              draft.isHighlight
                ? 'bg-amber-500/90 text-neutral-950 border-amber-400'
                : 'border-neutral-600 text-amber-200'
            )}
          >
            ★
          </button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={!isDirty}
            onClick={() => {
              setDraft(original)
            }}
          >
            Reset
          </Button>
          <Button
            className="flex-[1.4]"
            onClick={handleSave}
            disabled={!saveEnabled}
          >
            <Icon name={saving ? 'loader' : 'save'} size="sm" className={saving ? 'animate-spin' : undefined} />
            {saving ? 'Saving…' : 'Save fix'}
          </Button>
        </div>
      </div>
    </div>
  )
}
