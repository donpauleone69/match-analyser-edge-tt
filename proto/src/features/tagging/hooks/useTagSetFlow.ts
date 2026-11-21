import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { formatScore } from '@/rules/format'
import { calculateTaggedScore } from '@/rules/match'
import type { MatchRecord, SetData } from '@/types/match'
import type { BestPart, Draft, Mark, RallyData, Side, Wing } from '@/types/rally'
import { leaveIds } from '@/rules/continuity'
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
  replaceRally,
  restoreSet,
  saveRally,
  setDraft,
  setFloorG,
  settleFinished,
  startSet,
} from '@/rules/matchOps'
import { markBounds } from '@/rules/marks'
import {
  CAPTURE_SPEED,
  CONTACT_IDLE_MS,
  NORMAL_SPEED,
  addContact,
  canSave,
  captureContactTime,
  emptyDraft,
  tapIgnored,
  otherSide,
  rallyEnd,
  rallyFromDraft,
  retapStart,
  winnerOf,
  undoContact,
} from '@/rules/rally'
import { ZERO, addPoint, countPoints, isSetWon } from '@/rules/score'
import {
  bestAdvance,
  bestAt,
  bestDeleteLast,
  bestSwitchServer,
  bestRally,
  bestSetEnd,
  bestSetPoint,
  bestSetServer,
  carryBest,
  draftFromRally,
  partsOf,
  removeBestContact,
  reviewFocusOf,
  routeAfter,
  setDepth,
  setWingStroke,
  stepEditStop,
  stepPart,
  toggleReview,
  withStep,
  type BestAt,
  type BestEnd,
  type BestTiming,
} from '@/rules/bestFa'
import { useActionGuard, type ActionGuard } from './useActionGuard'
import { useLoopPlayback } from './useLoopPlayback'
import { useTagKeys } from './useTagKeys'
import { useTagMessages } from './useTagMessages'
import { useDeriveTagState } from '../derive/deriveTagState'
import type { BestSavedRow, EditPick, FlowName, Gap, ShotEdit, StartPick, TagLock } from '../models'
import { firstContactG, lastContactG, segmentAt, segmentsOf } from '@/rules/timeline'
import type { Player } from './usePlayer'

/** Watching speed per match, kept while the app is open. */
const watchRates = new Map<string, number>()

export function useTagSetFlow({
  match,
  set,
  lock,
  initialStart,
  player,
  mutateMatch,
  timing,
  navigate,
}: {
  match: MatchRecord
  set: SetData
  lock: TagLock
  initialStart: StartPick | null
  player: Player
  mutateMatch: (id: string, fn: (current: MatchRecord) => MatchRecord) => void
  timing: BestTiming
  navigate: NavigateFunction
}) {
  /** The address no longer picks a flow. Every rally is Best + FA. */
  const flowWanted: FlowName = 'bestfa'
  const playerRef = useRef(player)
  const segs = player.segs
  const names: Record<Side, string> = { me: 'You', them: match.opponent.trim() || 'Opponent' }

  const [selected, setSelected] = useState<Mark | null>(null)
  /** After a nudge the loop tightens around the mark that moved. */
  const [tight, setTight] = useState(false)
  const [lastTap, setLastTap] = useState<number | null>(null)
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  /** The star's review mode. Freed by v0.17.17. Edit Rally and this are exclusive. */
  const [review, setReview] = useState(false)
  const [reviewFocus, setReviewFocus] = useState<BestPart | null>(null)
  const reviewRef = useRef(false)
  const [bestLook, setBestLook] = useState(false)
  /** Edit Rally: the stop on screen, and where Done returns. */
  const [shotEdit, setShotEdit] = useState<ShotEdit | null>(null)
  const shotGuard = useActionGuard(shotEdit ? `shot:${shotEdit.rallyId ?? 'live'}` : 'off')
  /** Corner pad only: an End question opened again from its one-line reminder. */
  const [endBack, setEndBack] = useState<'end' | 'point' | null>(null)
  /**
   * The rally just saved. Its row stays until the next rally's first contact:
   * part buttons and ★ change the saved rally, a cell reopens the rally from `before`.
   */
  const [bestSaved, setBestSaved] = useState<BestSavedRow | null>(null)
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

  const {
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
  } = useDeriveTagState({ match, set, lock, gap, editPick, editOf, shotEdit, serverPick, bestSaved })


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

  const {
    bestSpan,
    setBestSpan,
    reviewPlay,
    loopWhat,
    offsetOf,
    durationOf,
    playBest,
    playEditStop,
    playPart,
    windowFor,
    park,
  } = useLoopPlayback({ playerRef, match, segs, timing, latest, have, watchRate, setSelected, setTight })

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

  // A message belongs to the rally on screen. It goes when that changes.
  const messageScene = live ? `live:${live.contacts[0] ?? ''}` : 'between'
  const { toast, setToast, hint, setHint } = useTagMessages(messageScene)

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
          ? `Set ${set.setId} is open again at ${formatScore(calculateTaggedScore(after) ?? ZERO)}`
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
      setToast({ text: `Set ${set.setId} is open again at ${formatScore(calculateTaggedScore(after) ?? ZERO)}` })
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
  /** The pad's Edit Rally N opens Edit Rally on shot 1. */
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
        ? `Set ${set.setId} is open again at ${formatScore(calculateTaggedScore(after) ?? ZERO)}`
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

  /** A set can be saved once it has a rally and nothing is open, level score included. */
  const readyToFinish = !set.finished && !live && !draftGone && set.rallies.length > 0

  const onFinishSet = () => {
    if (!readyToFinish || readOnly) return
    playerRef.current.pause()
    mutateMatch(match.id, (m) => finishSet(m, set.setId))
    navigate(`/matches/${match.id}/tag?from=${set.setId}`, { replace: true, state: { saved: set.setId } })
  }


  const editFromRallyZone = () => {
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

  const switchInsertServer = () => {
    setServerPick(otherSide(nextServer))
    serverChosen.current = true
  }

  const reviewPill = (id: string) => {
    const row = set.rallies.find((r) => r.id === id)
    if (!row) return
    reviewRef.current = true
    loopPick(row, 'first')
  }

  useTagKeys({ playerRef, latest, handlers: { onPad, onUndoTap, onSave, seekTo } })

  return {
    match,
    set,
    selected,
    setSelected,
    tight,
    setTight,
    lastTap,
    setLastTap,
    boundNote,
    setBoundNote,
    gap,
    setGap,
    serverPick,
    setServerPick,
    flowLock,
    setFlowLock,
    settingsOpen,
    setSettingsOpen,
    review,
    setReview,
    reviewFocus,
    setReviewFocus,
    bestLook,
    setBestLook,
    shotEdit,
    setShotEdit,
    endBack,
    setEndBack,
    bestSaved,
    setBestSaved,
    start,
    setStart,
    editPick,
    setEditPick,
    editOf,
    setEditOf,
    flowWanted,
    playerRef,
    segs,
    names,
    serverChosen,
    reviewRef,
    shotGuard,
    rallyOneRef,
    tapGuardRef,
    editGuardRef,
    flowLockRef,
    watchRate,
    body,
    latest,
    onCeil,
    ceilRef,
    savedRowOf,
    messageScene,
    selKey,
    stepKey,
    seekTo,
    onRate,
    writeDraft,
    closeContacts,
    onPad,
    onUndoTap,
    withUndo,
    applyShotDraft,
    beginShotEdit,
    endStillOpen,
    closeShotEdit,
    stepShot,
    shotRallyIndex,
    onShotDelete,
    onShotKim,
    onShotOut,
    keepShot,
    onShotEnd,
    onShotPoint,
    clearLiveRally,
    onDiscardProgress,
    commitRally,
    onSave,
    rallyOneNow,
    routeBest,
    saveBest,
    parkLive,
    setAfter,
    saveEdit,
    updateSaved,
    loopPick,
    clearReview,
    loopGap,
    flipKind,
    pickable,
    insertHasTaps,
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
    doneEdit,
    onOverEdit,
    onDropAfter,
    onOverrunEdit,
    pickDraft,
    updatePicked,
    onBestServer,
    onNotAShot,
    onBestEnd,
    onBestPoint,
    onBestStroke,
    onBestServe,
    reviewDraft,
    commitMark,
    openReview,
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
    bestSpan,
    setBestSpan,
    reviewPlay,
    loopWhat,
    offsetOf,
    durationOf,
    playBest,
    playEditStop,
    playPart,
    windowFor,
    park,
    toast,
    setToast,
    hint,
    setHint,
  }
}

export type TagSetFlow = ReturnType<typeof useTagSetFlow>
