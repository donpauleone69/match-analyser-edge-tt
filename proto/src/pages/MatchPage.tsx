import { Outlet, useParams } from 'react-router-dom'
import { Card, CardDescription, CardTitle } from '@/ui-mine'
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
      cards={[
        { title: 'Story beats', body: 'Key moments from this match (stub).' },
        { title: 'Reels', body: 'Watch + download placeholders.' },
        { title: 'Notes', body: 'Coach cues for this opponent (stub).' },
      ]}
    />
  )
}

export function MatchDetailsStub() {
  return (
    <StubPanel
      title="Details"
      body="Opponent · tournament · scores · date · raw video upload/attach (placeholder)."
      cards={[
        { title: 'Opponent', body: 'Name · handedness · notes (stub).' },
        { title: 'Event', body: 'Tournament · date · scores (stub).' },
        { title: 'Video', body: 'Attach / replace source video (stub).' },
      ]}
    />
  )
}

export function MatchTagStub() {
  return (
    <StubPanel
      title="Tag"
      body="Tag · rallies · clip timestamps on source video (placeholder). Not real tagging."
      cards={[
        { title: 'Rallies', body: 'Tagged rally list (stub).' },
        { title: 'Timeline', body: 'Clip timestamps on source (stub).' },
        { title: 'Pass 1', body: 'Continue tagging entry (stub).' },
      ]}
    />
  )
}

function StubPanel({
  title,
  body,
  cards,
}: {
  title: string
  body: string
  cards: { title: string; body: string }[]
}) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="max-w-prose space-y-2">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="text-sm text-muted">{body}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card) => (
          <Card key={card.title} className="space-y-1">
            <CardTitle>{card.title}</CardTitle>
            <CardDescription>{card.body}</CardDescription>
          </Card>
        ))}
      </div>
    </div>
  )
}
