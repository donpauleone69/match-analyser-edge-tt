import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'

const DEMO_MATCH_ID = 'demo-1'

/** Home — cards only (Next/Continue · Matches · Insights tease). */
export function HomePage() {
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader title="Home" subtitle="Recommended next steps and library." />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        {/* Continue stays full-bleed; library cards reflow beside each other from md */}
        <Card className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon name="target" size="sm" className="text-brand" />
            <CardTitle>Next / Continue</CardTitle>
          </div>
          <CardDescription>
            Set 2 of Demo vs Opponent — tag remaining rallies (placeholder).
          </CardDescription>
          <Button fullWidth onClick={() => navigate(`/matches/${DEMO_MATCH_ID}/tag`)}>
            Continue tagging
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
            <ul className="space-y-2">
              <li>
                <Link
                  to={`/matches/${DEMO_MATCH_ID}/insights`}
                  className="flex items-center justify-between rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-medium hover:bg-bg-elevated"
                >
                  <span>Demo vs Opponent</span>
                  <Icon name="chevron-right" size="sm" className="text-muted" />
                </Link>
              </li>
              <li>
                <Link
                  to="/matches/demo-2/insights"
                  className="flex items-center justify-between rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-medium hover:bg-bg-elevated"
                >
                  <span>Club night — recent</span>
                  <Icon name="chevron-right" size="sm" className="text-muted" />
                </Link>
              </li>
            </ul>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="chart" size="sm" className="text-brand" />
              <CardTitle>Insights tease</CardTitle>
            </div>
            <CardDescription>
              Serve receive on short balls needs work · Highlight reel ready (placeholders).
            </CardDescription>
            <Button fullWidth variant="secondary" onClick={() => navigate('/insights/story')}>
              See all insights
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
