/**
 * MatchCreationComposer - Create new match and optionally start tagging
 */

import { useEffect } from 'react'
import { usePlayerStore, useTournamentStore } from '@/data'
import { MatchFormSection } from '../sections/MatchFormSection'
import { Plus } from 'lucide-react'

export function MatchCreationComposer() {
  const { players, load: loadPlayers } = usePlayerStore()
  const { tournaments, load: loadTournaments } = useTournamentStore()
  
  useEffect(() => {
    loadPlayers()
    loadTournaments()
  }, [loadPlayers, loadTournaments])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
          <Plus className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
          Create Match
        </h1>
        <p className="text-neutral-400 mt-2 text-sm md:text-base">
          Set up a new match between two players
        </p>
      </div>
      
      <MatchFormSection 
        players={players}
        tournaments={tournaments}
      />
    </div>
  )
}

