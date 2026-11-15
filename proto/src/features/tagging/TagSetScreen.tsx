import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { WfEmpty } from '@/layout/Wireframe'
import {
  derivePhase,
  formatScore,
  parseEntered,
  resultSetCount,
  setRalliesWithoutVideo,
  setScoresDiffer,
  setState,
  taggedResult,
  taggedScore,
  taggedSetsWon,
  useDemo,
  type MatchRecord,
  type SetData,
} from '@/data/demoStore'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { matchLabel } from '@/features/match/matchChecks'
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
} from './matchOps'
import {
  CAPTURE_SPEED,
  CONTACT_IDLE_MS,
  MARK_LOOP_HALF_S,
  NORMAL_SPEED,
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
import { ZERO, addPoint, isPlausibleMatchWin, isSetWon, serverAt, type Points } from './score'
import { ShotPanel, TimeRow } from './ShotPanel'
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
  const [keepTaggingAt, setKeepTaggingAt] = useState<number | null>(null)
  const [keptEntered, setKeptEntered] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [lastTap, setLastTap] = useState<number | null>(null)

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
        : setWon && keepTaggingAt !== set.rallies.length
          ? 'setPoint'
          : 'watch'

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
      const w = windowFor(draft, null, st, false)
      p.setRate(CAPTURE_SPEED)
      p.setLoop(w)
      p.seek(Math.max(w.a, offsetOf(draft.videoId) + draft.contacts[draft.contacts.length - 1] - 1))
      setSelected(sel)
    } else {
      p.setRate(NORMAL_SPEED)
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
    const id = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(id)
  }, [toast])

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
    if (mode !== 'watch' && mode !== 'tapping') return
    const tapped = live?.contacts.length ?? 0
    if (!p.isPlaying() && tapped === 0) {
      p.play()
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
      p.setRate(NORMAL_SPEED)
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
    p.setRate(NORMAL_SPEED)
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
    p.setRate(NORMAL_SPEED)
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
    p.setRate(NORMAL_SPEED)
    p.setFloor(Math.max(floorG, endG))
    p.seek(endG)
    const atEntered =
      entered !== null && isSetWon(entered) && entered.me === after.me && entered.them === after.them
    if (isSetWon(after) || atEntered) p.pause()
    else p.play()
    setSelected(null)
    setTight(false)
    setKeepTaggingAt(null)
  }

  const onServer = () => {
    if (readOnly) return
    if (edit) writeDraft({ ...edit.draft, server: otherSide(edit.draft.server) })
    else if (!live) mutateMatch(match.id, (m) => flipFirstServer(m, set.setId))
  }

  const openRally = (r: RallyData, index: number) => {
    if (!have.has(r.videoId)) return
    const d = draftFromRally(r)
    setEdit({ id: r.id, index, draft: d, dirty: false })
    setSelected(null)
    setTight(false)
    setListOpen(false)
    const p = playerRef.current
    p.setBoundary(null)
    p.setRate(NORMAL_SPEED)
    const w = windowFor(d, null, 'ready', false)
    p.setLoop(w)
    p.seek(w.a)
    p.play()
  }

  const closeEdit = () => {
    setEdit(null)
    park(live, set.finished, floorG)
  }

  const onSaveEdit = () => {
    if (!edit || readOnly) return
    const rally = rallyFromDraft(edit.draft, edit.id)
    if (!rally) return
    mutateMatch(match.id, (m) => replaceRally(m, set.setId, rally))
    closeEdit()
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

  const onFinishSet = () => {
    setListOpen(false)
    playerRef.current.pause()
    mutateMatch(match.id, (m) => finishSet(m, set.setId))
    setKeptEntered(false)
  }

  const onKeepTagging = () => {
    setKeepTaggingAt(set.rallies.length)
    playerRef.current.play()
  }

  const onReopenSet = () => {
    if (readOnly) return
    mutateMatch(match.id, (m) => reopenSet(m, set.setId))
    setKeepTaggingAt(set.rallies.length)
    park(null, false, floorG)
  }

  // Keys (desktop): Space is the pad, Backspace undoes a tap, Enter saves,
  // 1 to 9 pick a shot, K plays or pauses, arrows step 10 seconds.
  const keys = useRef({ onPad, onUndoTap, onSave, onSaveEdit, onShot })
  useEffect(() => {
    keys.current = { onPad, onUndoTap, onSave, onSaveEdit, onShot }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const p = playerRef.current
      const now = latest.current
      const k = keys.current
      const toggle = () => (p.isPlaying() ? p.pause() : p.play())
      if (e.key === ' ') {
        e.preventDefault()
        if (now.mode === 'watch' || now.mode === 'tapping') k.onPad()
        else toggle()
      } else if (e.key === 'k' || e.key === 'K') {
        toggle()
      } else if (e.key === 'Backspace') {
        if (now.mode === 'tapping') {
          e.preventDefault()
          k.onUndoTap()
        }
      } else if (e.key === 'Enter') {
        if (target && target.tagName === 'BUTTON') return
        if (now.mode === 'tagging') k.onSave()
        else if (now.mode === 'edit') k.onSaveEdit()
      } else if (e.key === 'ArrowLeft') {
        p.seek(p.getTime() - 10)
      } else if (e.key === 'ArrowRight') {
        p.seek(p.getTime() + 10)
      } else if (/^[1-9]$/.test(e.key) && (now.mode === 'tagging' || now.mode === 'edit')) {
        k.onShot(Number(e.key))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
  const setsWon = taggedSetsWon(match)
  const atEnd = player.atEnd && (mode === 'watch' || mode === 'setPoint')
  const ready = stage === 'ready'
  const canFinishNow = !set.finished && !live && !draftGone && !edit && set.rallies.length > 0
  const tapped = live && !live.closed ? live.contacts.length : 0

  const status =
    mode === 'finished'
      ? `Set ${set.setId} finished · ${formatScore(score)}`
      : mode === 'setPoint'
        ? `Set ${set.setId} reached ${formatScore(score)}`
        : mode === 'blocked'
          ? 'Open rally · video removed'
          : mode === 'edit' && edit
            ? readOnly || (ready && !edit.dirty)
              ? `Rally ${edit.index + 1} · ${edit.draft.contacts.length} ${edit.draft.contacts.length === 1 ? 'shot' : 'shots'}`
              : `Rally ${edit.index + 1} · ${ready ? 'Ready to save changes' : statusText(edit.draft)}`
          : active
            ? statusText(active)
            : atEnd
              ? 'End of video'
              : player.playing
                ? 'Tap each contact'
                : `Set ${set.setId} · ${formatScore(score)}`

  const rallyList = (
    <RallyList
      set={set}
      names={names}
      nextServer={nextServer}
      editingId={edit?.id ?? null}
      hasVideo={(id) => have.has(id)}
      onOpen={openRally}
      canFinish={canFinishNow}
      score={score}
      onFinish={onFinishSet}
    />
  )

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
            onClick={() => setListOpen((v) => !v)}
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
          className="lg:shrink-0 lg:[&>div:first-child]:max-h-[52vh] lg:[&>div:first-child]:mx-auto"
        />
        <div className="hidden lg:block flex-1 min-h-0 overflow-y-auto">{rallyList}</div>
      </div>

      {/* Right on desktop, below on phone: rail, status, shot panel, pad or Save. */}
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
                  'h-9 px-2 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-100',
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
                  onClearFa={() => active.fa !== null && change(markFa(active, active.fa))}
                  onNoAttack={() => change(toggleNoAttack(active))}
                  onHighlight={() => writeDraft({ ...active, highlight: !active.highlight })}
                  readOnly={readOnly}
                />
              ) : mode !== 'watch' ? null : (
                <div className="py-1 flex" aria-label="Shots in this rally">
                  <span className="h-9 min-w-9 rounded-md border border-dashed border-border text-sm font-bold text-muted opacity-60 inline-flex items-center justify-center">
                    1
                  </span>
                </div>
              )}
            </div>
          </div>
          <p
            role="status"
            data-tag-status
            className={cn(
              'mb-1.5 rounded-md border-l-4 px-2 py-1 text-sm font-semibold',
              ready || mode === 'finished'
                ? 'border-success bg-success/15 text-primary'
                : active && active.closed
                  ? 'border-warning bg-warning/15 text-primary'
                  : 'border-border-strong bg-bg-card text-primary'
            )}
          >
            {status}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-2">
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
          {active && active.closed && selected?.kind === 'shot' && !readOnly ? (
            <ShotPanel draft={active} shot={selected.shot} names={names} onChange={change} onNudge={onNudge} />
          ) : null}
          {active && active.closed && selected && selected.kind !== 'shot' && !readOnly ? (
            <div className="rounded-md border border-border bg-bg-surface p-3">
              <TimeRow draft={active} mark={selected} onNudge={onNudge} />
            </div>
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
                      'w-full flex items-center justify-between gap-2 rounded-md border bg-bg-card px-2 py-1.5 text-left text-xs',
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
        </div>

        {toast ? (
          <div
            role="status"
            className="absolute left-2 right-2 bottom-28 z-20 flex items-center justify-between gap-3 rounded-md bg-neutral-100 text-neutral-950 px-3 py-2 text-sm shadow-lg"
          >
            <span>{toast.text}</span>
            <button type="button" className="font-bold underline" onClick={toast.undo}>
              Undo
            </button>
          </div>
        ) : null}

        {/* Bottom bar: the two controls pressed on every rally sit at the thumb. */}
        <div className="shrink-0 border-t border-border bg-bg-shell px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {mode === 'watch' || mode === 'tapping' ? (
            <div className="space-y-2">
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  data-tap-pad
                  onClick={onPad}
                  disabled={atEnd}
                  className={cn(
                    'relative flex-1 h-20 rounded-lg text-lg font-bold text-on-accent bg-brand-primary overflow-hidden active:scale-[0.99] border-l-8',
                    (live?.server ?? nextServer) === 'me' ? 'border-l-side-me' : 'border-l-side-them'
                  )}
                >
                  {atEnd
                    ? 'End of video'
                    : tapped > 0
                      ? `Tap shot ${tapped + 1}`
                      : player.playing
                        ? 'Tap serve'
                        : 'Play'}
                  {tapped > 0 && lastTap !== null ? (
                    <span
                      key={lastTap}
                      className="tag-idle-bar absolute left-0 right-0 bottom-0 h-1.5 bg-white/70"
                      aria-hidden
                    />
                  ) : null}
                </button>
                {tapped > 0 ? (
                  <Button variant="secondary" className="h-20 px-4" onClick={onUndoTap}>
                    <Icon name="undo" size="sm" />
                    Undo
                  </Button>
                ) : null}
              </div>
              {atEnd && canFinishNow ? (
                <Button fullWidth size="lg" onClick={onFinishSet}>
                  Finish at {formatScore(score)}
                </Button>
              ) : null}
            </div>
          ) : null}

          {mode === 'tagging' ? (
            <div className="flex items-stretch gap-2">
              <Button variant="secondary" className="h-12" onClick={onRetap}>
                Re-tap
              </Button>
              <Button variant="secondary" className="h-12" onClick={onDiscard}>
                Discard
              </Button>
              <Button className="h-12 flex-1 text-base" disabled={!ready} onClick={onSave}>
                Save
              </Button>
            </div>
          ) : null}

          {mode === 'blocked' ? (
            <div className="flex items-stretch gap-2">
              <Button variant="secondary" className="h-12" onClick={onDiscardGone}>
                Discard rally
              </Button>
              <Button
                variant="ghost"
                className="h-12 flex-1"
                onClick={() => navigate(`/matches/${match.id}/tag`)}
              >
                Back to sets
              </Button>
            </div>
          ) : null}

          {mode === 'edit' && edit && readOnly ? (
            <Button fullWidth variant="secondary" className="h-12" onClick={closeEdit}>
              Back to set
            </Button>
          ) : null}

          {mode === 'edit' && edit && !readOnly ? (
            <div className="flex items-stretch gap-2">
              <Button variant="secondary" className="h-12" onClick={closeEdit}>
                Back to live
              </Button>
              <Button variant="secondary" className="h-12" onClick={onDeleteEdit}>
                <Icon name="trash" size="sm" />
                Delete rally
              </Button>
              <Button
                className="h-12 flex-1 text-base"
                disabled={!ready || !edit.dirty}
                onClick={onSaveEdit}
              >
                Save changes
              </Button>
            </div>
          ) : null}

          {mode === 'setPoint' ? (
            <div className="flex items-stretch gap-2">
              <Button className="h-12 flex-1 text-base" onClick={onFinishSet}>
                Finish set
              </Button>
              <Button variant="secondary" className="h-12" onClick={onKeepTagging}>
                Keep tagging
              </Button>
            </div>
          ) : null}

          {mode === 'finished' ? (
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
            <div className="h-10 px-2 flex items-center justify-between border-b border-border">
              <p className="text-sm font-semibold text-primary">Set {set.setId}</p>
              <button
                type="button"
                aria-label="Close rallies"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-pill-idle"
                onClick={() => setListOpen(false)}
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
  canFinish,
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
  canFinish: boolean
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
        {canFinish ? (
          <Button size="sm" variant="ghost" onClick={onFinish}>
            Finish at {formatScore(score)}
          </Button>
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
            'w-full flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs disabled:opacity-60',
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
  const won = taggedSetsWon(match)
  /** Only a result a match can end on is offered: not 1 - 0, not 1 - 1. */
  const realResult = isPlausibleMatchWin(taggedResult(match) ?? won)

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
 * After Finish set: Start the next set, or Finish match. Start leads until
 * the tagged sets could be a finished match, then Finish match leads.
 * With a result entered the result alone decides Tagged, so Finish match
 * is not offered.
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
  const next = nextSetToTag(match, set.setId)
  const canFinishMatch =
    resultSetCount(match) === null && !match.sets.some((s) => setState(s) === 'progress')
  const finishLeads = canFinishMatch && isPlausibleMatchWin(taggedSetsWon(match))
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
          Start set {next.setId}
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
                canFinish={false}
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
