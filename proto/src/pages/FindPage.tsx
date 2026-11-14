import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { WfBadge, WfEmpty, WfField, WfRow } from '@/layout/Wireframe'

/** Find — thin stub from Home Matches card (may fold into Home later). */
export function FindPage() {
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Find"
        subtitle="Locate a match → open Tag or Match Insights. Wireframe filters only."
        backTo="/home"
      />
      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Filters</CardTitle>
            <WfBadge>stub</WfBadge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <WfField label="Opponent" placeholder="Any opponent" />
            <WfField label="Tournament" placeholder="Any event" />
            <WfField label="Date range" placeholder="Any date" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled>
              Apply filters — not wired
            </Button>
            <Button size="sm" variant="ghost" disabled>
              Clear
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/matches/demo-1/details')}>
              <Icon name="plus" size="xs" />
              New match
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card variant="interactive">
            <Link to="/matches/demo-1/insights" className="block space-y-1">
              <div className="flex items-center gap-2">
                <Icon name="search" size="sm" className="text-brand" />
                <CardTitle>Demo vs Opponent</CardTitle>
              </div>
              <CardDescription>Club league · 3–1 · open Match Insights</CardDescription>
            </Link>
          </Card>
          <Card variant="interactive">
            <Link to="/matches/demo-2/details" className="block space-y-1">
              <CardTitle>Club night — recent</CardTitle>
              <CardDescription>Friendly · nothing tagged · open Details</CardDescription>
            </Link>
          </Card>
        </div>

        <ul className="space-y-2">
          <WfRow
            title="County cup — final (stub)"
            meta="Open → Tag set 2 · or Review Insights"
            trailing={<WfBadge>list only</WfBadge>}
          />
        </ul>

        <WfEmpty
          title="No matches match filters"
          body="Empty state: clear filters or New match (attach video on Details)."
        />
      </div>
    </div>
  )
}
