/**
 * MatchListComposer - Full match catalog (also linked from Library → All matches).
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatchStore, usePlayerStore, useTournamentStore } from '@/data'
import { MatchListSection } from '../sections/MatchListSection'
import { Button, Icon } from '@/ui-mine'
import { useCloudStore } from '@/stores/cloudStore'
import { deriveAccountScope } from '@/rules/derive/account/deriveAccountScope'

export function MatchListComposer() {
  const navigate = useNavigate()
  const { matches, isLoading, load: loadMatches } = useMatchStore()
  const profile = useCloudStore((state) => state.profile)
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()

  useEffect(() => {
    loadMatches()
    loadPlayers()
    loadTournaments()
  }, [loadMatches, loadPlayers, loadTournaments])

  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown Player'
  }

  const getTournamentName = (tournamentId: string | null) => {
    if (!tournamentId) return ''
    const tournament = tournaments.find((t) => t.id === tournamentId)
    return tournament ? tournament.name : 'Unknown Tournament'
  }

  const handleCreateNew = () => {
    navigate('/matches/create')
  }

  const handleRefresh = () => {
    loadMatches()
  }

  const scopedMatches = deriveAccountScope(profile, matches).matches

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
            <Icon name="swords" size="lg" className="text-brand-primary" />
            Matches
          </h1>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            Full catalog — Library shows recent matches and playlists.
          </p>
        </div>
        {scopedMatches.length > 0 && (
          <Button onClick={handleCreateNew}>
            <Icon name="plus" size="sm" /> New match
          </Button>
        )}
      </div>

      <MatchListSection
        matches={scopedMatches}
        isLoading={isLoading}
        onCreateNew={handleCreateNew}
        players={players}
        tournaments={tournaments}
        getPlayerName={getPlayerName}
        getTournamentName={getTournamentName}
        onRefresh={handleRefresh}
      />
    </div>
  )
}
