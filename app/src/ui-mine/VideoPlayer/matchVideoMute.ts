/**
 * Per-surface mute policy for the shared videoPlaybackStore.
 *
 * Tagging = mute (Pass 1 default). Watch surfaces = unmute so Clips / Review
 * aren't stuck silent after a tagging session.
 */

import { useEffect } from 'react'
import { useVideoPlaybackStore } from './videoPlaybackStore'

/** Call from Pass 1 / Simple / Rally edit — mute while tagging. */
export function useTaggingMuteDefault(enabled = true) {
  const setMuted = useVideoPlaybackStore((s) => s.setMuted)
  useEffect(() => {
    if (!enabled) return
    setMuted(true)
  }, [enabled, setMuted])
}

/** Call from Clips / Review rally player — unmute for watch playback. */
export function useWatchUnmuteDefault(enabled = true) {
  const setMuted = useVideoPlaybackStore((s) => s.setMuted)
  useEffect(() => {
    if (!enabled) return
    setMuted(false)
  }, [enabled, setMuted])
}
