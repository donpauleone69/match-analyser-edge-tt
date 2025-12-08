/**
 * PlayerFormSection - Form for creating/editing players
 */

import { useState, useEffect } from 'react'
import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBPlayer, Handedness, Playstyle } from '@/data'
import { usePlayerStore, useClubStore } from '@/data'

interface PlayerFormSectionProps {
  player: DBPlayer | null
  onClose: () => void
  onSuccess: () => void
}

export function PlayerFormSection({
  player,
  onClose,
  onSuccess,
}: PlayerFormSectionProps) {
  const { create: createPlayer, update: updatePlayer } = usePlayerStore()
  const { clubs, load: loadClubs } = useClubStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: player?.first_name || '',
    last_name: player?.last_name || '',
    handedness: (player?.handedness || 'right') as Handedness,
    playstyle: (player?.playstyle || null) as Playstyle | null,
    club_id: player?.club_id || null,
  })
  
  // Load clubs for dropdown
  useEffect(() => {
    loadClubs()
  }, [loadClubs])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (player) {
        console.log('Updating player:', player.id, formData)
        await updatePlayer(player.id, formData)
      } else {
        const playerData = {
          ...formData,
          is_archived: 0 as any, // IndexedDB stores booleans as 0/1
        }
        console.log('Creating player with data:', playerData)
        await createPlayer(playerData)
      }
      onSuccess()
    } catch (error) {
      console.error('❌ Failed to save player:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to save player: ${errorMessage}\n\nCheck console for details.`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold text-neutral-50 mb-6">
        {player ? 'Edit Player' : 'Add Player'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              First Name *
            </label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Doe"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Handedness *
            </label>
            <select
              required
              value={formData.handedness}
              onChange={(e) => setFormData({ ...formData, handedness: e.target.value as Handedness })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="right">Right-handed</option>
              <option value="left">Left-handed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Playstyle (optional)
            </label>
            <select
              value={formData.playstyle || ''}
              onChange={(e) => setFormData({ ...formData, playstyle: e.target.value as Playstyle || null })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Not specified —</option>
              <option value="attacker">Attacker</option>
              <option value="all_rounder">All-rounder</option>
              <option value="defender">Defender</option>
              <option value="disruptive">Disruptive</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Club (optional)
          </label>
          <select
            value={formData.club_id || ''}
            onChange={(e) => setFormData({ ...formData, club_id: e.target.value || null })}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— No club / Independent —</option>
            {clubs.map(club => (
              <option key={club.id} value={club.id}>
                {club.name} {club.city && `(${club.city})`}
              </option>
            ))}
          </select>
          {clubs.length === 0 && (
            <p className="text-xs text-neutral-500 mt-1">
              No clubs yet. <a href="/clubs" className="text-blue-400 hover:underline">Create a club</a> first.
            </p>
          )}
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Saving...' : (player ? 'Update Player' : 'Add Player')}
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

