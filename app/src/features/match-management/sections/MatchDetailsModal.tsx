/**
 * MatchDetailsModal — attach opponent and tournament after tagging (or anytime).
 */

import { useState } from 'react'
import { Button } from '@/ui-mine/Button'
import type { DBMatch, DBPlayer, DBTournament, MatchRound } from '@/data'
import { useMatchStore, linkMatchOpponent } from '@/data'
import { THEM_SIDE_LABEL } from '@/helpers/themSide'

const MATCH_ROUNDS: { value: MatchRound; label: string }[] = [
  { value: 'groups', label: 'Groups' },
  { value: 'last_32', label: 'Round of 32' },
  { value: 'last_16', label: 'Round of 16' },
  { value: 'quarter_final', label: 'Quarter-Final' },
  { value: 'semi_final', label: 'Semi-Final' },
  { value: 'final', label: 'Final' },
  { value: 'other', label: 'Other' },
]

interface MatchDetailsModalProps {
  match: DBMatch
  players: DBPlayer[]
  tournaments: DBTournament[]
  player1Name: string
  onClose: () => void
  onSaved: () => void
}

export function MatchDetailsModal({
  match,
  players,
  tournaments,
  player1Name,
  onClose,
  onSaved,
}: MatchDetailsModalProps) {
  const { update: updateMatch } = useMatchStore()
  const [player2Id, setPlayer2Id] = useState(match.player2_id ?? '')
  const [tournamentId, setTournamentId] = useState(match.tournament_id ?? '')
  const [round, setRound] = useState<MatchRound | ''>(match.round ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (player2Id && player2Id === match.player1_id) {
      alert('Opponent must be different from the player you are tagging')
      return
    }

    setSaving(true)
    try {
      const nextOpponent = player2Id || null
      const opponentChanged = nextOpponent !== match.player2_id

      if (opponentChanged && nextOpponent) {
        await linkMatchOpponent(match.id, nextOpponent)
      } else if (opponentChanged && !nextOpponent) {
        await updateMatch(match.id, { player2_id: null })
      }

      await updateMatch(match.id, {
        tournament_id: tournamentId || null,
        round: tournamentId && round ? round : null,
      })

      onSaved()
      onClose()
    } catch (error) {
      console.error('Failed to update match details:', error)
      alert(error instanceof Error ? error.message : 'Failed to save details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-700 bg-bg-card p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-50">Match details</h2>
          <p className="text-sm text-neutral-400 mt-1">
            {player1Name} vs {match.player2_id ? 'opponent' : THEM_SIDE_LABEL}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Opponent
          </label>
          <select
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 text-sm"
          >
            <option value="">{THEM_SIDE_LABEL} (unnamed)</option>
            {players
              .filter((p) => p.id !== match.player1_id)
              .map((player) => (
                <option key={player.id} value={player.id}>
                  {player.first_name} {player.last_name}
                </option>
              ))}
          </select>
          <p className="text-xs text-neutral-500 mt-1">
            Choosing a player fills Villain on saved rallies and shots.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Tournament
          </label>
          <select
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 text-sm"
          >
            <option value="">None</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {tournamentId && (
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Round
            </label>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value as MatchRound | '')}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-50 text-sm"
            >
              <option value="">Select...</option>
              {MATCH_ROUNDS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
