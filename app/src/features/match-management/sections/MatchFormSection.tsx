/**
 * MatchFormSection - Form for creating matches with optional tagging
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui-mine/Button'
import { Card } from '@/ui-mine/Card'
import type { DBPlayer, DBTournament, MatchRound } from '@/database/types'
import { useMatchManagementStore } from '@/stores/matchManagementStore'
import { useTaggingStore } from '@/stores/taggingStore'

interface MatchFormSectionProps {
  players: DBPlayer[]
  tournaments: DBTournament[]
}

const MATCH_ROUNDS: { value: MatchRound; label: string }[] = [
  { value: 'final', label: 'Final' },
  { value: 'semi_final', label: 'Semi-Final' },
  { value: 'quarter_final', label: 'Quarter-Final' },
  { value: 'round_16', label: 'Round of 16' },
  { value: 'round_32', label: 'Round of 32' },
  { value: 'groups', label: 'Groups' },
  { value: 'other', label: 'Other' },
]

export function MatchFormSection({ players, tournaments }: MatchFormSectionProps) {
  const navigate = useNavigate()
  const { createMatch } = useMatchManagementStore()
  const { resetForNewMatch } = useTaggingStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    player1_id: '',
    player2_id: '',
    tournament_id: '',
    round: '' as MatchRound | '',
    match_date: new Date().toISOString().split('T')[0],
    player1_sets_won: 0,
    player2_sets_won: 0,
    match_format: 'Best of 5',
    will_tag_video: false,
  })
  
  const player1 = players.find(p => p.id === formData.player1_id)
  const player2 = players.find(p => p.id === formData.player2_id)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!player1 || !player2) {
      alert('Please select both players')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Determine winner
      const winner_id = formData.player1_sets_won > formData.player2_sets_won 
        ? formData.player1_id 
        : formData.player2_sets_won > formData.player1_sets_won
          ? formData.player2_id
          : null
      
      await createMatch({
        player1_id: formData.player1_id,
        player2_id: formData.player2_id,
        tournament_id: formData.tournament_id || null,
        round: formData.round || null,
        winner_id,
        player1_sets_won: formData.player1_sets_won,
        player2_sets_won: formData.player2_sets_won,
        match_format: formData.match_format,
        match_date: formData.match_date,
        // For now, no video tagging - MVP focus
        tagging_mode: formData.will_tag_video ? 'essential' : null,
        video_coverage: null,
        first_server_id: formData.player1_id, // Default to player1
        player1_start_sets: 0,
        player2_start_sets: 0,
        player1_start_points: 0,
        player2_start_points: 0,
        first_serve_timestamp: null,
        video_blob_url: null,
        step1_complete: !formData.will_tag_video, // If no video, mark as complete
        step2_complete: !formData.will_tag_video,
      })
      
      if (formData.will_tag_video) {
        // Reset tagging store and navigate to prototype V2
        resetForNewMatch()
        // Store match ID in tagging store for later integration
        alert('Video tagging feature will be integrated in the next step!')
        navigate('/matches')
      } else {
        alert('Match created successfully!')
        navigate('/matches')
      }
    } catch (error) {
      console.error('Failed to create match:', error)
      alert('Failed to create match. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Players Section */}
        <div>
          <h3 className="text-lg font-semibold text-neutral-50 mb-4">Players</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Player 1 *
              </label>
              <select
                required
                value={formData.player1_id}
                onChange={(e) => setFormData({ ...formData, player1_id: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Player 1</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.first_name} {player.last_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Player 2 *
              </label>
              <select
                required
                value={formData.player2_id}
                onChange={(e) => setFormData({ ...formData, player2_id: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Player 2</option>
                {players.map(player => (
                  <option key={player.id} value={player.id} disabled={player.id === formData.player1_id}>
                    {player.first_name} {player.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Tournament Section */}
        <div>
          <h3 className="text-lg font-semibold text-neutral-50 mb-4">Tournament (Optional)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Tournament
              </label>
              <select
                value={formData.tournament_id}
                onChange={(e) => setFormData({ ...formData, tournament_id: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None (Friendly Match)</option>
                {tournaments.map(tournament => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </div>
            
            {formData.tournament_id && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Round
                </label>
                <select
                  value={formData.round}
                  onChange={(e) => setFormData({ ...formData, round: e.target.value as MatchRound })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Round</option>
                  {MATCH_ROUNDS.map(round => (
                    <option key={round.value} value={round.value}>
                      {round.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        
        {/* Match Details */}
        <div>
          <h3 className="text-lg font-semibold text-neutral-50 mb-4">Match Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Match Date *
              </label>
              <input
                type="date"
                required
                value={formData.match_date}
                onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {player1 ? `${player1.first_name}'s Sets` : 'Player 1 Sets'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={formData.player1_sets_won}
                  onChange={(e) => setFormData({ ...formData, player1_sets_won: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="text-center text-2xl text-neutral-400 pb-2">-</div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {player2 ? `${player2.first_name}'s Sets` : 'Player 2 Sets'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={formData.player2_sets_won}
                  onChange={(e) => setFormData({ ...formData, player2_sets_won: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Video Tagging Option */}
        <div className="border-t border-neutral-700 pt-6">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="will_tag_video"
              checked={formData.will_tag_video}
              onChange={(e) => setFormData({ ...formData, will_tag_video: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <label htmlFor="will_tag_video" className="block text-sm font-medium text-neutral-300">
                Tag match video
              </label>
              <p className="text-sm text-neutral-500 mt-1">
                Check this if you want to tag video for this match (coming soon)
              </p>
            </div>
          </div>
        </div>
        
        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Creating Match...' : 'Create Match'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/matches')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}

