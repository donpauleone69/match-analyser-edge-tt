import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { useDemo, type SetMark } from '@/data/demoStore'
import { saveMark } from '@/features/tagging/matchOps'
import {
  allowedMarkNumbers,
  markBounds,
  markOverlaps,
  rallyOutside,
  spansOnVideo,
  type VideoSpan,
} from '@/features/tagging/setMark'
import { segmentAt, segmentsOf, toGlobal } from '@/features/tagging/timeline'
import { usePlayer } from '@/features/tagging/usePlayer'
import { PictureSeek, VideoStage } from '@/features/tagging/VideoStage'
import type { Side } from '@/features/tagging/rally'

type Phase = 'start' | 'end' | 'label' | 'whole'

/**
 * Mark a set on one video. Start, end, a set number, then complete or part filmed.
 * A set that runs onto the next video comes in a later slice.
 */
export function MarkSetScreen() {
  const { matchId = '', videoId = '' } = useParams()
  const [search] = useSearchParams()
  const remarkId = Number(search.get('set') ?? '')
  const { getMatch, mutateMatch } = useDemo()
  const match = getMatch(matchId)
  const video = match?.videos.find((v) => v.id === videoId)
  const player = usePlayer(match?.videos ?? [])
  const playerRef = useRef(player)
  playerRef.current = player
  const [phase, setPhase] = useState<Phase>('start')
  const [from, setFrom] = useState<{ videoId: string; t: number } | null>(null)
  const [to, setTo] = useState<{ videoId: string; t: number } | null>(null)
  const [number, setNumber] = useState<number | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const remark = match?.sets.find((s) => s.setId === remarkId && s.mark) ?? null

  useEffect(() => {
    if (!match || !video) return
    const segs = segmentsOf(match.videos)
    const off = toGlobal(segs, video.id, 0) ?? 0
    const p = playerRef.current
    p.pause()
    p.setFloor(off)
    p.setCeil(off + video.durationS)
    const start = remark?.mark ? (markBounds(match.videos, remark.mark)?.start ?? off) : off
    p.seek(start)
    // The video opens once, paused at the start of this video or the old mark.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id])

  if (!match) return null
  if (!video) return <Navigate to={`/matches/${match.id}/tag`} replace />

  const names: Record<Side, string> = { me: 'You', them: match.opponent.trim() || 'Opponent' }
  const index = match.videos.findIndex((v) => v.id === video.id)
  const segs = segmentsOf(match.videos)
  const off = toGlobal(segs, video.id, 0) ?? 0
  const spans = spansOnVideo(match.videos, match.sets, video.id)
  const old = remark?.mark ? markBounds(match.videos, remark.mark) : null
  const picked =
    from && to
      ? (() => {
          const a = toGlobal(segs, from.videoId, from.t)
          const b = toGlobal(segs, to.videoId, to.t)
          return a !== null && b !== null ? { a, b } : null
        })()
      : null

  const pointHere = () => {
    const g = playerRef.current.getTime()
    const seg = segmentAt(segs, g)
    if (!seg) return null
    return { videoId: seg.id, t: Math.round((g - seg.offset) * 100) / 100, g }
  }

  const onStart = () => {
    const here = pointHere()
    if (!here || here.videoId !== video.id) {
      setNote('Start on this video.')
      return
    }
    setFrom({ videoId: here.videoId, t: here.t })
    setTo(null)
    setNumber(null)
    setNote(null)
    setPhase('end')
  }

  const onEnd = () => {
    const here = pointHere()
    if (!from || !here) return
    if (here.videoId !== from.videoId) {
      setNote('End on this video.')
      return
    }
    if (here.t <= from.t + 0.05) {
      setNote('The end is before the start.')
      return
    }
    const startG = toGlobal(segs, from.videoId, from.t) ?? here.g
    if (markOverlaps(match.videos, match.sets, startG, here.g, remark?.setId)) {
      setNote('That time is already in a set.')
      return
    }
    const allowed = allowedMarkNumbers(match, startG, remark?.setId)
    if (allowed.length === 0) {
      setNote('No set number is free here.')
      return
    }
    setTo({ videoId: here.videoId, t: here.t })
    const prefer = Number.isInteger(remarkId) && remarkId > 0 ? remarkId : null
    setNumber(prefer !== null && allowed.includes(prefer) ? prefer : allowed[0])
    setNote(null)
    setPhase('label')
  }

  const onSave = (complete: boolean) => {
    if (!from || !to || number === null) return
    const existing = match.sets.find((s) => s.setId === number)
    const kept = existing && existing.rallies.length > 0 ? (existing.mark?.complete ?? true) : complete
    const mark: SetMark = { from, to, complete: kept }
    if (existing && existing.rallies.length > 0) {
      const outside = rallyOutside(match.videos, existing.rallies, mark)
      if (outside) {
        setNote(
          outside.side === 'before'
            ? `Rally ${outside.n} is before the new start.`
            : `Rally ${outside.n} is after the new end.`
        )
        return
      }
    }
    mutateMatch(match.id, (m) => saveMark(m, number, mark))
    const endG = toGlobal(segs, to.videoId, to.t) ?? playerRef.current.getTime()
    playerRef.current.pause()
    playerRef.current.seek(endG)
    setFrom(null)
    setTo(null)
    setNumber(null)
    setPhase('start')
    setNote(`Set ${number} marked.`)
  }

  const allowed =
    from && phase !== 'start'
      ? allowedMarkNumbers(match, toGlobal(segs, from.videoId, from.t) ?? 0, remark?.setId)
      : []

  return (
    <div className="tag-set bg-bg-app" data-mark-screen data-mark-step={phase}>
      <div className="tag-flow">
        <div className="tag-media">
          <VideoStage
            player={player}
            videos={match.videos}
            names={names}
            bug={{ sets: { me: 0, them: 0 }, points: { me: 0, them: 0 }, server: 'me', setId: number ?? remark?.setId ?? 1 }}
            hint={note}
            onSeek={(g) => {
              player.seek(g)
              setNote(null)
            }}
            onRate={(rate) => player.setRate(rate)}
            leading={
              <Link
                to={`/matches/${match.id}/tag`}
                aria-label="Back"
                className="btn-kind-control btn-kind-square inline-flex items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
              >
                <Icon name="chevron-left" size="sm" />
              </Link>
            }
            seek={
              <PictureSeek
                span={{ a: off, b: off + video.durationS }}
                time={player.time}
                markers={[]}
                band={picked ?? (old ? { a: old.start, b: old.end } : null)}
                onSeek={(g) => {
                  player.seek(g)
                  setNote(null)
                }}
              />
            }
          />
        </div>
        <div className="tag-setzone">
          <h1 className="shrink-0 text-sm font-bold text-primary">Video {index + 1}</h1>
          <MarkStrip duration={video.durationS} spans={spans} />
        </div>
        <div className="tag-entry">
          <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 px-3 py-3" data-tag-body>
            {phase === 'start' ? (
              <>
                <p className="text-sm text-primary">Find the first serve of the set.</p>
                <Button fullWidth kind="main" data-mark-start onClick={onStart}>
                  Start here
                </Button>
              </>
            ) : null}
            {phase === 'end' ? (
              <>
                <p className="text-sm text-primary">Find the last point.</p>
                <Button fullWidth kind="main" data-mark-end onClick={onEnd}>
                  End here
                </Button>
              </>
            ) : null}
            {phase === 'label' && number !== null ? (
              <>
                <p className="text-sm text-primary">Which set is this?</p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Set number">
                  {allowed.map((n) => (
                    <Button
                      key={n}
                      kind="control"
                      variant={n === number ? 'primary' : 'secondary'}
                      aria-pressed={n === number}
                      data-mark-number={n}
                      onClick={() => setNumber(n)}
                    >
                      Set {n}
                    </Button>
                  ))}
                </div>
                <Button
                  fullWidth
                  kind="main"
                  data-mark-label
                  onClick={() => {
                    const existing = match.sets.find((s) => s.setId === number)
                    if (existing && existing.rallies.length > 0) onSave(existing.mark?.complete ?? true)
                    else setPhase('whole')
                  }}
                >
                  {match.sets.some((s) => s.setId === number && s.rallies.length > 0) ? 'Save' : `Use set ${number}`}
                </Button>
              </>
            ) : null}
            {phase === 'whole' ? (
              <>
                <p className="text-sm text-primary">Is the whole set on video?</p>
                <div className="flex gap-2">
                  <Button fullWidth kind="main" data-mark-complete onClick={() => onSave(true)}>
                    Complete
                  </Button>
                  <Button fullWidth kind="main" variant="secondary" data-mark-part onClick={() => onSave(false)}>
                    Part filmed
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function MarkStrip({ duration, spans }: { duration: number; spans: VideoSpan[] }) {
  const scale = duration > 0 ? duration : 1
  return (
    <div className="tag-strip min-w-0 flex-1" data-video-strip>
      {spans.map((span) => (
        <span
          key={span.setId}
          className="tag-strip-block"
          data-strip-set={span.setId}
          data-part={span.part ? 'true' : 'false'}
          style={{ left: `${(span.a / scale) * 100}%`, width: `${((span.b - span.a) / scale) * 100}%` }}
        >
          S{span.setId}
        </span>
      ))}
    </div>
  )
}
