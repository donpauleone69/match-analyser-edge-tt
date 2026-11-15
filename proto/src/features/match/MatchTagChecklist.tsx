import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Icon } from '@/ui-mine'
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
import { TAG_LOCK_LINE, useTagLock } from '@/features/tagging/tagLock'
import { AddVideoChoice } from '@/features/match/AddVideoChoice'
import { isRealResult } from '@/features/match/matchChecks'

const flagClass =
  'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary flex flex-wrap items-center justify-between gap-2'
const differsBadge =
  'inline-flex items-center rounded border border-warning bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary'

const linkClass = 'text-sm font-semibold text-brand underline'

function rallyCount(n: number) {
  return `${n} ${n === 1 ? 'rally' : 'rallies'}`
}

/** What a set can truly have: a state, a score and a rally count. */
function setLine(s: SetData): string {
  const state = setState(s)
  const score = taggedScore(s)
  if (state === 'skipped') return 'Not filmed'
  if (state === 'none') return 'Not started'
  const base = score ? `${formatScore(score)} · ${rallyCount(s.rallies.length)}` : 'Started'
  if (state === 'progress') return s.draft ? `${base} · rally open` : base
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
  const openSet = (setId: number) => navigate(`/matches/${match.id}/tag/${setId}`)

  if (!hasVideo && phase === 'new') {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <NoVideo match={match} />
      </div>
    )
  }

  const videoLine =
    match.videos.length === 1
      ? match.videos[0].fileName
      : `${match.videos.length} videos, in order`

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {hasVideo ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Icon name="film" size="xs" />
          {videoLine}
        </p>
      ) : (
        // Past New with no video: sets were tagged, so this is never "start tagging".
        <NoVideo match={match} removed />
      )}

      {hasVideo && videoGone ? (
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
        <Button fullWidth size="lg" onClick={() => openSet(resume.setId)}>
          <Icon name="play" size="sm" />
          Continue set {resume.setId}
        </Button>
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
                      size="sm"
                      variant="ghost"
                      onClick={() => patchSet(match.id, s.setId, { skipped: false })}
                    >
                      Undo
                    </Button>
                  ) : null}
                  {state === 'none' && !isSpareSet(match, s) && !lock ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patchSet(match.id, s.setId, { skipped: true })}
                    >
                      Mark not filmed
                    </Button>
                  ) : null}
                  {differs ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => mutateMatch(match.id, (m) => applyTaggedScore(m, s.setId))}
                    >
                      Use tagged score
                    </Button>
                  ) : null}
                  {state === 'none' && hasVideo && !lock ? (
                    <Button size="sm" variant="secondary" onClick={() => openSet(s.setId)}>
                      Start
                    </Button>
                  ) : null}
                  {state === 'finished' || state === 'progress' ? (
                    <Button size="sm" variant="secondary" onClick={() => openSet(s.setId)}>
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
          variant="ghost"
          onClick={() => navigate(`/matches/${match.id}/insights/summary`)}
        >
          Open match Insights
        </Button>
      ) : null}
    </div>
  )
}

function NoVideo({ match, removed = false }: { match: MatchRecord; removed?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-6 text-center space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-primary">{removed ? 'Video removed' : 'No video yet'}</p>
        <p className="text-sm text-muted">
          {removed
            ? 'Tags and scores are kept. Add the video back to play or tag.'
            : 'Add the match video to start tagging.'}
        </p>
      </div>
      <AddVideoChoice matchId={match.id} align="center" label={false} />
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
        <Button size="sm" variant="secondary" onClick={() => mutateMatch(match.id, applyTaggedResult)}>
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
              <Button size="sm" variant="secondary" onClick={onUseResult}>
                Use tagged result
              </Button>
            ) : (
              <Link to={resultHref} className={linkClass}>
                Enter the result
              </Link>
            )}
            {/* Only Finish match can be reopened. A result decides for itself. */}
            {match.tagDone && !locked ? (
              <Button size="sm" variant="ghost" onClick={onReopen}>
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
