import { useEffect, useRef, useState, type RefObject } from 'react'
import { SERVE_AFTER_S, SERVE_BEFORE_S } from '@/rules/continuity'
import {
  BEST_SHOT_RATE,
  bestLoop,
  editStopWindow,
  partWindow,
  partsOf,
  type BestLoopWhat,
  type BestTiming,
} from '@/rules/bestFa'
import {
  CAPTURE_SPEED,
  MARK_LOOP_HALF_S,
  SHOT_LOOP_HOLD_S,
  loopShotOf,
  markTime,
  rallyEnd,
  rallyStart,
  shotWindow,
  stageOf,
} from '@/rules/rally'
import { toGlobal, type Segment } from '@/rules/timeline'
import type { MatchRecord } from '@/types/match'
import type { BestPart, Draft, Mark, Stage } from '@/types/rally'
import type { Player, Window } from './usePlayer'

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

export function useLoopPlayback({
  playerRef,
  match,
  segs,
  timing,
  latest,
  have,
  watchRate,
  setSelected,
  setTight,
}: {
  playerRef: RefObject<Player>
  match: MatchRecord
  segs: Segment[]
  timing: BestTiming
  latest: { readonly current: { live: Draft | null } }
  have: Set<string>
  watchRate: { readonly current: number }
  setSelected: (mark: Mark | null) => void
  setTight: (tight: boolean) => void
}) {
  const [bestSpan, setBestSpan] = useState<{ a: number; b: number } | null>(null)
  const reviewPlay = useRef<{ d: Draft; part: BestPart } | null>(null)
  const loopWhat = useRef<{ what: BestLoopWhat; rate: number } | null>(null)

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

  return {
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
  }
}
