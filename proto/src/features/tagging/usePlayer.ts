import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NORMAL_SPEED } from './rally'
import { segmentAt, segmentsOf, totalDuration, type Segment } from './timeline'

export type PlayerVideo = { id: string; kind: 'demo' | 'file'; durationS: number; src?: string }
export type Window = { a: number; b: number }
/** Why a seek fell short: the saved rally behind, the loop being tagged, the saved rally ahead, or the end. */
export type SeekStop = 'fence' | 'loop' | 'next' | 'end' | null

type Snapshot = {
  time: number
  playing: boolean
  rate: number
  atEnd: boolean
  segIndex: number
}

/**
 * One clock for the whole match: its videos end to end. Demo videos run off
 * this clock; a real file is played by a <video> element that the clock
 * follows. Everything else (tapping, loops, the fence) only sees seconds.
 */
export function usePlayer(videos: PlayerVideo[]) {
  const segs = useMemo(() => segmentsOf(videos), [videos])
  const segsRef = useRef<Segment[]>(segs)
  const videosRef = useRef(videos)
  const t = useRef(0)
  const playing = useRef(false)
  const rate = useRef<number>(NORMAL_SPEED)
  const muted = useRef(true)
  const loop = useRef<Window | null>(null)
  const floor = useRef(0)
  /** With the floor, the window a rally added between two saved ones has to stay in. */
  const ceil = useRef<{ at: number; cb: () => void } | null>(null)
  const boundary = useRef<{ at: number; cb: () => void } | null>(null)
  const el = useRef<HTMLVideoElement | null>(null)
  /** Seconds within the file to jump to once its element is ready. */
  const pending = useRef<number | null>(null)
  const lastSeg = useRef(-1)
  const [snap, setSnap] = useState<Snapshot>({
    time: 0,
    playing: false,
    rate: NORMAL_SPEED,
    atEnd: false,
    segIndex: 0,
  })
  const [isMuted, setIsMuted] = useState(true)

  useEffect(() => {
    segsRef.current = segs
    videosRef.current = videos
  }, [segs, videos])

  const jump = useCallback((g: number) => {
    t.current = g
    const seg = segmentAt(segsRef.current, g)
    const video = seg ? videosRef.current[seg.index] : null
    pending.current = seg && video?.kind === 'file' ? g - seg.offset : null
    lastSeg.current = seg ? seg.index : -1
  }, [])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const all = segsRef.current
      const total = totalDuration(all)
      let time = t.current
      const seg = segmentAt(all, time)
      const video = seg ? videosRef.current[seg.index] : null
      const node = el.current

      if (seg && seg.index !== lastSeg.current) {
        // Rolled into the next video on its own.
        if (video?.kind === 'file' && pending.current === null) pending.current = time - seg.offset
        lastSeg.current = seg.index
      }

      if (seg && video?.kind === 'file') {
        const ready = node && node.dataset.vid === video.id && node.readyState >= 1
        if (ready) {
          if (pending.current !== null) {
            node.currentTime = pending.current
            pending.current = null
          }
          if (node.playbackRate !== rate.current) node.playbackRate = rate.current
          if (node.muted !== muted.current) node.muted = muted.current
          if (playing.current) {
            if (node.ended) time = seg.offset + seg.duration
            else {
              if (node.paused) void node.play().catch(() => undefined)
              if (!node.seeking) time = seg.offset + Math.min(node.currentTime, seg.duration)
            }
          } else if (!node.paused) node.pause()
        }
      } else if (playing.current) {
        time += dt * rate.current
      }

      if (playing.current) {
        const w = loop.current
        const edge = boundary.current
        if (w && time >= w.b) {
          jump(w.a)
          time = w.a
        } else if (edge && time >= edge.at) {
          playing.current = false
          boundary.current = null
          t.current = Math.max(0, edge.at - 0.02)
          // The callback may seek and play again: carry on from where it left the clock.
          edge.cb()
          time = t.current
        } else if (!w && ceil.current && time >= ceil.current.at) {
          playing.current = false
          t.current = ceil.current.at
          ceil.current.cb()
          time = t.current
        }
      }
      if (total > 0 && time >= total) {
        time = total
        playing.current = false
      }
      t.current = time

      const current = segmentAt(all, time)
      const next: Snapshot = {
        time: Math.round(time * 10) / 10,
        playing: playing.current,
        rate: rate.current,
        atEnd: total > 0 && time >= total - 0.05,
        segIndex: current ? current.index : 0,
      }
      setSnap((prev) =>
        prev.time === next.time &&
        prev.playing === next.playing &&
        prev.rate === next.rate &&
        prev.atEnd === next.atEnd &&
        prev.segIndex === next.segIndex
          ? prev
          : next
      )
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      el.current?.pause()
    }
  }, [jump])

  return useMemo(
    () => ({
      ...snap,
      muted: isMuted,
      segs,
      /** Exact time, for taps. The `time` field is rounded for display. */
      getTime: () => t.current,
      isPlaying: () => playing.current,
      play: () => {
        if (t.current >= totalDuration(segsRef.current) - 0.05) return
        playing.current = true
      },
      pause: () => {
        playing.current = false
      },
      /**
       * Stays behind the fence, and inside the loop when one is set. Says what
       * held it back, so the screen can tell the user why it stopped.
       */
      seek: (g: number): SeekStop => {
        const total = totalDuration(segsRef.current)
        const w = loop.current
        const top = ceil.current ? Math.min(total, ceil.current.at) : total
        const lo = w ? w.a : floor.current
        const hi = w ? w.b : top
        jump(Math.min(Math.max(g, lo), Math.max(lo, hi)))
        if (g < lo - 0.05) return w ? 'loop' : lo > 0 ? 'fence' : null
        if (g > hi + 0.05) return w ? 'loop' : top < total ? 'next' : 'end'
        return null
      },
      setRate: (r: number) => {
        rate.current = r
      },
      setMuted: (m: boolean) => {
        muted.current = m
        setIsMuted(m)
      },
      setLoop: (w: Window | null) => {
        loop.current = w
      },
      getLoop: () => loop.current,
      /** Seeking never goes back past this point. */
      setFloor: (g: number) => {
        floor.current = g
      },
      /** Play and seeking never go past this point, and `cb` runs each time play reaches it. Null lifts it. */
      setCeil: (at: number | null, cb?: () => void) => {
        ceil.current = at !== null ? { at, cb: cb ?? (() => undefined) } : null
      },
      /** Stops at `at` and calls back once. Used at the end of a video. */
      setBoundary: (at: number | null, cb?: () => void) => {
        boundary.current = at !== null && cb ? { at, cb } : null
      },
      bindVideo: (node: HTMLVideoElement | null) => {
        el.current = node
      },
    }),
    [snap, isMuted, segs, jump]
  )
}

export type Player = ReturnType<typeof usePlayer>
