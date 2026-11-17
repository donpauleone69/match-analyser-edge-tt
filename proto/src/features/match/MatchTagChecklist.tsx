import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Icon, buttonKindTextLink } from '@/ui-mine'
import { WfBadge } from '@/layout/Wireframe'
import {
  derivePhase,
  formatScore,
  isSpareSet,
  matchSetsWon,
  missingVideoIds,
  parseEntered,
  resultDiffers,
  resultSetCount,
  setBlockingFinish,
  setRalliesWithoutVideo,
  setScoresDiffer,
  setState,
  taggedScore,
  useDemo,
  type MatchRecord,
  type SetData,
} from '@/data/demoStore'
import {
  applyTaggedResult,
  applyTaggedScore,
  finishMatch,
  reopenMatch,
  setInProgress,
} from '@/features/tagging/matchOps'
import { cn } from '@/helpers/utils'
import { TAG_LOCK_LINE, useTagLock } from '@/features/tagging/tagLock'
import { lastSavedGlobal } from '@/features/tagging/matchOps'
import { rallyEnd, type Draft } from '@/features/tagging/rally'
import { lastContactG, segmentsOf, segmentAt, formatClock, toGlobal } from '@/features/tagging/timeline'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { VideosCard } from '@/features/match/VideosCard'
import { isRealResult } from '@/features/match/matchChecks'
import { bestFlowOf, bestPlace } from '@/features/tagging/bestFlow'

const flagClass =
  'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary flex flex-wrap items-center justify-between gap-2'
const differsBadge =
  'inline-flex items-center rounded border border-warning bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary'

const linkClass = cn('text-sm font-semibold text-brand underline', buttonKindTextLink)

const rowAction = 'min-w-16 md:min-w-0'

function rallyCount(n: number) {
  return `${n} ${n === 1 ? 'rally' : 'rallies'}`
}

/** Where tagging stopped in the match video, for the line under Continue set. */
function stoppedAtClock(match: MatchRecord, s: SetData): string {
  const segs = segmentsOf(match.videos)
  let g: number | null = null
  if (s.draft && s.draft.contacts.length > 0) {
    const d: Draft = s.draft
    const local = d.closed ? rallyEnd(d) : d.contacts[d.contacts.length - 1]
    g = toGlobal(segs, d.videoId, local)
  } else if (s.rallies.length > 0) {
    g = lastContactG(segs, s.rallies[s.rallies.length - 1])
  } else {
    g = lastSavedGlobal(match, s.setId)
  }
  if (g === null) return '00:00'
  const seg = segmentAt(segs, g)
  const clock = formatClock(g - (seg?.offset ?? 0))
  if (match.videos.length > 1 && seg) return `video ${seg.index + 1} · ${clock}`
  return clock
}

/** Saved status under Continue set on the Tag page (item 13). */
function savedTagLine(match: MatchRecord, s: SetData): string {
  const score = taggedScore(s)
  const scoreText = score ? formatScore(score) : '0 - 0'
  const line = [
    'Saved',
    `Set ${s.setId}`,
    rallyCount(s.rallies.length),
    scoreText,
    `stopped at ${stoppedAtClock(match, s)}`,
  ].join(' · ')
  const place = bestPlace(s)
  return place ? `${line} · ${place}` : s.draft ? `${line} · 1 rally open` : line
}

/** What a set can truly have: a state, a score and a rally count. */
function setLine(s: SetData): string {
  const state = setState(s)
  const score = taggedScore(s)
  if (state === 'skipped') return 'Not filmed'
  if (state === 'none') return 'Not started'
  const base = score ? `${formatScore(score)} · ${rallyCount(s.rallies.length)}` : 'Started'
  const place = bestPlace(s)
  if (state === 'progress') return place ? `${base} · ${place}` : s.draft ? `${base} · rally open` : base
  const entered = parseEntered(s.entered)
  return setScoresDiffer(s) && entered ? `${base} · entered ${formatScore(entered)}` : base
}

/**
 * Tag checklist. One row per set with its state, score and rally count.
 * "Not filmed" is only ever the user's choice to skip a set.
 */
export function MatchTagChecklist() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()
  const { getMatch, patchSet, mutateMatch } = useDemo()
  const match = getMatch(matchId)
  const lock = useTagLock(matchId, match)
  if (!match) return null

  const phase = derivePhase(match)
  const hasVideo = match.videos.length > 0
  const tagged = phase === 'complete'
  const resume = hasVideo && !lock ? setInProgress(match) : null
  /** A video that rallies were tagged on has been removed. */
  const videoGone = missingVideoIds(match).length > 0
  const openSet = (setId: number) => {
    const s = match.sets.find((x) => x.setId === setId)
    const flow = s ? bestFlowOf(s) : null
    navigate(flow ? `/matches/${match.id}/tag/${setId}?flow=${flow}` : `/matches/${match.id}/tag/${setId}`)
  }
  // The next set to start leads, unless a set is under way or Finish match leads.
  const finishLeads =
    resultSetCount(match) === null &&
    setBlockingFinish(match) === null &&
    isRealResult(matchSetsWon(match))
  const nextStart =
    hasVideo && !lock && !resume && !tagged && !finishLeads
      ? match.sets.find((s) => setState(s) === 'none')
      : undefined

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <VideosCard match={match} />
      {!hasVideo && phase !== 'new' ? (
        <p className="text-sm text-muted">Tags and scores are kept. Add the video back to play or tag.</p>
      ) : null}

      {hasVideo ? (
      <>
      {videoGone ? (
        <div className="rounded-md border border-dashed border-border bg-bg-card px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-primary">A video was removed. Its rallies keep their tags and score.</p>
          <AddVideoChoice matchId={match.id} />
        </div>
      ) : null}

      {lock ? (
        <p className="rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-primary" role="status">
          {TAG_LOCK_LINE[lock]}
        </p>
      ) : null}

      {resume ? (
        <div className="space-y-1.5">
          <Button fullWidth kind="main" onClick={() => openSet(resume.setId)}>
            <Icon name="play" size="sm" />
            Continue set {resume.setId}
          </Button>
          <p className="text-center text-sm text-muted" role="status" data-saved-tag-status>
            {savedTagLine(match, resume)}
          </p>
        </div>
      ) : null}

      {resultDiffers(match) ? <ResultFlag match={match} /> : null}

      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {match.sets.map((s) => {
          const state = setState(s)
          const differs = setScoresDiffer(s)
          const gone = setRalliesWithoutVideo(match, s)
          return (
            <li key={s.setId}>
              <Card className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                    Set {s.setId}
                    {state === 'finished' ? <WfBadge>Finished</WfBadge> : null}
                    {differs ? <span className={differsBadge}>Differs</span> : null}
                  </p>
                  <p className="text-sm text-muted mt-0.5">
                    {setLine(s)}
                    {gone > 0 ? ' · video removed' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {state === 'skipped' && !lock ? (
                    <Button
                      kind="control"
                      variant="ghost"
                      onClick={() => patchSet(match.id, s.setId, { skipped: false })}
                    >
                      Undo
                    </Button>
                  ) : null}
                  {state === 'none' && !isSpareSet(match, s) && !lock ? (
                    <Button
                      kind="control"
                      variant="ghost"
                      onClick={() => patchSet(match.id, s.setId, { skipped: true })}
                    >
                      Mark not filmed
                    </Button>
                  ) : null}
                  {differs ? (
                    <Button
                      kind="control"
                      variant="ghost"
                      onClick={() => mutateMatch(match.id, (m) => applyTaggedScore(m, s.setId))}
                    >
                      Use tagged score
                    </Button>
                  ) : null}
                  {state === 'none' && hasVideo && !lock ? (
                    <Button
                      kind={
                        resume || nextStart?.setId !== s.setId ? 'control' : 'main'
                      }
                      variant={nextStart?.setId === s.setId ? 'primary' : 'secondary'}
                      className={rowAction}
                      onClick={() => openSet(s.setId)}
                    >
                      Start
                    </Button>
                  ) : null}
                  {state === 'finished' || state === 'progress' ? (
                    <Button
                      kind="control"
                      variant="secondary"
                      className={rowAction}
                      onClick={() => openSet(s.setId)}
                    >
                      Open
                    </Button>
                  ) : null}
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      <MatchEnd
        match={match}
        tagged={tagged}
        locked={Boolean(lock)}
        onFinish={() => mutateMatch(match.id, finishMatch)}
        onReopen={() => mutateMatch(match.id, reopenMatch)}
        onUseResult={() => mutateMatch(match.id, applyTaggedResult)}
      />

      {phase === 'complete' || phase === 'partial' ? (
        <Button
          kind="control"
          variant="ghost"
          onClick={() => navigate(`/matches/${match.id}/insights/summary`)}
        >
          Open match Insights
        </Button>
      ) : null}
      </>
      ) : null}
    </div>
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

/**
 * How the match ends. With a result entered the result decides, so there is
 * nothing to press. With no result, Finish match ends it.
 */
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

  if (tagged) {
    return (
      <div className="rounded-md border border-border bg-bg-card px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-primary">
          <span className="font-semibold">Match tagged</span>
          {noResult ? (
            <span className="text-muted"> · sets {formatScore(won)}, no result entered</span>
          ) : null}
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
            {/* Only Finish match can be reopened. A result decides for itself. */}
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
    return (
      <p className="text-xs text-muted">
        The match is tagged when every set is finished or not filmed.
      </p>
    )
  }

  const anyFinished = match.sets.some((s) => setState(s) === 'finished')
  const blocking = setBlockingFinish(match)
  // A match cannot end level, so there is nothing to finish yet.
  const level = !blocking && won.me === won.them
  return (
    <div className="space-y-2">
      {anyFinished && level ? (
        <p className="text-sm text-muted">
          Sets are level at {formatScore(won)}, so the match is not over yet.
        </p>
      ) : anyFinished ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Button
            // Leads once the tagged sets could be a whole match.
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
                : `Tag set ${blocking.setId} or mark it not filmed first.`
              : `Ends the match at sets ${formatScore(won)}.`}
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted">
        No result entered, so the next set appears as you tag. To mark a set not filmed,{' '}
        <Link to={resultHref} className={linkClass}>
          enter the result
        </Link>
        .
      </p>
    </div>
  )
}
