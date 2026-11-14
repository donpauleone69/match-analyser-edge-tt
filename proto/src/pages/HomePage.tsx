import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { WfBadge, WfEmpty, WfRow } from '@/layout/Wireframe'

const DEMO_MATCH_ID = 'demo-1'

/** Home — cards only (Next/Continue · Matches · Insights tease). */
export function HomePage() {
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Home"
        subtitle="Pick a job — continue tagging, open a match, or peek at insights."
      />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        {/* Next / Continue — full bleed */}
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
            <p className="text-sm text-muted">
              4 rallies left to tag · last contact at 12:41 on source · resume at Contacts.
            </p>
            <p className="text-xs text-muted">
              Job 1 resume — opens Match → Tag (Pass 1). Not real tagging in proto.
            </p>
          </div>
          <Button fullWidth onClick={() => navigate(`/matches/${DEMO_MATCH_ID}/tag`)}>
            Continue tagging → Match Tag
          </Button>
          <Button
            fullWidth
            variant="ghost"
            onClick={() => navigate(`/matches/${DEMO_MATCH_ID}/insights`)}
          >
            Open this match Insights instead
          </Button>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Matches */}
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
                  New match
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/find')}>
                  <Icon name="search" size="xs" />
                  Find
                </Button>
              </div>
            </div>
            <CardDescription>
              Recent library. New → empty Match Details (attach video first). Find → filter list.
            </CardDescription>
            <ul className="space-y-2">
              <li>
                <Link
                  to={`/matches/${DEMO_MATCH_ID}/insights`}
                  className="flex items-center justify-between rounded-md border border-border bg-bg-card px-3 py-2 hover:bg-bg-elevated"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">Demo vs Opponent</p>
                    <p className="text-xs text-muted mt-0.5">
                      Club league · 3–1 · tagged Set 1 · Set 2 in progress
                    </p>
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
                    <p className="text-sm font-medium text-primary">Club night — recent</p>
                    <p className="text-xs text-muted mt-0.5">
                      Friendly · 11 Nov · nothing tagged yet
                    </p>
                  </div>
                  <Icon name="chevron-right" size="sm" className="text-muted shrink-0" />
                </Link>
              </li>
              <WfRow
                title="County cup — final (stub)"
                meta="14 Oct · video attached · 2 sets tagged"
                trailing={<WfBadge>list only</WfBadge>}
              />
            </ul>
            <WfEmpty
              title="Empty library state"
              body="When there are 0 matches: dashed CTA “New match — attach video first” lands on Match Details."
            />
          </Card>

          {/* Insights tease */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="chart" size="sm" className="text-brand" />
                <CardTitle>Insights tease</CardTitle>
              </div>
              <WfBadge>peek</WfBadge>
            </div>
            <CardDescription>
              Couple notables only — full Story / Reels / Scope live on Insights hub.
            </CardDescription>
            <ul className="space-y-2">
              <WfRow
                title="Short-ball receive leaks"
                meta="Work on · across last 3 matches · opens Reels"
                trailing={<Icon name="chevron-right" size="sm" className="text-muted" />}
              />
              <WfRow
                title="Highlight reel ready"
                meta="12 clips · Demo + Club night · download on Reels"
                trailing={<Icon name="film" size="sm" className="text-muted" />}
              />
              <WfRow
                title="Serve +1 vs lefties"
                meta="Pattern stub · scope = opponent handedness"
                trailing={<WfBadge>stub</WfBadge>}
              />
            </ul>
            <Button fullWidth variant="secondary" onClick={() => navigate('/insights/story')}>
              See all insights → Story
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
