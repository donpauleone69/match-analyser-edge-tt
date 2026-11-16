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
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Icon, buttonKindTapPadSquare, buttonKindTextLink } from '@/ui-mine'
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
  GAP_REVIEW_RATE,
  SERVE_REVIEW_AFTER_S,
  SERVE_REVIEW_BEFORE_S,
  bandLine,
  breakForReview,
  reviewSwapLine,
  walkServes,
  breakIndexes,
  checkSet,
  expectedServer,
  leaveIds,
  longerFirst,
  openReview,
  pressReview,
  reviewHold,
  type ReviewState,
} from './continuity'
import {
  applyTaggedResult,
  applyTaggedScore,
  confirmServe,
  deleteRally,
  earlierSetsEnd,
  finishMatch,
  finishSet,
  flipFirstServer,
  gapWindow,
  insertRallyAt,
  lastSavedGlobal,
  leaveMark,
  nextSetToTag,
  reopenSet,
  replaceRally,
  restoreRally,
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
  SHOT_BADGE_S,
  SHOT_LOOP_HOLD_S,
  TAP_LATENCY_S,
  addContact,
  addContactWindow,
  addedContactText,
  addedContactTime,
  canSave,
  captureContactTime,
  draftFromRally,
  emptyDraft,
  hitterOf,
  insertContact,
  loopShotOf,
  reopenFaPick,
  shotAtTime,
  tapIgnored,
  faRefusal,
  faRefusalText,
  markFa,
  noAttackOffered,
  markTime,
  nudgeMark,
  otherSide,
  pointRally,
  rallyEnd,
  rallyFromDraft,
  rallyStart,
  retapStart,
  servesText,
  shotWindow,
  stageOf,
  statusText,
  toggleNoAttack,
  undoClosedContact,
  undoContact,
  type Draft,
  type Mark,
  type MarkKind,
  type RallyData,
  type Side,
  type Stage,
} from './rally'
import { RallyList, type RallyListActions } from './RallyList'
import { ZERO, addPoint, isSetWon, type Points } from './score'
import { AnswerKeyPanel } from './AnswerKeyPanel'
import { NO_ATTACK_KEY, applyPanelKey } from './shotKeys'
import { EndPanel, ShotPanel, TimeRow, TrimRow } from './ShotPanel'
import { ShotRail } from './ShotRail'
import { TAG_LOCK_LINE, useTagLock, type TagLock } from './tagLock'
import { firstContactG, lastContactG, segmentAt, segmentsOf, toGlobal, totalDuration, type Segment } from './timeline'
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

type Toast = { text: string; undo?: () => void; extra?: { label: string; run: () => void } }

/**
 * Presses are ignored for a moment after the control under the thumb changes,
 * so a tap meant for what was there never lands on what replaced it.
 */
const GUARD_AFTER_CLOSE_MS = 1000
const GUARD_AFTER_SWAP_MS = 600
const GUARD_PANEL_AFTER_CLOSE_MS = 500
/** The guard after the idle close looks it. A slot swap ignores presses and does not dim. */
const BUSY = 'opacity-40'
const HINT_MS = 2500
/** Back, between rallies: far enough to see a serve again. */
const BACK_S = 5

/** "3:20", for the video that is left. */
function minutesLeft(seconds: number): string {
  const t = Math.max(0, Math.round(seconds))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

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
type Editing = { id: string; index: number; draft: Draft; /** As opened, so Switch back clears dirty. */ baseline: Draft; dirty: boolean }

function editDirty(baseline: Draft, next: Draft, id: string): boolean {
  const a = rallyFromDraft(baseline, id)
  const b = rallyFromDraft(next, id)
  if (!a || !b) return true
  return JSON.stringify(a) !== JSON.stringify(b)
}
/** Where the video stood when the rally closed, to time a tap that comes after. */
type LateWindow = { until: number; at: number; g: number; playing: boolean }
/** A rally being added between two saved ones: the stretch of video it may use. */
type Gap = { index: number; a: number; b: number }
/** Review serves, then the two gaps, or Check gaps on its own. */
type ReviewRun =
  | { kind: 'ask'; rule: ReviewState<RallyData> }
  | {
      kind: 'gaps'
      gaps: number[]
      at: number
      /** The break still to leave, when this run came from Review serves. */
      breakId: string | null
      /** Next on a hint clears that hint. */
      hintRallyId: string | null
      pointAsk: boolean
    }
  | { kind: 'leave'; breakId: string }
type SetHeaderProps = { match: MatchRecord; set: SetData; children?: ReactNode }

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

function TagSet({ match, set, lock }: { match: MatchRecord; set: SetData; lock: TagLock }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cellsOutlined = searchParams.get('cells') === 'outlined'
  const { mutateMatch } = useDemo()
  const player = usePlayer(match.videos)
  const playerRef = useRef(player)
  const segs = player.segs
  const names: Record<Side, string> = { me: 'You', them: match.opponent.trim() || 'Opponent' }

  const [selected, setSelected] = useState<Mark | null>(null)
  /** End opened by a press. The result step shows End whether or not this is set. */
  const [endOpen, setEndOpen] = useState(false)
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
  /** Why a first attack press was refused. Shown on the status line until the step changes. */
  const [faSaid, setFaSaid] = useState<string | null>(null)
  /** Redraws when a guard starts and when it ends, so guarded controls can dim. */
  const [, setGuardTick] = useState(0)
  const guardTimers = useRef<number[]>([])
  /**
   * The second after the idle timer closes a rally. A tap in the slot then is
   * a contact that came late, not a press on Save, so it reopens tapping.
   */
  const [late, setLate] = useState<LateWindow | null>(null)
  const [gap, setGap] = useState<Gap | null>(null)
  /** Switch pressed before the first tap: the server of the next rally only. */
  const [serverPick, setServerPick] = useState<Side | null>(null)
  /** Switch was pressed for the rally now being tagged, even if it was switched back. */
  const serverChosen = useRef(false)
  const [lastSavedId, setLastSavedId] = useState<string | null>(null)
  const [review, setReviewState] = useState<ReviewRun | null>(null)
  const reviewRef = useRef<ReviewRun | null>(null)
  const setReview = (next: ReviewRun | null) => {
    reviewRef.current = next
    setReviewState(next)
  }
  /** Add contact is on: the taps it was started on, and the speed to go back to. */
  const [adding, setAdding] = useState<{ contacts: number[]; rate: number } | null>(null)

  const slotGuard = useRef(0)
  const panelGuard = useRef(0)
  /** Dim until this moment. Only the guard after the idle close sets it. */
  const closeGrey = useRef(0)
  /** The speed chosen for watching between rallies. Tapping, Save and the next set do not lose it. */
  const watchRate = useRef<number>(watchRates.get(match.id) ?? NORMAL_SPEED)
  const listResume = useRef(false)
  const body = useRef<HTMLDivElement>(null)
  const arm = (slotMs: number, panelMs = 0, greyMs = 0) => {
    const now = Date.now()
    slotGuard.current = Math.max(slotGuard.current, now + slotMs)
    panelGuard.current = Math.max(panelGuard.current, now + panelMs)
    if (greyMs > 0) closeGrey.current = Math.max(closeGrey.current, now + greyMs)
    for (const ms of [slotMs, panelMs, greyMs]) {
      if (ms > 0) guardTimers.current.push(window.setTimeout(() => setGuardTick((t) => t + 1), ms + 20))
    }
    setGuardTick((t) => t + 1)
  }
  useEffect(() => () => guardTimers.current.forEach((id) => window.clearTimeout(id)), [])

  const have = new Set(match.videos.map((v) => v.id))
  /** Rallies of this set whose video has been removed: tags kept, nothing to play. */
  const goneCount = setRalliesWithoutVideo(match, set)
  /** The open rally sits on a removed video: it cannot be tagged or tapped over. */
  const draftGone = set.draft !== null && !have.has(set.draft.videoId)
  const live = draftGone ? null : set.draft
  const readOnly = lock !== null
  const active = edit ? edit.draft : live
  const stage = active ? stageOf(active) : null
  /** End is on screen with no result, and whenever a press has opened it. */
  const showEnd = Boolean(
    active && active.closed && stage && stage !== 'contacts' && (stage === 'result' || endOpen)
  )
  const score = taggedScore(set) ?? ZERO
  const entered = parseEntered(set.entered)
  /** The set, walked in video order and marked where it does not add up. Nothing is changed by it. */
  const cont = checkSet(set.rallies, set.firstServer, segs, entered, set.finished)
  /** Who should serve next goes by what was tagged before the place the rally goes in. */
  const expected = expectedServer(set.rallies, set.firstServer, gap ? gap.index : set.rallies.length)
  const nextServer = serverPick ?? expected
  const liveFloor = lastSavedGlobal(match, set.setId)
  /** The video is fenced behind the last saved rally, or inside the gap a rally is being added in. */
  const floorG = gap ? gap.a : liveFloor
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
        : setWon && !gap && keptAt !== scoreKey(score)
          ? 'setPoint'
          : 'watch'
  /** Add contact holds only for the taps it was started on. Any other rally on screen ends it. */
  const addOn =
    adding !== null && active !== null && active.closed && !readOnly && adding.contacts === active.contacts
  /** What sits in the bottom slot. A change of it guards the slot for a moment. */
  const slotKind = addOn ? 'add' : mode === 'tagging' ? 'save' : mode === 'edit' || mode === 'finished' ? mode : 'pad'

  const latest = useRef({ live, set, match, floorG, segs, mode, selected, tight, edit, nextServer, stage })
  useEffect(() => {
    playerRef.current = player
    latest.current = { live, set, match, floorG, segs, mode, selected, tight, edit, nextServer, stage }
  })

  /** Play ran into the saved rally ahead of the gap. */
  const onCeil = () => {
    if (latest.current.mode === 'tapping') closeContacts()
    else setHint('Stops at the next saved rally')
  }
  const ceilRef = useRef(onCeil)
  useEffect(() => {
    ceilRef.current = onCeil
  })
  useEffect(() => {
    const p = playerRef.current
    p.setFloor(floorG)
    p.setCeil(gap ? gap.b : null, () => ceilRef.current())
  }, [floorG, gap])

  const offsetOf = (videoId: string, all: Segment[] = segs) => toGlobal(all, videoId, 0) ?? 0
  const durationOf = (videoId: string) => match.videos.find((v) => v.id === videoId)?.durationS ?? 0

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

  // A message belongs to the rally or review on screen. It goes when that changes:
  // the rally is saved, the next serve is tapped, a saved rally is opened or closed,
  // or a review is left. The next press inside a review is a new screen, so it replaces it.
  const messageScene = edit
    ? `edit:${edit.id}`
    : review
      ? `review:${review.kind}:${review.kind === 'ask' ? review.rule.cursor : review.kind === 'gaps' ? review.at : 0}`
      : live
        ? `live:${live.contacts[0] ?? ''}`
        : 'between'
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

  useEffect(() => {
    if (adding && !addOn) setAdding(null)
  }, [adding, addOn])

  useEffect(() => {
    if (!late) return
    const id = setTimeout(() => setLate(null), Math.max(0, late.until - Date.now()))
    return () => clearTimeout(id)
  }, [late])

  // The slot and the panel guard themselves whenever what they hold changes.
  // Result to wing and stroke is the one step that swaps nothing: those rows stay put.
  const selKey = selected ? (selected.kind === 'shot' ? `shot-${selected.shot}` : selected.kind) : ''
  const stepKey = `${mode}:${stage === 'result' || stage === 'endShot' ? 'end' : stage}:${selKey}`
  const lastSlot = useRef(slotKind)
  useEffect(() => setFaSaid(null), [stepKey])
  const lastStep = useRef(stepKey)
  useLayoutEffect(() => {
    if (lastSlot.current !== slotKind) arm(GUARD_AFTER_SWAP_MS)
    lastSlot.current = slotKind
    lastStep.current = stepKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotKind, stepKey])

  // Where the band still overflows, the section being asked stays in reach above the foot.
  useLayoutEffect(() => {
    const el = body.current
    if (el) el.scrollTop = el.scrollHeight
  }, [stepKey])

  /** Seeks for the user, and says in a few words when one is held back. */
  const seekTo = (g: number) => {
    if (latest.current.mode === 'tapping' && g > playerRef.current.getTime()) return
    const stop = playerRef.current.seek(g)
    if (stop === 'fence') setHint('Stops at the last saved rally')
    else if (stop === 'next') setHint('Stops at the next saved rally')
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
    if (edit) setEdit({ ...edit, draft: next, dirty: editDirty(edit.baseline, next, edit.id) })
    else mutateMatch(match.id, (m) => setDraft(m, set.setId, next))
  }

  /** A tag change, then the hand-over the real app does between steps. */
  const change = (next: Draft) => {
    if (!active) return
    const prev = stageOf(active)
    const st = stageOf(next)
    const sel = selectionAfter(prev, st, next, selected)
    const handoff = prev === 'result' && st !== 'result'
    writeDraft(next)
    setSelected(sel)
    // The first result swaps End for the last shot (or for nothing, on one shot).
    // A later result, pressed while End is open, does the same swap. Either way the band pauses.
    if (handoff || (endOpen && sel?.kind === 'shot' && active.ending !== next.ending)) {
      setEndOpen(false)
      arm(0, GUARD_AFTER_SWAP_MS)
    } else if (sel?.kind === 'shot') {
      setEndOpen(false)
    }
    setTight(false)
    setLate(null)
    applyLoop(windowFor(next, sel, st, false))
  }

  /** Closes the rally. Only the idle timer leaves the slot open to a late tap. */
  const closeContacts = (idle = false) => {
    const { live: d, set: s, match: m } = latest.current
    if (!d || d.closed || d.contacts.length === 0) return
    const closed = { ...d, closed: true }
    mutateMatch(m.id, (cur) => setDraft(cur, s.setId, closed))
    const p = playerRef.current
    const now = Date.now()
    setLate(idle ? { until: now + GUARD_AFTER_CLOSE_MS, at: now, g: p.getTime(), playing: p.isPlaying() } : null)
    p.setBoundary(null)
    const w = windowFor(closed, null, 'result', false)
    p.setLoop(w)
    p.seek(w.a)
    p.play()
    setSelected(null)
    setEndOpen(false)
    setLastTap(null)
    // A tap that comes late never lands on Save, Re-tap, Discard or a chip.
    arm(GUARD_AFTER_CLOSE_MS, GUARD_PANEL_AFTER_CLOSE_MS, GUARD_AFTER_CLOSE_MS)
  }

  /**
   * A tap in the slot in the second after the idle close: one more contact,
   * timed from where the video was, and tapping carries on.
   */
  const onLateTap = () => {
    const d = live
    const now = Date.now()
    if (!late || now >= late.until || !d || !d.closed || stageOf(d) !== 'result') return
    const seg = segs.find((x) => x.id === d.videoId)
    const g = late.g + (late.playing ? ((now - late.at) / 1000) * CAPTURE_SPEED : 0)
    if (!seg || g >= seg.offset + seg.duration) return
    const stored = Math.round(captureContactTime(g - seg.offset, d.contacts[d.contacts.length - 1]) * 100) / 100
    if (tapIgnored(d, stored)) return
    mutateMatch(match.id, (m) => setDraft(m, set.setId, addContact({ ...d, closed: false }, stored)))
    const p = playerRef.current
    p.setLoop(null)
    p.seek(g)
    p.setRate(CAPTURE_SPEED)
    p.setBoundary(seg.offset + seg.duration, () => closeContacts())
    p.play()
    setSelected(null)
    setEndOpen(false)
    setTight(false)
    setLate(null)
    // The pad is back for the same rally: the next tap may follow at once.
    slotGuard.current = 0
    panelGuard.current = 0
    closeGrey.current = 0
    lastSlot.current = 'pad'
    setLastTap(now)
  }

  // Two seconds with no tap closes the rally.
  useEffect(() => {
    if (mode !== 'tapping' || lastTap === null) return
    const id = setTimeout(() => closeContacts(true), CONTACT_IDLE_MS)
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
    if (tapped > 0 && tapIgnored(live!, stored)) return
    const server = nextServer
    mutateMatch(match.id, (m) => {
      const s = m.sets.find((x) => x.setId === set.setId)
      const fresh = s?.draft && !s.draft.closed ? s.draft : emptyDraft(seg.id, server)
      const base = serverChosen.current ? { ...fresh, serveChecked: true } : fresh
      return setDraft(m, set.setId, addContact(base, stored))
    })
    if (tapped === 0) {
      p.setRate(CAPTURE_SPEED)
      // A rally never spans two videos: the end of this one closes it.
      p.setBoundary(seg.offset + seg.duration, () => closeContacts())
    }
    if (!p.isPlaying()) p.play()
    setLastTap(Date.now())
  }

  /**
   * Delete last takes the last tap back, while tapping and after the rally closes.
   * After the close the tap before becomes the end shot and its result is asked.
   */
  const onUndoTap = () => {
    if (addOn) return
    if (edit) {
      // A saved rally keeps its serve: taking that away is Delete rally.
      if (!readOnly && edit.draft.contacts.length > 1) change(undoClosedContact(edit.draft))
      return
    }
    if (!live || live.contacts.length === 0) return
    const p = playerRef.current
    const removed = live.contacts[live.contacts.length - 1]
    if (live.closed) {
      if (live.contacts.length > 1) {
        change(undoClosedContact(live))
        return
      }
      // The only tap: the rally goes, and the video carries on from there.
      const before = set
      mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
      p.setLoop(null)
      p.setBoundary(null)
      p.setRate(watchRate.current)
      p.seek(offsetOf(live.videoId) + removed)
      p.play()
      setSelected(null)
      setLate(null)
      setServerPick(null)
      withUndo('Unsaved rally cleared', before, () => park(before.draft, false, floorG))
      return
    }
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
    if (!readOnly && stage === 'result') return
    if (!readOnly && stage === 'pickFa') return
    // While the last shot is being asked, a press does nothing unless End is what is open.
    if (!readOnly && stage === 'endShot' && !showEnd) return
    // After the press, the shot before or after moves the first attack.
    if (!readOnly && stage === 'faShot') {
      const refused = faRefusal(active, shot)
      setFaSaid(refused ? faRefusalText(refused) : null)
      if (!refused) {
        setEndOpen(false)
        change(markFa(active, shot))
      }
      return
    }
    const same = selected?.kind === 'shot' && selected.shot === shot
    const sel = same ? null : mark
    setEndOpen(false)
    setSelected(sel)
    setTight(false)
    applyLoop(windowFor(active, sel, stage, false))
  }

  /** Open End, or close it. With no result it stays open. Opening it closes any shot. */
  const onEnd = () => {
    if (!active || !stage || stage === 'contacts' || readOnly) return
    if (stage !== 'result' && endOpen) {
      setEndOpen(false)
      return
    }
    setEndOpen(true)
    if (selected) {
      setSelected(null)
      setTight(false)
      applyLoop(windowFor(active, null, stage, false))
    }
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

  /** Drop an open rally whose video is gone. */
  const onDiscardGone = () => {
    const before = set
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    withUndo('Rally discarded', before)
  }

  /**
   * Let: the taps are dropped, no point is counted, and the video carries on.
   * It is also the way out of a rally tapped by mistake. Undo brings it back.
   */
  const onLet = () => {
    if (!live || addOn) return
    const p = playerRef.current
    const before = set.draft && !set.draft.closed ? { ...set, draft: { ...set.draft, closed: true } } : set
    const off = offsetOf(live.videoId)
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    p.setLoop(null)
    p.setBoundary(null)
    p.setRate(watchRate.current)
    if (live.closed) p.seek(off + live.contacts[live.contacts.length - 1])
    p.play()
    setSelected(null)
    setLastTap(null)
    setLate(null)
    setServerPick(null)
    serverChosen.current = false
    setToast({
      text: 'Let, no point',
      undo: () => {
        mutateMatch(match.id, (m) => restoreSet(m, before))
        setToast(null)
        park(before.draft, false, floorG)
      },
    })
  }

  /**
   * Re-tap: the taps are dropped and the video goes back to just before the
   * serve, to tap the same rally again. Undo brings the taps back.
   */
  const onRetap = () => {
    if (!live || live.contacts.length === 0 || addOn) return
    const p = playerRef.current
    const before = set.draft && !set.draft.closed ? { ...set, draft: { ...set.draft, closed: true } } : set
    const off = offsetOf(live.videoId)
    const at = off + retapStart(live, floorG > off ? floorG - off : null)
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    p.setLoop(null)
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.seek(at)
    p.play()
    setSelected(null)
    setEndOpen(false)
    setTight(false)
    setLastTap(null)
    setLate(null)
    // The tap button takes the place of Discard and Save, so the next press waits a second.
    arm(GUARD_AFTER_CLOSE_MS)
    // The same rally is tapped again, so it keeps the server it had.
    if (set.rallies.length > 0) setServerPick(live.server === expected ? null : live.server)
    setToast({
      text: 'Taps cleared',
      undo: () => {
        mutateMatch(match.id, (m) => restoreSet(m, before))
        setToast(null)
        park(before.draft, false, floorG)
      },
    })
  }

  /** Save writes the rally, moves the score and lets the video run on. */
  const onSave = () => {
    if (!live || !canSave(live)) return
    const rally = rallyFromDraft(live, `r-${Date.now()}`)
    if (!rally) return
    const p = playerRef.current
    const before = set
    mutateMatch(match.id, (m) => saveRally(m, set.setId, rally))
    setLastSavedId(rally.id)
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
      setEndOpen(false)
      setTight(false)
      setKeptAt(null)
      arm(GUARD_AFTER_CLOSE_MS)
      withUndo('Rally added', before, () => park(before.draft, false, liveFloor))
      return
    }
    setGap(null)
    p.setFloor(Math.max(floorG, endG))
    p.seek(endG)
    const atEntered =
      entered !== null && isSetWon(entered) && entered.me === after.me && entered.them === after.them
    if (isSetWon(after) || atEntered) p.pause()
    else p.play()
    setSelected(null)
    setEndOpen(false)
    setTight(false)
    setKeptAt(null)
    arm(GUARD_AFTER_CLOSE_MS)
  }

  /**
   * Switch: the other player serves this rally. Only this rally changes; the
   * rallies after it follow from it. Before a set has a rally it sets who serves first.
   */
  const onSwitch = () => {
    if (readOnly) return
    // Editing a saved rally: the same Switch, for that rally only.
    serverChosen.current = true
    if (edit) {
      writeDraft({ ...edit.draft, server: otherSide(edit.draft.server), serveChecked: true })
      return
    }
    if (mode !== 'watch' && mode !== 'tagging') return
    if (set.rallies.length === 0) mutateMatch(match.id, (m) => flipFirstServer(m, set.setId))
    else if (!live) setServerPick(nextServer === expected ? otherSide(expected) : null)
    if (live) writeDraft({ ...live, server: otherSide(live.server), serveChecked: true })
  }

  /**
   * The last contact of the rally saved before the open one, in the open
   * rally's own video. An added contact never goes behind it.
   */
  const fenceOf = (d: Draft): number | null => {
    const prev = edit && edit.index > 0 ? set.rallies[edit.index - 1] : null
    const g = edit ? (prev ? (lastContactG(segs, prev) ?? 0) : earlierSetsEnd(match, set.setId)) : floorG
    const off = offsetOf(d.videoId)
    return g > off ? g - off : null
  }

  /** An added contact also stays in front of the saved rally that follows, and inside the video. */
  const ceilOf = (d: Draft): number => {
    const off = offsetOf(d.videoId)
    const max = durationOf(d.videoId)
    const next = edit ? set.rallies[edit.index + 1] : null
    const g = edit ? (next ? firstContactG(segs, next) : null) : gap ? gap.b : null
    return g !== null && g > off && g - off < max ? Math.max(0, g - off - 0.05) : max
  }

  /**
   * Add contact, for a missed serve or a missed contact anywhere in the rally.
   * The whole rally loops from 4 seconds before the first tap and the big
   * button takes one tap. Pressed again it is off, and nothing has changed.
   */
  const onAddContact = () => {
    if (!active || !active.closed || !stage || readOnly) return
    const p = playerRef.current
    if (addOn && adding) {
      setAdding(null)
      p.setRate(adding.rate)
      applyLoop(windowFor(active, selected, stage, tight))
      return
    }
    const off = offsetOf(active.videoId)
    const w = addContactWindow(active, fenceOf(active))
    // Same fence as the tap: not behind the previous rally, and before the next one.
    const end = Math.min(w.b, ceilOf(active))
    setAdding({ contacts: active.contacts, rate: player.rate })
    setLate(null)
    p.setRate(CAPTURE_SPEED)
    p.setLoop({ a: off + w.a, b: off + end })
    p.seek(off + w.a)
    p.play()
  }

  /** The tap while Add contact is on: one contact goes in, in time order, and tagging carries on. */
  const onAddTap = () => {
    if (!addOn || !adding || !active || readOnly) return
    const p = playerRef.current
    const was = active
    const wasEdit = edit
    const wasSelected = selected
    const t = addedContactTime(was, p.getTime() - offsetOf(was.videoId), fenceOf(was), ceilOf(was))
    const { draft: next, shot } = insertContact(was, t)
    const st = stageOf(next)
    // Ready: the new shot opens, so its time can be stepped. While a step is asked, that step's shot stays.
    const sel: Mark | null = st === 'ready' ? { kind: 'shot', shot } : selectionAfter('contacts', st, next, null)
    setAdding(null)
    p.setRate(adding.rate)
    writeDraft(next)
    setSelected(sel)
    setTight(false)
    setLate(null)
    applyLoop(windowFor(next, sel, st, false))
    setToast({
      text: addedContactText(was, next, shot, names),
      undo: () => {
        setToast(null)
        // Only while that rally is still the one open.
        const now = latest.current
        const open = now.edit ? now.edit.draft : now.live
        if (!open || open.videoId !== was.videoId || !open.contacts.includes(t)) return
        if (wasEdit) setEdit(wasEdit)
        else mutateMatch(match.id, (m) => setDraft(m, set.setId, was))
        setSelected(wasSelected)
        setTight(false)
        applyLoop(windowFor(was, wasSelected, stageOf(was), false))
      },
    })
  }

  const leaveGap = () => {
    if (!gap) return
    setGap(null)
    setServerPick(null)
    playerRef.current.setCeil(null)
    park(live, set.finished, liveFloor)
  }

  /** Add rally: the video goes to the gap in front of rally `index`, fenced on both sides. */
  const onAddRally = (index: number) => {
    if (readOnly || live || set.finished) return
    const w = gapWindow(match, set.setId, index)
    if (!w) return
    setEdit(null)
    setListOpen(false)
    listResume.current = false
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

  /** Add point: a point the camera missed. No video, only who won. It takes the server expected there. */
  const onAddPoint = (index: number, winner: Side) => {
    if (readOnly || set.finished) return
    const prev = set.rallies[index - 1]
    const next = set.rallies[index]
    const seg = segmentAt(segs, playerRef.current.getTime())
    const videoId = prev?.videoId ?? next?.videoId ?? seg?.id ?? match.videos[0].id
    const at = prev
      ? (prev.contacts[prev.contacts.length - 1] ?? prev.end) + 0.01
      : next
        ? Math.max(0, (next.contacts[0] ?? next.start) - 0.01)
        : Math.max(0, playerRef.current.getTime() - (seg?.offset ?? 0))
    const server = expectedServer(set.rallies, set.firstServer, index)
    const point = pointRally(`r-${Date.now()}`, videoId, Math.round(at * 100) / 100, server, winner)
    const before = set
    leaveGap()
    mutateMatch(match.id, (m) => insertRallyAt(m, set.setId, point, index))
    setLastSavedId(point.id)
    setKeptAt(null)
    withUndo('Point added', before)
  }

  const gapLength = (index: number): number | null => {
    const w = gapWindow(match, set.setId, index)
    return w ? w.b - w.a : null
  }

  /** Back to the open rally, or to where live tagging stood. */
  const endReview = () => {
    setReview(null)
    const p = playerRef.current
    p.setLoop(null)
    p.setRate(watchRate.current)
    park(live, set.finished, floorG)
  }

  const playServe = (r: RallyData) => {
    const p = playerRef.current
    p.setBoundary(null)
    p.setCeil(null)
    if (r.point || r.contacts.length === 0) {
      p.setLoop(null)
      p.pause()
      return
    }
    const contact = toGlobal(segs, r.videoId, r.contacts[0])
    if (contact === null) {
      p.pause()
      return
    }
    const off = offsetOf(r.videoId)
    const max = off + durationOf(r.videoId)
    const a = Math.max(off, contact - SERVE_REVIEW_BEFORE_S)
    const b = Math.min(max, Math.max(a + 0.3, contact + SERVE_REVIEW_AFTER_S))
    p.setRate(NORMAL_SPEED)
    p.setLoop({ a, b })
    p.seek(a)
    p.play()
  }

  const playGapAt = (index: number) => {
    const w = gapWindow(match, set.setId, index)
    const p = playerRef.current
    p.setBoundary(null)
    p.setCeil(null)
    if (!w) {
      p.setLoop(null)
      p.pause()
      return
    }
    p.setRate(GAP_REVIEW_RATE)
    p.setLoop(w)
    p.seek(w.a)
    p.play()
  }

  const reviewHoldLine = reviewHold({ draftOpen: set.draft !== null, editDirty: Boolean(edit?.dirty) })

  const openReviewRun = (run: ReviewRun) => {
    if (readOnly || set.finished || reviewHoldLine) return false
    setEdit(null)
    setAdding(null)
    setGap(null)
    setListOpen(false)
    listResume.current = false
    setToast(null)
    setReview(run)
    return true
  }

  const onReview = (band: { to: number }) => {
    const rule = openReview(set.rallies, set.firstServer, band.to)
    if (!openReviewRun({ kind: 'ask', rule })) return
    const rally = rule.rallies[band.to]
    if (rally) playServe(rally)
  }

  const onReviewPress = (press: 'same' | 'other') => {
    const run = reviewRef.current
    if (!run || run.kind !== 'ask' || run.rule.cursor === null) return
    const cursor = run.rule.cursor
    const before = run.rule.rallies[cursor]
    const next = pressReview(run.rule, press)
    const swapped = before.server !== next.rallies[cursor].server
    const firstChanged = next.firstServer !== run.rule.firstServer
    if (swapped || firstChanged) {
      const points = walkServes(next.rallies, next.firstServer).score
      setToast({
        text: reviewSwapLine(cursor + 1, names[next.rallies[cursor].server], formatScore(points), firstChanged),
      })
    }
    mutateMatch(match.id, (m) => {
      const confirmed = confirmServe(m, set.setId, before.id, swapped)
      if (next.firstServer === run.rule.firstServer) return confirmed
      return {
        ...confirmed,
        sets: confirmed.sets.map((s) =>
          s.setId === set.setId ? { ...s, firstServer: next.firstServer } : s
        ),
      }
    })
    if (next.stopped === null && next.cursor !== null) {
      setReview({ kind: 'ask', rule: next })
      playServe(next.rallies[next.cursor])
      return
    }
    if (next.gaps.length > 0) {
      const gaps = longerFirst(next.gaps, gapLength)
      const left = breakForReview(breakIndexes(next.rallies, next.firstServer), next.openedAt)
      const breakId = left === null ? null : next.rallies[left].id
      setReview({ kind: 'gaps', gaps, at: 0, breakId, hintRallyId: null, pointAsk: false })
      playGapAt(gaps[0])
      return
    }
    endReview()
  }

  const onCheckGaps = () => {
    const idxs: number[] = []
    for (let i = 1; i < set.rallies.length; i++) {
      if (gapWindow(match, set.setId, i)) idxs.push(i)
    }
    const gaps = longerFirst(idxs, gapLength)
    if (gaps.length === 0 || !openReviewRun({ kind: 'gaps', gaps, at: 0, breakId: null, hintRallyId: null, pointAsk: false })) {
      return
    }
    playGapAt(gaps[0])
  }

  const onCheckGap = (index: number) => {
    const hint = cont.marks.find((m) => m.kind === 'gap' && m.index === index)
    if (!openReviewRun({ kind: 'gaps', gaps: [index], at: 0, breakId: null, hintRallyId: hint?.rallyId ?? null, pointAsk: false })) {
      return
    }
    playGapAt(index)
  }

  const onReviewNext = () => {
    const run = reviewRef.current
    if (!run || run.kind !== 'gaps') return
    const at = run.at + 1
    if (at < run.gaps.length) {
      setReview({ ...run, at, pointAsk: false })
      playGapAt(run.gaps[at])
      return
    }
    if (run.hintRallyId) {
      mutateMatch(match.id, (m) => leaveMark(m, set.setId, run.hintRallyId as string, 'gap'))
      endReview()
      return
    }
    if (run.breakId) {
      setReview({ kind: 'leave', breakId: run.breakId })
      const p = playerRef.current
      p.pause()
      p.setLoop(null)
      p.setRate(watchRate.current)
      return
    }
    endReview()
  }

  const onReviewAddRally = () => {
    const run = reviewRef.current
    if (!run || run.kind !== 'gaps') return
    const index = run.gaps[run.at]
    endReview()
    onAddRally(index)
  }

  const onReviewLeave = () => {
    const run = reviewRef.current
    const id = run && (run.kind === 'leave' || run.kind === 'gaps') ? run.breakId : null
    if (id) {
      mutateMatch(match.id, (m) => {
        const current = m.sets.find((s) => s.setId === set.setId)
        if (!current) return m
        return leaveIds(current.rallies, current.firstServer, id).reduce(
          (next, rallyId) => leaveMark(next, set.setId, rallyId, 'serve'),
          m
        )
      })
    }
    endReview()
  }

  const listActions: RallyListActions | null =
    readOnly || set.finished
      ? null
      : {
          canAddRally: (index) => !live && gapWindow(match, set.setId, index) !== null,
          onAddRally,
          onReview,
          onCheckGaps,
          onCheckGap,
          hold: reviewHoldLine,
          onLeave: (id: string, kind: MarkKind) => mutateMatch(match.id, (m) => leaveMark(m, set.setId, id, kind)),
          onRestore: (id) => {
            leaveGap()
            mutateMatch(match.id, (m) => restoreRally(m, set.setId, id))
            setKeptAt(null)
          },
          onDeletePoint: (id) => {
            leaveGap()
            mutateMatch(match.id, (m) => deleteRally(m, set.setId, id))
          },
        }

  const showEdit = (next: Editing) => {
    setEdit(next)
    setSelected(null)
    setEndOpen(stageOf(next.draft) === 'result')
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
    if (!have.has(r.videoId) || r.point || (live && !live.closed)) return
    if (gap) {
      setGap(null)
      setServerPick(null)
    }
    const baseline = draftFromRally(r)
    showEdit({ id: r.id, index, draft: baseline, baseline, dirty: false })
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
    const prev = set.rallies.find((r) => r.id === edit.id)
    const kept: RallyData = {
      ...rally,
      ...(prev?.left ? { left: prev.left } : {}),
      ...(rally.serveChecked || prev?.serveChecked ? { serveChecked: true } : {}),
    }
    mutateMatch(match.id, (m) => replaceRally(m, set.setId, kept))
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
    setKeptAt(null)
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

  /** Pick step: the shot on screen a reaction earlier becomes the first attack. */
  const onPickFa = () => {
    if (!active || readOnly || stageOf(active) !== 'pickFa') return
    const shot = shotAtTime(active, playerRef.current.getTime() - offsetOf(active.videoId), TAP_LATENCY_S)
    const refused = faRefusal(active, shot ?? 0)
    setFaSaid(refused ? faRefusalText(refused) : null)
    if (!shot || refused) return
    change(markFa(active, shot))
  }

  const onNoAttack = () => {
    if (!active || readOnly || stageOf(active) !== 'pickFa') return
    change(toggleNoAttack(active))
  }

  /** Back to the same pick step. One way to change. */
  const onChangeFa = () => {
    if (!active || readOnly) return
    const next = reopenFaPick(active)
    if (next !== active) change(next)
  }

  const n = active ? active.contacts.length : 0
  /** No attack is the one row at the pick step, from three shots up. */
  const askNoAttack =
    active !== null &&
    active.closed &&
    !readOnly &&
    n >= 3 &&
    stage === 'pickFa' &&
    noAttackOffered(active)

  // Keys (desktop). Space is the pad. Backspace deletes a tap while tapping
  // and steps back 5 seconds between rallies. Enter saves whenever Save is
  // lit. 1 to 9 pick a shot, 0 is No attack. Top row is the result, home row
  // the wing, bottom row the stroke. In edit, [ and ] pick the marks and
  // - and = nudge. K plays or pauses, arrows step 10 seconds.
  const handlers = {
    late,
    onLateTap,
    onPad,
    onUndoTap,
    onLet,
    onSwitch,
    onSave,
    onSaveEdit,
    onShot,
    onMark,
    onNudge,
    onNoAttack,
    onAddContact,
    onAddTap,
    adding: addOn,
    onPickFa,
    reviewing: review !== null,
    onReviewSame: () => onReviewPress('same'),
    change,
    seekTo,
    askNoAttack,
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
      if (k.adding) {
        // Add contact is on: Space is the tap, Escape leaves it, and no other key reaches the rally.
        if (key === ' ') {
          e.preventDefault()
          if (!e.repeat && Date.now() >= slotGuard.current) k.onAddTap()
        } else if (key === 'Escape') {
          k.onAddContact()
        } else if (key === 'Backspace' || key === 'Enter') {
          e.preventDefault()
        }
        return
      }
      if (k.reviewing) {
        if (key === ' ' && !e.repeat) {
          e.preventDefault()
          k.onReviewSame()
        }
        return
      }
      if (key === ' ') {
        e.preventDefault()
        if (e.repeat) return
        if (k.late && now.mode === 'tagging') {
          k.onLateTap()
          return
        }
        if (Date.now() < slotGuard.current) return
        if (now.stage === 'pickFa' && (now.mode === 'tagging' || now.mode === 'edit')) {
          k.onPickFa()
          return
        }
        if (now.mode === 'watch' || now.mode === 'tapping' || now.mode === 'setPoint') k.onPad()
        // While tagging, the slot is Save: a Space that comes too late does nothing.
        else if (now.mode !== 'tagging') toggle()
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
        // Delete last while tapping, and 5 seconds between rallies. Not while answering.
        if (now.mode === 'tapping') {
          e.preventDefault()
          k.onUndoTap()
        } else if (now.mode === 'watch') {
          e.preventDefault()
          k.seekTo(p.getTime() - BACK_S)
        }
      } else if (key === 'p' && (now.mode === 'watch' || now.mode === 'tagging')) {
        if (!e.repeat && Date.now() >= slotGuard.current) k.onSwitch()
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
        if (k.askNoAttack) k.onNoAttack()
      } else if (key === '[' || key === ']') {
        // Trim belongs to a saved rally.
        if (now.mode === 'edit') k.onMark({ kind: key === '[' ? 'start' : 'end' })
      } else if ((key === '-' || key === '=') && now.mode === 'edit') {
        if (now.selected) k.onNudge(key === '-' ? -NUDGE_STEP_S : NUDGE_STEP_S)
      } else if (now.selected?.kind === 'shot') {
        const next = applyPanelKey(k.active, now.selected.shot, key)
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
        if (off === null || r.point) return []
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
  const reviewRally = review?.kind === 'ask' && review.rule.cursor !== null ? review.rule.rallies[review.rule.cursor] : null
  const shownServer = reviewRally ? reviewRally.server : edit ? edit.draft.server : (live?.server ?? nextServer)
  const setsWon = matchSetsWon(match)
  const atEnd = player.atEnd && (mode === 'watch' || mode === 'setPoint')
  const ready = stage === 'ready'
  const tapped = live && !live.closed ? live.contacts.length : 0
  /** Finish is offered in the panel at set point and when the video runs out. */
  const finishCard = canFinishNow && (mode === 'setPoint' || atEnd)
  /** After Keep tagging, while the score is still a winning one, Finish stays in reach. */
  const finishKept = canFinish && mode === 'watch' && setWon && !atEnd
  const slotGrey = Date.now() < closeGrey.current
  const panelBusy = Date.now() < panelGuard.current
  const setLine = `Set ${set.setId} · ${formatScore(score)}`
  /** The shot on screen while a closed rally loops. */
  const playLocal = active ? player.time - offsetOf(active.videoId) : 0
  const liveShot =
    active && active.closed ? active.contacts.filter((c) => c <= playLocal + 0.05).length || null : null
  const asked = active && stage ? loopShotOf(active, stage, selected) : null
  const askedAt = asked && active ? active.contacts[asked - 1] : null
  /**
   * The badge is armed before the contact and starts when the playhead reaches it.
   * It stays for SHOT_BADGE_S on the clock, whatever the video speed.
   */
  const badgeClock = useRef<{ shot: number; contact: number; until: number; armed: boolean }>({
    shot: 0,
    contact: -1,
    until: 0,
    armed: true,
  })
  const [badgeTick, setBadgeTick] = useState(0)
  useEffect(() => {
    const clock = badgeClock.current
    if (!asked || askedAt === null) {
      clock.until = 0
      clock.armed = true
      return
    }
    if (clock.shot !== asked || clock.contact !== askedAt) {
      clock.shot = asked
      clock.contact = askedAt
      clock.until = 0
      clock.armed = true
    }
    if (playLocal < askedAt - 0.15) clock.armed = true
    if (!clock.armed || playLocal < askedAt - 0.05) return
    clock.armed = false
    clock.until = performance.now() + SHOT_BADGE_S * 1000
    setBadgeTick((n) => n + 1)
    window.setTimeout(() => setBadgeTick((n) => n + 1), SHOT_BADGE_S * 1000)
  }, [asked, askedAt, playLocal])
  const shotBadge =
    active && asked && badgeTick >= 0 && badgeClock.current.shot === asked && performance.now() < badgeClock.current.until
      ? { shot: asked, side: hitterOf(active.server, asked) }
      : null
  const loopNow =
    active && stage && (mode === 'tagging' || mode === 'edit') ? windowFor(active, selected, stage, tight) : null
  /** Where am I: one line, between rallies and on coming back. */
  const whereLine = [
    setLine,
    servesText(names, live?.server ?? nextServer),
    `${set.rallies.length} saved`,
    `${minutesLeft(totalDuration(segs) - player.time)} left`,
  ].join(' · ')
  const lastSavedIndex = (() => {
    const i = lastSavedId ? set.rallies.findIndex((r) => r.id === lastSavedId) : -1
    return i >= 0 ? i : set.rallies.length - 1
  })()
  const lastSaved = set.rallies[lastSavedIndex] ?? null
  const noteBand =
    cont.bands.find((b) => lastSavedIndex >= b.from && lastSavedIndex <= b.to) ?? null
  const gapIndex = review?.kind === 'gaps' ? review.gaps[review.at] : null
  const reviewLine =
    review?.kind === 'ask' && review.rule.cursor !== null
      ? `Rally ${review.rule.cursor + 1} serve`
      : review?.kind === 'gaps' && gapIndex !== null
        ? `Gap before rally ${gapIndex + 1}`
        : review?.kind === 'leave'
          ? 'Neither gap has the rally'
          : null

  const summaryText = active
    ? `${active.contacts.length} ${active.contacts.length === 1 ? 'shot' : 'shots'}${
        active.fa !== null ? ` · First attack shot ${active.fa}` : active.noAttack ? ' · No attack' : ''
      }`
    : ''
  const status = reviewLine
    ? reviewLine
    : faSaid && active && (stage === 'pickFa' || stage === 'faShot')
      ? faSaid
    :
    mode === 'finished'
      ? `Set ${set.setId} finished · ${formatScore(score)}`
      : mode === 'setPoint'
        ? `Set ${set.setId} reached ${formatScore(score)}`
        : mode === 'blocked'
          ? setLine
          : mode === 'edit' && edit
            ? addOn
              ? `Rally ${edit.index + 1} · Adding a contact`
              : readOnly || (ready && !edit.dirty)
              ? `Rally ${edit.index + 1} · ${edit.draft.contacts.length} ${edit.draft.contacts.length === 1 ? 'shot' : 'shots'}`
              : `Rally ${edit.index + 1} · ${ready ? 'Ready to save changes' : statusText(edit.draft)}`
          : active
            ? addOn
              ? 'Adding a contact'
              : mode === 'tagging' && ready && !faSaid
                ? summaryText
                : statusText(active)
            : gap
              ? `Add rally before rally ${gap.index + 1}`
              : player.playing && !atEnd
                ? 'Tap each contact'
                : setLine

  const rallyList = (
    <>
    <RallyList
      set={set}
      names={names}
      segs={segs}
      marks={cont.marks}
      scoreMark={cont.score}
      nextServer={cont.next}
      editingId={edit?.id ?? null}
      addingAt={gap ? gap.index : null}
      hasVideo={(id) => have.has(id)}
      onOpen={openRally}
      finish={!canFinishNow || finishCard || finishKept ? null : level ? 'level' : 'ok'}
      score={score}
      onFinish={onFinishSet}
      actions={listActions}
    />
    <AnswerKeyPanel videos={match.videos} rallies={set.rallies} names={names} />
    </>
  )
  const padServer = edit ? edit.draft.server : live?.server ?? nextServer
  const switchWarn =
    !readOnly && (mode === 'watch' || mode === 'tagging') && !atEnd && padServer !== expected
  const switchWarnRally = gap ? gap.index + 1 : set.rallies.length + 1
  const switchOn = !readOnly && !atEnd && (mode === 'watch' || mode === 'tagging' || mode === 'edit')
  const rowButton = cn('px-3 shrink-0', slotGrey && BUSY)
  /** The right end of the status row always means "go back": 5 seconds, or one tap. One width, so the spot does not shift. Let never sits there. */
  const endButton = cn(rowButton, 'w-24 lg:w-36')
  /** The four rally actions: one width each, the label on two lines where it needs them. */
  const actionButton = cn('w-14 shrink-0 px-0.5 text-xs leading-tight text-center', slotGrey && BUSY)
  /** Slot controls never change size, not even while pressed. The height is the tap pad. */
  const slotButton = cn('rounded-lg text-lg active:scale-100 active:brightness-90', slotGrey && !late && BUSY)
  /** Watch, tapping and answering use the plain words line. Edit and the special states keep the built band. */
  const livePlain = !review && (mode === 'watch' || mode === 'tapping' || mode === 'tagging')
  const refusalLine = Boolean(faSaid && stage === 'faShot')
  const lineHidden = livePlain && (selected?.kind === 'shot' || showEnd) && !refusalLine
  const changeOffered = Boolean(
    !readOnly && ready && n >= 3 && active && (active.fa !== null || active.noAttack)
  )
  const lineButton =
    'btn-kind-control shrink-0 rounded-md border border-border bg-transparent px-3 text-sm font-medium text-primary'

  return (
    <div
      className="tag-set bg-bg-app"
      data-tag-mode={mode}
      data-cells={cellsOutlined ? 'outlined' : undefined}
      data-tag-stage={stage ?? ''}
      data-tag-adding={addOn ? '' : undefined}
      data-review={review?.kind ?? ''}
      data-playing={player.playing}
      data-rate={player.rate}
      data-time={player.time}
      data-contacts={active?.contacts.join(',') ?? ''}
      data-loop-a={loopNow ? loopNow.a.toFixed(3) : ''}
      data-loop-b={loopNow ? loopNow.b.toFixed(3) : ''}
      data-fa={active?.fa ?? ''}
      data-no-attack={active?.noAttack ? 'yes' : 'no'}
    >
      {/* Left on desktop, top on phone: header, picture, timeline, rally list. */}
      <div className="tag-media">
        <SetHeader match={match} set={set}>
          <Button
            size="sm"
            variant="secondary"
            className="tag-narrow-only px-3"
            aria-expanded={listOpen}
            onClick={() => (listOpen ? closeList() : openList())}
          >
            <Icon name="list" size="xs" />
            Rallies {set.rallies.length}
            {cont.checkCount > 0 ? (
              <span className="rounded-full bg-warning px-1.5 text-[10px] font-bold text-neutral-950" data-mark-count>
                {cont.checkCount}
              </span>
            ) : null}
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
          noForward={mode === 'tapping'}
          onRate={onRate}
          highlightOn={Boolean(active && active.closed && (!readOnly || active.highlight))}
          highlight={Boolean(active?.highlight)}
          onHighlight={() => active && writeDraft({ ...active, highlight: !active.highlight })}
          readOnlyHighlight={readOnly || stage === 'result' || stage === 'endShot'}
          badge={shotBadge}
        />
        <div className="tag-side-list">{rallyList}</div>
      </div>

      {/* Right on a wide screen, below on a phone: rail, status, panel, then one slot. */}
      <div className="tag-entry">
        <div className="shrink-0 bg-bg-app px-2 pt-1.5">
          {/* The shot row. Delete last sits at the right only while contacts are being tapped. */}
          {active || mode === 'watch' ? (
            <div className="flex items-start">
              <div className="min-w-0 flex-1">
                <ShotRail
                  draft={active}
                  selected={selected}
                  liveShot={liveShot}
                  endOpen={showEnd}
                  onShot={onShot}
                  onEnd={onEnd}
                />
              </div>
              {mode === 'tapping' ? (
                <button
                  type="button"
                  data-action="delete-last"
                  className="btn-kind-control shrink-0 px-2 text-xs font-semibold text-muted"
                  onClick={onUndoTap}
                >
                  Delete last
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* The white band. One line under the shot row, then the column down to the foot. */}
        <div
          ref={body}
          data-tag-body
          className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-border bg-bg-surface px-2 [overflow-anchor:none]"
          onClickCapture={guardClicks(panelGuard)}
        >
          {/* Status, with the rally's second-rank actions beside it, away from the thumb. */}
          <div
            className={cn(
              'flex gap-1.5',
              livePlain ? 'mt-2.5 min-h-[var(--btn-kind-control)] items-center' : 'mb-1.5 items-stretch',
              livePlain ? lineHidden && 'hidden' : mode !== 'edit' && (selected?.kind === 'shot' || showEnd) && 'hidden'
            )}
            onClickCapture={guardClicks(slotGuard)}
          >
            <p
              role="status"
              data-tag-status
              data-fa-summary={livePlain && mode === 'tagging' && ready ? '' : undefined}
              className={cn(
                'min-w-0 flex-1 text-sm leading-tight',
                livePlain
                  ? 'flex items-center font-normal text-primary'
                  : cn(
                      'flex min-h-[var(--btn-kind-control)] items-center rounded-md border-l-4 px-2 py-1 font-semibold',
                      ready || mode === 'finished'
                        ? 'border-success bg-success/15 text-primary'
                        : active && active.closed
                          ? 'border-warning bg-warning/15 text-primary'
                          : 'border-border-strong bg-bg-card text-primary'
                    )
              )}
            >
              {status}
            </p>
            {mode === 'watch' && gap ? (
              <Button kind="control" variant="secondary" className={rowButton} onClick={leaveGap}>
                Back to live
              </Button>
            ) : null}
            {mode === 'watch' && !atEnd ? (
              <Button
                kind="control"
                variant="secondary"
                className={cn(endButton, 'whitespace-nowrap px-2')}
                aria-label="Back 5 seconds"
                onClick={() => seekTo(playerRef.current.getTime() - BACK_S)}
              >
                <Icon name="rewind" size="sm" />
                Back 5s
              </Button>
            ) : null}
            {livePlain && (mode === 'tapping' || (mode === 'tagging' && stage === 'pickFa')) && !refusalLine ? (
              <button type="button" data-foot="discard" className={cn(lineButton, 'w-[4.625rem]')} onClick={onRetap}>
                Discard
              </button>
            ) : null}
            {livePlain && mode === 'tagging' && ready && !selected && !showEnd && changeOffered ? (
              <button type="button" data-action="change-fa" className={lineButton} onClick={onChangeFa}>
                Change
              </button>
            ) : null}
            {/* Edit keeps Back to live, Delete last and Add contact. Live tagging does not. */}
            {mode === 'edit' && !readOnly ? (
              <div className="flex shrink-0 items-stretch gap-2" data-tag-actions>
                <Button
                  kind="control"
                  variant="secondary"
                  className={cn(actionButton, 'w-[7.25rem]')}
                  onClick={closeEdit}
                >
                  Back to live
                </Button>
                <Button
                  kind="control"
                  variant="secondary"
                  className={actionButton}
                  data-action="delete-last"
                  title="Delete the last contact"
                  disabled={addOn || n <= 1}
                  onClick={onUndoTap}
                >
                  Delete last
                </Button>
                <Button
                  kind="control"
                  variant={addOn ? 'primary' : 'secondary'}
                  className={actionButton}
                  data-action="add-contact"
                  title="Add a missed contact"
                  aria-pressed={addOn}
                  onClick={onAddContact}
                >
                  Add contact
                </Button>
              </div>
            ) : null}
            {mode === 'blocked' ? (
              <Button kind="control" variant="secondary" className={rowButton} onClick={onDiscardGone}>
                Discard rally
              </Button>
            ) : null}
          </div>

          {toast ? (
            <div
              role="status"
              data-tag-toast
              className="mb-1.5 flex items-center justify-between gap-3 rounded-md bg-neutral-100 text-neutral-950 pl-3 pr-1 text-sm shadow-lg"
            >
              <span className="flex-1">{toast.text}</span>
              {toast.extra ? (
                <button
                  type="button"
                  className="btn-kind-control min-w-16 px-3 rounded-md font-bold underline hover:bg-neutral-300"
                  onClick={toast.extra.run}
                >
                  {toast.extra.label}
                </button>
              ) : null}
              {toast.undo ? (
                <button
                  type="button"
                  className="btn-kind-control min-w-16 px-3 rounded-md font-bold underline hover:bg-neutral-300"
                  onClick={toast.undo}
                >
                  Undo
                </button>
              ) : null}
            </div>
          ) : null}

          <div className={cn('space-y-2', panelBusy && BUSY)} data-tag-panel data-details-box>
            {review ? (
              <div data-review-panel className="rounded-md border border-border bg-bg-surface px-3 py-2 space-y-2">
                {review.kind === 'gaps' && review.pointAsk ? (
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Who won the point">
                    <span className="text-xs font-semibold text-primary">Who won?</span>
                    {(['me', 'them'] as const).map((side) => (
                      <Button
                        key={side}
                        kind="control"
                        variant="secondary"
                        onClick={() => {
                          onAddPoint(review.gaps[review.at], side)
                          endReview()
                        }}
                      >
                        {names[side]}
                      </Button>
                    ))}
                    <Button kind="control" variant="ghost" onClick={() => setReview({ ...review, pointAsk: false })}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {review.kind === 'gaps' ? (
                      <Button kind="control" variant="secondary" onClick={() => setReview({ ...review, pointAsk: true })}>
                        Add point
                      </Button>
                    ) : null}
                    <Button kind="control" variant="ghost" onClick={endReview}>
                      Stop
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
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
            {active && active.closed && !showEnd && mode !== 'tagging' && (readOnly || (ready && !selected)) ? (
              <div
                data-fa-summary
                data-ready-summary
                className="rounded-md border border-border bg-bg-surface px-3 py-1.5 flex items-center justify-between gap-2"
              >
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
                  {active.contacts.length} {active.contacts.length === 1 ? 'shot' : 'shots'}
                  {active.fa !== null ? ` · First attack shot ${active.fa}` : active.noAttack ? ' · No attack' : ''}
                </p>
                {readOnly || !(ready && n >= 3 && (active.fa !== null || active.noAttack)) ? null : (
                  <Button kind="control" variant="secondary" onClick={onChangeFa}>
                    Change
                  </Button>
                )}
              </div>
            ) : null}
            {askNoAttack && !showEnd ? (
              <div className="rounded-md border border-border bg-bg-surface p-3" data-no-attack-row>
                <Button kind="control" variant="secondary" onClick={onNoAttack}>
                  No attack
                </Button>
              </div>
            ) : null}
            {showEnd && active && !readOnly ? (
              <EndPanel draft={active} names={names} onChange={change} />
            ) : null}
            {active && active.closed && selected?.kind === 'shot' && !readOnly && !showEnd ? (
              <ShotPanel
                draft={active}
                shot={selected.shot}
                names={names}
                onChange={change}
                onNudge={mode === 'edit' ? onNudge : undefined}
              />
            ) : null}
            {active && active.closed && selected && selected.kind !== 'shot' && !readOnly ? (
              <div className="rounded-md border border-border bg-bg-surface p-3">
                <TimeRow draft={active} mark={selected} onNudge={onNudge} />
              </div>
            ) : null}
            {mode === 'edit' && edit && !readOnly && ready && selected?.kind !== 'shot' ? (
              <TrimRow
                draft={edit.draft}
                selected={selected}
                onMark={onMark}
                action={
                  <Button
                    kind="control"
                    variant="secondary"
                    data-action="delete-rally"
                    onClick={onDeleteEdit}
                  >
                    Delete rally
                  </Button>
                }
              />
            ) : null}
            {mode === 'watch' && !gap && !atEnd && lastSaved ? (
              <div
                data-last-saved
                className="rounded-md border border-border bg-bg-surface pl-3 pr-1.5 py-1.5 flex items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-primary truncate">
                    <span className="font-semibold">
                      Rally {lastSavedIndex + 1} · {names[lastSaved.winner]} won
                    </span>
                    {lastSaved.point
                      ? ' · point, no video'
                      : ` · ${lastSaved.contacts.length} ${lastSaved.contacts.length === 1 ? 'shot' : 'shots'} · ${lastSaved.ending ?? ''}`}
                  </p>
                  {noteBand ? (
                    <p className="text-xs font-semibold text-primary" data-mark-note>
                      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-warning" aria-hidden />
                      Check in Rallies: {bandLine(noteBand, set.rallies, set.firstServer)}
                    </p>
                  ) : null}
                </div>
                {lastSaved.point || !have.has(lastSaved.videoId) ? null : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-w-11 px-3 lg:min-w-0 lg:px-2.5 shrink-0"
                    onClick={() => openRally(lastSaved, lastSavedIndex)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            ) : null}
            {(mode === 'watch' || mode === 'tapping' || mode === 'setPoint') && !atEnd ? (
              <p
                data-tag-where
                className="h-5 px-1 text-xs leading-5 text-muted tabular-nums truncate"
              >
                {whereLine}
              </p>
            ) : null}
            {finishKept ? (
              <div data-finish-card>
                <Button kind="main" fullWidth variant="secondary" onClick={onFinishSet}>
                  Finish set at {formatScore(score)}
                </Button>
              </div>
            ) : null}
            {finishCard ? (
              <div data-finish-card>
                {cont.score && !level ? (
                  <p
                    role="alert"
                    data-mark="score"
                    className="mb-2 rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary"
                  >
                    Tagged {formatScore(cont.score.tagged)} · Details says {formatScore(cont.score.entered)}. Check
                    Rallies before you finish.
                  </p>
                ) : null}
                {level ? (
                  <p className="rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary" role="status">
                    Level at {formatScore(score)}, so the set is not over.{' '}
                    <Link
                      to={`/matches/${match.id}/details`}
                      className={cn('font-semibold text-brand underline underline-offset-2', buttonKindTextLink)}
                    >
                      Add the next video
                    </Link>
                    , or correct a rally.
                  </p>
                ) : (
                  <Button
                    kind="main"
                    fullWidth
                    variant={setWon ? 'primary' : 'secondary'}
                    className="text-base"
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
          className="relative shrink-0 border-t border-border bg-bg-app px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
          onClickCapture={late ? undefined : guardClicks(slotGuard)}
        >
          {late && slotKind === 'save' && active ? (
            <button
              type="button"
              data-late-tap
              aria-label={`Tap shot ${active.contacts.length + 1}`}
              className="absolute inset-0 z-10 touch-manipulation select-none"
              onClick={onLateTap}
            />
          ) : null}
          {review ? (
            <div
              className="absolute inset-0 z-20 flex items-stretch gap-2 bg-bg-app px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
              data-review-slot
            >
              {reviewRally ? (
                <>
                  <Button
                    kind="tapPad"
                    data-review-serve
                    className={cn(
                      'flex-1 min-w-0 text-lg border-l-8',
                      reviewRally.server === 'me' ? 'border-l-side-me' : 'border-l-side-them'
                    )}
                    onClick={() => onReviewPress('same')}
                  >
                    {names[reviewRally.server]} served
                  </Button>
                  <button
                    type="button"
                    data-review-other
                    className={cn(
                      buttonKindTapPadSquare,
                      'shrink-0 rounded-lg border text-xs font-semibold leading-tight px-1',
                      reviewRally.server === 'me' ? 'bg-side-them/15 border-side-them/50' : 'bg-side-me/15 border-side-me/50'
                    )}
                    onClick={() => onReviewPress('other')}
                  >
                    No, {names[otherSide(reviewRally.server)]}
                  </button>
                </>
              ) : review.kind === 'gaps' ? (
                <>
                  <Button
                    kind="tapPad"
                    data-review-add
                    className="flex-1 min-w-0 text-lg"
                    disabled={gapIndex === null || gapWindow(match, set.setId, gapIndex) === null || Boolean(live)}
                    onClick={onReviewAddRally}
                  >
                    Add rally
                  </Button>
                  <button
                    type="button"
                    data-review-next
                    className={cn(buttonKindTapPadSquare, 'shrink-0 rounded-lg border border-border text-sm font-semibold')}
                    onClick={onReviewNext}
                  >
                    Next
                  </button>
                </>
              ) : (
                <>
                  <Button kind="tapPad" variant="secondary" data-review-leave className="flex-1 min-w-0 text-lg" onClick={onReviewLeave}>
                    Leave it
                  </Button>
                  <button
                    type="button"
                    className={cn(buttonKindTapPadSquare, 'shrink-0 rounded-lg border border-border text-sm font-semibold')}
                    onClick={endReview}
                  >
                    Stop
                  </button>
                </>
              )}
            </div>
          ) : null}
          {switchWarn && !review ? (
            <p
              role="status"
              data-switch-warning
              className="mb-2 rounded-md border border-warning bg-warning/15 px-2 py-1.5 text-xs font-semibold text-primary leading-snug"
            >
              {expected === 'me'
                ? 'You were due to serve.'
                : `${names[expected]} was due to serve.`}{' '}
              Rallies since rally {switchWarnRally} will be marked to check.
            </p>
          ) : null}
          <div className="flex items-stretch gap-2">
          {(slotKind === 'pad' || slotKind === 'add' || slotKind === 'save' || slotKind === 'edit') && !readOnly ? (
            <button
              type="button"
              data-tag-switch
              aria-label={`${servesText(names, padServer)}. Switch server`}
              onClick={mode === 'tapping' ? onPad : addOn ? onAddTap : onSwitch}
              disabled={!switchOn && mode !== 'tapping'}
              className={cn(
                'btn-kind-tap-pad max-w-40 shrink-0 rounded-lg border pl-2 pr-3 text-sm font-semibold text-primary',
                'inline-flex items-center touch-manipulation select-none active:brightness-90',
                'disabled:opacity-40',
                (mode === 'tapping' || addOn || slotGrey) && 'opacity-40'
              )}
              style={{
                backgroundColor: `color-mix(in srgb, ${padServer === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)'} 15%, transparent)`,
                borderColor: `color-mix(in srgb, ${padServer === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)'} 50%, transparent)`,
              }}
            >
              <span
                className="h-3.5 w-1 shrink-0 rounded-[2px]"
                style={{ backgroundColor: padServer === 'me' ? 'var(--color-tag-player-a)' : 'var(--color-tag-player-b)' }}
              />
              <span className="ml-1.5 min-w-0 truncate">{names[padServer]} serving</span>
            </button>
          ) : null}
          {slotKind === 'pad' ? (
            <button
              type="button"
              data-tap-pad
              onClick={onPad}
              disabled={atEnd || mode === 'blocked'}
              className={cn(
                'btn-kind-tap-pad relative flex-1 min-w-0 rounded-lg text-lg font-bold overflow-hidden touch-manipulation select-none active:brightness-90 border-l-8 inline-flex items-center justify-center gap-2',
                slotGrey && BUSY,
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
                      ? `Tap serve · ${names[padServer]}`
                      : 'Play'}
              {tapped > 0 && lastTap !== null ? (
                <span
                  key={lastTap}
                  className="tag-idle-bar absolute left-0 right-0 bottom-0 h-1.5 bg-white/70"
                  aria-hidden
                />
              ) : null}
            </button>
          ) : null}

          {slotKind === 'add' ? (
            <button
              type="button"
              data-tap-add
              onClick={onAddTap}
              className={cn(
                'btn-kind-tap-pad flex-1 min-w-0 rounded-lg px-2 text-lg font-bold leading-tight touch-manipulation select-none active:brightness-90',
                'inline-flex items-center justify-center gap-2 bg-brand-primary text-on-accent',
                slotGrey && BUSY
              )}
            >
              Tap the missed contact
            </button>
          ) : null}
          {slotKind === 'save' && stage === 'pickFa' ? (
            <Button
              kind="tapPad"
              data-tag-fa
              className={cn('min-w-0 flex-1 rounded-lg text-lg active:scale-100', slotGrey && !late && BUSY)}
              disabled={liveShot === 1}
              onClick={onPickFa}
            >
              First attack
            </Button>
          ) : null}
          {slotKind === 'save' && stage !== 'pickFa' && late ? (
            <Button
              kind="tapPad"
              data-tag-save
              className={cn('min-w-0 flex-1 rounded-lg text-lg active:scale-100', slotGrey && BUSY)}
              disabled
              onClick={onSave}
            >
              Save
            </Button>
          ) : null}
          {slotKind === 'save' && stage !== 'pickFa' && !late ? (
            <>
              <span className="min-w-0 flex-1" />
              <button
                type="button"
                data-foot="discard"
                className="btn-kind-tap-pad w-[4.625rem] shrink-0 rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-primary"
                onClick={onRetap}
              >
                Discard
              </button>
              <Button
                kind="tapPad"
                data-tag-save
                className={cn('w-28 shrink-0 rounded-lg text-lg active:scale-100', slotGrey && BUSY)}
                disabled={!ready}
                onClick={onSave}
              >
                Save
              </Button>
            </>
          ) : null}
          {slotKind === 'edit' && edit ? (
            readOnly ? (
              <Button kind="tapPad" variant="secondary" className={cn(slotButton, 'flex-1 min-w-0')} onClick={leaveEdit}>
                Back to set
              </Button>
            ) : stage === 'pickFa' ? (
              <Button
                kind="tapPad"
                data-tag-fa
                className={cn('min-w-0 flex-1 rounded-lg text-lg active:scale-100', slotGrey && BUSY)}
                disabled={liveShot === 1}
                onClick={onPickFa}
              >
                First attack
              </Button>
            ) : (
              <Button
                kind="tapPad"
                data-tag-save
                className={cn('flex-1 min-w-0 rounded-lg text-lg active:scale-100', slotGrey && BUSY)}
                disabled={!ready || !edit.dirty}
                onClick={onSaveEdit}
              >
                Save changes
              </Button>
            )
          ) : null}
          </div>

          {slotKind === 'finished' ? (
            <FinishedActions
              match={match}
              set={set}
              locked={readOnly}
              videoOver={player.atEnd}
              busy={slotGrey}
              onGo={(to) => navigate(to)}
              onFinishMatch={() => mutateMatch(match.id, finishMatch)}
            />
          ) : null}
        </div>

        {/* Phone: the rally list opens over the panel. Desktop shows it on the left. */}
        {listOpen ? (
          <div className="tag-narrow-only absolute inset-0 z-30 bg-bg-app flex flex-col" role="dialog" aria-label="Rallies">
            <div className="px-2 flex items-center justify-between border-b border-border">
              <p className="text-sm font-semibold text-primary">Set {set.setId}</p>
              <button
                type="button"
                aria-label="Close rallies"
                className="btn-kind-control btn-kind-square inline-flex items-center justify-center rounded-md hover:bg-pill-idle"
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
  videoOver,
  busy,
  onGo,
  onFinishMatch,
}: {
  match: MatchRecord
  set: SetData
  locked: boolean
  /** No picture left to tag: with a side ahead in sets, the match is what is left to finish. */
  videoOver: boolean
  busy: boolean
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
  const finishLeads = canFinishMatch && (isRealResult(won) || videoOver)
  const offerNext = next && !(videoOver && canFinishMatch)
  const base = `/matches/${match.id}`

  if (tagged || locked) {
    return (
      <div className={cn('flex items-stretch gap-2', busy && BUSY)}>
        <Button kind="main" className="flex-1 text-base" onClick={() => onGo(`${base}/insights/summary`)}>
          Open match Insights
        </Button>
        <Button kind="main" variant="secondary" onClick={() => onGo(`${base}/tag`)}>
          Back to sets
        </Button>
      </div>
    )
  }
  return (
    <div className={cn('flex items-stretch gap-2', busy && BUSY)}>
      {offerNext ? (
        <Button
          kind="main"
          variant={finishLeads ? 'secondary' : 'primary'}
          className={cn('text-base', !finishLeads && 'flex-1')}
          onClick={() => onGo(`${base}/tag/${next.setId}`)}
        >
          {setHasTagProgress(next) ? 'Continue' : 'Start'} set {next.setId}
        </Button>
      ) : null}
      {canFinishMatch ? (
        <Button
          kind="main"
          variant={finishLeads || !offerNext ? 'primary' : 'secondary'}
          className={cn('text-base', (finishLeads || !offerNext) && 'flex-1')}
          onClick={onFinishMatch}
        >
          Finish match
        </Button>
      ) : null}
      <Button
        kind="main"
        variant={offerNext || canFinishMatch ? 'ghost' : 'primary'}
        className={cn(!offerNext && !canFinishMatch && 'flex-1 text-base')}
        onClick={() => onGo(`${base}/tag`)}
      >
        {offerNext || canFinishMatch ? 'Sets' : 'Back to sets'}
      </Button>
    </div>
  )
}

function SetHeader({ match, set, children }: SetHeaderProps) {
  return (
    <header className="h-10 px-2 flex items-center gap-2 border-b border-border bg-bg-app">
      <Link
        to={`/matches/${match.id}/tag`}
        aria-label="Back"
        className="btn-kind-control btn-kind-square inline-flex items-center justify-center rounded-md text-brand hover:bg-pill-idle"
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
                segs={[]}
                marks={[]}
                scoreMark={null}
                nextServer={expectedServer(set.rallies, set.firstServer)}
                editingId={null}
                addingAt={null}
                hasVideo={() => false}
                onOpen={() => undefined}
                finish={null}
                score={score}
                onFinish={() => undefined}
                actions={null}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
