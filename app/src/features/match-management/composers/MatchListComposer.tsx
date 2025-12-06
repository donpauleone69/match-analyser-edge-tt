/**
 * MatchListComposer - Display list of all matches
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatchStore, usePlayerStore, useTournamentStore } from '@/data'
import { MatchListSection } from '../sections/MatchListSection'
import { Swords } from 'lucide-react'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
            <Swords className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
            Matches
          </h1>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            View and manage all table tennis matches
          </p>
        </div>
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
  )
}

