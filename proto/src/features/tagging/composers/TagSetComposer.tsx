import { useEffect, useRef } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Icon, buttonKindControlSquare } from '@/ui-mine'
import { WfEmpty } from '@/ui-mine'
import { emptySet } from '@/rules/match'
import { useArchiveStep, useMatchRecord, useMatchStore } from '@/stores/matchStore'
import type { MatchRecord, SetData } from '@/types/match'
import { maxSetNumber } from '@/rules/matchOps'
import { deriveMarkState } from '@/rules/marks'
import { InputAreaSection } from '../sections/InputAreaSection'
import { RallyZoneSection } from '../sections/RallyZoneSection'
import { SetZoneSection } from '../sections/SetZoneSection'
import { BestTimingBlock } from '../blocks/BestTimingBlock'
import { useSettingsStore } from '@/stores/settingsStore'
import { useActionGuard } from '../hooks/useActionGuard'
import { useLandscape } from '../hooks/useLandscape'
import { useTagSetFlow } from '../hooks/useTagSetFlow'
import { useDeriveBestPanel } from '../derive/deriveBestPanel'
import { useDeriveInputArea } from '../derive/deriveInputArea'
import { useDeriveRallyZone } from '../derive/deriveRallyZone'
import { useDeriveSetZone } from '../derive/deriveSetZone'
import { useDeriveTagScreen } from '../derive/deriveTagScreen'
import { TAG_LOCK_LINE, useTagLock } from '../hooks/useTagLock'
import type { StartPick, TagLock } from '../models'
import { usePlayer } from '../hooks/usePlayer'
import { sceneAt } from '@/data/seed/script'
import { PictureSeekBlock } from '../blocks/PictureSeekBlock'
import { VideoSection } from '../sections/VideoSection'

/** Route entry: checks the set can be shown, then mounts the tagger per set. */
export function TagSetComposer({ matchId, setId }: { matchId: string; setId: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const match = useMatchRecord(matchId)
  const archiveStep = useArchiveStep(matchId)
  const lock = useTagLock(match, archiveStep)
  const n = Number(setId)
  // A set number not listed yet (a skipped set 1, say) can still be started. It is added on its first write.
  const set =
    match?.sets.find((s) => s.setId === n) ??
    (match && Number.isInteger(n) && n >= 1 && n <= maxSetNumber(match) ? emptySet(n) : undefined)
  const start = (location.state as { start?: StartPick } | null)?.start ?? null

  const stop = (title: string, body: string) => (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-3">
      <WfEmpty title={title} body={body} />
      <Button variant="secondary" onClick={() => navigate(`/matches/${matchId}/tag`)}>
        Back to Tag
      </Button>
    </div>
  )
  // No video, no Tag: the Tag page offers Add video.
  if (match && match.videos.length === 0) return <Navigate to={`/matches/${matchId}/tag`} replace />
  if (!match || !set) return stop('Unknown set', 'Back to the Tag checklist.')
  if (deriveMarkState(set) === 'off') return <Navigate to={`/matches/${matchId}/tag`} replace />
  if (lock && !set.finished) return stop(`Set ${set.setId} cannot be tagged`, TAG_LOCK_LINE[lock])

  const videoKey = match.videos.map((v) => v.id).join(',')
  return <TagSet key={`${match.id}:${set.setId}:${videoKey}`} match={match} set={set} lock={lock} initialStart={start} />
}

function TagSet({
  match,
  set,
  lock,
  initialStart,
}: {
  match: MatchRecord
  set: SetData
  lock: TagLock
  initialStart: StartPick | null
}) {
  const navigate = useNavigate()
  const mutateMatch = useMatchStore((s) => s.mutateMatch)
  const player = usePlayer(match.videos)
  const timing = useSettingsStore((s) => s.bestTiming)
  const setBestTiming = useSettingsStore((s) => s.setBestTiming)
  const landscape = useLandscape()
  const flow = useTagSetFlow({ match, set, lock, initialStart, player, mutateMatch, timing, navigate })
  const screen = useDeriveTagScreen({ flow, player })
  const {
    lastTap,
    gap,
    settingsOpen,
    setSettingsOpen,
    review,
    setReview,
    setReviewFocus,
    bestLook,
    setEndBack,
    editPick,
    names,
    reviewRef,
    tapGuardRef,
    editGuardRef,
    seekTo,
    onRate,
    pickAtTime,
    active,
    stage,
    viewedGap,
    endIndex,
    mode,
    bestSpan,
    reviewPlay,
    toast,
    setToast,
    hint,
    setHint,
  } = flow
  const {
    tapAction,
    tapped,
    showRemove,
    endKind,
    starShown,
    reviewDraftNow,
    seekSpan,
    seekSpans,
    openRange,
    shownScore,
    shownServer,
    setsWon,
    overCard,
    loopNow,
    flowShown,
    bestQ,
    bestAccount,
  } = screen
  useEffect(() => {
    if (bestQ?.step !== 'end') setEndBack(null)
  }, [bestQ?.step])
  const tapGuard = useActionGuard(tapAction)
  tapGuardRef.current = tapGuard
  const overGuard = useActionGuard(overCard ? 'shown' : 'shut')
  const editGuard = useActionGuard(editPick === null ? 'shut' : editPick.kind)
  editGuardRef.current = editGuard
  const removeGuard = useActionGuard(showRemove ? `remove:${endIndex}` : 'off')
  const endNoted = useRef<string | null>(null)
  useEffect(() => {
    if (endKind === endNoted.current) return
    endNoted.current = endKind
    if (endKind === 'video') setHint('End of video')
    else if (endKind === 'mark') setHint('End of the marked set')
  }, [endKind])
  const removeNoted = useRef<number | null>(null)
  useEffect(() => {
    if (!showRemove) {
      removeNoted.current = null
      return
    }
    if (removeNoted.current === endIndex) return
    removeNoted.current = endIndex
    setToast({ text: `Set won at rally ${endIndex + 1}` })
  }, [showRemove, endIndex])

  const panel = useDeriveBestPanel({ flow, screen, tapGuard })
  useEffect(() => {
    if (!review || starShown) return
    reviewRef.current = false
    reviewPlay.current = null
    setReview(false)
    setReviewFocus(null)
  }, [review, starShown])
  const area = useDeriveInputArea({ flow, screen, panel, tapGuard, overGuard, editGuard, removeGuard })
  const rallyZone = useDeriveRallyZone({ flow, screen, player, landscape })
  const setZone = useDeriveSetZone({ flow, screen })

  return (
    <div
      className="tag-set bg-bg-app"
      data-pad-split={landscape ? '' : undefined}
      data-tag-mode={mode}
      data-flow={flowShown}
      data-best-look={bestLook ? '' : undefined}
      data-review={reviewDraftNow ? '' : undefined}
      data-tag-stage={stage ?? ''}
      data-playing={player.playing}
      data-rate={player.rate}
      data-time={player.time}
      data-best-a={bestSpan ? bestSpan.a.toFixed(3) : ''}
      data-best-b={bestSpan ? bestSpan.b.toFixed(3) : ''}
      data-contacts={active?.contacts.join(',') ?? ''}
      data-best-hitters={bestAccount?.hitters ?? ''}
      data-best-winner={bestAccount?.winner ?? ''}
      data-best-score={bestAccount?.score ?? ''}
      data-best-next={bestAccount?.next ?? ''}
      data-loop-a={loopNow ? loopNow.a.toFixed(3) : ''}
      data-loop-b={loopNow ? loopNow.b.toFixed(3) : ''}
      data-fa={active?.fa ?? ''}
      data-no-attack={active?.noAttack ? 'yes' : 'no'}
    >
      {landscape ? (
        <div className="pad-wing" data-pad-wing="left">
          <InputAreaSection regions={area.regions} column={1} attrs={area.attrs} />
        </div>
      ) : null}
      <div className="tag-flow">
      <div className="tag-media">
        <VideoSection
          sceneAt={sceneAt}
          player={player}
          videos={match.videos}
          names={names}
          bug={{ sets: setsWon, points: shownScore, server: shownServer, setId: set.setId }}
          hint={hint}
          toast={toast}
          onSeek={seekTo}
          noForward={mode === 'tapping'}
          onRate={onRate}
          leading={
            <Link
              to={`/matches/${match.id}/tag?from=${set.setId}`}
              aria-label="Back"
              className={`${buttonKindControlSquare} inline-flex items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80`}
            >
              <Icon name="chevron-left" size="sm" />
            </Link>
          }
          settings={
            <BestTimingBlock
                timing={timing}
                onChange={setBestTiming}
                open={settingsOpen}
                onOpen={setSettingsOpen}
              />
          }
          seek={
            <PictureSeekBlock
              span={seekSpan}
              time={player.time}
              spans={seekSpans}
              band={
                viewedGap
                  ? { a: viewedGap.a, b: viewedGap.b }
                  : openRange
                    ? { a: openRange.a, b: openRange.b }
                    : null
              }
              onSeek={seekTo}
              onPick={editPick && !gap ? pickAtTime : undefined}
            />
          }
        />
      </div>
      <SetZoneSection {...setZone} />

      <div className="tag-rally">
        {tapped > 0 && lastTap !== null ? (
          <span
            key={lastTap}
            aria-hidden
            data-shot-timer=""
            className="tag-idle-bar pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-1.5 bg-brand-primary/50"
          />
        ) : null}
        <RallyZoneSection {...rallyZone} />
      </div>

      {landscape ? null : <InputAreaSection regions={area.regions} attrs={area.attrs} />}
      </div>
      {landscape ? (
        <div className="pad-wing" data-pad-wing="right">
          <InputAreaSection regions={area.regions} column={2} />
        </div>
      ) : null}
    </div>
  )
}

