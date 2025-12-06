/**
 * Stats Feature View Models
 */

import type {
  MatchPerformanceStats,
  TacticalStats,
  ErrorStats,
  ServeStats,
  ReceiveStats,
} from '@/rules/stats'

export interface PlayerStatsViewModel {
  playerId: string
  playerName: string
  
  // Match summary
  matchesPlayed: number
  matchesWon: number
  matchWinRate: number
  setsWon: number
  setsLost: number
  setWinRate: number
  pointsWon: number
  pointsLost: number
  pointWinRate: number
  
  // Performance stats
  performance: MatchPerformanceStats
  
  // Serve & Receive
  serve: ServeStats
  receive: ReceiveStats
  
  // Tactical
  tactical: TacticalStats
  
  // Errors
  errors: ErrorStats
}

export interface RawDataViewModel {
  sets: Array<{
    setNumber: number
    player1Score: number
    player2Score: number
    winnerId: string
    rallies: Array<{
      rallyIndex: number
      serverId: string
      receiverId: string
      winnerId: string | null
      isScoring: boolean
      player1ScoreAfter: number
      player2ScoreAfter: number
      pointEndType: string | null
      shotCount: number
      shots: Array<{
        shotIndex: number
        playerId: string
        wing: string | null
        intent: string | null
        shotResult: string | null
        shotOrigin: string | null
        shotDestination: string | null
        rallyEndRole: string
      }>
    }>
  }>
}

export interface StatsFilterOptions {
  matchId: string | 'all'
  opponentId: string | 'all'
  dateRange: {
    from: string | null
    to: string | null
  }
}

export type ConfidenceBadge = 'high' | 'medium' | 'low'

export interface StatWithConfidence {
  value: number | string
  label: string
  confidence: ConfidenceBadge
  tooltip?: string
}

