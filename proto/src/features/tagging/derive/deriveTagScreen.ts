import { useMemo } from 'react'
import { formatScore, calculateMatchSetsWon } from '@/rules/match'
import { expectedServer } from '@/rules/continuity'
import { rallyEnd, rallyStart, winnerOf } from '@/rules/rally'
import { countPoints } from '@/rules/score'
import { bestAt, bestHitters, partsOf, pointDone, type BestAt } from '@/rules/bestFa'
import { firstContactG, lastContactG, segmentsOf } from '@/rules/timeline'
import type { Side } from '@/types/rally'
import type { Player } from '../hooks/usePlayer'
import type { TagSetFlow } from '../hooks/useTagSetFlow'
import type { FlowName, RallyState } from '../models'

export function useDeriveTagScreen({
  flow,
  player,
}: {
  flow: TagSetFlow
  player: Player
}) {
  const {
    match,
    set,
    selected,
    tight,
    boundNote,
    gap,
    flowLock,
    settingsOpen,
    review,
    reviewFocus,
    shotEdit,
    bestSaved,
    editOf,
    flowWanted,
    pickDraft,
    reviewDraft,
    readyToFinish,
    stops,
    live,
    active,
    stage,
    inserting,
    bestOn,
    score,
    nextServer,
    bounds,
    pickedId,
    viewedGap,
    overrun,
    mode,
    editIndex,
    bestRowSaved,
    offsetOf,
    windowFor,
  } = flow
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
  const showRemove = overrun && !live && !set.finished && mode !== 'edit'
  const endKind = finishCard ? 'video' : boundNote && mode !== 'setPoint' && mode !== 'edit' && !set.finished ? 'mark' : null
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

  return {
    seekSpan,
    seekSpans,
    openRange,
    shownScore,
    serverKnown,
    shownServer,
    setsWon,
    atEnd,
    tapped,
    overCard,
    finishCard,
    loopNow,
    shotAt,
    zoneOn,
    padTitle,
    zoneTitle,
    flowShown,
    bestRallyOne,
    bestQ,
    bestRowDraft,
    scoreBefore,
    savedIndex,
    rowDraft,
    gapServer,
    insertingBare,
    rallyState,
    rallyNo,
    rallyScoreAt,
    awaitServer,
    rallyServer,
    rallyWord,
    starBase,
    bestAccount,
    coverTaps,
    tapAction,
    showRemove,
    endKind,
    atEndPad,
    starShown,
    reviewDraftNow,
    nextHead,
    reviewParts,
    reviewMarked,
  }
}
