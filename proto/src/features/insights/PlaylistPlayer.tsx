import { useEffect, useRef, useState } from 'react'
import type { VideoAsset } from '@/types/match'
import { PictureSeek, VideoStage } from '@/features/tagging/VideoStage'
import { segmentsOf, toGlobal } from '@/features/tagging/timeline'
import { usePlayer } from '@/features/tagging/usePlayer'
import { Icon } from '@/ui-mine'
import type { PlayItem } from './insightCounts'

const HOLD_MS = 500

/**
 * One shared player for a card's playlist. It sticks under the match row,
 * plays each item once, holds the last frame, then steps on.
 */
export function PlaylistPlayer({
  videos,
  name,
  items,
  caption,
  showVersus = false,
  onClose,
}: {
  videos: VideoAsset[]
  name: string
  items: PlayItem[]
  caption: 'name' | 'note'
  /** A pooled list names the match on the bar. */
  showVersus?: boolean
  onClose: () => void
}) {
  const player = usePlayer(videos)
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const itemsRef = useRef(items)
  const atEnd = useRef(false)
  const hold = useRef<number | null>(null)
  const goRef = useRef<(next: number, play: boolean) => void>(() => undefined)
  itemsRef.current = items

  const clearHold = () => {
    if (hold.current !== null) {
      window.clearTimeout(hold.current)
      hold.current = null
    }
  }

  goRef.current = (next: number, play: boolean) => {
    const list = itemsRef.current
    if (list.length === 0) return
    clearHold()
    const i = Math.max(0, Math.min(list.length - 1, next))
    indexRef.current = i
    setIndex(i)
    atEnd.current = false
    const item = list[i]
    const segs = segmentsOf(videos)
    const a = toGlobal(segs, item.videoId, item.a)
    const b = toGlobal(segs, item.videoId, item.b)
    if (a === null || b === null) return
    player.setRate(1)
    player.setMuted(true)
    player.setLoop(null)
    player.setFloor(a)
    player.setCeil(Math.max(b, a), () => {
      if (indexRef.current >= itemsRef.current.length - 1) {
        atEnd.current = true
        return
      }
      hold.current = window.setTimeout(() => goRef.current(indexRef.current + 1, true), HOLD_MS)
    })
    player.seek(a)
    if (play) player.play()
  }

  useEffect(() => {
    goRef.current(0, true)
    return () => {
      if (hold.current !== null) window.clearTimeout(hold.current)
    }
    // Restart when the list itself changes. The player object is stable enough to call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, items])

  const item = items[index] ?? items[0]
  const segs = segmentsOf(videos)
  const a = item ? toGlobal(segs, item.videoId, item.a) : null
  const b = item ? toGlobal(segs, item.videoId, item.b) : null
  const span = a !== null && b !== null ? { a, b: Math.max(b, a) } : { a: 0, b: 1 }
  const opponent = item?.versus.replace(/^vs /, '') || 'Them'
  const names = { me: 'You', them: opponent }
  const bar =
    item && items.length > 0
      ? showVersus
        ? caption === 'note'
          ? `${index + 1} of ${items.length} · ${item.versus} · ${item.note}`
          : `${index + 1} of ${items.length} · ${item.versus}`
        : caption === 'note'
          ? `${index + 1} of ${items.length} · ${item.note}`
          : item.note
            ? `${index + 1} of ${items.length} · ${name} · ${item.note}`
            : `${index + 1} of ${items.length} · ${name}`
      : ''

  const stage = {
    ...player,
    play: () => {
      if (atEnd.current) {
        atEnd.current = false
        goRef.current(0, true)
        return
      }
      player.play()
    },
  }

  return (
    <div className="insights-player bg-bg-app">
      <VideoStage
        player={stage}
        videos={videos}
        names={names}
        bug={
          item
            ? { sets: item.sets, points: item.points, server: item.server, setId: item.setId }
            : { sets: { me: 0, them: 0 }, points: { me: 0, them: 0 }, server: null, setId: 1 }
        }
        hint={null}
        onSeek={(g) => {
          atEnd.current = false
          player.seek(g)
        }}
        onRate={(rate) => player.setRate(rate)}
        seek={
          <PictureSeek
            span={span}
            time={player.time}
            spans={[{ a: span.a, b: span.b, on: true }]}
            band={null}
            onSeek={(g) => {
              atEnd.current = false
              player.seek(g)
            }}
          />
        }
      />
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <button
          type="button"
          aria-label="Previous"
          disabled={index <= 0}
          className="btn-kind-control btn-kind-square inline-flex shrink-0 items-center justify-center text-primary"
          onClick={() => goRef.current(index - 1, player.playing)}
        >
          <Icon name="chevron-left" size="sm" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm text-primary" data-playlist-caption="">
          {bar}
        </p>
        <button
          type="button"
          aria-label="Next"
          disabled={index >= items.length - 1}
          className="btn-kind-control btn-kind-square inline-flex shrink-0 items-center justify-center text-primary"
          onClick={() => goRef.current(index + 1, player.playing)}
        >
          <Icon name="chevron-right" size="sm" />
        </button>
        <button
          type="button"
          aria-label="Close"
          className="btn-kind-control btn-kind-square inline-flex shrink-0 items-center justify-center text-primary"
          onClick={onClose}
        >
          <Icon name="x" size="sm" />
        </button>
      </div>
    </div>
  )
}
