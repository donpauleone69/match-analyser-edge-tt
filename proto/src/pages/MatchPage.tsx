import { useState } from 'react'
import { Navigate, Outlet, useMatch, useParams } from 'react-router-dom'
import { buttonKindField } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { HubTabs } from '@/layout/HubTabs'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfEmpty } from '@/layout/Wireframe'
import { defaultMatchTab, derivePhase, useDemo, type MatchRecord } from '@/data/demoStore'
import { InsightsSectionRoute } from '@/features/insights/InsightsScreen'
import { matchDiffers, matchLabel, needsOpponent } from '@/features/match/matchChecks'

/**
 * A light nudge to name the opponent once a match has video or tagging.
 * Typed in place on Insights and Tag; it never stands in the way of tagging.
 */
function OpponentPrompt({ match }: { match: MatchRecord }) {
  const { updateMatch } = useDemo()
  const [editing, setEditing] = useState(false)
  if (!editing && !needsOpponent(match)) return null
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4">
      <label className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-dashed border-border bg-bg-card px-3 py-2 text-sm text-muted">
        <span>Who did you play?</span>
        <input
          className={cn(
            buttonKindField,
            'min-w-0 flex-1 basis-40 rounded-md border border-border bg-bg-surface px-2 text-sm text-primary'
          )}
          placeholder="Opponent"
          value={match.opponent}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          onChange={(e) => updateMatch(match.id, { opponent: e.target.value })}
        />
      </label>
    </div>
  )
}

export function MatchPage() {
  const { matchId = '' } = useParams()
  const { getMatch } = useDemo()
  const onSetView = Boolean(useMatch('/matches/:matchId/tag/:setId') || useMatch('/matches/:matchId/mark/:videoId'))
  const onDetails = Boolean(useMatch('/matches/:matchId/details'))
  const match = getMatch(matchId)
  const base = `/matches/${matchId}`

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

  // The set view fills the screen and carries its own compact header.
  if (onSetView) return <Outlet />

  return (
    <div>
      <StickyChrome>
        <PageHeader title={matchLabel(match)} backTo="/home" />
        <HubTabs
          ariaLabel="Match sections"
          tabs={[
            { to: `${base}/insights`, label: 'Insights' },
            {
              to: `${base}/details`,
              label: 'Details',
              mark: matchDiffers(match) ? 'Differs' : undefined,
            },
            { to: `${base}/tag`, label: 'Tag' },
          ]}
        />
      </StickyChrome>
      {!onDetails ? <OpponentPrompt match={match} /> : null}
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
