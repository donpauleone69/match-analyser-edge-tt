import { Outlet, useNavigate } from 'react-router-dom'
import { Button, Card, CardTitle, Icon } from '@/ui-mine'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'
import { WfBadge, WfEmpty, WfField, WfRow } from '@/layout/Wireframe'

/** Insights hub: Story, Reels, Scope. */
export function InsightsPage() {
  return (
    <div>
      <PageHeader title="Insights" />
      <HubTabs
        ariaLabel="Insights sections"
        tabs={[
          { to: '/insights/story', label: 'Story / Work on' },
          { to: '/insights/reels', label: 'Reels' },
          { to: '/insights/scope', label: 'Scope' },
        ]}
      />
      <Outlet />
    </div>
  )
}

export function InsightsStoryStub() {
  const navigate = useNavigate()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="space-y-2">
          <CardTitle>Patterns</CardTitle>
          <ul className="space-y-2">
            <WfRow title="Serve +1 vs lefties" meta="4 matches" />
            <WfRow title="3rd-ball miss rate up" meta="last 2 weeks" />
          </ul>
          <Button size="sm" disabled>
            Open pattern reel (stub)
          </Button>
        </Card>

        <Card className="space-y-2">
          <CardTitle>Work on</CardTitle>
          <ul className="space-y-2">
            <WfRow
              title="Short-ball receive"
              meta="18 points · 3 matches"
              trailing={<WfBadge>priority</WfBadge>}
            />
            <WfRow title="Push depth on BH" meta="9 points" />
          </ul>
          <Button size="sm" disabled>
            Open Work-on reel (stub)
          </Button>
        </Card>

        <Card className="space-y-2">
          <CardTitle>Notables</CardTitle>
          <ul className="space-y-2">
            <WfRow title="Highlight streak · Demo" meta="Set 1 R4-R7" />
            <WfRow title="Comeback set · Club night" meta="stub" />
          </ul>
          <Button size="sm" variant="secondary" onClick={() => navigate('/matches/demo-1/insights')}>
            Open match Insights
          </Button>
        </Card>
      </div>

      <WfEmpty title="Nothing tagged" body="Tag matches first, or widen Scope." />
    </div>
  )
}

export function InsightsReelsStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="film" size="sm" className="text-brand" />
          <CardTitle>Playlist stage</CardTitle>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-10 text-center space-y-2">
          <p className="text-sm font-semibold text-primary">No player</p>
          <p className="text-xs text-muted">Wireframe only</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled>Play / pause (stub)</Button>
          <Button variant="secondary" disabled>
            Prev
          </Button>
          <Button variant="secondary" disabled>
            Next
          </Button>
        </div>
      </Card>

      <ul className="space-y-2">
        <WfRow
          title="Highlight"
          meta="12 clips · Demo + Club night"
          trailing={
            <div className="flex gap-1">
              <Button size="sm" disabled>
                Watch
              </Button>
              <Button size="sm" variant="secondary" disabled>
                <Icon name="download" size="xs" />
                Download
              </Button>
            </div>
          }
        />
        <WfRow
          title="Work on · short receive"
          meta="18 clips"
          trailing={
            <div className="flex gap-1">
              <Button size="sm" disabled>
                Watch
              </Button>
              <Button size="sm" variant="secondary" disabled>
                Download
              </Button>
            </div>
          }
        />
        <WfRow
          title="Serve / Receive"
          meta="B/C aggregated"
          trailing={
            <div className="flex gap-1">
              <Button size="sm" disabled>
                Watch
              </Button>
              <Button size="sm" variant="secondary" disabled>
                Download
              </Button>
            </div>
          }
        />
      </ul>

      <WfEmpty title="No reels yet" body="Tag or highlight in Pass 1 first." />
    </div>
  )
}

export function InsightsScopeStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <Card className="space-y-3">
        <CardTitle>Active scope</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            className="rounded-md border border-brand-primary bg-brand-primary-muted px-3 py-3 text-left"
            aria-pressed="true"
          >
            <span className="block text-sm font-semibold text-primary">All matches</span>
            <span className="block text-xs text-muted mt-0.5">Selected stub</span>
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-bg-card px-3 py-3 text-left hover:bg-bg-elevated"
            aria-pressed="false"
          >
            <span className="block text-sm font-semibold text-primary">Tournament</span>
            <span className="block text-xs text-muted mt-0.5">By event</span>
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-bg-card px-3 py-3 text-left hover:bg-bg-elevated"
            aria-pressed="false"
          >
            <span className="block text-sm font-semibold text-primary">Opponent</span>
            <span className="block text-xs text-muted mt-0.5">By player</span>
          </button>
        </div>
        <p className="text-xs text-muted">Visual only. Does not filter lists yet.</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>Tournament</CardTitle>
          <WfField label="Event" placeholder="Club league, County cup…" />
          <Button size="sm" disabled>
            Apply tournament (stub)
          </Button>
        </Card>
        <Card className="space-y-3">
          <CardTitle>Opponent</CardTitle>
          <WfField label="Opponent" placeholder="Demo Opponent…" />
          <Button size="sm" disabled>
            Apply opponent (stub)
          </Button>
        </Card>
      </div>

      <Card className="space-y-2">
        <CardTitle>In scope</CardTitle>
        <ul className="space-y-2">
          <WfRow title="Demo vs Opponent" meta="Club league · tagged" trailing={<WfBadge>in</WfBadge>} />
          <WfRow title="Club night recent" meta="Friendly · untagged" trailing={<WfBadge>in</WfBadge>} />
          <WfRow title="County cup final" meta="May drop if tournament set" trailing={<WfBadge>list</WfBadge>} />
        </ul>
      </Card>
    </div>
  )
}
