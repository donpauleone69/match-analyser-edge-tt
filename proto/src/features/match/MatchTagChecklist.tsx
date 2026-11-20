import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, buttonKindTextLink } from '@/ui-mine'
import {
  derivePhase,
  formatScore,
  matchSetsWon,
  missingVideoIds,
  parseEntered,
  resultDiffers,
  resultSetCount,
  setBlockingFinish,
  setState,
  taggedScore,
  useDemo,
  type MatchRecord,
  type SetData,
  type VideoAsset,
} from '@/data/demoStore'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { ARCHIVE_STEPS, startArchive, useArchiveStep } from '@/features/match/archiveJobs'
import { isRealResult, videoRallyCount } from '@/features/match/matchChecks'
import { applyTaggedResult, finishMatch, reopenMatch } from '@/features/tagging/matchOps'
import {
  firstGapVideo,
  gapsOf,
  lineAction,
  markCrosses,
  notOnVideo,
  setsRemain,
  setsStartingOn,
  spansOnVideo,
  tagLead,
  type VideoSpan,
} from '@/features/tagging/setMark'
import { TAG_LOCK_LINE, useTagLock } from '@/features/tagging/tagLock'
import { formatClock } from '@/features/tagging/timeline'
import { cn } from '@/helpers/utils'

const flagClass =
  'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary flex flex-wrap items-center justify-between gap-2'

const linkClass = cn('text-sm font-semibold text-brand underline', buttonKindTextLink)

const UNDO_MS = 6000

function setLine(match: MatchRecord, s: SetData): string {
  const score = taggedScore(s)
  const state = lineAction(s)
  const head =
    state === 'Open' && score
      ? `Set ${s.setId} · Saved · ${formatScore(score)}`
      : state === 'Continue' && score
        ? `Set ${s.setId} · Tagging · ${formatScore(score)}`
        : state === 'Tag'
          ? `Set ${s.setId} · Ready`
          : state === 'Mark'
            ? `Set ${s.setId} · Part filmed`
            : `Set ${s.setId}`
  const mark = s.mark
  if (!markCrosses(s) || !mark) return head
  const a = match.videos.findIndex((v) => v.id === mark.from.videoId) + 1
  const b = match.videos.findIndex((v) => v.id === mark.to.videoId) + 1
  return a > 0 && b > 0 ? `${head} · videos ${a} and ${b}` : head
}

/**
 * Tag page. One block per video, the sets marked on it, then sets that are
 * not on video. Marking itself comes in the next slice.
 */
export function MatchTagChecklist() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()
  const { getMatch, moveVideo, removeVideo, mutateMatch } = useDemo()
  const match = getMatch(matchId)
  const lock = useTagLock(matchId, match)
  const archiveStep = useArchiveStep(matchId)
  const running = archiveStep !== null
  const [menuId, setMenuId] = useState<string | null>(null)
  const [asking, setAsking] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [removed, setRemoved] = useState<{ video: VideoAsset; index: number } | null>(null)

  useEffect(() => {
    if (!removed) return
    const timer = setTimeout(() => setRemoved(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [removed])

  if (!match) return null

  const phase = derivePhase(match)
  const lead = lock ? null : tagLead(match)
  const videoGone = missingVideoIds(match).length > 0
  const openSet = (setId: number) => navigate(`/matches/${match.id}/tag/${setId}`)

  const onRemove = (video: VideoAsset, index: number) => {
    if (video.archived || videoRallyCount(match, video.id) > 0) setAsking(video.id)
    else {
      removeVideo(match.id, video.id)
      setRemoved({ video, index })
      setMenuId(null)
    }
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {lead ? (
        <Button
          fullWidth
          kind="main"
          data-tag-lead={lead.kind}
          onClick={() => {
            if (lead.kind === 'mark') {
              const video = firstGapVideo(match)
              if (video) navigate(`/matches/${match.id}/mark/${video.id}`)
              return
            }
            openSet(lead.setId)
          }}
        >
          {lead.label}
        </Button>
      ) : null}

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

      {removed ? (
        <p className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-card px-2 py-1 text-sm text-primary" role="status">
          <span className="min-w-0 truncate">Removed {removed.video.fileName}</span>
          <Button
            kind="control"
            variant="secondary"
            onClick={() => {
              const { video, index } = removed
              mutateMatch(match.id, (m) => {
                if (m.videos.some((v) => v.id === video.id)) return m
                const videos = [...m.videos]
                videos.splice(Math.min(index, videos.length), 0, video)
                return { ...m, videos }
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
          <VideoBlock
            key={video.id}
            match={match}
            video={video}
            index={index}
            locked={Boolean(lock)}
            running={running}
            menuOpen={menuId === video.id}
            asking={asking === video.id}
            canArchive={phase === 'complete' && match.videos.some((v) => !v.archived)}
            onArchive={() => setConfirmArchive(true)}
            onToggleMenu={() => setMenuId((id) => (id === video.id ? null : video.id))}
            onMove={(by) => moveVideo(match.id, video.id, by)}
            onAskRemove={() => onRemove(video, index)}
            onRemove={() => {
              removeVideo(match.id, video.id)
              setAsking(null)
              setMenuId(null)
              if (!video.archived) setRemoved({ video, index })
            }}
            onCancelRemove={() => setAsking(null)}
            onOpen={(setId) => openSet(setId)}
          />
        ))
      )}

      {running ? (
        <div className="space-y-1" role="status">
          <p className="text-xs text-primary">
            {ARCHIVE_STEPS[archiveStep ?? 0]}
            <span className="text-muted"> · step {(archiveStep ?? 0) + 1} of {ARCHIVE_STEPS.length}</span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full bg-brand-primary transition-all duration-500"
              style={{ width: `${(((archiveStep ?? 0) + 1) / ARCHIVE_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      <NotOnVideo match={match} />

      {match.videos.length > 0 ? (
        <section className="space-y-2" data-add-video>
          <h2 className="text-sm font-semibold text-primary">Add video</h2>
          <AddVideoChoice matchId={match.id} label={false} disabled={running} />
        </section>
      ) : null}

      {confirmArchive && !running ? (
          <div className="space-y-1.5 rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary" role="alertdialog" aria-label="Archive">
            <p>
              Archive keeps only the rallies, joined with no gaps, at lower quality. Tags and reels then use the
              archived copy. The original is removed once the archive is made and checked.
            </p>
            <p className="font-semibold">This cannot be undone.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                kind="control"
                onClick={() => {
                  setConfirmArchive(false)
                  setMenuId(null)
                  startArchive(match.id)
                }}
              >
                Archive
              </Button>
              <Button kind="control" variant="ghost" onClick={() => setConfirmArchive(false)}>
                Cancel
              </Button>
            </div>
          </div>
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
  )
}

function VideoBlock({
  match,
  video,
  index,
  locked,
  running,
  menuOpen,
  asking,
  canArchive,
  onArchive,
  onToggleMenu,
  onMove,
  onAskRemove,
  onRemove,
  onCancelRemove,
  onOpen,
}: {
  match: MatchRecord
  video: VideoAsset
  index: number
  locked: boolean
  running: boolean
  menuOpen: boolean
  asking: boolean
  canArchive: boolean
  onArchive: () => void
  onToggleMenu: () => void
  onMove: (by: -1 | 1) => void
  onAskRemove: () => void
  onRemove: () => void
  onCancelRemove: () => void
  onOpen: (setId: number) => void
}) {
  const navigate = useNavigate()
  const many = match.videos.length > 1
  const spans = spansOnVideo(match.videos, match.sets, video.id)
  const gap = gapsOf(video.durationS, spans).length > 0
  const lines = setsStartingOn(match.sets, video.id)
  const showMark = gap && setsRemain(match) && !locked

  return (
    <section className="space-y-2 rounded-lg border border-border bg-bg-card px-3 py-2" data-video-block={video.id}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-primary">
          Video {index + 1} · {formatClock(video.durationS)}
          {video.archived ? <span className="font-normal text-muted"> · Archived</span> : null}
        </h2>
        <button
          type="button"
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-semibold text-primary"
          aria-expanded={menuOpen}
          aria-label={`Menu for video ${index + 1}`}
          onClick={onToggleMenu}
        >
          Menu
        </button>
      </div>

      {menuOpen ? (
        <div className="flex flex-wrap gap-2" data-video-menu={video.id}>
          {many ? (
            <>
              <Button kind="control" variant="secondary" disabled={running || index === 0} onClick={() => onMove(-1)}>
                Move up
              </Button>
              <Button
                kind="control"
                variant="secondary"
                disabled={running || index === match.videos.length - 1}
                onClick={() => onMove(1)}
              >
                Move down
              </Button>
            </>
          ) : null}
          <Button kind="control" variant="secondary" disabled={running} onClick={onAskRemove}>
            Remove
          </Button>
          {canArchive ? (
            <Button kind="control" variant="secondary" disabled={running} onClick={onArchive}>
              Archive
            </Button>
          ) : null}
        </div>
      ) : null}

      {asking ? (
        <div className="space-y-1.5 rounded-md border border-warning bg-warning/15 px-2 py-1.5 text-xs text-primary" role="alertdialog" aria-label={`Remove video ${index + 1}`}>
          <p>
            {videoRallyCount(match, video.id)} tagged rallies use this video. Tags and scores stay, but they can no
            longer be played.
          </p>
          {video.archived ? <p className="font-semibold">This cannot be undone.</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button kind="control" onClick={onRemove}>
              {video.archived ? 'Remove the only copy' : 'Remove video'}
            </Button>
            <Button kind="control" variant="ghost" onClick={onCancelRemove}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <VideoStrip duration={video.durationS} spans={spans} />

      {lines.length > 0 ? (
        <ul className="space-y-1">
          {lines.map((s) => {
            const action = lineAction(s)
            return (
              <li key={s.setId} className="flex items-center justify-between gap-2" data-set-line={s.setId}>
                <p className="min-w-0 text-sm text-primary">{setLine(match, s)}</p>
                {action ? (
                  <Button
                    kind="control"
                    variant="secondary"
                    disabled={locked}
                    onClick={() => {
                      if (action === 'Mark' && s.mark) {
                        navigate(`/matches/${match.id}/mark/${s.mark.from.videoId}?set=${s.setId}`)
                        return
                      }
                      onOpen(s.setId)
                    }}
                  >
                    {action}
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {showMark ? (
        <Button
          kind="control"
          variant="secondary"
          data-mark-set={video.id}
          onClick={() => navigate(`/matches/${match.id}/mark/${video.id}`)}
        >
          Mark a set
        </Button>
      ) : null}
    </section>
  )
}

function VideoStrip({ duration, spans }: { duration: number; spans: VideoSpan[] }) {
  const scale = duration > 0 ? duration : 1
  return (
    <div className="tag-strip" data-video-strip>
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

function NotOnVideo({ match }: { match: MatchRecord }) {
  const navigate = useNavigate()
  const rows = match.sets.filter((s) => notOnVideo(match, s))
  if (rows.length === 0) return null
  const video = firstGapVideo(match)
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
                <Button
                  kind="control"
                  variant="secondary"
                  onClick={() => navigate(`/matches/${match.id}/mark/${video.id}?set=${s.setId}`)}
                >
                  Mark
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
  const noResult = resultSetCount(match) === null
  const resultHref = `/matches/${match.id}/details#result`
  const won = matchSetsWon(match)
  const entered = match.result
  const setsLabel =
    entered.me !== null && entered.them !== null ? formatScore({ me: entered.me, them: entered.them }) : formatScore(won)

  if (tagged) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg-card px-3 py-2">
        <p className="text-sm text-primary">
          <span className="font-semibold">Match tagged</span>
          <span className="text-muted"> · sets {setsLabel}</span>
          {noResult ? <span className="text-muted">, no result entered</span> : null}
        </p>
        {noResult ? (
          <div className="flex flex-wrap items-center gap-1">
            {isRealResult(won) ? (
              <Button kind="control" variant="secondary" onClick={onUseResult}>
                Use tagged result
              </Button>
            ) : (
              <Link to={resultHref} className={linkClass}>
                Enter the result
              </Link>
            )}
            {match.tagDone && !locked ? (
              <Button kind="control" variant="ghost" onClick={onReopen}>
                Reopen match
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }
  if (locked) return null
  if (!noResult) {
    return <p className="text-xs text-muted">The match is tagged when every set is saved.</p>
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
              ? setState(blocking) === 'progress'
                ? `Finish set ${blocking.setId} first.`
                : `Mark set ${blocking.setId} on a video first.`
              : `Ends the match at sets ${formatScore(won)}.`}
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted">No result entered, so the next set appears as you tag.</p>
    </div>
  )
}
