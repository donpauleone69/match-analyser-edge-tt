import { Plus, Play, Clock, TrendingUp, FlaskConical, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui'

// Mock data for recent matches
const recentMatches = [
  {
    id: '1',
    player1: 'Marcus Chen',
    player2: 'Anna Kowalski',
    score: '3-2',
    date: 'Nov 29, 2025',
    status: 'complete' as const,
  },
  {
    id: '2',
    player1: 'Marcus Chen',
    player2: 'John Smith',
    score: '2-0',
    date: 'Nov 28, 2025',
    status: 'step2' as const,
  },
  {
    id: '3',
    player1: 'Wei Liu',
    player2: 'Marcus Chen',
    score: '1-3',
    date: 'Nov 25, 2025',
    status: 'step1' as const,
  },
]

const statusConfig = {
  complete: { label: 'Complete', variant: 'success' as const },
  step2: { label: 'Step 2', variant: 'warning' as const },
  step1: { label: 'Step 1', variant: 'info' as const },
}

export function Dashboard() {
  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
            Dashboard
          </h1>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            Overview of your table tennis matches and statistics
          </p>
        </div>
        
        <div className="space-y-6">
        {/* Quick Actions */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/matches/create">
            <Card variant="interactive" className="h-full">
              <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="p-3 rounded-full bg-brand-primary-muted">
                  <Plus className="h-6 w-6 text-brand-primary" />
                </div>
                <span className="font-semibold text-neutral-100">New Match</span>
              </CardContent>
            </Card>
          </Link>

          <Card variant="interactive">
            <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="p-3 rounded-full bg-success-muted">
                <Play className="h-6 w-6 text-success" />
              </div>
              <span className="font-semibold text-neutral-100">Resume Tagging</span>
            </CardContent>
          </Card>

          <Card variant="interactive">
            <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="p-3 rounded-full bg-info-muted">
                <Clock className="h-6 w-6 text-info" />
              </div>
              <span className="font-semibold text-neutral-100">Recent</span>
            </CardContent>
          </Card>

          <Card variant="interactive">
            <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="p-3 rounded-full bg-warning-muted">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
              <span className="font-semibold text-neutral-100">My Stats</span>
            </CardContent>
          </Card>
        </section>

        {/* Recent Matches */}
        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Matches</CardTitle>
                <Link to="/matches">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentMatches.map((match) => (
                  <Link
                    key={match.id}
                    to={`/matches/${match.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated hover:bg-neutral-600 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-neutral-100 font-medium">
                        {match.player1} vs {match.player2}
                      </span>
                      <span className="text-sm text-neutral-400">{match.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-neutral-50">
                        {match.score}
                      </span>
                      <Badge variant={statusConfig[match.status].variant}>
                        {statusConfig[match.status].label}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick Stats Preview */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="text-center">
                <div className="text-4xl font-bold font-mono text-brand-primary">12</div>
                <div className="text-sm text-neutral-400 mt-1">Matches Tagged</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-center">
                <div className="text-4xl font-bold font-mono text-success">847</div>
                <div className="text-sm text-neutral-400 mt-1">Total Rallies</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-center">
                <div className="text-4xl font-bold font-mono text-warning">68%</div>
                <div className="text-sm text-neutral-400 mt-1">Win Rate</div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Experimental Features */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-warning" />
                Experimental Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/tagging-ui-prototype/v1">
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated hover:bg-neutral-600 transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-100 font-medium">
                      Two-Phase Tagging UI Prototype V1
                    </span>
                    <span className="text-sm text-neutral-400">
                      Current stable version • Phase 1: Timestamp capture • Phase 2: Detailed shot tagging
                    </span>
                  </div>
                  <Badge variant="success">Stable</Badge>
                </div>
              </Link>
              <Link to="/tagging-ui-prototype/v2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated hover:bg-neutral-600 transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-100 font-medium">
                      Two-Phase Tagging UI Prototype V2
                    </span>
                    <span className="text-sm text-neutral-400">
                      Experimental version for testing new approaches
                    </span>
                  </div>
                  <Badge variant="warning">Beta</Badge>
                </div>
              </Link>
            </CardContent>
          </Card>
        </section>
        </div>
      </div>
    </div>
  )
}

