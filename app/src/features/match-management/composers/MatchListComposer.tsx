/**
 * MatchListComposer - Display list of all matches
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatchStore, usePlayerStore, useTournamentStore } from '@/data'
import { MatchListSection } from '../sections/MatchListSection'

export function MatchListComposer() {
  const navigate = useNavigate()
  const { matches, isLoading, load: loadMatches } = useMatchStore()
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()
  
  useEffect(() => {
    loadMatches()
    loadPlayers()
    loadTournaments()
  }, [loadMatches, loadPlayers, loadTournaments])
  
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown Player'
  }
  
  const getTournamentName = (tournamentId: string | null) => {
    if (!tournamentId) return ''
    const tournament = tournaments.find(t => t.id === tournamentId)
    return tournament ? tournament.name : 'Unknown Tournament'
  }
  
  const handleCreateNew = () => {
    navigate('/matches/create')
  }
  
  const handleRefresh = () => {
    loadMatches()
  }
  
  return (
    <div className="h-screen overflow-y-auto bg-bg-surface">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-50">Matches</h1>
        </div>
        
        <MatchListSection
          matches={matches}
          isLoading={isLoading}
          onCreateNew={handleCreateNew}
          getPlayerName={getPlayerName}
          getTournamentName={getTournamentName}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}

