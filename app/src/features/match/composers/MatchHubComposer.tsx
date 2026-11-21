import { Outlet, useMatch } from 'react-router-dom'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfEmpty } from '@/ui-mine'
import { useMatchRecord } from '@/stores/matchStore'
import { matchDiffers, formatMatchName } from '@/rules/matchStatus'

export function MatchHubComposer({ matchId }: { matchId: string }) {
  const match = useMatchRecord(matchId)
  const onSetView = Boolean(useMatch('/matches/:matchId/tag/:setId'))
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
          end={<span className="top-row-name px-3 text-sm text-muted">{formatMatchName(match)}</span>}
        />
      </StickyChrome>
      <div className="match-body">
        <Outlet />
      </div>
    </div>
  )
}
