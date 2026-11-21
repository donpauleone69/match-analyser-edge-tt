import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Card } from '@/ui-mine'
import { matchSetsWon, taggedScore } from '@/rules/match'
import { useDemo } from '@/data/demoStore'
import type { MatchRecord, SetMark, VideoAsset } from '@/types/match'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { useArchiveStep } from '@/features/match/archiveJobs'
import { TagVideoCard } from '@/features/match/TagVideoCard'
import { reopenSet, saveMark } from '@/rules/matchOps'
import type { Side } from '@/types/rally'
import { lineAction, markBounds, newMarkAt, setIncomplete, videoMoveBreaks, type WingEdge } from '@/rules/marks'
import { useActionGuard } from '@/features/tagging/pressGuard'
import { TAG_LOCK_LINE, useTagLock } from '@/features/tagging/tagLock'
import { PictureSeek, VideoStage } from '@/features/tagging/VideoStage'
import { segmentsOf } from '@/rules/timeline'
import { usePlayer } from '@/features/tagging/usePlayer'

/**
 * Tag page. One shared player, then a card per video. The page places sets
 * and opens them. Scores and the result stay on Details.
 */
export function MatchTagChecklist() {
  const { matchId = '' } = useParams()
  const [search] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const savedId = (location.state as { saved?: number } | null)?.saved ?? null
  const arrive = useActionGuard(savedId !== null ? `saved:${savedId}` : 'off')
  useLayoutEffect(() => {
    if (savedId !== null) arrive.arm()
  }, [savedId, arrive.arm])
  // Save set sits where Home sits on this page. While the arrival wait is on,
  // a second tap must land nowhere, including the bottom nav.
  useEffect(() => {
    if (!arrive.waiting) return
    const swallow = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    document.addEventListener('pointerdown', swallow, true)
    document.addEventListener('click', swallow, true)
    return () => {
      document.removeEventListener('pointerdown', swallow, true)
      document.removeEventListener('click', swallow, true)
    }
  }, [arrive.waiting])
  const { getMatch, moveVideo, mutateMatch } = useDemo()
  const match = getMatch(matchId)
  const player = usePlayer(match?.videos ?? [])
  const lock = useTagLock(matchId, match)
  const running = useArchiveStep(matchId) !== null
  const [picked, setPicked] = useState<number | null>(null)
  const [wingHint, setWingHint] = useState<string | null>(null)
  const [stick, setStick] = useState(0)
  const applied = useRef(false)
  const hintTimer = useRef<number | null>(null)
  const matchRef = useRef(match)
  matchRef.current = match

  const focus = (setId: number, mark: SetMark) => {
    setPicked(setId)
    const current = matchRef.current
    if (!current) return
    const b = markBounds(current.videos, mark)
    if (!b) return
    const time = player.getTime()
    if (time >= b.start - 0.05 && time <= b.end + 0.05) return
    player.pause()
    player.seek(b.start)
  }

  useEffect(() => {
    const chrome = document.querySelector('[data-sticky-chrome]')
    if (!chrome) return
    const apply = () => setStick(chrome.getBoundingClientRect().height)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(chrome)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!match || applied.current) return
    applied.current = true
    const show = (videoId: string) => {
      requestAnimationFrame(() => {
        document.querySelector(`[data-video-block="${videoId}"]`)?.scrollIntoView({ block: 'center' })
      })
    }
    const raw = search.get('set')
    if (raw) {
      const setId = Number(raw)
      const s = match.sets.find((x) => x.setId === setId && x.mark)
      if (!s?.mark) return
      focus(setId, s.mark)
      show(s.mark.from.videoId)
      return
    }
    const from = search.get('from')
    if (from) {
      const s = match.sets.find((x) => x.setId === Number(from) && x.mark)
      if (s?.mark) show(s.mark.from.videoId)
      return
    }
    const video = search.get('video')
    if (video && match.videos.some((v) => v.id === video)) show(video)
  }, [match, search])

  if (!match) return null

  const flash = (text: string) => {
    setWingHint(text)
    if (hintTimer.current) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setWingHint(null), 1600)
  }

  const openSet = (setId: number) => {
    if (!arrive.allow()) return
    const s = match.sets.find((x) => x.setId === setId)
    if (!s) return
    if (lock && lineAction(s) !== 'Open') return
    if (setIncomplete(s)) mutateMatch(match.id, (m) => reopenSet(m, setId))
    navigate(`/matches/${match.id}/tag/${setId}`)
  }

  const dropVideo = (video: VideoAsset) => {
    const ids = match.sets.flatMap((s) =>
      s.mark && (s.mark.from.videoId === video.id || s.mark.to.videoId === video.id) ? [s.setId] : []
    )
    mutateMatch(match.id, (m) => ({
      ...m,
      videos: m.videos.filter((v) => v.id !== video.id),
      sets: m.sets.map((s) => (ids.includes(s.setId) ? { ...s, mark: null } : s)),
    }))
    setPicked(null)
  }

  const addSet = (videoId: string) => {
    const seg = player.segs.find((s) => s.id === videoId)
    const onThis = player.segs[player.segIndex]?.id === videoId
    const at = onThis && seg ? player.getTime() - seg.offset : null
    const made = newMarkAt(match, videoId, at)
    if (!made.ok) {
      flash(made.reason)
      return
    }
    mutateMatch(match.id, (m) => saveMark(m, made.setId, made.mark))
    focus(made.setId, made.mark)
  }

  const commitWing = (setId: number, edge: WingEdge, videoId: string, local: number, hint: string | null) => {
    const s = match.sets.find((x) => x.setId === setId)
    const seg = segmentsOf(match.videos).find((x) => x.id === videoId)
    if (!s?.mark || !seg) return
    const t = Math.min(seg.duration, Math.max(0, Math.round(local * 10) / 10))
    if (hint) flash(hint)
    const prev = edge === 'start' ? s.mark.from : s.mark.to
    const point = { videoId, t }
    if (prev.videoId !== videoId || Math.abs(prev.t - t) >= 0.05) {
      const mark = edge === 'start' ? { ...s.mark, from: point } : { ...s.mark, to: point }
      mutateMatch(match.id, (m) => saveMark(m, setId, mark))
    }
    player.pause()
    // The end of this video is the same instant as the start of the next one.
    // Sit just clear of it, so the playhead is not already inside a set that starts there.
    const shown = t >= seg.duration - 1e-3 ? Math.max(0, seg.duration - 0.06) : t
    player.seek(seg.offset + shown)
  }

  const seg = player.segs[player.segIndex]
  const activeId = seg?.id ?? null
  const names = { me: 'You' as const, them: match.opponent.trim() || 'Opponent' }
  const held = Boolean(lock) || running

  if (match.videos.length === 0) {
    return (
      <div className="px-4 py-4">
        <Card data-no-video>
          <AddVideoChoice matchId={match.id} hint={false} disabled={running} />
        </Card>
      </div>
    )
  }

  return (
    <div className="tag-page">
      {arrive.waiting
        ? createPortal(<div data-arrive-block className="fixed inset-0 z-[60]" aria-hidden />, document.body)
        : null}
      {seg ? (
        <div className="tag-preview sticky z-10 bg-bg-app" style={{ top: stick }} data-preview-player>
          <VideoStage
            player={player}
            videos={match.videos}
            names={names}
            bug={scoreBug(match, player.time)}
            hint={wingHint}
            onSeek={(g) => player.seek(g)}
            onRate={player.setRate}
            seek={
              <PictureSeek
                span={{ a: seg.offset, b: seg.offset + seg.duration }}
                time={player.time}
                spans={[]}
                band={null}
                onSeek={(g) => player.seek(g)}
              />
            }
          />
        </div>
      ) : null}
      <div className="tag-cards space-y-4 px-4 py-4">
        <p className="text-xs text-muted" data-tag-note>
          Only complete sets are tagged.
        </p>
        {lock ? (
          <p className="rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary" role="status">
            {TAG_LOCK_LINE[lock]}
          </p>
        ) : null}
        {match.videos.map((video, index) => (
          <TagVideoCard
            key={video.id}
            match={match}
            video={video}
            index={index}
            locked={held}
            active={activeId === video.id}
            playhead={activeId === video.id && seg ? player.time - seg.offset : null}
            pickedId={picked}
            onMove={(by) => {
              if (videoMoveBreaks(match, video.id, by)) flash('That breaks the set order')
              else moveVideo(match.id, video.id, by)
            }}
            onRemove={() => dropVideo(video)}
            onOpen={openSet}
            allow={arrive.allow}
            onSelect={focus}
            onClear={() => setPicked(null)}
            onSeek={(g) => {
              player.pause()
              player.seek(g)
            }}
            onScrub={(g) => player.seek(g)}
            onPreview={(local) => {
              player.pause()
              const here = segmentsOf(match.videos).find((s) => s.id === video.id)
              if (!here) return
              const shown = local >= here.duration - 1e-3 ? Math.max(0, here.duration - 0.06) : local
              player.seek(here.offset + shown)
            }}
            onCommit={(setId, edge, local, hint) => commitWing(setId, edge, video.id, local, hint)}
            onHint={flash}
            onAdd={() => addSet(video.id)}
          />
        ))}
        <AddVideoChoice matchId={match.id} hint={false} disabled={held} />
      </div>
    </div>
  )
}

function scoreBug(match: MatchRecord, time: number) {
  const sets = matchSetsWon(match)
  let setId = match.sets[0]?.setId ?? 1
  let points = { me: 0, them: 0 }
  let server: Side = 'me'
  for (const s of match.sets) {
    if (!s.mark) continue
    const b = markBounds(match.videos, s.mark)
    if (!b) continue
    if (time >= b.start - 0.05 && time <= b.end + 0.05) {
      setId = s.setId
      points = taggedScore(s) ?? points
      server = s.firstServer
      break
    }
  }
  return { sets, points, server, setId }
}
