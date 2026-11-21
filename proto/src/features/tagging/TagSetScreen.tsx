import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { WfEmpty } from '@/layout/Wireframe'
import {
  emptySet,
  formatScore,
  matchSetsWon,
  taggedScore,
  useDemo,
  type MatchRecord,
  type SetData,
} from '@/data/demoStore'
import { SERVE_AFTER_S, SERVE_BEFORE_S, serveBands, expectedServer, leaveIds } from './continuity'
import {
  deleteRally,
  dropAfter,
  editStops,
  gapFitsRally,
  finishSet,
  flipFirstServer,
  gapWindow,
  type EditGapStop,
  latestVideoId,
  leaveMark,
  maxSetNumber,
  replaceRally,
  restoreSet,
  saveRally,
  setDraft,
  setFloorG,
  settleFinished,
  startSet,
} from './matchOps'
import { markBounds, markState } from './setMark'
import {
  CAPTURE_SPEED,
  CONTACT_IDLE_MS,
  MARK_LOOP_HALF_S,
  NORMAL_SPEED,
  SHOT_LOOP_HOLD_S,
  addContact,
  canSave,
  captureContactTime,
  emptyDraft,
  loopShotOf,
  tapIgnored,
  markTime,
  otherSide,
  rallyEnd,
  rallyFromDraft,
  rallyStart,
  retapStart,
  shotWindow,
  stageOf,
  winnerOf,
  undoContact,
  type Draft,
  type Mark,
  type RallyData,
  type Side,
  type Stage,
  type Wing,
} from './rally'
import { ZERO, addPoint, canSaveEarly, countPoints, isSetWon, setEndIndex, setOverOnRule, type Points } from './score'
import { bestPadRegions, editRallyRegions } from './BestPanel'
import { InputArea } from './InputArea'
import { tagRegions } from './inputModes'
import { RallyZone, type RallyState } from './RallyZone'
import { SetZone } from './SetZone'
import { BestTimingControl } from './BestTimingControl'
import {
  BEST_SHOT_RATE,
  bestAdvance,
  bestAt,
  bestDeleteLast,
  bestSwitchServer,
  bestHitters,
  bestLoop,
  bestRally,
  bestSetEnd,
  bestSetPoint,
  bestSetServer,
  carryBest,
  draftFromRally,
  editStopWindow,
  loadBestTiming,
  PART_LABEL,
  partWindow,
  partsOf,
  pointDone,
  removeBestContact,
  reviewFocusOf,
  routeAfter,
  saveBestTiming,
  setDepth,
  setWingStroke,
  stepEditStop,
  stepPart,
  toggleReview,
  withStep,
  type BestAt,
  type BestEnd,
  type BestLoopWhat,
  type BestPart,
  type BestTiming,
} from './bestFlow'
import { useActionGuard, type ActionGuard } from './pressGuard'
import { TAG_LOCK_LINE, useTagLock, type TagLock } from './tagLock'
import { firstContactG, lastContactG, segmentAt, segmentsOf, toGlobal, type Segment } from './timeline'
import { usePlayer, type Window } from './usePlayer'
import { PictureSeek, VideoStage } from './VideoStage'

type FlowName = 'bestfa'

/** Route entry: checks the set can be shown, then mounts the tagger per set. */
export function TagSetScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { matchId = '', setId = '1' } = useParams()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
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

/** The Start card's answers. Kept on screen only, and carried across a set number change. */
type StartPick = { videoId: string; score: Points; server: Side | null }

type Toast = { text: string; undo?: () => void; extra?: { label: string; run: () => void } }

const HINT_MS = 2500
/** Back, between rallies: far enough to see a serve again. */
const BACK_S = 5

/** Watching speed per match, kept while the app is open. */
const watchRates = new Map<string, number>()

/** A rally being added between two saved ones: the stretch of video it may use. */
type Gap = { index: number; a: number; b: number }
/** The stage-driven choice of what is selected after a change. */
function selectionAfter(prev: Stage, next: Stage, d: Draft, current: Mark | null): Mark | null {
  const end: Mark = { kind: 'shot', shot: d.contacts.length }
  // No result yet: End is open and no shot is. The last shot opens once a result is in.
  if (next === 'result') return null
  if (next === 'endShot') return end
  if (next === 'faShot' && d.fa !== null) return { kind: 'shot', shot: d.fa }
  if (next !== prev) return null
  return current
}

/** Any landscape window, and a square one. Portrait stays stacked. */
const LANDSCAPE_QUERY = '(orientation: landscape), (min-aspect-ratio: 1/1)'

function useLandscape() {
  const [land, setLand] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE_QUERY)
    const apply = () => setLand(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return land
}

type EditPick = { kind: 'rally'; id: string } | { kind: 'gap'; index: number }

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
  /** The address no longer picks a flow. Every rally is Best + FA. */
  const flowWanted: FlowName = 'bestfa'
  const { mutateMatch } = useDemo()
  const player = usePlayer(match.videos)
  const playerRef = useRef(player)
  const segs = player.segs
  const names: Record<Side, string> = { me: 'You', them: match.opponent.trim() || 'Opponent' }

  const [selected, setSelected] = useState<Mark | null>(null)
  /** After a nudge the loop tightens around the mark that moved. */
  const [tight, setTight] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [lastTap, setLastTap] = useState<number | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  /** Play or a seek reached the end of a complete mark before the set was won. */
  const [boundNote, setBoundNote] = useState(false)
  const [gap, setGap] = useState<Gap | null>(null)
  /** Switch pressed before the first tap: the server of the next rally only. */
  const [serverPick, setServerPick] = useState<Side | null>(null)
  /** Switch was pressed for the rally now being tagged, even if it was switched back. */
  const serverChosen = useRef(false)
  /**
   * The mode locked when tapping ended. Null between rallies, so the address
   * applies to the next one. Cleared on Save and on Discard.
   */
  const [flowLock, setFlowLock] = useState<FlowName | null>(null)
  /** Best + FA: loop timings, contact check, and add. */
  const [timing, setTiming] = useState(loadBestTiming)
  const landscape = useLandscape()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bestSpan, setBestSpan] = useState<{ a: number; b: number } | null>(null)
  /** The star's review mode. Freed by v0.17.17. Edit Rally and this are exclusive. */
  const [review, setReview] = useState(false)
  const [reviewFocus, setReviewFocus] = useState<BestPart | null>(null)
  const reviewRef = useRef(false)
  const reviewPlay = useRef<{ d: Draft; part: BestPart } | null>(null)
  const loopWhat = useRef<{ what: BestLoopWhat; rate: number } | null>(null)
  const setBestTiming = (next: BestTiming) => {
    setTiming(next)
    saveBestTiming(next)
  }
  const [bestLook, setBestLook] = useState(false)
  /** Edit Rally: the stop on screen, and where Done returns. */
  const [shotEdit, setShotEdit] = useState<{
    rallyId: string | null
    stop: number | 'end'
    back: 'question' | 'saved' | 'set'
  } | null>(null)
  const shotGuard = useActionGuard(shotEdit ? `shot:${shotEdit.rallyId ?? 'live'}` : 'off')
  /** Corner pad only: an End question opened again from its one-line reminder. */
  const [endBack, setEndBack] = useState<'end' | 'point' | null>(null)
  /**
   * The rally just saved. Its row stays until the next rally's first contact:
   * part buttons and ★ change the saved rally, a cell reopens the rally from `before`.
   */
  const [bestSaved, setBestSaved] = useState<{ rallyId: string; draft: Draft } | null>(null)
  /** Where capture resumed after Check, in the rally video. */
  const [start, setStart] = useState<StartPick>(
    () => initialStart ?? { videoId: latestVideoId(match) ?? '', score: ZERO, server: null }
  )
  /** Edit Set is on, standing on one rally or one gap. */
  const [editPick, setEditPick] = useState<EditPick | null>(null)
  /** The open draft is a change to this saved rally, not a new one. */
  const [editOf, setEditOf] = useState<string | null>(null)
  const rallyOneRef = useRef(false)
  rallyOneRef.current = gap && editPick?.kind === 'gap' ? gap.index === 0 : set.rallies.length === 0
  const tapGuardRef = useRef<ActionGuard | null>(null)
  const editGuardRef = useRef<ActionGuard | null>(null)
  /** Set before the walk starts, so the first rally uses the right pause. */
  const flowLockRef = useRef<FlowName | null>(null)
  flowLockRef.current = flowLock
  /** The speed chosen for watching between rallies. Tapping, Save and the next set do not lose it. */
  const watchRate = useRef<number>(watchRates.get(match.id) ?? NORMAL_SPEED)
  const body = useRef<HTMLDivElement>(null)

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
  const score = taggedScore(set) ?? ZERO
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
  /** A level score cannot be saved at the mark or the video end. */
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

  const latest = useRef({ live, set, match, floorG, segs, mode, selected, tight, nextServer, stage, flowWanted, review })
  useEffect(() => {
    playerRef.current = player
    latest.current = { live, set, match, floorG, segs, mode, selected, tight, nextServer, stage, flowWanted, review }
  })

  /** Play ran into the ceiling: the next saved rally, or the end of this set's mark. */
  const onCeil = () => {
    if (latest.current.mode === 'tapping') closeContacts()
    else if (gap || viewedGap) setHint('Stops at the next saved rally')
    else setBoundNote(true)
  }
  const ceilRef = useRef(onCeil)
  useEffect(() => {
    ceilRef.current = onCeil
  })
  useEffect(() => {
    const p = playerRef.current
    p.setFloor(floorG)
    const cap = gap ? Math.min(gap.b, markEnd ?? gap.b) : viewedGap ? viewedGap.b : markEnd
    p.setCeil(cap, () => ceilRef.current())
  }, [floorG, gap, viewedGap, markEnd])

  const offsetOf = (videoId: string, all: Segment[] = segs) => toGlobal(all, videoId, 0) ?? 0
  const durationOf = (videoId: string) => match.videos.find((v) => v.id === videoId)?.durationS ?? 0

  /** Best step loop, in match time. Shot loops play at 0.75x. A contact check plays at half speed. */
  const playBest = (d: Draft, what: BestLoopWhat, rate?: number) => {
    const speed = rate ?? (what === 'rally' ? 1 : BEST_SHOT_RATE)
    reviewPlay.current = null
    loopWhat.current = { what, rate: speed }
    const w = bestLoop(d, what, timing, speed)
    const off = offsetOf(d.videoId)
    const max = durationOf(d.videoId)
    const p = playerRef.current
    p.setBoundary(null)
    p.setRate(speed)
    const span = w.b > w.a ? w.b : w.a + 0.05
    const a = off + Math.max(0, w.a)
    const b = off + Math.min(max, span)
    setBestSpan({ a, b })
    p.setLoop({ a, b })
    p.seek(a)
    p.play()
  }
  /** Edit Rally loops the focused stop. Shot 1 starts a second before the serve. */
  const playEditStop = (d: Draft, stop: number | 'end') => {
    reviewPlay.current = null
    loopWhat.current = null
    const w = editStopWindow(d, stop, timing, SERVE_BEFORE_S, SERVE_AFTER_S)
    const off = offsetOf(d.videoId)
    const max = durationOf(d.videoId)
    const p = playerRef.current
    p.setBoundary(null)
    p.setRate(BEST_SHOT_RATE)
    const a = off + Math.max(0, w.a)
    const b = off + Math.min(max, Math.max(w.b, w.a + 0.3))
    setBestSpan({ a, b })
    p.setLoop({ a, b })
    p.seek(a)
    p.play()
  }
  /** Review loops the focused part at 1x. A part is several shots, so it is not the shot rate. */
  const playPart = (d: Draft, part: BestPart) => {
    const span = partsOf(d).find((item) => item.part === part)
    if (!span) return
    loopWhat.current = null
    reviewPlay.current = { d, part }
    const w = partWindow(d, span, timing, SERVE_BEFORE_S)
    const off = offsetOf(d.videoId)
    const max = durationOf(d.videoId)
    const p = playerRef.current
    p.setBoundary(null)
    p.setRate(1)
    const a = off + Math.max(0, w.a)
    const b = off + Math.min(max, Math.max(w.b, w.a + 0.3))
    setBestSpan({ a, b })
    p.setLoop({ a, b })
    p.seek(a)
    p.play()
  }
  const timingSeen = useRef(false)
  useEffect(() => {
    if (!timingSeen.current) {
      timingSeen.current = true
      return
    }
    const part = reviewPlay.current
    if (part) {
      playPart(part.d, part.part)
      return
    }
    const cur = loopWhat.current
    const d = latest.current.live
    if (!cur || !d) return
    playBest(d, cur.what, cur.rate)
    // Reapplies the loop that is already playing when Paul changes a timing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timing])

  /** The part of the video a rally being tagged should loop, in match time. */
  const windowFor = (d: Draft, sel: Mark | null, st: Stage, isTight: boolean): Window => {
    const off = offsetOf(d.videoId)
    const max = durationOf(d.videoId)
    const clamp = (w: Window): Window => ({
      a: off + Math.max(0, w.a),
      b: off + Math.min(max, Math.max(w.b, w.a + 0.3)),
      ...(w.hold ? { hold: w.hold } : {}),
    })
    if (sel && (sel.kind !== 'shot' || isTight)) {
      const at = markTime(d, sel)
      return clamp({ a: at - MARK_LOOP_HALF_S, b: at + MARK_LOOP_HALF_S })
    }
    // A shot being asked about, or a shot opened at Ready: only that shot.
    // The whole rally is the pick step, and Ready when nothing is open.
    const shot = loopShotOf(d, st, sel)
    if (shot) return clamp({ ...shotWindow(d, shot), hold: SHOT_LOOP_HOLD_S })
    return clamp({ a: rallyStart(d), b: rallyEnd(d) })
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
      p.seek(w.a)
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

  /** The saved row for the last rally with video: fixable until the next serve. */
  const savedRowOf = (s: SetData) => {
    const last = [...s.rallies].reverse().find((r) => !r.point && have.has(r.videoId))
    return last ? { rallyId: last.id, draft: draftFromRally(last) } : null
  }

  // A saved rally is the save point. On arrival anything unsaved is dropped and
  // the video waits, paused, at the end of the last saved rally.
  useEffect(() => {
    if (set.draft) mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    park(null, set.finished, floorG)
    setBestSaved(savedRowOf(set))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(id)
  }, [toast])

  // A message belongs to the rally on screen. It goes when that changes.
  const messageScene = live ? `live:${live.contacts[0] ?? ''}` : 'between'
  const messageHome = useRef(messageScene)
  const messageShown = useRef<Toast | null>(null)
  useEffect(() => {
    if (toast !== messageShown.current) {
      messageShown.current = toast
      messageHome.current = messageScene
      return
    }
    if (!toast) {
      messageHome.current = messageScene
      return
    }
    if (messageHome.current !== messageScene) setToast(null)
  }, [toast, messageScene])

  useEffect(() => {
    if (!hint) return
    const id = setTimeout(() => setHint(null), HINT_MS)
    return () => clearTimeout(id)
  }, [hint])

  const selKey = selected ? (selected.kind === 'shot' ? `shot-${selected.shot}` : selected.kind) : ''
  const stepKey = `${mode}:${stage ?? ''}:${selKey}`

  // Where the band still overflows, the section being asked stays in reach above the foot.
  useLayoutEffect(() => {
    const el = body.current
    if (el) el.scrollTop = el.scrollHeight
  }, [stepKey])

  /** Seeks for the user, and says in a few words when one is held back. */
  const seekTo = (g: number) => {
    if (latest.current.mode === 'tapping' && g > playerRef.current.getTime()) return
    const stop = playerRef.current.seek(g)
    if (stop === 'fence') setHint(set.rallies.length > 0 ? 'Stops at the last saved rally' : 'Stops at the start of the set')
    else if (stop === 'next' && gap) setHint('Stops at the next saved rally')
    else if (stop === 'next') setBoundNote(true)
    else if (stop === 'loop') setHint('Stays in this rally')
    else {
      setHint(null)
      setBoundNote(false)
    }
  }

  const onRate = (rate: number) => {
    playerRef.current.setRate(rate)
    if (!live) {
      watchRate.current = rate
      watchRates.set(match.id, rate)
    }
  }

  /** Writes the open rally. */
  const writeDraft = (next: Draft) => {
    if (readOnly) return
    mutateMatch(match.id, (m) => setDraft(m, set.setId, next))
  }

  /** Closes the rally. The second after the close ignores a tap. */
  const closeContacts = () => {
    const { live: d, set: s, match: m } = latest.current
    if (!d || d.closed || d.contacts.length === 0) return
    const wanted = latest.current.flowWanted
    const base = { ...d, closed: true, best: carryBest(d, {}) }
    const open: BestAt = routeAfter(base, rallyOneRef.current) ?? { step: 'end' }
    const closed: Draft = withStep(base, open)
    mutateMatch(m.id, (cur) => setDraft(cur, s.setId, closed))
    const p = playerRef.current
    p.setLoop(null)
    p.pause()
    p.setBoundary(null)
    setLastTap(null)
    flowLockRef.current = wanted
    setFlowLock(wanted)
    setSelected(null)
    setBestLook(false)
    playBest(closed, open)
  }

  // Two seconds with no tap closes the rally.
  useEffect(() => {
    if (mode !== 'tapping' || lastTap === null) return
    const id = setTimeout(() => {
      closeContacts()
    }, CONTACT_IDLE_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lastTap])

  /** The pad: plays when paused with nothing tapped, otherwise records a contact. */
  const onPad = () => {
    const p = playerRef.current
    if (mode !== 'watch' && mode !== 'tapping' && !(gap && editPick?.kind === 'gap')) return
    const tapped = live?.contacts.length ?? 0
    if (!p.isPlaying() && tapped === 0) {
      // Play becomes Tap serve under the finger. Arm before the next press.
      tapGuardRef.current?.arm()
      p.setRate(CAPTURE_SPEED)
      p.play()
      return
    }
    const g = p.getTime()
    const seg = segmentAt(segs, g)
    if (!seg) return
    const local = g - seg.offset
    const floorLocal = tapped > 0 ? live!.contacts[tapped - 1] : Math.max(0, floorG - seg.offset)
    // Reaction is video time. A slower playback speed does not shrink it.
    const latency = timing.reaction / 1000
    const stored = Math.round(captureContactTime(local, floorLocal, latency) * 100) / 100
    if (tapped > 0 && tapIgnored(live!, stored)) return
    const server = nextServer
    mutateMatch(match.id, (m) => {
      const s = m.sets.find((x) => x.setId === set.setId)
      const fresh = s?.draft && !s.draft.closed ? s.draft : emptyDraft(seg.id, server)
      const base = serverChosen.current ? { ...fresh, serveChecked: true } : fresh
      const added = addContact(base, stored)
      const flow = latest.current.flowWanted
      const stamped = { ...added, best: { ...(added.best ?? { flow }), flow } }
      return setDraft(m, set.setId, stamped)
    })
    if (tapped === 0) {
      setBestSaved(null)
      p.setRate(CAPTURE_SPEED)
      // A rally never spans two videos: the end of this one closes it.
      p.setBoundary(seg.offset + seg.duration, () => closeContacts())
    }
    if (!p.isPlaying()) p.play()
    setLastTap(Date.now())
  }

  /** Delete last while the rally is still being tapped. */
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

  const withUndo = (text: string, before: SetData, after?: () => void) =>
    setToast({
      text,
      undo: () => {
        mutateMatch(match.id, (m) => restoreSet(m, before))
        setToast(null)
        after?.()
      },
    })

  /** Write the working rally, and the saved rally when Edit Rally is on one. */
  const applyShotDraft = (d: Draft, rallyId: string | null) => {
    if (!rallyId) {
      writeDraft(d)
      return
    }
    const old = set.rallies.find((r) => r.id === rallyId)
    const winner = d.best?.point ?? winnerOf(d) ?? old?.winner
    if (!old || !winner) {
      writeDraft(d)
      return
    }
    const built = bestRally(d, rallyId, winner, Boolean(d.best?.kept))
    const next = old.left ? { ...built, left: old.left } : built
    mutateMatch(match.id, (m) => settleFinished(setDraft(replaceRally(m, set.setId, next), set.setId, d), set.setId))
  }

  const beginShotEdit = (rallyId: string | null, back: 'question' | 'saved' | 'set') => {
    if (readOnly) return
    let d: Draft | null = null
    if (rallyId) {
      const r = set.rallies.find((x) => x.id === rallyId)
      if (!r || r.point || !have.has(r.videoId)) return
      d = draftFromRally(r)
      writeDraft(d)
      setEditOf(rallyId)
      setBestSaved(null)
    } else if (live?.closed) {
      d = live
    } else return
    setShotEdit({ rallyId, stop: 1, back })
    setBestLook(false)
    playEditStop(d, 1)
  }

  /** Last shot deleted on a saved rally: End was cleared and is not saved yet. */
  const endStillOpen = () => {
    if (!shotEdit?.rallyId || !live || live.contacts.length === 0 || live.ending) return false
    setShotEdit({ ...shotEdit, stop: 'end' })
    playEditStop(live, 'end')
    setHint('Answer End first')
    return true
  }

  const closeShotEdit = () => {
    const cur = shotEdit
    if (!cur) return
    if (cur.back !== 'question' && endStillOpen()) return
    setShotEdit(null)
    if (cur.back === 'question' && live) {
      routeBest(live, { save: false })
      return
    }
    const rallyId = cur.rallyId
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    setEditOf(null)
    if (cur.back === 'set') {
      const r = set.rallies.find((x) => x.id === rallyId)
      if (r) loopPick(r)
      return
    }
    parkLive(set)
  }

  const stepShot = (by: -1 | 1) => {
    if (!shotEdit || !live) return
    const stop = stepEditStop(live.contacts.length, shotEdit.stop, by)
    setShotEdit({ ...shotEdit, stop })
    playEditStop(live, stop)
  }

  const shotRallyIndex = () => {
    if (!shotEdit) return -1
    if (!shotEdit.rallyId) return set.rallies.length
    return set.rallies.findIndex((r) => r.id === shotEdit.rallyId)
  }

  const onShotDelete = () => {
    if (!shotEdit || !live || readOnly || typeof shotEdit.stop !== 'number') return
    if (!shotGuard.allow()) return
    if (live.contacts.length < 2) return
    const before = set
    const shot = shotEdit.stop
    const removedLast = shot === live.contacts.length
    const next = removedLast ? bestDeleteLast(live) : removeBestContact(live, shot, false)
    const stop = removedLast ? ('end' as const) : Math.min(shot, next.contacts.length)
    if (shotEdit.rallyId && !removedLast) applyShotDraft(next, shotEdit.rallyId)
    else writeDraft(next)
    setShotEdit({ ...shotEdit, stop })
    playEditStop(next, stop)
    withUndo('Shot removed', before, () => {
      const back = before.draft
      if (back) playEditStop(back, shot)
    })
    shotGuard.arm()
  }

  const onShotKim = () => {
    if (!shotEdit || !live || readOnly) return
    if (!shotGuard.allow()) return
    const before = set
    const next = bestSwitchServer(live, false)
    const index = shotRallyIndex()
    applyShotDraft(next, shotEdit.rallyId)
    const name = names[next.server]
    const n = index < 0 ? 1 : index + 1
    const winners = shotEdit.rallyId
      ? set.rallies.map((r) => (r.id === shotEdit.rallyId ? otherSide(r.winner) : r.winner))
      : null
    const line = winners ? formatScore(countPoints(winners)) : formatScore(score)
    const text = `${name} served rally ${n} · ${line}`
    setToast({
      text,
      undo: () => {
        mutateMatch(match.id, (m) => restoreSet(m, before))
        setToast(null)
        const saved = shotEdit.rallyId ? before.rallies.find((r) => r.id === shotEdit.rallyId) : undefined
        const back = before.draft ?? (saved ? draftFromRally(saved) : null)
        if (back) playEditStop(back, shotEdit.stop)
      },
      extra:
        index > 0
          ? {
              label: 'Gaps',
              run: () => {
                const found = editStops(latest.current.match, latest.current.set.setId).gaps.find((g) => g.index === index)
                setShotEdit(null)
                setToast(null)
                mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
                setEditOf(null)
                if (found) loopGap(found)
              },
            }
          : undefined,
    })
    playEditStop(next, shotEdit.stop)
    shotGuard.arm()
  }

  const onShotOut = () => {
    if (!shotEdit?.rallyId || readOnly) return
    if (!shotGuard.allow()) return
    const before = set
    const id = shotEdit.rallyId
    mutateMatch(match.id, (m) => {
      const current = m.sets.find((s) => s.setId === set.setId)
      if (!current) return m
      return leaveIds(current.rallies, current.firstServer, id).reduce(
        (next, rallyId) => leaveMark(next, set.setId, rallyId, 'serve'),
        m
      )
    })
    withUndo('Left as served', before)
    shotGuard.arm()
  }

  const keepShot = (d: Draft) => {
    if (!shotEdit) return
    if (shotEdit.rallyId) applyShotDraft(d, shotEdit.rallyId)
    else writeDraft(d)
    playEditStop(d, shotEdit.stop)
  }

  const onShotEnd = (end: BestEnd) => {
    if (!shotEdit || !live || readOnly) return
    const before = set
    const next = bestSetEnd(live, end, shotRallyIndex() <= 0)
    keepShot(next)
    if (!shotEdit.rallyId) return
    const winners = set.rallies.map((r) => (r.id === shotEdit.rallyId ? (next.best?.point ?? r.winner) : r.winner))
    setToast({
      text: formatScore(countPoints(winners)),
      undo: () => {
        mutateMatch(match.id, (m) => restoreSet(m, before))
        setToast(null)
      },
    })
  }

  const onShotPoint = (side: Side) => {
    if (!shotEdit || !live || readOnly) return
    const before = set
    const tagged = winnerOf(live)
    const against = tagged !== null && side !== tagged
    const next = { ...live, best: carryBest(live, against ? { point: side, kept: true } : { point: side }) }
    keepShot(next)
    if (!shotEdit.rallyId) return
    const winners = set.rallies.map((r) => (r.id === shotEdit.rallyId ? side : r.winner))
    setToast({
      text: formatScore(countPoints(winners)),
      undo: () => {
        mutateMatch(match.id, (m) => restoreSet(m, before))
        setToast(null)
      },
    })
  }

  /**
   * Drops the taps of the rally being tagged and puts the video just before
   * the serve, so the same rally can be tapped again. Undo brings the taps back.
   * Saved rallies are left as they are.
   */
  const clearLiveRally = () => {
    if (!live || live.contacts.length === 0) return
    const p = playerRef.current
    const before = set.draft && !set.draft.closed ? { ...set, draft: { ...set.draft, closed: true } } : set
    const off = offsetOf(live.videoId)
    const at = off + retapStart(live, floorG > off ? floorG - off : null)
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    p.setLoop(null)
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.seek(at)
    // Rally one discarded: back to the Start card, paused just before that serve.
    if (set.rallies.length === 0) {
      setStart((s) => ({ ...s, server: null }))
      setServerPick(null)
      serverChosen.current = false
      p.pause()
    } else p.play()
    setSelected(null)
    setTight(false)
    setLastTap(null)
    // The same rally is tapped again, so it keeps the server it had.
    if (set.rallies.length > 0) setServerPick(live.server === expected ? null : live.server)
    setFlowLock(null)
    setToast({
      text: 'Taps cleared',
      undo: () => {
        mutateMatch(match.id, (m) => restoreSet(m, before))
        setToast(null)
        setFlowLock('bestfa')
        if (before.rallies.length === 0) {
          const server = live.server
          setStart((s) => ({ ...s, server }))
          serverChosen.current = true
        }
        park(before.draft, false, floorG)
      },
    })
  }

  /** Throws away the rally being tagged. Saved rallies stay. */
  const onDiscardProgress = () => {
    if (readOnly || !live || live.contacts.length === 0) return
    if (gap && editPick?.kind === 'gap') {
      const stop = stops.gaps.find((g) => g.index === gap.index)
      setBestLook(false)
      loopWhat.current = null
      setBestSpan(null)
      const before = set
      mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
      setLastTap(null)
      setFlowLock(null)
      setServerPick(null)
      serverChosen.current = false
      setToast({
        text: 'Taps cleared',
        undo: () => {
          mutateMatch(match.id, (m) => restoreSet(m, before))
          setToast(null)
          setGap(gap)
          setEditPick({ kind: 'gap', index: gap.index })
          park(before.draft, false, gap.a)
        },
      })
      if (stop) loopGap(stop)
      return
    }
    setBestLook(false)
    loopWhat.current = null
    setBestSpan(null)
    clearLiveRally()
  }

  /** Save writes the rally, moves the score and lets the video run on. */
  const commitRally = (rally: RallyData) => {
    const p = playerRef.current
    const before = set
    mutateMatch(match.id, (m) => saveRally(m, set.setId, rally))
    setFlowLock(null)
    setServerPick(null)
    serverChosen.current = false
    const endG = offsetOf(rally.videoId) + rally.contacts[rally.contacts.length - 1]
    const after = addPoint(score, rally.winner)
    p.setLoop(null)
    p.setBoundary(null)
    p.setRate(watchRate.current)
    if (endG < liveFloor) {
      // Added between saved rallies: it took its place in video order. Back to where live tagging was.
      setGap(null)
      p.setCeil(null)
      p.setFloor(liveFloor)
      p.seek(liveFloor)
      p.pause()
      setSelected(null)
      setTight(false)
      withUndo('Rally added', before, () => park(before.draft, false, liveFloor))
      return
    }
    setGap(null)
    p.setFloor(Math.max(floorG, endG))
    p.seek(endG)
    if (isSetWon(after)) p.pause()
    else p.play()
    setSelected(null)
    setTight(false)
  }

  const onSave = () => {
    if (flowWanted === 'bestfa') return
    if (!live || !canSave(live)) return
    const rally = rallyFromDraft(live, `r-${Date.now()}`)
    if (!rally) return
    commitRally(rally)
  }

  const rallyOneNow = () => (gap && editPick?.kind === 'gap' ? gap.index === 0 : set.rallies.length === 0)

  /**
   * After an answer or a fix: the first question not done opens, or the rally
   * saves when there is none. The loop restarts when the question, the contacts
   * or the agreement change.
   */
  const routeBest = (next: Draft, opts: { save?: boolean } = {}) => {
    if (!live) return
    const rallyOne = rallyOneNow()
    const r = bestAdvance(next, rallyOne)
    if (r.save && opts.save !== false) {
      saveBest(r.draft)
      return
    }
    const d = r.draft
    const was = bestAt(live, rallyOne)
    const now = bestAt(d, rallyOne)
    writeDraft(d)
    const moved =
      was.step !== now.step || was.page !== now.page || live.contacts.length !== d.contacts.length
    if (moved || bestLook) {
      setBestLook(false)
      playBest(d, now)
    }
  }

  /** The last answer: the rally is saved, the score moves and the video plays on. */
  const saveBest = (d0: Draft) => {
    const derived = winnerOf(d0)
    const winner = derived ?? d0.best?.point ?? null
    if (!d0.ending || !d0.best || !winner) return
    const kept = Boolean(d0.best.kept)
    const rally1 = set.rallies.length === 0
    let d = derived && d0.best.point !== derived ? { ...d0, best: carryBest(d0, { point: derived }) } : d0
    if (rally1) d = { ...d, serveChecked: true }
    if (editOf) {
      saveEdit(d, editOf, winner, kept)
      return
    }
    if (gap && editPick?.kind === 'gap') {
      const insertAt = gap.index
      const window = gap
      if (insertAt === 0) d = { ...d, serveChecked: true }
      const rally = bestRally(d, `r-${Date.now()}`, winner, kept)
      const flip = insertAt === 0 && d.server !== set.firstServer
      const before = set
      const apply = (m: MatchRecord) => {
        const base = flip ? flipFirstServer(m, set.setId) : m
        return settleFinished(setDraft(saveRally(base, set.setId, rally), set.setId, null), set.setId)
      }
      const after = setAfter(apply)
      mutateMatch(match.id, apply)
      setGap(null)
      setFlowLock(null)
      setServerPick(null)
      serverChosen.current = false
      setBestLook(false)
      setBestSaved(null)
      setSelected(null)
      setTight(false)
      const saved = after.rallies.find((r) => r.id === rally.id)
      const n = saved ? after.rallies.findIndex((r) => r.id === rally.id) + 1 : insertAt + 1
      const reopened = before.finished && !after.finished
      withUndo(
        reopened
          ? `Set ${set.setId} is open again at ${formatScore(taggedScore(after) ?? ZERO)}`
          : `Rally ${n} added`,
        before,
        () => {
          loopGap({ kind: 'gap', index: insertAt, n: insertAt + 1, a: window.a, b: window.b, likely: false, overlap: false })
        }
      )
      if (saved) loopPick(saved)
      return
    }
    const rally = bestRally(d, `r-${Date.now()}`, winner, kept)
    const opening = rally1 && start.server !== null
    const was = opening ? start.score : score
    const after = addPoint(was, winner)
    const winsNow = !isSetWon(was) && isSetWon(after)
    mutateMatch(match.id, (m) => {
      if (opening) return startSet(m, set.setId, rally, start.score)
      const base = rally1 && d.server !== set.firstServer ? flipFirstServer(m, set.setId) : m
      return saveRally(base, set.setId, rally)
    })
    setBestSaved({ rallyId: rally.id, draft: { ...d, closed: true } })
    setFlowLock(null)
    setServerPick(null)
    serverChosen.current = false
    setBestLook(false)
    setSelected(null)
    setTight(false)
    const p = playerRef.current
    const endG = offsetOf(rally.videoId) + rally.contacts[rally.contacts.length - 1]
    p.setLoop(null)
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.setFloor(Math.max(floorG, endG))
    p.seek(endG)
    if (winsNow) {
      // The picture plays on, but Save set does not wait for it.
      p.setBoundary(endG + 6, () => {
        p.setBoundary(null)
        p.pause()
      })
    }
    p.play()
  }

  /** Back to where tagging stands: paused at the end of the last saved rally, its row fixable. */
  const parkLive = (s: SetData) => {
    loopWhat.current = null
    setBestSpan(null)
    setBestLook(false)
    const at = s.mark ? (markBounds(match.videos, s.mark)?.start ?? markStart) : markStart
    park(null, s.finished, Math.max(at, setFloorG(match, s, at)))
    setBestSaved(s.finished ? null : savedRowOf(s))
  }

  /** The set as it stands once `fn` has run on it. */
  const setAfter = (fn: (m: MatchRecord) => MatchRecord): SetData =>
    fn(match).sets.find((s) => s.setId === set.setId) ?? set

  /** A saved rally the user changed. The score counts again from every winner, and the set may open or close. */
  const saveEdit = (d: Draft, rallyId: string, winner: Side, kept: boolean) => {
    const old = set.rallies.find((r) => r.id === rallyId)
    if (!old) return
    const next = bestRally(d, old.id, winner, kept)
    const apply = (m: MatchRecord) => settleFinished(setDraft(replaceRally(m, set.setId, next), set.setId, null), set.setId)
    const after = setAfter(apply)
    mutateMatch(match.id, apply)
    setEditOf(null)
    setEndBack(null)
    if (set.finished && !after.finished) {
      setToast({ text: `Set ${set.setId} is open again at ${formatScore(taggedScore(after) ?? ZERO)}` })
    }
    if (editPick !== null) loopPick(next)
    else parkLive(after)
  }

  /** Review marks on the saved row change the saved rally. The video keeps playing. */
  const updateSaved = (d: Draft) => {
    if (!bestSaved || readOnly) return
    const winner = d.best?.point
    const old = set.rallies.find((r) => r.id === bestSaved.rallyId)
    if (!winner || !old) return
    const next = bestRally(d, old.id, winner, Boolean(d.best?.kept))
    mutateMatch(match.id, (m) => replaceRally(m, set.setId, next))
    setBestSaved({ ...bestSaved, draft: d })
  }

  /** Edit Set: the picked rally loops at full speed. A review pill opens its first part. */
  const loopPick = (r: RallyData, partPick: 'marked' | 'first' = 'marked') => {
    setEditPick({ kind: 'rally', id: r.id })
    setGap(null)
    setBestSaved(null)
    const d = draftFromRally(r)
    if (reviewRef.current) {
      const part = partPick === 'first' ? (partsOf(d)[0]?.part ?? null) : reviewFocusOf(d)
      if (part) {
        setReviewFocus(part)
        playPart(d, part)
        return
      }
    }
    playBest(d, 'rally')
  }

  const clearReview = () => {
    reviewRef.current = false
    reviewPlay.current = null
    setReview(false)
    setReviewFocus(null)
  }

  /** A gap stop loops edge to edge at the watch speed, fenced inside itself. */
  const loopGap = (stop: EditGapStop) => {
    clearReview()
    if (live) {
      mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
      setEditOf(null)
    }
    setEditPick({ kind: 'gap', index: stop.index })
    setGap(null)
    setBestSaved(null)
    loopWhat.current = null
    setBestSpan(null)
    const p = playerRef.current
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.setFloor(stop.a)
    p.setCeil(stop.b, () => ceilRef.current())
    if (stop.overlap) {
      p.setLoop(null)
      p.seek(stop.a)
      p.pause()
      return
    }
    p.setLoop({ a: stop.a, b: stop.b })
    p.seek(stop.a)
    p.play()
  }

  /** The switch keeps the place: rally 5 pairs with the gap before rally 5. */
  const flipKind = (kind: 'rally' | 'gap') => {
    if (!editPick || editPick.kind === kind) return
    if (kind === 'rally') {
      const from = stops.gaps.find((g) => editPick.kind === 'gap' && g.index === editPick.index)
      const rally = (from ? stops.rallies.find((r) => r.n === from.n) : null) ?? stops.rallies[0]
      const row = rally ? set.rallies.find((r) => r.id === rally.id) : undefined
      if (row) loopPick(row)
      return
    }
    if (editPick.kind !== 'rally') return
    const from = stops.rallies.find((r) => r.id === editPick.id)
    if (!from) return
    const stop = stops.gaps.find((g) => g.n === from.n) ?? stops.gaps.find((g) => g.n > from.n) ?? null
    if (stop) loopGap(stop)
    else setHint('No gaps')
  }

  /** Rallies Edit Set can pick: saved, with video. */
  const pickable = set.rallies.filter((r) => !r.point && have.has(r.videoId))

  /** An insert that already has taps is not thrown away by stepping. */
  const insertHasTaps = () => {
    if (!(gap && live && live.contacts.length > 0)) return false
    setHint(`Save or discard rally ${gap.index + 1} first`)
    return true
  }

  const onEditSet = () => {
    if (editPick !== null) {
      if (live && !live.closed && live.contacts.length > 0) {
        setHint(`Save or discard rally ${gap ? gap.index + 1 : set.rallies.length + 1} first`)
        return
      }
      doneEdit()
      return
    }
    if (shotEdit) {
      if (endStillOpen()) return
      setShotEdit(null)
      mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
      setEditOf(null)
    } else if (live && !live.closed && live.contacts.length > 0) {
      setHint(`Save or discard rally ${set.rallies.length + 1} first`)
      return
    }
    const first = pickable[0]
    if (!first) {
      setHint('No rallies to edit yet')
      return
    }
    setToast(null)
    loopPick(first)
  }

  const stepList = editPick?.kind === 'gap' ? stops.gaps : stops.rallies
  const stepAt =
    editPick?.kind === 'gap'
      ? stops.gaps.findIndex((g) => g.index === editPick.index)
      : stops.rallies.findIndex((r) => r.id === pickedId)
  /** The pad's Edit rally N opens Edit Rally on shot 1. */
  const onPickEdit = () => {
    const r = pickable.find((row) => row.id === pickedId)
    if (r) beginShotEdit(r.id, 'set')
  }

  /** Back and Forward step only the kind the switch shows. */
  const stepPick = (by: -1 | 1) => {
    if (!editPick) return
    if (insertHasTaps()) return
    if (live) {
      mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
      setEditOf(null)
    }
    if (editPick.kind === 'rally') {
      const next = stops.rallies[stops.rallies.findIndex((r) => r.id === editPick.id) + by]
      const row = next ? set.rallies.find((r) => r.id === next.id) : undefined
      if (row) loopPick(row)
      return
    }
    const next = stops.gaps[stops.gaps.findIndex((g) => g.index === editPick.index) + by]
    if (next) loopGap(next)
  }

  const onGapSlot = (index: number) => {
    if (insertHasTaps()) return
    const stop = stops.gaps.find((g) => g.index === index)
    if (stop) loopGap(stop)
  }

  /** Before the first tap, Cancel leaves the insert and stands on the gap. */
  const cancelInsert = () => {
    if (!gap) return
    const stop = stops.gaps.find((g) => g.index === gap.index)
    if (stop) loopGap(stop)
    else setGap(null)
  }

  /** A tap on the seek bar picks the rally or the gap under the finger. */
  const pickAtTime = (g: number) => {
    if (!editPick || gap) return
    const all = segmentsOf(match.videos)
    const rally = set.rallies.find((r) => {
      if (r.point || !have.has(r.videoId)) return false
      const a = firstContactG(all, r)
      const b = lastContactG(all, r)
      return a !== null && b !== null && g >= a - 0.05 && g <= Math.max(a, b) + 0.05
    })
    if (rally) {
      loopPick(rally)
      return
    }
    const hit = stops.gaps.find((stop) => g >= stop.a - 0.05 && g <= stop.b + 0.05)
    if (hit) loopGap(hit)
  }

  const onDeletePicked = () => {
    if (readOnly || editPick?.kind !== 'rally') return
    const rally = stops.rallies.find((r) => r.id === editPick.id)
    if (!rally) return
    const before = set
    const apply = (m: MatchRecord) => settleFinished(deleteRally(m, set.setId, rally.id), set.setId)
    const after = setAfter(apply)
    mutateMatch(match.id, apply)
    const next = editStops(apply(match), set.setId)
    const stay = next.rallies.find((r) => r.n === rally.n) ?? next.rallies[next.rallies.length - 1]
    const row = stay ? after.rallies.find((r) => r.id === stay.id) : undefined
    const reopened = set.finished && !after.finished
    withUndo(
      reopened
        ? `Set ${set.setId} is open again at ${formatScore(taggedScore(after) ?? ZERO)}`
        : `Rally ${rally.n} deleted`,
      before,
      () => {
        const back = before.rallies.find((r) => r.id === rally.id)
        if (back) loopPick(back)
      }
    )
    if (row) loopPick(row)
    else doneEdit()
    editGuardRef.current?.arm()
  }

  /** Drop the change being made and go back to the rally as saved. */
  const cancelEdit = () => {
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    setEditOf(null)
    setEndBack(null)
    const r = set.rallies.find((x) => x.id === editOf)
    if (editPick !== null && r) loopPick(r)
    else parkLive(set)
  }

  const doneEdit = () => {
    if (endStillOpen()) return
    clearReview()
    setShotEdit(null)
    if (live) mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    setGap(null)
    setEditPick(null)
    setEditOf(null)
    setEndBack(null)
    playerRef.current.setLoop(null)
    parkLive(set)
  }

  /** Set over, Edit: Edit Set opens on the rally that ended it. */
  const onOverEdit = () => {
    const last = pickable[pickable.length - 1]
    if (last) loopPick(last)
  }

  /** Rallies saved past the set's end leave it. Undo brings them back. */
  const onDropAfter = () => {
    if (endIndex < 0) return
    const before = set
    mutateMatch(match.id, (m) => dropAfter(m, set.setId, endIndex))
    withUndo(`Rallies after rally ${endIndex + 1} removed`, before)
    parkLive(setAfter((m) => dropAfter(m, set.setId, endIndex)))
  }

  /** Overrun: open the rally that ended the set, so a wrong winner can be fixed. */
  const onOverrunEdit = () => {
    const row = set.rallies[endIndex]
    if (row && !row.point && have.has(row.videoId)) {
      beginShotEdit(row.id, 'saved')
      return
    }
    const fallback = [...set.rallies]
      .slice(0, Math.max(0, endIndex + 1))
      .reverse()
      .find((r) => !r.point && have.has(r.videoId))
    if (fallback) loopPick(fallback)
  }

  /** The rally picked in Edit Set, shown as saved. Review marks change it at once. */
  const pickDraft = mode === 'edit' && editRally ? draftFromRally(editRally) : null
  const updatePicked = (fn: (d: Draft) => Draft) => {
    if (!editRally || readOnly) return
    const d = fn(draftFromRally(editRally))
    const winner = d.best?.point ?? editRally.winner
    mutateMatch(match.id, (m) => replaceRally(m, set.setId, bestRally(d, editRally.id, winner, Boolean(d.best?.kept))))
  }

  /** Rally 1, after the taps: who served. The guard is the change off the tap pad. */
  const onBestServer = (side: Side) => {
    if (!live || readOnly) return
    if (!tapGuardRef.current?.allow()) return
    setServerPick(side)
    serverChosen.current = true
    routeBest(bestSetServer(live, side))
  }

  const onNotAShot = () => {
    if (!live || live.contacts.length < 2 || readOnly) return
    if (!shotGuard.allow()) return
    const before = set
    const rallyOne = before.rallies.length === 0
    setEndBack(null)
    routeBest(bestDeleteLast(live))
    withUndo('Shot removed', before, () => {
      const back = before.draft
      if (back?.closed) playBest(back, bestAt(back, rallyOne))
    })
    shotGuard.arm()
  }

  const onBestEnd = (end: BestEnd) => {
    if (!live) return
    setEndBack(null)
    routeBest(bestSetEnd(live, end, rallyOneNow()))
  }

  const onBestPoint = (side: Side) => {
    if (!live?.ending) return
    setEndBack(null)
    routeBest(bestSetPoint(live, side, rallyOneNow()))
  }

  const onBestStroke = (shot: number, wing: Wing, stroke: 'Attack' | 'Control') => {
    if (!live) return
    setEndBack(null)
    routeBest(setWingStroke(live, shot, wing, stroke))
  }

  const onBestServe = (depth: string, wing: Wing) => {
    if (!live) return
    routeBest(setDepth(live, depth, wing))
  }

  /** The rally on screen while the star can open review. */
  const reviewDraft = (): Draft | null => {
    if (shotEdit?.rallyId && live) return live
    if (pickDraft) return pickDraft
    if (bestRowSaved && bestSaved) return bestSaved.draft
    return null
  }

  const commitMark = (d: Draft) => {
    if (shotEdit?.rallyId) {
      applyShotDraft(d, shotEdit.rallyId)
      return
    }
    if (pickDraft && editRally) {
      updatePicked(() => d)
      return
    }
    if (bestSaved) updateSaved(d)
    else if (live?.closed) writeDraft(d)
  }

  const openReview = (d: Draft) => {
    const part = reviewFocusOf(d)
    if (!part) return
    reviewRef.current = true
    setReview(true)
    setReviewFocus(part)
    playPart(d, part)
  }

  /** Press the star. On, the parts take the shot row. Off, the mode underneath comes back. */
  const onReviewStar = () => {
    if (readOnly) return
    if (reviewRef.current) {
      reviewRef.current = false
      reviewPlay.current = null
      setReview(false)
      setReviewFocus(null)
      if (editPick?.kind === 'rally') {
        const row = set.rallies.find((r) => r.id === editPick.id)
        if (row) playBest(draftFromRally(row), 'rally')
        return
      }
      const d = reviewDraft()
      const p = playerRef.current
      p.setLoop(null)
      p.setRate(watchRate.current)
      if (d) p.seek(offsetOf(d.videoId) + rallyEnd(d))
      p.pause()
      return
    }
    if (shotEdit) {
      if (endStillOpen()) return
      const cur = shotEdit
      if (!cur.rallyId) return
      const row = set.rallies.find((r) => r.id === cur.rallyId)
      setShotEdit(null)
      mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
      setEditOf(null)
      if (!row) return
      if (cur.back === 'set') setEditPick({ kind: 'rally', id: row.id })
      else setBestSaved({ rallyId: row.id, draft: draftFromRally(row) })
      openReview(draftFromRally(row))
      return
    }
    const d = reviewDraft()
    if (d) openReview(d)
  }

  const stepReview = (by: -1 | 1) => {
    const d = reviewDraft()
    if (!d || !reviewFocus) return
    const parts = partsOf(d).map((span) => span.part)
    if (parts.length < 2) return
    jumpReview(stepPart(parts, reviewFocus, by))
  }

  /** A part chip, or Back and Forward, land on that part. The star stays on. */
  const jumpReview = (part: BestPart) => {
    const d = reviewDraft()
    if (!d) return
    if (!partsOf(d).some((span) => span.part === part)) return
    reviewRef.current = true
    setReviewFocus(part)
    playPart(d, part)
  }

  const onReviewMark = () => {
    const d = reviewDraft()
    if (!d || !reviewFocus || readOnly) return
    commitMark(toggleReview(d, reviewFocus))
  }

  /** Add rally: the video goes to the gap in front of rally `index`, fenced on both sides. */
  const onAddRally = (index: number) => {
    if (readOnly || live) return
    const w = gapWindow(match, set.setId, index)
    if (!w) return
    if (!gapFitsRally(w)) {
      setHint(w.overlap ? 'Rallies overlap' : 'No room for a rally')
      return
    }
    setToast(null)
    const p = playerRef.current
    p.setLoop(null)
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.setFloor(w.a)
    p.setCeil(w.b, () => ceilRef.current())
    p.seek(w.a)
    p.pause()
    setGap({ index, ...w })
    setSelected(null)
    setTight(false)
    setServerPick(null)
  }

  /** A set can be saved once it has a rally and nothing is open. A level score cannot. */
  const readyToFinish = !set.finished && !live && !draftGone && set.rallies.length > 0

  const onFinishSet = () => {
    if (!readyToFinish || readOnly || !saveEarly) return
    playerRef.current.pause()
    mutateMatch(match.id, (m) => finishSet(m, set.setId))
    navigate(`/matches/${match.id}/tag?from=${set.setId}`, { replace: true, state: { saved: set.setId } })
  }

  // Keys (desktop). Space is the pad. Backspace deletes a tap while tapping
  // and steps back 5 seconds between rallies. K plays or pauses, arrows step 10 seconds.
  const handlers = {
    onPad,
    onUndoTap,
    onSave,
    seekTo,
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
      const toggle = () => (p.isPlaying() ? p.pause() : p.play())
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (key === ' ') {
        e.preventDefault()
        if (e.repeat) return
        if (now.review) return
        if (now.mode === 'watch' || now.mode === 'tapping' || now.mode === 'setPoint') k.onPad()
        // While tagging, a Space that comes too late does nothing.
        else if (now.mode !== 'tagging') toggle()
      } else if (key === 'Enter') {
        if (now.mode !== 'tagging') return
        // Enter is Save here. It must not click whatever the mouse last pressed.
        e.preventDefault()
        if (e.repeat) return
        k.onSave()
      } else if (key === 'k') {
        toggle()
      } else if (key === 'Backspace') {
        // Delete last while tapping, and 5 seconds between rallies. Not while answering.
        if (now.mode === 'tapping') {
          e.preventDefault()
          k.onUndoTap()
        } else if (now.mode === 'watch') {
          e.preventDefault()
          k.seekTo(p.getTime() - BACK_S)
        }
      } else if (key === 'ArrowLeft') {
        k.seekTo(p.getTime() - 10)
      } else if (key === 'ArrowRight') {
        k.seekTo(p.getTime() + 10)
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
  const setsWon = matchSetsWon(match)
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
  /** The saved row shows until the next rally's first contact. */
  const bestRowSaved = Boolean(bestSaved && (!live || live.contacts.length === 0))
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
    saveOn: readyToFinish && saveEarly,
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
          <InputArea regions={area.regions} column={1} attrs={area.attrs} />
        </div>
      ) : null}
      <div className="tag-flow">
      <div className="tag-media">
        <VideoStage
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
            <BestTimingControl
                timing={timing}
                onChange={setBestTiming}
                open={settingsOpen}
                onOpen={setSettingsOpen}
              />
          }
          seek={
            <PictureSeek
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
      <SetZone
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
        onRally={
          reviewDraftNow
            ? (id) => {
                const row = set.rallies.find((r) => r.id === id)
                if (!row) return
                reviewRef.current = true
                loopPick(row, 'first')
              }
            : undefined
        }
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
        <RallyZone
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
            !atEndPad && (rallyState === 'saved' || rallyState === 'editing')
              ? () => {
                  if (reviewRef.current) {
                    reviewRef.current = false
                    reviewPlay.current = null
                    setReview(false)
                    setReviewFocus(null)
                  }
                  if (shotEdit) closeShotEdit()
                  else if (pickDraft && pickedId) beginShotEdit(pickedId, 'set')
                  else if (live?.closed) beginShotEdit(editOf, 'question')
                  else if (bestSaved) beginShotEdit(bestSaved.rallyId, 'saved')
                }
              : undefined
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
          onServer={
            insertingBare && gap && gap.index !== 0
              ? () => {
                  setServerPick(otherSide(nextServer))
                  serverChosen.current = true
                }
              : undefined
          }
        />
      </div>

      {landscape ? null : <InputArea regions={area.regions} attrs={area.attrs} />}
      </div>
      {landscape ? (
        <div className="pad-wing" data-pad-wing="right">
          <InputArea regions={area.regions} column={2} />
        </div>
      ) : null}
    </div>
  )
}

