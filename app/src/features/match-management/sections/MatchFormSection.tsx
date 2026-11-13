/**
 * MatchFormSection - Thin start: focal player required, opponent / tournament optional.
 * Date / round live under Match Review → Details.
 * Creates one set at 0–0 and opens Pass 1 Focus tagging.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui-mine/Button'
import type { DBPlayer, DBTournament } from '@/data'
import { useMatchStore, setDb } from '@/data'

const { create: createSet } = setDb

interface MatchFormSectionProps {
  players: DBPlayer[]
  tournaments: DBTournament[]
  focalPlayerId: string | null
}

export function MatchFormSection({ players, tournaments, focalPlayerId }: MatchFormSectionProps) {
  const navigate = useNavigate()
  const { create: createMatch } = useMatchStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    player1_id: focalPlayerId ?? '',
    player2_id: '',
    tournament_id: '',
  })

  useEffect(() => {
    if (focalPlayerId) {
      setFormData((current) => ({ ...current, player1_id: focalPlayerId }))
    }
  }, [focalPlayerId])

  const player1 = players.find((p) => p.id === formData.player1_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!player1) {
      alert('Please select the player you are tagging')
      return
    }

    if (formData.player2_id && formData.player1_id === formData.player2_id) {
      alert('Opponent must be different from the player you are tagging')
      return
    }

    setIsSubmitting(true)

    try {
      const matchDate = new Date().toISOString().split('T')[0]
      const player2Id = formData.player2_id || null
      const tournamentId = formData.tournament_id || null

      const newMatch = await createMatch({
        player1_id: formData.player1_id,
        player2_id: player2Id,
        tournament_id: tournamentId,
        round: null,
        match_date: matchDate,
        match_date_source: null,
        best_of: 1,

        first_server_id: formData.player1_id,
        player1_sets_final: 0,
        player2_sets_final: 0,
        winner_id: null,
        tagging_mode: null,
        match_detail_level: 'result_only',
        has_video: false,
        video_count: 0,
        total_coverage: 'partial',
        step1_complete: false,
        step2_complete: false,
      })

      await createSet({
        match_id: newMatch.id,
        set_number: 1,
        set_first_server_id: formData.player1_id,
        player1_score_final: 0,
        player2_score_final: 0,
        winner_id: null,
        player1_sets_before: 0,
        player1_sets_after: 0,
        player2_sets_before: 0,
        player2_sets_after: 0,
        has_video: false,
        video_segments: [],
        video_contexts: null,
        end_of_set_timestamp: null,
        setup_starting_score_p1: 0,
        setup_starting_score_p2: 0,
        setup_next_server_id: formData.player1_id,
        setup_completed_at: new Date().toISOString(),
        score_confirmed: null,
      })

      navigate(`/matches/${newMatch.id}/tag?set=1&mode=pass1focus`)
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
        <p className="text-sm text-neutral-400">
          Choose who you are tagging. Opponent and tournament are optional — add them now or later under Details so Clips can filter by them.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              You (player) *
            </label>
            <select
              required
              value={formData.player1_id}
              disabled
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              <option value="">Select player...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.first_name} {player.last_name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">Change “Reviewing as” in Account & data.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Opponent
            </label>
            <select
              value={formData.player2_id}
              onChange={(e) => setFormData({ ...formData, player2_id: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              <option value="">Add later in Details</option>
              {players.map((player) => (
                <option
                  key={player.id}
                  value={player.id}
                  disabled={player.id === formData.player1_id}
                >
                  {player.first_name} {player.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Tournament
            </label>
            <select
              value={formData.tournament_id}
              onChange={(e) => setFormData({ ...formData, tournament_id: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            >
              <option value="">None (optional)</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              Create a new tournament from Match Review → Details if it isn’t listed.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Starting…' : 'Start tagging'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
