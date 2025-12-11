/**
 * Analytics Filter Model
 * 
 * Pure types and helper functions for analytics filtering.
 * NO React, NO IO, NO side effects.
 */

export type ScopeType = 'single_match' | 'recent_n_matches' | 'date_range'
export type SetFilter = 'all' | 1 | 2 | 3 | 4 | 5
export type ContextFilter = 'all_points' | 'serve_only' | 'receive_only'

export interface AnalyticsFilterModel {
  // Player selection
  playerId?: string // Selected player (required for most analytics)
  opponentId?: string | 'all' // Specific opponent or all
  
  // Scope configuration
  scopeType: ScopeType
  matchId?: string // For single_match scope
  recentMatchCount?: number // For recent_n_matches scope (default 10)
  dateFrom?: string // For date_range scope (ISO date)
  dateTo?: string // For date_range scope (ISO date)
  
  // Additional filters
  setFilter: SetFilter // Which set(s) to analyze
  contextFilter: ContextFilter // Rally context
}

/**
 * Create default filter with sensible defaults
 */
export function createDefaultFilter(): AnalyticsFilterModel {
  return {
    playerId: undefined,
    opponentId: 'all',
    scopeType: 'recent_n_matches',
    recentMatchCount: 10,
    setFilter: 'all',
    contextFilter: 'all_points',
  }
}

/**
 * Validate filter has required fields for current scope
 */
export function validateFilter(filter: AnalyticsFilterModel): boolean {
  // Player is required for most analytics
  if (!filter.playerId) {
    return false
  }
  
  // Validate scope-specific fields
  switch (filter.scopeType) {
    case 'single_match':
      return !!filter.matchId
    case 'recent_n_matches':
      return !!filter.recentMatchCount && filter.recentMatchCount > 0
    case 'date_range':
      return !!filter.dateFrom && !!filter.dateTo
    default:
      return false
  }
}

/**
 * Check if filter is complete enough to run analytics
 */
export function isFilterComplete(filter: AnalyticsFilterModel): boolean {
  return validateFilter(filter)
}

/**
 * Get human-readable filter description for display
 */
export function getFilterDescription(filter: AnalyticsFilterModel): string {
  if (!filter.playerId) {
    return 'No player selected'
  }
  
  let scope = ''
  switch (filter.scopeType) {
    case 'single_match':
      scope = '1 match'
      break
    case 'recent_n_matches':
      scope = `Last ${filter.recentMatchCount || 10} matches`
      break
    case 'date_range':
      scope = `${filter.dateFrom} to ${filter.dateTo}`
      break
  }
  
  const opponent = filter.opponentId === 'all' ? 'all opponents' : 'selected opponent'
  const context = filter.contextFilter === 'all_points' ? '' : ` (${filter.contextFilter.replace('_', ' ')})`
  const sets = filter.setFilter === 'all' ? '' : ` • Set ${filter.setFilter}`
  
  return `${scope} vs ${opponent}${context}${sets}`
}

