import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Icon } from '@/ui-mine'
import { WfBadge } from '@/layout/Wireframe'
import {
  derivePhase,
  formatScore,
  isSpareSet,
  parseEntered,
  resultDiffers,
  resultSetCount,
  setScoresDiffer,
  setState,
  taggedResult,
  taggedScore,
  taggedSetsWon,
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
import { AddVideoChoice } from '@/features/match/AddVideoChoice'

const flagClass =
  'rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-primary flex flex-wrap items-center justify-between gap-2'
const differsBadge =
  'inline-flex items-center rounded border border-warning bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary'

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
  if (!match) return null

  const phase = derivePhase(match)
  const hasVideo = match.videos.length > 0
  const tagged = phase === 'complete'
  const resume = hasVideo ? setInProgress(match) : null
  const anyFinished = match.sets.some((s) => setState(s) === 'finished')
  const anyOpen = match.sets.some((s) => setState(s) === 'progress')
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
        <NoVideo match={match} />
      )}

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
          return (
            <li key={s.setId}>
              <Card className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                    Set {s.setId}
                    {state === 'finished' ? <WfBadge>Finished</WfBadge> : null}
                    {differs ? <span className={differsBadge}>Differs</span> : null}
                  </p>
                  <p className="text-sm text-muted mt-0.5">{setLine(s)}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {state === 'skipped' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patchSet(match.id, s.setId, { skipped: false })}
                    >
                      Undo
                    </Button>
                  ) : null}
                  {state === 'none' && !isSpareSet(match, s) ? (
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
                  {state === 'none' && hasVideo ? (
                    <Button size="sm" variant="secondary" onClick={() => openSet(s.setId)}>
                      Start
                    </Button>
                  ) : null}
                  {state === 'progress' && hasVideo ? (
                    <Button size="sm" onClick={() => openSet(s.setId)}>
                      Continue
                    </Button>
                  ) : null}
                  {state === 'finished' ? (
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
        canFinish={anyFinished && !anyOpen}
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

function NoVideo({ match }: { match: MatchRecord }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-6 text-center space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-primary">No video yet</p>
        <p className="text-sm text-muted">Add the match video to start tagging.</p>
      </div>
      <AddVideoChoice matchId={match.id} align="center" />
    </div>
  )
}

function ResultFlag({ match }: { match: MatchRecord }) {
  const { mutateMatch } = useDemo()
  const tagged = taggedResult(match)
  const { me, them } = match.result
  if (!tagged || me === null || them === null) return null
  return (
    <div className={flagClass}>
      <span>
        Result entered {formatScore({ me, them })} · tagged sets give {formatScore(tagged)}
      </span>
      <Button size="sm" variant="secondary" onClick={() => mutateMatch(match.id, applyTaggedResult)}>
        Use tagged result
      </Button>
    </div>
  )
}

/** How the match ends: by the result's set list, or by Finish match. */
function MatchEnd({
  match,
  tagged,
  canFinish,
  onFinish,
  onReopen,
  onUseResult,
}: {
  match: MatchRecord
  tagged: boolean
  canFinish: boolean
  onFinish: () => void
  onReopen: () => void
  onUseResult: () => void
}) {
  const noResult = resultSetCount(match) === null
  if (tagged) {
    return (
      <div className="rounded-md border border-border bg-bg-card px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-primary">
          <span className="font-semibold">Match tagged</span>
          {noResult ? (
            <span className="text-muted"> · sets {formatScore(taggedSetsWon(match))}, no result entered</span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-1">
          {noResult ? (
            <Button size="sm" variant="secondary" onClick={onUseResult}>
              Use tagged result
            </Button>
          ) : null}
          {match.tagDone ? (
            <Button size="sm" variant="ghost" onClick={onReopen}>
              Reopen match
            </Button>
          ) : null}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted">
        {noResult
          ? 'No result entered. The next set appears as you tag. Finish match after the last set.'
          : 'The match is tagged when every set is finished or not filmed.'}
      </p>
      {canFinish ? (
        <Button size="sm" variant="secondary" onClick={onFinish}>
          Finish match
        </Button>
      ) : null}
    </div>
  )
}
