/**
 * useDeriveRallyStats
 * 
 * Derive hook to fetch and calculate rally statistics.
 * Rally phase = 4+ shots (after serve/receive/3rd ball)
 */

import { useState, useEffect } from 'react'
import type { AnalyticsFilterModel } from '@/rules/analytics'
import { db } from '@/data/db'
import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'
import type { DBSet } from '@/data/entities/sets/set.types'
import { 
  calculateRallyStats,
  type RallyStatsResult
} from '@/rules/analytics/calculateRallyStats'

export interface DeriveRallyStatsResult {
  data: RallyStatsResult | null
  loading: boolean
  error: string | null
}

/**
 * Get match IDs based on filter scope
 */
async function getMatchIdsForScope(filter: AnalyticsFilterModel): Promise<string[]> {
  const { scopeType, playerId, matchId, recentMatchCount, dateFrom, dateTo } = filter
  
  if (!playerId) {
    throw new Error('Player ID required for analytics')
  }
  
  switch (scopeType) {
    case 'single_match': {
      if (!matchId) throw new Error('Match ID required for single_match scope')
      return [matchId]
    }
    
    case 'recent_n_matches': {
      const count = recentMatchCount || 10
      const allMatches = await db.matches
        .orderBy('match_date')
        .reverse()
        .toArray()
      
      const playerMatches = allMatches.filter(m => 
        m.player1_id === playerId || m.player2_id === playerId
      )
      
      return playerMatches.slice(0, count).map(m => m.id)
    }
    
    case 'date_range': {
      if (!dateFrom || !dateTo) {
        throw new Error('Date range required for date_range scope')
      }
      
      const allMatches = await db.matches.toArray()
      const filtered = allMatches.filter(m => {
        const matchDate = m.match_date
        return (
          (m.player1_id === playerId || m.player2_id === playerId) &&
          matchDate >= dateFrom &&
          matchDate <= dateTo
        )
      })
      
      return filtered.map(m => m.id)
    }
    
    default:
      throw new Error(`Unknown scope type: ${scopeType}`)
  }
}

/**
 * Fetch rallies and shots based on filter
 * For rally stats, we need all scoring rallies involving the player
 */
async function fetchFilteredData(
  filter: AnalyticsFilterModel,
  matchIds: string[]
): Promise<{ rallies: DBRally[], shots: DBShot[] }> {
  const { playerId, opponentId, setFilter } = filter
  
  if (!playerId) {
    throw new Error('Player ID required')
  }
  
  // Get all sets for these matches
  const allSets = await db.sets
    .where('match_id')
    .anyOf(matchIds)
    .toArray()
  
  // Apply set filter
  let filteredSets: DBSet[] = allSets
  if (setFilter !== 'all') {
    filteredSets = allSets.filter(s => s.set_number === setFilter)
  }
  
  const setIds = filteredSets.map(s => s.id)
  
  if (setIds.length === 0) {
    return { rallies: [], shots: [] }
  }
  
  // Get all rallies for these sets
  let rallies = await db.rallies
    .where('set_id')
    .anyOf(setIds)
    .toArray()
  
  // Apply filters
  // 1. Only scoring rallies where player is involved (as server or receiver)
  rallies = rallies.filter(r => 
    r.is_scoring && (r.server_id === playerId || r.receiver_id === playerId)
  )
  
  // 2. Apply opponent filter
  if (opponentId && opponentId !== 'all') {
    rallies = rallies.filter(r => 
      r.server_id === opponentId || r.receiver_id === opponentId
    )
  }
  
  // 3. Context filter
  // For rally stats, we want all points (serve_only and receive_only still show rally data)
  // contextFilter mainly affects which points to include, but rally stats looks at all rally-phase exchanges
  
  // Get all shots for these rallies
  const rallyIds = rallies.map(r => r.id)
  const shots = rallyIds.length > 0
    ? await db.shots.where('rally_id').anyOf(rallyIds).toArray()
    : []
  
  return { rallies, shots }
}

/**
 * Derive hook for rally statistics
 */
export function useDeriveRallyStats(filter: AnalyticsFilterModel): DeriveRallyStatsResult {
  const [data, setData] = useState<RallyStatsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let mounted = true
    
    async function fetch() {
      try {
        setLoading(true)
        setError(null)
        
        if (!filter.playerId) {
          throw new Error('Player ID required for rally stats analytics')
        }
        
        // Get match IDs based on scope
        const matchIds = await getMatchIdsForScope(filter)
        
        if (matchIds.length === 0) {
          if (mounted) {
            setData(null)
            setLoading(false)
          }
          return
        }
        
        // Fetch filtered rallies and shots
        const { rallies, shots } = await fetchFilteredData(filter, matchIds)
        
        if (!mounted) return
        
        // Calculate rally stats
        const result = calculateRallyStats(rallies, shots, filter.playerId)
        
        if (mounted) {
          setData(result)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    fetch()
    
    return () => {
      mounted = false
    }
  }, [
    filter.playerId,
    filter.opponentId,
    filter.scopeType,
    filter.matchId,
    filter.recentMatchCount,
    filter.dateFrom,
    filter.dateTo,
    filter.setFilter,
    filter.contextFilter,
  ])
  
  return { data, loading, error }
}

