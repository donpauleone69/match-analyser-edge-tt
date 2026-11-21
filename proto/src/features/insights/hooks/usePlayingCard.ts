import { useEffect, useState } from 'react'
import type { PlayItem } from '@/rules/insights'

export type Playing = {
  cardId: string
  name: string
  items: PlayItem[]
  caption: 'name' | 'note'
}

/**
 * The open insight playlist and the scroll that follows it.
 * Pass `resetKey` to clear when that value changes (global filters).
 * Omit it and the card stays put (match insights).
 */
export function usePlayingCard(resetKey?: unknown) {
  const [playing, setPlaying] = useState<Playing | null>(null)

  useEffect(() => {
    if (resetKey === undefined) return
    setPlaying(null)
  }, [resetKey])

  useEffect(() => {
    if (!playing) return
    document.querySelector(`[data-insight="${playing.cardId}"]`)?.scrollIntoView({ block: 'start' })
  }, [playing])

  const open = (cardId: string, name: string, items: PlayItem[], caption: 'name' | 'note') => {
    setPlaying({ cardId, name, items, caption })
  }

  return { playing, setPlaying, open }
}
