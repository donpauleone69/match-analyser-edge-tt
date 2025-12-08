/**
 * StatsComposer - Main stats dashboard composer
 * 
 * Orchestrates player stats display with filtering options.
 */

import { useState, useEffect } from 'react'
import { db } from '@/data/db'
import { usePlayerStore } from '@/data/entities/players'
import { useDerivePlayerStats, useDeriveRawData } from '../derive'
import {
  MatchSummarySection,
  ServeReceiveSection,
  TacticalSection,
  ErrorAnalysisSection,
  RawDataSection,
} from '../sections'
import { Button, Card } from '@/ui-mine'

interface StatsComposerProps {
  initialPlayerId?: string
}

export function StatsComposer({ initialPlayerId }: StatsComposerProps) {
  const { players, load: loadPlayers } = usePlayerStore()
  
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(initialPlayerId || null)
  const [filterMatchId, setFilterMatchId] = useState<string | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'summary' | 'serve-receive' | 'tactical' | 'errors' | 'raw'>('summary')
  
  const [sets, setSets] = useState<any[]>([])
  const [rallies, setRallies] = useState<any[]>([])
  const [shots, setShots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Load players
  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])
  
  // Auto-select first player if none selected
  useEffect(() => {
    if (!selectedPlayerId && players.length > 0) {
      setSelectedPlayerId(players[0].id)
    }
  }, [selectedPlayerId, players])
  
  // Load data when player/filter changes
  useEffect(() => {
    async function loadData() {
      if (!selectedPlayerId) return
      
      setLoading(true)
      try {
        console.log('[Stats] Loading data for player:', selectedPlayerId)
        
        // Load all sets (filter by match if specified)
        let allSets = await db.sets.toArray()
        console.log('[Stats] Total sets in DB:', allSets.length)
        
        if (filterMatchId !== 'all') {
          allSets = allSets.filter(s => s.match_id === filterMatchId)
          console.log('[Stats] Sets after match filter:', allSets.length)
        }
        
        setSets(allSets)
        
        // Load all rallies for these sets
        const setIds = allSets.map(s => s.id)
        const allRallies = await db.rallies.toArray()
        const filteredRallies = allRallies.filter(r => setIds.includes(r.set_id))
        console.log('[Stats] Total rallies in DB:', allRallies.length)
        console.log('[Stats] Rallies after set filter:', filteredRallies.length)
        setRallies(filteredRallies)
        
        // Load all shots for these rallies
        const rallyIds = filteredRallies.map(r => r.id)
        const allShots = await db.shots.toArray()
        const filteredShots = allShots.filter(s => rallyIds.includes(s.rally_id))
        console.log('[Stats] Total shots in DB:', allShots.length)
        console.log('[Stats] Shots after rally filter:', filteredShots.length)
        
        // Debug: Show sample data
        if (allSets.length > 0) {
          console.log('[Stats] Sample set:', allSets[0])
        }
        if (filteredRallies.length > 0) {
          console.log('[Stats] Sample rally:', filteredRallies[0])
        }
        if (filteredShots.length > 0) {
          console.log('[Stats] Sample shot:', filteredShots[0])
        }
        
        setShots(filteredShots)
      } catch (error) {
        console.error('[Stats] Failed to load stats data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [selectedPlayerId, filterMatchId])
  
  // Get player names for display
  const selectedPlayer = players.find(p => p.id === selectedPlayerId)
  const player1Name = selectedPlayer 
    ? `${selectedPlayer.first_name} ${selectedPlayer.last_name}`
    : 'Player 1'
  const player2Name = 'Opponent' // TODO: Get actual opponent name from match data
  
  // Derive stats
  const stats = useDerivePlayerStats(
    selectedPlayerId || '',
    player1Name,
    sets,
    rallies,
    shots
  )
  
  const rawData = useDeriveRawData(sets, rallies, shots)
  
  // Get unique match IDs for filter dropdown
  const uniqueMatchIds = Array.from(new Set(sets.map(s => s.match_id)))
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading statistics...</p>
      </div>
    )
  }
  
  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-600">No players found.</p>
        <p className="text-sm text-gray-500">
          Create a player in the Players section to view statistics.
        </p>
      </div>
    )
  }
  
  if (!selectedPlayerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Select a player to view statistics</p>
      </div>
    )
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Player Statistics</h1>
          <p className="text-sm text-gray-600 mt-1">
            Detailed performance analysis and insights
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          {/* Player Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 uppercase">Player</label>
            <select
              value={selectedPlayerId || ''}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  {`${player.first_name} ${player.last_name}`}
                </option>
              ))}
            </select>
          </div>
          
          {/* Match Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 uppercase">Match</label>
            <select
              value={filterMatchId}
              onChange={(e) => setFilterMatchId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Matches</option>
              {uniqueMatchIds.map(matchId => (
                <option key={matchId} value={matchId}>
                  Match {matchId.slice(0, 8)}...
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={() => setFilterMatchId('all')}
              variant="secondary"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('serve-receive')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'serve-receive'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Serve & Receive
          </button>
          <button
            onClick={() => setActiveTab('tactical')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tactical'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tactical
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'errors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Errors
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'raw'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Raw Data
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'summary' && <MatchSummarySection stats={stats} />}
        {activeTab === 'serve-receive' && <ServeReceiveSection stats={stats} />}
        {activeTab === 'tactical' && <TacticalSection stats={stats} />}
        {activeTab === 'errors' && <ErrorAnalysisSection stats={stats} />}
        {activeTab === 'raw' && (
          <RawDataSection
            rawData={rawData}
            player1Name={player1Name}
            player2Name={player2Name}
          />
        )}
      </div>
    </div>
  )
}

