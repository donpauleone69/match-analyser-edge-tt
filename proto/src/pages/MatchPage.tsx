import { Navigate, Outlet, useMatch, useParams } from 'react-router-dom'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfEmpty } from '@/layout/Wireframe'
import { defaultMatchTab, derivePhase, matchTitle, useDemo } from '@/data/demoStore'
import { InsightsSectionRoute } from '@/features/insights/InsightsScreen'

export function MatchPage() {
  const { matchId = '' } = useParams()
  const { getMatch } = useDemo()
  const setMatch = useMatch('/matches/:matchId/tag/:setId')
  const setId = setMatch?.params.setId
  const match = getMatch(matchId)
  const base = `/matches/${matchId}`
  const onSetView = Boolean(setId)
  const backTo = onSetView ? `${base}/tag` : '/home'
  const subtitle = onSetView ? `Set ${setId}` : undefined

  if (!match) {
    return (
      <div>
        <StickyChrome>
          <PageHeader title="Match" backTo="/home" />
        </StickyChrome>
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <WfEmpty title="Match not found" body="Return to Home." />
        </div>
      </div>
    )
  }

  const title = matchTitle(match)

  return (
    <div>
      <StickyChrome>
        <PageHeader title={title} subtitle={subtitle} backTo={backTo} />
        {!onSetView ? (
          <HubTabs
            ariaLabel="Match sections"
            tabs={[
              { to: `${base}/insights`, label: 'Insights' },
              { to: `${base}/details`, label: 'Details' },
              { to: `${base}/tag`, label: 'Tag' },
            ]}
          />
        ) : null}
      </StickyChrome>
      <Outlet />
    </div>
  )
}

export function MatchIndexRedirect() {
  const { matchId = '' } = useParams()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
  if (!match) return <Navigate to="/home" replace />
  const tab = defaultMatchTab(derivePhase(match))
  return <Navigate to={`/matches/${matchId}/${tab}`} replace />
}

export function MatchInsightsSection() {
  return <InsightsSectionRoute scope="match" chrome="full" />
}
