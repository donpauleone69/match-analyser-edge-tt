import { Navigate, Outlet, useMatch, useParams } from 'react-router-dom'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfEmpty } from '@/layout/Wireframe'
import { defaultMatchTab, derivePhase, useDemo } from '@/data/demoStore'
import { matchDiffers, matchName } from '@/features/match/matchChecks'

export function MatchPage() {
  const { matchId = '' } = useParams()
  const { getMatch } = useDemo()
  const onSetView = Boolean(useMatch('/matches/:matchId/tag/:setId'))
  const match = getMatch(matchId)
  const base = `/matches/${matchId}`

  if (!match) {
    return (
      <div>
        <StickyChrome>
          <PageHeader title="Match" backTo="/matches" />
        </StickyChrome>
        <div className="match-body">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <WfEmpty title="Match not found" />
          </div>
        </div>
      </div>
    )
  }

  // The set view fills the screen and carries its own compact header.
  if (onSetView) return <Outlet />

  return (
    <div>
      <StickyChrome>
        <PageHeader
          backTo="/matches"
          tabsLabel="Match sections"
          tabs={[
            { to: `${base}/insights`, label: 'Insights' },
            {
              to: `${base}/details`,
              label: 'Details',
              mark: matchDiffers(match) ? 'Differs' : undefined,
            },
            { to: `${base}/tag`, label: 'Tag' },
          ]}
          end={<span className="top-row-name px-3 text-sm text-muted">{matchName(match)}</span>}
        />
      </StickyChrome>
      <div className="match-body">
        <Outlet />
      </div>
    </div>
  )
}

export function MatchIndexRedirect() {
  const { matchId = '' } = useParams()
  const { getMatch } = useDemo()
  const match = getMatch(matchId)
  if (!match) return <Navigate to="/matches" replace />
  const tab = defaultMatchTab(derivePhase(match))
  return <Navigate to={`/matches/${matchId}/${tab}`} replace />
}

