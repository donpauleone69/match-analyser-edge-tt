import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'
import { StickyChrome } from '@/layout/StickyChrome'
import { WfBadge, WfEmpty, WfField } from '@/layout/Wireframe'
import { defaultMatchTab, derivePhase, phaseLabel, useDemo } from '@/data/demoStore'

export function FindPage() {
  const navigate = useNavigate()
  const { matches, createMatch } = useDemo()

  const onNew = () => {
    const created = createMatch()
    navigate(`/matches/${created.id}/details`)
  }

  return (
    <div>
      <StickyChrome>
        <PageHeader title="Find" backTo="/home" />
      </StickyChrome>
      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <Card className="space-y-3">
          <CardTitle>Filters</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <WfField label="Opponent" placeholder="Any opponent" />
            <WfField label="Tournament" placeholder="Any event" />
            <WfField label="Date range" placeholder="Any date" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled>
              Apply filters (stub)
            </Button>
            <Button size="sm" variant="secondary" onClick={onNew}>
              <Icon name="plus" size="xs" />
              New match
            </Button>
          </div>
        </Card>

        {matches.length === 0 ? (
          <WfEmpty title="No matches" body="Create a match or switch Prototype to Filled." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matches.map((m) => {
              const phase = derivePhase(m)
              return (
                <Card key={m.id} variant="interactive">
                  <Link
                    to={`/matches/${m.id}/${defaultMatchTab(phase)}`}
                    className="block space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{m.name || m.opponent || 'New match'}</CardTitle>
                      <WfBadge>{phaseLabel(phase)}</WfBadge>
                    </div>
                    <CardDescription>{m.event || 'No event'}</CardDescription>
                  </Link>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
