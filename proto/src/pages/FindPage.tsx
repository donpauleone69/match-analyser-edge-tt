import { Link } from 'react-router-dom'
import { Card, CardDescription, CardTitle, Icon } from '@/ui-mine'
import { PageHeader } from '@/layout/PageHeader'

/** Find — thin stub from Home Matches card. */
export function FindPage() {
  return (
    <div>
      <PageHeader title="Find" subtitle="Browse matches (stub)." backTo="/home" />
      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card variant="interactive">
            <Link to="/matches/demo-1/insights" className="block space-y-1">
              <div className="flex items-center gap-2">
                <Icon name="search" size="sm" className="text-brand" />
                <CardTitle>Demo vs Opponent</CardTitle>
              </div>
              <CardDescription>Open Match hub</CardDescription>
            </Link>
          </Card>
          <Card variant="interactive">
            <Link to="/matches/demo-2/details" className="block space-y-1">
              <CardTitle>Club night — recent</CardTitle>
              <CardDescription>Open Match Details</CardDescription>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
