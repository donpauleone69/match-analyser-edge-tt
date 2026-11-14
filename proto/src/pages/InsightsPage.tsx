import { Outlet } from 'react-router-dom'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { InsightsSectionRoute } from '@/features/insights/InsightsScreen'

/** Global Insights hub. Sections live as child routes. */
export function InsightsPage() {
  return (
    <div>
      <StickyChrome>
        <PageHeader title="Insights" />
      </StickyChrome>
      <Outlet />
    </div>
  )
}

export function InsightsSectionPage() {
  return <InsightsSectionRoute scope="global" />
}
