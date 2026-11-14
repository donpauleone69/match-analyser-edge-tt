import { Outlet } from 'react-router-dom'
import { Card, CardDescription, CardTitle } from '@/ui-mine'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'

/** Insights hub — Story/Work on · Reels · Scope. */
export function InsightsPage() {
  return (
    <div>
      <PageHeader title="Insights" subtitle="Cross-match viewing (stub)." />
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
  return (
    <StubPanel
      title="Story / Work on"
      body="Cross-match patterns, notables, coaching cues (placeholder)."
      cards={[
        { title: 'Patterns', body: 'Recurring strengths / leaks (stub).' },
        { title: 'Work on', body: 'Priority cues this week (stub).' },
        { title: 'Notables', body: 'Standout points across matches (stub).' },
      ]}
    />
  )
}

export function InsightsReelsStub() {
  return (
    <StubPanel
      title="Reels"
      body="Watch + download reels auto from tags/data (placeholder)."
      cards={[
        { title: 'Highlight', body: 'Show-reel from tags (stub).' },
        { title: 'Serve receive', body: 'Playlist stub.' },
        { title: 'Downloads', body: 'Export placeholders.' },
      ]}
    />
  )
}

export function InsightsScopeStub() {
  return (
    <StubPanel
      title="Scope"
      body="All · tournament · opponent filters (placeholder)."
      cards={[
        { title: 'All matches', body: 'Library-wide scope (stub).' },
        { title: 'Tournament', body: 'Filter by event (stub).' },
        { title: 'Opponent', body: 'Filter by player (stub).' },
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
