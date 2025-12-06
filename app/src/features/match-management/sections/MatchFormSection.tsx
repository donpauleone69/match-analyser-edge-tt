/**
 * MatchFormSection - Form for creating matches with optional tagging
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui-mine/Button'
import type { DBPlayer, DBTournament, MatchRound, BestOf } from '@/data'
import { useMatchStore, setDb } from '@/data'
const { create: createSet } = setDb
// generateId no longer needed - handled by createMatch

interface MatchFormSectionProps {
  players: DBPlayer[]
  tournaments: DBTournament[]
}

const MATCH_ROUNDS: { value: MatchRound; label: string }[] = [
  { value: 'groups', label: 'Groups' },
  { value: 'last_32', label: 'Round of 32' },
  { value: 'last_16', label: 'Round of 16' },
  { value: 'quarter_final', label: 'Quarter-Final' },
  { value: 'semi_final', label: 'Semi-Final' },
  { value: 'final', label: 'Final' },
  { value: 'other', label: 'Other' },
]

const BEST_OF_OPTIONS: { value: BestOf; label: string }[] = [
  { value: 1, label: 'Best of 1' },
  { value: 3, label: 'Best of 3' },
  { value: 5, label: 'Best of 5' },
  { value: 7, label: 'Best of 7' },
]

export function MatchFormSection({ players, tournaments }: MatchFormSectionProps) {
  const navigate = useNavigate()
  const { create: createMatch } = useMatchStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    player1_id: '',
    player2_id: '',
    tournament_id: '',
    round: '' as MatchRound | '',
    match_date: new Date().toISOString().split('T')[0],
    best_of: 5 as BestOf,
  })
  
  const player1 = players.find(p => p.id === formData.player1_id)
  const player2 = players.find(p => p.id === formData.player2_id)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!player1 || !player2) {
      alert('Please select both players')
      return
    }
    
    if (formData.player1_id === formData.player2_id) {
      alert('Player 1 and Player 2 must be different')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Create match with new clean schema
      const newMatch = await createMatch({
        player1_id: formData.player1_id,
        player2_id: formData.player2_id,
        tournament_id: formData.tournament_id || null,
        round: formData.round || null,
        match_date: formData.match_date,
        best_of: formData.best_of,
        
        // Defaults - unknown at creation time
        first_server_id: 'player1', // Temporary default (will be set per-set during tagging)
        player1_sets_won: 0,
        player2_sets_won: 0,
        winner_id: null,
        set_score_summary: null,
        tagging_mode: null,
        has_video: false,
        video_count: 0,
        total_coverage: 'partial',
        step1_complete: false,
        step2_complete: false,
      })
      
      const matchId = newMatch.id
      
      // Auto-create all sets based on best_of value
      for (let setNumber = 1; setNumber <= formData.best_of; setNumber++) {
        // Service alternation: odd sets (1,3,5,7) = player1, even sets (2,4,6) = player2
        const setFirstServerId = setNumber % 2 === 1 ? 'player1' : 'player2'
        
        await createSet({
          match_id: matchId,
          set_number: setNumber,
          set_first_server_id: setFirstServerId,
          player1_final_score: 0,
          player2_final_score: 0,
          winner_id: null,
          has_video: false,
          video_segments: [],
          video_contexts: null,
          end_of_set_timestamp: null,
        })
      }
      
      alert(`Match created successfully with ${formData.best_of} sets!`)
      navigate('/matches')
    } catch (error) {
      console.error('Failed to create match:', error)
      alert('Failed to create match. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="bg-bg-card border border-neutral-700 rounded-lg p-4 md:p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Players */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Player 1 *
            </label>
            <select
              required
              value={formData.player1_id}
              onChange={(e) => setFormData({ ...formData, player1_id: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              <option value="">Select player...</option>
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
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              <option value="">Select player...</option>
              {players.map(player => (
                <option key={player.id} value={player.id} disabled={player.id === formData.player1_id}>
                  {player.first_name} {player.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Tournament + Round */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Tournament
            </label>
            <div className="flex gap-2">
            <select
              value={formData.tournament_id}
              onChange={(e) => setFormData({ ...formData, tournament_id: e.target.value })}
              className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              <option value="">Friendly</option>
              {tournaments.map(tournament => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
            </div>
          </div>
          
          {formData.tournament_id && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Round
              </label>
              <select
                value={formData.round}
                onChange={(e) => setFormData({ ...formData, round: e.target.value as MatchRound })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              >
                <option value="">Select...</option>
                {MATCH_ROUNDS.map(round => (
                  <option key={round.value} value={round.value}>
                    {round.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* Date + Best Of */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.match_date}
              onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Best Of *
            </label>
            <div className="flex gap-2">
              {BEST_OF_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className={`flex-1 cursor-pointer rounded-lg border-2 p-2 md:p-3 text-center transition-all ${
                    formData.best_of === option.value
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="best_of"
                    value={option.value}
                    checked={formData.best_of === option.value}
                    onChange={(e) => setFormData({ ...formData, best_of: parseInt(e.target.value) as BestOf })}
                    className="sr-only"
                  />
                  <span className="text-sm md:text-base font-semibold text-neutral-50">{option.value}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        {/* Submit Buttons */}
        <div className="flex gap-3 pt-2">
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
    </div>
  )
}

