/**
 * Analytics View Models
 * 
 * Types for analytics UI state and derived data.
 */

// Re-export filter model from rules for convenience
export type { AnalyticsFilterModel, ScopeType, SetFilter, ContextFilter } from '@/rules/analytics'

/**
 * Generic metric for cards
 */
export interface CardMetric {
  value: string | number
  label: string
  trend?: 'up' | 'down' | 'neutral'
}

/**
 * Generic insight card view model
 */
export interface InsightCardViewModel {
  title: string
  subtitle?: string
  primaryMetric: CardMetric
  secondaryMetrics?: CardMetric[]
  insight?: string
  coaching?: string
  footer?: string
  loading?: boolean
  error?: string
}

// TODO: Add specific card view models as needed
// Example:
// export interface ServePerformanceViewModel extends InsightCardViewModel {
//   serveTypes: { type: string; winRate: number }[]
// }

