/**
 * useDeriveReceivePerformance
 * 
 * Derive hook to fetch and calculate receive performance metrics.
 * Queries DB, applies filters, calls pure calculation function.
 */

import { useState, useEffect } from 'react'
import type { AnalyticsFilterModel } from '@/rules/analytics'
import { db } from '@/data/db'
import type { DBRally } from '@/data/entities/rallies/rally.types'
import type { DBShot } from '@/data/entities/shots/shot.types'
import type { DBSet } from '@/data/entities/sets/set.types'
import { 
  calculateReceivePerformance, 
  getReceivePerformanceStatus,
  generateReceiveInsight,
  generateReceiveRecommendation,
  type ReceivePerformanceMetrics 
} from '@/rules/analytics/calculateReceivePerformance'

export interface ReceivePerformanceData {
  metrics: ReceivePerformanceMetrics
  status: 'good' | 'average' | 'poor'
  insight: string
  recommendation: string
  footerText: string
}

export interface DeriveReceivePerformanceResult {
  data: ReceivePerformanceData | null
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
 */
async function fetchFilteredData(
  filter: AnalyticsFilterModel,
  matchIds: string[]
): Promise<{ rallies: DBRally[], shots: DBShot[] }> {
  const { playerId, opponentId, setFilter, contextFilter } = filter
  
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
  // 1. Only scoring rallies where player is receiver
  rallies = rallies.filter(r => 
    r.is_scoring && r.receiver_id === playerId
  )
  
  // 2. Apply opponent filter (server in receive rallies)
  if (opponentId && opponentId !== 'all') {
    rallies = rallies.filter(r => r.server_id === opponentId)
  }
  
  // 3. Apply context filter
  if (contextFilter === 'serve_only') {
    // For receive performance, serve_only means no data
    return { rallies: [], shots: [] }
  }
  // 'receive_only' and 'all_points' both show receive data
  
  // Get all shots for these rallies
  const rallyIds = rallies.map(r => r.id)
  const shots = rallyIds.length > 0
    ? await db.shots.where('rally_id').anyOf(rallyIds).toArray()
    : []
  
  return { rallies, shots }
}

/**
 * Derive hook for receive performance metrics
 */
export function useDeriveReceivePerformance(filter: AnalyticsFilterModel): DeriveReceivePerformanceResult {
  const [data, setData] = useState<ReceivePerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let mounted = true
    
    async function fetch() {
      try {
        setLoading(true)
        setError(null)
        
        if (!filter.playerId) {
          throw new Error('Player ID required for receive performance analytics')
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
        
        // Calculate metrics
        const metrics = calculateReceivePerformance({
          rallies,
          shots,
          playerId: filter.playerId,
        })
        
        // Generate derived data
        const status = getReceivePerformanceStatus(metrics.receiveWinRate)
        const insight = generateReceiveInsight(metrics)
        const recommendation = generateReceiveRecommendation(metrics)
        
        // Generate footer text
        let footerText = ''
        if (filter.scopeType === 'single_match') {
          footerText = `Based on 1 match (${metrics.totalReceiveRallies} receive points)`
        } else if (filter.scopeType === 'recent_n_matches') {
          const count = matchIds.length
          footerText = `Based on ${count} match${count !== 1 ? 'es' : ''} (${metrics.totalReceiveRallies} receive points)`
        } else {
          footerText = `Based on ${matchIds.length} matches (${metrics.totalReceiveRallies} receive points)`
        }
        
        if (mounted) {
          setData({
            metrics,
            status,
            insight,
            recommendation,
            footerText,
          })
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

