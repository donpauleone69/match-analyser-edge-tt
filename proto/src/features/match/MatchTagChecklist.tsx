import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Icon } from '@/ui-mine'
import { WfBadge } from '@/layout/Wireframe'
import {
  derivePhase,
  formatScore,
  resultSetCount,
  setHasTagProgress,
  useDemo,
} from '@/data/demoStore'

function tagLabel(done: boolean) {
  return done ? 'done' : 'todo'
}

/**
 * Tag checklist. A match with no video gets one Add video prompt that adds it
 * here and stays here. "Not filmed" is only ever the user's choice to skip a set.
 */
export function MatchTagChecklist() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()
  const { getMatch, patchSet, addVideo } = useDemo()
  const match = getMatch(matchId)
  if (!match) return null

  if (match.videos.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-6 text-center space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">No video yet</p>
            <p className="text-sm text-muted">Add the match video to start tagging.</p>
          </div>
          <Button onClick={() => addVideo(match.id)}>
            <Icon name="plus" size="xs" />
            Add video
          </Button>
        </div>
      </div>
    )
  }

  const phase = derivePhase(match)
  const videoLine =
    match.videos.length === 1
      ? match.videos[0].fileName
      : `${match.videos.length} videos, in order`

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Icon name="film" size="xs" />
        {videoLine}
      </p>
      <ul className="space-y-3">
        {match.sets.map((s) => (
          <li key={s.setId}>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-primary">
                    Set {s.setId}
                    {s.tagged && !s.skipped ? ` · ${formatScore(s.tagged)}` : ''}
                  </p>
                  {s.skipped ? <WfBadge>Not filmed</WfBadge> : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.skipped ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patchSet(match.id, s.setId, { skipped: false })}
                    >
                      Undo
                    </Button>
                  ) : (
                    <>
                      {!setHasTagProgress(s) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => patchSet(match.id, s.setId, { skipped: true })}
                        >
                          Mark not filmed
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/matches/${match.id}/tag/${s.setId}`)}
                      >
                        Open set
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {!s.skipped ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  <WfBadge>contacts {tagLabel(s.contacts)}</WfBadge>
                  <WfBadge>key moments {tagLabel(s.keyMoments)}</WfBadge>
                  <WfBadge>shot details {tagLabel(s.shotDetails)}</WfBadge>
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
      {resultSetCount(match) === null ? (
        <p className="text-xs text-muted">
          No result entered, so the next set appears as you tag.
        </p>
      ) : null}
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
