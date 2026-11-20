import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Icon } from '@/ui-mine'
import { useDemo, type MatchRecord, type SetMark } from '@/data/demoStore'
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
 * Re-mark keeps the set's own number. A new mark may use any free number,
 * with the one asked for on the Tag page already picked.
 */
function markChoices(match: MatchRecord, at: number, own: number | null, prefer: number | null): number[] {
  const allowed = allowedMarkNumbers(match, at, own ?? undefined)
  if (own !== null) return allowed.includes(own) ? [own] : []
  if (prefer !== null && allowed.includes(prefer)) return [prefer, ...allowed.filter((n) => n !== prefer)]
  return allowed
}

const LANDSCAPE_QUERY = '(orientation: landscape), (min-aspect-ratio: 1/1)'

function useLandscape() {
  const [land, setLand] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE_QUERY)
    const apply = () => setLand(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return land
}

/**
 * Mark a set. Start on this video, end on this video or the next one,
 * pick a set number, then complete or part filmed.
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
  const landscape = useLandscape()
  const opened = useRef<string | null>(null)

  const remark = match?.sets.find((s) => s.setId === remarkId && s.mark) ?? null
  const asked = Number.isInteger(remarkId) && remarkId > 0 ? remarkId : null

  useEffect(() => {
    if (!match || !video) return
    const segs = segmentsOf(match.videos)
    const off = toGlobal(segs, video.id, 0) ?? 0
    const idx = match.videos.findIndex((v) => v.id === video.id)
    const next = match.videos[idx + 1]
    const reach =
      phase === 'end' && next ? (toGlobal(segs, next.id, 0) ?? off) + next.durationS : off + video.durationS
    const p = playerRef.current
    p.setFloor(off)
    p.setCeil(reach)
    if (opened.current === video.id) return
    opened.current = video.id
    p.pause()
    const start = remark?.mark ? (markBounds(match.videos, remark.mark)?.start ?? off) : off
    p.seek(Math.min(Math.max(start, off), off + video.durationS))
    // Opens once. The end step may then run onto the next video.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id, phase])

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
    const next = match.videos[index + 1]
    if (here.videoId !== from.videoId && here.videoId !== next?.id) {
      setNote('A set can run onto the next video only.')
      return
    }
    const startG = toGlobal(segs, from.videoId, from.t) ?? here.g
    if (here.g <= startG + 0.05) {
      setNote('The end is before the start.')
      return
    }
    if (markOverlaps(match.videos, match.sets, startG, here.g, remark?.setId)) {
      setNote('That time is already in a set.')
      return
    }
    const choices = markChoices(match, startG, remark?.setId ?? null, asked)
    if (choices.length === 0) {
      setNote(remark ? 'This set cannot sit here.' : 'No set number is free here.')
      return
    }
    setTo({ videoId: here.videoId, t: here.t })
    setNumber(choices[0])
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
      ? markChoices(match, toGlobal(segs, from.videoId, from.t) ?? 0, remark?.setId ?? null, asked)
      : []

  const steps = (
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
          <div className="flex shrink-0 gap-1.5 overflow-x-auto" role="group" aria-label="Set number" data-mark-numbers>
            {allowed.map((n) => (
              <Button
                key={n}
                kind="control"
                variant={n === number ? 'primary' : 'secondary'}
                aria-pressed={n === number}
                className="shrink-0"
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
  )

  const nextVideo = match.videos[index + 1]
  const barEnd =
    phase === 'end' && nextVideo
      ? (toGlobal(segs, nextVideo.id, 0) ?? off) + nextVideo.durationS
      : off + video.durationS

  return (
    <div className="tag-set bg-bg-app" data-mark-screen data-mark-step={phase} data-pad-split={landscape ? '' : undefined}>
      {landscape ? (
        <>
          <div className="pad-wing overflow-y-auto" data-pad-wing="left">
            {steps}
          </div>
          <div className="pad-wing" data-pad-wing="right" />
        </>
      ) : null}
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
                span={{ a: off, b: barEnd }}
                time={player.time}
                spans={[]}
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
        {landscape ? null : <div className="tag-entry">{steps}</div>}
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
