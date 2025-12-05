/**
 * TournamentListSection - Display list of tournaments
 */

import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBTournament } from '@/data'
import { useTournamentStore } from '@/data'

interface TournamentListSectionProps {
  tournaments: DBTournament[]
  isLoading: boolean
  onCreateNew: () => void
  onEdit: (tournament: DBTournament) => void
}

export function TournamentListSection({
  tournaments,
  isLoading,
  onCreateNew,
  onEdit,
}: TournamentListSectionProps) {
  const { delete: deleteTournament } = useTournamentStore()
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this tournament?')) {
      await deleteTournament(id)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-400">Loading tournaments...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <Button onClick={onCreateNew}>
        Create Tournament
      </Button>
      
      {tournaments.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-neutral-400">No tournaments yet</p>
          <p className="text-sm text-neutral-500 mt-2">
            Create your first tournament to get started
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tournaments.map(tournament => (
            <Card key={tournament.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-neutral-50 mb-2">
                    {tournament.name}
                  </h3>
                  <div className="space-y-1 text-sm text-neutral-400">
                    <p>
                      <span className="font-medium text-neutral-300">Type:</span>{' '}
                      <span className="capitalize">{tournament.tournament_type.replace('_', ' ')}</span>
                    </p>
                    {tournament.location && (
                      <p>
                        <span className="font-medium text-neutral-300">Location:</span>{' '}
                        {tournament.location}
                      </p>
                    )}
                    <p>
                      <span className="font-medium text-neutral-300">Date:</span>{' '}
                      {new Date(tournament.start_date).toLocaleDateString()}
                      {tournament.end_date && ` - ${new Date(tournament.end_date).toLocaleDateString()}`}
                    </p>
                    {tournament.notes && (
                      <p className="mt-2 text-neutral-400">
                        {tournament.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => onEdit(tournament)}
                    variant="secondary"
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(tournament.id)}
                    variant="destructive"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

