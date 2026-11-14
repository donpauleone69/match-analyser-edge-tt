import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfBadge, WfEmpty } from '@/layout/Wireframe'
import {
  defaultMatchTab,
  derivePhase,
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

  const onNew = () => {
    const created = createMatch()
    navigate(`/matches/${created.id}/details`)
  }

  return (
    <div>
      <StickyChrome>
        <PageHeader title="Home" />
      </StickyChrome>

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        {matches.length === 0 ? (
          <div className="space-y-3">
            <WfEmpty title="No matches" body="Create a match or switch Prototype to Filled." />
            <Button fullWidth onClick={onNew}>
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
                <CardTitle>Next / Continue</CardTitle>
              </div>
              <WfBadge>{phaseLabel(derivePhase(continueMatch))}</WfBadge>
            </div>
            <div className="rounded-md border border-border bg-bg-card px-3 py-3 space-y-1">
              <p className="text-sm font-semibold text-primary">
                {continueMatch.name || continueMatch.opponent || 'New match'}
              </p>
              <p className="text-sm text-muted">
                {derivePhase(continueMatch) === 'partial'
                  ? 'Resume tagging'
                  : derivePhase(continueMatch) === 'ready'
                    ? 'Start tagging'
                    : derivePhase(continueMatch) === 'new'
                      ? 'Add video on Details'
                      : 'Review match Insights'}
              </p>
            </div>
            <Button
              fullWidth
              onClick={() =>
                navigate(
                  `/matches/${continueMatch.id}/${defaultMatchTab(derivePhase(continueMatch))}`
                )
              }
            >
              Continue
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
                  <Button size="sm" variant="secondary" onClick={onNew}>
                    <Icon name="plus" size="xs" />
                    New
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate('/find')}>
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
                            {m.name || m.opponent || 'New match'}
                          </p>
                          <p className="text-xs text-muted mt-0.5">{m.event || 'No event'}</p>
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
                  <CardTitle>Insights tease</CardTitle>
                </div>
                <WfBadge>peek</WfBadge>
              </div>
              {matches.some(
                (m) => derivePhase(m) === 'complete' || derivePhase(m) === 'partial'
              ) ? (
                <>
                  <CardDescription>Notables across matches.</CardDescription>
                  <ul className="space-y-2 text-sm text-primary">
                    <li className="rounded-md border border-border bg-bg-card px-3 py-2">
                      Short-ball receive · Improve
                    </li>
                    <li className="rounded-md border border-border bg-bg-card px-3 py-2">
                      Highlight reel ready
                    </li>
                  </ul>
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => navigate('/insights/summary')}
                  >
                    All matches Insights
                  </Button>
                </>
              ) : (
                <>
                  <CardDescription>Finish tagging a match to unlock insights.</CardDescription>
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => navigate('/insights/summary')}
                  >
                    All matches Insights
                  </Button>
                </>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
