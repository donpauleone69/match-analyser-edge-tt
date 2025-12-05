/**
 * PlayerListSection - Display list of players
 */

import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBPlayer } from '@/database/types'
import { usePlayerStore } from '@/stores/playerStore'

interface PlayerListSectionProps {
  players: DBPlayer[]
  isLoading: boolean
  onCreateNew: () => void
  onEdit: (player: DBPlayer) => void
}

export function PlayerListSection({
  players,
  isLoading,
  onCreateNew,
  onEdit,
}: PlayerListSectionProps) {
  const { archivePlayer } = usePlayerStore()
  
  const handleArchive = async (id: string) => {
    if (confirm('Are you sure you want to archive this player?')) {
      await archivePlayer(id)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-400">Loading players...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <Button onClick={onCreateNew}>
        Add Player
      </Button>
      
      {players.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-neutral-400">No players yet</p>
          <p className="text-sm text-neutral-500 mt-2">
            Add your first player to get started
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {players.map(player => (
            <Card key={player.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-neutral-50 mb-2">
                    {player.first_name} {player.last_name}
                  </h3>
                  <div className="space-y-1 text-sm text-neutral-400">
                    <p>
                      <span className="font-medium text-neutral-300">Handedness:</span>{' '}
                      <span className="capitalize">{player.handedness}</span>
                    </p>
                    {player.club_name && (
                      <p>
                        <span className="font-medium text-neutral-300">Club:</span>{' '}
                        {player.club_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => onEdit(player)}
                    variant="secondary"
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleArchive(player.id)}
                    variant="destructive"
                    size="sm"
                  >
                    Archive
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

