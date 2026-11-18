import { useEffect, useRef, useState } from 'react'

export type ClockSpec = { id: string; start: number; rate: number; playing: boolean; loop?: { from: number; to: number } }

/** Stand-in for the video's current time. */
export function useClock(spec: ClockSpec) {
  const [t, setT] = useState(spec.start)
  const ref = useRef(spec.start)
  const specRef = useRef(spec)
  specRef.current = spec

  useEffect(() => {
    ref.current = spec.start
    setT(spec.start)
  }, [spec.id, spec.start])

  useEffect(() => {
    if (!spec.playing) return
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const s = specRef.current
      const dt = Math.min(0.1, (now - prev) / 1000)
      prev = now
      let next = ref.current + dt * s.rate
      if (s.loop && next > s.loop.to) next = s.loop.from
      ref.current = next
      setT(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [spec.playing, spec.id])

  return { t, ref }
}
