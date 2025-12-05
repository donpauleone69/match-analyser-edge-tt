/**
 * PlayerManagementComposer - Main orchestrator for player management
 */

import { useEffect, useState } from 'react'
import { usePlayerStore } from '@/data'
import { PlayerListSection } from '../sections/PlayerListSection'
import { PlayerFormSection } from '../sections/PlayerFormSection'
import type { DBPlayer } from '@/data'

export function PlayerManagementComposer() {
  const { players, isLoading, load: loadPlayers } = usePlayerStore()
  const [editingPlayer, setEditingPlayer] = useState<DBPlayer | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])
  
  const handleCreate = () => {
    setEditingPlayer(null)
    setShowForm(true)
  }
  
  const handleEdit = (player: DBPlayer) => {
    setEditingPlayer(player)
    setShowForm(true)
  }
  
  const handleFormClose = () => {
    setShowForm(false)
    setEditingPlayer(null)
  }
  
  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingPlayer(null)
    // No need to reload - store cache updates automatically
  }
  
  return (
    <div className="h-screen overflow-y-auto bg-bg-surface">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-50">Players</h1>
        </div>
        
        {showForm ? (
          <PlayerFormSection
            player={editingPlayer}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        ) : (
          <PlayerListSection
            players={players}
            isLoading={isLoading}
            onCreateNew={handleCreate}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  )
}

