/**
 * MatchFormSection - Thin start: focal player required, opponent / tournament optional.
 * Date / round live under Match Review → Details.
 * Creates one set at 0–0 and opens Pass 1 Focus tagging.
 * Soft-warns when the same opponent (+ tournament) already has a match on today’s date.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui-mine/Button'
import type { DBPlayer, DBTournament } from '@/data'
import { useMatchStore, setDb } from '@/data'
import { findDuplicateMatches, type MatchDuplicateCandidate } from '@/rules/matchDuplicate'

const { create: createSet } = setDb

interface MatchFormSectionProps {
  players: DBPlayer[]
  tournaments: DBTournament[]
  focalPlayerId: string | null
}

export function MatchFormSection({ players, tournaments, focalPlayerId }: MatchFormSectionProps) {
  const navigate = useNavigate()
  const { create: createMatch, load: loadMatches } = useMatchStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dupes, setDupes] = useState<MatchDuplicateCandidate[] | null>(null)

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

  useEffect(() => {
    void loadMatches()
  }, [loadMatches])

  const player1 = players.find((p) => p.id === formData.player1_id)

  const createAndOpen = async () => {
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

    navigate(`/matches/${newMatch.id}/tag?set=1`)
  }

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
      await loadMatches()
      const latest = useMatchStore.getState().matches
      const matchDate = new Date().toISOString().split('T')[0]
      const hits = findDuplicateMatches(latest, {
        player1Id: formData.player1_id,
        player2Id: formData.player2_id || null,
        tournamentId: formData.tournament_id || null,
        matchDate,
      })
      if (hits.length > 0 && !dupes) {
        setDupes(hits)
        return
      }
      await createAndOpen()
    } catch (error) {
      console.error('Failed to create match:', error)
      alert('Failed to create match. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openExisting = (id: string) => {
    const hit = dupes?.find((d) => d.id === id)
    const incomplete =
      hit &&
      hit.tagging_mode != null &&
      (!hit.step1_complete || !hit.step2_complete)
    navigate(incomplete ? `/matches/${id}/tag?set=1` : `/matches/${id}`)
  }

  const opponentLabel = (id: string | null) => {
    if (!id) return 'No opponent'
    const p = players.find((x) => x.id === id)
    return p ? `${p.first_name} ${p.last_name}` : id
  }

  const tournamentLabel = (id: string | null) => {
    if (!id) return 'No tournament'
    return tournaments.find((t) => t.id === id)?.name ?? id
  }

  const fieldClass =
    'w-full px-3 py-2 bg-bg-surface border border-border rounded-md text-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm'

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-neutral-500">
          Opponent and tournament optional — add later under Details.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              You (player) *
            </label>
            <select
              required
              value={formData.player1_id}
              disabled
              className={fieldClass}
            >
              <option value="">Select player...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.first_name} {player.last_name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-neutral-500">Change in Account & data.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Opponent
            </label>
            <select
              value={formData.player2_id}
              onChange={(e) => {
                setDupes(null)
                setFormData({ ...formData, player2_id: e.target.value })
              }}
              className={fieldClass}
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
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Tournament
            </label>
            <select
              value={formData.tournament_id}
              onChange={(e) => {
                setDupes(null)
                setFormData({ ...formData, tournament_id: e.target.value })
              }}
              className={fieldClass}
            >
              <option value="">None (optional)</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-neutral-500">
              New tournaments: Match Review → Details.
            </p>
          </div>
        </div>

        {dupes && dupes.length > 0 && (
          <div
            role="alert"
            className="rounded-md border border-callout-warning-border bg-callout-warning-bg p-2.5 space-y-2"
          >
            <p className="text-xs text-callout-warning font-medium">
              Possible duplicate · same opponent
              {formData.tournament_id ? '/tournament' : ''} today
            </p>
            <ul className="space-y-2">
              {dupes.slice(0, 3).map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-neutral-200"
                >
                  <span>
                    {opponentLabel(d.player2_id)} · {tournamentLabel(d.tournament_id)} ·{' '}
                    {d.match_date.slice(0, 10)}
                    {d.tagging_mode != null && (!d.step1_complete || !d.step2_complete)
                      ? ' · in progress'
                      : ''}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => openExisting(d.id)}
                  >
                    Open existing
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true)
                  try {
                    await createAndOpen()
                  } catch (error) {
                    console.error('Failed to create match:', error)
                    alert('Failed to create match. Please try again.')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              >
                Create anyway
              </Button>
              <Button type="button" variant="secondary" onClick={() => setDupes(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!dupes && (
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
        )}
      </form>
    </div>
  )
}
