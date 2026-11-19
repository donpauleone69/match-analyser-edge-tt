import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { isRealResult } from '@/features/match/matchChecks'
import { cn } from '@/helpers/utils'
import {
  GAP_REVIEW_RATE,
  SERVE_REVIEW_AFTER_S,
  SERVE_REVIEW_BEFORE_S,
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
  SHOT_LOOP_HOLD_S,
  addContact,
  canSave,
  captureContactTime,
  emptyDraft,
  loopShotOf,
  tapIgnored,
  markTime,
  otherSide,
  pointRally,
  rallyEnd,
  rallyFromDraft,
  rallyStart,
  retapStart,
  shotWindow,
  stageOf,
  statusText,
  winnerOf,
  undoContact,
  type Draft,
  type Mark,
  type MarkKind,
  type RallyData,
  type Side,
  type Stage,
  type Wing,
} from './rally'
import { RallyList, type RallyListActions } from './RallyList'
import { ZERO, addPoint, isSetWon, type Points } from './score'
import { AnswerKeyPanel } from './AnswerKeyPanel'
import { BestPanel, BestRallyRow } from './BestPanel'
import { PadWingContext } from './CornerPad'
import { BestTimingControl } from './BestTimingControl'
import {
  BEST_SHOT_RATE,
  bestAdvance,
  bestAt,
  bestDeleteFirst,
  bestDeleteLast,
  bestHitters,
  bestLoop,
  bestMismatch,
  bestPlace,
  bestRally,
  bestSetEnd,
  bestSetPoint,
  bestSwitchServer,
  canOpenCell,
  carryBest,
  cellTarget,
  loadBestTiming,
  pointDone,
  removeBestContact,
  routeAfter,
  saveBestTiming,
  setDepth,
  setWingStroke,
  toggleReview,
  withStep,
  type BestAt,
  type BestEnd,
  type BestLoopWhat,
  type BestPart,
  type BestTiming,
} from './bestFlow'
import { TAG_LOCK_LINE, useTagLock, type TagLock } from './tagLock'
import { segmentAt, segmentsOf, toGlobal, type Segment } from './timeline'
import { usePlayer, type Window } from './usePlayer'
import { SetTimeline, VideoStage, type TimelineBlock } from './VideoStage'

type FlowName = 'bestfa'

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

const HINT_MS = 2500
/** Back, between rallies: far enough to see a serve again. */
const BACK_S = 5

/** Watching speed per match, kept while the app is open. */
const watchRates = new Map<string, number>()

const scoreKey = (p: Points) => `${p.me}-${p.them}`

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

const NO_WINGS = { left: null, right: null }

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

/** The landscape tap wing. Same words as the portrait zone, on the green fill. */
function WingTap({
  side,
  title,
  line,
  dim,
  held,
  onTap,
}: {
  side: 'left' | 'right'
  title: string
  line: string
  dim: boolean
  /** Rally list or Settings. The corner answers are portaled beside this button, so they stay live. */
  held: boolean
  onTap: () => void
}) {
  return (
    <button
      type="button"
      data-tap-pad=""
      data-tap-wing={side}
      className={cn(
        'pad-region flex min-h-11 flex-1 flex-col items-center justify-center rounded-md bg-brand-primary px-1 text-center text-[22px] font-bold leading-tight text-on-accent',
        dim && 'opacity-60',
        held && 'pointer-events-none'
      )}
      aria-label={title}
      onClick={onTap}
    >
      <span>{title}</span>
      <span className="mt-0.5 max-w-full text-sm font-medium leading-snug opacity-80">{line}</span>
    </button>
  )
}

function TagSet({ match, set, lock }: { match: MatchRecord; set: SetData; lock: TagLock }) {
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
  /** The score at which the user chose to keep tagging past a won set. */
  const [keptAt, setKeptAt] = useState<string | null>(null)
  const [keptEntered, setKeptEntered] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [lastTap, setLastTap] = useState<number | null>(null)
  const [hint, setHint] = useState<string | null>(null)
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
  /** Best + FA: loop timings, contact check, add, and the set-end hold. */
  const [timing, setTiming] = useState(loadBestTiming)
  const landscape = useLandscape()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [padWings, setPadWings] = useState<{ left: HTMLElement | null; right: HTMLElement | null }>({ left: null, right: null })
  const setLeftWing = useCallback((node: HTMLDivElement | null) => {
    setPadWings((w) => (w.left === node ? w : { ...w, left: node }))
  }, [])
  const setRightWing = useCallback((node: HTMLDivElement | null) => {
    setPadWings((w) => (w.right === node ? w : { ...w, right: node }))
  }, [])
  const [bestSpan, setBestSpan] = useState<{ a: number; b: number } | null>(null)
  const loopWhat = useRef<{ what: BestLoopWhat; rate: number } | null>(null)
  const setBestTiming = (next: BestTiming) => {
    setTiming(next)
    saveBestTiming(next)
  }
  const [bestLook, setBestLook] = useState(false)
  const [bestCheck, setBestCheck] = useState(false)
  /** Corner pad only: an End question opened again from its one-line reminder. */
  const [endBack, setEndBack] = useState<'end' | 'point' | null>(null)
  /**
   * The rally just saved. Its row stays until the next rally's first contact:
   * part buttons and ★ change the saved rally, a cell reopens the rally from `before`.
   */
  const [bestSaved, setBestSaved] = useState<{ rallyId: string; draft: Draft; before: SetData; floor: number } | null>(null)
  /** Where capture resumed after Check, in the rally video. */
  const [bestResume, setBestResume] = useState<number | null>(null)
  const [bestOver, setBestOver] = useState<string | null>(null)
  const [bestHoldOn, setBestHoldOn] = useState(false)
  const bestHold = useRef(false)
  const bestCheckRef = useRef(false)
  /** Set before the walk starts, so the first clip uses the right pause. */
  const flowLockRef = useRef<FlowName | null>(null)
  flowLockRef.current = flowLock
  const [review, setReviewState] = useState<ReviewRun | null>(null)
  const reviewRef = useRef<ReviewRun | null>(null)
  const setReview = (next: ReviewRun | null) => {
    reviewRef.current = next
    setReviewState(next)
  }
  /** The speed chosen for watching between rallies. Tapping, Save and the next set do not lose it. */
  const watchRate = useRef<number>(watchRates.get(match.id) ?? NORMAL_SPEED)
  const listResume = useRef(false)
  const body = useRef<HTMLDivElement>(null)

  const have = new Set(match.videos.map((v) => v.id))
  /** Rallies of this set whose video has been removed: tags kept, nothing to play. */
  const goneCount = setRalliesWithoutVideo(match, set)
  /** The open rally sits on a removed video: it cannot be tagged or tapped over. */
  const draftGone = set.draft !== null && !have.has(set.draft.videoId)
  const live = draftGone ? null : set.draft
  const readOnly = lock !== null
  const active = live
  const stage = active ? stageOf(active) : null
  /** Best + FA, contacts closed, this rally's steps open. */
  const bestOn = !review && !set.finished && !draftGone && Boolean(live?.closed)
  const liveCount = live?.contacts.length ?? 0
  /** End is on screen with no result, and whenever a press has opened it. */
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
  const mode = set.finished
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
  /** What sits in the bottom slot. */
  const slotKind = mode === 'tagging' ? 'save' : mode === 'finished' ? 'finished' : 'pad'

  const latest = useRef({ live, set, match, floorG, segs, mode, selected, tight, nextServer, stage, flowWanted })
  useEffect(() => {
    playerRef.current = player
    latest.current = { live, set, match, floorG, segs, mode, selected, tight, nextServer, stage, flowWanted }
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

  /** Best step loop, in match time. Shot loops play at 0.75x. A contact check plays at half speed. */
  const playBest = (d: Draft, what: BestLoopWhat, rate?: number) => {
    bestCheckRef.current = false
    const speed = rate ?? (what === 'rally' ? 1 : BEST_SHOT_RATE)
    loopWhat.current = { what, rate: speed }
    const mismatch = bestMismatch(d, latest.current.set.rallies.length === 0)
    const w = bestLoop(d, what, timing, speed, mismatch)
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
  const timingSeen = useRef(false)
  useEffect(() => {
    if (!timingSeen.current) {
      timingSeen.current = true
      return
    }
    const cur = loopWhat.current
    const d = latest.current.live
    if (!cur || !d || bestCheckRef.current) return
    playBest(d, cur.what, cur.rate)
    // Reapplies the loop that is already playing when Paul changes a timing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timing])
  const playCheck = (d: Draft) => {
    bestCheckRef.current = true
    const off = offsetOf(d.videoId)
    const end = off + rallyEnd(d)
    const p = playerRef.current
    p.setRate(0.5)
    p.setLoop(null)
    p.setBoundary(end, () => {
      p.setBoundary(null)
      if (!bestCheckRef.current) return
      p.pause()
    })
    p.seek(off + rallyStart(d))
    p.play()
  }
  /** Contacts still being tapped: play what is there at half speed, and do not close the rally. */
  const playOpenCheck = (d: Draft) => {
    bestCheckRef.current = true
    const off = offsetOf(d.videoId)
    const first = d.contacts[0] ?? 0
    const last = d.contacts[d.contacts.length - 1] ?? first
    const a = off + Math.max(0, first)
    const b = off + Math.max(last, first) + 0.4
    const p = playerRef.current
    p.setRate(0.5)
    p.setBoundary(null)
    p.setLoop({ a, b: Math.max(b, a + 0.3) })
    p.seek(a)
    p.play()
  }
  /** Leave delete mode while the rally is still open and carry on tapping. */
  const resumeCapture = (d: Draft) => {
    bestCheckRef.current = false
    const p = playerRef.current
    const off = offsetOf(d.videoId)
    const last = d.contacts[d.contacts.length - 1] ?? 0
    // A reaction earlier than the last contact, unless Check is already past that.
    // A tap on the contact itself stores behind it and gets pushed just after.
    const resumeAt = Math.max(0, last - timing.reaction / 1000)
    const local = p.getTime() - off
    const at = local > resumeAt ? local : resumeAt
    p.setLoop(null)
    p.setRate(CAPTURE_SPEED)
    p.setBoundary(off + durationOf(d.videoId), () => closeContacts())
    p.seek(off + at)
    p.play()
    setBestResume(Math.round(at * 1000) / 1000)
    setLastTap(Date.now())
  }

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

  // On arrival: a rally left mid-tap reopens with its contacts closed, and the
  // video is parked on the frame where tagging stopped.
  useEffect(() => {
    let draft = set.draft
    const modeNow: FlowName = 'bestfa'
    const bestOpen = Boolean(draft && !draft.closed && draft.contacts.length > 0)
    if (draft && !draft.closed && !bestOpen) {
      draft = draft.contacts.length > 0 ? { ...draft, closed: true } : null
      const fixed = draft
      mutateMatch(match.id, (m) => setDraft(m, set.setId, fixed))
    }
    if (draft && draft.closed && draft.contacts.length > 0) {
      flowLockRef.current = modeNow
      setFlowLock(modeNow)
    }
    if (bestOpen && draft) {
      flowLockRef.current = modeNow
      setFlowLock(modeNow)
    }
    park(draft, set.finished, floorG)
    if (draft && draft.contacts.length > 0) {
      if (draft.closed) playBest(draft, bestAt(draft, set.rallies.length === 0))
      else {
        const p = playerRef.current
        p.setLoop(null)
        p.setRate(CAPTURE_SPEED)
        p.seek(offsetOf(draft.videoId) + draft.contacts[draft.contacts.length - 1])
        p.play()
      }
    }
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
  const messageScene = review
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
    if (stop === 'fence') setHint('Stops at the last saved rally')
    else if (stop === 'next') setHint('Stops at the next saved rally')
    else if (stop === 'loop') setHint('Stays in this rally')
    else setHint(null)
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
    const open: BestAt =
      d.contacts.length > 1 ? (routeAfter(base, s.rallies.length === 0) ?? { step: 'serve' }) : { step: 'end' }
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
    setBestCheck(false)
    playBest(closed, open)
  }

  // Two seconds with no tap closes the rally.
  useEffect(() => {
    if (mode !== 'tapping' || lastTap === null) return
    const id = setTimeout(() => {
      if (bestCheckRef.current) return
      closeContacts()
    }, CONTACT_IDLE_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lastTap])

  /** The pad: plays when paused with nothing tapped, otherwise records a contact. */
  const onPad = () => {
    if (bestHold.current) return
    if (bestCheckRef.current) return
    const p = playerRef.current
    if (mode === 'setPoint') {
      onKeepTagging()
      return
    }
    if (mode !== 'watch' && mode !== 'tapping') return
    const tapped = live?.contacts.length ?? 0
    if (!p.isPlaying() && tapped === 0) {
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

  /** Drop an open rally whose video is gone. */
  const onDiscardGone = () => {
    const before = set
    mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
    withUndo('Rally discarded', before)
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
    p.play()
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
        park(before.draft, false, floorG)
      },
    })
  }

  const onRetap = () => {
    clearLiveRally()
  }

  /** Throws away the rally being tagged. Saved rallies stay. */
  const onDiscardProgress = () => {
    if (readOnly || !live || live.contacts.length === 0) return
    setBestCheck(false)
    bestCheckRef.current = false
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
      setKeptAt(null)
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
    setTight(false)
    setKeptAt(null)
  }

  const onSave = () => {
    if (flowWanted === 'bestfa') return
    if (!live || !canSave(live)) return
    const rally = rallyFromDraft(live, `r-${Date.now()}`)
    if (!rally) return
    commitRally(rally)
  }

  const rallyOneNow = () => set.rallies.length === 0

  /** Opens a question on the open rally and loops its shot. */
  const showBest = (d: Draft, at: BestAt) => {
    const next = withStep(d, at)
    writeDraft(next)
    setBestLook(false)
    setBestCheck(false)
    playBest(next, at)
  }

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
    const misNow = bestMismatch(d, rallyOne)
    writeDraft(d)
    const moved =
      was.step !== now.step ||
      was.page !== now.page ||
      bestMismatch(live, rallyOne) !== misNow ||
      live.contacts.length !== d.contacts.length
    if (moved || bestCheck || bestLook) {
      setBestCheck(false)
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
    const rally = bestRally(d, `r-${Date.now()}`, winner, kept)
    const before = set
    const after = addPoint(score, winner)
    const atEntered = entered !== null && isSetWon(entered) && entered.me === after.me && entered.them === after.them
    const winsNow = !isSetWon(score) && (isSetWon(after) || atEntered)
    mutateMatch(match.id, (m) => {
      const base = rally1 && d.server !== set.firstServer ? flipFirstServer(m, set.setId) : m
      return saveRally(base, set.setId, rally)
    })
    setBestSaved({ rallyId: rally.id, draft: { ...d, closed: true }, before, floor: floorG })
    setFlowLock(null)
    setServerPick(null)
    serverChosen.current = false
    setBestLook(false)
    setBestCheck(false)
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
      bestHold.current = true
      setBestHoldOn(true)
      setKeptAt(scoreKey(after))
      p.setBoundary(endG + 6, () => {
        p.setBoundary(null)
        p.pause()
        bestHold.current = false
        setBestHoldOn(false)
        setBestOver(`${after.me}-${after.them}`)
      })
      p.play()
    } else {
      setKeptAt(null)
      setBestOver(null)
      p.play()
    }
  }
  /** Part buttons and ★ on the saved row change the saved rally. The video keeps playing. */
  const updateSaved = (d: Draft) => {
    if (!bestSaved || readOnly) return
    const winner = d.best?.point
    const old = set.rallies.find((r) => r.id === bestSaved.rallyId)
    if (!winner || !old) return
    const next = bestRally(d, old.id, winner, Boolean(d.best?.kept))
    mutateMatch(match.id, (m) => replaceRally(m, set.setId, next))
    setBestSaved({ ...bestSaved, draft: d })
  }

  /** A cell on the saved row: the rally comes back, paused on that question. The next answer saves it again. */
  const reopenSaved = (shot: number) => {
    if (!bestSaved || readOnly) return
    const target = cellTarget(bestSaved.draft, shot)
    if (!target) return
    const draft = withStep(bestSaved.draft, target)
    mutateMatch(match.id, (m) => restoreSet(m, { ...bestSaved.before, draft }))
    setBestSaved(null)
    setBestOver(null)
    bestHold.current = false
    setBestHoldOn(false)
    setKeptAt(null)
    flowLockRef.current = 'bestfa'
    setFlowLock('bestfa')
    const p = playerRef.current
    p.setBoundary(null)
    p.setFloor(bestSaved.floor)
    playBest(draft, target)
    p.pause()
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

  const onBestCell = (shot: number) => {
    if (!live || live.contacts.length === 0) {
      reopenSaved(shot)
      return
    }
    if (!live.closed || !canOpenCell(live, shot, rallyOneNow())) return
    const target = cellTarget(live, shot)
    if (!target) return
    // The last cell opens End, including while Point to is up.
    if (target.step === 'end') setEndBack('end')
    showBest(live, target)
  }

  const onBestPart = (part: BestPart) => {
    if (live?.closed) writeDraft(toggleReview(live, part))
    else if (bestSaved) updateSaved(toggleReview(bestSaved.draft, part))
  }

  const onBestStar = () => {
    if (live?.closed) writeDraft({ ...live, highlight: !live.highlight })
    else if ((!live || live.contacts.length === 0) && bestSaved) {
      updateSaved({ ...bestSaved.draft, highlight: !bestSaved.draft.highlight })
    }
  }

  const onBestNotYet = () => {
    setBestOver(null)
    bestHold.current = false
    setBestHoldOn(false)
    const p = playerRef.current
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.play()
  }

  const onBestDropShot = (shot: number) => {
    if (!live || live.contacts.length < 2) return
    const before = set
    const rallyOne = before.rallies.length === 0
    setEndBack(null)
    routeBest(shot === live.contacts.length ? bestDeleteLast(live) : removeBestContact(live, shot, rallyOne))
    withUndo('Shot removed', before, () => {
      const back = before.draft
      if (back?.closed) playBest(back, bestAt(back, rallyOne))
    })
  }

  /** Edit: a minus on every cell. The last cell is Delete last, the first Delete first. */
  const onBestMinus = (shot: number) => {
    if (!live || live.contacts.length < 2 || !bestCheck) return
    const before = set
    const n = live.contacts.length
    let next: Draft
    if (live.closed && shot === n) next = bestDeleteLast(live)
    else if (live.closed && shot === 1) next = bestDeleteFirst(live, rallyOneNow())
    else next = removeBestContact(live, shot, rallyOneNow())
    writeDraft(next)
    if (next.closed) playCheck(next)
    else playOpenCheck(next)
    withUndo('Shot removed', before, () => {
      const back = before.draft
      if (!back || !bestCheckRef.current) return
      if (back.closed) playCheck(back)
      else playOpenCheck(back)
    })
  }

  /** Check off: back to tapping, or to the question that should be open. */
  const onBestCheck = () => {
    if (!live || live.contacts.length === 0) return
    if (bestCheck) {
      setBestCheck(false)
      if (!live.closed) resumeCapture(live)
      else routeBest(live, { save: false })
      return
    }
    setBestCheck(true)
    setBestLook(false)
    if (!live.closed) playOpenCheck(live)
    else playCheck(live)
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

  const reviewHoldLine = reviewHold({ draftOpen: set.draft !== null, editDirty: false })

  const openReviewRun = (run: ReviewRun) => {
    if (readOnly || set.finished || reviewHoldLine) return false
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

  const openRally = (r: RallyData, _index: number) => {
    if (!have.has(r.videoId) || r.point || (live && !live.closed)) return
    if (gap) {
      setGap(null)
      setServerPick(null)
    }
    const p = playerRef.current
    p.setLoop(null)
    p.setRate(watchRate.current)
    p.seek(offsetOf(r.videoId) + (r.contacts[r.contacts.length - 1] ?? r.start))
    p.pause()
  }

  const level = score.me === score.them
  /** A set can be finished once it has a rally, nothing is open, and one side leads. */
  const canFinishNow = !set.finished && !live && !draftGone && set.rallies.length > 0
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

  // Keys (desktop). Space is the pad. Backspace deletes a tap while tapping
  // and steps back 5 seconds between rallies. K plays or pauses, arrows step 10 seconds.
  const handlers = {
    onPad,
    onUndoTap,
    onSave,
    reviewing: review !== null,
    onReviewSame: () => onReviewPress('same'),
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

  const shownScore = score
  const reviewRally = review?.kind === 'ask' && review.rule.cursor !== null ? review.rule.rallies[review.rule.cursor] : null
  const shownServer = reviewRally ? reviewRally.server : (live?.server ?? nextServer)
  const setsWon = matchSetsWon(match)
  const atEnd = player.atEnd && (mode === 'watch' || mode === 'setPoint')
  const tapped = live && !live.closed ? live.contacts.length : 0
  /** Finish is offered in the panel at set point and when the video runs out. */
  const finishCard = canFinishNow && (mode === 'setPoint' || atEnd)
  /** After Keep tagging, while the score is still a winning one, Finish stays in reach. */
  const finishKept = canFinish && mode === 'watch' && setWon && !atEnd
  const setLine = `Set ${set.setId} · ${formatScore(score)}`
  const loopNow =
    active && stage && mode === 'tagging' ? windowFor(active, selected, stage, tight) : null
  const gapIndex = review?.kind === 'gaps' ? review.gaps[review.at] : null
  const reviewLine =
    review?.kind === 'ask' && review.rule.cursor !== null
      ? `Rally ${review.rule.cursor + 1} serve`
      : review?.kind === 'gaps' && gapIndex !== null
        ? `Gap before rally ${gapIndex + 1}`
        : review?.kind === 'leave'
          ? 'Neither gap has the rally'
          : null

  const status = bestOn
    ? (bestPlace({ draft: live, rallies: set.rallies, finished: set.finished }) ?? 'Details')
    : bestOver
      ? `Set over at ${bestOver}`
      : reviewLine
        ? reviewLine
        : mode === 'finished'
          ? `Set ${set.setId} finished · ${formatScore(score)}`
          : mode === 'setPoint'
            ? `Set ${set.setId} reached ${formatScore(score)}`
            : mode === 'blocked'
              ? setLine
              : active
                ? statusText(active)
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
      editingId={null}
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
  const padServer = live?.server ?? nextServer
  const rowButton = 'px-3 shrink-0'
  /** Watch, tapping and answering use the plain words line. */
  const livePlain = !review && (mode === 'watch' || mode === 'tapping' || mode === 'tagging')
  const lineHidden = Boolean(livePlain && selected?.kind === 'shot')
  // The tap zone while a rally is open or waiting. Answering keeps the corner pad.
  const zoneOn =
    !bestOn && !bestOver && !bestHoldOn && !review && (mode === 'tapping' || (mode === 'watch' && !atEnd))
  const deleteMode = bestCheck
  const padTitle = deleteMode
    ? 'Delete mode'
    : tapped > 0
      ? `Tap shot ${tapped + 1}`
      : player.playing
        ? 'Tap serve'
        : 'Play'
  const zoneTitle = padTitle
  const zoneLine = deleteMode ? 'Tap a minus to remove a contact' : `Rally ${set.rallies.length + 1}, live`
  const footStrip = zoneOn || (mode === 'tagging' && stage === 'pickFa' && !review && !bestOn)
  /** An extra tap found after the taps closed. One tap left is Discard's job. */
  const deleteLastOn = Boolean(
    mode === 'tagging' && !review && !readOnly && !bestOn && live?.closed && live.contacts.length > 1
  )
  const rightKind = !footStrip ? 'none' : finishKept ? 'finish' : 'none'
  /** A foot control is showing. With none, the strip collapses and the tap zone grows. */
  const footAction = Boolean(footStrip && ((mode === 'tagging' && stage === 'pickFa') || rightKind === 'finish'))
  const rightBoxClass =
    'btn-kind-tap-pad w-28 shrink-0 rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-primary whitespace-nowrap disabled:opacity-40'

  const flowShown: FlowName = mode === 'tagging' && flowLock ? flowLock : flowWanted
  const bestRallyOne = set.rallies.length === 0
  const bestQ: BestAt | null = bestOn && live ? bestAt(live, bestRallyOne) : null
  useEffect(() => {
    if (bestQ?.step !== 'end') setEndBack(null)
  }, [bestQ?.step])
  /** The saved row shows until the next rally's first contact. */
  const bestRowSaved = Boolean(bestSaved && (!live || live.contacts.length === 0))
  const bestRowDraft = bestRowSaved ? bestSaved!.draft : active
  const tapSplit = Boolean(landscape && zoneOn)
  const padSplit = Boolean(
    tapSplit || (landscape && bestOn && !bestOver && liveCount > 0)
  )
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
  /** Rally list and Settings sit over part of the screen. Taps on the zone and wings wait. */
  const coverTaps = listOpen || settingsOpen

  return (
    <PadWingContext.Provider value={padSplit ? padWings : NO_WINGS}>
    <div
      className="tag-set bg-bg-app"
      data-pad-split={landscape ? '' : undefined}
      data-tag-mode={mode}
      data-flow={flowShown}
      data-best-look={bestLook ? '' : undefined}
      data-tag-stage={stage ?? ''}
      data-review={review?.kind ?? ''}
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
      data-delete-mode={deleteMode ? '' : undefined}
      data-best-resume={bestResume === null ? undefined : String(bestResume)}
      data-loop-a={loopNow ? loopNow.a.toFixed(3) : ''}
      data-loop-b={loopNow ? loopNow.b.toFixed(3) : ''}
      data-fa={active?.fa ?? ''}
      data-no-attack={active?.noAttack ? 'yes' : 'no'}
    >
      {/* Wings stay up in landscape and go blank when there is nothing to tap. */}
      {landscape ? (
        <div
          className="pad-wing relative"
          data-pad-wing="left"
          ref={setLeftWing}
        >
          {tapSplit ? (
            <WingTap
              side="left"
              title={zoneTitle}
              line={zoneLine}
              dim={deleteMode}
              held={coverTaps}
              onTap={onPad}
            />
          ) : null}
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
          onSeek={seekTo}
          noForward={mode === 'tapping'}
          onRate={onRate}
          leading={
            <Link
              to={`/matches/${match.id}/tag`}
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
        />
      </div>
      <div className="tag-setzone">
        <h1 className="min-w-0 shrink truncate text-sm font-bold text-primary">Set {set.setId}</h1>
        <SetTimeline player={player} blocks={blocks} open={openRange} onSeek={seekTo} />
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 px-2"
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
      </div>

      <div className="tag-rally">
        {tapped > 0 && lastTap !== null ? (
          <span
            key={lastTap}
            aria-hidden
            data-shot-timer=""
            className="tag-idle-bar pointer-events-none absolute left-0 right-0 top-0 z-10 h-1.5 bg-brand-primary/50"
          />
        ) : null}
        <BestRallyRow
            draft={bestRowDraft}
            at={bestQ}
            rallyOne={bestRowSaved ? set.rallies.length <= 1 : bestRallyOne}
            saved={bestRowSaved}
            flash={
              bestCheck && active
                ? active.contacts.findIndex((c) => Math.abs(c - (player.time - offsetOf(active.videoId))) < 0.12)
                : -1
            }
            label={`Rally ${bestRowSaved ? set.rallies.length : set.rallies.length + 1}`}
            names={names}
            server={bestRowDraft?.server ?? nextServer}
            checking={bestCheck}
            onCell={onBestCell}
            onMinus={onBestMinus}
            onCheck={onBestCheck}
            onStar={onBestStar}
            onServer={() => {
              if (!live) return
              const next = bestSwitchServer(live, bestRallyOne)
              if (bestRallyOne) mutateMatch(match.id, (m) => flipFirstServer(m, set.setId))
              routeBest(next, { save: false })
            }}
            onNotShot={() => {
              if (!live || !bestQ) return
              const shot = bestQ.step === 'serve' ? 1 : (bestQ.page ?? live.contacts.length)
              onBestDropShot(shot)
            }}
            onPart={onBestPart}
            onRally={() => {
              if (!live) return
              setBestLook(true)
              setBestCheck(false)
              playBest(live, 'rally')
            }}
            onDiscard={
              !readOnly && !bestRowSaved && live && live.contacts.length > 0 ? onDiscardProgress : undefined
            }
          />
      </div>

      {/* Shot input. Landscape portals the answers into the wings. */}
      <div className="tag-entry">
        {/* The white band. One line under the shot row, then the column down to the foot. */}
        <div
          ref={body}
          data-tag-body
          className={cn(
            'relative flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-border bg-bg-surface px-2 [overflow-anchor:none]',
            bestOn && 'overflow-hidden',
            zoneOn && 'pb-3'
          )}
        >
          {/* Status, with the rally's second-rank actions beside it, away from the thumb. */}
          <div
            data-words-line={livePlain ? '' : undefined}
            className={cn(
              'flex gap-1.5',
              livePlain ? 'mt-2.5 min-h-[var(--btn-kind-control)] items-center' : 'mb-1.5 items-stretch',
              zoneOn && 'hidden',
              (bestOn || bestOver || bestHoldOn) && 'hidden',
              lineHidden && 'hidden'
            )}
          >
            <p
              role="status"
              data-tag-status
              className={cn(
                'min-w-0 flex-1 text-sm leading-tight',
                livePlain
                  ? 'flex items-center font-normal text-primary'
                  : cn(
                      'flex min-h-[var(--btn-kind-control)] items-center rounded-md border-l-4 px-2 py-1 font-semibold',
                      mode === 'finished'
                        ? 'border-success bg-success/15 text-primary'
                        : active && active.closed
                          ? 'border-warning bg-warning/15 text-primary'
                          : 'border-border-strong bg-bg-card text-primary'
                    )
              )}
            >
              {status}
            </p>
            {mode === 'blocked' ? (
              <Button kind="control" variant="secondary" className={rowButton} onClick={onDiscardGone}>
                Discard rally
              </Button>
            ) : null}
          </div>

          {toast && !bestHoldOn && !bestOver ? (
            <div
              role="status"
              data-tag-toast
              className={cn(
                'mb-1.5 flex items-center justify-between gap-3 rounded-md bg-neutral-100 text-neutral-950 pl-3 pr-1 text-sm shadow-lg',
                (zoneOn || bestOn) && 'absolute left-2 right-2 top-2 z-30'
              )}
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

          <div
            className={cn(
              'space-y-2',
              bestOn && 'flex min-h-0 flex-1 flex-col'
            )}
            data-tag-panel
            data-details-box
          >
            {bestOver ? (
              <p data-best-over className="pt-1.5 text-sm font-semibold text-primary">
                Set over at {bestOver}
              </p>
            ) : null}
            {bestOn && live?.best && bestQ && live.contacts.length > 0 ? (
              <BestPanel
                draft={live}
                names={names}
                at={bestQ}
                rallyOne={bestRallyOne}
                rallyNo={set.rallies.length + 1}
                onEnd={onBestEnd}
                onPoint={onBestPoint}
                onServe={onBestServe}
                onStroke={onBestStroke}
                sides={padSplit}
                back={endBack}
              />
            ) : null}
            {!zoneOn && review ? (
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
            {!zoneOn && mode === 'finished' ? (
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
            {!zoneOn && finishKept && !bestOver && !bestHoldOn ? (
              <div data-finish-card>
                <Button kind="main" fullWidth variant="secondary" onClick={onFinishSet}>
                  Finish set at {formatScore(score)}
                </Button>
              </div>
            ) : null}
            {!zoneOn && finishCard ? (
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
          {zoneOn && !tapSplit ? (
            <button
              type="button"
              data-tag-zone="pad"
              data-tap-pad=""
              className={cn(
                'flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg text-center cursor-pointer touch-manipulation select-none active:bg-bg-app disabled:cursor-default disabled:opacity-40 disabled:active:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary',
                deleteMode && 'opacity-60',
                coverTaps && 'pointer-events-none',
              )}
              aria-label={zoneTitle}
              onClick={onPad}
            >
              <span className="text-lg font-bold text-primary">{zoneTitle}</span>
              <span className="mt-1 max-w-[17.5rem] text-sm text-muted">{zoneLine}</span>
            </button>
          ) : null}
        </div>

        {/*
          The slot. It holds one control at one size: the pad, then Save. Nothing
          else ever appears here while a rally is tapped or tagged.
        */}
        <div
          data-tag-slot={bestOn && !bestOver ? 'bestfa' : slotKind}
          className={cn(
            'relative shrink-0 border-t border-border bg-bg-app px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]',
            ((bestOn && !bestOver) || bestHoldOn) && 'hidden'
          )}
        >
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
          <div className="flex items-stretch gap-2">
          {deleteLastOn ? (
            <button
              type="button"
              data-action="delete-last"
              data-foot="delete-last"
              className="btn-kind-tap-pad shrink-0 rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-primary whitespace-nowrap"
              onClick={onUndoTap}
            >
              Delete last
            </button>
          ) : null}
          {footAction ? (
            <>
              <div className="min-w-0 flex-1" />
              {mode === 'tagging' && stage === 'pickFa' ? (
                <button
                  type="button"
                  data-foot="discard"
                  className="btn-kind-tap-pad w-[4.625rem] shrink-0 rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-primary"
                  onClick={onRetap}
                >
                  Discard
                </button>
              ) : null}
              {rightKind === 'finish' ? (
                <button
                  type="button"
                  data-finish-card
                  className={rightBoxClass}
                  onClick={onFinishSet}
                >
                  Finish set
                </button>
              ) : null}
            </>
          ) : null}
          {bestOver ? (
            <>
              <Button kind="tapPad" data-best-finish className="min-w-0 flex-1 rounded-lg text-lg" onClick={onFinishSet}>
                Finish set
              </Button>
              <Button
                kind="tapPad"
                variant="secondary"
                data-best-not-yet
                className="min-w-0 flex-1 rounded-lg text-lg"
                onClick={onBestNotYet}
              >
                Not yet
              </Button>
            </>
          ) : null}
          {slotKind === 'pad' && !footStrip && !bestOver ? (
            <button
              type="button"
              data-tap-pad
              onClick={onPad}
              disabled={atEnd || mode === 'blocked'}
              className={cn(
                'btn-kind-tap-pad relative flex-1 min-w-0 rounded-lg text-lg font-bold overflow-hidden touch-manipulation select-none active:brightness-90 border-l-8 inline-flex items-center justify-center gap-2',
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
                  : deleteMode
                    ? 'Delete mode'
                    : tapped > 0
                      ? `Tap shot ${tapped + 1}`
                    : player.playing || mode === 'blocked'
                      ? `Tap serve · ${names[padServer]}`
                      : 'Play'}
            </button>
          ) : null}
          </div>

          {slotKind === 'finished' ? (
            <FinishedActions
              match={match}
              set={set}
              locked={readOnly}
              videoOver={player.atEnd}
              onGo={(to) => navigate(to)}
              onFinishMatch={() => mutateMatch(match.id, finishMatch)}
            />
          ) : null}
        </div>

        {/* The rally list opens over the panel. The wings stay up beside it. */}
        {listOpen ? (
          <div className="absolute inset-0 z-30 bg-bg-app flex flex-col" role="dialog" aria-label="Rallies">
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
      {landscape ? (
        <div
          className="pad-wing relative"
          data-pad-wing="right"
          ref={setRightWing}
        >
          {tapSplit ? (
            <WingTap
              side="right"
              title={zoneTitle}
              line={zoneLine}
              dim={deleteMode}
              held={coverTaps}
              onTap={onPad}
            />
          ) : null}
        </div>
      ) : null}
    </div>
    </PadWingContext.Provider>
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
  onGo,
  onFinishMatch,
}: {
  match: MatchRecord
  set: SetData
  locked: boolean
  /** No picture left to tag: with a side ahead in sets, the match is what is left to finish. */
  videoOver: boolean
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
      <div className="flex items-stretch gap-2">
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
    <div className="flex items-stretch gap-2">
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
    <header className="h-10 flex items-center gap-1.5 border-b border-border bg-bg-app pl-2 pr-10">
      <Link
        to={`/matches/${match.id}/tag`}
        aria-label="Back"
        className="btn-kind-control btn-kind-square inline-flex items-center justify-center rounded-md text-brand hover:bg-pill-idle"
      >
        <Icon name="chevron-left" size="sm" />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-base font-bold text-primary">Set {set.setId}</h1>
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
