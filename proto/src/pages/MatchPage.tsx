import { Outlet, useParams } from 'react-router-dom'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'

/** Match hub — Match Insights · Details · Tag. */
export function MatchPage() {
  const { matchId = 'demo-1' } = useParams()
  const base = `/matches/${matchId}`

  return (
    <div>
      <PageHeader title="Match" subtitle={`Stub match · ${matchId}`} />
      <HubTabs
        ariaLabel="Match sections"
        tabs={[
          { to: `${base}/insights`, label: 'Match Insights' },
          { to: `${base}/details`, label: 'Details' },
          { to: `${base}/tag`, label: 'Tag' },
        ]}
      />
      <Outlet />
    </div>
  )
}

export function MatchInsightsStub() {
  return (
    <StubPanel
      title="Match Insights"
      body="Ascertained story for this match · reels watch + download (placeholder). No live analytics."
    />
  )
}

export function MatchDetailsStub() {
  return (
    <StubPanel
      title="Details"
      body="Opponent · tournament · scores · date · raw video upload/attach (placeholder)."
    />
  )
}

export function MatchTagStub() {
  return (
    <StubPanel
      title="Tag"
      body="Tag · rallies · clip timestamps on source video (placeholder). Not real tagging."
    />
  )
}

function StubPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-6 space-y-2">
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      <p className="text-sm text-muted">{body}</p>
    </div>
  )
}
