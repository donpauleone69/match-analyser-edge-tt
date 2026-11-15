import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { WfEmpty } from '@/layout/Wireframe'
import {
  derivePhase,
  formatScore,
  matchSetsWon,
  parseEntered,
  resultSetCount,
  setBlockingFinish,
  setHasTagProgress,
  setRalliesWithoutVideo,
  setScoresDiffer,
  taggedScore,
  useDemo,
  type MatchRecord,
  type SetData,
} from '@/data/demoStore'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { isRealResult, matchLabel } from '@/features/match/matchChecks'
import { cn } from '@/helpers/utils'
import {
  applyTaggedResult,
  applyTaggedScore,
  deleteRally,
  finishMatch,
  finishSet,
  flipFirstServer,
  lastSavedGlobal,
  nextSetToTag,
  reopenSet,
  replaceRally,
  restoreSet,
  saveRally,
  setDraft,
  setInProgress,
} from './matchOps'
import {
  CAPTURE_SPEED,
  CONTACT_IDLE_MS,
  MARK_LOOP_HALF_S,
  NORMAL_SPEED,
  NUDGE_STEP_S,
  addContact,
  canSave,
  captureContactTime,
  draftFromRally,
  emptyDraft,
  markFa,
  markTime,
  nudgeMark,
  otherSide,
  rallyEnd,
  rallyFromDraft,
  rallyStart,
  servesText,
  shotSummary,
  shotWindow,
  stageOf,
  statusText,
  toggleNoAttack,
  undoContact,
  type Draft,
  type Mark,
  type RallyData,
  type Side,
  type Stage,
} from './rally'
import { ZERO, addPoint, isSetWon, serverAt, type Points } from './score'
import { NO_ATTACK_KEY, applyShotKey } from './shotKeys'
import { FirstAttackRow, KeyHint, ShotPanel, TimeRow } from './ShotPanel'
import { ShotRail } from './ShotRail'
import { TAG_LOCK_LINE, useTagLock, type TagLock } from './tagLock'
import { segmentAt, segmentsOf, toGlobal, type Segment } from './timeline'
import { usePlayer, type Window } from './usePlayer'
import { VideoStage, type TimelineBlock } from './VideoStage'

/** Route entry: checks the set can be shown, then mounts the tagger per set. */
export function TagSetScreen() {
  const navigate = useNavigate()
  const { matchId = '', setId = '1' } = useParams()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
  const lock = useTagLock(matchId, match)
  const set = match?.sets.find((s) => s.setId === Number(setId))

  const stop = (title: string, body: string) => (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-3">
      <WfEmpty title={title} body={body} />
      <Button variant="secondary" onClick={() => navigate(`/matches/${matchId}/tag`)}>
        Back to Tag
      </Button>
    </div>
  )
  if (!match || !set) return stop('Unknown set', 'Back to the Tag checklist.')
  if (set.skipped) return stop(`Set ${set.setId} not filmed`, 'Undo it on the Tag checklist.')
  if (lock && !set.finished) return stop(`Set ${set.setId} cannot be tagged`, TAG_LOCK_LINE[lock])

  // Nothing of this set can be played: no video at all, or a finished set
  // whose rallies were all tagged on a video that has been removed.
  const tags = set.rallies.length + (set.draft ? 1 : 0)
  const unplayable = setRalliesWithoutVideo(match, set)
  if (match.videos.length === 0 || (set.finished && tags > 0 && unplayable === tags)) {
    return <SetWithoutVideo match={match} set={set} removed={tags > 0} />
  }
  const videoKey = match.videos.map((v) => v.id).join(',')
  return <TagSet key={`${match.id}:${set.setId}:${videoKey}`} match={match} set={set} lock={lock} />
}

type Toast = { text: string; undo: () => void }

/**
 * Presses are ignored for a moment after the control under the thumb changes,
 * so a tap meant for what was there never lands on what replaced it.
 */
const GUARD_AFTER_CLOSE_MS = 1000
const GUARD_AFTER_SWAP_MS = 600
const GUARD_PANEL_AFTER_CLOSE_MS = 500
const GUARD_PANEL_MS = 250
const HINT_MS = 2500

/** Watching speed per match, kept while the app is open. */
const watchRates = new Map<string, number>()

const scoreKey = (p: Points) => `${p.me}-${p.them}`

function guardClicks(until: RefObject<number>) {
  return (e: MouseEvent) => {
    if (Date.now() < until.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
}
type Editing = { id: string; index: number; draft: Draft; dirty: boolean }
type SetHeaderProps = { match: MatchRecord; set: SetData; children?: ReactNode }

/** The stage-driven choice of what is selected after a change. */
function selectionAfter(prev: Stage, next: Stage, d: Draft, current: Mark | null): Mark | null {
  const end: Mark = { kind: 'shot', shot: d.contacts.length }
  if (next === 'result' || next === 'endShot') return end
  if (next === 'faShot' && d.fa !== null) return { kind: 'shot', shot: d.fa }
  if (next !== prev) return null
  return current
}

function TagSet({ match, set, lock }: { match: MatchRecord; set: SetData; lock: TagLock }) {
  const navigate = useNavigate()
  const { mutateMatch } = useDemo()
  const player = usePlayer(match.videos)
  const playerRef = useRef(player)
  const segs = player.segs
  const names: Record<Side, string> = { me: 'You', them: match.opponent.trim() || 'Opponent' }

  const [selected, setSelected] = useState<Mark | null>(null)
  /** After a nudge the loop tightens around the mark that moved. */
  const [tight, setTight] = useState(false)
  const [edit, setEdit] = useState<Editing | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  /** The score at which the user chose to keep tagging past a won set. */
  const [keptAt, setKeptAt] = useState<string | null>(null)
  const [keptEntered, setKeptEntered] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [lastTap, setLastTap] = useState<number | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  /** Bumped when a rally closes, so the panel that appears fades in as it arms. */
  const [armKey, setArmKey] = useState(0)

  const slotGuard = useRef(0)
  const panelGuard = useRef(0)
  /** The speed chosen for watching between rallies. Tapping, Save and the next set do not lose it. */
  const watchRate = useRef<number>(watchRates.get(match.id) ?? NORMAL_SPEED)
  const listResume = useRef(false)
  const body = useRef<HTMLDivElement>(null)
  const arm = (slotMs: number, panelMs = 0) => {
    const now = Date.now()
    slotGuard.current = Math.max(slotGuard.current, now + slotMs)
    panelGuard.current = Math.max(panelGuard.current, now + panelMs)
  }

  const have = new Set(match.videos.map((v) => v.id))
  /** Rallies of this set whose video has been removed: tags kept, nothing to play. */
  const goneCount = setRalliesWithoutVideo(match, set)
  /** The open rally sits on a removed video: it cannot be tagged or tapped over. */
  const draftGone = set.draft !== null && !have.has(set.draft.videoId)
  const live = draftGone ? null : set.draft
  const readOnly = lock !== null
  const active = edit ? edit.draft : live
  const stage = active ? stageOf(active) : null
  const score = taggedScore(set) ?? ZERO
  const nextServer = serverAt(set.firstServer, score)
  const floorG = lastSavedGlobal(match, set.setId)
  const entered = parseEntered(set.entered)
  const reachedEntered = entered !== null && entered.me === score.me && entered.them === score.them
  const setWon = set.rallies.length > 0 && (isSetWon(score) || (reachedEntered && isSetWon(entered)))
  const mode = edit
    ? 'edit'
    : set.finished
      ? 'finished'
      : draftGone
        ? 'blocked'
        : live
        ? live.closed
          ? 'tagging'
          : 'tapping'
        : setWon && keptAt !== scoreKey(score)
          ? 'setPoint'
          : 'watch'
  /** What sits in the bottom slot. A change of it guards the slot for a moment. */
  const slotKind = mode === 'tagging' ? 'save' : mode === 'edit' || mode === 'finished' ? mode : 'pad'

  const latest = useRef({ live, set, match, floorG, segs, mode, selected, tight, edit, nextServer, stage })
  useEffect(() => {
    playerRef.current = player
    latest.current = { live, set, match, floorG, segs, mode, selected, tight, edit, nextServer, stage }
  })

  const offsetOf = (videoId: string, all: Segment[] = segs) => toGlobal(all, videoId, 0) ?? 0
  const durationOf = (videoId: string) => match.videos.find((v) => v.id === videoId)?.durationS ?? 0

  /** The part of the video a rally being tagged should loop, in match time. */
  const windowFor = (d: Draft, sel: Mark | null, st: Stage, isTight: boolean): Window => {
    const off = offsetOf(d.videoId)
    const max = durationOf(d.videoId)
    const clamp = (w: Window): Window => ({
      a: off + Math.max(0, w.a),
      b: off + Math.min(max, Math.max(w.b, w.a + 0.3)),
    })
    if (sel && (sel.kind !== 'shot' || isTight)) {
      const at = markTime(d, sel)
      return clamp({ a: at - MARK_LOOP_HALF_S, b: at + MARK_LOOP_HALF_S })
    }
    if (sel && sel.kind === 'shot' && st !== 'result') return clamp(shotWindow(d, sel.shot))
    return clamp({ a: rallyStart(d), b: rallyEnd(d) })
  }

  const applyLoop = (w: Window, seekTo?: number) => {
    const p = playerRef.current
    const current = p.getLoop()
    const changed = !current || Math.abs(current.a - w.a) > 0.01 || Math.abs(current.b - w.b) > 0.01
    p.setLoop(w)
    if (changed || seekTo !== undefined) {
      p.seek(seekTo ?? w.a)
      p.play()
    }
  }

  /** Puts the video where this set stands: the open rally, or the last saved one. */
  const park = (draft: Draft | null, finished: boolean, floor: number) => {
    const p = playerRef.current
    p.setBoundary(null)
    p.setFloor(floor)
    p.pause()
    if (draft && draft.closed && !finished && have.has(draft.videoId)) {
      const st = stageOf(draft)
      const sel = selectionAfter('contacts', st, draft, null)
      const w = windowFor(draft, sel, st, false)
      p.setRate(CAPTURE_SPEED)
      p.setLoop(w)
      const last = offsetOf(draft.videoId) + draft.contacts[draft.contacts.length - 1]
      p.seek(st === 'result' ? Math.max(w.a, last - 1) : w.a)
      // An open rally loops as soon as it is on screen, as it did when it was left.
      p.play()
      setSelected(sel)
    } else {
      p.setRate(watchRate.current)
      p.setLoop(null)
      p.seek(floor)
      setSelected(null)
    }
    setTight(false)
  }

  // On arrival: a rally left mid-tap reopens with its contacts closed, and the
  // video is parked on the frame where tagging stopped.
  useEffect(() => {
    let draft = set.draft
    if (draft && !draft.closed) {
      draft = draft.contacts.length > 0 ? { ...draft, closed: true } : null
      const fixed = draft
      mutateMatch(match.id, (m) => setDraft(m, set.setId, fixed))
    }
    park(draft, set.finished, floorG)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!hint) return
    const id = setTimeout(() => setHint(null), HINT_MS)
    return () => clearTimeout(id)
  }, [hint])

  // The slot and the panel guard themselves whenever what they hold changes.
  const lastSlot = useRef(slotKind)
  const lastStep = useRef(`${mode}:${stage}`)
  useLayoutEffect(() => {
    if (lastSlot.current !== slotKind) arm(GUARD_AFTER_SWAP_MS)
    lastSlot.current = slotKind
    const step = `${mode}:${stage}`
    if (lastStep.current !== step) arm(0, GUARD_PANEL_MS)
    lastStep.current = step
  }, [slotKind, mode, stage])

  // The row being asked for sits just above Save. An opened shot starts at its top.
  useLayoutEffect(() => {
    const el = body.current
    if (el) el.scrollTop = stage === 'ready' && selected ? 0 : el.scrollHeight
  }, [mode, stage, selected])

  /** Seeks for the user, and says in a few words when one is held back. */
  const seekTo = (g: number) => {
    const stop = playerRef.current.seek(g)
    if (stop === 'fence') setHint('Stops at the last saved rally')
    else if (stop === 'loop') setHint('Stays in this rally')
    else setHint(null)
  }

  const onRate = (rate: number) => {
    playerRef.current.setRate(rate)
    if (!live && !edit) {
      watchRate.current = rate
      watchRates.set(match.id, rate)
    }
  }

  /** Writes the rally being worked on: the past rally in edit, else the draft. */
  const writeDraft = (next: Draft) => {
    if (readOnly) return
    if (edit) setEdit({ ...edit, draft: next, dirty: true })
    else mutateMatch(match.id, (m) => setDraft(m, set.setId, next))
  }

  /** A tag change, then the hand-over the real app does between steps. */
  const change = (next: Draft) => {
    if (!active) return
    const prev = stageOf(active)
    const st = stageOf(next)
    const sel = selectionAfter(prev, st, next, selected)
    writeDraft(next)
    setSelected(sel)
    setTight(false)
    applyLoop(windowFor(next, sel, st, false))
  }

  const closeContacts = () => {
    const { live: d, set: s, match: m } = latest.current
    if (!d || d.closed || d.contacts.length === 0) return
    const closed = { ...d, closed: true }
    mutateMatch(m.id, (cur) => setDraft(cur, s.setId, closed))
    const p = playerRef.current
    p.setBoundary(null)
    const end: Mark = { kind: 'shot', shot: closed.contacts.length }
    const w = windowFor(closed, null, 'result', false)
    p.setLoop(w)
    p.seek(Math.max(w.a, offsetOf(closed.videoId) + closed.contacts[closed.contacts.length - 1] - 1))
    p.play()
    setSelected(end)
    setLastTap(null)
    // A tap that comes late lands on nothing: the slot and the new panel wait.
    arm(GUARD_AFTER_CLOSE_MS, GUARD_PANEL_AFTER_CLOSE_MS)
    setArmKey((k) => k + 1)
  }

  // Two seconds with no tap closes the rally.
  useEffect(() => {
    if (mode !== 'tapping' || lastTap === null) return
    const id = setTimeout(closeContacts, CONTACT_IDLE_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lastTap])

  /** The pad: plays when paused with nothing tapped, otherwise records a contact. */
  const onPad = () => {
    const p = playerRef.current
    if (mode === 'setPoint') {
      onKeepTagging()
      return
    }
    if (mode !== 'watch' && mode !== 'tapping') return
    const tapped = live?.contacts.length ?? 0
    if (!p.isPlaying() && tapped === 0) {
      p.play()
      // The pad now means Tap serve: a double press on Play is not a serve.
      arm(GUARD_AFTER_SWAP_MS)
      return
    }
    const g = p.getTime()
    const seg = segmentAt(segs, g)
    if (!seg) return
    const local = g - seg.offset
    const floorLocal = tapped > 0 ? live!.contacts[tapped - 1] : Math.max(0, floorG - seg.offset)
    const stored = Math.round(captureContactTime(local, floorLocal) * 100) / 100
    const server = nextServer
    mutateMatch(match.id, (m) => {
      const s = m.sets.find((x) => x.setId === set.setId)
      const base = s?.draft && !s.draft.closed ? s.draft : emptyDraft(seg.id, server)
      return setDraft(m, set.setId, addContact(base, stored))
    })
    if (tapped === 0) {
      p.setRate(CAPTURE_SPEED)
      // A rally never spans two videos: the end of this one closes it.
      p.setBoundary(seg.offset + seg.duration, closeContacts)
    }
    if (!p.isPlaying()) p.play()
    setLastTap(Date.now())
  }

  const onUndoTap = () => {
    if (!live || live.closed || live.contacts.length === 0) return
    const p = playerRef.current
    const removed = live.contacts[live.contacts.length - 1]
    const next = undoContact(live)
    if (next.contacts.length === 0) {
      mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
      p.setRate(watchRate.current)
      p.setBoundary(null)
      setLastTap(null)
    } else {
      mutateMatch(match.id, (m) => setDraft(m, set.setId, next))
      setLastTap(Date.now())
    }
    p.seek(offsetOf(live.videoId) + removed)
  }

  const onShot = (shot: number) => {
    if (!active || !stage) return
    const mark: Mark = { kind: 'shot', shot }
    if (!readOnly && (stage === 'result' || stage === 'endShot')) return
    if (!readOnly && (stage === 'pickFa' || stage === 'faShot')) {
      if (shot >= 2) change(markFa(active, shot))
      return
    }
    const same = selected?.kind === 'shot' && selected.shot === shot
    const sel = same ? null : mark
    setSelected(sel)
    setTight(false)
    applyLoop(windowFor(active, sel, stage, false))
  }

  const onMark = (mark: Mark) => {
    if (!active || !stage) return
    const sel = selected?.kind === mark.kind ? null : mark
    setSelected(sel)
    setTight(false)
    applyLoop(windowFor(active, sel, stage, false))
  }

  const onNudge = (delta: number) => {
    if (!active || !stage || !selected || readOnly) return
    const next = nudgeMark(active, selected, delta, durationOf(active.videoId))
    writeDraft(next)
    setTight(true)
    applyLoop(windowFor(next, selected, stage, true))
  }

  const withUndo = (text: string, before: SetData, after?: () => void) =>
    setToast({
      text,
      undo: () => {
        mutateMatch(match.id, (m) => restoreSet(m, before))
        setToast(null)
        after?.()
      },
    })

  /** Clear contacts and tags and tap this rally again from before the serve. */
  const onRetap = () => {
    if (!live) return
    const p = playerRef.current
    const before = set
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    p.setLoop(null)
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.seek(offsetOf(live.videoId) + rallyStart(live))
    p.play()
    setSelected(null)
    setLastTap(null)
    withUndo('Rally cleared', before, () => park(before.draft, false, floorG))
  }

  /** Drop an open rally whose video is gone. */
  const onDiscardGone = () => {
    const before = set
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    withUndo('Rally discarded', before)
  }

  const onDiscard = () => {
    if (!live) return
    const p = playerRef.current
    const before = set
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    p.setLoop(null)
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.seek(offsetOf(live.videoId) + live.contacts[live.contacts.length - 1])
    p.play()
    setSelected(null)
    setLastTap(null)
    withUndo('Rally discarded', before, () => park(before.draft, false, floorG))
  }

  /** Save writes the rally, moves the score and lets the video run on. */
  const onSave = () => {
    if (!live || !canSave(live)) return
    const rally = rallyFromDraft(live, `r-${Date.now()}`)
    if (!rally) return
    const p = playerRef.current
    mutateMatch(match.id, (m) => saveRally(m, set.setId, rally))
    const endG = offsetOf(rally.videoId) + rally.contacts[rally.contacts.length - 1]
    const after = addPoint(score, rally.winner)
    p.setLoop(null)
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.setFloor(Math.max(floorG, endG))
    p.seek(endG)
    const atEntered =
      entered !== null && isSetWon(entered) && entered.me === after.me && entered.them === after.them
    if (isSetWon(after) || atEntered) p.pause()
    else p.play()
    setSelected(null)
    setTight(false)
    setKeptAt(null)
  }

  const onServer = () => {
    if (readOnly) return
    if (edit) writeDraft({ ...edit.draft, server: otherSide(edit.draft.server) })
    else if (!live) mutateMatch(match.id, (m) => flipFirstServer(m, set.setId))
  }

  const showEdit = (next: Editing) => {
    setEdit(next)
    setSelected(null)
    setTight(false)
    setListOpen(false)
    listResume.current = false
    const p = playerRef.current
    p.setBoundary(null)
    p.setRate(NORMAL_SPEED)
    const w = windowFor(next.draft, null, 'ready', false)
    p.setLoop(w)
    p.seek(w.a)
    p.play()
  }

  const openRally = (r: RallyData, index: number) => {
    if (!have.has(r.videoId)) return
    showEdit({ id: r.id, index, draft: draftFromRally(r), dirty: false })
  }

  const leaveEdit = () => {
    setEdit(null)
    park(live, set.finished, floorG)
  }

  /** Back to live. Unsaved changes are dropped, with Undo to pick them up again. */
  const closeEdit = () => {
    const dropped = edit
    leaveEdit()
    if (dropped && dropped.dirty && !readOnly) {
      setToast({
        text: `Rally ${dropped.index + 1}: changes dropped`,
        undo: () => {
          setToast(null)
          showEdit(dropped)
        },
      })
    }
  }

  const onSaveEdit = () => {
    if (!edit || readOnly || !edit.dirty) return
    const rally = rallyFromDraft(edit.draft, edit.id)
    if (!rally) return
    mutateMatch(match.id, (m) => replaceRally(m, set.setId, rally))
    leaveEdit()
  }

  const onDeleteEdit = () => {
    if (!edit || readOnly) return
    const before = set
    mutateMatch(match.id, (m) => deleteRally(m, set.setId, edit.id))
    setEdit(null)
    const remaining = set.rallies.filter((r) => r.id !== edit.id)
    const floor = lastSavedGlobal(
      { ...match, sets: match.sets.map((s) => (s.setId === set.setId ? { ...s, rallies: remaining } : s)) },
      set.setId
    )
    park(live, set.finished, floor)
    withUndo('Rally deleted', before)
  }

  const level = score.me === score.them
  /** A set can be finished once it has a rally, nothing is open, and one side leads. */
  const canFinishNow = !set.finished && !live && !draftGone && !edit && set.rallies.length > 0
  const canFinish = canFinishNow && !level

  const onFinishSet = () => {
    if (!canFinish) return
    setListOpen(false)
    listResume.current = false
    playerRef.current.pause()
    mutateMatch(match.id, (m) => finishSet(m, set.setId))
    setKeptEntered(false)
  }

  const onKeepTagging = () => {
    setKeptAt(scoreKey(score))
    playerRef.current.play()
    arm(GUARD_AFTER_SWAP_MS)
  }

  const onReopenSet = () => {
    if (readOnly) return
    mutateMatch(match.id, (m) => reopenSet(m, set.setId))
    setKeptAt(scoreKey(score))
    park(null, false, floorG)
  }

  /** The Rallies sheet covers the panel, so the video waits while it is open. */
  const openList = () => {
    if (mode === 'tapping') closeContacts()
    const p = playerRef.current
    listResume.current = p.isPlaying()
    p.pause()
    setListOpen(true)
  }

  const closeList = () => {
    setListOpen(false)
    if (listResume.current) playerRef.current.play()
    listResume.current = false
  }

  const onFa = (shot: number) => {
    if (active && !readOnly) change(markFa(active, shot))
  }

  const onNoAttack = () => {
    if (active && !readOnly) change(toggleNoAttack(active))
  }

  const n = active ? active.contacts.length : 0
  /** The first attack is asked from three shots up. On two it follows the stroke. */
  const showFa =
    active !== null &&
    active.closed &&
    !readOnly &&
    n >= 3 &&
    (stage === 'pickFa' || stage === 'faShot' || (stage === 'ready' && !selected))

  // Keys (desktop). Space is the pad. Backspace undoes a tap. Enter saves
  // whenever Save is lit, whatever has focus, and never presses a button.
  // 1 to 9 pick a shot, 0 is No attack. Top row is the result, home row the
  // wing, bottom row the stroke. [ and ] pick the marks, - and = nudge.
  // K plays or pauses, arrows step 10 seconds.
  const handlers = {
    onPad,
    onUndoTap,
    onSave,
    onSaveEdit,
    onShot,
    onMark,
    onNudge,
    onNoAttack,
    change,
    seekTo,
    showFa,
    readOnly,
    active,
  }
  const keys = useRef(handlers)
  useEffect(() => {
    keys.current = handlers
  })
  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      return Boolean(target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    }
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
      const p = playerRef.current
      const now = latest.current
      const k = keys.current
      const rally = now.mode === 'tagging' || now.mode === 'edit'
      const toggle = () => (p.isPlaying() ? p.pause() : p.play())
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (key === ' ') {
        e.preventDefault()
        if (e.repeat || Date.now() < slotGuard.current) return
        if (now.mode === 'watch' || now.mode === 'tapping' || now.mode === 'setPoint') k.onPad()
        else toggle()
      } else if (key === 'Enter') {
        if (!rally) return
        // Enter is Save here. It must not click whatever the mouse last pressed.
        e.preventDefault()
        if (e.repeat || Date.now() < slotGuard.current) return
        if (now.mode === 'tagging') k.onSave()
        else k.onSaveEdit()
      } else if (key === 'k') {
        toggle()
      } else if (key === 'Backspace') {
        if (now.mode === 'tapping') {
          e.preventDefault()
          k.onUndoTap()
        }
      } else if (key === 'ArrowLeft') {
        k.seekTo(p.getTime() - 10)
      } else if (key === 'ArrowRight') {
        k.seekTo(p.getTime() + 10)
      } else if (!rally || !k.active || !k.active.closed) {
        return
      } else if (/^[1-9]$/.test(key)) {
        k.onShot(Number(key))
      } else if (k.readOnly) {
        return
      } else if (key === NO_ATTACK_KEY) {
        if (k.showFa) k.onNoAttack()
      } else if (key === '[' || key === ']') {
        if (now.stage !== 'result' && now.stage !== 'endShot') {
          k.onMark({ kind: key === '[' ? 'start' : 'end' })
        }
      } else if (key === '-' || key === '=') {
        if (now.selected) k.onNudge(key === '-' ? -NUDGE_STEP_S : NUDGE_STEP_S)
      } else if (now.selected?.kind === 'shot') {
        const next = applyShotKey(k.active, now.selected.shot, key)
        if (next) k.change(next)
      }
    }
    // Space clicks a focused button on key up: stop that too.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && !typing(e)) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Timeline: every saved rally of the match, this set's at full strength.
  const blocks = useMemo<TimelineBlock[]>(() => {
    const all = segmentsOf(match.videos)
    return match.sets.flatMap((s) =>
      s.rallies.flatMap((r) => {
        const off = toGlobal(all, r.videoId, 0)
        if (off === null) return []
        return [{ a: off + r.start, b: off + r.end, winner: r.winner, current: s.setId === set.setId }]
      })
    )
  }, [match.videos, match.sets, set.setId])

  const openRange = active
    ? {
        a: offsetOf(active.videoId) + (active.closed ? rallyStart(active) : (active.contacts[0] ?? 0)),
        b:
          offsetOf(active.videoId) +
          (active.closed ? rallyEnd(active) : (active.contacts[active.contacts.length - 1] ?? 0)),
        ticks: active.contacts.map((c) => offsetOf(active.videoId) + c),
      }
    : null

  const editScore: Points | null = edit
    ? set.rallies.slice(0, edit.index).reduce<Points>((acc, r) => addPoint(acc, r.winner), ZERO)
    : null
  const shownScore = editScore ?? score
  const shownServer = edit ? edit.draft.server : (live?.server ?? nextServer)
  const setsWon = matchSetsWon(match)
  const atEnd = player.atEnd && (mode === 'watch' || mode === 'setPoint')
  const ready = stage === 'ready'
  const tapped = live && !live.closed ? live.contacts.length : 0
  /** Finish is offered in the panel at set point and when the video runs out. */
  const finishCard = canFinishNow && (mode === 'setPoint' || atEnd)
  const setLine = `Set ${set.setId} · ${formatScore(score)}`

  const status =
    mode === 'finished'
      ? `Set ${set.setId} finished · ${formatScore(score)}`
      : mode === 'setPoint'
        ? `Set ${set.setId} reached ${formatScore(score)}`
        : mode === 'blocked'
          ? setLine
          : mode === 'edit' && edit
            ? readOnly || (ready && !edit.dirty)
              ? `Rally ${edit.index + 1} · ${edit.draft.contacts.length} ${edit.draft.contacts.length === 1 ? 'shot' : 'shots'}`
              : `Rally ${edit.index + 1} · ${ready ? 'Ready to save changes' : statusText(edit.draft)}`
          : active
            ? statusText(active)
            : player.playing && !atEnd
              ? 'Tap each contact'
              : setLine

  const rallyList = (
    <RallyList
      set={set}
      names={names}
      nextServer={nextServer}
      editingId={edit?.id ?? null}
      hasVideo={(id) => have.has(id)}
      onOpen={openRally}
      finish={!canFinishNow || finishCard ? null : level ? 'level' : 'ok'}
      score={score}
      onFinish={onFinishSet}
    />
  )
  const padServer = live?.server ?? nextServer
  const rowButton = 'h-11 lg:h-9 px-3 shrink-0'
  /** Slot controls never change size, not even while pressed. */
  const slotButton = 'h-20 rounded-lg text-lg active:scale-100 active:brightness-90'

  return (
    <div
      className="h-full flex flex-col lg:flex-row bg-bg-app"
      data-tag-mode={mode}
      data-tag-stage={stage ?? ''}
      data-playing={player.playing}
      data-rate={player.rate}
      data-time={player.time}
    >
      {/* Left on desktop, top on phone: header, picture, timeline, rally list. */}
      <div className="shrink-0 lg:flex-[3] lg:min-w-0 lg:min-h-0 lg:flex lg:flex-col lg:border-r lg:border-border">
        <SetHeader match={match} set={set}>
          <Button
            size="sm"
            variant="secondary"
            className="lg:hidden"
            aria-expanded={listOpen}
            onClick={() => (listOpen ? closeList() : openList())}
          >
            <Icon name="list" size="xs" />
            Rallies {set.rallies.length}
          </Button>
        </SetHeader>
        <VideoStage
          player={player}
          videos={match.videos}
          names={names}
          bug={{ sets: setsWon, points: shownScore, server: shownServer, setId: set.setId }}
          blocks={blocks}
          open={openRange}
          hint={hint}
          onSeek={seekTo}
          onRate={onRate}
          className="lg:shrink-0 lg:[&>div:first-child]:max-h-[52vh] lg:[&>div:first-child]:mx-auto"
        />
        <div className="hidden lg:block flex-1 min-h-0 overflow-y-auto">{rallyList}</div>
      </div>

      {/* Right on desktop, below on phone: rail, status, panel, then one slot for the pad or Save. */}
      <div className="relative flex-1 min-h-0 flex flex-col lg:flex-[2] lg:min-w-[360px]">
        <div className="shrink-0 px-2 pt-1.5 border-b border-border bg-bg-app">
          <div className="flex items-start gap-2">
            {mode === 'finished' || mode === 'setPoint' ? null : (
              <div className="flex flex-col items-center shrink-0 py-1">
                <button
                  type="button"
                  onClick={onServer}
                  disabled={mode === 'tagging' || mode === 'tapping' || mode === 'blocked' || readOnly}
                  aria-label={`${servesText(names, shownServer)}. Switch server`}
                  className={cn(
                    'h-10 lg:h-9 px-2 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-100',
                    shownServer === 'me'
                      ? 'bg-side-me/15 border-side-me/50'
                      : 'bg-side-them/15 border-side-them/50'
                  )}
                >
                  <span
                    className={cn('h-2 w-2 rounded-full', shownServer === 'me' ? 'bg-side-me' : 'bg-side-them')}
                  />
                  <span className="max-w-20 truncate text-primary">{names[shownServer]}</span>
                </button>
                <span className="h-4 text-[9px] font-bold uppercase tracking-wide leading-4 text-muted">
                  Serves
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              {active ? (
                <ShotRail
                  draft={active}
                  selected={selected}
                  onShot={onShot}
                  onMark={onMark}
                  onHighlight={() => writeDraft({ ...active, highlight: !active.highlight })}
                  readOnly={readOnly}
                />
              ) : mode !== 'watch' ? null : (
                <div className="py-1 flex" aria-label="Shots in this rally">
                  <span className="h-10 min-w-10 lg:h-9 lg:min-w-9 rounded-md border border-dashed border-border text-sm font-bold text-muted opacity-60 inline-flex items-center justify-center">
                    1
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status, with the rally's second-rank actions beside it, away from the thumb. */}
          <div className="mb-1.5 flex items-stretch gap-1.5" onClickCapture={guardClicks(slotGuard)}>
            <p
              role="status"
              data-tag-status
              className={cn(
                'flex-1 min-w-0 min-h-11 lg:min-h-9 flex items-center rounded-md border-l-4 px-2 py-1 text-sm font-semibold leading-tight',
                ready || mode === 'finished'
                  ? 'border-success bg-success/15 text-primary'
                  : active && active.closed
                    ? 'border-warning bg-warning/15 text-primary'
                    : 'border-border-strong bg-bg-card text-primary'
              )}
            >
              {status}
            </p>
            {mode === 'tapping' && tapped > 0 ? (
              <Button variant="secondary" className={rowButton} onClick={onUndoTap}>
                <Icon name="undo" size="sm" />
                Undo
                <KeyHint k="Bksp" />
              </Button>
            ) : null}
            {mode === 'tagging' ? (
              <>
                <Button variant="secondary" className={rowButton} onClick={onRetap}>
                  Re-tap
                </Button>
                <Button variant="secondary" className={rowButton} onClick={onDiscard}>
                  Discard
                </Button>
              </>
            ) : null}
            {mode === 'blocked' ? (
              <Button variant="secondary" className={rowButton} onClick={onDiscardGone}>
                Discard rally
              </Button>
            ) : null}
            {mode === 'edit' && !readOnly ? (
              <>
                <Button variant="secondary" className={rowButton} onClick={closeEdit}>
                  Back to live
                </Button>
                <Button variant="secondary" className={rowButton} aria-label="Delete rally" onClick={onDeleteEdit}>
                  <Icon name="trash" size="sm" />
                  Delete
                </Button>
              </>
            ) : null}
          </div>

          {toast ? (
            <div
              role="status"
              data-tag-toast
              className="mb-1.5 flex items-center justify-between gap-3 rounded-md bg-neutral-100 text-neutral-950 pl-3 pr-1 text-sm shadow-lg"
            >
              <span>{toast.text}</span>
              <button
                type="button"
                className="h-11 lg:h-9 min-w-16 px-3 rounded-md font-bold underline hover:bg-neutral-300"
                onClick={toast.undo}
              >
                Undo
              </button>
            </div>
          ) : null}
        </div>

        {/* The panel. What is asked for next sits at its foot, straight above the slot. */}
        <div
          ref={body}
          className="flex-1 min-h-0 overflow-y-auto px-2 py-2 flex flex-col"
          onClickCapture={guardClicks(panelGuard)}
        >
          <div key={armKey} className={cn('mt-auto space-y-2', armKey > 0 && 'tag-arm')}>
            {goneCount > 0 ? (
              <div className="rounded-md border border-dashed border-border bg-bg-card px-3 py-2 space-y-2" role="status">
                <p className="text-sm text-primary">
                  {draftGone && goneCount === 1
                    ? 'The video for the open rally was removed.'
                    : `The video for ${goneCount} ${goneCount === 1 ? 'rally' : 'rallies'} was removed. Tags and score are kept.`}
                </p>
                <AddVideoChoice matchId={match.id} />
              </div>
            ) : null}
            {lock && mode !== 'finished' ? (
              <p className="text-xs text-muted" role="status">
                {TAG_LOCK_LINE[lock]}
              </p>
            ) : null}
            {mode === 'finished' ? (
              <FinishedPanel
                match={match}
                set={set}
                score={score}
                keptEntered={keptEntered}
                onKeepEntered={() => setKeptEntered(true)}
                onReopen={onReopenSet}
                lock={lock}
              />
            ) : null}
            {active && active.closed && (readOnly || (ready && !selected)) ? (
              <ul className="space-y-1" aria-label="Rally summary">
                {active.contacts.map((_, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onShot(i + 1)}
                      aria-pressed={selected?.kind === 'shot' && selected.shot === i + 1}
                      className={cn(
                        'w-full min-h-11 lg:min-h-0 flex items-center justify-between gap-2 rounded-md border bg-bg-card px-2 py-1.5 text-left text-xs',
                        selected?.kind === 'shot' && selected.shot === i + 1
                          ? 'border-brand-primary'
                          : 'border-border'
                      )}
                    >
                      <span className="font-semibold text-primary">
                        {i + 1} · {names[i % 2 === 0 ? active.server : otherSide(active.server)]}
                      </span>
                      <span className="text-muted truncate">
                        {[
                          active.fa === i + 1 ? 'First attack' : '',
                          i + 1 === active.contacts.length ? (active.ending ?? '') : '',
                          shotSummary(active.shots[i] ?? {}),
                        ]
                          .filter(Boolean)
                          .join(' · ') || (readOnly ? '' : 'Add detail')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {showFa && active ? <FirstAttackRow draft={active} onPick={onFa} onNoAttack={onNoAttack} /> : null}
            {active && active.closed && selected?.kind === 'shot' && !readOnly ? (
              <ShotPanel draft={active} shot={selected.shot} names={names} onChange={change} onNudge={onNudge} />
            ) : null}
            {active && active.closed && selected && selected.kind !== 'shot' && !readOnly ? (
              <div className="rounded-md border border-border bg-bg-surface p-3">
                <TimeRow draft={active} mark={selected} onNudge={onNudge} />
              </div>
            ) : null}
            {finishCard ? (
              <div data-finish-card>
                {level ? (
                  <p className="rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary" role="status">
                    Level at {formatScore(score)}. A set cannot finish level.
                  </p>
                ) : (
                  <Button
                    fullWidth
                    variant={setWon ? 'primary' : 'secondary'}
                    className="h-12 text-base"
                    onClick={onFinishSet}
                  >
                    {setWon ? 'Finish set' : `Finish set at ${formatScore(score)}`}
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/*
          The slot. It holds one control at one size: the pad, then Save. Nothing
          else ever appears here while a rally is tapped or tagged.
        */}
        <div
          data-tag-slot={slotKind}
          className="shrink-0 border-t border-border bg-bg-shell px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          onClickCapture={guardClicks(slotGuard)}
        >
          {slotKind === 'pad' ? (
            <button
              type="button"
              data-tap-pad
              onClick={onPad}
              disabled={atEnd || mode === 'blocked'}
              className={cn(
                'relative w-full h-20 rounded-lg text-lg font-bold overflow-hidden touch-manipulation select-none active:brightness-90 border-l-8 inline-flex items-center justify-center gap-2',
                'disabled:bg-disabled-bg disabled:text-disabled-text disabled:active:brightness-100',
                mode === 'setPoint'
                  ? 'bg-pill-idle text-primary border border-pill-idle-border'
                  : 'bg-brand-primary text-on-accent',
                padServer === 'me' ? 'border-l-side-me' : 'border-l-side-them'
              )}
            >
              {atEnd
                ? 'End of video'
                : mode === 'setPoint'
                  ? 'Keep tagging'
                  : tapped > 0
                    ? `Tap shot ${tapped + 1}`
                    : player.playing || mode === 'blocked'
                      ? 'Tap serve'
                      : 'Play'}
              {atEnd || mode === 'blocked' ? null : <KeyHint k="Space" />}
              {tapped > 0 && lastTap !== null ? (
                <span
                  key={lastTap}
                  className="tag-idle-bar absolute left-0 right-0 bottom-0 h-1.5 bg-white/70"
                  aria-hidden
                />
              ) : null}
            </button>
          ) : null}

          {slotKind === 'save' ? (
            <Button fullWidth data-tag-save className={slotButton} disabled={!ready} onClick={onSave}>
              Save
              <KeyHint k="Enter" />
            </Button>
          ) : null}

          {slotKind === 'edit' && edit ? (
            readOnly ? (
              <Button fullWidth variant="secondary" className={slotButton} onClick={leaveEdit}>
                Back to set
              </Button>
            ) : (
              <Button
                fullWidth
                data-tag-save
                className={slotButton}
                disabled={!ready || !edit.dirty}
                onClick={onSaveEdit}
              >
                Save changes
                <KeyHint k="Enter" />
              </Button>
            )
          ) : null}

          {slotKind === 'finished' ? (
            <FinishedActions
              match={match}
              set={set}
              locked={readOnly}
              onGo={(to) => navigate(to)}
              onFinishMatch={() => mutateMatch(match.id, finishMatch)}
            />
          ) : null}
        </div>

        {/* Phone: the rally list opens over the panel. Desktop shows it on the left. */}
        {listOpen ? (
          <div className="lg:hidden absolute inset-0 z-30 bg-bg-app flex flex-col" role="dialog" aria-label="Rallies">
            <div className="h-11 px-2 flex items-center justify-between border-b border-border">
              <p className="text-sm font-semibold text-primary">Set {set.setId}</p>
              <button
                type="button"
                aria-label="Close rallies"
                className="h-11 w-11 inline-flex items-center justify-center rounded-md hover:bg-pill-idle"
                onClick={closeList}
              >
                <Icon name="x" size="sm" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">{rallyList}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Saved rallies, newest first. Opening one puts it in the same panel to edit. */
function RallyList({
  set,
  names,
  nextServer,
  editingId,
  hasVideo,
  onOpen,
  finish,
  score,
  onFinish,
}: {
  set: SetData
  names: Record<Side, string>
  nextServer: Side
  editingId: string | null
  /** False for a rally whose video was removed: listed, not playable. */
  hasVideo: (videoId: string) => boolean
  onOpen: (r: RallyData, index: number) => void
  /** Finish at the score so far. Null while the panel offers it, or it cannot be. */
  finish: 'ok' | 'level' | null
  score: Points
  onFinish: () => void
}) {
  let running = ZERO
  const rows = set.rallies.map((r, index) => {
    running = addPoint(running, r.winner)
    return { r, index, after: running }
  })
  const dot = (side: Side) => cn('h-2 w-2 rounded-full shrink-0', side === 'me' ? 'bg-side-me' : 'bg-side-them')

  return (
    <div className="px-2 py-2 space-y-1" aria-label="Rally list">
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {set.rallies.length} {set.rallies.length === 1 ? 'rally' : 'rallies'}
        </p>
        {finish === 'ok' ? (
          <Button size="sm" variant="ghost" className="min-h-11 lg:min-h-0" onClick={onFinish}>
            Finish at {formatScore(score)}
          </Button>
        ) : finish === 'level' ? (
          <p className="text-xs text-muted">Level, so it cannot finish</p>
        ) : null}
      </div>
      {!set.finished ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted">
          <span className="w-5 text-center tabular-nums">{set.rallies.length + 1}</span>
          <span className={dot(set.draft?.server ?? nextServer)} />
          <span>
            {set.draft
              ? hasVideo(set.draft.videoId)
                ? 'Rally open'
                : 'Rally open · video removed'
              : `Next rally · ${servesText(names, nextServer)}`}
          </span>
        </div>
      ) : null}
      {[...rows].reverse().map(({ r, index, after }) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onOpen(r, index)}
          disabled={!hasVideo(r.videoId)}
          aria-label={`Rally ${index + 1}`}
          aria-pressed={editingId === r.id}
          className={cn(
            'w-full min-h-11 lg:min-h-0 flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs disabled:opacity-60',
            editingId === r.id
              ? 'border-brand-primary bg-brand-primary-muted'
              : 'border-border bg-bg-card hover:bg-bg-elevated'
          )}
        >
          <span className="w-5 text-center tabular-nums text-muted">{index + 1}</span>
          <span className={dot(r.winner)} />
          <span className="font-semibold text-primary w-16 truncate">{names[r.winner]}</span>
          <span className="flex-1 min-w-0 truncate text-muted">
            {r.contacts.length} {r.contacts.length === 1 ? 'shot' : 'shots'} · {r.ending}
            {r.fa !== null ? ` · FA ${r.fa}` : ''} · {names[r.server]} served
          </span>
          {r.highlight ? <Icon name="star" size="xs" className="text-warning" /> : null}
          <span className="font-semibold text-primary tabular-nums">{formatScore(after)}</span>
        </button>
      ))}
    </div>
  )
}

const flagClass = 'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary space-y-2'

/** After Finish set: the score, any disagreement with Details, and the match result. */
function FinishedPanel({
  match,
  set,
  score,
  keptEntered,
  onKeepEntered,
  onReopen,
  lock,
}: {
  match: MatchRecord
  set: SetData
  score: Points
  keptEntered: boolean
  onKeepEntered: () => void
  onReopen: () => void
  lock: TagLock
}) {
  const { mutateMatch } = useDemo()
  const entered = parseEntered(set.entered)
  const differs = setScoresDiffer(set)
  const tagged = derivePhase(match) === 'complete'
  const noResult = resultSetCount(match) === null
  const won = matchSetsWon(match)
  /** Only a result a match can end on is offered: not 1 - 0, not 1 - 1. */
  const realResult = isRealResult(won)

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border bg-bg-surface p-3 flex items-center justify-between gap-2">
        <p className="text-sm text-primary">
          {set.rallies.length} {set.rallies.length === 1 ? 'rally' : 'rallies'} · sets {formatScore(won)}
        </p>
        {lock ? null : (
          <Button size="sm" variant="ghost" onClick={onReopen}>
            Reopen set
          </Button>
        )}
      </div>
      {lock ? (
        <p className="rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary" role="status">
          {TAG_LOCK_LINE[lock]} Rallies still play.
        </p>
      ) : null}

      {differs && entered ? (
        <div className={flagClass} role="alert">
          <p>
            Entered {formatScore(entered)} · Tagged {formatScore(score)}
          </p>
          {keptEntered ? (
            <p className="text-xs text-muted">Kept. The set stays flagged in Details and on the checklist.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => mutateMatch(match.id, (m) => applyTaggedScore(m, set.setId))}>
                Use tagged score
              </Button>
              <Button size="sm" variant="ghost" onClick={onKeepEntered}>
                Keep entered
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {tagged ? (
        <div className="rounded-md border border-success bg-success/15 px-3 py-2 text-sm text-primary space-y-2">
          <p className="font-semibold">Match tagged · sets {formatScore(won)}</p>
          {noResult ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">No result entered.</span>
              {realResult ? (
                <Button size="sm" variant="secondary" onClick={() => mutateMatch(match.id, applyTaggedResult)}>
                  Use tagged result
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * After Finish set: carry on with the next set, or Finish match. The next set
 * leads until the tagged sets could be a finished match, then Finish match
 * leads. With a result entered the result alone decides Tagged, so Finish
 * match is not offered. Nor is it while the sets count is level.
 */
function FinishedActions({
  match,
  set,
  locked,
  onGo,
  onFinishMatch,
}: {
  match: MatchRecord
  set: SetData
  locked: boolean
  onGo: (to: string) => void
  onFinishMatch: () => void
}) {
  const tagged = derivePhase(match) === 'complete'
  /** A set already under way comes before a fresh one. */
  const next = setInProgress(match) ?? nextSetToTag(match, set.setId)
  const won = matchSetsWon(match)
  /** A match cannot end level, so at 1 - 1 (or with no set won) there is nothing to finish. */
  const canFinishMatch =
    resultSetCount(match) === null && setBlockingFinish(match) === null && won.me !== won.them
  const finishLeads = canFinishMatch && isRealResult(won)
  const base = `/matches/${match.id}`

  if (tagged || locked) {
    return (
      <div className="flex items-stretch gap-2">
        <Button className="h-12 flex-1 text-base" onClick={() => onGo(`${base}/insights/summary`)}>
          Open match Insights
        </Button>
        <Button variant="secondary" className="h-12" onClick={() => onGo(`${base}/tag`)}>
          Back to sets
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-stretch gap-2">
      {next ? (
        <Button
          variant={finishLeads ? 'secondary' : 'primary'}
          className={cn('h-12 text-base', !finishLeads && 'flex-1')}
          onClick={() => onGo(`${base}/tag/${next.setId}`)}
        >
          {setHasTagProgress(next) ? 'Continue' : 'Start'} set {next.setId}
        </Button>
      ) : null}
      {canFinishMatch ? (
        <Button
          variant={finishLeads || !next ? 'primary' : 'secondary'}
          className={cn('h-12 text-base', (finishLeads || !next) && 'flex-1')}
          onClick={onFinishMatch}
        >
          Finish match
        </Button>
      ) : null}
      <Button
        variant={next || canFinishMatch ? 'ghost' : 'primary'}
        className={cn('h-12', !next && !canFinishMatch && 'flex-1 text-base')}
        onClick={() => onGo(`${base}/tag`)}
      >
        {next || canFinishMatch ? 'Sets' : 'Back to sets'}
      </Button>
    </div>
  )
}

function SetHeader({ match, set, children }: SetHeaderProps) {
  return (
    <header className="h-11 px-2 flex items-center gap-2 border-b border-border bg-bg-app">
      <Link
        to={`/matches/${match.id}/tag`}
        aria-label="Back"
        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-brand hover:bg-pill-idle"
      >
        <Icon name="chevron-left" size="sm" />
      </Link>
      <div className="min-w-0 flex-1 flex items-baseline gap-2">
        <h1 className="text-base font-bold text-primary">Set {set.setId}</h1>
        <p className="text-xs text-muted truncate">{matchLabel(match)}</p>
      </div>
      {children}
    </header>
  )
}

/**
 * A set with nothing to play: its video was removed, or none was added yet.
 * Tags and score stay. Adding the video back brings the player with it.
 */
function SetWithoutVideo({ match, set, removed }: { match: MatchRecord; set: SetData; removed: boolean }) {
  const names: Record<Side, string> = { me: 'You', them: match.opponent.trim() || 'Opponent' }
  const score = taggedScore(set) ?? ZERO
  return (
    <div className="h-full flex flex-col bg-bg-app" data-tag-mode="no-video">
      <SetHeader match={match} set={set} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-3 py-4 space-y-3">
          <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-5 text-center space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">{removed ? 'Video removed' : 'No video yet'}</p>
              <p className="text-sm text-muted">
                {removed
                  ? 'Tags and score are kept. Add the video back to play or tag.'
                  : 'Add the match video to start tagging.'}
              </p>
            </div>
            <AddVideoChoice matchId={match.id} align="center" />
          </div>
          {removed ? (
            <>
              <p className="text-sm font-semibold text-primary" role="status">
                Set {set.setId}
                {set.finished ? ' finished' : ''} · {formatScore(score)}
              </p>
              <RallyList
                set={set}
                names={names}
                nextServer={serverAt(set.firstServer, score)}
                editingId={null}
                hasVideo={() => false}
                onOpen={() => undefined}
                finish={null}
                score={score}
                onFinish={() => undefined}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
