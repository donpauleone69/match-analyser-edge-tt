/**
 * MatchCreationComposer - Create new match and optionally start tagging
 */

import { useEffect } from 'react'
import { usePlayerStore, useTournamentStore } from '@/data'
import { MatchFormSection } from '../sections/MatchFormSection'

export function MatchCreationComposer() {
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()
  
  useEffect(() => {
    loadPlayers()
    loadTournaments()
  }, [loadPlayers, loadTournaments])
  
  return (
    <div className="h-screen overflow-y-auto bg-bg-surface">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-50">Create Match</h1>
          <p className="text-neutral-400 mt-2">
            Enter match details and optionally tag video
          </p>
        </div>
        
        <MatchFormSection 
          players={players}
          tournaments={tournaments}
        />
      </div>
    </div>
  )
}

