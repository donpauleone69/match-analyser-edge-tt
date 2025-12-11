/**
 * Analytics Composer
 * 
 * Main orchestration component for the analytics page.
 * Handles data fetching, filtering, and state management.
 */

import { useState, useEffect } from 'react'
import { usePlayerStore, useMatchStore } from '@/data'
import { AnalyticsOverviewSection } from '../sections'
import { createDefaultFilter } from '@/rules/analytics'
import type { AnalyticsFilterModel } from '@/rules/analytics'
import { BarChart3 } from 'lucide-react'

export function AnalyticsComposer() {
  const [filter, setFilter] = useState<AnalyticsFilterModel>(createDefaultFilter())
  
  // Load reference data via stores (hybrid approach)
  const { players, load: loadPlayers } = usePlayerStore()
  const { matches, load: loadMatches } = useMatchStore()
  
  useEffect(() => {
    loadPlayers()
    loadMatches()
  }, [loadPlayers, loadMatches])
  
  // Helper to get player name
  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown'
  }
  
  // Transform for FilterBar
  const playerOptions = players.map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
  }))
  
  const matchOptions = matches.map((m) => ({
    id: m.id,
    label: `${getPlayerName(m.player1_id)} vs ${getPlayerName(m.player2_id)} - ${new Date(m.match_date).toLocaleDateString()}`,
  }))
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-50 flex items-center gap-3">
          <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
          Analytics
        </h1>
        <p className="text-neutral-400 mt-2 text-sm md:text-base">
          Performance insights and statistics
        </p>
      </div>
      
      {/* Main Content */}
      <AnalyticsOverviewSection
        filter={filter}
        onFilterChange={setFilter}
        players={playerOptions}
        matches={matchOptions}
      />
    </div>
  )
}

