import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** A press within this long of a button's action changing is ignored. */
const GUARD_MS = 250

export type ActionGuard = {
  /** The button dims while this is true. */
  waiting: boolean
  /** False during the wait. Keys do not use this. */
  allow: () => boolean
  /**
   * Start the wait now. For a change that happens before React paints a new
   * label, such as Play starting the video.
   */
  arm: () => void
}

/**
 * One place a finger rests. When `action` changes, presses there are ignored
 * for GUARD_MS. The first action is not a change, so a screen that just
 * opened still takes a press. Buttons that share the place share the hook.
 */
export function useActionGuard(action: string): ActionGuard {
  const until = useRef(0)
  const seen = useRef<string | null>(null)
  const timer = useRef<number | null>(null)
  const [waiting, setWaiting] = useState(false)

  const arm = useCallback(() => {
    until.current = Date.now() + GUARD_MS
    setWaiting(true)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setWaiting(false)
    }, GUARD_MS)
  }, [])

  useLayoutEffect(() => {
    if (seen.current === null) {
      seen.current = action
      return
    }
    if (seen.current === action) return
    seen.current = action
    arm()
  }, [action, arm])

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    []
  )

  const allow = () => Date.now() >= until.current
  return { waiting, allow, arm }
}
