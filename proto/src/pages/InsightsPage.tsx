import { Outlet } from 'react-router-dom'
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
    />
  )
}

export function InsightsReelsStub() {
  return (
    <StubPanel
      title="Reels"
      body="Watch + download reels auto from tags/data (placeholder)."
    />
  )
}

export function InsightsScopeStub() {
  return (
    <StubPanel
      title="Scope"
      body="All · tournament · opponent filters (placeholder)."
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
