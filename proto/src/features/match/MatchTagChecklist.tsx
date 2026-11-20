import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, buttonKindTextLink } from '@/ui-mine'
import {
  derivePhase,
  emptySet,
  formatScore,
  matchSetsWon,
  missingVideoIds,
  parseEntered,
  resultDiffers,
  resultSetCount,
  setBlockingFinish,
  setSettled,
  setState,
  taggedScore,
  useDemo,
  type MatchRecord,
  type SetData,
  type SetMark,
  type VideoAsset,
} from '@/data/demoStore'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { useArchiveStep } from '@/features/match/archiveJobs'
import { TagVideoCard } from '@/features/match/TagVideoCard'
import { isRealResult, videoRallyCount } from '@/features/match/matchChecks'
import { applyTaggedResult, finishMatch, reopenMatch, restoreSet, saveMark } from '@/features/tagging/matchOps'
import type { Side } from '@/features/tagging/rally'
import {
  clampWing,
  gapsOf,
  MIN_SET_S,
  markBounds,
  markState,
  newMarkAt,
  notOnVideo,
  spansOnVideo,
  videoLocked,
  videoMoveBreaks,
  videoStatus,
  wingLimits,
  type WingEdge,
} from '@/features/tagging/setMark'
import { TAG_LOCK_LINE, useTagLock } from '@/features/tagging/tagLock'
import { PictureSeek, VideoStage } from '@/features/tagging/VideoStage'
import { segmentsOf } from '@/features/tagging/timeline'
import { usePlayer } from '@/features/tagging/usePlayer'
import { cn } from '@/helpers/utils'

const flagClass =
  'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary flex flex-wrap items-center justify-between gap-2'

const linkClass = cn('text-sm font-semibold text-brand underline', buttonKindTextLink)

const UNDO_MS = 6000


/**
 * Tag page. One shared player, then a card per video.
 * Sets are marked and edited in the card.
 */
export function MatchTagChecklist() {
  const { matchId = '' } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { getMatch, moveVideo, mutateMatch } = useDemo()
  const match = getMatch(matchId)
  const player = usePlayer(match?.videos ?? [])
  const lock = useTagLock(matchId, match)
  const running = useArchiveStep(matchId) !== null
  const [menuId, setMenuId] = useState<string | null>(null)
  const [asking, setAsking] = useState<string | null>(null)
  const [removed, setRemoved] = useState<{ video: VideoAsset; index: number; marks: { setId: number; mark: SetMark }[] } | null>(null)
  const [undoSet, setUndoSet] = useState<{ before: SetData; text: string; also?: SetData } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [picked, setPicked] = useState<{ setId: number; videoId: string } | null>(null)
  const [lastWing, setLastWing] = useState<WingEdge>('end')
  const [opened, setOpened] = useState<string[]>([])
  const [wingHint, setWingHint] = useState<string | null>(null)
  const [stick, setStick] = useState(0)
  const applied = useRef(false)
  const hintTimer = useRef<number | null>(null)
  const seekAt = useRef(0)
  const matchRef = useRef(match)
  matchRef.current = match
  const nudgeRef = useRef<{
    before: SetData
    setId: number
    edge: WingEdge
    videoId: string
    t: number
    timer: number | null
    delay: number | null
  } | null>(null)

  useEffect(() => {
    if (!removed) return
    const timer = setTimeout(() => setRemoved(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [removed])

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
      const asked = search.get('video')
      const onAsked = Boolean(asked && (s.mark.from.videoId === asked || s.mark.to.videoId === asked))
      const videoId = onAsked && asked ? asked : s.mark.from.videoId
      setPicked({ setId, videoId })
      if (videoStatus(match, videoId) === 'Done') {
        setOpened((ids) => (ids.includes(videoId) ? ids : [...ids, videoId]))
      }
      show(videoId)
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

  useEffect(
    () => () => {
      const live = nudgeRef.current
      if (!live) return
      if (live.delay) window.clearTimeout(live.delay)
      if (live.timer) window.clearInterval(live.timer)
    },
    []
  )

  if (!match) return null

  const phase = derivePhase(match)
  const videoGone = missingVideoIds(match).length > 0
  const openSet = (setId: number) => navigate(`/matches/${match.id}/tag/${setId}`)
  const dropVideo = (video: VideoAsset, index: number) => {
    const marks = match.sets.flatMap((s) =>
      s.mark && (s.mark.from.videoId === video.id || s.mark.to.videoId === video.id)
        ? [{ setId: s.setId, mark: s.mark }]
        : []
    )
    mutateMatch(match.id, (m) => ({
      ...m,
      videos: m.videos.filter((v) => v.id !== video.id),
      sets: m.sets.map((s) => (marks.some((k) => k.setId === s.setId) ? { ...s, mark: null } : s)),
    }))
    setRemoved({ video, index, marks })
    setMenuId(null)
    setAsking(null)
  }

  const onRemove = (video: VideoAsset, index: number) => {
    const held = match.sets.filter(
      (s) =>
        s.mark &&
        (s.mark.from.videoId === video.id || s.mark.to.videoId === video.id) &&
        (markState(s) === 'saved' || markState(s) === 'tagging')
    )
    if (held.length > 0) {
      setNote(
        held.length === 1
          ? `Set ${held[0].setId} still has tags. Delete the tags first.`
          : 'Sets on this video still have tags. Delete the tags first.'
      )
      return
    }
    if (videoLocked(match, video.id)) {
      setNote('This video is part of a set. Delete that set first.')
      return
    }
    if (video.archived || videoRallyCount(match, video.id) > 0) setAsking(video.id)
    else {
      dropVideo(video, index)
    }
  }

  const flash = (text: string) => {
    setWingHint(text)
    if (hintTimer.current) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setWingHint(null), 1600)
  }

  const addSet = (videoId: string, prefer?: number) => {
    const seg = player.segs.find((s) => s.id === videoId)
    const onThis = player.segs[player.segIndex]?.id === videoId
    const at = onThis && seg ? player.getTime() - seg.offset : null
    const made = newMarkAt(match, videoId, at, prefer)
    if (!made.ok) {
      setNote(made.reason)
      return
    }
    const before = match.sets.find((s) => s.setId === made.setId) ?? emptySet(made.setId)
    setUndoSet({ before, text: `Set ${made.setId} added` })
    mutateMatch(match.id, (m) => saveMark(m, made.setId, made.mark))
    setOpened((ids) => (ids.includes(videoId) ? ids : [...ids, videoId]))
    setPicked({ setId: made.setId, videoId })
    setLastWing('end')
    setNote(null)
  }

  const endNudge = () => {
    const live = nudgeRef.current
    if (!live) return
    if (live.delay) window.clearTimeout(live.delay)
    if (live.timer) window.clearInterval(live.timer)
    nudgeRef.current = null
  }

  const applyNudge = (dir: -1 | 1) => {
    const live = nudgeRef.current
    const current = matchRef.current
    if (!live || !current) return
    const s = current.sets.find((x) => x.setId === live.setId)
    if (!s?.mark) return
    const seg = segmentsOf(current.videos).find((x) => x.id === live.videoId)
    if (!seg) return
    const limit = wingLimits(current, s.setId, live.edge)
    const clamped = limit ? clampWing(limit, seg.offset + live.t + dir) : { at: seg.offset + live.t + dir, hint: null }
    const next = Math.min(seg.duration, Math.max(0, Math.round((clamped.at - seg.offset) * 10) / 10))
    if (Math.abs(next - live.t) < 0.05) {
      if (clamped.hint) flash(clamped.hint)
      return
    }
    live.t = next
    const point = { videoId: live.videoId, t: next }
    const mark = live.edge === 'start' ? { ...s.mark, from: point } : { ...s.mark, to: point }
    setUndoSet({ before: live.before, text: `Set ${s.setId} ${live.edge} moved` })
    mutateMatch(current.id, (m) => saveMark(m, s.setId, mark))
    player.pause()
    player.seek(seg.offset + next)
    if (clamped.hint) flash(clamped.hint)
  }

  const startNudge = (dir: -1 | 1) => {
    if (!picked) return
    const s = match.sets.find((x) => x.setId === picked.setId)
    if (!s?.mark) return
    const point = lastWing === 'start' ? s.mark.from : s.mark.to
    endNudge()
    nudgeRef.current = {
      before: s,
      setId: s.setId,
      edge: lastWing,
      videoId: point.videoId,
      t: point.t,
      timer: null,
      delay: null,
    }
    applyNudge(dir)
    const delay = window.setTimeout(() => {
      const timer = window.setInterval(() => applyNudge(dir), 140)
      if (nudgeRef.current) nudgeRef.current.timer = timer
    }, 350)
    if (nudgeRef.current) nudgeRef.current.delay = delay
  }

  const commitWing = (setId: number, edge: WingEdge, videoId: string, local: number, hint: string | null) => {
    const s = match.sets.find((x) => x.setId === setId)
    const seg = segmentsOf(match.videos).find((x) => x.id === videoId)
    if (!s?.mark || !seg) return
    const t = Math.min(seg.duration, Math.max(0, Math.round(local * 10) / 10))
    const prev = edge === 'start' ? s.mark.from : s.mark.to
    setLastWing(edge)
    if (hint) flash(hint)
    if (prev.videoId === videoId && Math.abs(prev.t - t) < 0.05) return
    const point = { videoId, t }
    const mark = edge === 'start' ? { ...s.mark, from: point } : { ...s.mark, to: point }
    setUndoSet({ before: s, text: `Set ${setId} ${edge} moved` })
    mutateMatch(match.id, (m) => saveMark(m, setId, mark))
    player.pause()
    player.seek(seg.offset + t)
  }

  const seg = player.segs[player.segIndex]
  const activeId = seg?.id ?? null
  const names = { me: 'You' as const, them: match.opponent.trim() || 'Opponent' }
  const gapVideo = openGapVideo(match, opened, Boolean(lock))

  return (
    <div className={match.videos.length > 0 ? 'tag-page' : undefined}>
      {match.videos.length > 0 && seg ? (
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
      {lock ? (
        <p className="rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary" role="status">
          {TAG_LOCK_LINE[lock]}
        </p>
      ) : null}

      {videoGone ? (
        <p className="rounded-md border border-dashed border-border bg-bg-card px-3 py-2 text-sm text-primary">
          A video was removed. Its rallies keep their tags and score.
        </p>
      ) : null}

      {note ? (
        <p className="text-sm text-primary" role="status">
          {note}
        </p>
      ) : null}

      {undoSet ? (
        <p className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-card px-2 py-1 text-sm text-primary" role="status">
          <span>{undoSet.text}</span>
          <Button
            kind="control"
            variant="secondary"
            onClick={() => {
              mutateMatch(match.id, (m) => {
                const next = restoreSet(m, undoSet.before)
                return undoSet.also ? restoreSet(next, undoSet.also) : next
              })
              setUndoSet(null)
            }}
          >
            Undo
          </Button>
        </p>
      ) : null}

      {removed ? (
        <p className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-card px-2 py-1 text-sm text-primary" role="status">
          <span className="min-w-0 truncate">Removed {removed.video.fileName}</span>
          <Button
            kind="control"
            variant="secondary"
            onClick={() => {
              const { video, index, marks } = removed
              mutateMatch(match.id, (m) => {
                if (m.videos.some((v) => v.id === video.id)) return m
                const videos = [...m.videos]
                videos.splice(Math.min(index, videos.length), 0, video)
                const sets = m.sets.map((s) => {
                  const kept = marks.find((k) => k.setId === s.setId)
                  return kept ? { ...s, mark: kept.mark } : s
                })
                return { ...m, videos, sets }
              })
              setRemoved(null)
            }}
          >
            Undo
          </Button>
        </p>
      ) : null}

      {match.videos.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border bg-bg-card px-4 py-4 text-center" data-no-video>
          <p className="text-sm font-semibold text-primary">
            {phase === 'new' ? 'No video yet' : 'Video removed'}
          </p>
          <AddVideoChoice matchId={match.id} align="center" label={false} hint={false} disabled={running} />
        </div>
      ) : (
        match.videos.map((video, index) => (
          <TagVideoCard
            key={video.id}
            match={match}
            video={video}
            index={index}
            locked={Boolean(lock)}
            running={running}
            editable={!lock && (videoStatus(match, video.id) !== 'Done' || opened.includes(video.id))}
            active={activeId === video.id}
            playhead={activeId === video.id && seg ? player.time - seg.offset : null}
            pickedId={picked?.setId ?? null}
            editHere={picked?.videoId === video.id}
            lastWing={lastWing}
            hint={wingHint}
            menuOpen={menuId === video.id}
            asking={asking === video.id}
            onToggleMenu={() => setMenuId((id) => (id === video.id ? null : video.id))}
            onMove={(by) => {
              if (videoMoveBreaks(match, video.id, by)) {
                setNote('That move would break the set order.')
                return
              }
              setNote(null)
              moveVideo(match.id, video.id, by)
            }}
            onAskRemove={() => onRemove(video, index)}
            onRemove={() => dropVideo(video, index)}
            onCancelRemove={() => setAsking(null)}
            onOpen={(setId) => openSet(setId)}
            onUndo={(before, text, also) => setUndoSet({ before, text, also })}
            onPick={(setId) => {
              setPicked({ setId, videoId: video.id })
              setLastWing('end')
            }}
            onUnpick={() => setPicked(null)}
            onSeek={(g) => player.seek(g)}
            onScrub={(g) => {
              player.pause()
              player.seek(g)
            }}
            onPreview={(local) => {
              const now = performance.now()
              if (now - seekAt.current < 120) return
              seekAt.current = now
              player.pause()
              player.seek((seg && activeId === video.id ? seg.offset : segmentsOf(match.videos).find((s) => s.id === video.id)?.offset ?? 0) + local)
            }}
            onCommit={(setId, edge, local, stop) => commitWing(setId, edge, video.id, local, stop)}
            onHint={flash}
            onNudgeStart={startNudge}
            onNudgeEnd={endNudge}
            onEditSets={() => setOpened((ids) => (ids.includes(video.id) ? ids : [...ids, video.id]))}
            onAdd={() => addSet(video.id)}
            onRelabelled={(setId) => setPicked({ setId, videoId: video.id })}
            onSpanned={(setId, videoId) => {
              setOpened((ids) => (ids.includes(videoId) ? ids : [...ids, videoId]))
              setPicked({ setId, videoId })
              setLastWing('end')
              requestAnimationFrame(() => {
                document.querySelector(`[data-video-block="${videoId}"]`)?.scrollIntoView({ block: 'nearest' })
              })
            }}
          />
        ))
      )}

      <NotOnVideo match={match} video={gapVideo} onAdd={(setId) => gapVideo && addSet(gapVideo.id, setId)} />

      {match.videos.length > 0 ? (
        <section className="space-y-2" data-add-video>
          <h2 className="text-sm font-semibold text-primary">Add video</h2>
          <AddVideoChoice matchId={match.id} label={false} disabled={running} />
        </section>
      ) : null}

      {resultDiffers(match) ? <ResultFlag match={match} /> : null}

      <MatchEnd
        match={match}
        tagged={phase === 'complete'}
        locked={Boolean(lock)}
        onFinish={() => mutateMatch(match.id, finishMatch)}
        onReopen={() => mutateMatch(match.id, reopenMatch)}
        onUseResult={() => mutateMatch(match.id, applyTaggedResult)}
      />

      {phase === 'complete' || phase === 'partial' ? (
        <Button kind="control" variant="ghost" onClick={() => navigate(`/matches/${match.id}/insights/summary`)}>
          Open match Insights
        </Button>
      ) : null}
      </div>
    </div>
  )
}


function openGapVideo(match: MatchRecord, opened: readonly string[], archiveLocked: boolean): VideoAsset | null {
  if (archiveLocked) return null
  return (
    match.videos.find((v) => {
      if (!gapsOf(v.durationS, spansOnVideo(match.videos, match.sets, v.id)).some((g) => g.b - g.a >= MIN_SET_S)) return false
      if (videoStatus(match, v.id) === 'Done' && !opened.includes(v.id)) return false
      return true
    }) ?? null
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

function NotOnVideo({ match, video, onAdd }: { match: MatchRecord; video: VideoAsset | null; onAdd: (setId: number) => void }) {
  const rows = match.sets.filter((s) => notOnVideo(match, s))
  if (rows.length === 0) return null
  return (
    <section className="space-y-1" data-not-on-video>
      <h2 className="text-sm font-semibold text-primary">Not on video</h2>
      <ul className="space-y-1">
        {rows.map((s) => {
          const entered = parseEntered(s.entered)
          return (
            <li key={s.setId} className="flex items-center justify-between gap-2 text-sm text-primary" data-off-set={s.setId}>
              <span>
                Set {s.setId} · not on video
                {entered ? ` · ${formatScore(entered)} from Details` : ''}
              </span>
              {video ? (
                <Button kind="control" variant="secondary" data-add-off={s.setId} onClick={() => onAdd(s.setId)}>
                  Add set
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ResultFlag({ match }: { match: MatchRecord }) {
  const { mutateMatch } = useDemo()
  const tagged = matchSetsWon(match)
  const { me, them } = match.result
  if (me === null || them === null) return null
  return (
    <div className={flagClass}>
      <span>
        Result entered {formatScore({ me, them })} · tagged sets give {formatScore(tagged)}
      </span>
      {isRealResult(tagged) ? (
        <Button kind="control" variant="secondary" onClick={() => mutateMatch(match.id, applyTaggedResult)}>
          Use tagged result
        </Button>
      ) : null}
    </div>
  )
}

/** How the match ends. With a result entered the result decides. */
function MatchEnd({
  match,
  tagged,
  locked,
  onFinish,
  onReopen,
  onUseResult,
}: {
  match: MatchRecord
  tagged: boolean
  locked: boolean
  onFinish: () => void
  onReopen: () => void
  onUseResult: () => void
}) {
  const [archiveNote, setArchiveNote] = useState(false)
  const noResult = resultSetCount(match) === null
  const resultHref = `/matches/${match.id}/details#result`
  const won = matchSetsWon(match)
  const entered = match.result
  const setsLabel =
    entered.me !== null && entered.them !== null ? formatScore({ me: entered.me, them: entered.them }) : formatScore(won)

  if (tagged) {
    return (
      <div className="space-y-1.5 rounded-md border border-border bg-bg-card px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-primary">
            <span className="font-semibold">Match tagged</span>
            <span className="text-muted"> · sets {setsLabel}</span>
            {noResult ? <span className="text-muted">, no result entered</span> : null}
          </p>
          {noResult || !locked ? (
            <div className="flex flex-wrap items-center gap-1">
              {noResult ? (
                isRealResult(won) ? (
                  <Button kind="control" variant="secondary" onClick={onUseResult}>
                    Use tagged result
                  </Button>
                ) : (
                  <Link to={resultHref} className={linkClass}>
                    Enter the result
                  </Link>
                )
              ) : null}
              {noResult && match.tagDone && !locked ? (
                <Button kind="control" variant="ghost" onClick={onReopen}>
                  Reopen match
                </Button>
              ) : null}
              {!locked ? (
                <Button
                  kind="control"
                  variant="secondary"
                  data-archive-match
                  onClick={() => setArchiveNote(true)}
                >
                  Archive match
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {archiveNote ? (
          <p className="text-sm text-muted" role="status">
            Archive comes in a later build.
          </p>
        ) : null}
      </div>
    )
  }
  if (locked) return null
  if (!noResult) {
    const count = resultSetCount(match) ?? 0
    const left = match.sets.find((s) => s.setId <= count && !setSettled(s))
    const text = !left
      ? 'The match is tagged when every listed set is saved or entered in Details.'
      : markState(left) === 'tagging' || setState(left) === 'progress'
        ? `The match is tagged when set ${left.setId} is saved.`
        : markState(left) === 'ready'
          ? `The match is tagged when set ${left.setId} is tagged.`
          : `The match is tagged when set ${left.setId} has a score in Details.`
    return (
      <p className="text-xs text-muted" data-match-banner>
        {text}
      </p>
    )
  }

  const anyFinished = match.sets.some((s) => setState(s) === 'finished')
  const blocking = setBlockingFinish(match)
  const level = !blocking && won.me === won.them
  return (
    <div className="space-y-2">
      {anyFinished && level ? (
        <p className="text-sm text-muted">Sets are level at {formatScore(won)}, so the match is not over yet.</p>
      ) : anyFinished ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Button
            kind="main"
            variant={!blocking && isRealResult(won) ? 'primary' : 'secondary'}
            className="w-full sm:w-auto"
            disabled={blocking !== null}
            onClick={onFinish}
          >
            Finish match
          </Button>
          <p className="text-sm text-muted">
            {blocking
              ? markState(blocking) === 'tagging' || setState(blocking) === 'progress'
                ? `Finish set ${blocking.setId} first.`
                : markState(blocking) === 'ready'
                  ? `Tag set ${blocking.setId} first.`
                  : markState(blocking) === 'part'
                    ? `Enter set ${blocking.setId} in Details first.`
                    : `Mark set ${blocking.setId} on a video, or enter it in Details.`
              : `Ends the match at sets ${formatScore(won)}.`}
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted">No result entered, so the next set appears as you tag.</p>
    </div>
  )
}
