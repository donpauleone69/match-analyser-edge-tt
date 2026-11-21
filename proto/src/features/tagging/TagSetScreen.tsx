import { useEffect, useMemo, useRef } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { WfEmpty } from '@/layout/Wireframe'
import { emptySet, formatScore, calculateMatchSetsWon } from '@/rules/match'
import { useMatchRecord, useMatchStore } from '@/stores/matchStore'
import type { MatchRecord, SetData } from '@/types/match'
import type { Side } from '@/types/rally'
import { serveBands, expectedServer } from '@/rules/continuity'
import { gapFitsRally, maxSetNumber } from '@/rules/matchOps'
import { markState } from '@/rules/marks'
import { rallyEnd, rallyStart, winnerOf } from '@/rules/rally'
import { countPoints } from '@/rules/score'
import { bestPadRegions, editRallyRegions } from './derive/deriveBestPanel'
import { InputAreaSection } from './sections/InputAreaSection'
import { tagRegions } from './derive/deriveInputArea'
import { RallyZoneSection } from './sections/RallyZoneSection'
import type { RallyState } from './models'
import { SetZoneSection } from './sections/SetZoneSection'
import { BestTimingBlock } from './blocks/BestTimingBlock'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  bestAt,
  bestHitters,
  PART_LABEL,
  partsOf,
  pointDone,
  setDepth,
  setWingStroke,
  type BestAt,
} from '@/rules/bestFa'
import { useActionGuard, type ActionGuard } from './hooks/useActionGuard'
import { useLandscape } from './hooks/useLandscape'
import { useTagSetFlow } from './hooks/useTagSetFlow'
import { TAG_LOCK_LINE, useTagLock } from './hooks/useTagLock'
import type { FlowName, StartPick, TagLock } from './models'
import { firstContactG, lastContactG, segmentsOf } from '@/rules/timeline'
import { usePlayer } from './hooks/usePlayer'
import { sceneAt } from '@/data/seed/script'
import { PictureSeekBlock } from './blocks/PictureSeekBlock'
import { VideoSection } from './sections/VideoSection'

/** Route entry: checks the set can be shown, then mounts the tagger per set. */
export function TagSetScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { matchId = '', setId = '1' } = useParams()
  const match = useMatchRecord(matchId)
  const lock = useTagLock(matchId, match)
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
  if (markState(set) === 'off') return <Navigate to={`/matches/${matchId}/tag`} replace />
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
  const {
    selected,
    tight,
    lastTap,
    boundNote,
    gap,
    flowLock,
    settingsOpen,
    setSettingsOpen,
    review,
    setReview,
    reviewFocus,
    setReviewFocus,
    bestLook,
    shotEdit,
    endBack,
    setEndBack,
    bestSaved,
    editPick,
    editOf,
    flowWanted,
    names,
    reviewRef,
    shotGuard,
    tapGuardRef,
    editGuardRef,
    seekTo,
    onRate,
    onPad,
    stepShot,
    onShotDelete,
    onShotKim,
    onShotOut,
    keepShot,
    onShotEnd,
    onShotPoint,
    onDiscardProgress,
    flipKind,
    pickable,
    onEditSet,
    stepList,
    stepAt,
    onPickEdit,
    stepPick,
    onGapSlot,
    cancelInsert,
    pickAtTime,
    onDeletePicked,
    cancelEdit,
    onOverEdit,
    onDropAfter,
    onOverrunEdit,
    pickDraft,
    onBestServer,
    onNotAShot,
    onBestEnd,
    onBestPoint,
    onBestStroke,
    onBestServe,
    reviewDraft,
    onReviewStar,
    stepReview,
    jumpReview,
    onReviewMark,
    onAddRally,
    readyToFinish,
    onFinishSet,
    editFromRallyZone,
    switchInsertServer,
    reviewPill,
    stops,
    live,
    readOnly,
    active,
    stage,
    inserting,
    bestOn,
    score,
    nextServer,
    bounds,
    pickedId,
    viewedGap,
    running,
    endIndex,
    overrun,
    saveEarly,
    mode,
    editIndex,
    bestRowSaved,
    bestSpan,
    reviewPlay,
    offsetOf,
    windowFor,
    toast,
    setToast,
    hint,
    setHint,
  } = useTagSetFlow({ match, set, lock, initialStart, player, mutateMatch, timing, navigate })

  const seekSeg = player.segs[player.segIndex]
  const seekSpan = bounds
    ? { a: bounds.start, b: Math.max(bounds.end, bounds.start + 0.001) }
    : seekSeg
      ? { a: seekSeg.offset, b: seekSeg.offset + seekSeg.duration }
      : { a: 0, b: 1 }
  const seekSpans = useMemo(() => {
    const all = segmentsOf(match.videos)
    const rallies = set.rallies.flatMap((r) => {
      if (r.point) return []
      const a = firstContactG(all, r)
      const b = lastContactG(all, r)
      if (a === null || b === null) return []
      return [{ a, b, on: pickedId === r.id }]
    })
    const likely = stops.gaps.filter((g) => g.likely).map((g) => ({ a: g.a, b: g.b, likely: true as const }))
    return [...likely, ...rallies]
  }, [match.videos, set.rallies, pickedId, stops.gaps])

  const openRange = active
    ? {
        a: offsetOf(active.videoId) + (active.closed ? rallyStart(active) : (active.contacts[0] ?? 0)),
        b:
          offsetOf(active.videoId) +
          (active.closed ? rallyEnd(active) : (active.contacts[active.contacts.length - 1] ?? 0)),
        ticks: active.contacts.map((c) => offsetOf(active.videoId) + c),
      }
    : null

  const shownScore = score
  const serverKnown = set.rallies.length > 0 || Boolean(live?.serveChecked)
  const shownServer = !serverKnown ? null : (live?.server ?? nextServer)
  const setsWon = calculateMatchSetsWon(match)
  const atEnd = player.atEnd && (mode === 'watch' || mode === 'setPoint')
  const tapped = live && !live.closed ? live.contacts.length : 0
  /** Set over: Edit and Save set, as soon as the winning rally is saved. */
  const overCard = mode === 'setPoint'
  /** When the video runs out before the set is won, Finish is offered in the panel. */
  const finishCard = readyToFinish && atEnd && mode !== 'setPoint'
  const loopNow =
    active && stage && mode === 'tagging' ? windowFor(active, selected, stage, tight) : null
  const shotAt = !shotEdit
    ? -1
    : shotEdit.rallyId
      ? set.rallies.findIndex((r) => r.id === shotEdit.rallyId)
      : set.rallies.length
  // The tap zone while a rally is open or waiting. Answering keeps the corner pad.
  const zoneOn =
    !bestOn &&
    !overCard &&
    (mode === 'tapping' || (mode === 'watch' && !atEnd) || (inserting && mode === 'edit'))
  const padTitle = tapped > 0
      ? `Tap shot ${tapped + 1}`
      : player.playing
        ? 'Tap serve'
        : 'Play'
  const zoneTitle = padTitle

  const flowShown: FlowName = mode === 'tagging' && flowLock ? flowLock : flowWanted
  const bestRallyOne = inserting ? gap?.index === 0 : set.rallies.length === 0
  const bestQ: BestAt | null = bestOn && live ? bestAt(live, bestRallyOne) : null
  useEffect(() => {
    if (bestQ?.step !== 'end') setEndBack(null)
  }, [bestQ?.step])
  const bestRowDraft = bestRowSaved ? bestSaved!.draft : active
  const scoreBefore = (index: number) => formatScore(countPoints(set.rallies.slice(0, Math.max(0, index)).map((r) => r.winner)))
  const savedIndex = bestSaved ? set.rallies.findIndex((r) => r.id === bestSaved.rallyId) : -1
  const rowDraft = shotEdit && live ? live : (pickDraft ?? bestRowDraft)
  const gapServer = viewedGap ? expectedServer(set.rallies, set.firstServer, viewedGap.index) : nextServer
  const insertingBare = Boolean(gap && (!live || live.contacts.length === 0))
  const rallyState: RallyState = shotEdit
    ? 'editing'
    : insertingBare
        ? 'insert'
        : viewedGap && mode === 'edit'
          ? 'gap'
          : live && !live.closed && live.contacts.length > 0
            ? 'tapping'
            : bestOn
              ? 'answering'
              : pickDraft || bestRowSaved
                ? 'saved'
                : 'before'
  const rallyNo =
    shotEdit && shotAt >= 0
      ? shotAt + 1
      : pickDraft || editOf
        ? Math.max(1, editIndex + 1)
        : rallyState === 'gap' && viewedGap
          ? viewedGap.n
          : rallyState === 'insert' && gap
            ? gap.index + 1
            : bestRowSaved && savedIndex >= 0
              ? savedIndex + 1
              : set.rallies.length + 1
  const rallyScoreAt =
    rallyState === 'gap'
      ? (viewedGap?.index ?? 0)
      : rallyState === 'insert'
        ? (gap?.index ?? 0)
        : shotEdit && shotEdit.rallyId && shotAt >= 0
          ? shotAt
          : pickDraft && editIndex >= 0
            ? editIndex
            : bestRowSaved && savedIndex >= 0
              ? savedIndex
              : set.rallies.length
  const awaitServer = bestRallyOne && !pickDraft && !live?.serveChecked
  const rallyServer: Side | null = awaitServer
    ? null
    : rallyState === 'gap'
      ? gapServer
      : (rowDraft?.server ?? nextServer)
  const rallyWord =
    rallyState === 'gap' && viewedGap
      ? viewedGap.overlap
        ? 'Gap, overlap'
        : `Gap ${Math.round(viewedGap.b - viewedGap.a)} s`
      : gap
        ? 'Insert'
        : null
  /** The star is for a saved rally. It stays hidden while questions are open, and while Edit Rally was opened from a question. */
  const starBase = rallyState === 'saved' || (rallyState === 'editing' && Boolean(shotEdit?.rallyId))
  const bestAccount = (() => {
    if (!live || live.contacts.length === 0) return null
    const winner = pointDone(live, bestRallyOne) ? winnerOf(live) : null
    return {
      hitters: bestHitters(live).join(','),
      winner: winner ?? '',
      score: `${score.me}-${score.them}`,
      next: '',
    }
  })()
  /** Settings sits over part of the screen. Taps on the zone and wings wait. */
  const coverTaps = settingsOpen
  // One guard per place a finger rests. The action is what that place does now.
  const tapAction = bestOn
    ? 'questions'
    : mode === 'edit'
      ? 'edit'
      : mode === 'tapping' || inserting || (mode === 'watch' && (tapped > 0 || player.playing))
        ? 'tapping'
        : 'idle'
  const tapGuard = useActionGuard(tapAction)
  tapGuardRef.current = tapGuard
  const overGuard = useActionGuard(overCard ? 'shown' : 'shut')
  const editGuard = useActionGuard(editPick === null ? 'shut' : editPick.kind)
  editGuardRef.current = editGuard
  const guarded = (guard: ActionGuard, fn: () => void) => () => {
    if (!guard.allow()) return
    fn()
  }
  const showRemove = overrun && !live && !set.finished && mode !== 'edit'
  const removeGuard = useActionGuard(showRemove ? `remove:${endIndex}` : 'off')
  const endKind = finishCard ? 'video' : boundNote && mode !== 'setPoint' && mode !== 'edit' && !set.finished ? 'mark' : null
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

  const bestRegions =
    bestOn && live?.best && bestQ && live.contacts.length > 0
      ? bestPadRegions({
          draft: live,
          names,
          at: bestQ,
          rallyOne: bestRallyOne,
          back: endBack,
          dim: tapGuard.waiting || coverTaps,
          notShotDim: shotGuard.waiting,
          onServer: onBestServer,
          onEnd: onBestEnd,
          onPoint: onBestPoint,
          onNotShot: onNotAShot,
          onServe: onBestServe,
          onStroke: onBestStroke,
        })
      : []
  const editRegions =
    shotEdit && live && live.contacts.length > 0
      ? editRallyRegions({
          draft: live,
          names,
          stop: shotEdit.stop,
          rallyOne: shotAt <= 0,
          breakRally:
            shotAt >= 0 && serveBands(set.rallies, set.firstServer).some((band) => band.breaks[0] === shotAt),
          dim: shotGuard.waiting || readOnly,
          onBack: () => stepShot(-1),
          onForward: () => stepShot(1),
          onDelete: onShotDelete,
          onKim: onShotKim,
          onOut: onShotOut,
          onServe: (depth, wing) => keepShot(setDepth(live, depth, wing)),
          onStroke: (shot, wing, stroke) => keepShot(setWingStroke(live, shot, wing, stroke)),
          onEnd: onShotEnd,
          onPointTo: onShotPoint,
        })
      : []
  /** The end pad is on screen. The Rally Zone is Before serve, the next rally, not the last one. */
  const atEndPad = Boolean(
    readyToFinish &&
      !shotEdit &&
      !bestOn &&
      mode !== 'edit' &&
      mode !== 'setPoint' &&
      !showRemove &&
      (atEnd || boundNote) &&
      !set.finished,
  )
  const starShown = starBase && !atEndPad
  const reviewDraftNow = review && starShown ? reviewDraft() : null
  /** Just saved, set not won: the head already reads the next rally, its server and the new score. */
  const nextHead =
    rallyState === 'saved' &&
    bestRowSaved &&
    !pickDraft &&
    !reviewDraftNow &&
    mode !== 'setPoint' &&
    !set.finished &&
    !overrun
  const reviewParts = reviewDraftNow ? partsOf(reviewDraftNow) : []
  const reviewMarked = Boolean(reviewFocus && reviewDraftNow?.best?.review?.includes(reviewFocus))
  useEffect(() => {
    if (!review || starShown) return
    reviewRef.current = false
    reviewPlay.current = null
    setReview(false)
    setReviewFocus(null)
  }, [review, starShown])
  const area = tagRegions({
    mode,
    bestOn,
    bestQ,
    best: bestRegions,
    shotEdit: Boolean(shotEdit),
    editRally: editRegions,
    editStop: shotEdit ? (shotEdit.stop === 'end' ? 'end' : String(shotEdit.stop)) : '',
    zoneOn,
    padTitle: zoneTitle,
    tapDim: tapGuard.waiting || coverTaps,
    overDim: overGuard.waiting || readOnly,
    removeDim: removeGuard.waiting || readOnly,
    showRemove,
    removeAfter: endIndex + 1,
    removeLast: set.rallies.length,
    endPad: Boolean(
      !showRemove &&
        (finishCard || (readyToFinish && boundNote && mode !== 'setPoint' && mode !== 'edit' && !set.finished)),
    ),
    saveEarly,
    saveLabel: `Save at ${formatScore(running)}`,
    onOverrunEdit: guarded(removeGuard, onOverrunEdit),
    editing: mode === 'edit' && editPick !== null && !gap,
    editKind: editPick?.kind ?? null,
    editName: editPick?.kind === 'gap' ? String(viewedGap?.n ?? '') : String(editIndex + 1),
    rallyOn: editPick?.kind !== 'gap',
    saveOn: readyToFinish,
    saveDim: tapGuard.waiting || editGuard.waiting || readOnly,
    backDim: stepAt <= 0,
    forwardDim: stepAt >= stepList.length - 1,
    insertDim: readOnly || editGuard.waiting || Boolean(viewedGap && !gapFitsRally(viewedGap)),
    onPad: guarded(tapGuard, onPad),
    onFinish: () => {
      if (mode === 'setPoint' && !overGuard.allow()) return
      onFinishSet()
    },
    onOverEdit: guarded(overGuard, onOverEdit),
    onRemove: guarded(removeGuard, onDropAfter),
    onRallies: () => flipKind('rally'),
    onGaps: () => flipKind('gap'),
    onBack: () => stepPick(-1),
    onForward: () => stepPick(1),
    onEditRally: guarded(editGuard, onPickEdit),
    onDeleteRally: guarded(editGuard, onDeletePicked),
    onInsert: guarded(editGuard, () => {
      if (viewedGap) onAddRally(viewedGap.index)
    }),
    review: Boolean(reviewDraftNow),
    reviewPart: reviewFocus ? PART_LABEL[reviewFocus] : '',
    reviewMarked,
    reviewBackDim: reviewParts.length < 2,
    reviewForwardDim: reviewParts.length < 2,
    onReviewBack: () => stepReview(-1),
    onReviewForward: () => stepReview(1),
    onReviewMark,
  })

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
              className="btn-kind-control btn-kind-square inline-flex items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
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
      <SetZoneSection
        rallies={set.rallies}
        picked={pickedId}
        gaps={editPick?.kind === 'gap' ? stops.gaps : null}
        pickedGap={editPick?.kind === 'gap' ? editPick.index : null}
        open={
          editPick !== null || set.finished || mode === 'setPoint'
            ? null
            : { n: set.rallies.length + 1, server: serverKnown ? nextServer : null }
        }
        insert={
          gap && editPick?.kind === 'gap'
            ? { index: gap.index, n: gap.index + 1, server: nextServer }
            : null
        }
        serveBreaks={serveBands(set.rallies, set.firstServer).map((b) => b.breaks[0])}
        onGap={onGapSlot}
        onRally={reviewDraftNow ? reviewPill : undefined}
        editing={editPick !== null}
        dim={pickable.length === 0}
        onEdit={onEditSet}
      />

      <div className="tag-rally">
        {tapped > 0 && lastTap !== null ? (
          <span
            key={lastTap}
            aria-hidden
            data-shot-timer=""
            className="tag-idle-bar pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-1.5 bg-brand-primary/50"
          />
        ) : null}
        <RallyZoneSection
          state={atEndPad ? 'before' : reviewDraftNow ? 'review' : rallyState}
          draft={atEndPad ? null : rowDraft}
          at={atEndPad || pickDraft || shotEdit ? null : bestQ}
          rallyOne={atEndPad ? false : pickDraft || editOf ? false : bestRowSaved ? savedIndex <= 0 : bestRallyOne}
          saved={atEndPad ? false : shotEdit ? Boolean(shotEdit.rallyId) : pickDraft ? true : bestRowSaved}
          focus={shotEdit ? shotEdit.stop : null}
          flash={
            shotEdit && active && typeof shotEdit.stop === 'number'
              ? Math.abs((active.contacts[shotEdit.stop - 1] ?? -1) - (player.time - offsetOf(active.videoId))) < 0.2
                ? shotEdit.stop - 1
                : -1
              : -1
          }
          rallyNo={atEndPad || nextHead ? set.rallies.length + 1 : rallyNo}
          headDashed={nextHead}
          names={names}
          server={atEndPad || nextHead ? nextServer : rallyServer}
          score={atEndPad || nextHead ? scoreBefore(set.rallies.length) : scoreBefore(rallyScoreAt)}
          word={atEndPad ? null : rallyWord}
          tight={landscape}
          pressed={rallyState === 'editing'}
          reviewFocus={reviewFocus}
          onReviewPart={reviewDraftNow ? jumpReview : undefined}
          onEdit={
            !atEndPad && (rallyState === 'saved' || rallyState === 'editing') ? editFromRallyZone : undefined
          }
          onStar={starShown ? onReviewStar : undefined}
          onDiscard={
            atEndPad
              ? undefined
              : editOf && live
                ? cancelEdit
                : !readOnly && !bestRowSaved && live && live.contacts.length > 0
                  ? onDiscardProgress
                  : undefined
          }
          onCancel={insertingBare ? cancelInsert : undefined}
          onServer={insertingBare && gap && gap.index !== 0 ? switchInsertServer : undefined}
        />
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

