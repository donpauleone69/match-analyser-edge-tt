/**
 * ServePerformanceCard
 * 
 * Analytics card for serve performance metrics.
 * Shows serve win rate, service faults, 3rd ball win/error rates.
 */

import type { AnalyticsFilterModel } from '@/rules/analytics'
import { BasicInsightCardTemplate } from '@/ui-mine/BasicInsightCardTemplate'
import { Activity } from 'lucide-react'
import { useDeriveServePerformance } from '../derive/useDeriveServePerformance'

export interface ServePerformanceCardProps {
  filter: AnalyticsFilterModel
}

export function ServePerformanceCard({ filter }: ServePerformanceCardProps) {
  const { data, loading, error } = useDeriveServePerformance(filter)
  
  // Loading state
  if (loading) {
    return (
      <BasicInsightCardTemplate
        title="Serve Performance"
        subtitle="How effective is your serve?"
        icon={<Activity className="h-5 w-5" />}
        primaryMetric={{
          value: '...',
          label: 'Points won on serve',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: '...', label: 'Service faults' },
          { value: '...', label: '3rd ball wins' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            Loading...
          </div>
        }
        insight="Loading serve performance data..."
        coaching=""
        footer="Loading..."
      />
    )
  }
  
  // Error state
  if (error) {
    return (
      <BasicInsightCardTemplate
        title="Serve Performance"
        subtitle="How effective is your serve?"
        icon={<Activity className="h-5 w-5" />}
        primaryMetric={{
          value: 'Error',
          label: 'Serve Win %',
          description: 'Service Points Won',
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
  if (!data || data.metrics.totalServeRallies === 0) {
    return (
      <BasicInsightCardTemplate
        title="Serve Performance"
        subtitle="How effective is your serve?"
        icon={<Activity className="h-5 w-5" />}
        primaryMetric={{
          value: 'N/A',
          label: 'Serve Win %',
          description: 'Service Points Won',
          status: 'average',
        }}
        secondaryMetrics={[
          { value: 'N/A', label: 'Service faults' },
          { value: 'N/A', label: '3rd ball wins' },
        ]}
        chart={
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            No serve data available
          </div>
        }
        insight="No serve data available for the selected filters."
        coaching="Adjust your filters or tag more matches to see serve performance metrics."
        footer="No data"
      />
    )
  }
  
  // Format metrics
  const { metrics, status, insight, recommendation, footerText } = data
  const serveWinPct = `${Math.round(metrics.serveWinRate * 100)}%`
  const faultPct = `${Math.round(metrics.serviceFaultRate * 100)}%`
  const thirdBallWinPct = `${Math.round(metrics.thirdBallWinRate * 100)}%`
  const thirdBallErrorPct = `${Math.round(metrics.thirdBallErrorRate * 100)}%`
  
  return (
    <BasicInsightCardTemplate
      title="Serve Performance"
      subtitle="How effective is your serve?"
      icon={<Activity className="h-5 w-5" />}
      primaryMetric={{
        value: serveWinPct,
        label: 'Serve Win %',
        description: 'Service Points Won',
        status,
      }}
      secondaryMetrics={[
        { 
          value: faultPct, 
          label: 'Service faults',
          description: 'of your serves are faults'
        },
        { 
          value: thirdBallWinPct, 
          label: '3rd ball success',
          description: 'of your 3rd ball attacks win the point immediately'
        },
        { 
          value: thirdBallErrorPct, 
          label: '3rd ball errors',
          description: 'of your 3rd ball attacks are unforced errors'
        },
      ]}
      chart={
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
          Chart placeholder: Win % by serve type
        </div>
      }
      insight={insight}
      coaching={recommendation}
      footer={footerText}
    />
  )
}

