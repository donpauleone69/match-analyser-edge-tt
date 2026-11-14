import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { WfBadge, WfEmpty, WfRow } from '@/layout/Wireframe'

const DEMO_MATCH_ID = 'demo-1'

/** Home cards: Next/Continue, Matches, Insights tease. */
export function HomePage() {
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader title="Home" subtitle="Continue, matches, insights peek." />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="target" size="sm" className="text-brand" />
              <CardTitle>Next / Continue</CardTitle>
            </div>
            <WfBadge>recommended</WfBadge>
          </div>
          <div className="rounded-md border border-border bg-bg-card px-3 py-3 space-y-1">
            <p className="text-sm font-semibold text-primary">Demo vs Opponent · Set 2</p>
            <p className="text-sm text-muted">4 rallies left · last at 12:41 · resume Contacts</p>
          </div>
          <Button fullWidth onClick={() => navigate(`/matches/${DEMO_MATCH_ID}/tag`)}>
            Continue tagging
          </Button>
          <Button
            fullWidth
            variant="ghost"
            onClick={() => navigate(`/matches/${DEMO_MATCH_ID}/insights`)}
          >
            Open match Insights
          </Button>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="calendar" size="sm" className="text-brand" />
                <CardTitle>Matches</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/matches/${DEMO_MATCH_ID}/details`)}
                >
                  <Icon name="plus" size="xs" />
                  New
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/find')}>
                  <Icon name="search" size="xs" />
                  Find
                </Button>
              </div>
            </div>
            <CardDescription>Recent library.</CardDescription>
            <ul className="space-y-2">
              <li>
                <Link
                  to={`/matches/${DEMO_MATCH_ID}/insights`}
                  className="flex items-center justify-between rounded-md border border-border bg-bg-card px-3 py-2 hover:bg-bg-elevated"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">Demo vs Opponent</p>
                    <p className="text-xs text-muted mt-0.5">Club league · 3-1 · Set 2 open</p>
                  </div>
                  <Icon name="chevron-right" size="sm" className="text-muted shrink-0" />
                </Link>
              </li>
              <li>
                <Link
                  to="/matches/demo-2/insights"
                  className="flex items-center justify-between rounded-md border border-border bg-bg-card px-3 py-2 hover:bg-bg-elevated"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">Club night recent</p>
                    <p className="text-xs text-muted mt-0.5">Friendly · 11 Nov · untagged</p>
                  </div>
                  <Icon name="chevron-right" size="sm" className="text-muted shrink-0" />
                </Link>
              </li>
              <WfRow
                title="County cup final"
                meta="14 Oct · video on · 2 sets tagged"
                trailing={<WfBadge>list</WfBadge>}
              />
            </ul>
            <WfEmpty title="No matches" body="Empty library. New opens Match Details." />
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="chart" size="sm" className="text-brand" />
                <CardTitle>Insights tease</CardTitle>
              </div>
              <WfBadge>peek</WfBadge>
            </div>
            <CardDescription>A few notables. Full hub elsewhere.</CardDescription>
            <ul className="space-y-2">
              <WfRow
                title="Short-ball receive"
                meta="Work on · last 3 matches"
                trailing={<Icon name="chevron-right" size="sm" className="text-muted" />}
              />
              <WfRow
                title="Highlight reel ready"
                meta="12 clips · Demo + Club night"
                trailing={<Icon name="film" size="sm" className="text-muted" />}
              />
              <WfRow
                title="Serve +1 vs lefties"
                meta="Pattern stub"
                trailing={<WfBadge>stub</WfBadge>}
              />
            </ul>
            <Button fullWidth variant="secondary" onClick={() => navigate('/insights/story')}>
              See all insights
            </Button>
            <Button fullWidth variant="ghost" onClick={() => navigate('/insights/reels')}>
              Jump to Reels
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
