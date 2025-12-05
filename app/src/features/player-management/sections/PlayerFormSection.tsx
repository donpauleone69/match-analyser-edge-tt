/**
 * PlayerFormSection - Form for creating/editing players
 */

import { useState } from 'react'
import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBPlayer, Handedness } from '@/database/types'
import { usePlayerStore } from '@/stores/playerStore'

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
  const { createPlayer, updatePlayer } = usePlayerStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: player?.first_name || '',
    last_name: player?.last_name || '',
    handedness: (player?.handedness || 'right') as Handedness,
    club_name: player?.club_name || '',
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (player) {
        console.log('Updating player:', player.id, formData)
        await updatePlayer(player.id, {
          ...formData,
          club_name: formData.club_name || null,
          club_id: null, // Club ID management deferred for Phase 2
        })
      } else {
        const playerData = {
          ...formData,
          club_name: formData.club_name || null,
          club_id: null,
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
            Club Name (optional)
          </label>
          <input
            type="text"
            value={formData.club_name}
            onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ABC Table Tennis Club"
          />
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

