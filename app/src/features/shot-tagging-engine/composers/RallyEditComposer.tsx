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
import { type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { matchDb, setDb, usePlayerStore, type DBMatch } from '@/data'
import { resolveSetVideo } from '@/data/services/videoAssetService'
import { resolveOpponentId, resolveOpponentName } from '@/helpers/themSide'
import { Pass1FocusBlock } from '../blocks'
import { VideoPlayerSection } from '../sections'
import {
  canSaveRallyTimeline,
  contactTimesFromTimeline,
  inferWinnerName,
  loopWindowFromContacts,
  markEnd,
  setFos,
  shotNumberAtTime,
  toggleEnding,
  toggleMissReason,
  toggleShotAttribute,
  toggleShotChoice,
  toggleShotReviewKind,
  toggleShotReviewFlag,
  type PointEnding,
  type PointMissReason,
  type RallyTimelineState,
  type ShotAttributeKey,
  type ShotChoiceKey,
  type ShotReviewKind,
} from './pass1FocusModel'
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

  const { players, load: loadPlayers } = usePlayerStore()
  const videoUrl = useVideoPlaybackStore((s) => s.videoUrl)
  const setVideoUrl = useVideoPlaybackStore((s) => s.setVideoUrl)
  const isPlaying = useVideoPlaybackStore((s) => s.isPlaying)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)

  const [match, setMatch] = useState<DBMatch | null>(null)
  const [setId, setSetId] = useState<string | null>(null)
  const [rallies, setRallies] = useState<ResumedCompletedRally[]>([])
  const [original, setOriginal] = useState<EditDraft | null>(null)
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fosPickMode, setFosPickMode] = useState(false)
  const [selectedShot, setSelectedShot] = useState<number | null>(null)
  const [liveTime, setLiveTime] = useState(0)

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
    ? players.find((p) => p.id === match.player1_id)?.first_name || 'Player 1'
    : 'Player 1'
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
        }
        setOriginal(next)
        setDraft(next)
        setFosPickMode(false)

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

  const constrainedPlayback = useMemo(
    () =>
      loop
        ? { enabled: true, startTime: loop.startTime, endTime: loop.endTime, loopOnEnd: true }
        : { enabled: false, startTime: 0, endTime: 0, loopOnEnd: true },
    [loop]
  )

  // Jump to the rally whenever the video or the rally changes
  useEffect(() => {
    if (!videoUrl || !loop) return
    const t = setTimeout(() => {
      videoPlayerRef.current?.seek(loop.startTime, true)
      videoPlayerRef.current?.play()
    }, 150)
    return () => clearTimeout(t)
  }, [videoUrl, loop])

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
  const canSave = Boolean(draft && canSaveRallyTimeline(draft.timeline, winnerName))
  const winnerWillChange = Boolean(winnerName && originalWinner && winnerName !== originalWinner)

  const patchTimeline = (fn: (s: RallyTimelineState) => RallyTimelineState) =>
    setDraft((d) => (d ? { ...d, timeline: fn(d.timeline) } : d))

  const backToReview = (notice?: string) => {
    useVideoPlaybackStore.getState().setVideoUrl(null)
    navigate(`/matches/${matchId}?tab=rallies&s=${setNumber}`, {
      state: notice ? ({ notice } satisfies RallyEditNotice) : undefined,
    })
  }

  const confirmLeave = () =>
    !isDirty || window.confirm('Discard your changes to this rally?')

  const goToRally = (index: number) => {
    if (!confirmLeave()) return
    navigate(`/matches/${matchId}/edit-rally?set=${setNumber}&rally=${index}`, { replace: true })
  }

  const handleSave = async () => {
    if (!draft || !setId || !current || !canSave || saving) return
    setSaving(true)
    try {
      const result = await updatePersistedPass1FocusRally({
        setId,
        rallyId: current.dbRallyId,
        serverId: draft.serverId === 'player1' ? player1Id : player2Id,
        player1Id,
        player2Id,
        isHighlight: draft.isHighlight,
        timeline: draft.timeline,
      })
      const parts = [`Set ${setNumber} · rally ${rallyIndex} saved.`]
      if (result.winnerChanged) {
        parts.push(
          `Winner changed — ${result.rescoredCount} later rall${result.rescoredCount === 1 ? 'y' : 'ies'} re-scored (set now ${result.finalScore.player1}–${result.finalScore.player2}).`
        )
      }
      backToReview(parts.join(' '))
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

  return (
    <div className="fixed inset-0 flex flex-col bg-bg-surface overflow-hidden">
      <div className="relative shrink-0 w-full bg-black max-h-[45dvh] flex justify-center">
        <div className="relative w-full max-w-4xl aspect-video max-h-[45dvh]">
          <VideoPlayerSection
            ref={videoPlayerRef}
            videoUrl={videoUrl}
            onVideoSelect={setVideoUrl}
            constrainedPlayback={constrainedPlayback}
          />
          {videoUrl && (
            <button
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={() => videoPlayerRef.current?.togglePlay()}
              className="absolute bottom-3 right-3 z-30 h-11 w-11 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/25"
            >
              <Icon name={isPlaying ? 'pause' : 'play'} className="w-5 h-5" />
            </button>
          )}
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
            setFosPickMode(false)
          }}
          className={pillBtn}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || !canSave || saving}
          className={cn(
            pillBtn,
            'border-teal-600/60 text-teal-300',
            isDirty && canSave && 'bg-teal-700/50 border-teal-500 text-teal-50'
          )}
        >
          {saving ? 'Saving…' : 'Save rally'}
        </button>
      </div>

      <div className="shrink-0 px-3 py-1.5 text-[11px] bg-neutral-950 text-neutral-400 flex flex-wrap gap-x-3">
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
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <Pass1FocusBlock
          state={draft.timeline}
          players={playersPair}
          server={serverName}
          activeShot={activeShot}
          selectedShot={selectedShot}
          onSelectShot={setSelectedShot}
          fosPickMode={fosPickMode}
          onToggleShotChoice={(n: number, key: ShotChoiceKey, value: string) =>
            patchTimeline((s) => toggleShotChoice(s, n, key, value))
          }
          onToggleAttribute={(n: number, key: ShotAttributeKey) =>
            patchTimeline((s) => toggleShotAttribute(s, n, key))
          }
          onMarkFos={(at: number) => {
            if (at < 2) return
            patchTimeline((s) => setFos(s, at, s.shots[at]?.contactTime ?? null))
            setFosPickMode(false)
          }}
          onChangeFos={() => setFosPickMode(true)}
          onNoAttack={() => {
            patchTimeline((s) => setFos(s, null))
            setFosPickMode(false)
          }}
          onCancelFosPick={() => setFosPickMode(false)}
          onMarkEnd={(at: number) => patchTimeline((s) => markEnd(s, at))}
          onToggleEnding={(value: PointEnding) => patchTimeline((s) => toggleEnding(s, value))}
          onToggleMissReason={(value: PointMissReason) =>
            patchTimeline((s) => toggleMissReason(s, value))
          }
          onToggleReviewKind={(n: number, value: ShotReviewKind) =>
            patchTimeline((s) => toggleShotReviewKind(s, n, value))
          }
          onToggleReviewFlag={(n: number) => patchTimeline((s) => toggleShotReviewFlag(s, n))}
        />
      </div>
    </div>
  )
}
