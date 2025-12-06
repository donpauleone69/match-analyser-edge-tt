/**
 * TournamentManagementComposer - Main orchestrator for tournament management
 */

import { useEffect, useState } from 'react'
import { useTournamentStore, type DBTournament } from '@/data'
import { TournamentListSection } from '../sections/TournamentListSection'
import { TournamentFormSection } from '../sections/TournamentFormSection'
import { Trophy } from 'lucide-react'

export function TournamentManagementComposer() {
  const { tournaments, isLoading, load: loadTournaments } = useTournamentStore()
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
    // No need to reload - store cache updates automatically
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
            <Trophy className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
            {showForm ? (editingTournament ? 'Edit Tournament' : 'Create Tournament') : 'Tournaments'}
          </h1>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            {showForm ? 'Enter tournament details' : 'Manage table tennis tournaments'}
          </p>
        </div>
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
  )
}

