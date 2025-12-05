/**
 * TournamentManagementComposer - Main orchestrator for tournament management
 */

import { useEffect, useState } from 'react'
import { useTournamentStore } from '@/stores/tournamentStore'
import { TournamentListSection } from '../sections/TournamentListSection'
import { TournamentFormSection } from '../sections/TournamentFormSection'
import type { DBTournament } from '@/database/types'

export function TournamentManagementComposer() {
  const { tournaments, isLoading, loadTournaments } = useTournamentStore()
  const [editingTournament, setEditingTournament] = useState<DBTournament | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  useEffect(() => {
    loadTournaments()
  }, [loadTournaments])
  
  const handleCreate = () => {
    setEditingTournament(null)
    setShowForm(true)
  }
  
  const handleEdit = (tournament: DBTournament) => {
    setEditingTournament(tournament)
    setShowForm(true)
  }
  
  const handleFormClose = () => {
    setShowForm(false)
    setEditingTournament(null)
  }
  
  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingTournament(null)
    loadTournaments()
  }
  
  return (
    <div className="h-screen overflow-y-auto bg-bg-surface">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-50">Tournaments</h1>
        </div>
        
        {showForm ? (
          <TournamentFormSection
            tournament={editingTournament}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        ) : (
          <TournamentListSection
            tournaments={tournaments}
            isLoading={isLoading}
            onCreateNew={handleCreate}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  )
}

