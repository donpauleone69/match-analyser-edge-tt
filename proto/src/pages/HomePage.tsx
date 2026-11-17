import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfBadge, WfEmpty, WfWarnBadge } from '@/layout/Wireframe'
import { hasPlayableRallies, matchDiffers, matchLabel } from '@/features/match/matchChecks'
import { bestFlowOf } from '@/features/tagging/bestFlow'
import { setInProgress } from '@/features/tagging/matchOps'
import {
  defaultMatchTab,
  derivePhase,
  hasTaggedRallies,
  isArchived,
  matchMeta,
  phaseLabel,
  useDemo,
} from '@/data/demoStore'

export function HomePage() {
  const navigate = useNavigate()
  const { matches, createMatch } = useDemo()

  const continueMatch =
    matches.find((m) => derivePhase(m) === 'partial') ??
    matches.find((m) => derivePhase(m) === 'ready') ??
    matches.find((m) => derivePhase(m) === 'new') ??
    matches[0]

  // A match with a set under way goes straight back into that set.
  const resumeSet =
    continueMatch &&
    derivePhase(continueMatch) === 'partial' &&
    continueMatch.videos.length > 0 &&
    !isArchived(continueMatch)
      ? setInProgress(continueMatch)
      : null

  const onNew = () => {
    const created = createMatch()
    navigate(`/matches/${created.id}/details`)
  }

  return (
    <div>
      <StickyChrome>
        <PageHeader title="Home" />
      </StickyChrome>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {matches.length === 0 ? (
          <div className="space-y-3">
            <WfEmpty title="No matches" body="Create a match or switch Prototype to Filled." />
            <Button fullWidth kind="main" onClick={onNew}>
              <Icon name="plus" size="xs" />
              New match
            </Button>
          </div>
        ) : null}

        {continueMatch && matches.length > 0 ? (
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="target" size="sm" className="text-brand" />
                <CardTitle>Up next</CardTitle>
              </div>
              <WfBadge>{phaseLabel(derivePhase(continueMatch))}</WfBadge>
            </div>
            <div className="rounded-md border border-border bg-bg-card px-3 py-3 space-y-1">
              <p className="text-sm font-semibold text-primary">
                {matchLabel(continueMatch)}
              </p>
              <p className="text-sm text-muted">
                {derivePhase(continueMatch) === 'partial'
                  ? 'Resume tagging'
                  : derivePhase(continueMatch) === 'ready'
                    ? 'Start tagging'
                    : derivePhase(continueMatch) === 'new'
                      ? 'Add video'
                      : 'Review match Insights'}
              </p>
            </div>
            <Button
              fullWidth
              kind="main"
              onClick={() =>
                navigate(
                  resumeSet
                    ? `/matches/${continueMatch.id}/tag/${resumeSet.setId}${
                        bestFlowOf(resumeSet) ? `?flow=${bestFlowOf(resumeSet)}` : ''
                      }`
                    : `/matches/${continueMatch.id}/${defaultMatchTab(derivePhase(continueMatch))}`
                )
              }
            >
              {resumeSet
                ? `Continue set ${resumeSet.setId}`
                : derivePhase(continueMatch) === 'complete'
                  ? 'Open match Insights'
                  : 'Continue'}
            </Button>
          </Card>
        ) : null}

        {matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="calendar" size="sm" className="text-brand" />
                  <CardTitle>Matches</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button kind="control" variant="secondary" onClick={onNew}>
                    <Icon name="plus" size="xs" />
                    New
                  </Button>
                  <Button kind="control" variant="ghost" onClick={() => navigate('/find')}>
                    <Icon name="search" size="xs" />
                    Find
                  </Button>
                </div>
              </div>
              <ul className="space-y-2">
                {matches.map((m) => {
                  const phase = derivePhase(m)
                  return (
                    <li key={m.id}>
                      <Link
                        to={`/matches/${m.id}/${defaultMatchTab(phase)}`}
                        className="flex items-center justify-between rounded-md border border-border bg-bg-card px-3 py-2 hover:bg-bg-elevated"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-primary">
                            {matchLabel(m)}
                          </p>
                          <p className="text-xs text-muted mt-0.5 flex flex-wrap items-center gap-1.5">
                            {matchMeta(m)}
                            {matchDiffers(m) ? <WfWarnBadge>Differs</WfWarnBadge> : null}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <WfBadge>{phaseLabel(phase)}</WfBadge>
                          <Icon name="chevron-right" size="sm" className="text-muted" />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="chart" size="sm" className="text-brand" />
                  <CardTitle>Insights</CardTitle>
                </div>
              </div>
              {matches.some(hasTaggedRallies) ? (
                <>
                  <CardDescription>From your tagged matches.</CardDescription>
                  <ul className="space-y-2 text-sm text-primary">
                    <li className="rounded-md border border-border bg-bg-card px-3 py-2">
                      Short-ball receive · Improve
                    </li>
                    {matches.some(hasPlayableRallies) ? (
                      <li className="rounded-md border border-border bg-bg-card px-3 py-2">
                        Highlight reel ready
                      </li>
                    ) : null}
                  </ul>
                  <Button
                    fullWidth
                    kind="control"
                    variant="secondary"
                    onClick={() => navigate('/insights/summary')}
                  >
                    All matches Insights
                  </Button>
                </>
              ) : (
                <CardDescription>Tag a rally in any match to see insights.</CardDescription>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
