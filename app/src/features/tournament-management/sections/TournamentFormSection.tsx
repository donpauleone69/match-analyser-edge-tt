/**
 * TournamentFormSection - Form for creating/editing tournaments
 */

import { useState, useEffect } from 'react'
import { Button } from '@/ui-mine/Button'
import type { DBTournament, TournamentType } from '@/data'
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
    <div className="bg-bg-card border border-neutral-700 rounded-lg p-4 md:p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tournament Name */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            placeholder="State Championships 2025"
          />
        </div>
        
        {/* Tournament Type + Host Club side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Type *
            </label>
            <select
              required
              value={formData.tournament_type}
              onChange={(e) => setFormData({ ...formData, tournament_type: e.target.value as TournamentType })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              <option value="">Select club...</option>
              {clubs.map(club => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Location + Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              placeholder="City, State"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            />
          </div>
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            placeholder="Additional details..."
          />
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Saving...' : (tournament ? 'Update' : 'Create')}
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
    </div>
  )
}

