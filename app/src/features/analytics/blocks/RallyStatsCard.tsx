/**
 * RallyStatsCard
 * 
 * Analytics card for rally statistics.
 * Rally phase = 4+ shots (after serve/receive/3rd ball)
 */

import type { AnalyticsFilterModel } from '@/rules/analytics'
import { BasicInsightCardTemplate } from '@/ui-mine/BasicInsightCardTemplate'
import { Swords } from 'lucide-react'
import { useDeriveRallyStats } from '../derive/useDeriveRallyStats'

export interface RallyStatsCardProps {
  filter: AnalyticsFilterModel
}

export function RallyStatsCard({ filter }: RallyStatsCardProps) {
  const { data, loading, error } = useDeriveRallyStats(filter)
  
  // Loading state
  if (loading) {
    return (
      <BasicInsightCardTemplate
        title="Rally Stats"
        subtitle="What happens once the rally starts (4+ shots)"
        icon={<Swords className="h-5 w-5" />}
        primaryMetric={{
          value: '...',
          label: 'Rally Win Rate',
          description: 'Rally Win Rate',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: '...', label: 'Long rallies won', description: 'of rallies with 6+ shots are won by you' },
          { value: '...', label: 'Rally UEs', description: 'of rally points are lost to your unforced errors' },
          { value: '...', label: 'FEs created', description: 'of rally points are won by forcing opponent errors' },
          { value: '...', label: 'Avg rally length', description: 'shots per point on average' },
          { value: '...', label: 'Avg rally phase length', description: 'shots per rally-phase point (4+ shots)' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            Loading...
          </div>
        }
        insight="Loading rally statistics..."
        coaching=""
        footer="Loading..."
      />
    )
  }
  
  // Error state
  if (error) {
    return (
      <BasicInsightCardTemplate
        title="Rally Stats"
        subtitle="What happens once the rally starts (4+ shots)"
        icon={<Swords className="h-5 w-5" />}
        primaryMetric={{
          value: 'Error',
          label: 'Rally Win Rate',
          description: 'Rally Win Rate',
          status: 'poor',
        }}
        secondaryMetrics={[]}
        chart={
          <div className="flex items-center justify-center h-full text-red-500 text-sm">
            {error}
          </div>
        }
        insight=""
        coaching=""
        footer=""
      />
    )
  }
  
  // No data state
  if (!data || data.metrics.totalRallyPhaseRallies === 0) {
    return (
      <BasicInsightCardTemplate
        title="Rally Stats"
        subtitle="What happens once the rally starts (4+ shots)"
        icon={<Swords className="h-5 w-5" />}
        primaryMetric={{
          value: 'N/A',
          label: 'Rally Win Rate',
          description: 'Rally Win Rate',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: 'N/A', label: 'Long rallies won', description: 'of rallies with 6+ shots are won by you' },
          { value: 'N/A', label: 'Rally UEs', description: 'of rally points are lost to your unforced errors' },
          { value: 'N/A', label: 'FEs created', description: 'of rally points are won by forcing opponent errors' },
          { value: 'N/A', label: 'Avg rally length', description: 'shots per point on average' },
          { value: 'N/A', label: 'Avg rally phase length', description: 'shots per rally-phase point (4+ shots)' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No rally-phase data available
          </div>
        }
        insight="Not enough rally-phase data (4+ shots) in the selected scope."
        coaching=""
        footer="No data"
      />
    )
  }
  
  // Format metrics
  const { metrics, status, insight, recommendation, footerText } = data
  const rallyWinPct = `${Math.round(metrics.rallyWinRate * 100)}%`
  const longRallyWinPct = `${Math.round(metrics.longRallyWinRate * 100)}%`
  const rallyUEpct = `${Math.round(metrics.rallyUnforcedErrorRate * 100)}%`
  const rallyFEpct = `${Math.round(metrics.rallyForcedErrorsCreatedRate * 100)}%`
  const avgLength = metrics.avgRallyLength.toFixed(1)
  const avgRallyPhaseLength = metrics.avgRallyPhaseLength.toFixed(1)
  
  return (
    <BasicInsightCardTemplate
      title="Rally Stats"
      subtitle="What happens once the rally starts (4+ shots)"
      icon={<Swords className="h-5 w-5" />}
      primaryMetric={{
        value: rallyWinPct,
        label: 'Rally Win Rate',
        description: 'Rally Win Rate',
        status,
      }}
      secondaryMetrics={[
        { 
          value: longRallyWinPct, 
          label: 'Long rallies won',
          description: 'of rallies with 6+ shots are won by you'
        },
        { 
          value: rallyUEpct, 
          label: 'Rally UEs',
          description: 'of rally points are lost to your unforced errors'
        },
        { 
          value: rallyFEpct, 
          label: 'FEs created',
          description: 'of rally points are won by forcing opponent errors'
        },
        { 
          value: avgLength, 
          label: 'Avg rally length',
          description: 'shots per point on average'
        },
        { 
          value: avgRallyPhaseLength, 
          label: 'Avg rally phase length',
          description: 'shots per rally-phase point (4+ shots)'
        },
      ]}
      chart={
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
          Chart placeholder
        </div>
      }
      insight={insight}
      coaching={recommendation}
      footer={footerText}
    />
  )
}
