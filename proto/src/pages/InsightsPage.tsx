import { Outlet, useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'
import { WfBadge, WfEmpty, WfField, WfRow } from '@/layout/Wireframe'

/** Insights hub — Story/Work on · Reels · Scope. */
export function InsightsPage() {
  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="Cross-match viewing — patterns, reels, scope. No Tag chrome."
      />
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

/** Cross-match patterns / Work on / notables. */
export function InsightsStoryStub() {
  const navigate = useNavigate()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="max-w-prose space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-primary">Story / Work on</h2>
          <WfBadge>cross-match</WfBadge>
        </div>
        <p className="text-sm text-muted">
          Patterns, notables, coaching cues across the scoped library. Every insight opens a
          playlist on Reels — no dead-end numbers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="space-y-2">
          <CardTitle>Patterns</CardTitle>
          <CardDescription>
            Recurring strengths / leaks across matches in current Scope.
          </CardDescription>
          <ul className="space-y-2">
            <WfRow title="Serve +1 vs lefties" meta="4 matches · stub" />
            <WfRow title="3rd-ball miss rate ↑" meta="last 2 weeks · stub" />
          </ul>
          <Button size="sm" disabled>
            Open pattern reel — not wired
          </Button>
        </Card>

        <Card className="space-y-2">
          <CardTitle>Work on</CardTitle>
          <CardDescription>Priority cues this week — tap → evidence playlist.</CardDescription>
          <ul className="space-y-2">
            <WfRow
              title="Short-ball receive"
              meta="18 points · 3 matches"
              trailing={<WfBadge>priority</WfBadge>}
            />
            <WfRow title="Push depth on BH" meta="9 points · stub" />
          </ul>
          <Button size="sm" disabled>
            Open Work-on reel — not wired
          </Button>
        </Card>

        <Card className="space-y-2">
          <CardTitle>Notables</CardTitle>
          <CardDescription>Standout points — drill to one Match Insights when useful.</CardDescription>
          <ul className="space-y-2">
            <WfRow title="Highlight streak · Demo" meta="Set 1 R4–R7" />
            <WfRow title="Comeback set · Club night" meta="stub notable" />
          </ul>
          <Button size="sm" variant="secondary" onClick={() => navigate('/matches/demo-1/insights')}>
            Open match Insights (nav)
          </Button>
        </Card>
      </div>

      <WfEmpty
        title="Nothing tagged across scope"
        body="Empty: tag matches first, or widen Scope. Home Insights tease stays light; depth lives here."
      />
    </div>
  )
}

/** Watch + download reels auto from tags/data. */
export function InsightsReelsStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="max-w-prose space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-primary">Reels</h2>
            <WfBadge>watch + download</WfBadge>
          </div>
        </div>
        <p className="text-sm text-muted">
          Auto playlists from tags/data across Scope. Download lives here (Job 2c) — not in Account
          settings. Clip timestamp nudge stays on Match → Tag.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="film" size="sm" className="text-brand" />
          <CardTitle>Playlist stage (stub)</CardTitle>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-bg-card px-4 py-10 text-center space-y-2">
          <p className="text-sm font-semibold text-primary">No player — wireframe only</p>
          <p className="text-xs text-muted">
            Real product plays source-video EDLs. Proto shows list + fake CTAs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled>Play / pause — not wired</Button>
          <Button variant="secondary" disabled>
            Prev clip
          </Button>
          <Button variant="secondary" disabled>
            Next clip
          </Button>
        </div>
      </Card>

      <ul className="space-y-2">
        <WfRow
          title="Highlight"
          meta="Show-reel · 12 clips · Demo + Club night"
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
          meta="18 clips · cross-match"
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
          meta="Categories B/C aggregated · stub"
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

      <WfEmpty
        title="No reels yet"
        body="Empty until matches are tagged / highlighted in Pass 1. Star or flag on Tag → feeds Highlight."
      />
    </div>
  )
}

/** All / tournament / opponent filters for Story + Reels. */
export function InsightsScopeStub() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="max-w-prose space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-primary">Scope</h2>
          <WfBadge>filters</WfBadge>
        </div>
        <p className="text-sm text-muted">
          Who/what you’re viewing across — filters Story and Reels. Drill to one match exits to
          Match hub (not a fourth tab).
        </p>
      </div>

      <Card className="space-y-3">
        <CardTitle>Active scope</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            className="rounded-md border border-brand-primary bg-brand-primary-muted px-3 py-3 text-left"
            aria-pressed="true"
          >
            <span className="block text-sm font-semibold text-primary">All matches</span>
            <span className="block text-xs text-muted mt-0.5">Library-wide (selected stub)</span>
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-bg-card px-3 py-3 text-left hover:bg-bg-elevated"
            aria-pressed="false"
          >
            <span className="block text-sm font-semibold text-primary">Tournament</span>
            <span className="block text-xs text-muted mt-0.5">Filter by event</span>
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-bg-card px-3 py-3 text-left hover:bg-bg-elevated"
            aria-pressed="false"
          >
            <span className="block text-sm font-semibold text-primary">Opponent</span>
            <span className="block text-xs text-muted mt-0.5">Filter by player</span>
          </button>
        </div>
        <p className="text-xs text-muted">
          Proto: selection is visual only — does not filter Story/Reels lists yet.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <CardTitle>Tournament picker</CardTitle>
          <WfField label="Event" placeholder="Club league · County cup · …" />
          <Button size="sm" disabled>
            Apply tournament scope — not wired
          </Button>
        </Card>
        <Card className="space-y-3">
          <CardTitle>Opponent picker</CardTitle>
          <WfField label="Opponent" placeholder="Demo Opponent · …" />
          <Button size="sm" disabled>
            Apply opponent scope — not wired
          </Button>
        </Card>
      </div>

      <Card className="space-y-2">
        <CardTitle>In scope (stub preview)</CardTitle>
        <CardDescription>Matches that would feed Story / Reels under current filters.</CardDescription>
        <ul className="space-y-2">
          <WfRow title="Demo vs Opponent" meta="Club league · tagged" trailing={<WfBadge>in</WfBadge>} />
          <WfRow title="Club night — recent" meta="Friendly · untagged" trailing={<WfBadge>in</WfBadge>} />
          <WfRow
            title="County cup — final"
            meta="Would drop if tournament = Club league"
            trailing={<WfBadge>list only</WfBadge>}
          />
        </ul>
      </Card>
    </div>
  )
}
