import { useMemo } from 'react'
import { expectedServer } from '@/rules/continuity'
import { markBounds } from '@/rules/marks'
import { calculateTaggedScore } from '@/rules/match'
import { editStops, setFloorG } from '@/rules/matchOps'
import { stageOf } from '@/rules/rally'
import { ZERO, canSaveEarly, countPoints, setEndIndex, setOverOnRule } from '@/rules/score'
import type { MatchRecord, SetData } from '@/types/match'
import type { Side } from '@/types/rally'
import type { BestSavedRow, EditPick, Gap, ShotEdit, TagLock } from '../models'

export function useDeriveTagState({
  match,
  set,
  lock,
  gap,
  editPick,
  editOf,
  shotEdit,
  serverPick,
  bestSaved,
}: {
  match: MatchRecord
  set: SetData
  lock: TagLock
  gap: Gap | null
  editPick: EditPick | null
  editOf: string | null
  shotEdit: ShotEdit | null
  serverPick: Side | null
  bestSaved: BestSavedRow | null
}) {
  const have = new Set(match.videos.map((v) => v.id))
  const stops = useMemo(() => editStops(match, set.setId), [match, set])
  /** The open rally sits on a removed video: it cannot be tagged or tapped over. */
  const draftGone = set.draft !== null && !have.has(set.draft.videoId)
  const live = draftGone ? null : set.draft
  const readOnly = lock !== null
  const active = live
  const stage = active ? stageOf(active) : null
  const editing = editPick !== null || editOf !== null
  /** A rally is being added into a gap. The questions must open on a finished set too. */
  const inserting = Boolean(gap && editPick?.kind === 'gap')
  /** Best + FA, contacts closed, this rally's steps open. An edit opens them on a finished set too. */
  const bestOn = !shotEdit && (!set.finished || editOf !== null || inserting) && !draftGone && Boolean(live?.closed)
  /** End is on screen with no result, and whenever a press has opened it. */
  const score = calculateTaggedScore(set) ?? ZERO
  /** Who should serve next goes by what was tagged before the place the rally goes in. */
  const expected = expectedServer(set.rallies, set.firstServer, gap ? gap.index : set.rallies.length)
  const nextServer = serverPick ?? expected
  /** Before the first rally: where the chosen video picks up. */
  const bounds = set.mark ? markBounds(match.videos, set.mark) : null
  const markStart = bounds?.start ?? 0
  const markEnd = bounds?.end ?? null
  const liveFloor = Math.max(markStart, setFloorG(match, set, markStart))
  const pickedId = editPick?.kind === 'rally' ? editPick.id : null
  const viewedGap = editPick?.kind === 'gap' ? (stops.gaps.find((g) => g.index === editPick.index) ?? null) : null
  /** Behind the mark start or the last saved rally, and inside a gap when one is open. */
  const floorG = gap ? Math.max(gap.a, markStart) : viewedGap ? viewedGap.a : liveFloor
  /** The set first reaches a winning score at this rally. Rallies after it do not belong. */
  const winners = set.rallies.map((r) => r.winner)
  const running = countPoints(winners)
  const endIndex = setEndIndex(winners)
  const overrun = endIndex >= 0 && endIndex < set.rallies.length - 1
  /** Set over is the rule only. Matching the Details score does not finish a broken set. */
  const setWon = setOverOnRule(winners)
  /** A leader at the end is ended early. A level score still saves, as incomplete. */
  const saveEarly = canSaveEarly(running)
  const mode = set.finished && !editing
    ? 'finished'
    : draftGone
      ? 'blocked'
      : live
      ? live.closed
        ? 'tagging'
        : 'tapping'
      : editPick !== null
        ? 'edit'
        : setWon && !gap
          ? 'setPoint'
          : 'watch'
  /** The saved rally being changed or picked in Edit Set. */
  const editIndex = set.rallies.findIndex((r) => r.id === (editOf ?? pickedId))
  const editRally = editIndex >= 0 ? set.rallies[editIndex] : null
  /** The saved row shows until the next rally's first contact. */
  const bestRowSaved = Boolean(bestSaved && (!live || live.contacts.length === 0))
  return {
    have,
    stops,
    draftGone,
    live,
    readOnly,
    active,
    stage,
    editing,
    inserting,
    bestOn,
    score,
    expected,
    nextServer,
    bounds,
    markStart,
    markEnd,
    liveFloor,
    pickedId,
    viewedGap,
    floorG,
    winners,
    running,
    endIndex,
    overrun,
    setWon,
    saveEarly,
    mode,
    editIndex,
    editRally,
    bestRowSaved,
  }
}
