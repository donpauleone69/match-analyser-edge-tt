/**
 * AnalyticsOverviewSection
 * 
 * Main analytics section with filter bar and card grid.
 */

import type { AnalyticsFilterModel } from '@/rules/analytics'
import { FilterBar } from '@/ui-mine/FilterBar'
import {
  ServePerformanceCard,
  ReceivePerformanceCard,
  ThirdBallCard,
  RallyStatsCard,
  ErrorProfileCard,
} from '../blocks'

export interface AnalyticsOverviewSectionProps {
  filter: AnalyticsFilterModel
  onFilterChange: (filter: AnalyticsFilterModel) => void
  players: Array<{ id: string; name: string }>
  matches: Array<{ id: string; label: string }>
}

export function AnalyticsOverviewSection({
  filter,
  onFilterChange,
  players,
  matches,
}: AnalyticsOverviewSectionProps) {
  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <FilterBar
        filter={filter}
        onChange={onFilterChange}
        players={players}
        matches={matches}
      />
      
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ServePerformanceCard filter={filter} />
        <ReceivePerformanceCard filter={filter} />
        <ThirdBallCard filter={filter} />
        <RallyStatsCard filter={filter} />
        <ErrorProfileCard filter={filter} />
      </div>
    </div>
  )
}

