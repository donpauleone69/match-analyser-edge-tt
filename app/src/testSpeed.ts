/**
 * Test-only clock. Off unless `proto-test-speed` in localStorage is a number
 * from 2 to 16, set before the page loads; settingsStore reads it and passes
 * it in. A person never sees it: nothing in the speed control changes. The demo clock, Date.now and the timers
 * (the 2 second close, the guards) move by the same factor,
 * so a 2 second close is still 2 seconds of video.
 */
export function installTestSpeed(scale: number): void {
  if (scale === 1) return
  const mark = globalThis as { __protoTestSpeed?: number }
  if (mark.__protoTestSpeed) return
  mark.__protoTestSpeed = scale

  const realNow = performance.now.bind(performance)
  const realDate = Date.now.bind(Date)
  const t0p = realNow()
  const t0d = realDate()
  performance.now = () => t0p + (realNow() - t0p) * scale
  Date.now = () => t0d + (realDate() - t0d) * scale

  // The demo clock takes the time requestAnimationFrame passes in, not a later
  // call to performance.now. Scale that argument too, or the picture stays at 1x.
  const origFrame = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb: FrameRequestCallback) =>
    origFrame((now) => cb(t0p + (now - t0p) * scale))

  const origTimeout = window.setTimeout.bind(window)
  const origInterval = window.setInterval.bind(window)
  window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
    origTimeout(fn, typeof ms === 'number' ? ms / scale : ms, ...(args as []))) as typeof window.setTimeout
  window.setInterval = ((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
    origInterval(fn, typeof ms === 'number' ? ms / scale : ms, ...(args as []))) as typeof window.setInterval
}
