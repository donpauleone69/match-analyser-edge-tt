import { useEffect, useRef, type RefObject } from 'react'
import type { Player } from './usePlayer'

/** Back, between rallies: far enough to see a serve again. */
const BACK_S = 5

type KeyHandlers = {
  onPad: () => void
  onUndoTap: () => void
  onSave: () => void
  seekTo: (g: number) => void
}

export function useTagKeys({
  playerRef,
  latest,
  handlers,
}: {
  playerRef: RefObject<Player>
  latest: { readonly current: { review: boolean; mode: string } }
  handlers: KeyHandlers
}) {
  const keys = useRef(handlers)
  useEffect(() => {
    keys.current = handlers
  })
  // Keys (desktop). Space is the pad. Backspace deletes a tap while tapping
  // and steps back 5 seconds between rallies. K plays or pauses, arrows step 10 seconds.
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
}
