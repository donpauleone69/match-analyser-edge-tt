/**
 * RallyStatsCard
 *
 * Continuation-phase stats: last shot phase is continuation.
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
        subtitle="What happens once the point reaches continuation"
        icon={<Swords className="h-5 w-5" />}
        primaryMetric={{
          value: '...',
          label: 'Continuation Win Rate',
          description: 'Continuation Win Rate',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: '...', label: 'Long rallies won', description: 'of rallies with 6+ shots are won by you' },
          { value: '...', label: 'Continuation errors', description: 'of continuation points are lost to your errors' },
          { value: '...', label: 'Avg rally length', description: 'shots per point on average' },
          { value: '...', label: 'Avg continuation length', description: 'shots per continuation point' },
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
        subtitle="What happens once the point reaches continuation"
        icon={<Swords className="h-5 w-5" />}
        primaryMetric={{
          value: 'Error',
          label: 'Continuation Win Rate',
          description: 'Continuation Win Rate',
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
        subtitle="What happens once the point reaches continuation"
        icon={<Swords className="h-5 w-5" />}
        primaryMetric={{
          value: 'N/A',
          label: 'Continuation Win Rate',
          description: 'Continuation Win Rate',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: 'N/A', label: 'Long rallies won', description: 'of rallies with 6+ shots are won by you' },
          { value: 'N/A', label: 'Continuation errors', description: 'of continuation points are lost to your errors' },
          { value: 'N/A', label: 'Avg rally length', description: 'shots per point on average' },
          { value: 'N/A', label: 'Avg continuation length', description: 'shots per continuation point' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No continuation-phase data available
          </div>
        }
        insight="Not enough continuation-phase data in the selected scope."
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
  const avgLength = metrics.avgRallyLength.toFixed(1)
  const avgRallyPhaseLength = metrics.avgRallyPhaseLength.toFixed(1)
  
  return (
    <BasicInsightCardTemplate
      title="Rally Stats"
      subtitle="What happens once the point reaches continuation"
      icon={<Swords className="h-5 w-5" />}
      primaryMetric={{
        value: rallyWinPct,
        label: 'Continuation Win Rate',
        description: 'Continuation Win Rate',
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
          label: 'Continuation UEs',
          description: 'of continuation points are lost to your errors'
        },
        { 
          value: avgLength, 
          label: 'Avg rally length',
          description: 'shots per point on average'
        },
        { 
          value: avgRallyPhaseLength, 
          label: 'Avg continuation length',
          description: 'shots per continuation point'
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
