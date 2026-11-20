import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, buttonKindTapPadSquare, buttonKindTextLink } from '@/ui-mine'
import { WfEmpty } from '@/layout/Wireframe'
import {
  derivePhase,
  emptySet,
  formatScore,
  matchSetsWon,
  parseEntered,
  resultSetCount,
  setBlockingFinish,
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
  pressReview,
  type ReviewState,
} from './continuity'
import {
  applyTaggedResult,
  applyTaggedScore,
  confirmServe,
  deleteRally,
  dropAfter,
  editStops,
  finishMatch,
  finishSet,
  flipFirstServer,
  gapWindow,
  insertRallyAt,
  type EditGapStop,
  latestVideoId,
  leaveMark,
  maxSetNumber,
  reopenSet,
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
  RALLY_LEAD_S,
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
  type RallyData,
  type Side,
  type Stage,
  type Wing,
} from './rally'
import { ZERO, addPoint, countPoints, isSetWon, setEndIndex, type Points } from './score'
import { BestPanel, BestRallyRow } from './BestPanel'
import { CornerPad, PadWingContext } from './CornerPad'
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
  bestQuestionKey,
  bestRally,
  bestSetEnd,
  bestSetPoint,
  canOpenCell,
  carryBest,
  cellTarget,
  draftFromRally,
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
  if (markState(set) === 'off' || markState(set) === 'part') return <Navigate to={`/matches/${matchId}/tag`} replace />
  if (lock && !set.finished) return stop(`Set ${set.setId} cannot be tagged`, TAG_LOCK_LINE[lock])

  // A finished set whose rallies were all tagged on a video that has been removed.
  const tags = set.rallies.length
  const unplayable = setRalliesWithoutVideo(match, set)
  if (set.finished && tags > 0 && unplayable === tags) {
    return <SetWithoutVideo match={match} set={set} />
  }
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

const servesText = (names: Record<Side, string>, side: Side) =>
  side === 'me' ? 'You serve' : `${names.them} serves`

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

type EditPick = { kind: 'rally'; id: string } | { kind: 'gap'; index: number }

/**
 * This set's rallies, left to right. A grey score sits in front of the first
 * tagged rally. The open rally is dashed, in the server's colour. Newest at
 * the right. The pick sits in the middle. Gap slots show in Gaps mode only.
 */
function SetPills({
  rallies,
  picked,
  gaps,
  pickedGap,
  open,
  insert,
  onPick,
  onGap,
}: {
  rallies: RallyData[]
  picked: string | null
  /** Null hides the slots: Rallies mode, and every screen outside Edit Set. */
  gaps: EditGapStop[] | null
  pickedGap: number | null
  open: { n: number; server: Side } | null
  /** The rally being inserted, drawn as a dashed pill in its slot. */
  insert: { index: number; n: number; server: Side } | null
  onPick: (r: RallyData) => void
  onGap: (index: number) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const end = setEndIndex(rallies.map((r) => r.winner))
  const overrun = end >= 0 && end < rallies.length - 1
  let lead = 0
  while (lead < rallies.length && rallies[lead].point) lead++
  const start = lead > 0 ? countPoints(rallies.slice(0, lead).map((r) => r.winner)) : null
  const pills = rallies.flatMap((r, i) =>
    r.point ? [] : [{ r, n: i + 1, i, warn: overrun && i > end }]
  )
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const pill =
      pickedGap !== null
        ? el.querySelector(`[data-gap-index="${pickedGap}"]`)
        : picked
          ? el.querySelector(`[data-pill-id="${picked}"]`)
          : null
    if (pill instanceof HTMLElement) {
      el.scrollLeft = Math.max(0, pill.offsetLeft - (el.clientWidth - pill.offsetWidth) / 2)
      return
    }
    el.scrollLeft = el.scrollWidth
  }, [picked, pickedGap, pills.length, open?.n, start?.me, start?.them])
  return (
    <div ref={scroller} className="tag-pills" data-set-pills>
      {start ? (
        <span className="tag-pill tag-pill-start" data-start-pill>
          {formatScore(start)}
        </span>
      ) : null}
      {pills.map(({ r, n, i, warn }) => {
        const slot = gaps?.find((g) => g.index === i) ?? null
        const on = slot !== null && slot.index === pickedGap
        const inserting = insert !== null && slot !== null && insert.index === slot.index
        return (
          <Fragment key={r.id}>
            {inserting && insert ? (
              <span
                className={cn('tag-pill tag-pill-open', insert.server === 'me' ? 'text-side-me' : 'text-side-them')}
                data-open-pill={insert.n}
                data-gap-index={slot.index}
              >
                {insert.n}
              </span>
            ) : slot ? (
              <button
                type="button"
                data-gap-slot=""
                data-gap-index={slot.index}
                data-on={on ? '' : undefined}
                data-likely={slot.likely ? '' : undefined}
                className="tag-gap-hit"
                aria-current={on ? 'true' : undefined}
                aria-label={`Before rally ${slot.n}`}
                onClick={() => onGap(slot.index)}
              >
                <span className="tag-gap-slot" data-on={on ? '' : undefined} data-likely={slot.likely ? '' : undefined} />
              </button>
            ) : null}
            <button
              type="button"
              data-set-pill={n}
              data-pill-id={r.id}
              data-pill-warn={warn ? '' : undefined}
              data-pill-on={picked === r.id ? '' : undefined}
              className={cn(
                'tag-pill',
                r.winner === 'me' ? 'bg-side-me' : 'bg-side-them',
                gaps && 'tag-pill-dim',
                picked === r.id && 'tag-pill-on',
                warn && 'tag-pill-warn'
              )}
              onClick={() => onPick(r)}
            >
              {n}
            </button>
          </Fragment>
        )
      })}
      {open ? (
        <span
          className={cn('tag-pill tag-pill-open', open.server === 'me' ? 'text-side-me' : 'text-side-them')}
          data-open-pill={open.n}
        >
          {open.n}
        </span>
      ) : null}
    </div>
  )
}

/** Rallies or Gaps. Landscape sits this on top of the left wing. */
function KindSwitch({
  kind,
  onRally,
  onGap,
}: {
  kind: 'rally' | 'gap'
  onRally: () => void
  onGap: () => void
}) {
  const wings = useContext(PadWingContext)
  const node = (
    <div
      data-edit-switch
      role="group"
      aria-label="What to step"
      className="flex h-9 shrink-0 overflow-hidden rounded-md border border-border"
    >
      <button
        type="button"
        data-edit-kind="rally"
        aria-pressed={kind === 'rally'}
        className={cn(
          'min-w-0 flex-1 text-sm font-semibold',
          kind === 'rally' ? 'bg-brand-primary text-white' : 'bg-bg-card text-primary'
        )}
        onClick={onRally}
      >
        Rallies
      </button>
      <button
        type="button"
        data-edit-kind="gap"
        aria-pressed={kind === 'gap'}
        className={cn(
          'min-w-0 flex-1 text-sm font-semibold',
          kind === 'gap' ? 'bg-brand-primary text-white' : 'bg-bg-card text-primary'
        )}
        onClick={onGap}
      >
        Gaps
      </button>
    </div>
  )
  if (wings.left) return createPortal(node, wings.left)
  return <div className="mb-2">{node}</div>
}

/** A gap stop names the empty stretch. No buttons. */
function GapContext({
  n,
  seconds,
  score,
  server,
  serverName,
  onSwitch,
}: {
  n: number
  seconds: number
  score: string
  server: Side
  serverName: string
  onSwitch?: () => void
}) {
  const chipClass = cn(
    'shrink-0 rounded-md px-2 py-1 text-xs font-semibold',
    server === 'me' ? 'bg-side-me' : 'bg-side-them'
  )
  return (
    <div className="flex h-full min-w-0 items-center gap-2 overflow-x-auto px-1 text-sm text-primary" data-gap-context>
      <span className="shrink-0 font-semibold">Before rally {n}</span>
      <span className="shrink-0">{seconds} s</span>
      <span className="shrink-0">at {score}</span>
      {onSwitch ? (
        <button type="button" data-gap-server className={chipClass} aria-label={`${serverName} serves. Switch server`} onClick={onSwitch}>
          {serverName} serves
        </button>
      ) : (
        <span className={chipClass}>{serverName} serves</span>
      )}
    </div>
  )
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
  const [keptEntered, setKeptEntered] = useState(false)
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
  const [bestSaved, setBestSaved] = useState<{ rallyId: string; draft: Draft } | null>(null)
  /** Where capture resumed after Check, in the rally video. */
  const [bestResume, setBestResume] = useState<number | null>(null)
  const [bestHoldOn, setBestHoldOn] = useState(false)
  const [start, setStart] = useState<StartPick>(
    () => initialStart ?? { videoId: latestVideoId(match) ?? '', score: ZERO, server: null }
  )
  /** Edit Set is on, standing on one rally or one gap. */
  const [editPick, setEditPick] = useState<EditPick | null>(null)
  /** The open draft is a change to this saved rally, not a new one. */
  const [editOf, setEditOf] = useState<string | null>(null)
  const bestHold = useRef(false)
  const tapGuardRef = useRef<ActionGuard | null>(null)
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
  const body = useRef<HTMLDivElement>(null)

  const have = new Set(match.videos.map((v) => v.id))
  const stops = useMemo(() => editStops(match, set.setId), [match, set])
  /** Rallies of this set whose video has been removed: tags kept, nothing to play. */
  const goneCount = setRalliesWithoutVideo(match, set)
  /** The open rally sits on a removed video: it cannot be tagged or tapped over. */
  const draftGone = set.draft !== null && !have.has(set.draft.videoId)
  const live = draftGone ? null : set.draft
  const readOnly = lock !== null
  const active = live
  const stage = active ? stageOf(active) : null
  const editing = editPick !== null || editOf !== null
  /** Best + FA, contacts closed, this rally's steps open. An edit opens them on a finished set too. */
  const bestOn = !review && (!set.finished || editOf !== null) && !draftGone && Boolean(live?.closed)
  const liveCount = live?.contacts.length ?? 0
  /** End is on screen with no result, and whenever a press has opened it. */
  const score = taggedScore(set) ?? ZERO
  const entered = parseEntered(set.entered)
  /** The set, walked in video order and marked where it does not add up. Nothing is changed by it. */
  const cont = checkSet(set.rallies, set.firstServer, segs, entered, set.finished)
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
  const reachedEntered = entered !== null && entered.me === score.me && entered.them === score.them
  /** The set first reaches a winning score at this rally. Rallies after it do not belong. */
  const endIndex = setEndIndex(set.rallies.map((r) => r.winner))
  const overrun = endIndex >= 0 && endIndex < set.rallies.length - 1
  const setWon = set.rallies.length > 0 && (endIndex === set.rallies.length - 1 || (reachedEntered && isSetWon(entered)))
  const startCard = !readOnly && !set.finished && set.rallies.length === 0 && !live && start.server === null
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
        : startCard
          ? 'start'
          : setWon && !gap
            ? 'setPoint'
            : 'watch'
  /** The saved rally being changed or picked in Edit Set. */
  const editIndex = set.rallies.findIndex((r) => r.id === (editOf ?? pickedId))
  const editRally = editIndex >= 0 ? set.rallies[editIndex] : null
  /** What sits in the bottom slot. */
  const slotKind = mode === 'tagging' ? 'save' : mode === 'finished' ? 'finished' : 'pad'

  const latest = useRef({ live, set, match, floorG, segs, mode, selected, tight, nextServer, stage, flowWanted })
  useEffect(() => {
    playerRef.current = player
    latest.current = { live, set, match, floorG, segs, mode, selected, tight, nextServer, stage, flowWanted }
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
    if (!set.finished) setBestSaved(savedRowOf(set))
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
    if (mode !== 'watch' && mode !== 'tapping') return
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

  const onRetap = () => {
    clearLiveRally()
  }

  /** Throws away the rally being tagged. Saved rallies stay. */
  const onDiscardProgress = () => {
    if (readOnly || !live || live.contacts.length === 0) return
    if (gap && editPick?.kind === 'gap') {
      const stop = stops.gaps.find((g) => g.index === gap.index)
      setBestCheck(false)
      bestCheckRef.current = false
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
      setBestCheck(false)
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
          setEditPick({ kind: 'gap', index: insertAt })
          setGap(window)
          park(before.draft, false, window.a)
        }
      )
      if (saved) loopPick(saved)
      return
    }
    const rally = bestRally(d, `r-${Date.now()}`, winner, kept)
    const opening = rally1 && start.server !== null
    const was = opening ? start.score : score
    const after = addPoint(was, winner)
    const atEntered = entered !== null && isSetWon(entered) && entered.me === after.me && entered.them === after.them
    const winsNow = !isSetWon(was) && (isSetWon(after) || atEntered)
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
      p.setBoundary(endG + 6, () => {
        p.setBoundary(null)
        p.pause()
        bestHold.current = false
        setBestHoldOn(false)
      })
      p.play()
    } else {
      p.play()
    }
  }

  /** Back to where tagging stands: paused at the end of the last saved rally, its row fixable. */
  const parkLive = (s: SetData) => {
    loopWhat.current = null
    setBestSpan(null)
    setBestLook(false)
    setBestCheck(false)
    bestCheckRef.current = false
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

  /**
   * A cell of a saved rally: that question opens on a copy of the rally. The
   * saved rally stays as it is until the answer saves the change.
   */
  const openEditCell = (rallyId: string, shot: number) => {
    if (readOnly) return
    const r = set.rallies.find((x) => x.id === rallyId)
    if (!r || !have.has(r.videoId)) return
    const base = draftFromRally(r)
    const target = cellTarget(base, shot)
    if (!target) return
    const draft = withStep(base, target)
    writeDraft(draft)
    setEditOf(rallyId)
    setBestSaved(null)
    bestHold.current = false
    setBestHoldOn(false)
    if (target.step === 'end') setEndBack('end')
    const p = playerRef.current
    p.setBoundary(null)
    playBest(draft, target)
  }

  /** A cell on the saved row reopens that question. The next answer saves the rally again. */
  const reopenSaved = (shot: number) => {
    if (!bestSaved) return
    openEditCell(bestSaved.rallyId, shot)
  }

  /** Edit Set: the picked rally loops at full speed. */
  const loopPick = (r: RallyData) => {
    setEditPick({ kind: 'rally', id: r.id })
    setGap(null)
    setBestSaved(null)
    bestHold.current = false
    setBestHoldOn(false)
    playBest(draftFromRally(r), 'rally')
  }

  /** A gap stop loops edge to edge at the watch speed, fenced inside itself. */
  const loopGap = (stop: EditGapStop) => {
    if (live) {
      mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
      setEditOf(null)
    }
    setEditPick({ kind: 'gap', index: stop.index })
    setGap(null)
    setBestSaved(null)
    bestHold.current = false
    setBestHoldOn(false)
    loopWhat.current = null
    setBestSpan(null)
    const p = playerRef.current
    p.setBoundary(null)
    p.setRate(watchRate.current)
    p.setFloor(stop.a)
    p.setCeil(stop.b, () => ceilRef.current())
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
  }

  /** Rallies Edit Set can pick: saved, with video. */
  const pickable = set.rallies.filter((r) => !r.point && have.has(r.videoId))

  const openEditRally = (r: RallyData) => {
    if (r.point || !have.has(r.videoId)) return
    if (editPick === null && live && live.contacts.length > 0) {
      setHint(`Save or discard rally ${set.rallies.length + 1} first`)
      return
    }
    if (live) {
      mutateMatch(match.id, (m) => setDraft(m, set.setId, null))
      setEditOf(null)
    }
    setToast(null)
    loopPick(r)
  }

  const onEditSet = () => {
    if (editPick !== null) {
      if (live && live.contacts.length > 0) {
        setHint(`Save or discard rally ${gap ? gap.index + 1 : set.rallies.length + 1} first`)
        return
      }
      doneEdit()
      return
    }
    if (live && live.contacts.length > 0) {
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
  /** The pad's Edit: the picked rally's End opens, the question that moves the score. */
  const onPickEdit = () => {
    const r = pickable.find((row) => row.id === pickedId)
    if (r) openEditCell(r.id, r.contacts.length)
  }

  /** Back and Forward step only the kind the switch shows. */
  const stepPick = (by: -1 | 1) => {
    if (!editPick) return
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
    const stop = stops.gaps.find((g) => g.index === index)
    if (stop) loopGap(stop)
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

  /** The rally picked in Edit Set, shown as saved. Parts and ★ change it at once. */
  const pickDraft = mode === 'edit' && editRally ? draftFromRally(editRally) : null
  const updatePicked = (fn: (d: Draft) => Draft) => {
    if (!editRally || readOnly) return
    const d = fn(draftFromRally(editRally))
    const winner = d.best?.point ?? editRally.winner
    mutateMatch(match.id, (m) => replaceRally(m, set.setId, bestRally(d, editRally.id, winner, Boolean(d.best?.kept))))
  }

  /** Start card: a half picks the server and plays in from just before the paused frame. */
  const pickServer = (side: Side) => {
    if (mode !== 'start' || readOnly) return
    if (!tapGuardRef.current?.allow()) return
    tapGuardRef.current.arm()
    setStart((s) => ({ ...s, server: side }))
    setServerPick(side)
    serverChosen.current = true
    const p = playerRef.current
    p.setRate(CAPTURE_SPEED)
    p.seek(Math.max(floorG, p.time - RALLY_LEAD_S))
    p.play()
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
    if (readOnly || live) return
    const w = gapWindow(match, set.setId, index)
    if (!w) return
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

  const level = score.me === score.them
  /** A set can be finished once it has a rally, nothing is open, and one side leads. */
  const canFinishNow = !set.finished && !live && !draftGone && set.rallies.length > 0
  const canFinish = canFinishNow && !level

  const onFinishSet = () => {
    if (!canFinish) return
    playerRef.current.pause()
    mutateMatch(match.id, (m) => finishSet(m, set.setId))
    setKeptEntered(false)
  }

  const onReopenSet = () => {
    if (readOnly) return
    mutateMatch(match.id, (m) => reopenSet(m, set.setId))
    parkLive({ ...set, finished: false })
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
  const reviewRally = review?.kind === 'ask' && review.rule.cursor !== null ? review.rule.rallies[review.rule.cursor] : null
  const shownServer = reviewRally ? reviewRally.server : (live?.server ?? nextServer)
  const setsWon = matchSetsWon(match)
  const atEnd = player.atEnd && (mode === 'watch' || mode === 'setPoint')
  const tapped = live && !live.closed ? live.contacts.length : 0
  /** Set over: Save set or Edit, once the hold after the winning rally is done. */
  const overCard = mode === 'setPoint' && !bestHoldOn && !review
  /** When the video runs out before the set is won, Finish is offered in the panel. */
  const finishCard = canFinishNow && atEnd && mode !== 'setPoint'
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
    ? editOf
      ? `Rally ${editIndex + 1}, editing`
      : (bestPlace({ draft: live, rallies: set.rallies, finished: set.finished }) ?? 'Details')
    : overCard
      ? `Set over at ${formatScore(score)}`
      : mode === 'start'
        ? 'Find the first serve.'
        : mode === 'edit'
          ? viewedGap
            ? `Before rally ${viewedGap.n} · ${Math.round(viewedGap.b - viewedGap.a)} s`
            : `Rally ${editIndex + 1} of ${set.rallies.length} · ${formatScore(countPoints(set.rallies.slice(0, editIndex + 1).map((r) => r.winner)))}`
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

  const padServer = live?.server ?? nextServer
  const rowButton = 'px-3 shrink-0'
  /** Watch, tapping and answering use the plain words line. */
  const livePlain = !review && (mode === 'watch' || mode === 'tapping' || mode === 'tagging' || mode === 'start' || mode === 'edit')
  const lineHidden = Boolean(livePlain && selected?.kind === 'shot')
  // The tap zone while a rally is open or waiting. Answering keeps the corner pad.
  const inserting = Boolean(gap && editPick?.kind === 'gap')
  const zoneOn =
    !bestOn &&
    !overCard &&
    !bestHoldOn &&
    !review &&
    (mode === 'tapping' || (mode === 'watch' && !atEnd) || (inserting && mode === 'edit'))
  const deleteMode = bestCheck
  const padTitle = deleteMode
    ? 'Delete mode'
    : tapped > 0
      ? `Tap shot ${tapped + 1}`
      : player.playing
        ? 'Tap serve'
        : 'Play'
  const zoneTitle = padTitle
  const zoneLine = deleteMode
    ? 'Tap a minus to remove a contact'
    : inserting
      ? `Inserting rally ${(gap?.index ?? 0) + 1}`
      : `Rally ${set.rallies.length + 1}, live`
  const footStrip = zoneOn || (mode === 'tagging' && stage === 'pickFa' && !review && !bestOn)
  /** An extra tap found after the taps closed. One tap left is Discard's job. */
  const deleteLastOn = Boolean(
    mode === 'tagging' && !review && !readOnly && !bestOn && live?.closed && live.contacts.length > 1
  )
  /** A foot control is showing. With none, the strip collapses and the tap zone grows. */
  const footAction = Boolean(footStrip && mode === 'tagging' && stage === 'pickFa')

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
    tapSplit || (landscape && ((bestOn && liveCount > 0) || mode === 'edit'))
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
  /** Settings sits over part of the screen. Taps on the zone and wings wait. */
  const coverTaps = settingsOpen
  // One guard per place a finger rests. The action is what that place does now.
  const tapAction = startCard
    ? 'start'
    : bestOn
      ? 'questions'
      : mode === 'tapping' || (mode === 'watch' && (tapped > 0 || player.playing))
        ? 'tapping'
        : 'idle'
  const tapGuard = useActionGuard(tapAction)
  tapGuardRef.current = tapGuard
  const questionGuard = useActionGuard(
    bestOn && live ? bestQuestionKey(live, bestRallyOne, endBack) : 'idle'
  )
  const overGuard = useActionGuard(overCard ? 'shown' : 'shut')
  const afterGuard = useActionGuard(mode === 'finished' ? 'done' : 'open')
  const editGuard = useActionGuard(editPick === null ? 'shut' : editPick.kind)
  const guarded = (guard: ActionGuard, fn: () => void) => () => {
    if (!guard.allow()) return
    fn()
  }

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
              dim={deleteMode || tapGuard.waiting}
              held={coverTaps}
              onTap={guarded(tapGuard, onPad)}
            />
          ) : mode === 'start' ? (
            <WingTap
              side="left"
              title={servesText(names, 'me')}
              line="Starts the set"
              dim={tapGuard.waiting}
              held={coverTaps}
              onTap={guarded(tapGuard, () => pickServer('me'))}
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
      <div className="tag-setzone">
        <h1 className="min-w-0 shrink truncate text-sm font-bold text-primary">Set {set.setId}</h1>
        <SetPills
          rallies={set.rallies}
          picked={pickedId}
          gaps={editPick?.kind === 'gap' ? stops.gaps : null}
          pickedGap={editPick?.kind === 'gap' ? editPick.index : null}
          open={editPick !== null || set.finished ? null : { n: set.rallies.length + 1, server: nextServer }}
          insert={
            gap && editPick?.kind === 'gap'
              ? { index: gap.index, n: gap.index + 1, server: nextServer }
              : null
          }
          onPick={openEditRally}
          onGap={onGapSlot}
        />
        <Button
          size="sm"
          variant={editPick !== null ? 'primary' : 'secondary'}
          className="shrink-0 px-2"
          aria-pressed={editPick !== null}
          data-edit-set
          onClick={onEditSet}
        >
          <Icon name="list" size="xs" />
          {editPick !== null ? 'Done' : 'Edit Set'}
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
        {mode === 'start' ? (
          <div className="flex h-8 min-w-0 items-center gap-1.5" data-start-row>
            <span className="shrink-0 px-1 text-sm font-semibold text-primary">Find the first serve.</span>
          </div>
        ) : viewedGap && mode === 'edit' ? (
          <GapContext
            n={viewedGap.n}
            seconds={Math.round(viewedGap.b - viewedGap.a)}
            score={formatScore(countPoints(set.rallies.slice(0, viewedGap.index).map((r) => r.winner)))}
            server={expectedServer(set.rallies, set.firstServer, viewedGap.index)}
            serverName={names[expectedServer(set.rallies, set.firstServer, viewedGap.index)]}
            onSwitch={
              gap
                ? () => {
                    setServerPick(otherSide(nextServer))
                    serverChosen.current = true
                  }
                : undefined
            }
          />
        ) : (
        <BestRallyRow
            draft={pickDraft ?? bestRowDraft}
            at={pickDraft ? null : bestQ}
            rallyOne={pickDraft || editOf ? false : bestRowSaved ? set.rallies.length <= 1 : bestRallyOne}
            saved={pickDraft ? true : bestRowSaved}
            flash={
              bestCheck && active
                ? active.contacts.findIndex((c) => Math.abs(c - (player.time - offsetOf(active.videoId))) < 0.12)
                : -1
            }
            label={`Rally ${pickDraft || editOf ? editIndex + 1 : bestRowSaved ? set.rallies.length : set.rallies.length + 1}`}
            names={names}
            server={(pickDraft ?? bestRowDraft)?.server ?? nextServer}
            checking={bestCheck}
            onCell={pickDraft && pickedId ? (shot) => openEditCell(pickedId, shot) : onBestCell}
            onMinus={onBestMinus}
            onCheck={onBestCheck}
            onStar={pickDraft ? () => updatePicked((d) => ({ ...d, highlight: !d.highlight })) : onBestStar}
            onNotShot={() => {
              if (!live || !bestQ) return
              const shot = bestQ.step === 'serve' ? 1 : (bestQ.page ?? live.contacts.length)
              onBestDropShot(shot)
            }}
            onPart={pickDraft ? (part) => updatePicked((d) => toggleReview(d, part)) : onBestPart}
            onRally={() => {
              if (!live) return
              setBestLook(true)
              setBestCheck(false)
              playBest(live, 'rally')
            }}
            onDiscard={
              editOf && live
                ? cancelEdit
                : !readOnly && !bestRowSaved && live && live.contacts.length > 0
                  ? onDiscardProgress
                  : undefined
            }
          />
        )}
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
              (bestOn || bestHoldOn) && 'hidden',
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

          {toast && !bestHoldOn ? (
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
              (bestOn || mode === 'edit') && 'flex min-h-0 flex-1 flex-col'
            )}
            data-tag-panel
            data-details-box
          >
            {boundNote && set.mark ? (
              <div role="status" data-mark-end className="space-y-2 rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary">
                <p>
                  Set {set.setId} end reached at {formatScore(score)}. Edit a rally, or re-mark the end on the Tag page.
                </p>
                <Button
                  kind="control"
                  variant="secondary"
                  onClick={() => navigate(`/matches/${match.id}/mark/${set.mark?.from.videoId}?set=${set.setId}`)}
                >
                  Re-mark
                </Button>
              </div>
            ) : null}
            {mode === 'start' ? (
              <p data-start-card className="text-sm text-primary">Find the first serve.</p>
            ) : null}
            {overrun && !live && !set.finished && mode !== 'edit' ? (
              <div role="alert" data-overrun className="space-y-2 rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary">
                <p>
                  The set was won at rally {endIndex + 1}. {set.rallies.length - endIndex - 1 === 1
                    ? `Rally ${endIndex + 2} comes after it.`
                    : `Rallies ${endIndex + 2} to ${set.rallies.length} come after it.`}
                </p>
                <Button kind="control" variant="secondary" onClick={onDropAfter}>
                  Remove rallies after {endIndex + 1}
                </Button>
              </div>
            ) : null}
            {mode === 'edit' && editPick && !gap ? (
              <div className="flex min-h-0 flex-1 flex-col pt-2" data-edit-pad>
                <KindSwitch
                  kind={editPick.kind}
                  onRally={() => flipKind('rally')}
                  onGap={() => flipKind('gap')}
                />
                <CornerPad
                  label={viewedGap ? `Before rally ${viewedGap.n}` : `Rally ${editIndex + 1}`}
                  showName={false}
                  split={padSplit}
                  columns="1fr 1fr"
                  rows="1fr 1fr"
                  regions={[
                    {
                      key: 'back',
                      label: 'Back',
                      side: 'left',
                      on: false,
                      bg: '#334155',
                      fg: '#fff',
                      onClick: () => stepPick(-1),
                      data: { 'data-edit-step': 'back' },
                      style: { gridColumn: '1', gridRow: '1', opacity: stepAt > 0 ? 1 : 0.4 },
                    },
                    {
                      key: 'forward',
                      label: 'Forward',
                      side: 'right',
                      on: false,
                      bg: '#334155',
                      fg: '#fff',
                      onClick: () => stepPick(1),
                      data: { 'data-edit-step': 'forward' },
                      style: { gridColumn: '2', gridRow: '1', flex: '1 1 50%', opacity: stepAt < stepList.length - 1 ? 1 : 0.4 },
                    },
                    ...(editPick.kind === 'rally'
                      ? [
                          {
                            key: 'edit',
                            label: `Edit rally ${editIndex + 1}`,
                            side: 'right' as const,
                            on: false,
                            bg: 'var(--color-brand-primary)',
                            fg: '#fff',
                            onClick: guarded(editGuard, onPickEdit),
                            data: { 'data-edit-select': '' },
                            style: {
                              gridColumn: '1',
                              gridRow: '2',
                              flex: '1 1 25%',
                              opacity: readOnly || editGuard.waiting ? 0.4 : 1,
                            },
                          },
                          {
                            key: 'delete',
                            label: `Delete rally ${editIndex + 1}`,
                            side: 'right' as const,
                            on: false,
                            bg: '#7f1d1d',
                            fg: '#fff',
                            onClick: guarded(editGuard, onDeletePicked),
                            data: { 'data-edit-delete': '' },
                            style: {
                              gridColumn: '2',
                              gridRow: '2',
                              flex: '1 1 25%',
                              opacity: readOnly || editGuard.waiting ? 0.4 : 1,
                            },
                          },
                        ]
                      : [
                          {
                            key: 'insert',
                            label: `Insert rally ${viewedGap?.n ?? ''}`,
                            side: 'right' as const,
                            on: false,
                            bg: 'var(--color-brand-primary)',
                            fg: '#fff',
                            onClick: guarded(editGuard, () => {
                              if (viewedGap) onAddRally(viewedGap.index)
                            }),
                            data: { 'data-edit-insert': '' },
                            style: {
                              gridColumn: '1 / span 2',
                              gridRow: '2',
                              flex: '1 1 50%',
                              opacity: readOnly || editGuard.waiting ? 0.4 : 1,
                            },
                          },
                        ]),
                  ]}
                />
              </div>
            ) : null}
            {bestOn && live?.best && bestQ && live.contacts.length > 0 ? (
              <BestPanel
                draft={live}
                names={names}
                at={bestQ}
                rallyOne={bestRallyOne}
                rallyNo={editOf ? editIndex + 1 : set.rallies.length + 1}
                onEnd={onBestEnd}
                onPoint={onBestPoint}
                onServe={onBestServe}
                onStroke={onBestStroke}
                sides={padSplit}
                back={endBack}
                guard={questionGuard}
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
                (deleteMode || tapGuard.waiting) && 'opacity-60',
                coverTaps && 'pointer-events-none',
              )}
              data-guard={tapGuard.waiting ? '' : undefined}
              aria-label={zoneTitle}
              onClick={guarded(tapGuard, onPad)}
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
          data-tag-slot={bestOn ? 'bestfa' : overCard ? 'over' : mode === 'start' ? 'start' : slotKind}
          className={cn(
            'relative shrink-0 border-t border-border bg-bg-app px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]',
            (bestOn || bestHoldOn || mode === 'edit' || (mode === 'start' && landscape)) && 'hidden'
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
            </>
          ) : null}
          {overCard ? (
            <>
              <Button
                kind="tapPad"
                data-save-set
                data-guard={overGuard.waiting ? '' : undefined}
                className={cn('min-w-0 flex-1 rounded-lg text-lg', overGuard.waiting && 'opacity-60')}
                disabled={readOnly || !canFinish}
                onClick={guarded(overGuard, onFinishSet)}
              >
                Save set
              </Button>
              <Button
                kind="tapPad"
                variant="secondary"
                data-over-edit
                data-guard={overGuard.waiting ? '' : undefined}
                className={cn('min-w-0 flex-1 rounded-lg text-lg', overGuard.waiting && 'opacity-60')}
                disabled={readOnly}
                onClick={guarded(overGuard, onOverEdit)}
              >
                Edit
              </Button>
            </>
          ) : null}
          {mode === 'start' && !landscape ? (
            <>
              {(['me', 'them'] as const).map((side) => (
                <Button
                  key={side}
                  kind="tapPad"
                  variant="secondary"
                  data-start-server={side}
                  data-guard={tapGuard.waiting ? '' : undefined}
                  className={cn(
                    'min-w-0 flex-1 rounded-lg border-l-8 text-lg',
                    side === 'me' ? 'border-l-side-me' : 'border-l-side-them',
                    tapGuard.waiting && 'opacity-60'
                  )}
                  onClick={guarded(tapGuard, () => pickServer(side))}
                >
                  {servesText(names, side)}
                </Button>
              ))}
            </>
          ) : null}
          {slotKind === 'pad' && !footStrip && !overCard && mode !== 'start' && (mode !== 'edit' || inserting) ? (
            <button
              type="button"
              data-tap-pad
              data-guard={tapGuard.waiting ? '' : undefined}
              onClick={guarded(tapGuard, onPad)}
              disabled={atEnd || mode === 'blocked'}
              className={cn(
                'btn-kind-tap-pad relative flex-1 min-w-0 rounded-lg text-lg font-bold overflow-hidden touch-manipulation select-none active:brightness-90 border-l-8 inline-flex items-center justify-center gap-2',
                'disabled:bg-disabled-bg disabled:text-disabled-text disabled:active:brightness-100',
                'bg-brand-primary text-on-accent',
                padServer === 'me' ? 'border-l-side-me' : 'border-l-side-them',
                tapGuard.waiting && 'opacity-60'
              )}
            >
              {atEnd
                ? 'End of video'
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
              locked={readOnly}
              videoOver={player.atEnd}
              onGo={(to) => navigate(to)}
              onFinishMatch={() => mutateMatch(match.id, finishMatch)}
              guard={afterGuard}
            />
          ) : null}
        </div>

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
              dim={deleteMode || tapGuard.waiting}
              held={coverTaps}
              onTap={guarded(tapGuard, onPad)}
            />
          ) : mode === 'start' ? (
            <WingTap
              side="right"
              title={servesText(names, 'them')}
              line="Starts the set"
              dim={tapGuard.waiting}
              held={coverTaps}
              onTap={guarded(tapGuard, () => pickServer('them'))}
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

function FinishedActions({
  match,
  locked,
  videoOver,
  onGo,
  onFinishMatch,
  guard,
}: {
  match: MatchRecord
  locked: boolean
  /** No picture left to tag: with a side ahead in sets, the match is what is left to finish. */
  videoOver: boolean
  onGo: (to: string) => void
  onFinishMatch: () => void
  /** Presses just after Save set are ignored. */
  guard?: ActionGuard
}) {
  const press = (fn: () => void) => () => {
    if (guard && !guard.allow()) return
    fn()
  }
  const dim = guard?.waiting ? 'opacity-60' : ''
  const tagged = derivePhase(match) === 'complete'
  const tagging = match.sets.find((s) => markState(s) === 'tagging') ?? null
  const next = tagging ? null : (match.sets.find((s) => markState(s) === 'ready') ?? null)
  const won = matchSetsWon(match)
  /** A match cannot end level, so at 1 - 1 (or with no set won) there is nothing to finish. */
  const canFinishMatch =
    resultSetCount(match) === null && setBlockingFinish(match) === null && won.me !== won.them
  const finishLeads = canFinishMatch && (isRealResult(won) || videoOver)
  const offerContinue = Boolean(tagging) && !(videoOver && canFinishMatch)
  const offerNext = next && !(videoOver && canFinishMatch)
  const base = `/matches/${match.id}`

  if (tagged || locked) {
    return (
      <div className="flex items-stretch gap-2">
        <Button kind="main" className={cn('flex-1 text-base', dim)} data-guard={guard?.waiting ? '' : undefined} onClick={press(() => onGo(`${base}/insights/summary`))}>
          Open match Insights
        </Button>
        <Button kind="main" variant="secondary" className={dim} data-guard={guard?.waiting ? '' : undefined} onClick={press(() => onGo(`${base}/tag`))}>
          Back to sets
        </Button>
      </div>
    )
  }
  return (
    <div className="flex items-stretch gap-2">
      {offerContinue && tagging ? (
        <Button
          kind="main"
          variant={finishLeads ? 'secondary' : 'primary'}
          className={cn('text-base', !finishLeads && 'flex-1', dim)}
          data-guard={guard?.waiting ? '' : undefined}
          onClick={press(() => onGo(`${base}/tag/${tagging.setId}`))}
        >
          Continue set {tagging.setId}
        </Button>
      ) : null}
      {offerNext ? (
        <Button
          kind="main"
          variant={finishLeads ? 'secondary' : 'primary'}
          className={cn('text-base', !finishLeads && 'flex-1', dim)}
          data-guard={guard?.waiting ? '' : undefined}
          onClick={press(() => onGo(`${base}/tag/${next.setId}`))}
        >
          Tag set {next.setId}
        </Button>
      ) : null}
      {canFinishMatch ? (
        <Button
          kind="main"
          variant={finishLeads || (!offerNext && !offerContinue) ? 'primary' : 'secondary'}
          className={cn('text-base', (finishLeads || (!offerNext && !offerContinue)) && 'flex-1', dim)}
          data-guard={guard?.waiting ? '' : undefined}
          onClick={press(onFinishMatch)}
        >
          Finish match
        </Button>
      ) : null}
      <Button
        kind="main"
        variant={offerNext || offerContinue || canFinishMatch ? 'ghost' : 'primary'}
        className={cn(dim, !offerNext && !offerContinue && !canFinishMatch && 'flex-1 text-base')}
        data-guard={guard?.waiting ? '' : undefined}
        onClick={press(() => onGo(`${base}/tag`))}
      >
        {offerNext || offerContinue || canFinishMatch ? 'Sets' : 'Mark sets'}
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
 * A finished set whose video was removed. Tags and score stay. Adding the
 * video back brings the player with it.
 */
function SetWithoutVideo({ match, set }: { match: MatchRecord; set: SetData }) {
  const score = taggedScore(set) ?? ZERO
  return (
    <div className="h-full flex flex-col bg-bg-app" data-tag-mode="no-video">
      <SetHeader match={match} set={set} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-3 py-4 space-y-3">
          <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-5 text-center space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">Video removed</p>
              <p className="text-sm text-muted">Tags and score are kept. Add the video back to play or edit.</p>
            </div>
            <AddVideoChoice matchId={match.id} align="center" />
          </div>
          <p className="text-sm font-semibold text-primary" role="status">
            Set {set.setId} finished · {formatScore(score)} · {set.rallies.length}{' '}
            {set.rallies.length === 1 ? 'rally' : 'rallies'}
          </p>
        </div>
      </div>
    </div>
  )
}
