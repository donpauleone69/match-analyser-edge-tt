/**
 * PlayerManagementComposer - Main orchestrator for player management
 */

import { useEffect, useState } from 'react'
import { usePlayerStore } from '@/data'
import { PlayerListSection } from '../sections/PlayerListSection'
import { PlayerFormSection } from '../sections/PlayerFormSection'
import type { DBPlayer } from '@/data'
import { Users } from 'lucide-react'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
            <Users className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
            {showForm ? (editingPlayer ? 'Edit Player' : 'Create Player') : 'Players'}
          </h1>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            {showForm ? 'Enter player details' : 'Manage table tennis players'}
          </p>
        </div>
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
  )
}

