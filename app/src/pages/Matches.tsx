import { Link } from 'react-router-dom'
import { Plus, Filter, Play, Trash2 } from 'lucide-react'
import { Header } from '../components/layout'
import { Button, Card, Badge } from '../components/ui'
import { useTaggingStore } from '../stores/taggingStore'

// Mock data for completed matches (future: fetch from DB)
const matches = [
  {
    id: '1',
    player1: 'Marcus Chen',
    player2: 'Anna Kowalski',
    score: '3-2',
    date: 'Nov 29, 2025',
    status: 'complete' as const,
    games: [
      { p1: 11, p2: 9 },
      { p1: 8, p2: 11 },
      { p1: 11, p2: 7 },
      { p1: 9, p2: 11 },
      { p1: 11, p2: 6 },
    ],
  },
  {
    id: '2',
    player1: 'Marcus Chen',
    player2: 'John Smith',
    score: '2-0',
    date: 'Nov 28, 2025',
    status: 'step2' as const,
    games: [
      { p1: 11, p2: 5 },
      { p1: 11, p2: 8 },
    ],
  },
  {
    id: '3',
    player1: 'Wei Liu',
    player2: 'Marcus Chen',
    score: '1-3',
    date: 'Nov 25, 2025',
    status: 'step1' as const,
    games: [
      { p1: 11, p2: 9 },
      { p1: 6, p2: 11 },
      { p1: 8, p2: 11 },
      { p1: 5, p2: 11 },
    ],
  },
]

const statusConfig = {
  complete: { label: 'Complete', variant: 'success' as const },
  step2: { label: 'Step 2 In Progress', variant: 'warning' as const },
  step1: { label: 'Step 1 In Progress', variant: 'info' as const },
}

export function Matches() {
  // Get current in-progress match from store
  const {
    matchId,
    player1Name,
    player2Name,
    matchDate,
    taggingPhase,
    rallies,
    step1Complete,
    step2Complete,
    resetForNewMatch,
  } = useTaggingStore()
  
  // Check if there's an in-progress match
  const hasInProgressMatch = matchId && taggingPhase !== 'setup' && !step2Complete
  
  const getProgressLabel = () => {
    if (!step1Complete) return 'Part 1: Contact Tagging'
    if (!step2Complete) return 'Part 2: Shot Details'
    return 'Complete'
  }
  
  const handleDeleteInProgress = () => {
    if (confirm(`Delete in-progress match "${player1Name} vs ${player2Name}"?`)) {
      resetForNewMatch()
    }
  }
  
  return (
    <div className="min-h-screen">
      <Header title="Matches" />
      
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* In-Progress Match Banner */}
        {hasInProgressMatch && (
          <Card className="border-warning/50 bg-warning/5">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="warning">In Progress</Badge>
                    <span className="text-sm text-neutral-400">{getProgressLabel()}</span>
                  </div>
                  <div className="text-lg font-semibold text-neutral-100">
                    {player1Name} vs {player2Name}
                  </div>
                  <div className="text-sm text-neutral-400">
                    {matchDate || 'No date'} • {rallies.length} rallies tagged
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteInProgress}
                    className="p-2 text-neutral-400 hover:text-danger hover:bg-danger/10 rounded transition-colors"
                    title="Delete in-progress match"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <Link to={`/matches/${matchId}/tagging`}>
                    <Button variant="primary">
                      <Play className="h-4 w-4 mr-2" />
                      Resume Tagging
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Link to="/matches/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Match
            </Button>
          </Link>
        </div>

        {/* Match List */}
        <div className="space-y-4">
          {matches.map((match) => (
            <Link key={match.id} to={`/matches/${match.id}`}>
              <Card variant="interactive" className="hover:border-brand-primary/50">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Left: Players and Date */}
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-neutral-100">
                        {match.player1} vs {match.player2}
                      </div>
                      <div className="text-sm text-neutral-400">{match.date}</div>
                    </div>
                    
                    {/* Right: Score and Status */}
                    <div className="text-right space-y-2">
                      <div className="text-2xl font-bold font-mono text-neutral-50">
                        {match.score}
                      </div>
                      <Badge variant={statusConfig[match.status].variant}>
                        {statusConfig[match.status].label}
                      </Badge>
                    </div>
                  </div>

                  {/* Game Scores */}
                  <div className="mt-4 flex gap-2">
                    {match.games.map((game, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded bg-bg-elevated text-sm font-mono"
                      >
                        <span className={game.p1 > game.p2 ? 'text-success' : 'text-neutral-400'}>
                          {game.p1}
                        </span>
                        <span className="text-neutral-600 mx-1">-</span>
                        <span className={game.p2 > game.p1 ? 'text-success' : 'text-neutral-400'}>
                          {game.p2}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

