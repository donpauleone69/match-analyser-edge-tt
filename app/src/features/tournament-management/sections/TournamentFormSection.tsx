/**
 * TournamentFormSection - Form for creating/editing tournaments
 */

import { useState, useEffect } from 'react'
import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBTournament, TournamentType, DBClub } from '@/data'
import { useTournamentStore, useClubStore } from '@/data'

interface TournamentFormSectionProps {
  tournament: DBTournament | null
  onClose: () => void
  onSuccess: () => void
}

const TOURNAMENT_TYPES: { value: TournamentType; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'club', label: 'Club' },
  { value: 'local', label: 'Local Tournament' },
  { value: 'regional', label: 'Regional Tournament' },
  { value: 'national', label: 'National Tournament' },
  { value: 'international', label: 'International Tournament' },
]

export function TournamentFormSection({
  tournament,
  onClose,
  onSuccess,
}: TournamentFormSectionProps) {
  const { create: createTournament, update: updateTournament } = useTournamentStore()
  const { clubs, load: loadClubs } = useClubStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: tournament?.name || '',
    location: tournament?.location || '',
    start_date: tournament?.start_date ? tournament.start_date.split('T')[0] : '',
    end_date: tournament?.end_date ? tournament.end_date.split('T')[0] : '',
    tournament_type: (tournament?.tournament_type || 'friendly') as TournamentType,
    tournament_host_club_id: tournament?.tournament_host_club_id || null,
    notes: tournament?.notes || '',
  })
  
  // Load clubs for dropdown
  useEffect(() => {
    loadClubs()
  }, [loadClubs])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (tournament) {
        await updateTournament(tournament.id, {
          ...formData,
          location: formData.location || null,
          end_date: formData.end_date || null,
          notes: formData.notes || null,
        })
      } else {
        await createTournament({
          ...formData,
          location: formData.location || null,
          end_date: formData.end_date || null,
          notes: formData.notes || null,
        })
      }
      onSuccess()
    } catch (error) {
      console.error('Failed to save tournament:', error)
      alert('Failed to save tournament. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold text-neutral-50 mb-6">
        {tournament ? 'Edit Tournament' : 'Create Tournament'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Tournament Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="State Championships 2025"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Tournament Type *
          </label>
          <select
            required
            value={formData.tournament_type}
            onChange={(e) => setFormData({ ...formData, tournament_type: e.target.value as TournamentType })}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TOURNAMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Host Club *
          </label>
          <select
            required
            value={formData.tournament_host_club_id || ''}
            onChange={(e) => setFormData({ ...formData, tournament_host_club_id: e.target.value || null })}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Select host club —</option>
            {clubs.map(club => (
              <option key={club.id} value={club.id}>
                {club.name} {club.location && `(${club.location})`}
              </option>
            ))}
          </select>
          {clubs.length === 0 && (
            <p className="text-xs text-neutral-500 mt-1">
              No clubs yet. <a href="/clubs" className="text-blue-400 hover:underline">Create a club</a> first.
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Location (optional)
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="City, State (if different from club)"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              End Date (optional)
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional information about the tournament..."
          />
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Saving...' : (tournament ? 'Update Tournament' : 'Create Tournament')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}

